import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Headers,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CartService } from './cart.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import {
  AddToCartDto,
  UpdateCartItemDto,
  ApplyCouponDto,
  MergeCartDto,
} from './cart.dto';

@ApiTags('cart')
@Controller('cart')
export class CartController {
  constructor(private cartService: CartService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get current user cart or guest cart' })
  getCart(
    @CurrentUser('id') userId?: string,
    @Headers('x-guest-cart-id') guestCartId?: string,
  ) {
    if (userId) {
      return this.cartService.getOrCreateCart(userId);
    }
    if (guestCartId) {
      return this.cartService.getGuestCart(guestCartId);
    }
    return {
      id: 'guest',
      userId: null,
      items: [],
      totalItems: 0,
      subtotal: 0,
      discountAmount: 0,
      shippingAmount: 0,
      estimatedTax: 0,
      totalAmount: 0,
      coupon: null,
    };
  }

  @Public()
  @Post('items')
  @ApiOperation({ summary: 'Add product item to cart' })
  addItem(
    @Body() dto: AddToCartDto,
    @CurrentUser('id') userId?: string,
    @Headers('x-guest-cart-id') guestCartId?: string,
  ) {
    if (userId) {
      return this.cartService.addItem(userId, dto);
    }
    if (guestCartId) {
      return this.cartService.addGuestItem(guestCartId, dto);
    }
    return this.cartService.getGuestCart(guestCartId || 'anonymous');
  }

  @Public()
  @Patch('items/:id')
  @ApiOperation({ summary: 'Update cart item quantity' })
  updateItem(
    @Param('id') itemId: string,
    @Body() dto: UpdateCartItemDto,
    @CurrentUser('id') userId?: string,
    @Headers('x-guest-cart-id') guestCartId?: string,
  ) {
    if (userId) {
      return this.cartService.updateItemQuantity(userId, itemId, dto);
    }
    if (guestCartId) {
      return this.cartService.updateGuestItem(guestCartId, itemId, dto.quantity);
    }
    return { message: 'Invalid cart session' };
  }

  @Public()
  @Delete('items/:id')
  @ApiOperation({ summary: 'Remove item from cart' })
  removeItem(
    @Param('id') itemId: string,
    @CurrentUser('id') userId?: string,
    @Headers('x-guest-cart-id') guestCartId?: string,
  ) {
    if (userId) {
      return this.cartService.removeItem(userId, itemId);
    }
    if (guestCartId) {
      return this.cartService.removeGuestItem(guestCartId, itemId);
    }
    return { message: 'Invalid cart session' };
  }

  @Public()
  @Delete('clear')
  @ApiOperation({ summary: 'Clear all cart items' })
  clearCart(
    @CurrentUser('id') userId?: string,
    @Headers('x-guest-cart-id') guestCartId?: string,
  ) {
    if (userId) {
      return this.cartService.clearCart(userId);
    }
    if (guestCartId) {
      return this.cartService.clearGuestCart(guestCartId);
    }
    return { message: 'Cart cleared' };
  }

  @Public()
  @Post('apply-coupon')
  @ApiOperation({ summary: 'Apply discount coupon to cart' })
  applyCoupon(
    @Body() dto: ApplyCouponDto,
    @CurrentUser('id') userId?: string,
    @Headers('x-guest-cart-id') guestCartId?: string,
  ) {
    if (userId) {
      return this.cartService.applyCoupon(userId, dto.code);
    }
    if (guestCartId) {
      return this.cartService.applyGuestCoupon(guestCartId, dto.code);
    }
    return { message: 'Invalid session' };
  }

  @Public()
  @Delete('remove-coupon')
  @ApiOperation({ summary: 'Remove applied coupon from cart' })
  removeCoupon(
    @CurrentUser('id') userId?: string,
    @Headers('x-guest-cart-id') guestCartId?: string,
  ) {
    if (userId) {
      return this.cartService.removeCoupon(userId);
    }
    if (guestCartId) {
      return this.cartService.removeGuestCoupon(guestCartId);
    }
    return { message: 'Invalid session' };
  }

  @ApiBearerAuth('JWT')
  @Post('validate')
  @ApiOperation({ summary: 'Validate live inventory for all cart items' })
  validateCart(@CurrentUser('id') userId: string) {
    return this.cartService.validateInventory(userId);
  }

  @ApiBearerAuth('JWT')
  @Post('merge')
  @ApiOperation({ summary: 'Merge guest cart items into authenticated user cart' })
  mergeCart(@CurrentUser('id') userId: string, @Body() dto: MergeCartDto) {
    return this.cartService.mergeCart(userId, dto);
  }
}
