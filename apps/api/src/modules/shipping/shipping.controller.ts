import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { ShippingService } from './shipping.service';
import {
  CreateShipmentDto,
  UpdateShipmentStatusDto,
  CancelShipmentDto,
  ShipmentQueryDto,
  WebhookCourierDto,
} from './shipping.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Role } from '@ecommerce/types';

@ApiTags('Shipping & Logistics')
@ApiBearerAuth()
@Controller('shipments')
export class ShippingController {
  constructor(private readonly shippingService: ShippingService) {}

  @Post()
  @ApiOperation({ summary: 'Create shipment, assign courier and generate AWB' })
  @ApiResponse({ status: 201, description: 'Shipment created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid order state or duplicate shipment' })
  createShipment(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Body() dto: CreateShipmentDto,
  ) {
    return this.shippingService.createShipment(userId, role, dto);
  }

  // Admin List All Shipments
  @Get('admin/all')
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'Admin: List all shipments with status/carrier filtering and pagination' })
  @ApiResponse({ status: 200, description: 'List of shipments retrieved' })
  findAllAdmin(@Query() query: ShipmentQueryDto) {
    return this.shippingService.findAllShipments(query);
  }

  // Admin Update Shipment Status
  @Patch('admin/:id/status')
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiOperation({ summary: 'Admin: Update shipment status (e.g. In Transit, Out for Delivery, Delivered)' })
  @ApiParam({ name: 'id', description: 'Shipment ID' })
  @ApiResponse({ status: 200, description: 'Shipment status updated and synced with order lifecycle' })
  updateStatus(
    @Param('id') id: string,
    @CurrentUser('id') adminUserId: string,
    @Body() dto: UpdateShipmentStatusDto,
  ) {
    return this.shippingService.updateShipmentStatus(id, dto, adminUserId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get shipment details by Shipment ID, Order ID, or AWB number' })
  @ApiParam({ name: 'id', description: 'Shipment ID, Order ID, or AWB number' })
  @ApiResponse({ status: 200, description: 'Shipment details retrieved' })
  getShipmentById(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.shippingService.getShipmentById(id, userId, role);
  }

  @Get(':id/tracking')
  @ApiOperation({ summary: 'Get live shipment tracking timeline and checkpoints' })
  @ApiParam({ name: 'id', description: 'Shipment ID or AWB number' })
  @ApiResponse({ status: 200, description: 'Live tracking timeline retrieved' })
  getShipmentTracking(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.shippingService.getShipmentTracking(id, userId, role);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel an active shipment' })
  @ApiParam({ name: 'id', description: 'Shipment ID' })
  @ApiResponse({ status: 200, description: 'Shipment cancelled' })
  cancelShipment(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Body() dto: CancelShipmentDto,
  ) {
    return this.shippingService.cancelShipment(id, userId, role, dto);
  }

  @Post(':id/label')
  @ApiOperation({ summary: 'Generate or retrieve printable shipping label and barcode' })
  @ApiParam({ name: 'id', description: 'Shipment ID' })
  @ApiResponse({ status: 200, description: 'Label data retrieved' })
  generateLabel(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.shippingService.generateLabel(id, userId, role);
  }

  // Public Serviceability Check
  @Public()
  @Get('serviceability/:pincode')
  @ApiOperation({ summary: 'Check delivery serviceability for destination postal code' })
  checkServiceability(
    @Param('pincode') pincode: string,
    @Query('provider') provider?: string,
  ) {
    return this.shippingService.checkServiceability(pincode, provider);
  }

  // Public Pricing Quote
  @Public()
  @Post('quote')
  @ApiOperation({ summary: 'Get dynamic shipping rate quote from courier provider' })
  getQuote(
    @Body() dto: any,
    @Query('provider') provider?: string,
  ) {
    return this.shippingService.getPricingQuote(dto, provider);
  }

  // Admin Reconciliation
  @Roles(Role.ADMIN, Role.STAFF)
  @Get('admin/reconcile')
  @ApiOperation({ summary: 'Admin: Run background reconciliation audit with Courier Platform' })
  reconcileShipments(
    @Query('provider') provider?: string,
    @Query('updatedAfter') updatedAfter?: string,
    @Query('updatedBefore') updatedBefore?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.shippingService.reconcileShipments(provider || 'COURIER_PLATFORM', {
      updatedAfter,
      updatedBefore,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 50,
    });
  }

  // Courier Webhook Endpoint (Public, Signature Verified)
  @Public()
  @Post('webhooks/:provider')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Courier webhook receiver for status updates and delivery confirmation' })
  handleCourierWebhook(
    @Param('provider') provider: string,
    @Headers() headers: Record<string, any>,
    @Body() payload: any,
  ) {
    return this.shippingService.handleCourierWebhook(provider, headers, payload);
  }
}
