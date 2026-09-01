import { IsOptional, IsEnum, IsDateString } from 'class-validator';

export enum DateRangeFilter {
  TODAY = 'TODAY',
  DAYS_7 = '7_DAYS',
  DAYS_30 = '30_DAYS',
  DAYS_90 = '90_DAYS',
  CUSTOM = 'CUSTOM',
}

export class AnalyticsQueryDto {
  @IsOptional()
  @IsEnum(DateRangeFilter)
  range?: DateRangeFilter = DateRangeFilter.DAYS_30;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
