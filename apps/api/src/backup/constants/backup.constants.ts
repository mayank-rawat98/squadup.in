export const BACKUP = {
  CONTAINER_NAME: 'squadup-backup-worker',
  DOCKER_SOCKET_PATH: '/var/run/docker.sock',
};
export const SCRIPTS_PATH = {
  BACKUP: '/usr/local/bin/backup.sh',
  RESTORE: '/usr/local/bin/restore.sh',
  LIST_BACKUPS: '/usr/local/bin/list_backups.sh',
};
// Runtime enum used for validation (ParseEnumPipe requires a runtime object)
export enum BackupTypeEnum {
  POSTGRES = 'postgres',
  MINIO = 'minio',
}

export type BackupType = 'postgres' | 'minio';
