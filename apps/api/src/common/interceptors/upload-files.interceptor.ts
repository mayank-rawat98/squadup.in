import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { BadRequestException } from '@nestjs/common';
import {
  ALLOWED_MULTER_FILE_TYPES,
  MAX_FILE_SIZE_IN_BYTES,
} from '../../constants/multer.constants';

/**
 * Interceptor for accepting multiple files under a single field name.
 *
 * @param fieldName  – HTML field name (e.g. `files`)
 * @param maxCount   – Maximum number of files accepted in one request (default: 10)
 */
export const UploadFilesInterceptor = (fieldName: string, maxCount = 10) =>
  FilesInterceptor(fieldName, maxCount, {
    storage: memoryStorage(),
    limits: {
      fileSize: MAX_FILE_SIZE_IN_BYTES,
    },
    fileFilter: (_req, file, cb) => {
      if (!ALLOWED_MULTER_FILE_TYPES.includes(file.mimetype)) {
        return cb(new BadRequestException('Invalid file type'), false);
      }
      cb(null, true);
    },
  });
