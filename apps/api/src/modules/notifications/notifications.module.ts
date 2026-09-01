import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { EmailNotificationProvider } from './providers/email.provider';
import { InAppNotificationProvider } from './providers/in-app.provider';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [RedisModule],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    EmailNotificationProvider,
    InAppNotificationProvider,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
