import { Injectable } from '@nestjs/common';
import { DatabaseProvider } from '@core/database/database.provider';
import { DeviceType } from '@core/utils/device-detection';

export interface DailyVisitorCount {
  date: string;
  desktop: number;
  mobile: number;
}

@Injectable()
export class AnalyticsRepository {
  constructor(private readonly db: DatabaseProvider) {}

  async recordPageView(data: {
    path: string;
    referrer?: string | null;
    userAgent?: string | null;
    device: DeviceType;
    ip?: string | null;
    sessionId?: string | null;
    userId?: string | null;
  }): Promise<void> {
    await this.db.pageView.create({
      data: {
        path: data.path,
        referrer: data.referrer ?? null,
        userAgent: data.userAgent ?? null,
        device: data.device,
        ip: data.ip ?? null,
        sessionId: data.sessionId ?? null,
        userId: data.userId ?? null,
      },
    });
  }

  async getDailyVisitors(days: number): Promise<DailyVisitorCount[]> {
    const results = await this.db.$queryRaw<
      Array<{ date: Date; desktop: bigint; mobile: bigint }>
    >`
      WITH date_range AS (
        SELECT generate_series(
          CURRENT_DATE - make_interval(days => ${days}),
          CURRENT_DATE,
          INTERVAL '1 day'
        )::date AS day
      )
      SELECT
        dr.day AS date,
        COALESCE(COUNT(pv.id) FILTER (WHERE pv.device = 'DESKTOP'), 0) AS desktop,
        COALESCE(COUNT(pv.id) FILTER (WHERE pv.device = 'MOBILE'), 0) AS mobile
      FROM date_range dr
      LEFT JOIN page_views pv ON DATE(pv.created_at) = dr.day
      GROUP BY dr.day
      ORDER BY dr.day ASC
    `;

    return results.map((row) => ({
      date: row.date instanceof Date
        ? row.date.toISOString().split('T')[0]
        : String(row.date),
      desktop: Number(row.desktop),
      mobile: Number(row.mobile),
    }));
  }
}
