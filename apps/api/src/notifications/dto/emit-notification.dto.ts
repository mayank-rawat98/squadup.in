import {
  IsString,
  IsEnum,
  IsOptional,
  IsUUID,
  IsObject,
  IsBoolean,
  IsArray,
  ArrayMinSize,
} from 'class-validator';
import {
  NotificationCategory,
  NotificationEntityType,
  NotificationPriority,
} from '../constants';

/**
 * DTO for emitting notifications from any feature module.
 * This is the single entry point for the centralized notification system.
 */
export class EmitNotificationDto {
  @IsOptional()
  @IsString()
  templateCode?: string;

  @IsEnum(NotificationCategory)
  category!: NotificationCategory;

  @IsOptional()
  @IsUUID()
  actorId?: string;

  @IsOptional()
  @IsString()
  actorName?: string;

  @IsOptional()
  @IsString()
  actorAvatar?: string;

  @IsOptional()
  @IsEnum(NotificationEntityType)
  entityType?: NotificationEntityType;

  @IsOptional()
  @IsString()
  entityId?: string;

  @IsString()
  title!: string;

  @IsString()
  message!: string;

  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  actionUrl?: string;

  @IsOptional()
  @IsEnum(NotificationPriority)
  priority?: NotificationPriority = NotificationPriority.MEDIUM;

  @IsOptional()
  @IsBoolean()
  requiresAction?: boolean = false;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;

  @IsArray()
  @IsUUID('4', { each: true })
  @ArrayMinSize(1)
  recipientIds!: string[];
}
