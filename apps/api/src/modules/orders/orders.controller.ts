import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@ecommerce/types';
import { CheckoutDto, CheckoutPreviewDto, UpdateOrderStatusDto, OrderQueryDto } from './orders.dto';

@Controller('orders')
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Post('preview')
  previewCheckout(
    @CurrentUser('id') userId: string,
    @Body() dto: CheckoutPreviewDto,
  ) {
    return this.ordersService.previewCheckout(userId, dto);
  }

  @Post('checkout')
  checkout(
    @CurrentUser('id') userId: string,
    @Body() dto: CheckoutDto,
  ) {
    return this.ordersService.checkout(userId, dto);
  }

  @Get()
  findMyOrders(
    @CurrentUser('id') userId: string,
    @Query() query: OrderQueryDto,
  ) {
    return this.ordersService.findUserOrders(userId, query);
  }

  @Get(':id')
  findOrderById(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Param('id') id: string,
  ) {
    // If admin, can view any order; else user's own order
    return this.ordersService.findOrderById(id, role === Role.ADMIN ? undefined : userId);
  }

  @Post(':id/cancel')
  cancelOrder(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Param('id') id: string,
  ) {
    return this.ordersService.cancelOrder(id, role === Role.ADMIN ? undefined : userId);
  }

  // Admin routes
  @Roles(Role.ADMIN)
  @Get('admin/all')
  findAllAdmin(@Query() query: OrderQueryDto) {
    return this.ordersService.findAllAdmin(query);
  }

  @Roles(Role.ADMIN)
  @Patch('admin/:id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
    @CurrentUser('id') adminUserId: string,
  ) {
    return this.ordersService.updateOrderStatus(id, dto, adminUserId);
  }
}
