import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

export enum InventoryStatusFilter {
  ALL = 'ALL',
  LOW_STOCK = 'LOW_STOCK',
  OUT_OF_STOCK = 'OUT_OF_STOCK',
}

export class AdjustStockDto {
  @IsString()
  @IsNotEmpty()
  variantId!: string;

  @Type(() => Number)
  @IsInt()
  quantityChange!: number; // can be positive or negative

  @IsOptional()
  @IsString()
  reason?: string;
}

export class UpdateInventoryDto {
  @IsString()
  @IsNotEmpty()
  variantId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  stockQuantity!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  lowStockAlert?: number;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class ReserveStockItem {
  @IsString()
  @IsNotEmpty()
  variantId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;
}

export class InventoryQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(InventoryStatusFilter)
  status?: InventoryStatusFilter;
}

export class InventoryLogQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  variantId?: string;
}
