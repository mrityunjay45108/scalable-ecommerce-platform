import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { CouponsService } from './coupons.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Role } from '@ecommerce/types';
import { ApplyCouponDto, CreateCouponDto, UpdateCouponDto } from './coupons.dto';

@Controller('coupons')
export class CouponsController {
  constructor(private couponsService: CouponsService) {}

  @Public()
  @Get('active')
  getActiveOffers() {
    return this.couponsService.getActiveCoupons();
  }

  @Post('apply')
  applyCoupon(
    @CurrentUser('id') userId: string,
    @Body() dto: ApplyCouponDto,
  ) {
    return this.couponsService.validateAndCalculate(userId, dto);
  }

  @Roles(Role.ADMIN)
  @Get('admin/all')
  findAll() {
    return this.couponsService.findAllAdmin();
  }

  @Roles(Role.ADMIN)
  @Post('admin')
  create(@Body() dto: CreateCouponDto) {
    return this.couponsService.create(dto);
  }

  @Roles(Role.ADMIN)
  @Put('admin/:id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCouponDto,
  ) {
    return this.couponsService.update(id, dto);
  }

  @Roles(Role.ADMIN)
  @Patch('admin/:id/toggle')
  toggleStatus(@Param('id') id: string) {
    return this.couponsService.toggleStatus(id);
  }

  @Roles(Role.ADMIN)
  @Get('admin/:id/usages')
  getCouponUsages(@Param('id') id: string) {
    return this.couponsService.getCouponUsages(id);
  }

  @Roles(Role.ADMIN)
  @Delete('admin/:id')
  delete(@Param('id') id: string) {
    return this.couponsService.delete(id);
  }
}
