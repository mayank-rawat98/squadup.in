import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import { MINIO_CONSTANTS } from './constants/minio.constants';
import { DeleteBucketItemsDto } from './dto/delete-bucket-item.dto';
import { generateUniqueFilename } from '../utils/utils';
import { CreateBucketDto } from './dto/create-bucket.dto';

@Injectable()
export class MinioService {
  private minioClient: Minio.Client;
  private readonly logger = new Logger(MinioService.name);
  private readonly secretKey!: string;
  private readonly accessKey!: string;
  private readonly port!: number;
  private readonly internalHost!: string;
  private readonly externalHost!: string;
  constructor(private readonly configService: ConfigService) {
    // Synchronous client initialization
    const accessKey = this.configService.get<string>(
      MINIO_CONSTANTS.MINIO_ACCESS_KEY,
    );
    const secretKey = this.configService.get<string>(
      MINIO_CONSTANTS.MINIO_SECRET_KEY,
    );
    const port = this.configService.get<number>(MINIO_CONSTANTS.MINIO_PORT);
    const internalHost = this.configService.get<string>(
      MINIO_CONSTANTS.MINIO_ENDPOINT,
    );
    const externalHost = this.configService.get<string>(
      MINIO_CONSTANTS.MINIO_EXTERNAL_HOST,
    );
    if (!accessKey || !secretKey || !port || !internalHost || !externalHost) {
      this.logger.error(
        'Minio configuration error: Missing environment variables',
      );
      throw new InternalServerErrorException('MinIO configuration error');
    }
    this.accessKey = accessKey;
    this.secretKey = secretKey;
    this.port = port;
    this.internalHost = internalHost;
    this.externalHost = externalHost;

    this.minioClient = new Minio.Client({
      endPoint: this.internalHost,
      port: this.port,
      useSSL: false,
      accessKey: this.accessKey,
      secretKey: this.secretKey,
    });
  }

