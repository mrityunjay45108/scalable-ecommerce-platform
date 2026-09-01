import { Controller, Get, Query } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@ecommerce/types';
import { AnalyticsQueryDto } from './analytics.dto';

@Controller('admin/analytics')
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  @Roles(Role.ADMIN, Role.STAFF)
  @Get('dashboard')
  getDashboardMetrics(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getDashboardMetrics(query);
  }
}
