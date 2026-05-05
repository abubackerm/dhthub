import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { getDailyVisitors } from './visitors';
import type { DailyVisitorCount } from './visitors';
import { DASHBOARD_QUERY_KEY } from './use-dashboard';

export function useDailyVisitors(
  days: number = 90,
): UseQueryResult<DailyVisitorCount[], Error> {
  return useQuery({
    queryKey: [DASHBOARD_QUERY_KEY, 'visitors', days],
    queryFn: () => getDailyVisitors(days),
    staleTime: 5 * 60 * 1000,
  });
}
