import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassThrough } from 'stream';
import Docker = require('dockerode');
import { BACKUP, BackupType, SCRIPTS_PATH } from './constants/backup.constants';

@Injectable()
export class BackupService {
  private logger = new Logger(BackupService.name);
  private docker = new Docker({ socketPath: BACKUP.DOCKER_SOCKET_PATH });
  // The backup worker is controlled via the Docker socket by its engine
  // container name, which differs per environment (squadup-backup-worker on
  // prod, squadup-backup-worker-staging on staging). Drive it from env so the
  // same image works on both VPS; fall back to the prod default.
  CONTAINER_NAME: string;

  constructor(private readonly configService: ConfigService) {
    this.CONTAINER_NAME =
      this.configService.get<string>('BACKUP_WORKER_CONTAINER') ||
      BACKUP.CONTAINER_NAME;
  }

  /**
   * Lists available backups by running the list_backups.sh script
   */
  async listBackups() {
    const container = await this.getContainer();

    try {
      this.logger.log('Fetching backup list...');
      const output = await this.execCommand(container, [
        SCRIPTS_PATH.LIST_BACKUPS,
      ]);
      return JSON.parse(output);
    } catch (error) {
      this.logger.error('Failed to list backups', error);
      throw new InternalServerErrorException('Failed to retrieve backup list');
    }
  }

  /**
   * Triggers a restore operation
   * @param type 'postgres' or 'minio'
   * @param targetId Date (YYYY-MM-DD) or Timestamp (YYYY-MM-DD_HH-MM-SS)
   */
  async restoreBackup(type: BackupType, date: string) {
    const container = await this.getContainer();

    // 1. Sanitize Input (Security Best Practice)
    // Allow only alphanumeric, dashes, underscores, and colons
    const safeDate = date.replace(/[^a-zA-Z0-9\-_:]/g, '');

    try {
      this.logger.log(`Starting restore: ${type} -> ${safeDate}`);

      const output = await this.execCommand(container, [
        SCRIPTS_PATH.RESTORE,
        type,
        safeDate,
      ]);

      this.logger.log(`Restore completed: ${output}`);
      return {
        success: true,
        message: 'Restore completed successfully',
        logs: output,
      };
    } catch (error) {
      const errMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Restore failed for ${type}`, errMessage);
      throw new InternalServerErrorException(`Restore failed: ${errMessage}`);
    }
  }

  /**
   * Manually trigger a new backup immediately
   */
  async triggerManualBackup() {
    const container = await this.getContainer();
    try {
      this.logger.log('Triggering manual backup...');
      const output = await this.execCommand(container, [SCRIPTS_PATH.BACKUP]);
      return { success: true, logs: output };
    } catch (error) {
      this.logger.error('Manual backup failed', error);
      throw new InternalServerErrorException('Backup failed to start');
    }
  }

  // --- Private Helpers ---

  private async getContainer(): Promise<Docker.Container> {
    const container = this.docker.getContainer(this.CONTAINER_NAME);
    try {
      await container.inspect(); // will throw if not found (404)
      return container;
    } catch (err) {
      this.logger.error(`Container ${this.CONTAINER_NAME} not found`, err);
      throw new InternalServerErrorException(
        `Container ${this.CONTAINER_NAME} not found`,
      );
    }
  }

  // Reused exactly from your MailConfigService
  private async execCommand(
    container: Docker.Container,
    cmd: string[],
  ): Promise<string> {
    const exec = await container.exec({
      Cmd: cmd,
      AttachStdout: true,
      AttachStderr: true,
    });

    const stream = await exec.start({ Detach: false, Tty: false });

    return new Promise((resolve, reject) => {
      let output = '';
      let errorOutput = '';

      const stdout = new PassThrough();
      const stderr = new PassThrough();

      stdout.on('data', (chunk) => {
        output += chunk.toString('utf8');
      });

      stderr.on('data', (chunk) => {
        errorOutput += chunk.toString('utf8');
      });

      container.modem.demuxStream(stream, stdout, stderr);

      stream.on('end', () => {
        exec.inspect((err, data) => {
          if (err) {
            return reject(err);
          }
          if (data && data.ExitCode !== 0) {
            // Log the error output for debugging
            this.logger.error(`Exec Error Output: ${errorOutput}`);
            return reject(
              new Error(
                `Command failed with exit code ${data.ExitCode}: ${errorOutput.trim()}`,
              ),
            );
          }
          resolve(output);
        });
      });

      stream.on('error', (err) => {
        reject(err);
      });
    });
  }
}
