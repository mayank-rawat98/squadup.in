import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';
import { JwtAppService } from '../../auth/services/jwt.service';
import { WS_EVENTS } from '../constants';
import { allowedOrigins } from '../../config';
@WebSocketGateway({
  namespace: '/notifications',
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
@Injectable()
export class NotificationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(NotificationGateway.name);

  /** Maps userId -> Set of socketIds (supports multiple tabs/devices) */
  private userSockets = new Map<string, Set<string>>();

  /** Maps socketId -> userId for quick reverse lookup on disconnect */
  private socketUserMap = new Map<string, string>();

  constructor(private readonly jwtAppService: JwtAppService) {}

  // ─── Connection Lifecycle ──────────────────────────────────────

  async handleConnection(@ConnectedSocket() client: Socket): Promise<void> {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        this.logger.warn(
          `Client ${client.id} attempted to connect without token`,
        );
        client.disconnect();
        return;
      }

      // Verify JWT using existing auth service
      const decoded = await this.jwtAppService.verifyAccessToken(token);
      const userId = decoded.sub;

      if (!userId) {
        client.disconnect();
        return;
      }

      // Store socket connection (supports multiple connections per user)
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)?.add(client.id);
      this.socketUserMap.set(client.id, userId);

      // Join user-specific room for targeted broadcasts
      client.join(`user:${userId}`);

      // Store userId on socket data for later use
      client.data.userId = userId;

      this.logger.log(
        `User ${userId} connected (socket: ${client.id}, total connections: ${this.userSockets.get(userId)?.size ?? 0})`,
      );
    } catch (error: unknown) {
      this.logger.warn(`Connection rejected: ${(error as Error).message}`);
      client.disconnect();
    }
  }

  handleDisconnect(@ConnectedSocket() client: Socket): void {
    const userId = this.socketUserMap.get(client.id);

    if (userId) {
      const sockets = this.userSockets.get(userId);
      if (sockets) {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          this.userSockets.delete(userId);
        }
      }
      this.socketUserMap.delete(client.id);

      this.logger.log(
        `User ${userId} disconnected (socket: ${client.id}, remaining: ${sockets?.size ?? 0})`,
      );
    }
  }

  // ─── Outbound Methods (called by NotificationService) ─────────

  /**
   * Send a notification payload to a specific user across all their connected sockets
   */
  sendToUser(userId: string, payload: Record<string, unknown>): void {
    this.server.to(`user:${userId}`).emit(WS_EVENTS.NOTIFICATION, payload);
  }

  /**
   * Send a notification to multiple users
   */
  sendToUsers(userIds: string[], payload: Record<string, unknown>): void {
    for (const userId of userIds) {
      this.sendToUser(userId, payload);
    }
  }

  /**
   * Send updated unread count to a specific user
   */
  sendUnreadCount(userId: string, count: number): void {
    this.server.to(`user:${userId}`).emit(WS_EVENTS.UNREAD_COUNT, { count });
  }

  /**
   * Tell a user's connected clients that one of their mailboxes changed, so
   * they can refresh the affected lists live. Targets the existing per-user
   * room; the client decides which cached folders to invalidate.
   */
  emitMailboxChanged(
    userId: string,
    payload: { senderEmailId: string; reason: string },
  ): void {
    this.server.to(`user:${userId}`).emit(WS_EVENTS.MAILBOX_CHANGED, payload);
  }

  /**
   * Broadcast to ALL connected clients (use sparingly — system announcements only)
   */
  broadcastToAll(payload: Record<string, unknown>): void {
    this.server.emit(WS_EVENTS.NOTIFICATION, payload);
  }

  // ─── Inbound Message Handlers ─────────────────────────────────

  @SubscribeMessage(WS_EVENTS.MARK_AS_READ)
  handleMarkAsRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { notificationReceiverId: string },
  ): void {
    client.emit(WS_EVENTS.MARK_AS_READ_ACK, {
      success: true,
      notificationReceiverId: data.notificationReceiverId,
    });
  }

  @SubscribeMessage(WS_EVENTS.PING)
  handlePing(@ConnectedSocket() client: Socket): void {
    client.emit(WS_EVENTS.PONG);
  }

  // ─── Utility Methods ──────────────────────────────────────────

  /**
   * Check if a user currently has any active WebSocket connections
   */
  isUserOnline(userId: string): boolean {
    const sockets = this.userSockets.get(userId);
    return !!sockets && sockets.size > 0;
  }

  /**
   * Get total number of unique connected users
   */
  getConnectedUsersCount(): number {
    return this.userSockets.size;
  }

  /**
   * Get total number of active socket connections
   */
  getTotalConnectionsCount(): number {
    return this.socketUserMap.size;
  }
}
