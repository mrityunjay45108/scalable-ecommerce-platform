import { IsOptional, IsString, IsDateString } from 'class-validator';

export enum DateRangeFilter {
  TODAY = 'TODAY',
  DAYS_7 = '7_DAYS',
  DAYS_30 = '30_DAYS',
  DAYS_90 = '90_DAYS',
  CUSTOM = 'CUSTOM',
}

export class AnalyticsQueryDto {
  @IsOptional()
  @IsString()
  range?: string = '30_DAYS';

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}

