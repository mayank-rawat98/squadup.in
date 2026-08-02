import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RedisService } from '../../redis/redis.service';
import { UserNotificationPreferences } from '../entities';
import { UpdateNotificationPreferencesDto } from '../dto';
import { NOTIFICATION_REDIS_KEYS, NOTIFICATION_CACHE_TTL } from '../constants';
import { AuditsService } from '../../audits/audits.service';
import { AUDIT_ACTIONS, AUDIT_RESOURCE } from '../../audits/constants';

@Injectable()
export class NotificationPreferencesService {
  private readonly logger = new Logger(NotificationPreferencesService.name);

  constructor(
    @InjectRepository(UserNotificationPreferences)
    private readonly preferencesRepo: Repository<UserNotificationPreferences>,
    private readonly redisService: RedisService,
    private readonly auditsService: AuditsService,
  ) {}

  /**
   * Get user notification preferences (with Redis caching).
   * Creates default preferences if none exist.
   */
  async getPreferences(userId: string): Promise<UserNotificationPreferences> {
    // Check cache first
    const cacheKey = NOTIFICATION_REDIS_KEYS.USER_PREFERENCES(userId);
    const cached =
      await this.redisService.getRecord<UserNotificationPreferences>(cacheKey);
    if (cached) return cached;

    let preferences = await this.preferencesRepo.findOne({
      where: { userId },
    });

    if (!preferences) {
      preferences = this.preferencesRepo.create({
        userId,
        channels: { inApp: true, email: true, sms: false },
        quietHours: { enabled: false, startTime: '22:00', endTime: '08:00' },
        emailBatching: { enabled: false, frequency: 'daily' },
        unsubscribedCategories: [],
      });
      preferences = await this.preferencesRepo.save(preferences);
      this.logger.log(
        `Created default notification preferences for user ${userId}`,
      );
    }

    // Cache result
    await this.redisService.storeRecord(
      cacheKey,
      preferences,
      NOTIFICATION_CACHE_TTL.USER_PREFERENCES,
    );

    return preferences;
  }

  /**
   * Update user notification preferences
   */
  async updatePreferences(
    userId: string,
    dto: UpdateNotificationPreferencesDto,
  ): Promise<UserNotificationPreferences> {
    let preferences = await this.preferencesRepo.findOne({
      where: { userId },
    });

    if (!preferences) {
      preferences = this.preferencesRepo.create({ userId });
    }

    // Merge updates
    if (dto.channels) {
      preferences.channels = { ...preferences.channels, ...dto.channels };
    }
    if (dto.categories) {
      const existing = preferences.categories || {};
      const merged: typeof existing = { ...existing };
      for (const [key, val] of Object.entries(dto.categories)) {
        merged[key] = {
          enabled: val.enabled,
          channels: {
            inApp:
              val.channels?.inApp ?? existing[key]?.channels?.inApp ?? true,
            email:
              val.channels?.email ?? existing[key]?.channels?.email ?? true,
          },
        };
      }
      preferences.categories = merged;
    }
    if (dto.quietHours) {
      preferences.quietHours = {
        ...preferences.quietHours,
        ...dto.quietHours,
      };
    }
    if (dto.emailBatching) {
      preferences.emailBatching = {
        ...preferences.emailBatching,
        ...dto.emailBatching,
      };
    }
    if (dto.unsubscribedCategories !== undefined) {
      preferences.unsubscribedCategories = dto.unsubscribedCategories;
    }

    const saved = await this.preferencesRepo.save(preferences);

    // Invalidate cache
    await this.redisService.deleteRecord(
      NOTIFICATION_REDIS_KEYS.USER_PREFERENCES(userId),
    );

    this.auditsService
      .logUserAction(
        userId,
        AUDIT_ACTIONS.NOTIFICATION.PREFERENCES_UPDATED,
        AUDIT_RESOURCE.NOTIFICATION,
        userId,
        { changesAfter: dto as Record<string, unknown> },
      )
      .catch(() => {
        /* noop */
      });

    return saved;
  }

  /**
   * Batch-fetch preferences for multiple users.
   * Returns a Map<userId, preferences> for efficient lookups.
   */
  async getPreferencesForUsers(
    userIds: string[],
  ): Promise<Map<string, UserNotificationPreferences>> {
    if (userIds.length === 0) return new Map();

    const preferences = await this.preferencesRepo
      .createQueryBuilder('p')
      .where('p.userId IN (:...userIds)', { userIds })
      .getMany();

    const map = new Map<string, UserNotificationPreferences>();
    for (const pref of preferences) {
      map.set(pref.userId, pref);
    }

    return map;
  }

  /**
   * Determine if a user should receive a notification based on their preferences.
   */
  shouldSendNotification(
    category: string,
    preferences: UserNotificationPreferences | undefined,
  ): boolean {
    // No preferences = default to send
    if (!preferences) return true;

    // Global in-app toggle
    if (!preferences.channels?.inApp) return false;

    // Category explicitly unsubscribed
    if (preferences.unsubscribedCategories?.includes(category)) return false;

    // Category-specific toggle
    const categoryPref = preferences.categories?.[category];
    if (categoryPref && !categoryPref.enabled) return false;

    // Quiet hours check
    if (this.isInQuietHours(preferences.quietHours)) return false;

    return true;
  }

  /**
   * Determine if a user should receive an email for this notification.
   */
  shouldSendEmail(
    category: string,
    preferences: UserNotificationPreferences | undefined,
  ): boolean {
    // No preferences = default to send email
    if (!preferences) return true;

    // Global email toggle
    if (!preferences.channels?.email) return false;

    // Category explicitly unsubscribed
    if (preferences.unsubscribedCategories?.includes(category)) return false;

    // Category-specific email toggle
    const categoryPref = preferences.categories?.[category];
    if (categoryPref && !categoryPref.channels?.email) return false;

    return true;
  }

  /**
   * Check if the current time falls within the user's quiet hours.
   */
  private isInQuietHours(
    quietHours:
      | { enabled: boolean; startTime: string; endTime: string }
      | undefined,
  ): boolean {
    if (!quietHours?.enabled) return false;

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const [startH, startM] = quietHours.startTime.split(':').map(Number);
    const [endH, endM] = quietHours.endTime.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    // Handle overnight quiet hours (e.g., 22:00 - 08:00)
    if (startMinutes > endMinutes) {
      return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
    }

    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  }
}
