import {
  Controller,
  Post,
  Delete,
  Query,
  Req,
  UseGuards,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { FastifyRequest } from 'fastify';
import { createHash } from 'crypto';
import sharp from 'sharp';
import sanitize from 'sanitize-filename';
import { StorageService } from './storage.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

type EntityType = 'category' | 'cell' | 'variant' | 'product';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_IMAGE_DIMENSION = 4096 * 4096;

function detectImageMime(buf: Buffer): string | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return 'image/jpeg';
  }
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return 'image/png';
  }
  if (buf.length >= 12 && buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46
    && buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50) {
    return 'image/webp';
  }
  return null;
}

@Controller('storage')
@UseGuards(AuthGuard, RolesGuard)
@Roles('admin', 'super_admin')
export class StorageController {
  private readonly logger = new Logger(StorageController.name);

  constructor(private readonly storageService: StorageService) {}

  @Post('upload')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async upload(@Req() req: FastifyRequest) {
    const UPLOAD_TIMEOUT_MS = 15_000;

    const timer = setTimeout(() => {
      req.raw.destroy(new Error('Upload timed out'));
    }, UPLOAD_TIMEOUT_MS);

    try {
      return await this.processUpload(req);
    } catch (err) {
      if (err instanceof Error && err.message === 'Upload timed out') {
        throw new BadRequestException(
          'Upload timed out after 15 seconds. The file may be corrupted or incompatible.',
        );
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  private async processUpload(req: FastifyRequest) {
    const parts = req.parts();
    let buffer: Buffer | undefined;
    let entityType: string | undefined;
    let sku: string | undefined;
    let position = 1;
    let filename: string | undefined;

    for await (const part of parts) {
      if ((part as any).type === 'file') {
        const filePart = part as any;
        buffer = await filePart.toBuffer();
        filename = filePart.filename;
      } else if (part.fieldname === 'entityType') {
        entityType = (part as any).value as string;
      } else if (part.fieldname === 'sku') {
        sku = (part as any).value as string;
      } else if (part.fieldname === 'position') {
        const parsed = parseInt((part as any).value as string, 10);
        if (!isNaN(parsed) && parsed > 0) position = parsed;
      }
    }

    if (!buffer) {
      throw new BadRequestException(
        'No file provided. Send a multipart/form-data request with a "file" field.',
      );
    }

    // 1. File size enforcement (early reject)
    if (buffer.length > MAX_FILE_SIZE) {
      throw new BadRequestException(
        'File too large. Maximum size is 5MB.',
      );
    }

    // 2. Magic byte validation
    const detectedMime = detectImageMime(buffer);
    if (!detectedMime) {
      throw new BadRequestException(
        'Invalid image file type. Allowed formats: JPEG, PNG, WebP.',
      );
    }

    // 3. Sanitize filename
    const cleanName = sanitize(filename ?? 'image').replace(/\s+/g, '-') || 'image';

    // 4. Image compression via sharp (with 8s fallback to original)
    let optimized: Buffer;
    const originalExt = detectedMime.split('/')[1]; // jpeg, png, or webp
    try {
      optimized = await Promise.race([
        sharp(buffer, { limitInputPixels: MAX_IMAGE_DIMENSION })
          .resize({ width: 1200, withoutEnlargement: true })
          .webp({ quality: 80 })
          .toBuffer(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('sharp timeout')), 8_000),
        ),
      ]);
    } catch (err) {
      if (err instanceof Error && err.message === 'sharp timeout') {
        this.logger.warn('Sharp processing timed out, storing original', {
          file: cleanName,
          size: buffer.length,
          type: detectedMime,
        });
        optimized = buffer;
      } else {
        this.logger.error('Upload failed', {
          error: err instanceof Error ? err.message : String(err),
          file: cleanName,
          userId: (req as any).user?.id,
        });
        throw new BadRequestException(
          'Image processing failed. File may be corrupted.',
        );
      }
    }

    // 5. Generate storage key
    const wasOptimized = optimized !== buffer;
    const extension = wasOptimized ? 'webp' : originalExt;
    const validEntityTypes: EntityType[] = ['category', 'cell', 'variant', 'product'];
    const uploadTimestamp = Date.now();
    let storageKey: string;

    if (entityType && sku && validEntityTypes.includes(entityType as EntityType)) {
      const prefix = createHash('md5').update(sku).digest('hex').substring(0, 4);
      const fileName = entityType === 'variant'
        ? `${sku}-${position}-${uploadTimestamp}.${extension}`
        : `${entityType}-${sku}-${position}-${uploadTimestamp}.${extension}`;
      storageKey = `product-images/${prefix}/${fileName}`;
    } else {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      storageKey = `product-images/${year}/${month}/${uploadTimestamp}-${cleanName}.${extension}`;
    }

    const contentType = wasOptimized ? 'image/webp' : detectedMime;
    await this.storageService.uploadFile(storageKey, optimized, contentType);

    // 6. Structured logging
    this.logger.log(
      JSON.stringify({
        action: 'upload',
        file: cleanName,
        key: storageKey,
        size: buffer.length,
        optimizedSize: optimized.length,
        type: detectedMime,
        entityType: entityType ?? null,
        sku: sku ?? null,
        position,
        userId: (req as any).user?.id,
        timestamp: new Date().toISOString(),
      }),
    );

    return {
      path: storageKey,
      url: `/${storageKey}`,
      originalName: filename ?? 'image',
    };
  }

  @Delete()
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async delete(@Query('path') path: string) {
    if (!path || typeof path !== 'string') {
      throw new BadRequestException('Query parameter "path" is required');
    }

    const sanitizedPath = path.startsWith('/') ? path.slice(1) : path;

    if (!sanitizedPath.startsWith('product-images/')) {
      throw new BadRequestException('Only files under product-images/ can be deleted via this endpoint');
    }

    await this.storageService.deleteFile(sanitizedPath);

    this.logger.log(JSON.stringify({
      action: 'delete',
      path: sanitizedPath,
      timestamp: new Date().toISOString(),
    }));

    return { deleted: true, path: sanitizedPath };
  }
}
