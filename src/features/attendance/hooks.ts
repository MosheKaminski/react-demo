import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from './api';
import type { ManualAttendanceInput } from '../../types/domain';

export function useOpenAttendance(employeeId: string | undefined) {
  return useQuery({
    queryKey: ['attendance-open', employeeId] as const,
    queryFn: () => api.getOpenAttendance(employeeId!),
    enabled: !!employeeId,
  });
}

export function useAttendanceHistory(employeeId: string | undefined) {
  return useQuery({
    queryKey: ['attendance-history', employeeId] as const,
    queryFn: () => api.listAttendanceForEmployee(employeeId!),
    enabled: !!employeeId,
  });
}

export function usePendingApprovals() {
  return useQuery({
    queryKey: ['attendance-pending'] as const,
    queryFn: api.listPendingApprovals,
  });
}

function useInvalidateAttendance() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['attendance-open'] });
    queryClient.invalidateQueries({ queryKey: ['attendance-history'] });
    queryClient.invalidateQueries({ queryKey: ['attendance-pending'] });
  };
}

export function useClockIn() {
  const invalidate = useInvalidateAttendance();
  return useMutation({
    mutationFn: (params: { employeeId: string; branchId: string; geoLat?: number | null; geoLng?: number | null }) =>
      api.clockIn(params),
    onSuccess: invalidate,
  });
}

export function useClockOut() {
  const invalidate = useInvalidateAttendance();
  return useMutation({
    mutationFn: (attendanceId: string) => api.clockOut(attendanceId),
    onSuccess: invalidate,
  });
}

export function useCreateManualAttendance() {
  const invalidate = useInvalidateAttendance();
  return useMutation({
    mutationFn: (input: ManualAttendanceInput) => api.createManualAttendance(input),
    onSuccess: invalidate,
  });
}

export function useSetAttendanceStatus() {
  const invalidate = useInvalidateAttendance();
  return useMutation({
    mutationFn: ({
      id,
      status,
      approvedBy,
    }: {
      id: string;
      status: 'approved' | 'rejected';
      approvedBy: string;
    }) => api.setAttendanceStatus(id, status, approvedBy),
    onSuccess: invalidate,
  });
}
