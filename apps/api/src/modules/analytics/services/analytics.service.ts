import { Injectable } from '@nestjs/common';
import { AnalyticsRepository, DailyVisitorCount } from '../repositories';

@Injectable()
export class AnalyticsService {
  constructor(private readonly analyticsRepository: AnalyticsRepository) {}

  async recordPageView(data: {
    path: string;
    referrer?: string | null;
    userAgent?: string | null;
    device: string;
    ip?: string | null;
    sessionId?: string | null;
    userId?: string | null;
  }): Promise<void> {
    await this.analyticsRepository.recordPageView({
      path: data.path,
      referrer: data.referrer,
      userAgent: data.userAgent,
      device: data.device as any,
      ip: data.ip,
      sessionId: data.sessionId,
      userId: data.userId,
    });
  }

  async getDailyVisitors(days: number): Promise<DailyVisitorCount[]> {
    return this.analyticsRepository.getDailyVisitors(days);
  }
}
