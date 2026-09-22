import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FeatureRequestStatus } from '../feature-flags.constants';
import { UsersService } from '../../users/users.service';
import { FeatureFlagsRepository } from '../repositories/feature-flags.repository';
import { FeatureFlagsService } from './feature-flags.service';
import { FeatureRequestNotificationsService } from './feature-request-notifications.service';

export interface ExperimentalFeatureView {
  key: string;
  name: string;
  description: string | null;
  userStatus: 'NONE' | FeatureRequestStatus;
  rejectionReason?: string;
}

@Injectable()
export class FeatureRequestsService {
  constructor(
    private readonly repo: FeatureFlagsRepository,
    private readonly notifications: FeatureRequestNotificationsService,
    private readonly usersService: UsersService,
    private readonly featureFlags: FeatureFlagsService,
  ) {}

  // ── User-facing ────────────────────────────────────────────────

  /** List all discoverable experimental features with this user's status. */
  async listExperimentalForUser(
    userId: string,
  ): Promise<ExperimentalFeatureView[]> {
    const flags = await this.repo.listExperimentalFlags();

    return Promise.all(
      flags.map(async (flag) => {
        const access = flag.userAccesses?.find((a) => a.userId === userId);

        // Derive display status from both status and enabled: an admin "deny"
        // override (status APPROVED but disabled) must not read as Active.
        let userStatus: ExperimentalFeatureView['userStatus'] = 'NONE';
        if (access) {
          if (access.status === FeatureRequestStatus.PENDING) {
            userStatus = FeatureRequestStatus.PENDING;
          } else if (access.enabled) {
            userStatus = FeatureRequestStatus.APPROVED;
          } else {
            userStatus = FeatureRequestStatus.REJECTED;
          }
        }

        // A user with no personal grant may still have access through the
        // flag's rollout. Reflect that effective access so the page matches
        // the gate.
        if (
          userStatus !== FeatureRequestStatus.PENDING &&
          userStatus !== FeatureRequestStatus.REJECTED
        ) {
          const rolledOut = await this.featureFlags.hasFeatureAccess(
            userId,
            flag.key,
            flag,
          );
          if (rolledOut) {
            userStatus = FeatureRequestStatus.APPROVED;
          }
        }

        return {
          key: flag.key,
          name: flag.name,
          description: flag.description ?? null,
          userStatus,
          rejectionReason:
            userStatus === FeatureRequestStatus.REJECTED
              ? (access?.rejectionReason ?? undefined)
              : undefined,
        };
      }),
    );
  }

  /** Submit (or re-submit after rejection) an access request. */
  async requestAccess(userId: string, key: string, message?: string) {
    const flag = await this.requireExperimentalFlag(key);
    const existing = await this.repo.findUserAccess(flag.id, userId);

    // Covers access through the rollout as well as a personal grant, so a user
    // who is already in cannot open a request that would sit in the ops queue
    // for nothing.
    if (await this.featureFlags.hasFeatureAccess(userId, key, flag)) {
      throw new ConflictException('You already have access to this feature.');
    }

    if (existing) {
      if (existing.status === FeatureRequestStatus.PENDING) {
        throw new ConflictException(
          'You already have a pending request for this feature.',
        );
      }
    }

    const requestedAt = new Date();
    const access = existing
      ? Object.assign(existing, {
          enabled: false,
          status: FeatureRequestStatus.PENDING,
          requestMessage: message ?? null,
          rejectionReason: null,
          requestedAt,
          decidedAt: null,
        })
      : this.repo.createUserAccess({
          featureFlagId: flag.id,
          userId,
          enabled: false,
          status: FeatureRequestStatus.PENDING,
          requestMessage: message ?? null,
          requestedAt,
        });

    // Ops learns about new requests from the pending-count badge on the
    // dashboard — staff are not recipients of in-app notifications.
    return this.repo.saveUserAccess(access);
  }

  /** Withdraw a pending request. */
  async withdrawRequest(userId: string, key: string) {
    const flag = await this.requireExperimentalFlag(key);
    const existing = await this.repo.findUserAccess(flag.id, userId);

    if (!existing || existing.status !== FeatureRequestStatus.PENDING) {
      throw new NotFoundException('No pending request to withdraw.');
    }

    await this.repo.deleteUserAccess(existing.id);
  }

  // ── Admin-facing ───────────────────────────────────────────────

  async listRequests(filters: {
    status?: FeatureRequestStatus;
    featureKey?: string;
    userId?: string;
  }) {
    let featureFlagId: string | undefined;
    if (filters.featureKey) {
      const flag = await this.repo.findFlagByKey(filters.featureKey);
      if (!flag) return [];
      featureFlagId = flag.id;
    }

    const rows = await this.repo.listUserAccessRequests({
      status: filters.status,
      featureFlagId,
      userId: filters.userId,
    });

    const users = await this.usersService.findByIds([
      ...new Set(rows.map((r) => r.userId)),
    ]);
    const userMap = new Map(users.map((u) => [u.id, u]));

    return rows.map((row) => {
      const user = userMap.get(row.userId);
      return {
        id: row.id,
        userId: row.userId,
        userName: user?.fullName ?? null,
        userEmail: user?.email ?? null,
        featureKey: row.featureFlag?.key,
        featureName: row.featureFlag?.name,
        status: row.status,
        requestMessage: row.requestMessage ?? null,
        rejectionReason: row.rejectionReason ?? null,
        requestedAt: row.requestedAt ?? null,
        decidedAt: row.decidedAt ?? null,
      };
    });
  }

  async approveRequest(id: string) {
    const access = await this.requireRequest(id);

    const decidedAt = new Date();
    Object.assign(access, {
      enabled: true,
      status: FeatureRequestStatus.APPROVED,
      rejectionReason: null,
      decidedAt,
    });
    const saved = await this.repo.saveUserAccess(access);

    await this.notifications.notifyUserApproved({
      accessId: saved.id,
      featureName: access.featureFlag?.name ?? 'experimental feature',
      userId: access.userId,
      decidedAt,
    });

    return saved;
  }

  async rejectRequest(id: string, reason?: string) {
    const access = await this.requireRequest(id);

    const decidedAt = new Date();
    Object.assign(access, {
      enabled: false,
      status: FeatureRequestStatus.REJECTED,
      rejectionReason: reason ?? null,
      decidedAt,
    });
    const saved = await this.repo.saveUserAccess(access);

    await this.notifications.notifyUserRejected({
      accessId: saved.id,
      featureName: access.featureFlag?.name ?? 'experimental feature',
      userId: access.userId,
      decidedAt,
      reason,
    });

    return saved;
  }

  countPendingRequests() {
    return this.repo.countPendingRequests();
  }

  // ── Helpers ────────────────────────────────────────────────────

  private async requireExperimentalFlag(key: string) {
    const flag = await this.repo.findFlagByKey(key);
    if (!flag || !flag.isExperimental || !flag.enabled) {
      throw new NotFoundException(
        `Experimental feature "${key}" is not available.`,
      );
    }
    return flag;
  }

  private async requireRequest(id: string) {
    const access = await this.repo.findUserAccessById(id);
    if (!access) {
      throw new NotFoundException('Feature request not found.');
    }
    if (access.status !== FeatureRequestStatus.PENDING) {
      throw new ForbiddenException(
        'Only pending requests can be approved or rejected.',
      );
    }
    return access;
  }
}
