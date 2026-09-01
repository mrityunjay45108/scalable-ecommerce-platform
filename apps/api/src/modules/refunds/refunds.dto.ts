import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
  IsPositive,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RefundStatus } from '@ecommerce/types';

export class CreateRefundDto {
  @ApiProperty({ description: 'Order ID to issue refund for', example: 'ord-123' })
  @IsString()
  @IsNotEmpty()
  orderId: string;

  @ApiPropertyOptional({ description: 'Associated Return Request ID (if refund originates from a return)', example: 'ret-123' })
  @IsOptional()
  @IsString()
  returnRequestId?: string;

  @ApiPropertyOptional({ description: 'Refund amount in INR (defaults to full remaining refundable order amount)', example: 1499.0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  amount?: number;

  @ApiProperty({ description: 'Reason for refund', example: 'Product return QC passed - full refund' })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiPropertyOptional({ description: 'Client/Caller idempotency key to prevent duplicate refund executions', example: 'idemp-refund-948124' })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}

export class ProcessRefundDto {
  @ApiPropertyOptional({ description: 'Admin processing notes or payout reference', example: 'Bank NEFT transfer processed' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class RefundQueryDto {
  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 10 })
  @IsOptional()
  @Type(() => Number)
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Filter by refund status', enum: RefundStatus })
  @IsOptional()
  @IsEnum(RefundStatus)
  status?: RefundStatus;

  @ApiPropertyOptional({ description: 'Filter by Order ID' })
  @IsOptional()
  @IsString()
  orderId?: string;

  @ApiPropertyOptional({ description: 'Search term (Refund number, gateway ref, order number)' })
  @IsOptional()
  @IsString()
  search?: string;
}
