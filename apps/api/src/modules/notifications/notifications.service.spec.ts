import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { EmailNotificationProvider } from './providers/email.provider';
import { InAppNotificationProvider } from './providers/in-app.provider';
import { RedisService } from '../redis/redis.service';
import { NotificationType } from '@ecommerce/database';

describe('NotificationsService - Notification Provider Abstraction & Resilient Delivery', () => {
  let service: NotificationsService;
  let prisma: PrismaService;
  let emailProvider: EmailNotificationProvider;
  let inAppProvider: InAppNotificationProvider;
  let redisService: RedisService;

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    firstName: 'Alex',
    notificationPreferences: { email: true, orderUpdates: true, promotions: false },
  };

  const mockNotification = {
    id: 'notif-1',
    userId: 'user-1',
    type: NotificationType.ORDER_CREATED,
    title: 'Order Confirmed',
    message: 'Your order ORD-123 has been received.',
    isRead: false,
    link: '/orders/ord-123',
    createdAt: new Date(),
  };

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    notification: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  const mockEmailProvider = {
    send: jest.fn().mockResolvedValue(true),
  };

  const mockInAppProvider = {
    send: jest.fn().mockResolvedValue(true),
  };

  const mockRedisService = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: EmailNotificationProvider, useValue: mockEmailProvider },
        { provide: InAppNotificationProvider, useValue: mockInAppProvider },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    prisma = module.get<PrismaService>(PrismaService);
    emailProvider = module.get<EmailNotificationProvider>(EmailNotificationProvider);
    inAppProvider = module.get<InAppNotificationProvider>(InAppNotificationProvider);
    redisService = module.get<RedisService>(RedisService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendNotification (Non-blocking & Preferences Check)', () => {
    it('should dispatch both in-app and email notifications when enabled in preferences', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      await service.sendNotification({
        userId: 'user-1',
        type: NotificationType.ORDER_CREATED,
        title: 'Order Confirmed',
        message: 'Your order ORD-123 has been received.',
      });

      expect(inAppProvider.send).toHaveBeenCalled();
      expect(emailProvider.send).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientEmail: 'test@example.com',
          type: NotificationType.ORDER_CREATED,
        }),
      );
    });

    it('should skip email when disabled in user preferences', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        notificationPreferences: { email: false },
      });

      await service.sendNotification({
        userId: 'user-1',
        type: NotificationType.ORDER_CREATED,
        title: 'Order Confirmed',
        message: 'Your order ORD-123 has been received.',
      });

      expect(inAppProvider.send).toHaveBeenCalled();
      expect(emailProvider.send).not.toHaveBeenCalled();
    });

    it('should NEVER throw or block execution even if email provider throws an error', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockEmailProvider.send.mockRejectedValue(new Error('SMTP connection timed out'));

      await expect(
        service.sendNotification({
          userId: 'user-1',
          type: NotificationType.ORDER_CREATED,
          title: 'Order Confirmed',
          message: 'Order created.',
        }),
      ).resolves.not.toThrow();
    });
  });

  describe('Order & Return Lifecycle Notification Events', () => {
    const lifecycleEvents: NotificationType[] = [
      NotificationType.ORDER_CONFIRMED,
      NotificationType.ORDER_PACKED,
      NotificationType.ORDER_SHIPPED,
      NotificationType.OUT_FOR_DELIVERY,
      NotificationType.ORDER_DELIVERED,
      NotificationType.COD_COLLECTED,
      NotificationType.RETURN_REQUESTED,
      NotificationType.RETURN_APPROVED,
      NotificationType.RETURN_REJECTED,
      NotificationType.RETURN_PICKED_UP,
      NotificationType.RETURN_RECEIVED,
      NotificationType.REFUND_INITIATED,
      NotificationType.REFUND_COMPLETED,
      NotificationType.REFUND_FAILED,
    ];

    it.each(lifecycleEvents)('should successfully dispatch notification for event %s', async (eventType) => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      await service.sendNotification({
        userId: 'user-1',
        type: eventType,
        title: `Notification for ${eventType}`,
        message: `Event ${eventType} occurred successfully.`,
      });

      expect(inAppProvider.send).toHaveBeenCalledWith(
        expect.objectContaining({
          type: eventType,
        }),
      );
      expect(emailProvider.send).toHaveBeenCalledWith(
        expect.objectContaining({
          type: eventType,
        }),
      );
    });

    it('should skip duplicate notification when deduplicationKey is already cached in Redis', async () => {
      mockRedisService.get.mockResolvedValue('1'); // already sent

      await service.sendNotification({
        userId: 'user-1',
        type: NotificationType.ORDER_DELIVERED,
        title: 'Delivered',
        message: 'Order delivered',
        deduplicationKey: 'order_delivered_ord_100',
      });

      expect(inAppProvider.send).not.toHaveBeenCalled();
      expect(emailProvider.send).not.toHaveBeenCalled();
    });

    it('should set deduplicationKey in Redis on first notification dispatch', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      await service.sendNotification({
        userId: 'user-1',
        type: NotificationType.ORDER_DELIVERED,
        title: 'Delivered',
        message: 'Order delivered',
        deduplicationKey: 'order_delivered_ord_200',
      });

      expect(mockRedisService.set).toHaveBeenCalledWith(
        'notif_dedup:order_delivered_ord_200',
        '1',
        86400,
      );
      expect(inAppProvider.send).toHaveBeenCalled();
    });
  });

  describe('User in-app notifications & preferences', () => {
    it('should retrieve user notifications with unread count', async () => {
      mockPrismaService.notification.findMany.mockResolvedValue([mockNotification]);
      mockPrismaService.notification.count.mockResolvedValue(1);

      const result = await service.getUserNotifications('user-1');

      expect(result.data).toHaveLength(1);
      expect(result.unreadCount).toBe(1);
    });

    it('should mark all notifications as read', async () => {
      mockPrismaService.notification.updateMany.mockResolvedValue({ count: 3 });

      const result = await service.markAllAsRead('user-1');

      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', isRead: false },
        data: { isRead: true },
      });
      expect(result.message).toBe('All notifications marked as read');
    });

    it('should update user preferences', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue({
        ...mockUser,
        notificationPreferences: { email: true, orderUpdates: true, promotions: true },
      });

      const updated = await service.updatePreferences('user-1', { promotions: true });

      expect(prisma.user.update).toHaveBeenCalled();
      expect(updated.promotions).toBe(true);
    });
  });
});
