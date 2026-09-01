import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { WishlistService } from './wishlist.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { MoveToCartDto } from './wishlist.dto';

@ApiTags('wishlist')
@ApiBearerAuth('JWT')
@Controller('wishlist')
export class WishlistController {
  constructor(private wishlistService: WishlistService) {}

  @Get()
  @ApiOperation({ summary: 'Get current user wishlist' })
  getWishlist(@CurrentUser('id') userId: string) {
    return this.wishlistService.getWishlist(userId);
  }

  @Post(':productId')
  @ApiOperation({ summary: 'Toggle product in wishlist (add/remove)' })
  toggleWishlist(
    @CurrentUser('id') userId: string,
    @Param('productId') productId: string,
  ) {
    return this.wishlistService.toggleWishlist(userId, productId);
  }

  @Post('add/:productId')
  @ApiOperation({ summary: 'Add product to wishlist (prevents duplicates)' })
  addToWishlist(
    @CurrentUser('id') userId: string,
    @Param('productId') productId: string,
  ) {
    return this.wishlistService.addToWishlist(userId, productId);
  }

  @Delete(':productId')
  @ApiOperation({ summary: 'Remove product from wishlist' })
  removeFromWishlist(
    @CurrentUser('id') userId: string,
    @Param('productId') productId: string,
  ) {
    return this.wishlistService.removeFromWishlist(userId, productId);
  }

  @Post(':productId/move-to-cart')
  @ApiOperation({ summary: 'Move wishlist item to cart with inventory check' })
  @ApiResponse({ status: 200, description: 'Product moved to cart and removed from wishlist' })
  moveToCart(
    @CurrentUser('id') userId: string,
    @Param('productId') productId: string,
    @Body() dto: MoveToCartDto,
  ) {
    return this.wishlistService.moveToCart(userId, productId, dto);
  }

  @Delete('clear/all')
  @ApiOperation({ summary: 'Clear all items in wishlist' })
  clearWishlist(@CurrentUser('id') userId: string) {
    return this.wishlistService.clearWishlist(userId);
  }
}
