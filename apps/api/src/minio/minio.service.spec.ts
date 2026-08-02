import { Test } from '@nestjs/testing';
import { MinioService } from './minio.service';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import {
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { CreateBucketDto } from './dto/create-bucket.dto';
import { DeleteBucketItemsDto } from './dto/delete-bucket-item.dto';

jest.mock('minio');

describe('MinioService', () => {
  let service: MinioService;
  let mockMinioClient: jest.Mocked<Minio.Client>;

  const mockConfigGet = (key: string) => {
    switch (key) {
      case 'MINIO_ACCESS_KEY':
        return 'test_access_key';
      case 'MINIO_SECRET_KEY':
        return 'test_secret_key';
      case 'MINIO_PORT':
        return 9000;
      case 'MINIO_ENDPOINT':
        return 'localhost';
      case 'MINIO_EXTERNAL_HOST':
        return 'localhost';
      default:
        return null;
    }
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    // Properly mock the Minio Client constructor and its methods
    const mockClientInstance: Partial<jest.Mocked<Minio.Client>> = {
      bucketExists: jest.fn(),
      makeBucket: jest.fn(),
      setBucketPolicy: jest.fn(),
      listBuckets: jest.fn(),
      listObjectsV2: jest.fn(),
      removeObjects: jest.fn(),
      removeBucket: jest.fn(),
      putObject: jest.fn(),
    };

    (Minio.Client as jest.Mock).mockImplementation(
      () => mockClientInstance as jest.Mocked<Minio.Client>,
    );

    const module = await Test.createTestingModule({
      providers: [
        MinioService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(mockConfigGet),
          },
        },
      ],
    }).compile();

    service = module.get(MinioService);
    mockMinioClient = service['minioClient'] as jest.Mocked<Minio.Client>;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createBucket', () => {
    it('should create a bucket if it does not exist', async () => {
      const dto: CreateBucketDto = { bucketName: 'new-bucket', isPublic: true };
      mockMinioClient.bucketExists.mockResolvedValue(false);
      (
        mockMinioClient.makeBucket as unknown as jest.MockedFunction<
          (...args: unknown[]) => Promise<void>
        >
      ).mockImplementation(async () => {
        return;
      });
      (
        mockMinioClient.setBucketPolicy as unknown as jest.MockedFunction<
          (...args: unknown[]) => Promise<void>
        >
      ).mockImplementation(async () => {
        return;
      });

      await service.createBucket(dto);

      expect(mockMinioClient.bucketExists).toHaveBeenCalledWith(dto.bucketName);
      expect(mockMinioClient.makeBucket).toHaveBeenCalledWith(dto.bucketName);
      expect(mockMinioClient.setBucketPolicy).toHaveBeenCalled();
    });

    it('should throw BadRequestException if bucket already exists', async () => {
      const dto: CreateBucketDto = {
        bucketName: 'existing-bucket',
        isPublic: true,
      };
      mockMinioClient.bucketExists.mockResolvedValue(true);

      await expect(service.createBucket(dto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('listBuckets', () => {
    it('should return a list of buckets', async () => {
      const buckets = [{ name: 'bucket1', creationDate: new Date() }];
      mockMinioClient.listBuckets.mockResolvedValue(buckets);

      const result = await service.listBuckets();

      expect(result).toEqual(buckets);
    });
  });

  describe('listBucketItems', () => {
    it('should list items in a bucket', async () => {
      const bucketName = 'test-bucket';
      const mockStream = {
        on: jest.fn((event: string, cb: (...args: unknown[]) => void) => {
          if (event === 'data') {
            cb({ name: 'item1' });
          }
          if (event === 'end') {
            cb();
          }
          return mockStream;
        }),
      } as unknown as Minio.BucketStream<Minio.BucketItem>;
      mockMinioClient.bucketExists.mockResolvedValue(true);
      mockMinioClient.listObjectsV2.mockReturnValue(mockStream);

      const items = await service.listBucketItems(bucketName);

      expect(items).toEqual(['item1']);
    });

    it('should throw BadRequestException if bucket does not exist', async () => {
      mockMinioClient.bucketExists.mockResolvedValue(false);
      await expect(service.listBucketItems('non-existent')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('forceDeleteBucket', () => {
    it('should delete a bucket and its items', async () => {
      const bucketName = 'test-bucket';
      const mockStream = {
        on: jest.fn((event: string, cb: (...args: unknown[]) => void) => {
          if (event === 'data') {
            cb({ name: 'item1' });
          }
          if (event === 'end') {
            cb();
          }
          return mockStream;
        }),
      } as unknown as Minio.BucketStream<Minio.BucketItem>;

      mockMinioClient.bucketExists.mockResolvedValue(true);
      mockMinioClient.listObjectsV2.mockReturnValue(mockStream);
      mockMinioClient.removeObjects.mockResolvedValue([]);
      (
        mockMinioClient.removeBucket as unknown as jest.MockedFunction<
          (...args: unknown[]) => Promise<void>
        >
      ).mockImplementation(async () => {
        return;
      });

      await service.forceDeleteBucket(bucketName);

      expect(mockMinioClient.removeObjects).toHaveBeenCalledWith(bucketName, [
        'item1',
      ]);
      expect(mockMinioClient.removeBucket).toHaveBeenCalledWith(bucketName);
    });
  });

  describe('uploadFile', () => {
    it('should upload a file and return its public URL', async () => {
      const bucketName = 'uploads';
      const fileClass = 'images';
      const originalname = 'test.jpg';
      const buffer = Buffer.from('some-data');

      mockMinioClient.putObject.mockResolvedValue({
        etag: 'test-etag',
        versionId: '1',
      });

      const result = await service.uploadFile(
        bucketName,
        originalname,
        buffer,
        fileClass,
      );

      expect(mockMinioClient.putObject).toHaveBeenCalled();
      expect(result.url).toContain(`${bucketName}/${fileClass}/`);
    });

    it('should throw InternalServerErrorException on upload failure', async () => {
      mockMinioClient.putObject.mockRejectedValue(new Error('Upload failed'));
      await expect(
        service.uploadFile('b', 'f', Buffer.from('d'), 'c'),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('deleteFiles', () => {
    it('should delete specified files from a bucket', async () => {
      const bucketName = 'test-bucket';
      const dto: DeleteBucketItemsDto = { filenames: ['file1.txt'] };
      mockMinioClient.bucketExists.mockResolvedValue(true);
      mockMinioClient.removeObjects.mockResolvedValue([]);

      await service.deleteFiles(dto, bucketName);

      expect(mockMinioClient.removeObjects).toHaveBeenCalledWith(
        bucketName,
        dto.filenames,
      );
    });
  });
});
