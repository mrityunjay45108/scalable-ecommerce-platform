import {
  Controller,
  Post,
  Get,
  Body,
  Headers,
  Param,
} from '@nestjs/common';
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
} from './payments.dto';

@Controller('payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Post('create-intent')
  createIntent(
    @CurrentUser('id') userId: string,
    @Body() dto: CreatePaymentIntentDto,
  ) {
    return this.paymentsService.createPaymentIntent(userId, dto);
  }

  @Post('verify')
  verifyPayment(
    @CurrentUser('id') userId: string,
    @Body() dto: VerifyPaymentDto,
  ) {
    return this.paymentsService.verifyPayment(userId, dto);
  }

  @Post('retry')
  retryPayment(
    @CurrentUser('id') userId: string,
    @Body() dto: RetryPaymentDto,
  ) {
    return this.paymentsService.retryPayment(userId, dto);
  }

  @Get(':orderId/status')
  getPaymentStatus(@Param('orderId') orderId: string) {
    return this.paymentsService.getPaymentStatus(orderId);
  }

  @Post('confirm')
  confirmPayment(@Body() dto: ConfirmPaymentDto) {
    return this.paymentsService.confirmPayment(dto);
  }

  @Roles(Role.ADMIN)
  @Post(':orderId/refund')
  refundPayment(
    @Param('orderId') orderId: string,
    @Body() dto: RefundPaymentDto,
  ) {
    return this.paymentsService.processRefund(orderId, dto);
  }

  @Public()
  @Post('webhooks/:provider')
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
