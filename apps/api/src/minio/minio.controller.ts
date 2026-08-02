import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { MinioService } from './minio.service';
import { CreateBucketDto } from './dto/create-bucket.dto';
import { DeleteBucketItemsDto } from './dto/delete-bucket-item.dto';
import { UploadFileInterceptor } from '../common/interceptors/upload.interceptor';
import { ApiTags } from '@nestjs/swagger';
import {
  CreateBucketDocs,
  DeleteBucketItemsDocs,
  ForceDeleteBucketDocs,
  GetAllBucketsDocs,
  ListBucketItemsDocs,
  UploadFileDocs,
} from './swagger/minio.swagger';
import { StaffGuard } from '../staff/guards/staff.guard';
import { UserRateLimit } from '../decorators/throttler.decorator';

@Controller({
  version: '1',
  path: 'minio',
})
@UseGuards(StaffGuard)
@UserRateLimit()
@ApiTags('minio')
export class MinioController {
  constructor(private readonly minioService: MinioService) {}

  @Post('create-bucket')
  @CreateBucketDocs
  async createBucket(@Body() dto: CreateBucketDto) {
    await this.minioService.createBucket(dto);
    return {
      success: true,
      data: null,
      message: `Bucket ${dto.bucketName} created successfully`,
    };
  }
  @Get('all-buckets')
  @GetAllBucketsDocs
  async getAllBuckets() {
    const buckets = await this.minioService.listBuckets();
    return {
      success: true,
      data: { buckets },
      message: 'Buckets retrieved successfully',
    };
  }

  @Delete('force-delete-bucket/:bucketName')
  @ForceDeleteBucketDocs
  async forceDeleteBucket(@Param('bucketName') bucketName: string) {
    await this.minioService.forceDeleteBucket(bucketName);
    return {
      success: true,
      data: null,
      message: `Bucket ${bucketName} deleted successfully`,
    };
  }

  @Get('bucket-items/:bucketName')
  @ListBucketItemsDocs
  async listBucketItems(@Param('bucketName') bucketName: string) {
    const items = await this.minioService.listBucketItems(bucketName);
    return {
      success: true,
      data: { items },
      message: `Items in bucket ${bucketName} retrieved successfully`,
    };
  }

  @Delete('delete-bucket-items/:bucketName')
  @DeleteBucketItemsDocs
  async deleteBucketItems(
    @Body() dto: DeleteBucketItemsDto,
    @Param('bucketName') bucketName: string,
  ) {
    await this.minioService.deleteFiles(dto, bucketName);
    return {
      success: true,
      data: null,
      message: `Bucket items deleted successfully`,
    };
  }
  @Post('upload-file/:bucketName/:fileClass')
  @UseInterceptors(UploadFileInterceptor('file'))
  @UploadFileDocs
  async uploadFile(
    @Param('bucketName') bucketName: string,
    @Param('fileClass') fileClass: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const { url } = await this.minioService.uploadFile(
      bucketName,
      file.originalname,
      file.buffer,
      fileClass,
      { 'Content-Type': file.mimetype, 'Content-Length': file.size },
    );
    return {
      success: true,
      data: { url },
      message: `File ${file.originalname} uploaded successfully to bucket ${bucketName}`,
    };
  }
}
