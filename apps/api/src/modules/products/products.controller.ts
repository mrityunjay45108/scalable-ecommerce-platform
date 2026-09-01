import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@ecommerce/types';
import {
  ProductQueryDto,
  CreateProductDto,
  UpdateProductDto,
  AddProductImageDto,
  ReorderImagesDto,
} from './products.dto';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all published products with filtering and pagination' })
  findAll(@Query() query: ProductQueryDto) {
    return this.productsService.findAll(query, false);
  }

  @Public()
  @Get('featured')
  @ApiOperation({ summary: 'Get featured products for homepage' })
  findFeatured() {
    return this.productsService.findAll({ isFeatured: true, limit: 8 }, false);
  }

  @Public()
  @Get(':slug')
  @ApiOperation({ summary: 'Get product details by slug' })
  findBySlug(@Param('slug') slug: string) {
    return this.productsService.findBySlug(slug);
  }

  // Admin Endpoints
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiBearerAuth('JWT')
  @Get('admin/all')
  @ApiOperation({ summary: 'Get all products (including unpublished) for admin panel' })
  findAllAdmin(@Query() query: ProductQueryDto) {
    return this.productsService.findAll(query, true);
  }

  @Roles(Role.ADMIN, Role.STAFF)
  @ApiBearerAuth('JWT')
  @Get('admin/item/:id')
  @ApiOperation({ summary: 'Get single product by ID for admin edit form' })
  findByIdAdmin(@Param('id') id: string) {
    return this.productsService.findById(id);
  }

  @Roles(Role.ADMIN, Role.STAFF)
  @ApiBearerAuth('JWT')
  @Post()
  @ApiOperation({ summary: 'Create new product with variants and images' })
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @Roles(Role.ADMIN, Role.STAFF)
  @ApiBearerAuth('JWT')
  @Put(':id')
  @ApiOperation({ summary: 'Update product by ID' })
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto);
  }

  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT')
  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete product' })
  delete(@Param('id') id: string) {
    return this.productsService.delete(id);
  }

  // Image Management
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiBearerAuth('JWT')
  @Post(':id/images')
  @ApiOperation({ summary: 'Add an image to a product' })
  addImage(@Param('id') id: string, @Body() dto: AddProductImageDto) {
    return this.productsService.addImage(id, dto);
  }

  @Roles(Role.ADMIN, Role.STAFF)
  @ApiBearerAuth('JWT')
  @Delete(':id/images/:imageId')
  @ApiOperation({ summary: 'Delete a product image' })
  removeImage(@Param('id') id: string, @Param('imageId') imageId: string) {
    return this.productsService.removeImage(id, imageId);
  }

  @Roles(Role.ADMIN, Role.STAFF)
  @ApiBearerAuth('JWT')
  @Patch(':id/images/:imageId/primary')
  @ApiOperation({ summary: 'Set a product image as primary' })
  setPrimaryImage(@Param('id') id: string, @Param('imageId') imageId: string) {
    return this.productsService.setPrimaryImage(id, imageId);
  }

  @Roles(Role.ADMIN, Role.STAFF)
  @ApiBearerAuth('JWT')
  @Put(':id/images/reorder')
  @ApiOperation({ summary: 'Reorder product images' })
  reorderImages(@Param('id') id: string, @Body() dto: ReorderImagesDto) {
    return this.productsService.reorderImages(id, dto);
  }
}
