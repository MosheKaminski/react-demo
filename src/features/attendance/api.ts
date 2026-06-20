import { supabase } from '../../lib/supabaseClient';
import type { AttendanceRecord, ManualAttendanceInput } from '../../types/domain';

export async function getOpenAttendance(employeeId: string): Promise<AttendanceRecord | null> {
  const { data, error } = await supabase
    .from('attendance_records')
    .select('*')
    .eq('employee_id', employeeId)
    .eq('source', 'app')
    .is('clock_out', null)
    .order('clock_in', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as AttendanceRecord | null;
}

export async function clockIn(params: {
  employeeId: string;
  branchId: string;
  geoLat?: number | null;
  geoLng?: number | null;
}): Promise<AttendanceRecord> {
  const { data, error } = await supabase
    .from('attendance_records')
    .insert({
      employee_id: params.employeeId,
      branch_id: params.branchId,
      source: 'app',
      status: 'approved',
      geo_lat: params.geoLat ?? null,
      geo_lng: params.geoLng ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as AttendanceRecord;
}

export async function clockOut(attendanceId: string): Promise<AttendanceRecord> {
  const { data, error } = await supabase
    .rpc('clock_out_attendance', { p_attendance_id: attendanceId })
    .single();
  if (error) throw error;
  return data as AttendanceRecord;
}

export async function listAttendanceForEmployee(employeeId: string): Promise<AttendanceRecord[]> {
  const { data, error } = await supabase
    .from('attendance_records')
    .select('*')
    .eq('employee_id', employeeId)
    .order('clock_in', { ascending: false })
    .limit(50);
  if (error) throw error;
  return data as AttendanceRecord[];
}

export async function listPendingApprovals(): Promise<AttendanceRecord[]> {
  const { data, error } = await supabase
    .from('attendance_records')
    .select('*')
    .eq('status', 'pending')
    .order('clock_in', { ascending: false });
  if (error) throw error;
  return data as AttendanceRecord[];
}

export async function createManualAttendance(
  input: ManualAttendanceInput,
): Promise<AttendanceRecord> {
  const { data, error } = await supabase
    .from('attendance_records')
    .insert({ ...input, source: 'manual_entry', status: 'pending' })
    .select()
    .single();
  if (error) throw error;
  return data as AttendanceRecord;
}

export async function setAttendanceStatus(
  id: string,
  status: 'approved' | 'rejected',
  approvedBy: string,
): Promise<void> {
  const { error } = await supabase
    .from('attendance_records')
    .update({ status, approved_by: approvedBy })
    .eq('id', id);
  if (error) throw error;
}
