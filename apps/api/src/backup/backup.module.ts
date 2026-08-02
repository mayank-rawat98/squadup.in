import { Global, Module } from '@nestjs/common';
import { BackupService } from './backup.service';
import { BackupController } from './backup.controller';
@Global()
@Module({
  controllers: [BackupController],
  providers: [BackupService],
})
export class BackupModule {}
