import { supabase } from '../../lib/supabaseClient';
import type { Employee, EmployeeBranchAssignment, EmployeeInput, Role } from '../../types/domain';

export interface EmployeeFilters {
  branchId?: string;
  isActive?: boolean;
}

export async function listEmployees(filters: EmployeeFilters = {}): Promise<Employee[]> {
  let query = supabase.from('employees').select('*').order('full_name');
  if (filters.branchId) query = query.eq('primary_branch_id', filters.branchId);
  if (filters.isActive !== undefined) query = query.eq('is_active', filters.isActive);
  const { data, error } = await query;
  if (error) throw error;
  return data as Employee[];
}

export async function getEmployeeByUserId(userId: string): Promise<Employee | null> {
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data as Employee | null;
}

export async function createEmployee(input: EmployeeInput): Promise<Employee> {
  const { data, error } = await supabase.from('employees').insert(input).select().single();
  if (error) throw error;
  return data as Employee;
}

export async function updateEmployee(
  id: string,
  input: Partial<EmployeeInput>,
): Promise<Employee> {
  const { data, error } = await supabase
    .from('employees')
    .update(input)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Employee;
}

export async function deactivateEmployee(id: string): Promise<void> {
  const { error } = await supabase
    .from('employees')
    .update({ is_active: false, end_date: new Date().toISOString().slice(0, 10) })
    .eq('id', id);
  if (error) throw error;
}

export async function reactivateEmployee(id: string): Promise<void> {
  const { error } = await supabase
    .from('employees')
    .update({ is_active: true, end_date: null })
    .eq('id', id);
  if (error) throw error;
}

export async function listBranchAssignments(
  employeeId: string,
): Promise<EmployeeBranchAssignment[]> {
  const { data, error } = await supabase
    .from('employee_branch_assignments')
    .select('*')
    .eq('employee_id', employeeId);
  if (error) throw error;
  return data as EmployeeBranchAssignment[];
}

export async function addBranchAssignment(
  employeeId: string,
  branchId: string,
): Promise<EmployeeBranchAssignment> {
  const { data, error } = await supabase
    .from('employee_branch_assignments')
    .insert({ employee_id: employeeId, branch_id: branchId })
    .select()
    .single();
  if (error) throw error;
  return data as EmployeeBranchAssignment;
}

export async function removeBranchAssignment(id: string): Promise<void> {
  const { error } = await supabase.from('employee_branch_assignments').delete().eq('id', id);
  if (error) throw error;
}

export async function updateProfileRole(userId: string, role: Role): Promise<void> {
  const { error } = await supabase.from('profiles').update({ role }).eq('id', userId);
  if (error) throw error;
}

export async function getProfileRole(userId: string): Promise<Role | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return (data?.role as Role | undefined) ?? null;
}

/** Admin-only in practice: RLS only lets admins read other users' profiles. */
export async function listAllProfiles(): Promise<{ id: string; role: Role }[]> {
  const { data, error } = await supabase.from('profiles').select('id, role');
  if (error) throw error;
  return data as { id: string; role: Role }[];
}

/** Admin-only: creates a Supabase Auth account for this employee and emails
 * them an invite link to set their own password. */
export async function inviteEmployee(employeeId: string): Promise<{ userId: string }> {
  const { data, error } = await supabase.functions.invoke('invite-employee', {
    body: { employeeId, redirectTo: `${window.location.origin}/set-password` },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data as { userId: string };
}
