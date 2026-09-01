import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  NotificationPayload,
  NotificationProviderInterface,
} from '../interfaces/notification-provider.interface';

@Injectable()
export class InAppNotificationProvider implements NotificationProviderInterface {
  private readonly logger = new Logger(InAppNotificationProvider.name);

  constructor(private prisma: PrismaService) {}

  async send(payload: NotificationPayload): Promise<boolean> {
    if (!payload.userId) {
      this.logger.warn(`No userId provided for in-app notification type ${payload.type}`);
      return false;
    }

    try {
      await this.prisma.notification.create({
        data: {
          userId: payload.userId,
          type: payload.type,
          title: payload.title,
          message: payload.message,
          link: payload.link,
          isRead: false,
        },
      });

      return true;
    } catch (error: any) {
      this.logger.error(
        `Failed to store in-app notification for user ${payload.userId}: ${error?.message}`,
      );
      return false;
    }
  }
}
