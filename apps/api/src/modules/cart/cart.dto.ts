import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AddToCartDto {
  @IsString()
  @IsNotEmpty()
  variantId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity: number = 1;
}

export class UpdateCartItemDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;
}

export class ApplyCouponDto {
  @IsString()
  @IsNotEmpty()
  code!: string;
}

export class MergeCartItemDto {
  @IsString()
  @IsNotEmpty()
  variantId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;
}

export class MergeCartDto {
  @IsOptional()
  @IsString()
  guestCartId?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MergeCartItemDto)
  items?: MergeCartItemDto[];
}
