import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { BadRequestException } from '@nestjs/common';

export const ALLOWED_CSV_MIME_TYPES = [
  'text/csv',
  'application/csv',
  'application/vnd.ms-excel',
  'text/plain',
];

export const MAX_CSV_FILE_SIZE_IN_BYTES = 10 * 1024 * 1024; // 10MB

export const UploadCsvInterceptor = (fieldName: string) =>
  FileInterceptor(fieldName, {
    storage: memoryStorage(),
    limits: {
      fileSize: MAX_CSV_FILE_SIZE_IN_BYTES,
    },
    fileFilter: (_req, file, cb) => {
      const isAllowedMime = ALLOWED_CSV_MIME_TYPES.includes(file.mimetype);
      const isAllowedExt = file.originalname.toLowerCase().endsWith('.csv');

      if (!isAllowedMime || !isAllowedExt) {
        return cb(new BadRequestException('Only CSV files are allowed'), false);
      }

      cb(null, true);
    },
  });
