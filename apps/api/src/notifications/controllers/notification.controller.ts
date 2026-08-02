import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  Version,
  Delete,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { PermissionsGuard } from '../../common/guards/auth.guard';
import { NotificationService } from '../services/notification.service';
import { NotificationPreferencesService } from '../services/notification-preferences.service';
import { NotificationGateway } from '../gateways/notification.gateway';
import { NotificationCategory, NotificationPriority } from '../constants';

import {
  UpdateNotificationPreferencesDto,
  NotificationFilterDto,
} from '../dto';
import { UserRateLimit } from '../../decorators/throttler.decorator';
import { DeleteNotificationDto } from '../dto/delete-notification.dto';

@ApiTags('Notifications')
@ApiBearerAuth('JWT-auth')
@Controller({
  version: '1',
  path: 'notifications',
})
@UseGuards(PermissionsGuard)
@UserRateLimit()
export class NotificationController {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly preferencesService: NotificationPreferencesService,
    private readonly gateway: NotificationGateway,
  ) {}

  // ─── Notification Queries ─────────────────────────────────────

  /**
   * Get unread notifications for the authenticated user
   */
  @Get('unread')
  @ApiOperation({ summary: 'Get unread notifications' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'category', required: false, type: String })
  async getUnreadNotifications(
    @Req() req: Request,
    @Query() filter: NotificationFilterDto,
  ) {
    const userId = req.auth.userId;
    const { notifications, total } =
      await this.notificationService.getUnreadNotifications(
        userId,
        filter.limit,
        filter.skip,
        filter.category,
      );

    return {
      success: true,
      data: notifications,
      total,
      limit: filter.limit,
      skip: filter.skip,
    };
  }

  /**
   * Get all notifications (read + unread)
   */
  @Version('1')
  @Get()
  @ApiOperation({ summary: 'Get all notifications' })
  async getAllNotifications(
    @Req() req: Request,
    @Query() filter: NotificationFilterDto,
  ) {
    const userId = req.auth.userId;
    const { notifications, total } =
      await this.notificationService.getAllNotifications(
        userId,
        filter.limit,
        filter.skip,
        filter.category,
      );

    return {
      success: true,
      data: notifications,
      total,
      limit: filter.limit,
      skip: filter.skip,
    };
  }

  /**
   * Get unread notification count
   */
  @Version('1')
  @Get('unread/count')
  @ApiOperation({ summary: 'Get unread notification count' })
  async getUnreadCount(@Req() req: Request) {
    const count = await this.notificationService.getUnreadCount(
      req.auth.userId,
    );

    return {
      success: true,
      count,
    };
  }

  // ─── Notification Actions ─────────────────────────────────────

  /**
   * Mark a single notification as read
   */
  @Version('1')
  @Post(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark notification as read' })
  async markAsRead(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) receiverId: string,
  ) {
    await this.notificationService.markAsRead(req.auth.userId, receiverId);

    return {
      success: true,
      message: 'Notification marked as read',
    };
  }

  /**
   * Mark all notifications as read
   */
  @Version('1')
  @Post('read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllAsRead(@Req() req: Request) {
    await this.notificationService.markAllAsRead(req.auth.userId);

    return {
      success: true,
      message: 'All notifications marked as read',
    };
  }

  /**
   * Soft-delete a notification
   */
  @Version('1')
  @Delete('delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a notification' })
  async deleteNotification(
    @Req() req: Request,
    @Body() deleteNotificationDto: DeleteNotificationDto,
  ) {
    await this.notificationService.deleteNotification(
      req.auth.userId,
      deleteNotificationDto,
    );

    return {
      success: true,
      message: 'Notification deleted',
    };
  }

  // ─── Preferences ──────────────────────────────────────────────

  /**
   * Get the authenticated user's notification preferences
   */
  @Version('1')
  @Get('preferences')
  @ApiOperation({ summary: 'Get notification preferences' })
  async getPreferences(@Req() req: Request) {
    const preferences = await this.preferencesService.getPreferences(
      req.auth.userId,
    );

    return {
      success: true,
      data: preferences,
    };
  }

  /**
   * Update the authenticated user's notification preferences
   */
  @Version('1')
  @Post('preferences')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update notification preferences' })
  async updatePreferences(
    @Req() req: Request,
    @Body() dto: UpdateNotificationPreferencesDto,
  ) {
    const updated = await this.preferencesService.updatePreferences(
      req.auth.userId,
      dto,
    );

    return {
      success: true,
      data: updated,
    };
  }

  // ─── Health / Debug ───────────────────────────────────────────

  /**
   * Notification system health check (admin only)
   */
  @Version('1')
  @Get('health')
  @ApiOperation({ summary: 'Notification system health check' })
  async healthCheck() {
    return {
      success: true,
      data: {
        connectedUsers: this.gateway.getConnectedUsersCount(),
        totalConnections: this.gateway.getTotalConnectionsCount(),
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * DEBUG ONLY — Emit a test notification to yourself.
   * The authenticated user is both the actor and the recipient.
   * Remove or guard this endpoint in production.
   */
  @Version('1')
  @Post('test-emit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[Debug] Emit a test notification to yourself' })
  async testEmit(
    @Req() req: Request,
    @Body()
    body: {
      category?: string;
      title?: string;
      message?: string;
      priority?: string;
    },
  ) {
    const userId = req.auth.userId;
    const userName = req.user?.fullName ?? 'Test User';
    await this.notificationService.emit({
      category:
        (body.category as NotificationCategory) || NotificationCategory.SYSTEM,
      actorId: userId,
      actorName: userName,
      recipientIds: [userId],
      title: body.title || 'Test Notification',
      message:
        body.message ||
        'This is a test notification emitted from the debug endpoint.',
      priority:
        (body.priority as NotificationPriority) || NotificationPriority.MEDIUM,
      actionUrl: '/dashboard',
    });

    return {
      success: true,
      message: 'Test notification emitted',
    };
  }
}