  private async setPublicPolicy(bucketName: string) {
    const policy = {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Principal: { AWS: ['*'] },
          Action: ['s3:GetObject'],
          Resource: [`arn:aws:s3:::${bucketName}/*`],
        },
      ],
    };

    await this.minioClient.setBucketPolicy(bucketName, JSON.stringify(policy));
    this.logger.log(`Public read policy set for bucket: ${bucketName}`);
  }
  private getPublicUrl(bucketName: string, fileName: string): string {
    if (this.externalHost === 'localhost') {
      return `http://${this.externalHost}:${this.port}/${bucketName}/${fileName}`;
    }
    return `https://${this.externalHost}/${bucketName}/${fileName}`;
  }

  async createBucket(dto: CreateBucketDto) {
    const bucketExists = await this.minioClient.bucketExists(dto.bucketName);
    if (bucketExists) {
      throw new BadRequestException('Bucket already exists');
    }
    this.logger.log(`Bucket '${dto.bucketName}' not found. Creating...`);
    const bucketData = await Promise.all([
      this.minioClient.makeBucket(dto.bucketName),
      this.setPublicPolicy(dto.bucketName),
    ]);
    return bucketData[0];
  }

  async ensurePublicBucket(bucketName: string) {
    const bucketExists = await this.minioClient.bucketExists(bucketName);
    if (!bucketExists) {
      this.logger.log(`Bucket '${bucketName}' not found. Creating...`);
      await this.minioClient.makeBucket(bucketName);
    }
    await this.setPublicPolicy(bucketName);
  }

  async listBuckets() {
    return await this.minioClient.listBuckets();
  }
  async listBucketItems(bucketName: string) {
    const bucketExists = await this.minioClient.bucketExists(bucketName);
    if (!bucketExists) {
      throw new BadRequestException('Bucket does not exist');
    }
    const objectsStream = this.minioClient.listObjectsV2(bucketName, '', true);
    const items: string[] = [];
    const bucketItems = new Promise<string[]>((resolve, reject) => {
      objectsStream.on('data', (obj) => {
        items.push(obj.name as string);
      });
      objectsStream.on('end', () => resolve(items));
      objectsStream.on('error', (err) => {
        this.logger.error(`Error listing items in bucket '${bucketName}'`, err);
        reject(new InternalServerErrorException('MinIO list items error'));
      });
    });
    return bucketItems;
  }

  async forceDeleteBucket(bucketName: string) {
    const bucketExists = await this.minioClient.bucketExists(bucketName);
    if (!bucketExists) {
      throw new BadRequestException('Bucket does not exist');
    }

    const items = await this.listBucketItems(bucketName);

    if (items.length > 0) {
      await this.minioClient.removeObjects(bucketName, items);
      this.logger.log(`Deleted ${items.length} objects from '${bucketName}'.`);
    }
    await this.minioClient.removeBucket(bucketName);
    this.logger.log(`Bucket '${bucketName}' force deleted successfully.`);
  }

  async uploadFile(
    bucketName: string,
    fileName: string,
    fileBuffer: Buffer,
    fileClass: string,
    metaData = {},
  ) {
    try {
      const uniqueFileName = generateUniqueFilename(fileClass);
      const fileName = `${fileClass}/${uniqueFileName}`;
      await this.minioClient.putObject(
        bucketName,
        fileName,
        fileBuffer,
        fileBuffer.length,
        metaData,
      );

      return {
        url: this.getPublicUrl(bucketName, fileName),
      };
    } catch (error) {
      this.logger.error(`Upload failed for ${fileName}`, error);
      throw new InternalServerErrorException('File upload failed');
    }
  }

  /**
   * Upload a file using a fully-specified object key (e.g. `{userId}/{hash}.{ext}`).
   * The caller is responsible for constructing a unique, safe key.
   */
  async uploadFileAtPath(
    bucketName: string,
    objectKey: string,
    fileBuffer: Buffer,
    metaData = {},
  ) {
    try {
      await this.minioClient.putObject(
        bucketName,
        objectKey,
        fileBuffer,
        fileBuffer.length,
        metaData,
      );
      return { url: this.getPublicUrl(bucketName, objectKey) };
    } catch (error) {
      this.logger.error(`Upload failed for key '${objectKey}'`, error);
      throw new InternalServerErrorException('File upload failed');
    }
  }

  /**
   * Generate a presigned GET URL using the externally-reachable host, so the
   * link works from a browser even when the MinIO endpoint used by the API is
   * an internal hostname. For private buckets (e.g. invoices) this is the
   * correct way to expose objects.
   */
  async getPresignedDownloadUrl(
    bucketName: string,
    objectKey: string,
    expirySeconds = 60 * 60,
  ): Promise<string> {
    const useExternalSsl = this.externalHost !== 'localhost';
    const externalClient = new Minio.Client({
      endPoint: this.externalHost,
      port: useExternalSsl ? 443 : this.port,
      useSSL: useExternalSsl,
      accessKey: this.accessKey,
      secretKey: this.secretKey,
    });
    return externalClient.presignedGetObject(
      bucketName,
      objectKey,
      expirySeconds,
    );
  }

  /**
   * Generate a presigned PUT URL (externally-reachable host) so a browser can
   * upload an object directly to MinIO without the bytes passing through the API.
   */
  async getPresignedUploadUrl(
    bucketName: string,
    objectKey: string,
    expirySeconds = 5 * 60,
  ): Promise<string> {
    const useExternalSsl = this.externalHost !== 'localhost';
    const externalClient = new Minio.Client({
      endPoint: this.externalHost,
      port: useExternalSsl ? 443 : this.port,
      useSSL: useExternalSsl,
      accessKey: this.accessKey,
      secretKey: this.secretKey,
    });
    return externalClient.presignedPutObject(
      bucketName,
      objectKey,
      expirySeconds,
    );
  }

  /**
   * Stat an object (size, etc). Throws if the object does not exist — used to
   * verify a client-claimed upload actually landed and to read its true size.
   */
  async statObject(bucketName: string, objectKey: string) {
    return this.minioClient.statObject(bucketName, objectKey);
  }

  /** Read an object fully into a Buffer (e.g. to attach to an outgoing email). */
  async getObjectBuffer(
    bucketName: string,
    objectKey: string,
  ): Promise<Buffer> {
    const stream = await this.minioClient.getObject(bucketName, objectKey);
    const chunks: Buffer[] = [];
    return new Promise<Buffer>((resolve, reject) => {
      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  }

  async deleteFiles(dto: DeleteBucketItemsDto, bucketName: string) {
    const bucketExists = await this.minioClient.bucketExists(bucketName);
    if (!bucketExists) {
      throw new BadRequestException('Bucket does not exist');
    }

    await this.minioClient.removeObjects(bucketName, dto.filenames);
  }

  /**
   * Remove specific objects from a bucket. No-op for an empty key list.
   * Safe to call for already-absent keys (MinIO ignores missing objects).
   */
  async removeObjects(bucketName: string, objectKeys: string[]): Promise<void> {
    if (objectKeys.length === 0) return;
    const exists = await this.minioClient.bucketExists(bucketName);
    if (!exists) return;
    await this.minioClient.removeObjects(bucketName, objectKeys);
    this.logger.log(
      `Removed ${objectKeys.length} object(s) from '${bucketName}'.`,
    );
  }

  /**
   * Ensures a bucket exists; creates it with a public-read policy if it doesn't.
   * Safe to call on every request — the existence check is cheap.
   *
   * Use only for buckets that genuinely need public asset URLs (email images,
   * avatars, template assets). For private content (inbound mail attachments,
   * raw MIME, invoices) use {@link ensurePrivateBucket} so objects are never
   * world-readable by URL.
   */
  async ensureBucketExists(bucketName: string): Promise<void> {
    const exists = await this.minioClient.bucketExists(bucketName);
    if (!exists) {
      this.logger.log(`Bucket '${bucketName}' not found. Auto-creating...`);
      try {
        await this.minioClient.makeBucket(bucketName);
        await this.setPublicPolicy(bucketName);
      } catch (error) {
        this.logger.error(`Failed to create bucket '${bucketName}'`, error);
        throw new InternalServerErrorException(
          'Failed to ensure bucket exists',
        );
      }
    }
  }

  /**
   * Ensures a bucket exists WITHOUT applying any public-read policy, so its
   * objects are only reachable by authenticated/presigned access. Use for any
   * bucket holding private content (inbound attachments, raw MIME). Safe to
   * call on every request — the existence check is cheap.
   */
  async ensurePrivateBucket(bucketName: string): Promise<void> {
    const exists = await this.minioClient.bucketExists(bucketName);
    if (!exists) {
      this.logger.log(
        `Private bucket '${bucketName}' not found. Auto-creating...`,
      );
      try {
        await this.minioClient.makeBucket(bucketName);
      } catch (error) {
        this.logger.error(
          `Failed to create private bucket '${bucketName}'`,
          error,
        );
        throw new InternalServerErrorException(
          'Failed to ensure bucket exists',
        );
      }
    }
  }
}
