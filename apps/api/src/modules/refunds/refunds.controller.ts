import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { RefundsService } from './refunds.service';
import {
  CreateRefundDto,
  ProcessRefundDto,
  RefundQueryDto,
} from './refunds.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@ecommerce/types';

@ApiTags('Refunds & Payment Gateways')
@ApiBearerAuth()
@Controller('refunds')
export class RefundsController {
  constructor(private readonly refundsService: RefundsService) {}

  @Post()
  @ApiOperation({ summary: 'Initiate a refund for an order or approved return request' })
  @ApiResponse({ status: 201, description: 'Refund initiated and processed' })
  @ApiResponse({ status: 400, description: 'Payment not captured or amount exceeds eligible balance' })
  createRefund(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Body() dto: CreateRefundDto,
  ) {
    return this.refundsService.initiateRefund(userId, role, dto);
  }

  @Roles(Role.ADMIN, Role.STAFF)
  @Get('admin/all')
  @ApiOperation({ summary: 'Admin: List and search all refunds with summary financial metrics' })
  @ApiResponse({ status: 200, description: 'Refunds list and aggregates retrieved' })
  findAllAdmin(@Query() query: RefundQueryDto) {
    return this.refundsService.findAllAdminRefunds(query);
  }

  @Roles(Role.ADMIN, Role.STAFF)
  @Post('admin/:id/process')
  @ApiOperation({ summary: 'Admin: Process or retry a pending/failed refund' })
  @ApiParam({ name: 'id', description: 'Refund ID' })
  @ApiResponse({ status: 200, description: 'Refund processed' })
  processRefundAdmin(
    @Param('id') id: string,
    @CurrentUser('id') adminUserId: string,
    @Body() dto: ProcessRefundDto,
  ) {
    return this.refundsService.processRefundAdmin(id, adminUserId, dto);
  }

  @Get('order/:orderId')
  @ApiOperation({ summary: 'Get all refunds for a specific order' })
  @ApiParam({ name: 'orderId', description: 'Order ID' })
  @ApiResponse({ status: 200, description: 'Order refunds list retrieved' })
  getRefundsByOrderId(
    @Param('orderId') orderId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.refundsService.getRefundsByOrderId(orderId, userId, role);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get refund details by Refund ID, Refund Number, or Gateway Reference' })
  @ApiParam({ name: 'id', description: 'Refund ID, Refund Number, or Gateway Reference' })
  @ApiResponse({ status: 200, description: 'Refund details retrieved' })
  getRefundById(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.refundsService.getRefundById(id, userId, role);
  }
}
