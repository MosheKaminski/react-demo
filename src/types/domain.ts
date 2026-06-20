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

export type { Role };
