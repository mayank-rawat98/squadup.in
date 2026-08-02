import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AuditsService } from '../../audits/audits.service';
import { QueryAuditDto } from '../../audits/dto/query-audit.dto';
import { EMAIL_TYPE_ENUM } from '../../mailer/constants/mailer.constants';
import { MailerService } from '../../mailer/mailer.service';
import { QueryParamDto } from '../../users/dto/query-param-dto';
import { AccountStatus, User } from '../../users/entities/user.entity';
import { UsersRepository } from '../../users/users.repository';
import { ListUsersDto } from '../dto/list-users.dto';

/** UI-facing account status surfaced to the ops dashboard. */
type UiStatus = 'active' | 'suspended' | 'closed' | 'inactive';

export interface AdminUserListRow {
  id: string;
  fullName: string | null;
  email: string;
  avatarUrl: string | null;
  status: UiStatus;
  accountStatus: AccountStatus;
  isDeleted: boolean;
}

export interface AdminUserStats {
  totalUsers: number;
  activeUsers: number;
  newUsers: number;
}

/**
 * Orchestrates the Users tab of the ops dashboard. Domain logic is delegated to
 * the users and audits services; the admin-specific shaping lives here so it
 * stays out of those modules.
 */
@Injectable()
export class AdminOpsUsersService {
  private readonly logger = new Logger(AdminOpsUsersService.name);

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly auditsService: AuditsService,
    private readonly mailerService: MailerService,
  ) {}

  // ── List + stats ────────────────────────────────────────────────────────

  async listUsers(params: ListUsersDto) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 10;

    const result = await this.usersRepository.findAll(
      {},
      { page, limit, query: params.query } as QueryParamDto,
      null,
      true, // admins see deactivated (soft-deleted) accounts too
    );

    return {
      users: result.items.map((u) => this.toListRow(u)),
      totalItems: result.total,
      totalPages: result.totalPages,
      currentPage: result.page,
      itemsPerPage: result.limit,
    };
  }

  async getStats(): Promise<AdminUserStats> {
    const since = new Date();
    since.setDate(since.getDate() - 7);

    const [totalUsers, activeUsers, newUsers] = await Promise.all([
      this.usersRepository.countAll(),
      this.usersRepository.countByAccountStatus(AccountStatus.ACTIVE),
      this.usersRepository.countCreatedSince(since),
    ]);

    return { totalUsers, activeUsers, newUsers };
  }

  // ── Detail ────────────────────────────────────────────────────────────────

  async getUserDetail(id: string) {
    // Use the with-deleted lookup so admins can open deactivated accounts.
    const user = await this.usersRepository.findByIdWithDeleted(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      id: user.id,
      fullName: user.fullName ?? null,
      email: user.email,
      avatarUrl: user.avatarUrl ?? null,
      country: user.country ?? null,
      status: this.toUiStatus(user.accountStatus),
      accountStatus: user.accountStatus,
      isDeleted: Boolean(user.deletedAt),
      statusReason: user.statusReason ?? null,
      statusChangedAt: user.statusChangedAt ?? null,
      joinedDate: user.createdAt,
      lastActive: await this.safeLastActive(id),
    };
  }

  // ── Mutations ───────────────────────────────────────────────────────────

  /**
   * Phase 1 — deactivate: close the account (a pure flag). The user can no
   * longer sign in (login returns "Invalid credentials"). We intentionally do
   * NOT delete data or senders here — that's left to a future purge job.
   */
  async deactivateUser(id: string) {
    return this.applyStatus(id, AccountStatus.CLOSED, null);
  }

  /**
   * Phase 2 — suspend: flag the account as suspended for a stated violation and
   * email the user the reason. Login then surfaces the suspension message.
   */
  async suspendUser(id: string, reason: string) {
    const user = await this.usersRepository.findByIdWithDeleted(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const result = await this.applyStatus(id, AccountStatus.SUSPENDED, reason);

    // Best-effort: a failed email must not fail the suspension.
    void this.mailerService
      .notifyUserByEmail({
        recipient: user.email,
        emailType: EMAIL_TYPE_ENUM.ACCOUNT_SUSPENDED,
        emailData: {
          fullName: user.fullName?.trim() || 'there',
          reason,
          year: String(new Date().getFullYear()),
        },
      })
      .catch((error) => {
        this.logger.warn(
          `Failed to send suspension email to ${user.email}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      });

    return result;
  }

  /** Restore a deactivated/suspended account to ACTIVE and clear the reason. */
  async reactivateUser(id: string) {
    return this.applyStatus(id, AccountStatus.ACTIVE, null);
  }

  private async applyStatus(
    id: string,
    status: AccountStatus,
    reason: string | null,
  ) {
    const updated = await this.usersRepository.setAccountStatus(id, {
      accountStatus: status,
      statusReason: reason,
      statusChangedAt: new Date(),
    });
    if (!updated) {
      throw new NotFoundException('User not found');
    }
    return {
      id,
      status: this.toUiStatus(updated.accountStatus),
      accountStatus: updated.accountStatus,
      statusReason: updated.statusReason ?? null,
      statusChangedAt: updated.statusChangedAt ?? null,
    };
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private toUiStatus(status: AccountStatus): UiStatus {
    switch (status) {
      case AccountStatus.ACTIVE:
        return 'active';
      case AccountStatus.SUSPENDED:
        return 'suspended';
      case AccountStatus.CLOSED:
        return 'closed';
      default:
        return 'inactive'; // HOLD (profile not completed)
    }
  }

  private toListRow(user: User): AdminUserListRow {
    return {
      id: user.id,
      fullName: user.fullName ?? null,
      email: user.email,
      avatarUrl: user.avatarUrl ?? null,
      status: this.toUiStatus(user.accountStatus),
      accountStatus: user.accountStatus,
      isDeleted: Boolean(user.deletedAt),
    };
  }

  private async safeLastActive(userId: string): Promise<Date | null> {
    try {
      const result = (await this.auditsService.findAll(
        { userId } as QueryAuditDto,
        1,
        1,
      )) as { data?: Array<{ timestamp?: Date | string }> };
      const ts = result?.data?.[0]?.timestamp;
      return ts ? new Date(ts) : null;
    } catch (error) {
      this.logger.warn(
        `Failed to load last activity for user ${userId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return null;
    }
  }
}
