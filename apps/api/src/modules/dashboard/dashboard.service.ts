import { Injectable } from '@nestjs/common';
import { EnquiryRepository } from '../enquiry/repositories';
import { UserRepository } from '../auth/repositories';
import { AnalyticsRepository, DailyVisitorCount } from '../analytics/repositories';
import { DashboardStatsResponse, StatValue } from './dto';

@Injectable()
export class DashboardService {
  constructor(
    private readonly enquiryRepository: EnquiryRepository,
    private readonly userRepository: UserRepository,
    private readonly analyticsRepository: AnalyticsRepository,
  ) {}

  async getStats(): Promise<DashboardStatsResponse> {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;

    const [
      currentOrderValue,
      previousOrderValue,
      currentOrderCount,
      previousOrderCount,
      currentNewUsers,
      previousNewUsers,
      activeUsers,
    ] = await Promise.all([
      this.enquiryRepository.getMonthlyOrderValue(currentYear, currentMonth),
      this.enquiryRepository.getMonthlyOrderValue(prevYear, prevMonth),
      this.enquiryRepository.getMonthlyOrderCount(currentYear, currentMonth),
      this.enquiryRepository.getMonthlyOrderCount(prevYear, prevMonth),
      this.userRepository.getMonthlyNewUsers(currentYear, currentMonth),
      this.userRepository.getMonthlyNewUsers(prevYear, prevMonth),
      this.userRepository.getActiveUsersCount(30),
    ]);

    return {
      totalOrderValue: this.computeStat(currentOrderValue.total, previousOrderValue.total),
      newCustomers: this.computeStat(currentNewUsers, previousNewUsers),
      activeUsers: this.computeStat(activeUsers, activeUsers),
      totalOrders: this.computeStat(currentOrderCount, previousOrderCount),
    };
  }

  async getDailyVisitors(days: number): Promise<DailyVisitorCount[]> {
    return this.analyticsRepository.getDailyVisitors(days);
  }

  private computeStat(current: number, previous: number): StatValue {
    const change = previous === 0
      ? (current > 0 ? 100 : 0)
      : ((current - previous) / previous) * 100;

    const trend: StatValue['trend'] =
      change > 0 ? 'up' : change < 0 ? 'down' : 'neutral';

    return {
      value: current,
      change: Math.round(change * 10) / 10,
      trend,
    };
  }
}
