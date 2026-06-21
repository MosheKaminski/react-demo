import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from './api';
import type { EmployeeFilters } from './api';
import type { EmployeeInput, Role } from '../../types/domain';

const employeesKey = (filters: EmployeeFilters) => ['employees', filters] as const;
const assignmentsKey = (employeeId: string) => ['employee-branch-assignments', employeeId] as const;

export function useEmployees(filters: EmployeeFilters = {}) {
  return useQuery({ queryKey: employeesKey(filters), queryFn: () => api.listEmployees(filters) });
}

export function useEmployeeByUserId(userId: string | undefined) {
  return useQuery({
    queryKey: ['employee-by-user', userId] as const,
    queryFn: () => api.getEmployeeByUserId(userId!),
    enabled: !!userId,
  });
}

export function useCreateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: EmployeeInput) => api.createEmployee(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['employees'] }),
  });
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<EmployeeInput> }) =>
      api.updateEmployee(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['employees'] }),
  });
}

export function useSetEmployeeActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      isActive ? api.reactivateEmployee(id) : api.deactivateEmployee(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['employees'] }),
  });
}

export function useBranchAssignments(employeeId: string) {
  return useQuery({
    queryKey: assignmentsKey(employeeId),
    queryFn: () => api.listBranchAssignments(employeeId),
    enabled: !!employeeId,
  });
}

export function useAddBranchAssignment(employeeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (branchId: string) => api.addBranchAssignment(employeeId, branchId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: assignmentsKey(employeeId) }),
  });
}

export function useRemoveBranchAssignment(employeeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (assignmentId: string) => api.removeBranchAssignment(assignmentId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: assignmentsKey(employeeId) }),
  });
}

export function useUpdateProfileRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: Role }) =>
      api.updateProfileRole(userId, role),
    onSuccess: (_data, { userId }) =>
      queryClient.invalidateQueries({ queryKey: ['profile-role', userId] }),
  });
}

export function useProfileRole(userId: string | null | undefined) {
  return useQuery({
    queryKey: ['profile-role', userId] as const,
    queryFn: () => api.getProfileRole(userId!),
    enabled: !!userId,
  });
}

export function useAllProfiles() {
  return useQuery({ queryKey: ['all-profiles'] as const, queryFn: api.listAllProfiles });
}
