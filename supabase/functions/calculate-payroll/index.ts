// Edge Function: calculate-payroll
// Runs the monthly payroll aggregation server-side (PRD FR-17, §6.2 — payroll
// rules must be enforced server-side, not trusted from the client). Admin-only.
//
// Request body: { year: number, month: number (1-12), branchId?: string }
import { createClient } from 'npm:@supabase/supabase-js@2';
import { aggregateShiftHours, calculatePay } from './payroll-logic.ts';
import type { OvertimePolicy } from './payroll-logic.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const authHeader = req.headers.get('Authorization') ?? '';

    // Identify the caller using their own JWT (respects RLS) before doing
    // anything privileged with the service role client.
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await callerClient.auth.getUser();
    if (userError || !userData.user) {
      return jsonResponse({ error: 'Not authenticated' }, 401);
    }
    const { data: profile } = await callerClient
      .from('profiles')
      .select('role')
      .eq('id', userData.user.id)
      .single();
    if (profile?.role !== 'admin') {
      return jsonResponse({ error: 'Only admins can run payroll' }, 403);
    }

    const { year, month, branchId } = await req.json();
    if (!year || !month || month < 1 || month > 12) {
      return jsonResponse({ error: 'year and month (1-12) are required' }, 400);
    }

    const db = createClient(supabaseUrl, serviceRoleKey);

    const periodStart = new Date(Date.UTC(year, month - 1, 1));
    const periodEnd = new Date(Date.UTC(year, month, 1));

    const { data: policyRow, error: policyError } = await db
      .from('overtime_policies')
      .select('*')
      .limit(1)
      .single();
    if (policyError || !policyRow) {
      return jsonResponse({ error: 'Overtime policy not configured' }, 500);
    }
    const policy: OvertimePolicy = {
      daily_regular_hours: Number(policyRow.daily_regular_hours),
      daily_125_hours: Number(policyRow.daily_125_hours),
      rate_125: Number(policyRow.rate_125),
      rate_150: Number(policyRow.rate_150),
      weekend_holiday_rate: Number(policyRow.weekend_holiday_rate),
    };

    const { data: existingRun } = await db
      .from('payroll_runs')
      .select('*')
      .eq('period_year', year)
      .eq('period_month', month)
      .eq('branch_id', branchId ?? null)
      .maybeSingle();

    if (existingRun?.status === 'finalized') {
      return jsonResponse(
        { error: 'This payroll run is already finalized. Reopen it first to recalculate.' },
        409,
      );
    }

    let run = existingRun;
    if (!run) {
      const { data: inserted, error: insertError } = await db
        .from('payroll_runs')
        .insert({
          period_year: year,
          period_month: month,
          branch_id: branchId ?? null,
          generated_by: userData.user.id,
        })
        .select()
        .single();
      if (insertError) throw insertError;
      run = inserted;
    } else {
      // Recalculating an existing draft: drop old lines first.
      await db.from('payroll_lines').delete().eq('payroll_run_id', run.id);
    }

    let employeesQuery = db.from('employees').select('*').eq('is_active', true);
    if (branchId) employeesQuery = employeesQuery.eq('primary_branch_id', branchId);
    const { data: employees, error: employeesError } = await employeesQuery;
    if (employeesError) throw employeesError;

    const lines = [];
    for (const employee of employees ?? []) {
      const { data: salaryProfile } = await db
        .from('salary_profiles')
        .select('*')
        .eq('employee_id', employee.id)
        .lte('effective_from', periodEnd.toISOString().slice(0, 10))
        .or(`effective_to.is.null,effective_to.gte.${periodStart.toISOString().slice(0, 10)}`)
        .order('effective_from', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!salaryProfile) continue; // No active salary profile for this period - skip.

      const { data: attendance } = await db
        .from('attendance_records')
        .select('clock_in, clock_out')
        .eq('employee_id', employee.id)
        .eq('status', 'approved')
        .not('clock_out', 'is', null)
        .gte('clock_in', periodStart.toISOString())
        .lt('clock_in', periodEnd.toISOString());

      const sessions = (attendance ?? []).map((a) => ({
        clockIn: new Date(a.clock_in),
        clockOut: new Date(a.clock_out as string),
      }));
      const hours = aggregateShiftHours(sessions, policy);

      const { data: adjustments } = await db
        .from('salary_adjustments')
        .select('type, amount')
        .eq('employee_id', employee.id)
        .eq('effective_month', periodStart.toISOString().slice(0, 10));

      const amounts = calculatePay(
        {
          pay_type: salaryProfile.pay_type,
          base_rate: Number(salaryProfile.base_rate),
          weekly_hours_baseline: salaryProfile.weekly_hours_baseline
            ? Number(salaryProfile.weekly_hours_baseline)
            : null,
          overtime_eligible: salaryProfile.overtime_eligible,
        },
        hours,
        policy,
        (adjustments ?? []).map((a) => ({ type: a.type, amount: Number(a.amount) })),
      );

      const { data: line, error: lineError } = await db
        .from('payroll_lines')
        .insert({
          payroll_run_id: run.id,
          employee_id: employee.id,
          regular_hours: hours.regularHours,
          overtime_125_hours: hours.overtime125Hours,
          overtime_150_hours: hours.overtime150Hours,
          weekend_holiday_hours: hours.weekendHolidayHours,
          gross_base: amounts.grossBase,
          gross_overtime: amounts.grossOvertime,
          adjustments_total: amounts.adjustmentsTotal,
          gross_total: amounts.grossTotal,
        })
        .select()
        .single();
      if (lineError) throw lineError;
      lines.push(line);
    }

    return jsonResponse({ run, lines });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
