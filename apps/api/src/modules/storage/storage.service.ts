import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { IStorageService } from './storage.interface';

@Injectable()
export class StorageService implements IStorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly endpoint: string;

  constructor(private readonly configService: ConfigService) {
    const accessKeyId = this.configService.get<string>('SEAWEDFS_S3_ACCESS_KEY');
    const secretAccessKey = this.configService.get<string>('SEAWEDFS_S3_SECRET_KEY');
    const port = this.configService.get<string>('SEAWEDFS_S3_PORT', '8333');
    
    if (!accessKeyId || !secretAccessKey) {
      throw new Error('Missing SeaweedFS S3 credentials');
    }

    this.endpoint = `http://localhost:${port}`;
    this.bucketName = 'catalog';

    this.s3Client = new S3Client({
      endpoint: this.endpoint,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      forcePathStyle: true, // Required for SeaweedFS
      region: 'us-east-1',
    });

    this.logger.log(`SeaweedFS S3 client initialized with endpoint: ${this.endpoint}`);
  }

  async uploadFile(key: string, body: Buffer | Uint8Array | string, contentType: string): Promise<string> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: body,
        ContentType: contentType,
      });

      await this.s3Client.send(command);
      this.logger.log(`Successfully uploaded file: ${key}`);
      return `${this.endpoint}/${this.bucketName}${key}`;
    } catch (error) {
      this.logger.error(`Failed to upload file: ${key}`, error);
      throw error;
    }
  }

  async getFileUrl(key: string): Promise<string> {
    return `${this.endpoint}/${this.bucketName}${key}`;
  }

  async deleteFile(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);
      this.logger.log(`Successfully deleted file: ${key}`);
    } catch (error) {
      this.logger.error(`Failed to delete file: ${key}`, error);
      throw error;
    }
  }
}
