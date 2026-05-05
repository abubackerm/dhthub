import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardStatsResponse } from './dto';
import { DailyVisitorsQueryDto } from '../analytics/dto';
import { DailyVisitorCount } from '../analytics/repositories';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('dashboard')
@UseGuards(AuthGuard, RolesGuard)
@Roles('admin', 'super_admin')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  async getStats(): Promise<DashboardStatsResponse> {
    return this.dashboardService.getStats();
  }

  @Get('visitors')
  async getDailyVisitors(
    @Query() dto: DailyVisitorsQueryDto,
  ): Promise<DailyVisitorCount[]> {
    return this.dashboardService.getDailyVisitors(dto.days ?? 90);
  }
}
