import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentProvider, CODStatus } from '@ecommerce/types';

export class CreatePaymentIntentDto {
  @ApiProperty({ description: 'Order ID for the transaction' })
  @IsString()
  @IsNotEmpty()
  orderId!: string;

  @ApiProperty({ description: 'Selected payment gateway or COD', enum: PaymentProvider })
  @IsEnum(PaymentProvider)
  provider!: PaymentProvider;
}

export class VerifyPaymentDto {
  @ApiProperty({ description: 'Order ID' })
  @IsString()
  @IsNotEmpty()
  orderId!: string;

  @ApiProperty({ description: 'Payment provider used', enum: PaymentProvider })
  @IsEnum(PaymentProvider)
  provider!: PaymentProvider;

  @ApiPropertyOptional({ description: 'Gateway order ID (Razorpay/Stripe)' })
  @IsOptional()
  @IsString()
  providerOrderId?: string;

  @ApiProperty({ description: 'Gateway payment ID' })
  @IsString()
  @IsNotEmpty()
  providerPaymentId!: string;

  @ApiPropertyOptional({ description: 'HMAC signature for verification' })
  @IsOptional()
  @IsString()
  signature?: string;
}

export class ConfirmPaymentDto {
  @ApiProperty({ description: 'Order ID' })
  @IsString()
  @IsNotEmpty()
  orderId!: string;

  @ApiProperty({ description: 'Transaction ID from payment gateway' })
  @IsString()
  @IsNotEmpty()
  transactionId!: string;

  @ApiPropertyOptional({ description: 'Raw payload from payment gateway' })
  @IsOptional()
  paymentData?: any;
}

export class RefundPaymentDto {
  @ApiPropertyOptional({ description: 'Refund amount in INR (default: full order amount)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  amount?: number;

  @ApiPropertyOptional({ description: 'Reason for processing the refund' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class RetryPaymentDto {
  @ApiProperty({ description: 'Order ID' })
  @IsString()
  @IsNotEmpty()
  orderId!: string;

  @ApiPropertyOptional({ description: 'New payment provider', enum: PaymentProvider })
  @IsOptional()
  @IsEnum(PaymentProvider)
  provider?: PaymentProvider;
}

export class ConfirmCodCollectionDto {
  @ApiPropertyOptional({ description: 'Receipt number or cash voucher ID', example: 'REC-COD-2026-912' })
  @IsOptional()
  @IsString()
  receiptNumber?: string;

  @ApiPropertyOptional({ description: 'Delivery agent / Courier executive name', example: 'Vikas Singh' })
  @IsOptional()
  @IsString()
  collectedBy?: string;

  @ApiPropertyOptional({ description: 'Run sheet or Courier AWB reference', example: 'EXP-84920194-IN' })
  @IsOptional()
  @IsString()
  courierReference?: string;

  @ApiPropertyOptional({ description: 'Collection remarks / notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class SettleCodDto {
  @ApiPropertyOptional({ description: 'Bank settlement transaction reference', example: 'SETTLE-BANK-9012' })
  @IsOptional()
  @IsString()
  settlementReference?: string;

  @ApiPropertyOptional({ description: 'Settlement remarks / notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CodLedgerQueryDto {
  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 10 })
  @IsOptional()
  @Type(() => Number)
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Filter by COD status', enum: CODStatus })
  @IsOptional()
  @IsEnum(CODStatus)
  status?: CODStatus;

  @ApiPropertyOptional({ description: 'Search term (Order number, receipt, courier ref)' })
  @IsOptional()
  @IsString()
  search?: string;
}
