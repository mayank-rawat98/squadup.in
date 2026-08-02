import { applyDecorators } from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { CreateBucketDto } from '../dto/create-bucket.dto';
import { DeleteBucketItemsDto } from '../dto/delete-bucket-item.dto';

export const CreateBucketDocs = applyDecorators(
  ApiOperation({ summary: 'Create a new bucket' }),
  ApiBody({ type: CreateBucketDto }),
  ApiResponse({
    status: 201,
    description: 'Bucket created successfully',
  }),
  ApiResponse({ status: 400, description: 'Bad Request' }),
  ApiBearerAuth('JWT-auth'),
);

export const GetAllBucketsDocs = applyDecorators(
  ApiOperation({ summary: 'List all buckets' }),
  ApiResponse({
    status: 200,
    description: 'Buckets retrieved successfully',
  }),
  ApiBearerAuth('JWT-auth'),
);

export const ForceDeleteBucketDocs = applyDecorators(
  ApiOperation({ summary: 'Force delete a bucket' }),
  ApiParam({
    name: 'bucketName',
    type: String,
    description: 'The name of the bucket to delete',
  }),
  ApiResponse({
    status: 200,
    description: 'Bucket deleted successfully',
  }),
  ApiResponse({ status: 400, description: 'Bad Request' }),
  ApiBearerAuth('JWT-auth'),
);

export const ListBucketItemsDocs = applyDecorators(
  ApiOperation({ summary: 'List items in a bucket' }),
  ApiParam({
    name: 'bucketName',
    type: String,
    description: 'The name of the bucket',
  }),
  ApiResponse({
    status: 200,
    description: 'Items retrieved successfully',
  }),
  ApiResponse({ status: 400, description: 'Bad Request' }),
  ApiBearerAuth('JWT-auth'),
);

export const DeleteBucketItemsDocs = applyDecorators(
  ApiOperation({ summary: 'Delete items from a bucket' }),
  ApiParam({
    name: 'bucketName',
    type: String,
    description: 'The name of the bucket',
  }),
  ApiBody({ type: DeleteBucketItemsDto }),
  ApiResponse({
    status: 200,
    description: 'Bucket items deleted successfully',
  }),
  ApiResponse({ status: 400, description: 'Bad Request' }),
  ApiBearerAuth('JWT-auth'),
);

export const UploadFileDocs = applyDecorators(
  ApiOperation({ summary: 'Upload a file to a bucket' }),
  ApiConsumes('multipart/form-data'),
  ApiParam({
    name: 'bucketName',
    type: String,
    description: 'The name of the bucket',
  }),
  ApiParam({
    name: 'fileClass',
    type: String,
    description: 'The classification of the file',
  }),
  ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  }),
  ApiResponse({
    status: 201,
    description: 'File uploaded successfully',
  }),
  ApiResponse({ status: 400, description: 'Bad Request' }),
  ApiBearerAuth('JWT-auth'),
);
