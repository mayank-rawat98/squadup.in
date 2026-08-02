import { Test } from '@nestjs/testing';
import { Readable } from 'stream';
import { PermissionsGuard } from '../common/guards/auth.guard';
import { MinioController } from './minio.controller';
import { MinioService } from './minio.service';
import { CreateBucketDto } from './dto/create-bucket.dto';
import { DeleteBucketItemsDto } from './dto/delete-bucket-item.dto';
import { BadRequestException } from '@nestjs/common';

describe('MinioController', () => {
  let controller: MinioController;
  let service: jest.Mocked<MinioService>;

  const mockMinioService = {
    createBucket: jest.fn(),
    listBuckets: jest.fn(),
    forceDeleteBucket: jest.fn(),
    listBucketItems: jest.fn(),
    deleteFiles: jest.fn(),
    uploadFile: jest.fn(),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [MinioController],
      providers: [
        {
          provide: MinioService,
          useValue: mockMinioService,
        },
      ],
    })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(MinioController);
    service = module.get(MinioService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createBucket', () => {
    it('should call service.createBucket and return success', async () => {
      const dto: CreateBucketDto = {
        bucketName: 'test-bucket',
        isPublic: true,
      };
      mockMinioService.createBucket.mockResolvedValue(undefined);

      const result = await controller.createBucket(dto);

      expect(service.createBucket).toHaveBeenCalledWith(dto);
      expect(result).toEqual({
        success: true,
        data: null,
        message: `Bucket ${dto.bucketName} created successfully`,
      });
    });
  });

  describe('getAllBuckets', () => {
    it('should call service.listBuckets and return buckets', async () => {
      const buckets = [{ name: 'bucket1', creationDate: new Date() }];
      mockMinioService.listBuckets.mockResolvedValue(buckets);

      const result = await controller.getAllBuckets();

      expect(service.listBuckets).toHaveBeenCalled();
      expect(result).toEqual({
        success: true,
        data: { buckets },
        message: 'Buckets retrieved successfully',
      });
    });
  });

  describe('forceDeleteBucket', () => {
    it('should call service.forceDeleteBucket', async () => {
      const bucketName = 'test-bucket';
      mockMinioService.forceDeleteBucket.mockResolvedValue(undefined);

      const result = await controller.forceDeleteBucket(bucketName);

      expect(service.forceDeleteBucket).toHaveBeenCalledWith(bucketName);
      expect(result).toEqual({
        success: true,
        data: null,
        message: `Bucket ${bucketName} deleted successfully`,
      });
    });
  });

  describe('listBucketItems', () => {
    it('should call service.listBucketItems and return items', async () => {
      const bucketName = 'test-bucket';
      const items = ['item1', 'item2'];
      mockMinioService.listBucketItems.mockResolvedValue(items);

      const result = await controller.listBucketItems(bucketName);

      expect(service.listBucketItems).toHaveBeenCalledWith(bucketName);
      expect(result).toEqual({
        success: true,
        data: { items },
        message: `Items in bucket ${bucketName} retrieved successfully`,
      });
    });
  });

  describe('deleteBucketItems', () => {
    it('should call service.deleteFiles', async () => {
      const bucketName = 'test-bucket';
      const dto: DeleteBucketItemsDto = { filenames: ['item1'] };
      mockMinioService.deleteFiles.mockResolvedValue(undefined);

      const result = await controller.deleteBucketItems(dto, bucketName);

      expect(service.deleteFiles).toHaveBeenCalledWith(dto, bucketName);
      expect(result).toEqual({
        success: true,
        data: null,
        message: `Bucket items deleted successfully`,
      });
    });
  });

  describe('uploadFile', () => {
    it('should call service.uploadFile with file details', async () => {
      const bucketName = 'test-bucket';
      const fileClass = 'avatar';
      const file: Express.Multer.File = {
        fieldname: 'file',
        originalname: 'test.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        size: 12345,
        buffer: Buffer.from('test'),
        stream: new Readable(),
        destination: '',
        filename: '',
        path: '',
      };
      mockMinioService.uploadFile.mockResolvedValue({ url: 'http://some-url' });

      const result = await controller.uploadFile(bucketName, fileClass, file);

      expect(service.uploadFile).toHaveBeenCalledWith(
        bucketName,
        file.originalname,
        file.buffer,
        fileClass,
        { 'Content-Type': file.mimetype, 'Content-Length': file.size },
      );
      expect(result).toEqual({
        success: true,
        data: { url: 'http://some-url' },
        message: `File ${file.originalname} uploaded successfully to bucket ${bucketName}`,
      });
    });

    it('should throw BadRequestException if no file is provided', async () => {
      await expect(
        controller.uploadFile(
          'bucket',
          'class',
          undefined as unknown as Express.Multer.File,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
