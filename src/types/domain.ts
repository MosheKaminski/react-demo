import type { Role } from './auth';

export interface Branch {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  manager_id: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Employee {
  id: string;
  user_id: string | null;
  full_name: string;
  id_number: string | null;
  phone: string | null;
  email: string | null;
  start_date: string;
  end_date: string | null;
  primary_branch_id: string | null;
  is_active: boolean;
  created_at: string;
}

export interface EmployeeBranchAssignment {
  id: string;
  employee_id: string;
  branch_id: string;
  is_primary: boolean;
  created_at: string;
}

export interface EmployeeInput {
  full_name: string;
  id_number?: string | null;
  phone?: string | null;
  email?: string | null;
  start_date: string;
  end_date?: string | null;
  primary_branch_id: string;
}

export interface BranchInput {
  name: string;
  address?: string | null;
  phone?: string | null;
  manager_id?: string | null;
}

export type AttendanceSource = 'app' | 'manual_entry';
export type AttendanceStatus = 'pending' | 'approved' | 'rejected';

export interface AttendanceRecord {
  id: string;
  employee_id: string;
  branch_id: string;
  clock_in: string;
  clock_out: string | null;
  source: AttendanceSource;
  geo_lat: number | null;
  geo_lng: number | null;
  status: AttendanceStatus;
  approved_by: string | null;
  notes: string | null;
  created_at: string;
}

export interface ManualAttendanceInput {
  employee_id: string;
  branch_id: string;
  clock_in: string;
  clock_out: string | null;
  notes: string;
}

export type ShiftStatus = 'draft' | 'published' | 'completed' | 'cancelled';

export interface Shift {
  id: string;
  branch_id: string;
  employee_id: string | null;
  start_time: string;
  end_time: string;
  role_in_shift: string | null;
  status: ShiftStatus;
  created_at: string;
}

export interface ShiftInput {
  branch_id: string;
  employee_id: string | null;
  start_time: string;
  end_time: string;
  role_in_shift?: string | null;
  status: ShiftStatus;
}

export type PayType = 'hourly' | 'monthly';

export interface SalaryProfile {
  id: string;
  employee_id: string;
  pay_type: PayType;
  base_rate: number;
  weekly_hours_baseline: number | null;
  overtime_eligible: boolean;
  effective_from: string;
  effective_to: string | null;
  created_at: string;
}

export interface SalaryProfileInput {
  pay_type: PayType;
  base_rate: number;
  weekly_hours_baseline?: number | null;
  overtime_eligible: boolean;
}

export type AdjustmentType = 'bonus' | 'deduction' | 'addition';

export interface SalaryAdjustment {
  id: string;
  employee_id: string;
  type: AdjustmentType;
  amount: number;
  description: string | null;
  effective_month: string;
  created_by: string | null;
  created_at: string;
}

export interface SalaryAdjustmentInput {
  employee_id: string;
  type: AdjustmentType;
  amount: number;
  description?: string | null;
  effective_month: string;
}

export interface OvertimePolicy {
  id: string;
  daily_regular_hours: number;
  daily_125_hours: number;
  rate_125: number;
  rate_150: number;
  weekend_holiday_rate: number;
  updated_at: string;
}

export type PayrollRunStatus = 'draft' | 'finalized';

export interface PayrollRun {
  id: string;
  period_year: number;
  period_month: number;
  branch_id: string | null;
  status: PayrollRunStatus;
  generated_by: string | null;
  generated_at: string;
  finalized_at: string | null;
  audit_note: string | null;
}

export interface PayrollLine {
  id: string;
  payroll_run_id: string;
  employee_id: string;
  regular_hours: number;
  overtime_125_hours: number;
  overtime_150_hours: number;
  weekend_holiday_hours: number;
  gross_base: number;
  gross_overtime: number;
  adjustments_total: number;
  gross_total: number;
  pdf_path: string | null;
  created_at: string;
}

export type { Role };
