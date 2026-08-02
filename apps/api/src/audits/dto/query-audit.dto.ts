import {
  IsOptional,
  IsString,
  IsEnum,
  IsDateString,
  IsNumber,
  Min,
  Max,
  IsArray,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * action is accepted as a free-format string so that every value in
 * AUDIT_ACTIONS is accepted without keeping a duplicate enum in sync.
 * The repository's buildSafeQuery / sanitizeValue provides injection safety.
 */

/**
 * Mirrors AUDIT_RESOURCE values exactly.
 * Add new entries here whenever a new resource type is added to the constant.
 */
export enum AuditResourceTypeEnum {
  USER = 'User',
  EMAIL = 'Email',
  CAMPAIGN = 'Campaign',
  TEMPLATE = 'Template',
  CONTACT = 'Contact',
  COMPANY = 'Company',
  LIST = 'List',
  FOLDER = 'Folder',
  DOMAIN = 'Domain',
  DEVICE = 'Device',
  FORM = 'Form',
  NOTIFICATION = 'Notification',
  EMAIL_ADDRESS = 'EmailAddress',
  SETTINGS = 'Settings',
  CONFIG = 'Config',
  MARKETPLACE = 'Marketplace',
}

export enum AuditSeverityEnum {
  INFO = 'INFO',
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum AuditStatusEnum {
  SUCCESS = 'SUCCESS',
  FAILURE = 'FAILURE',
  PENDING = 'PENDING',
  ALERT = 'ALERT',
}

/**
 * Mirrors AUDIT_CATEGORY values exactly.
 */
export enum AuditCategoryEnum {
  AUTHENTICATION = 'authentication',
  SECURITY = 'security',
  EMAIL = 'email',
  CAMPAIGN = 'campaign',
  TEMPLATE = 'template',
  USER_MANAGEMENT = 'user-management',
  CRM = 'crm',
  FORMS = 'forms',
  CONFIGURATION = 'configuration',
  COMPLIANCE = 'compliance',
  MARKETPLACE = 'marketplace',
  NOTIFICATION = 'notification',
}

export class QueryAuditDto {
  // Pagination
  @ApiPropertyOptional({ description: 'Page number', default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Items per page',
    default: 50,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 50;

  // User Filters
  @ApiPropertyOptional({ description: 'Filter by user ID' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ description: 'Filter by user email' })
  @IsOptional()
  @IsString()
  userEmail?: string;

  @ApiPropertyOptional({ description: 'Filter by user role' })
  @IsOptional()
  @IsString()
  userRole?: string;

  // Action & Resource Filters
  @ApiPropertyOptional({
    description:
      'Filter by action type (e.g. CAMPAIGN_CREATED, TEMPLATE_UPDATED). ' +
      'Accepts any value from AUDIT_ACTIONS constants.',
    example: 'CAMPAIGN_CREATED',
  })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional({
    description: 'Filter by resource type',
    enum: AuditResourceTypeEnum,
  })
  @IsOptional()
  @IsEnum(AuditResourceTypeEnum)
  resourceType?: AuditResourceTypeEnum;

  @ApiPropertyOptional({ description: 'Filter by resource ID' })
  @IsOptional()
  @IsString()
  resourceId?: string;

  // Status & Severity Filters
  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: AuditStatusEnum,
  })
  @IsOptional()
  @IsEnum(AuditStatusEnum)
  status?: AuditStatusEnum;

  @ApiPropertyOptional({
    description: 'Filter by severity',
    enum: AuditSeverityEnum,
  })
  @IsOptional()
  @IsEnum(AuditSeverityEnum)
  severity?: AuditSeverityEnum;

  // Category & Tags
  @ApiPropertyOptional({
    description: 'Filter by category',
    enum: AuditCategoryEnum,
  })
  @IsOptional()
  @IsEnum(AuditCategoryEnum)
  category?: AuditCategoryEnum;

  @ApiPropertyOptional({
    description: 'Filter by tags (comma-separated)',
    example: 'login,success',
  })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.split(',').map((t) => t.trim()) : value,
  )
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  // Date Range Filters
  @ApiPropertyOptional({
    description: 'Start date (ISO 8601)',
    example: '2026-01-01T00:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date (ISO 8601)',
    example: '2026-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  // IP & Session Filters
  @ApiPropertyOptional({ description: 'Filter by IP address' })
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @ApiPropertyOptional({ description: 'Filter by session/device ID' })
  @IsOptional()
  @IsString()
  sessionId?: string;

  // Email-Specific Filters
  @ApiPropertyOptional({ description: 'Filter by campaign ID' })
  @IsOptional()
  @IsString()
  campaignId?: string;

  @ApiPropertyOptional({ description: 'Filter by template ID' })
  @IsOptional()
  @IsString()
  templateId?: string;

  @ApiPropertyOptional({ description: 'Filter by message ID' })
  @IsOptional()
  @IsString()
  messageId?: string;

  // Alert Filter
  @ApiPropertyOptional({ description: 'Filter by alert status' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  alertTriggered?: boolean;

  // Search
  @ApiPropertyOptional({ description: 'Search in description' })
  @IsOptional()
  @IsString()
  search?: string;

  // Sorting
  @ApiPropertyOptional({ description: 'Sort by field', default: 'timestamp' })
  @IsOptional()
  @IsString()
  sortBy?: string = 'timestamp';

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['asc', 'desc'],
    default: 'desc',
  })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}
