import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from './api';
import type { ShiftFilters } from './api';
import type { ShiftInput } from '../../types/domain';

const shiftsKey = (filters: ShiftFilters) => ['shifts', filters] as const;

export function useShifts(filters: ShiftFilters = {}) {
  return useQuery({ queryKey: shiftsKey(filters), queryFn: () => api.listShifts(filters) });
}

export function useCreateShift() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ShiftInput) => api.createShift(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shifts'] }),
  });
}

export function useUpdateShift() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<ShiftInput> }) =>
      api.updateShift(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shifts'] }),
  });
}

export function useDeleteShift() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteShift(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shifts'] }),
  });
}

export function useOverlapCheck() {
  return useMutation({
    mutationFn: (params: {
      employeeId: string;
      startTime: string;
      endTime: string;
      excludeShiftId?: string;
    }) => api.findOverlappingShifts(params),
  });
}
