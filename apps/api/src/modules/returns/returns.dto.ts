import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
  IsArray,
  ValidateNested,
  Min,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ReturnReason,
  ReturnAction,
  ReturnStatus,
  QualityCheckResult,
} from '@ecommerce/types';

export class CreateReturnItemDto {
  @ApiProperty({ description: 'OrderItem ID to return', example: 'oi-123' })
  @IsString()
  @IsNotEmpty()
  orderItemId: string;

  @ApiProperty({ description: 'Quantity of this item to return', example: 1, minimum: 1 })
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  quantity: number;

  @ApiPropertyOptional({ description: 'Specific reason for returning this item', enum: ReturnReason })
  @IsOptional()
  @IsEnum(ReturnReason)
  reason?: ReturnReason;
}

export class BankDetailsDto {
  @ApiPropertyOptional({ description: 'Bank Account Number for COD refund' })
  @IsOptional()
  @IsString()
  accountNumber?: string;

  @ApiPropertyOptional({ description: 'Bank IFSC Code' })
  @IsOptional()
  @IsString()
  ifscCode?: string;

  @ApiPropertyOptional({ description: 'Account Holder Name' })
  @IsOptional()
  @IsString()
  accountHolderName?: string;

  @ApiPropertyOptional({ description: 'UPI ID / VPA (e.g. user@okhdfcbank)' })
  @IsOptional()
  @IsString()
  upiId?: string;
}

export class CreateReturnRequestDto {
  @ApiProperty({ description: 'Order ID to initiate return for', example: 'ord-123' })
  @IsString()
  @IsNotEmpty()
  orderId: string;

  @ApiProperty({ description: 'Primary return reason', enum: ReturnReason, example: ReturnReason.DAMAGED })
  @IsEnum(ReturnReason)
  reason: ReturnReason;

  @ApiPropertyOptional({ description: 'Requested resolution action: REFUND or REPLACEMENT', enum: ReturnAction, default: ReturnAction.REFUND })
  @IsOptional()
  @IsEnum(ReturnAction)
  action?: ReturnAction = ReturnAction.REFUND;

  @ApiPropertyOptional({ description: 'Customer explanation or details', example: 'Product arrived with broken display' })
  @IsOptional()
  @IsString()
  customerNote?: string;

  @ApiPropertyOptional({ description: 'Image URLs of damaged product / evidence uploaded to Storage', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  evidenceImages?: string[];

  @ApiProperty({ description: 'List of items being returned', type: [CreateReturnItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateReturnItemDto)
  items: CreateReturnItemDto[];

  @ApiPropertyOptional({ description: 'Optional custom reverse pickup address' })
  @IsOptional()
  @IsObject()
  pickupAddress?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Bank / UPI details for COD refund payout', type: BankDetailsDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => BankDetailsDto)
  bankDetails?: BankDetailsDto;
}

export class ApproveReturnDto {
  @ApiPropertyOptional({ description: 'Internal admin notes or instructions' })
  @IsOptional()
  @IsString()
  adminNote?: string;

  @ApiPropertyOptional({ description: 'Scheduled reverse pickup date' })
  @IsOptional()
  pickupScheduledDate?: Date | string;
}

export class RejectReturnDto {
  @ApiProperty({ description: 'Mandatory reason for return rejection', example: 'Item returned outside 14-day policy window or tampered seal' })
  @IsString()
  @IsNotEmpty()
  rejectionReason: string;
}

export class QualityCheckDto {
  @ApiProperty({ description: 'QC evaluation result', enum: QualityCheckResult, example: QualityCheckResult.PASSED_RESTOCKABLE })
  @IsEnum(QualityCheckResult)
  qcResult: QualityCheckResult;

  @ApiPropertyOptional({ description: 'Detailed QC inspection notes' })
  @IsOptional()
  @IsString()
  qcNotes?: string;

  @ApiPropertyOptional({ description: 'Whether to restock item into available inventory (defaults to true if PASSED_RESTOCKABLE)', default: true })
  @IsOptional()
  restockItems?: boolean;
}

export class ProcessReplacementDto {
  @ApiPropertyOptional({ description: 'Outbound replacement shipment tracking / AWB number', example: 'EXP-REP-948194-IN' })
  @IsOptional()
  @IsString()
  trackingNumber?: string;

  @ApiPropertyOptional({ description: 'Replacement dispatch notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ReturnQueryDto {
  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 10 })
  @IsOptional()
  @Type(() => Number)
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Filter by return status', enum: ReturnStatus })
  @IsOptional()
  @IsEnum(ReturnStatus)
  status?: ReturnStatus;

  @ApiPropertyOptional({ description: 'Filter by return action', enum: ReturnAction })
  @IsOptional()
  @IsEnum(ReturnAction)
  action?: ReturnAction;

  @ApiPropertyOptional({ description: 'Search query (Return number, order number, customer email)' })
  @IsOptional()
  @IsString()
  search?: string;
}

export class WebhookReturnDto {
  @ApiProperty({ description: 'Unique webhook event identifier for idempotency', example: 'EVT-RET-84912' })
  @IsString()
  @IsNotEmpty()
  eventId: string;

  @ApiProperty({ description: 'Reverse pickup AWB number', example: 'RET-AWB-948194' })
  @IsString()
  @IsNotEmpty()
  pickupAwb: string;

  @ApiProperty({ description: 'Reverse shipment status', enum: ReturnStatus })
  @IsEnum(ReturnStatus)
  status: ReturnStatus;

  @ApiPropertyOptional({ description: 'Current checkpoint location' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ description: 'Tracking activity description' })
  @IsOptional()
  @IsString()
  activity?: string;

  @ApiPropertyOptional({ description: 'Timestamp of the event' })
  @IsOptional()
  timestamp?: string | Date;

  @ApiPropertyOptional({ description: 'Raw payload from courier' })
  @IsOptional()
  data?: any;
}
