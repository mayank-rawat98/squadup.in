import { InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { PassThrough } from 'stream';
import { BackupService } from './backup.service';
import { BACKUP, SCRIPTS_PATH } from './constants/backup.constants';
import Docker = require('dockerode');

// Mock dockerode
jest.mock('dockerode');

describe('BackupService', () => {
  let service: BackupService;
  let mockContainer: {
    exec: jest.Mock;
    inspect: jest.Mock;
    modem: {
      demuxStream: jest.Mock;
    };
  };

  beforeEach(async () => {
    // Reset mocks
    jest.clearAllMocks();

    // Silence Logger
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    // Mock Container
    mockContainer = {
      exec: jest.fn(),
      inspect: jest.fn().mockResolvedValue({}),
      modem: {
        demuxStream: jest.fn(),
      },
    };

    // Mock Docker Implementation
    (Docker as unknown as jest.Mock).mockImplementation(() => ({
      getContainer: jest.fn().mockImplementation((name) => {
        if (name === BACKUP.CONTAINER_NAME) {
          return mockContainer;
        }
        throw new Error('Container not found');
      }),
    }));

    const module = await Test.createTestingModule({
      providers: [
        BackupService,
        // get() returns undefined so CONTAINER_NAME falls back to the default
        { provide: ConfigService, useValue: { get: () => undefined } },
      ],
    }).compile();

    service = module.get(BackupService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // Helper to setup a successful exec sequence
  const mockExecSuccess = (output: string) => {
    const mockStream = new PassThrough();
    const mockExecJob = {
      start: jest.fn().mockResolvedValue(mockStream),
      inspect: jest.fn((cb) => cb(null, { ExitCode: 0 })),
    };

    mockContainer.exec.mockResolvedValue(mockExecJob);

    mockContainer.modem.demuxStream.mockImplementation(
      (
        stream: NodeJS.EventEmitter,
        stdout: NodeJS.EventEmitter,
        stderr: NodeJS.EventEmitter,
      ) => {
        // Simulate output on stdout
        stdout.emit('data', Buffer.from(output));
        stderr.emit('data', Buffer.from('')); // No error
      },
    );

    return { mockStream, mockExecJob };
  };

  // Helper to setup a failed exec sequence (exit code != 0)
  const mockExecFail = (errorOutput: string, exitCode = 1) => {
    const mockStream = new PassThrough();
    const mockExecJob = {
      start: jest.fn().mockResolvedValue(mockStream),
      inspect: jest.fn((cb) => cb(null, { ExitCode: exitCode })),
    };

    mockContainer.exec.mockResolvedValue(mockExecJob);

    mockContainer.modem.demuxStream.mockImplementation(
      (
        stream: NodeJS.EventEmitter,
        stdout: NodeJS.EventEmitter,
        stderr: NodeJS.EventEmitter,
      ) => {
        // Simulate error on stderr
        stdout.emit('data', Buffer.from('')); // No output
        stderr.emit('data', Buffer.from(errorOutput));
      },
    );

    return { mockStream, mockExecJob };
  };

  describe('listBackups', () => {
    it('should return parsed JSON list of backups', async () => {
      const mockData = { postgres: ['backup1.gz'], minio: ['backup2.gz'] };
      const { mockStream } = mockExecSuccess(JSON.stringify(mockData));

      const promise = service.listBackups();
      await new Promise((resolve) => setTimeout(resolve, 10)); // Wait for listeners
      mockStream.emit('end'); // Finish the stream
      const result = await promise;

      expect(mockContainer.exec).toHaveBeenCalledWith({
        Cmd: [SCRIPTS_PATH.LIST_BACKUPS],
        AttachStdout: true,
        AttachStderr: true,
      });
      expect(result).toEqual(mockData);
    });

    it('should throw InternalServerErrorException if commands fails', async () => {
      const { mockStream } = mockExecFail('Some error occurred');

      const promise = service.listBackups();
      await new Promise((resolve) => setTimeout(resolve, 10)); // Wait for listeners
      mockStream.emit('end');

      await expect(promise).rejects.toThrow(InternalServerErrorException);
    });

    it('should throw InternalServerErrorException if output is invalid JSON', async () => {
      const { mockStream } = mockExecSuccess('Invalid JSON');

      const promise = service.listBackups();
      await new Promise((resolve) => setTimeout(resolve, 10)); // Wait for listeners
      mockStream.emit('end');

      await expect(promise).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('restoreBackup', () => {
    it('should trigger restore with sanitized date', async () => {
      const { mockStream } = mockExecSuccess('Restore done');
      const date = '2023-10-27; rm -rf /'; // Malicious input
      const expectedSafeDate = '2023-10-27rm-rf'; // Correct expectation based on regex

      const promise = service.restoreBackup('postgres', date);
      await new Promise((resolve) => setTimeout(resolve, 10)); // Wait for listeners
      mockStream.emit('end');
      const result = await promise;

      expect(mockContainer.exec).toHaveBeenCalledWith(
        expect.objectContaining({
          Cmd: [SCRIPTS_PATH.RESTORE, 'postgres', expectedSafeDate],
        }),
      );
      expect(result.success).toBe(true);
    });

    it('should throw error if restore fails', async () => {
      const { mockStream } = mockExecFail('Restore failed');

      const promise = service.restoreBackup('minio', '2023-10-27');
      await new Promise((resolve) => setTimeout(resolve, 10)); // Wait for listeners
      mockStream.emit('end');

      await expect(promise).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('triggerManualBackup', () => {
    it('should trigger manual backup script', async () => {
      const { mockStream } = mockExecSuccess('Backup success');

      const promise = service.triggerManualBackup();
      await new Promise((resolve) => setTimeout(resolve, 10)); // Wait for listeners
      mockStream.emit('end');
      const result = await promise;

      expect(mockContainer.exec).toHaveBeenCalledWith(
        expect.objectContaining({
          Cmd: [SCRIPTS_PATH.BACKUP],
        }),
      );
      expect(result).toEqual({ success: true, logs: 'Backup success' });
    });

    it('should throw error if backup fails', async () => {
      const { mockStream } = mockExecFail('Backup failed');

      const promise = service.triggerManualBackup();
      await new Promise((resolve) => setTimeout(resolve, 10)); // Wait for listeners
      mockStream.emit('end');

      await expect(promise).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('getContainer', () => {
    it('should throw InternalServerErrorException if container inspect fails', async () => {
      // Simulate inspect throwing (container not found) — service should wrap it
      mockContainer.inspect.mockRejectedValue(new Error('Container not found'));

      await expect(service.listBackups()).rejects.toThrow(
        InternalServerErrorException,
      );
      await expect(service.listBackups()).rejects.toThrow(/not found/);
    });
  });
});
