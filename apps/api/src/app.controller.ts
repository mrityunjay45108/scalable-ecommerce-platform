import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from './common/decorators/public.decorator';

@ApiTags('Root')
@Controller()
export class AppController {
  @Public()
  @Get()
  @ApiOperation({ summary: 'API Root Information' })
  getRoot() {
    return {
      name: 'NovaStore E-Commerce API',
      version: '1.0',
      status: 'online',
      documentation: '/api/v1/docs',
      health: '/api/v1/health',
    };
  }
}
