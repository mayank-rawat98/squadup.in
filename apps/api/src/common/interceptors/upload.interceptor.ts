import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { BadRequestException } from '@nestjs/common';
import {
  ALLOWED_MULTER_FILE_TYPES,
  MAX_FILE_SIZE_IN_BYTES,
} from '../../constants/multer.constants';

export const UploadFileInterceptor = (fieldName: string) =>
  FileInterceptor(fieldName, {
    storage: memoryStorage(),
    limits: {
      fileSize: MAX_FILE_SIZE_IN_BYTES,
    },
    fileFilter: (req, file, cb) => {
      const allowedTypes = ALLOWED_MULTER_FILE_TYPES;

      if (!allowedTypes.includes(file.mimetype)) {
        return cb(new BadRequestException('Invalid file type'), false);
      }

      cb(null, true);
    },
  });
