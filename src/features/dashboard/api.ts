import { supabase } from '../../lib/supabaseClient';
import {
  aggregateShiftHours,
  calculatePay,
} from '../../../supabase/functions/calculate-payroll/payroll-logic';
import type { OvertimePolicy as PolicyShape } from '../../../supabase/functions/calculate-payroll/payroll-logic';

export interface BranchMetrics {
  branchId: string;
  headcount: number;
  regularHours: number;
  overtimeHours: number;
  laborCost: number;
  pendingApprovals: number;
}

async function getPolicy(): Promise<PolicyShape> {
  const { data, error } = await supabase.from('overtime_policies').select('*').limit(1).single();
  if (error) throw error;
  return {
    daily_regular_hours: Number(data.daily_regular_hours),
    daily_125_hours: Number(data.daily_125_hours),
    rate_125: Number(data.rate_125),
    rate_150: Number(data.rate_150),
    weekend_holiday_rate: Number(data.weekend_holiday_rate),
  };
}

/**
 * Computes a live (not pre-aggregated) snapshot of a branch's headcount,
 * hours, and labor cost for the given month by re-running the same pure
 * overtime/pay calculation the payroll engine uses, directly against
 * current attendance/salary data - so the dashboard reflects reality even
 * if payroll hasn't been run yet for this month (PRD FR-20).
 */
export async function getBranchMetrics(
  branchId: string,
  year: number,
  month: number,
): Promise<BranchMetrics> {
  const policy = await getPolicy();
  const periodStart = new Date(Date.UTC(year, month - 1, 1));
  const periodEnd = new Date(Date.UTC(year, month, 1));

  const { data: employees, error: employeesError } = await supabase
    .from('employees')
    .select('id')
    .eq('primary_branch_id', branchId)
    .eq('is_active', true);
  if (employeesError) throw employeesError;

  let regularHours = 0;
  let overtimeHours = 0;
  let laborCost = 0;

  for (const employee of employees ?? []) {
    const { data: salaryProfile } = await supabase
      .from('salary_profiles')
      .select('*')
      .eq('employee_id', employee.id)
      .lte('effective_from', periodEnd.toISOString().slice(0, 10))
      .or(`effective_to.is.null,effective_to.gte.${periodStart.toISOString().slice(0, 10)}`)
      .order('effective_from', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!salaryProfile) continue;

    const { data: attendance } = await supabase
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
      [],
    );

    regularHours += hours.regularHours;
    overtimeHours += hours.overtime125Hours + hours.overtime150Hours + hours.weekendHolidayHours;
    laborCost += amounts.grossBase + amounts.grossOvertime;
  }

  const { count: pendingApprovals } = await supabase
    .from('attendance_records')
    .select('id', { count: 'exact', head: true })
    .eq('branch_id', branchId)
    .eq('status', 'pending');

  return {
    branchId,
    headcount: employees?.length ?? 0,
    regularHours: round2(regularHours),
    overtimeHours: round2(overtimeHours),
    laborCost: round2(laborCost),
    pendingApprovals: pendingApprovals ?? 0,
  };
}

export async function getOrgMetrics(year: number, month: number): Promise<BranchMetrics[]> {
  const { data: branches, error } = await supabase.from('branches').select('id').eq('is_active', true);
  if (error) throw error;
  return Promise.all((branches ?? []).map((b) => getBranchMetrics(b.id, year, month)));
}

export interface MonthlyTotal {
  year: number;
  month: number;
  laborCost: number;
}

export async function getMonthlyTrend(monthsBack: number): Promise<MonthlyTotal[]> {
  const now = new Date();
  const results: MonthlyTotal[] = [];
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const branchMetrics = await getOrgMetrics(year, month);
    const laborCost = round2(branchMetrics.reduce((sum, b) => sum + b.laborCost, 0));
    results.push({ year, month, laborCost });
  }
  return results;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
