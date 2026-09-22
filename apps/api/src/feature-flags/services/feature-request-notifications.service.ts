import { Injectable, Logger } from '@nestjs/common';
import { NOTIFICATION_EVENTS } from '../../notifications/constants/notification-events';
import { NotificationService } from '../../notifications/services/notification.service';
import { UsersService } from '../../users/users.service';

/**
 * Handles all notification concerns for experimental feature requests.
 *
 * Decoupled from request business logic (SOLID): the request service calls
 * these methods, but knows nothing about notification channels, recipients,
 * or email wiring. All deliveries are fire-and-forget — a notification
 * failure never blocks the request lifecycle.
 *
 * Only the requesting user is notified. Ops learns about new requests from
 * the dashboard's pending-count badge, because staff are not recipients of
 * in-app notifications.
 *
 * Idempotency keys embed the row's lifecycle timestamp because a single
 * access row is reused across re-requests (rejected → pending → decided).
 * Without the stamp, a second submit/decision on the same row would be
 * silently dropped as a duplicate.
 */
@Injectable()
export class FeatureRequestNotificationsService {
  private readonly logger = new Logger(FeatureRequestNotificationsService.name);

  constructor(
    private readonly notificationService: NotificationService,
    private readonly usersService: UsersService,
  ) {}

  /** Notify a user that their request was approved. */
  async notifyUserApproved(params: {
    accessId: string;
    featureName: string;
    userId: string;
    decidedAt: Date;
  }): Promise<void> {
    const user = await this.usersService.getUser(params.userId);

    this.fire({
      ...NOTIFICATION_EVENTS.FEATURE_REQUEST.APPROVED(params.featureName),
      recipientIds: [params.userId],
      entityId: params.accessId,
      actionUrl: '/dashboard/settings/experimental',
      idempotencyKey: `feature-request:approved:${params.accessId}:${params.decidedAt.getTime()}`,
      data: user?.email
        ? { recipientEmails: { [params.userId]: user.email } }
        : undefined,
    });
  }

  /** Notify a user that their request was declined. */
  async notifyUserRejected(params: {
    accessId: string;
    featureName: string;
    userId: string;
    decidedAt: Date;
    reason?: string;
  }): Promise<void> {
    const user = await this.usersService.getUser(params.userId);

    this.fire({
      ...NOTIFICATION_EVENTS.FEATURE_REQUEST.REJECTED(
        params.featureName,
        params.reason,
      ),
      recipientIds: [params.userId],
      entityId: params.accessId,
      actionUrl: '/dashboard/settings/experimental',
      idempotencyKey: `feature-request:rejected:${params.accessId}:${params.decidedAt.getTime()}`,
      data: user?.email
        ? { recipientEmails: { [params.userId]: user.email } }
        : undefined,
    });
  }

  private fire(payload: Parameters<NotificationService['emit']>[0]): void {
    this.notificationService.emit(payload).catch((err) => {
      this.logger.error(
        `Failed to emit feature request notification: ${
          (err as Error).message
        }`,
      );
    });
  }
}
