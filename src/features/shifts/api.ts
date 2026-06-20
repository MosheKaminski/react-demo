import { supabase } from '../../lib/supabaseClient';
import type { Shift, ShiftInput } from '../../types/domain';

export interface ShiftFilters {
  branchId?: string;
  employeeId?: string;
  from?: string;
  to?: string;
}

export async function listShifts(filters: ShiftFilters = {}): Promise<Shift[]> {
  let query = supabase.from('shifts').select('*').order('start_time');
  if (filters.branchId) query = query.eq('branch_id', filters.branchId);
  if (filters.employeeId) query = query.eq('employee_id', filters.employeeId);
  if (filters.from) query = query.gte('start_time', filters.from);
  if (filters.to) query = query.lt('start_time', filters.to);
  const { data, error } = await query;
  if (error) throw error;
  return data as Shift[];
}

export async function createShift(input: ShiftInput): Promise<Shift> {
  const { data, error } = await supabase.from('shifts').insert(input).select().single();
  if (error) throw error;
  return data as Shift;
}

export async function updateShift(id: string, input: Partial<ShiftInput>): Promise<Shift> {
  const { data, error } = await supabase
    .from('shifts')
    .update(input)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Shift;
}

export async function deleteShift(id: string): Promise<void> {
  const { error } = await supabase.from('shifts').delete().eq('id', id);
  if (error) throw error;
}

/**
 * Finds other active (published/completed) shifts for the same employee
 * that overlap the given time range, across any branch. Used to flag
 * scheduling conflicts (PRD FR-13) without blocking the save.
 */
export async function findOverlappingShifts(params: {
  employeeId: string;
  startTime: string;
  endTime: string;
  excludeShiftId?: string;
}): Promise<Shift[]> {
  let query = supabase
    .from('shifts')
    .select('*')
    .eq('employee_id', params.employeeId)
    .in('status', ['published', 'completed'])
    .lt('start_time', params.endTime)
    .gt('end_time', params.startTime);
  if (params.excludeShiftId) query = query.neq('id', params.excludeShiftId);
  const { data, error } = await query;
  if (error) throw error;
  return data as Shift[];
}
