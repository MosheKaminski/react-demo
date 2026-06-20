import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from './api';
import type { OvertimePolicy, SalaryAdjustmentInput, SalaryProfileInput } from '../../types/domain';

export function useSalaryProfile(employeeId: string | undefined) {
  return useQuery({
    queryKey: ['salary-profile', employeeId] as const,
    queryFn: () => api.getLatestSalaryProfile(employeeId!),
    enabled: !!employeeId,
  });
}

export function useSaveSalaryProfile(employeeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SalaryProfileInput) => api.saveSalaryProfile(employeeId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['salary-profile', employeeId] }),
  });
}

export function useSalaryAdjustments(employeeId: string | undefined) {
  return useQuery({
    queryKey: ['salary-adjustments', employeeId] as const,
    queryFn: () => api.listSalaryAdjustments(employeeId!),
    enabled: !!employeeId,
  });
}

export function useCreateSalaryAdjustment(employeeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ input, createdBy }: { input: SalaryAdjustmentInput; createdBy: string }) =>
      api.createSalaryAdjustment(input, createdBy),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['salary-adjustments', employeeId] }),
  });
}

export function useOvertimePolicy() {
  return useQuery({ queryKey: ['overtime-policy'] as const, queryFn: api.getOvertimePolicy });
}

export function useUpdateOvertimePolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Omit<OvertimePolicy, 'id' | 'updated_at'> }) =>
      api.updateOvertimePolicy(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['overtime-policy'] }),
  });
}

export function useRunPayroll() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: api.RunPayrollParams) => api.runPayroll(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-runs'] });
      queryClient.invalidateQueries({ queryKey: ['payroll-lines'] });
    },
  });
}

export function usePayrollRuns() {
  return useQuery({ queryKey: ['payroll-runs'] as const, queryFn: api.listPayrollRuns });
}

export function usePayrollLines(payrollRunId: string | undefined) {
  return useQuery({
    queryKey: ['payroll-lines', payrollRunId] as const,
    queryFn: () => api.listPayrollLines(payrollRunId!),
    enabled: !!payrollRunId,
  });
}

export function usePayrollLinesForEmployee(employeeId: string | undefined) {
  return useQuery({
    queryKey: ['payroll-lines-for-employee', employeeId] as const,
    queryFn: () => api.listPayrollLinesForEmployee(employeeId!),
    enabled: !!employeeId,
  });
}

export function useFinalizePayrollRun() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.finalizePayrollRun(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['payroll-runs'] }),
  });
}

export function useReopenPayrollRun() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, auditNote }: { id: string; auditNote: string }) =>
      api.reopenPayrollRun(id, auditNote),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['payroll-runs'] }),
  });
}
