import { useQuery } from '@tanstack/react-query';
import * as api from './api';

export function useBranchMetrics(branchId: string | undefined, year: number, month: number) {
  return useQuery({
    queryKey: ['branch-metrics', branchId, year, month] as const,
    queryFn: () => api.getBranchMetrics(branchId!, year, month),
    enabled: !!branchId,
  });
}

export function useOrgMetrics(year: number, month: number) {
  return useQuery({
    queryKey: ['org-metrics', year, month] as const,
    queryFn: () => api.getOrgMetrics(year, month),
  });
}

export function useMonthlyTrend(monthsBack: number) {
  return useQuery({
    queryKey: ['monthly-trend', monthsBack] as const,
    queryFn: () => api.getMonthlyTrend(monthsBack),
  });
}
