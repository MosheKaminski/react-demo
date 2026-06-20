import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from './api';
import type { DocumentType, EmployeeDocument } from '../../types/domain';

export function useDocuments(employeeId: string | undefined) {
  return useQuery({
    queryKey: ['documents', employeeId] as const,
    queryFn: () => api.listDocuments(employeeId!),
    enabled: !!employeeId,
  });
}

export function useUploadDocument(employeeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { type: DocumentType; file: File; uploadedBy: string }) =>
      api.uploadDocument({ employeeId, ...params }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['documents', employeeId] }),
  });
}

export function useDeleteDocument(employeeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (doc: EmployeeDocument) => api.deleteDocument(doc),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['documents', employeeId] }),
  });
}
