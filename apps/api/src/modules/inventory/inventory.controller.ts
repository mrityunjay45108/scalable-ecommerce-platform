import {
  Controller,
  Get,
  Post,
  Body,
  Query,
} from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@ecommerce/types';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  AdjustStockDto,
  UpdateInventoryDto,
  InventoryQueryDto,
  InventoryLogQueryDto,
} from './inventory.dto';

@Controller('inventory')
export class InventoryController {
  constructor(private inventoryService: InventoryService) {}

  @Roles(Role.ADMIN)
  @Get('admin/all')
  getInventory(@Query() query: InventoryQueryDto) {
    return this.inventoryService.getInventory(query);
  }

  @Roles(Role.ADMIN)
  @Get('low-stock')
  getLowStock(@Query('threshold') threshold?: number) {
    return this.inventoryService.getLowStockVariants(threshold ? Number(threshold) : 10);
  }

  @Roles(Role.ADMIN)
  @Get('admin/logs')
  getInventoryLogs(@Query() query: InventoryLogQueryDto) {
    return this.inventoryService.getInventoryLogs(query);
  }

  @Roles(Role.ADMIN)
  @Post('adjust')
  adjustStock(
    @Body() dto: AdjustStockDto,
    @CurrentUser('id') adminUserId: string,
  ) {
    return this.inventoryService.adjustStock(dto, adminUserId);
  }

  @Roles(Role.ADMIN)
  @Post('admin/update')
  updateInventory(
    @Body() dto: UpdateInventoryDto,
    @CurrentUser('id') adminUserId: string,
  ) {
    return this.inventoryService.updateInventory(dto, adminUserId);
  }
}
