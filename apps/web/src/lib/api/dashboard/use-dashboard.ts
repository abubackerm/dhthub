import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { getDashboardStats } from './dashboard';
import type { DashboardStatsResponse } from './types';

export const DASHBOARD_QUERY_KEY = ['dashboard'];

export function useDashboardStats(): UseQueryResult<DashboardStatsResponse, Error> {
  return useQuery({
    queryKey: [DASHBOARD_QUERY_KEY, 'stats'],
    queryFn: () => getDashboardStats(),
    staleTime: 5 * 60 * 1000,
  });
}
