import {
  Controller,
  Post,
  Get,
  Body,
  Headers,
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
import { PaymentsService } from './payments.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@ecommerce/types';
import {
  CreatePaymentIntentDto,
  VerifyPaymentDto,
  ConfirmPaymentDto,
  RefundPaymentDto,
  RetryPaymentDto,
  ConfirmCodCollectionDto,
  SettleCodDto,
  CodLedgerQueryDto,
} from './payments.dto';

@ApiTags('Payments & Cash on Delivery (COD)')
@ApiBearerAuth()
@Controller('payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Post('create-intent')
  @ApiOperation({ summary: 'Initiate payment intent for Online Gateways or register COD' })
  @ApiResponse({ status: 200, description: 'Payment intent created or COD order registered' })
  createIntent(
    @CurrentUser('id') userId: string,
    @Body() dto: CreatePaymentIntentDto,
  ) {
    return this.paymentsService.createPaymentIntent(userId, dto);
  }

  @Post('verify')
  @ApiOperation({ summary: 'Verify gateway signature for Online Payments' })
  @ApiResponse({ status: 200, description: 'Payment verified and captured' })
  verifyPayment(
    @CurrentUser('id') userId: string,
    @Body() dto: VerifyPaymentDto,
  ) {
    return this.paymentsService.verifyPayment(userId, dto);
  }

  @Post('retry')
  @ApiOperation({ summary: 'Retry payment for pending or failed orders' })
  @ApiResponse({ status: 200, description: 'New payment intent generated' })
  retryPayment(
    @CurrentUser('id') userId: string,
    @Body() dto: RetryPaymentDto,
  ) {
    return this.paymentsService.retryPayment(userId, dto);
  }

  @Get(':orderId/status')
  @ApiOperation({ summary: 'Get current payment status' })
  @ApiParam({ name: 'orderId', description: 'Order ID' })
  @ApiResponse({ status: 200, description: 'Payment status retrieved' })
  getPaymentStatus(@Param('orderId') orderId: string) {
    return this.paymentsService.getPaymentStatus(orderId);
  }

  @Post('confirm')
  @ApiOperation({ summary: 'Confirm online payment (Internal / Gateway webhook)' })
  @ApiResponse({ status: 200, description: 'Payment confirmed' })
  confirmPayment(@Body() dto: ConfirmPaymentDto) {
    return this.paymentsService.confirmPayment(dto);
  }

  // =========================================================================
  // ADMIN COD ENDPOINTS
  // =========================================================================

  @Roles(Role.ADMIN, Role.STAFF)
  @Get(['admin/cod/all', 'cod/admin/all', 'cod/all'])
  @ApiOperation({ summary: 'Admin: List and search all COD transactions and view ledger metrics' })
  @ApiResponse({ status: 200, description: 'COD transactions and financial summary metrics' })
  findAllCod(@Query() query: CodLedgerQueryDto) {
    return this.paymentsService.findAllCodTransactions(query);
  }

  @Roles(Role.ADMIN, Role.STAFF)
  @Post(['admin/cod/:orderId/collect', 'cod/:orderId/confirm', 'cod/:orderId/collect'])
  @ApiOperation({ summary: 'Admin / Delivery: Confirm doorstep Cash Collection for COD order' })
  @ApiParam({ name: 'orderId', description: 'Order ID' })
  @ApiResponse({ status: 200, description: 'COD collection confirmed' })
  confirmCodCollection(
    @Param('orderId') orderId: string,
    @CurrentUser('id') adminUserId: string,
    @Body() dto: ConfirmCodCollectionDto,
  ) {
    return this.paymentsService.confirmCodCollection(orderId, adminUserId, dto);
  }

  @Roles(Role.ADMIN, Role.STAFF)
  @Post(['admin/cod/:orderId/settle', 'cod/:orderId/settle'])
  @ApiOperation({ summary: 'Admin / Finance: Settle collected COD funds to bank account' })
  @ApiParam({ name: 'orderId', description: 'Order ID' })
  @ApiResponse({ status: 200, description: 'COD transaction marked as SETTLED' })
  settleCodTransaction(
    @Param('orderId') orderId: string,
    @CurrentUser('id') adminUserId: string,
    @Body() dto: SettleCodDto,
  ) {
    return this.paymentsService.settleCodTransaction(orderId, adminUserId, dto);
  }

  @Roles(Role.ADMIN)
  @Post(':orderId/refund')
  @ApiOperation({ summary: 'Admin: Process gateway or COD refund' })
  @ApiParam({ name: 'orderId', description: 'Order ID' })
  @ApiResponse({ status: 200, description: 'Refund processed' })
  refundPayment(
    @Param('orderId') orderId: string,
    @Body() dto: RefundPaymentDto,
  ) {
    return this.paymentsService.processRefund(orderId, dto);
  }

  @Public()
  @Post('webhooks/:provider')
  @ApiOperation({ summary: 'Public webhook endpoint for payment gateways (Stripe/Razorpay)' })
  handleWebhook(
    @Param('provider') provider: string,
    @Body() payload: any,
    @Headers('stripe-signature') stripeSignature?: string,
    @Headers('x-razorpay-signature') rzpSignature?: string,
  ) {
    const signature = stripeSignature || rzpSignature;
    return this.paymentsService.handleWebhook(provider, payload, signature);
  }
}
