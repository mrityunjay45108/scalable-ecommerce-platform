import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@ecommerce/types';
import { UpdateProfileDto, CreateAddressDto, UpdateAddressDto } from './users.dto';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  getProfile(@CurrentUser('id') userId: string) {
    return this.usersService.getProfile(userId);
  }

  @Put('me')
  updateProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(userId, dto);
  }

  @Get('me/addresses')
  getAddresses(@CurrentUser('id') userId: string) {
    return this.usersService.getAddresses(userId);
  }

  @Post('me/addresses')
  createAddress(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateAddressDto,
  ) {
    return this.usersService.createAddress(userId, dto);
  }

  @Put('me/addresses/:id')
  updateAddress(
    @CurrentUser('id') userId: string,
    @Param('id') addressId: string,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.usersService.updateAddress(userId, addressId, dto);
  }

  @Delete('me/addresses/:id')
  deleteAddress(
    @CurrentUser('id') userId: string,
    @Param('id') addressId: string,
  ) {
    return this.usersService.deleteAddress(userId, addressId);
  }

  @Post('me/addresses/:id/default')
  setDefaultAddress(
    @CurrentUser('id') userId: string,
    @Param('id') addressId: string,
  ) {
    return this.usersService.setDefaultAddress(userId, addressId);
  }

  @Post('me/addresses/validate')
  validateAddress(@Body() dto: CreateAddressDto) {
    return this.usersService.validateAddress(dto);
  }

  // Admin routes
  @Roles(Role.ADMIN)
  @Get('admin/all')
  getAllUsers(@Query() query: PaginationQueryDto) {
    return this.usersService.findAllUsers(query.page, query.limit, query.search);
  }

  @Roles(Role.ADMIN)
  @Put('admin/:id/toggle-status')
  toggleStatus(@Param('id') userId: string) {
    return this.usersService.toggleUserStatus(userId);
  }

  @Roles(Role.ADMIN)
  @Put('admin/:id/role')
  updateUserRole(
    @Param('id') userId: string,
    @Body('role') role: any,
    @CurrentUser('id') adminUserId: string,
  ) {
    return this.usersService.updateUserRole(userId, role, adminUserId);
  }
}
