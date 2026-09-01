import { Controller, Post, Body } from '@nestjs/common';
import { StorageService } from './storage.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@ecommerce/types';

@Controller('storage')
export class StorageController {
  constructor(private storageService: StorageService) {}

  @Roles(Role.ADMIN)
  @Post('upload')
  uploadImage(@Body('data') data: string, @Body('folder') folder?: string) {
    return this.storageService.uploadImage(data, folder);
  }
}
