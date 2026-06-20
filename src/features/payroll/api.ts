import { supabase } from '../../lib/supabaseClient';
import type {
  OvertimePolicy,
  PayrollLine,
  PayrollRun,
  SalaryAdjustment,
  SalaryAdjustmentInput,
  SalaryProfile,
  SalaryProfileInput,
} from '../../types/domain';

export async function getLatestSalaryProfile(employeeId: string): Promise<SalaryProfile | null> {
  const { data, error } = await supabase
    .from('salary_profiles')
    .select('*')
    .eq('employee_id', employeeId)
    .order('effective_from', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as SalaryProfile | null;
}

/**
 * Versions the salary profile: if an open-ended profile created today
 * already exists, update it in place; otherwise close the previous open
 * profile (effective_to = yesterday) and insert a new one starting today,
 * so historical payroll recalculation stays accurate after a raise.
 */
export async function saveSalaryProfile(
  employeeId: string,
  input: SalaryProfileInput,
): Promise<SalaryProfile> {
  const today = new Date().toISOString().slice(0, 10);
  const current = await getLatestSalaryProfile(employeeId);

  if (current && current.effective_from === today) {
    const { data, error } = await supabase
      .from('salary_profiles')
      .update({
        pay_type: input.pay_type,
        base_rate: input.base_rate,
        weekly_hours_baseline: input.weekly_hours_baseline ?? null,
        overtime_eligible: input.overtime_eligible,
      })
      .eq('id', current.id)
      .select()
      .single();
    if (error) throw error;
    return data as SalaryProfile;
  }

  if (current && !current.effective_to) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    await supabase
      .from('salary_profiles')
      .update({ effective_to: yesterday.toISOString().slice(0, 10) })
      .eq('id', current.id);
  }

  const { data, error } = await supabase
    .from('salary_profiles')
    .insert({ employee_id: employeeId, effective_from: today, ...input })
    .select()
    .single();
  if (error) throw error;
  return data as SalaryProfile;
}

export async function listSalaryAdjustments(employeeId: string): Promise<SalaryAdjustment[]> {
  const { data, error } = await supabase
    .from('salary_adjustments')
    .select('*')
    .eq('employee_id', employeeId)
    .order('effective_month', { ascending: false });
  if (error) throw error;
  return data as SalaryAdjustment[];
}

export async function createSalaryAdjustment(
  input: SalaryAdjustmentInput,
  createdBy: string,
): Promise<SalaryAdjustment> {
  const { data, error } = await supabase
    .from('salary_adjustments')
    .insert({ ...input, created_by: createdBy })
    .select()
    .single();
  if (error) throw error;
  return data as SalaryAdjustment;
}

export async function getOvertimePolicy(): Promise<OvertimePolicy> {
  const { data, error } = await supabase.from('overtime_policies').select('*').limit(1).single();
  if (error) throw error;
  return data as OvertimePolicy;
}

export async function updateOvertimePolicy(
  id: string,
  input: Omit<OvertimePolicy, 'id' | 'updated_at'>,
): Promise<OvertimePolicy> {
  const { data, error } = await supabase
    .from('overtime_policies')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as OvertimePolicy;
}

export interface RunPayrollParams {
  year: number;
  month: number;
  branchId?: string;
}

export interface RunPayrollResult {
  run: PayrollRun;
  lines: PayrollLine[];
}

export async function runPayroll(params: RunPayrollParams): Promise<RunPayrollResult> {
  const { data, error } = await supabase.functions.invoke('calculate-payroll', {
    body: { year: params.year, month: params.month, branchId: params.branchId ?? null },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data as RunPayrollResult;
}

export async function listPayrollRuns(): Promise<PayrollRun[]> {
  const { data, error } = await supabase
    .from('payroll_runs')
    .select('*')
    .order('period_year', { ascending: false })
    .order('period_month', { ascending: false });
  if (error) throw error;
  return data as PayrollRun[];
}

export async function listPayrollLines(payrollRunId: string): Promise<PayrollLine[]> {
  const { data, error } = await supabase
    .from('payroll_lines')
    .select('*')
    .eq('payroll_run_id', payrollRunId);
  if (error) throw error;
  return data as PayrollLine[];
}

export async function listPayrollLinesForEmployee(employeeId: string): Promise<
  (PayrollLine & { payroll_runs: PayrollRun })[]
> {
  const { data, error } = await supabase
    .from('payroll_lines')
    .select('*, payroll_runs(*)')
    .eq('employee_id', employeeId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as (PayrollLine & { payroll_runs: PayrollRun })[];
}

export async function finalizePayrollRun(id: string): Promise<void> {
  const { error } = await supabase
    .from('payroll_runs')
    .update({ status: 'finalized', finalized_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function reopenPayrollRun(id: string, auditNote: string): Promise<void> {
  const { error } = await supabase
    .from('payroll_runs')
    .update({ status: 'draft', finalized_at: null, audit_note: auditNote })
    .eq('id', id);
  if (error) throw error;
}

export function payrollPdfPath(employeeId: string, payrollRunId: string): string {
  return `payroll/${employeeId}/${payrollRunId}.pdf`;
}

export async function uploadPayrollPdf(path: string, file: Blob): Promise<void> {
  const { error } = await supabase.storage
    .from('payroll-pdfs')
    .upload(path, file, { contentType: 'application/pdf', upsert: true });
  if (error) throw error;
}

export async function setPayrollLinePdfPath(lineId: string, path: string): Promise<void> {
  const { error } = await supabase.from('payroll_lines').update({ pdf_path: path }).eq('id', lineId);
  if (error) throw error;
}

export async function getPayrollPdfSignedUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from('payroll-pdfs')
    .createSignedUrl(path, 60 * 5);
  if (error) throw error;
  return data.signedUrl;
}
