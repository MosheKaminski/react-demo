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

export type { Role };
