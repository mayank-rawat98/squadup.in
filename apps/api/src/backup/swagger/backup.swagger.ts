import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';

export const ListBackupsDocs = applyDecorators(
  ApiOperation({ summary: 'List all available backups' }),
  ApiResponse({
    status: 200,
    description: 'Backups retrieved successfully',
  }),
  ApiBearerAuth('JWT-auth'),
);

export const RestoreBackupDocs = applyDecorators(
  ApiOperation({ summary: 'Restore a backup' }),
  ApiParam({
    name: 'type',
    type: String,
    description: 'The type of backup to restore',
  }),
  ApiParam({
    name: 'date',
    type: String,
    description: 'The date of the backup to restore',
  }),
  ApiResponse({
    status: 201,
    description: 'Restore initiated successfully',
  }),
  ApiResponse({ status: 400, description: 'Bad Request' }),
  ApiBearerAuth('JWT-auth'),
);

export const TriggerManualBackupDocs = applyDecorators(
  ApiOperation({ summary: 'Trigger a manual backup' }),
  ApiResponse({
    status: 201,
    description: 'Manual backup triggered successfully',
  }),
  ApiBearerAuth('JWT-auth'),
);
