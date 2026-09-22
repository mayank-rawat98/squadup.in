import { BadRequestException, Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { MinioService } from '../../minio/minio.service';
import { optimizeImageToWebp } from '../../utils/image-optimizer';

/** Public, world-readable bucket for blog imagery. */
const BLOG_ASSETS_BUCKET = 'blog-assets';

/**
 * The one ops-specific blog concern: uploading cover and inline images to a
 * dedicated public MinIO bucket. Everything else reuses {@link BlogsService}.
 */
@Injectable()
export class AdminOpsBlogsService {
  constructor(private readonly minioService: MinioService) {}

  /**
   * Re-encode an image as WebP and store it in the public blog bucket,
   * returning its URL for use as a cover image or an inline `<img>` src.
   */
  async uploadImage(file: Express.Multer.File): Promise<{ url: string }> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    await this.minioService.ensureBucketExists(BLOG_ASSETS_BUCKET);

    const optimized = await optimizeImageToWebp(file.buffer).catch(() => {
      throw new BadRequestException('The file is not a readable image');
    });

    const objectKey = `${crypto.randomBytes(8).toString('hex')}.${optimized.extension}`;

    return this.minioService.uploadFileAtPath(
      BLOG_ASSETS_BUCKET,
      objectKey,
      optimized.buffer,
      { 'Content-Type': optimized.mimetype },
    );
  }
}
