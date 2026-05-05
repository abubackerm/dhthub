import { apiClient } from '../client';

export interface DailyVisitorCount {
  date: string;
  desktop: number;
  mobile: number;
}

export async function getDailyVisitors(days: number = 90): Promise<DailyVisitorCount[]> {
  return apiClient.get<DailyVisitorCount[]>(`/v1/dashboard/visitors?days=${days}`);
}
