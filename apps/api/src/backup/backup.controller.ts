import {
  Controller,
  Get,
  Param,
  ParseEnumPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { BackupService } from './backup.service';
import {
  SensitiveRateLimit,
  UserRateLimit,
} from '../decorators/throttler.decorator';
import { BackupTypeEnum } from './constants/backup.constants';
import { ApiTags } from '@nestjs/swagger';
import {
  ListBackupsDocs,
  RestoreBackupDocs,
  TriggerManualBackupDocs,
} from './swagger/backup.swagger';
import { StaffGuard } from '../staff/guards/staff.guard';

@Controller({
  version: '1',
  path: 'backup',
})
@ApiTags('backup')
@UseGuards(StaffGuard)
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  @Get('list-backups')
  @UserRateLimit()
  @ListBackupsDocs
  async listBackups() {
    const backups = await this.backupService.listBackups();
    return {
      success: true,
      data: { backups },
      message: 'Backup list retrieved successfully',
    };
  }

  @Post('restore-backup/:type/:date')
  @SensitiveRateLimit()
  @RestoreBackupDocs
  async restoreBackup(
    @Param('type', new ParseEnumPipe(BackupTypeEnum)) type: BackupTypeEnum,
    @Param('date') date: string,
  ) {
    await this.backupService.restoreBackup(type, date);
    return {
      success: true,
      data: null,
      message: `Restore completed successfully for date ${date}`,
    };
  }

  @Post('manual-backup')
  @SensitiveRateLimit()
  @TriggerManualBackupDocs
  async triggerManualBackup() {
    await this.backupService.triggerManualBackup();
    return {
      success: true,
      data: null,
      message: `Manual backup triggered successfully`,
    };
  }
}
