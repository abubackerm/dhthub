import { apiClient } from '../client';
import type { DashboardStatsResponse } from './types';

export async function getDashboardStats(): Promise<DashboardStatsResponse> {
  return apiClient.get<DashboardStatsResponse>('/v1/dashboard/stats');
}
