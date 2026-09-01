import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Headers,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { ReturnsService } from './returns.service';
import {
  CreateReturnRequestDto,
  ApproveReturnDto,
  RejectReturnDto,
  QualityCheckDto,
  ProcessReplacementDto,
  ReturnQueryDto,
  WebhookReturnDto,
} from './returns.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Role } from '@ecommerce/types';

@ApiTags('Returns & Replacements')
@ApiBearerAuth()
@Controller('returns')
export class ReturnsController {
  constructor(private readonly returnsService: ReturnsService) {}

  // =========================================================================
  // CUSTOMER ENDPOINTS
  // =========================================================================

  @Post()
  @ApiOperation({ summary: 'Customer: Request a return or replacement for delivered order items' })
  @ApiResponse({ status: 201, description: 'Return request submitted successfully' })
  @ApiResponse({ status: 400, description: 'Ineligible order, window expired, or duplicate return' })
  createReturn(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateReturnRequestDto,
  ) {
    return this.returnsService.createReturnRequest(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Customer: List my return requests' })
  @ApiResponse({ status: 200, description: 'List of return requests retrieved' })
  findMyReturns(
    @CurrentUser('id') userId: string,
    @Query() query: ReturnQueryDto,
  ) {
    return this.returnsService.findUserReturns(userId, query);
  }

  // =========================================================================
  // ADMIN ENDPOINTS
  // =========================================================================

  @Roles(Role.ADMIN, Role.STAFF)
  @Get('admin/all')
  @ApiOperation({ summary: 'Admin: List and search all return requests with filters' })
  @ApiResponse({ status: 200, description: 'Admin return requests list retrieved' })
  findAllAdmin(@Query() query: ReturnQueryDto) {
    return this.returnsService.findAllAdminReturns(query);
  }

  @Roles(Role.ADMIN, Role.STAFF)
  @Patch('admin/:id/approve')
  @ApiOperation({ summary: 'Admin: Approve return request and generate reverse pickup AWB' })
  @ApiParam({ name: 'id', description: 'Return Request ID' })
  @ApiResponse({ status: 200, description: 'Return approved and reverse pickup manifested' })
  approveReturn(
    @Param('id') id: string,
    @CurrentUser('id') adminUserId: string,
    @Body() dto: ApproveReturnDto,
  ) {
    return this.returnsService.approveReturn(id, adminUserId, dto);
  }

  @Roles(Role.ADMIN, Role.STAFF)
  @Patch('admin/:id/reject')
  @ApiOperation({ summary: 'Admin: Reject return request with mandatory justification' })
  @ApiParam({ name: 'id', description: 'Return Request ID' })
  @ApiResponse({ status: 200, description: 'Return rejected' })
  rejectReturn(
    @Param('id') id: string,
    @CurrentUser('id') adminUserId: string,
    @Body() dto: RejectReturnDto,
  ) {
    return this.returnsService.rejectReturn(id, adminUserId, dto);
  }

  @Roles(Role.ADMIN, Role.STAFF)
  @Patch('admin/:id/receive')
  @ApiOperation({ summary: 'Admin / Warehouse: Mark returned package received at fulfillment hub' })
  @ApiParam({ name: 'id', description: 'Return Request ID' })
  @ApiResponse({ status: 200, description: 'Return marked as received' })
  markReceived(
    @Param('id') id: string,
    @CurrentUser('id') adminUserId: string,
  ) {
    return this.returnsService.markReturnReceived(id, adminUserId);
  }

  @Roles(Role.ADMIN, Role.STAFF)
  @Patch('admin/:id/quality-check')
  @ApiOperation({ summary: 'Admin / QC: Record QC inspection, restock restockable items, and advance to refund/replacement' })
  @ApiParam({ name: 'id', description: 'Return Request ID' })
  @ApiResponse({ status: 200, description: 'QC inspection recorded and inventory restocked if applicable' })
  qualityCheck(
    @Param('id') id: string,
    @CurrentUser('id') adminUserId: string,
    @Body() dto: QualityCheckDto,
  ) {
    return this.returnsService.performQualityCheck(id, adminUserId, dto);
  }

  @Roles(Role.ADMIN, Role.STAFF)
  @Patch('admin/:id/replacement')
  @ApiOperation({ summary: 'Admin: Confirm outbound replacement item dispatch' })
  @ApiParam({ name: 'id', description: 'Return Request ID' })
  @ApiResponse({ status: 200, description: 'Replacement dispatch recorded' })
  processReplacement(
    @Param('id') id: string,
    @CurrentUser('id') adminUserId: string,
    @Body() dto: ProcessReplacementDto,
  ) {
    return this.returnsService.processReplacement(id, adminUserId, dto);
  }

  @Roles(Role.ADMIN, Role.STAFF)
  @Post(':id/retry-pickup')
  @ApiOperation({ summary: 'Admin: Retry scheduling reverse courier pickup' })
  @ApiParam({ name: 'id', description: 'Return Request ID' })
  @ApiResponse({ status: 200, description: 'Reverse pickup rescheduled' })
  retryPickup(
    @Param('id') id: string,
    @CurrentUser('id') adminUserId: string,
  ) {
    return this.returnsService.retryReturnPickup(id, adminUserId);
  }

  // =========================================================================
  // DETAIL & CANCELLATION
  // =========================================================================

  @Get(':id')
  @ApiOperation({ summary: 'Get return request details by ID or Return Number' })
  @ApiParam({ name: 'id', description: 'Return Request ID or Return Number' })
  @ApiResponse({ status: 200, description: 'Return request details retrieved' })
  findReturnById(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.returnsService.findReturnById(id, userId, role);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Customer: Cancel active return request before reverse pickup' })
  @ApiParam({ name: 'id', description: 'Return Request ID' })
  @ApiResponse({ status: 200, description: 'Return request cancelled' })
  cancelReturn(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.returnsService.cancelReturn(id, userId);
  }

  // Reverse Courier Webhook Endpoint (Public, Signature-Verified)
  @Public()
  @Post('webhooks/:provider')
  @ApiOperation({ summary: 'Courier reverse logistics webhook receiver' })
  handleReturnWebhook(
    @Param('provider') provider: string,
    @Headers() headers: Record<string, any>,
    @Body() payload: any,
  ) {
    return this.returnsService.handleCourierReturnWebhook(provider, headers, payload);
  }
}
