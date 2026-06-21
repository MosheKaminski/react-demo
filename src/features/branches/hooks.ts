import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from './api';
import type { BranchInput } from '../../types/domain';

const BRANCHES_KEY = ['branches'] as const;

export function useBranches() {
  return useQuery({ queryKey: BRANCHES_KEY, queryFn: api.listBranches });
}

export function useCreateBranch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: BranchInput) => api.createBranch(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: BRANCHES_KEY }),
  });
}

export function useUpdateBranch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<BranchInput> }) =>
      api.updateBranch(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: BRANCHES_KEY }),
  });
}

export function useSetBranchActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.setBranchActive(id, isActive),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: BRANCHES_KEY }),
  });
}

export function useManagedBranch(employeeId: string | undefined) {
  return useQuery({
    queryKey: ['managed-branch', employeeId] as const,
    queryFn: () => api.getManagedBranch(employeeId!),
    enabled: !!employeeId,
  });
}
