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
import { ReviewsService } from './reviews.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@ecommerce/types';
import { CreateReviewDto, UpdateReviewDto, AdminReviewQueryDto } from './reviews.dto';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

@Controller('reviews')
export class ReviewsController {
  constructor(private reviewsService: ReviewsService) {}

  @Public()
  @Get('product/:productId')
  findByProduct(
    @Param('productId') productId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.reviewsService.findByProduct(productId, query.page, query.limit);
  }

  @Post()
  create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviewsService.create(userId, dto);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateReviewDto,
  ) {
    return this.reviewsService.update(id, userId, dto);
  }

  @Delete(':id')
  delete(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.reviewsService.delete(id, userId, false);
  }

  // Admin routes
  @Roles(Role.ADMIN)
  @Get('admin/all')
  findAllAdmin(@Query() query: AdminReviewQueryDto) {
    return this.reviewsService.findAllAdmin(query);
  }

  @Roles(Role.ADMIN)
  @Patch('admin/:id/toggle-hide')
  toggleHide(@Param('id') id: string) {
    return this.reviewsService.toggleHide(id);
  }

  @Roles(Role.ADMIN)
  @Delete('admin/:id')
  adminDelete(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
  ) {
    return this.reviewsService.delete(id, adminId, true);
  }
}
