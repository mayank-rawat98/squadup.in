import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, QueryFailedError, Repository } from 'typeorm';
import { Notification, NotificationReceiver } from '../entities';
import { DeliveryStatus, NotificationCategory } from '../constants';

/** Result type for paginated receiver queries */
export interface ReceiverWithNotification {
  id: string;
  notificationId: string;
  category: string;
  title: string;
  message: string;
  actorId?: string;
  actorName?: string;
  actorAvatar?: string;
  entityType?: string;
  entityId?: string;
  actionUrl?: string;
  priority: string;
  requiresAction: boolean;
  data?: Record<string, unknown>;
  isRead: boolean;
  deliveryStatus: string;
  createdAt: Date;
}

@Injectable()
export class NotificationRepository {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    @InjectRepository(NotificationReceiver)
    private readonly receiverRepo: Repository<NotificationReceiver>,
  ) {}

  // ═══════════════════════════════════════════════════════════════
  //  NOTIFICATION CRUD
  // ═══════════════════════════════════════════════════════════════

  /**
   * Insert a notification record.
   * Returns the saved entity, or null if a duplicate idempotencyKey was hit.
   */
  async createNotification(
    data: Partial<Notification>,
  ): Promise<Notification | null> {
    const entity = this.notificationRepo.create(data);
    try {
      return await this.notificationRepo.save(entity);
    } catch (error: unknown) {
      if (
        error instanceof QueryFailedError &&
        (error as unknown as { code?: string }).code === '23505'
      ) {
        return null; // Unique constraint violation — idempotency duplicate
      }
      throw error;
    }
  }

  /**
   * Hard-delete a notification (used for orphan cleanup).
   */
  async removeNotification(notificationId: string): Promise<void> {
    await this.notificationRepo.delete({ id: notificationId });
  }

  // ═══════════════════════════════════════════════════════════════
  //  RECEIVER CRUD
  // ═══════════════════════════════════════════════════════════════

  /**
   * Bulk-create receiver records for a notification.
   */
  async createReceivers(
    notificationId: string,
    userIds: string[],
  ): Promise<NotificationReceiver[]> {
    const receivers = userIds.map((userId) =>
      this.receiverRepo.create({
        notificationId,
        userId,
        deliveryStatus: DeliveryStatus.PENDING,
      }),
    );
    return this.receiverRepo.save(receivers);
  }

  /**
   * Update delivery status for a specific receiver (fire-and-forget safe).
   */
  async updateDeliveryStatus(
    notificationId: string,
    userId: string,
    status: DeliveryStatus,
    deliveryAttempts: number,
  ): Promise<void> {
    await this.receiverRepo.update(
      { notificationId, userId },
      { deliveryStatus: status, deliveryAttempts },
    );
  }

  // ═══════════════════════════════════════════════════════════════
  //  RECEIVER QUERIES
  // ═══════════════════════════════════════════════════════════════

  /**
   * Find unread receivers for a user with joined notification data.
   */
  async findUnreadReceivers(
    userId: string,
    limit: number,
    skip: number,
    category?: string,
  ): Promise<{ receivers: NotificationReceiver[]; total: number }> {
    const query = this.receiverRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.notification', 'n')
      .where('r.userId = :userId', { userId })
      .andWhere('r.isRead = false')
      .andWhere('r.isDeleted = false')
      .orderBy('r.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (category) {
      query.andWhere('n.category = :category', { category });
    }

    const [receivers, total] = await query.getManyAndCount();
    return { receivers, total };
  }

  /**
   * Find all receivers for a user (read + unread) with joined notification data.
   */
  async findAllReceivers(
    userId: string,
    limit: number,
    skip: number,
    category?: string,
  ): Promise<{ receivers: NotificationReceiver[]; total: number }> {
    const query = this.receiverRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.notification', 'n')
      .where('r.userId = :userId', { userId })
      .andWhere('r.isDeleted = false')
      .orderBy('r.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (category && category !== NotificationCategory.ALL) {
      query.andWhere('n.category = :category', { category });
    }

    const [receivers, total] = await query.getManyAndCount();
    return { receivers, total };
  }

  /**
   * Count unread, non-deleted receivers for a user.
   */
  async countUnread(userId: string): Promise<number> {
    return this.receiverRepo.count({
      where: { userId, isRead: false, isDeleted: false },
    });
  }

  // ═══════════════════════════════════════════════════════════════
  //  RECEIVER STATE UPDATES
  // ═══════════════════════════════════════════════════════════════

  /**
   * Mark a single receiver as read.
   */
  async markAsRead(receiverId: string, userId: string): Promise<void> {
    await this.receiverRepo.update(
      { id: receiverId, userId },
      { isRead: true, readAt: new Date() },
    );
  }

  /**
   * Mark all unread receivers as read for a user.
   */
  async markAllAsRead(userId: string): Promise<void> {
    await this.receiverRepo.update(
      { userId, isRead: false },
      { isRead: true, readAt: new Date() },
    );
  }

  /**
   * Soft-delete a receiver record.
   */
  async softDeleteReceiver(
    receiverIds: string[],
    userId: string,
  ): Promise<void> {
    await this.receiverRepo.update(
      { id: In(receiverIds), userId },
      { isDeleted: true, deletedAt: new Date() },
    );
  }
}
