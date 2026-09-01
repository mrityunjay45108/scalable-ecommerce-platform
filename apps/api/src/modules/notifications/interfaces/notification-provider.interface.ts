import { NotificationType } from '@ecommerce/database';

export interface NotificationPayload {
  recipientEmail?: string;
  recipientName?: string;
  userId?: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  deduplicationKey?: string;
  data?: Record<string, any>;
}

export interface NotificationProviderInterface {
  send(payload: NotificationPayload): Promise<boolean>;
}
