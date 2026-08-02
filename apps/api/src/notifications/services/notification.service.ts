import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';
import { Notification, UserNotificationPreferences } from '../entities';
import { EmitNotificationDto } from '../dto';
import { NotificationGateway } from '../gateways/notification.gateway';
import { NotificationPreferencesService } from './notification-preferences.service';
import { NotificationEmailService } from './notification-email.service';
import { NotificationRepository } from '../repositories/notification.repository';
import {
  DeliveryStatus,
  NOTIFICATION_REDIS_KEYS,
  NOTIFICATION_CACHE_TTL,
  NotificationPriority,
} from '../constants';
import { DeleteNotificationDto } from '../dto/delete-notification.dto';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly notificationRepo: NotificationRepository,
    private readonly redisService: RedisService,
    private readonly gateway: NotificationGateway,
    private readonly preferencesService: NotificationPreferencesService,
    private readonly emailService: NotificationEmailService,
  ) {}

  // ═══════════════════════════════════════════════════════════════
  //  EMIT — Single entry point for all feature modules
  // ═══════════════════════════════════════════════════════════════

  /**
   * Central notification emission method.
   * Called by any feature module to send notifications.
   *
   * Flow:
   *  1. Filter recipients by preferences (BEFORE DB write — prevents orphans)
   *  2. Create notification record (DB with unique constraint on idempotencyKey)
   *  3. Create receiver records (DB)
   *  4. Broadcast via WebSocket (real-time, non-blocking)
   *  5. Queue email delivery (async, non-blocking)
   *  6. Invalidate caches
   */
  async emit(dto: EmitNotificationDto): Promise<void> {
    try {
      // ── 1. Filter Recipients by Preferences (before DB write) ──
      const preferencesMap =
        await this.preferencesService.getPreferencesForUsers(dto.recipientIds);

      const validRecipients = dto.recipientIds.filter((userId) =>
        this.preferencesService.shouldSendNotification(
          dto.category,
          preferencesMap.get(userId),
        ),
      );

      if (validRecipients.length === 0) {
        this.logger.warn(
          'No valid recipients after preference filtering, skipping notification',
        );
        return;
      }

      // ── 2. Create Notification Record (DB-enforced idempotency) ──
      const savedNotification = await this.notificationRepo.createNotification({
        templateCode: dto.templateCode,
        category: dto.category,
        actorId: dto.actorId,
        actorName: dto.actorName,
        actorAvatar: dto.actorAvatar,
        entityType: dto.entityType,
        entityId: dto.entityId,
        title: dto.title,
        message: dto.message,
        data: dto.data,
        actionUrl: dto.actionUrl,
        priority: dto.priority || NotificationPriority.MEDIUM,
        requiresAction: dto.requiresAction || false,
        idempotencyKey: dto.idempotencyKey,
      });

      if (!savedNotification) {
        this.logger.warn(
          `Duplicate notification skipped (key: ${dto.idempotencyKey})`,
        );
        return;
      }

      // ── 3. Create Receiver Records (Bulk) ──────────────────────
      await this.notificationRepo.createReceivers(
        savedNotification.id,
        validRecipients,
      );

      // ── 4. Broadcast via WebSocket (non-blocking) ──────────────
      const payload = this.formatPayload(savedNotification);

      try {
        for (const userId of validRecipients) {
          this.gateway.sendToUser(userId, payload);

          if (this.gateway.isUserOnline(userId)) {
            // Fire-and-forget delivery status update
            this.notificationRepo
              .updateDeliveryStatus(
                savedNotification.id,
                userId,
                DeliveryStatus.DELIVERED,
                1,
              )
              .catch((err) =>
                this.logger.error('Failed to update delivery status', err),
              );
          }
        }
      } catch (wsError: unknown) {
        // WebSocket failure must NOT block notification creation
        this.logger.error(
          `WebSocket broadcast failed: ${(wsError as Error).message}`,
          (wsError as Error).stack,
        );
      }

      // ── 5. Queue Emails (non-blocking) ─────────────────────────
      try {
        await this.queueNotificationEmails(
          savedNotification,
          validRecipients,
          preferencesMap,
        );
      } catch (emailError: unknown) {
        this.logger.error(
          `Email queuing failed: ${(emailError as Error).message}`,
          (emailError as Error).stack,
        );
      }

      // ── 6. Invalidate Caches ───────────────────────────────────
      await this.invalidateCaches(validRecipients);

      this.logger.log(
        `Notification ${savedNotification.id} emitted to ${validRecipients.length} recipients`,
      );
    } catch (error: unknown) {
      this.logger.error(
        `Critical error emitting notification: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  //  READ — Query Methods
  // ═══════════════════════════════════════════════════════════════

  /**
   * Get unread notifications for a user (with Redis caching).
   */
  async getUnreadNotifications(
    userId: string,
    limit = 20,
    skip = 0,
    category?: string,
  ): Promise<{ notifications: Record<string, unknown>[]; total: number }> {
    const cacheKey = NOTIFICATION_REDIS_KEYS.UNREAD_NOTIFICATIONS(userId);

    // Only cache the default first page without filters
    if (skip === 0 && !category && limit === 20) {
      const cached = await this.redisService.getRecord<{
        notifications: Record<string, unknown>[];
        total: number;
      }>(cacheKey);
      if (cached) return cached;
    }

    const { receivers, total } =
      await this.notificationRepo.findUnreadReceivers(
        userId,
        limit,
        skip,
        category,
      );

    const notifications = receivers.map((r) => this.mapReceiverToPayload(r));
    const result = { notifications, total };

    // Cache default page
    if (skip === 0 && !category && limit === 20) {
      await this.redisService.storeRecord(
        cacheKey,
        result,
        NOTIFICATION_CACHE_TTL.UNREAD_NOTIFICATIONS,
      );
    }

    return result;
  }

  /**
   * Get all notifications for a user (read + unread).
   */
  async getAllNotifications(
    userId: string,
    limit = 20,
    skip = 0,
    category?: string,
  ): Promise<{ notifications: Record<string, unknown>[]; total: number }> {
    const { receivers, total } = await this.notificationRepo.findAllReceivers(
      userId,
      limit,
      skip,
      category,
    );

    const notifications = receivers.map((r) => this.mapReceiverToPayload(r));
    return { notifications, total };
  }

  /**
   * Get unread notification count (with Redis caching).
   */
  async getUnreadCount(userId: string): Promise<number> {
    const cacheKey = NOTIFICATION_REDIS_KEYS.UNREAD_COUNT(userId);

    const cached = await this.redisService.getRecord<number>(cacheKey);
    if (cached !== null && cached !== undefined) return cached;

    const count = await this.notificationRepo.countUnread(userId);

    await this.redisService.storeRecord(
      cacheKey,
      count,
      NOTIFICATION_CACHE_TTL.UNREAD_COUNT,
    );

    return count;
  }

  // ═══════════════════════════════════════════════════════════════
  //  UPDATE — Mark As Read / Delete
  // ═══════════════════════════════════════════════════════════════

  /**
   * Mark a single notification as read for a user.
   */
  async markAsRead(userId: string, receiverId: string): Promise<void> {
    await this.notificationRepo.markAsRead(receiverId, userId);
    await this.invalidateCaches([userId]);
  }

  /**
   * Mark all unread notifications as read for a user.
   */
  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationRepo.markAllAsRead(userId);
    await this.invalidateCaches([userId]);
  }

  /**
   * Soft-delete a notification for a user.
   */
  async deleteNotification(
    userId: string,
    deleteNotificationDto: DeleteNotificationDto,
  ): Promise<void> {
    await this.notificationRepo.softDeleteReceiver(
      deleteNotificationDto.receiverIds,
      userId,
    );
    await this.invalidateCaches([userId]);
  }

  // ═══════════════════════════════════════════════════════════════
  //  PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Queue email notifications for eligible recipients.
   */
  private async queueNotificationEmails(
    notification: Notification,
    recipientIds: string[],
    preferencesMap: Map<string, UserNotificationPreferences | undefined>,
  ): Promise<void> {
    const emailRecipients: Array<{
      userId: string;
      notificationId: string;
      email: string;
      subject: string;
      template: string;
      variables: Record<string, unknown>;
    }> = [];

    for (const userId of recipientIds) {
      const pref = preferencesMap.get(userId);

      if (
        !this.preferencesService.shouldSendEmail(notification.category, pref)
      ) {
        continue;
      }

      const recipientEmails = (notification.data as Record<string, unknown>)
        ?.recipientEmails as Record<string, string> | undefined;
      const userEmail = recipientEmails?.[userId];
      if (!userEmail) continue;

      emailRecipients.push({
        userId,
        notificationId: notification.id,
        email: userEmail,
        subject: notification.title,
        template: notification.templateCode || 'notification',
        variables: {
          title: notification.title,
          message: notification.message,
          actionUrl: notification.actionUrl,
          actorName: notification.actorName,
          ...((notification.data as Record<string, unknown> | null) ?? {}),
        },
      });
    }

    if (emailRecipients.length > 0) {
      await this.emailService.queueEmails(emailRecipients);
    }
  }

  /**
   * Map a NotificationReceiver (with joined Notification) to a flat payload.
   */
  private mapReceiverToPayload(
    r: import('../entities').NotificationReceiver,
  ): Record<string, unknown> {
    return {
      id: r.id,
      notificationId: r.notification.id,
      category: r.notification.category,
      title: r.notification.title,
      message: r.notification.message,
      actorId: r.notification.actorId,
      actorName: r.notification.actorName,
      actorAvatar: r.notification.actorAvatar,
      entityType: r.notification.entityType,
      entityId: r.notification.entityId,
      actionUrl: r.notification.actionUrl,
      priority: r.notification.priority,
      requiresAction: r.notification.requiresAction,
      data: r.notification.data,
      isRead: r.isRead,
      deliveryStatus: r.deliveryStatus,
      createdAt: r.notification.createdAt,
    };
  }

  /**
   * Format a Notification entity into a WebSocket payload.
   */
  private formatPayload(notification: Notification): Record<string, unknown> {
    return {
      id: notification.id,
      category: notification.category,
      title: notification.title,
      message: notification.message,
      actorId: notification.actorId,
      actorName: notification.actorName,
      actorAvatar: notification.actorAvatar,
      entityType: notification.entityType,
      entityId: notification.entityId,
      actionUrl: notification.actionUrl,
      priority: notification.priority,
      requiresAction: notification.requiresAction,
      data: notification.data,
      createdAt: notification.createdAt,
    };
  }

  /**
   * Invalidate Redis caches for given user IDs.
   */
  private async invalidateCaches(userIds: string[]): Promise<void> {
    const deletions = userIds.flatMap((userId) => [
      this.redisService.deleteRecord(
        NOTIFICATION_REDIS_KEYS.UNREAD_COUNT(userId),
      ),
      this.redisService.deleteRecord(
        NOTIFICATION_REDIS_KEYS.UNREAD_NOTIFICATIONS(userId),
      ),
    ]);

    await Promise.allSettled(deletions);
  }
}
