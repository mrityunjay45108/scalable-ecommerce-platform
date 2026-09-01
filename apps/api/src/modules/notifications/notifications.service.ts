import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailNotificationProvider } from './providers/email.provider';
import { InAppNotificationProvider } from './providers/in-app.provider';
import { NotificationPayload } from './interfaces/notification-provider.interface';
import { UpdatePreferencesDto } from './notifications.dto';
import { NotificationType } from '@ecommerce/database';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private prisma: PrismaService,
    private emailProvider: EmailNotificationProvider,
    private inAppProvider: InAppNotificationProvider,
  ) {}

  // =========================================================================
  // 1. DISPATCH NOTIFICATION (NON-BLOCKING & RESILIENT)
  // =========================================================================

  async sendNotification(payload: NotificationPayload): Promise<void> {
    // 1. In-app notification if userId is present
    if (payload.userId) {
      try {
        await this.inAppProvider.send(payload);
      } catch (err: any) {
        this.logger.error(`Error saving in-app notification: ${err?.message}`);
      }
    }

    // 2. Email notification (safely wrapped - will NEVER block caller)
    try {
      let shouldSendEmail = true;

      if (payload.userId) {
        const user = await this.prisma.user.findUnique({
          where: { id: payload.userId },
          select: { email: true, firstName: true, notificationPreferences: true },
        });

        if (user) {
          if (!payload.recipientEmail) {
            payload.recipientEmail = user.email;
          }
          if (!payload.recipientName) {
            payload.recipientName = user.firstName;
          }

          const prefs = (user.notificationPreferences as any) || { email: true, orderUpdates: true, promotions: false };

          // Check preferences
          if (prefs.email === false) {
            shouldSendEmail = false;
          } else if (
            ([
              NotificationType.ORDER_CREATED,
              NotificationType.ORDER_SHIPPED,
              NotificationType.ORDER_DELIVERED,
              NotificationType.ORDER_CANCELLED,
              NotificationType.PAYMENT_SUCCESSFUL,
              NotificationType.PAYMENT_FAILED,
            ] as NotificationType[]).includes(payload.type) &&
            prefs.orderUpdates === false
          ) {
            shouldSendEmail = false;
          } else if (payload.type === NotificationType.PROMOTION && prefs.promotions === false) {
            shouldSendEmail = false;
          }
        }
      }

      if (shouldSendEmail && payload.recipientEmail) {
        await this.emailProvider.send(payload);
      }
    } catch (err: any) {
      // Non-blocking catch
      this.logger.error(`Failed to dispatch email notification: ${err?.message}`, err?.stack);
    }
  }

  // =========================================================================
  // 2. USER IN-APP NOTIFICATIONS
  // =========================================================================

  async getUserNotifications(userId: string, limit = 20) {
    const notifications = await this.prisma.notification.findMany({
      where: { userId },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    const unreadCount = await this.prisma.notification.count({
      where: { userId, isRead: false },
    });

    return {
      data: notifications,
      unreadCount,
    };
  }

  async getUnreadCount(userId: string): Promise<{ count: number }> {
    const count = await this.prisma.notification.count({
      where: { userId, isRead: false },
    });
    return { count };
  }

  async markAsRead(userId: string, notificationId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    return { message: 'All notifications marked as read' };
  }

  // =========================================================================
  // 3. NOTIFICATION PREFERENCES
  // =========================================================================

  async getPreferences(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { notificationPreferences: true },
    });

    if (!user) throw new NotFoundException('User not found');

    return (
      (user.notificationPreferences as any) || {
        email: true,
        orderUpdates: true,
        promotions: false,
      }
    );
  }

  async updatePreferences(userId: string, dto: UpdatePreferencesDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { notificationPreferences: true },
    });

    if (!user) throw new NotFoundException('User not found');

    const current = (user.notificationPreferences as any) || {
      email: true,
      orderUpdates: true,
      promotions: false,
    };

    const updatedPreferences = {
      ...current,
      ...(dto.email !== undefined && { email: dto.email }),
      ...(dto.orderUpdates !== undefined && { orderUpdates: dto.orderUpdates }),
      ...(dto.promotions !== undefined && { promotions: dto.promotions }),
    };

    await this.prisma.user.update({
      where: { id: userId },
      data: { notificationPreferences: updatedPreferences },
    });

    return updatedPreferences;
  }
}
