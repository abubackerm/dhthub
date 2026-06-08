import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AnalyticsService } from '../services';
import { RecordPageViewDto, DailyVisitorsQueryDto } from '../dto';
import { DailyVisitorCount } from '../repositories';
import { detectDevice } from '@core/utils/device-detection';
import { AuthGuard } from '../../auth/auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Post('pageview')
  async recordPageView(
    @Body() dto: RecordPageViewDto,
    @Req() req: any,
  ): Promise<{ ok: boolean }> {
    const userAgent = req.headers['user-agent'] as string | undefined;
    const ip =
      (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ??
      req.ip ??
      null;

    const device = detectDevice(userAgent);
    const userId = req.user?.id ?? null;

    await this.analyticsService.recordPageView({
      path: dto.path,
      referrer: dto.referrer ?? null,
      userAgent: userAgent ?? null,
      device,
      ip,
      sessionId: dto.sessionId ?? null,
      userId,
    });

    return { ok: true };
  }

  @Get('visitors')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin', 'super_admin')
  async getDailyVisitors(
    @Query() dto: DailyVisitorsQueryDto,
  ): Promise<DailyVisitorCount[]> {
    return this.analyticsService.getDailyVisitors(dto.days ?? 90);
  }
}
