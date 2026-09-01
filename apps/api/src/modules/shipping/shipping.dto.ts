import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
  IsObject,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ShipmentStatus } from '@ecommerce/types';

export class CreateShipmentDto {
  @ApiProperty({ description: 'Order ID to generate shipment for', example: 'd3b07384-d113-4b72-881b-9e45c71d6e12' })
  @IsString()
  @IsNotEmpty()
  orderId: string;

  @ApiPropertyOptional({ description: 'Courier provider name', example: 'STANDARD_EXPRESS' })
  @IsString()
  @IsOptional()
  courierProvider?: string;

  @ApiPropertyOptional({ description: 'Package weight in KG', example: 1.25 })
  @IsNumber()
  @IsOptional()
  @Min(0.01)
  @Type(() => Number)
  weightKg?: number;

  @ApiPropertyOptional({ description: 'Package physical dimensions in cm', example: { lengthCm: 25, widthCm: 15, heightCm: 10 } })
  @IsObject()
  @IsOptional()
  dimensions?: {
    lengthCm: number;
    widthCm: number;
    heightCm: number;
  };

  @ApiPropertyOptional({ description: 'Fulfillment notes or handling instructions', example: 'Fragile electronics package' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateShipmentStatusDto {
  @ApiProperty({ description: 'New shipment status', enum: ShipmentStatus, example: ShipmentStatus.IN_TRANSIT })
  @IsEnum(ShipmentStatus)
  status: ShipmentStatus;

  @ApiPropertyOptional({ description: 'Current physical location of the package', example: 'Delhi Regional Hub' })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiPropertyOptional({ description: 'Tracking activity description', example: 'Departed from sort facility' })
  @IsString()
  @IsOptional()
  activity?: string;

  @ApiPropertyOptional({ description: 'Reason if delivery failed or RTO initiated', example: 'Customer not reachable' })
  @IsString()
  @IsOptional()
  failureReason?: string;

  @ApiPropertyOptional({ description: 'Internal admin notes' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class CancelShipmentDto {
  @ApiPropertyOptional({ description: 'Cancellation reason', example: 'Order cancelled by customer before dispatch' })
  @IsString()
  @IsOptional()
  reason?: string;
}

export class ShipmentQueryDto {
  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 10 })
  @IsOptional()
  @Type(() => Number)
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Filter by shipment status', enum: ShipmentStatus })
  @IsOptional()
  @IsEnum(ShipmentStatus)
  status?: ShipmentStatus;

  @ApiPropertyOptional({ description: 'Filter by courier provider', example: 'STANDARD_EXPRESS' })
  @IsOptional()
  @IsString()
  courierProvider?: string;

  @ApiPropertyOptional({ description: 'Search term (AWB, order number, recipient name)' })
  @IsOptional()
  @IsString()
  search?: string;
}

export class WebhookCourierDto {
  @ApiProperty({ description: 'Unique webhook event identifier for idempotency', example: 'EVT-98124912' })
  @IsString()
  @IsNotEmpty()
  eventId: string;

  @ApiProperty({ description: 'Air Waybill (AWB) number', example: 'EXP-84920194-IN' })
  @IsString()
  @IsNotEmpty()
  awbNumber: string;

  @ApiProperty({ description: 'Updated shipment status', enum: ShipmentStatus })
  @IsEnum(ShipmentStatus)
  status: ShipmentStatus;

  @ApiPropertyOptional({ description: 'Current checkpoint location', example: 'Bengaluru Delivery Hub' })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiPropertyOptional({ description: 'Tracking activity description' })
  @IsString()
  @IsOptional()
  activity?: string;

  @ApiPropertyOptional({ description: 'Timestamp of the event' })
  @IsOptional()
  timestamp?: string | Date;

  @ApiPropertyOptional({ description: 'Raw payload from courier' })
  @IsOptional()
  data?: any;
}
