import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { BrandsService } from './brands.service';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@ecommerce/types';
import { CreateBrandDto, UpdateBrandDto } from './brands.dto';

@Controller('brands')
export class BrandsController {
  constructor(private brandsService: BrandsService) {}

  @Public()
  @Get()
  findAllActive() {
    return this.brandsService.findAllActive();
  }

  @Roles(Role.ADMIN)
  @Get('admin')
  findAllAdmin() {
    return this.brandsService.findAllAdmin();
  }

  @Public()
  @Get(':id')
  findById(@Param('id') id: string) {
    return this.brandsService.findById(id);
  }

  @Roles(Role.ADMIN)
  @Post()
  create(@Body() dto: CreateBrandDto) {
    return this.brandsService.create(dto);
  }

  @Roles(Role.ADMIN)
  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateBrandDto) {
    return this.brandsService.update(id, dto);
  }

  @Roles(Role.ADMIN)
  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.brandsService.delete(id);
  }
}
