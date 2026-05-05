export interface StatValue {
  value: number;
  change: number;
  trend: 'up' | 'down' | 'neutral';
}

export interface DashboardStatsResponse {
  totalOrderValue: StatValue;
  newCustomers: StatValue;
  activeUsers: StatValue;
  totalOrders: StatValue;
}
