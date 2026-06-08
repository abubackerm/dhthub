import { Injectable } from '@nestjs/common';
import { DatabaseProvider, TransactionClient } from '@core/database/database.provider';
import { transactionContext } from '@core/database/transaction-context.store';
import { VariantImageEntity } from '../entities/variant-image.entity';

@Injectable()
export class VariantImageRepository {
  constructor(private readonly db: DatabaseProvider) {}

  private getClient(): TransactionClient | DatabaseProvider {
    const tx = transactionContext.getStore();
    return tx ?? this.db;
  }

  async findByVariantId(variantId: string): Promise<VariantImageEntity[]> {
    return this.getClient().variantImage.findMany({
      where: { variantId },
      orderBy: { position: 'asc' },
    });
  }

  async findBySku(sku: string): Promise<VariantImageEntity[]> {
    return this.getClient().variantImage.findMany({
      where: { sku },
      orderBy: { position: 'asc' },
    });
  }

  async findBySkuAndPosition(sku: string, position: number): Promise<VariantImageEntity | null> {
    return this.getClient().variantImage.findFirst({
      where: { sku, position },
    });
  }

  async findById(id: string): Promise<VariantImageEntity | null> {
    return this.getClient().variantImage.findUnique({
      where: { id },
    });
  }

  async findPrimaryByVariantId(variantId: string): Promise<VariantImageEntity | null> {
    return this.getClient().variantImage.findFirst({
      where: { variantId, isPrimary: true },
    });
  }

  async create(data: {
    variantId: string;
    sku: string;
    storagePath: string;
    position: number;
    altText?: string | null;
    isPrimary?: boolean;
  }): Promise<VariantImageEntity> {
    return this.getClient().variantImage.create({
      data: {
        variantId: data.variantId,
        sku: data.sku,
        storagePath: data.storagePath,
        position: data.position,
        altText: data.altText,
        isPrimary: data.isPrimary ?? false,
      },
    });
  }

  async upsert(
    variantId: string,
    position: number,
    storagePath: string,
    sku: string,
    altText?: string | null,
  ): Promise<VariantImageEntity> {
    return this.getClient().variantImage.upsert({
      where: {
        variantId_position: {
          variantId,
          position
        }
      },
      update: {
        storagePath,
        sku,
        altText,
        updatedAt: new Date()
      },
      create: {
        variantId,
        sku,
        storagePath,
        position,
        altText,
        isPrimary: position === 1
      }
    });
  }

  async update(
    id: string,
    data: Partial<{
      storagePath: string;
      altText: string | null;
      isPrimary: boolean;
      position: number;
    }>,
  ): Promise<VariantImageEntity> {
    return this.getClient().variantImage.update({
      where: { id },
      data,
    });
  }

  async deleteByVariantId(variantId: string): Promise<{ count: number }> {
    return this.getClient().variantImage.deleteMany({
      where: { variantId },
    });
  }

  async delete(id: string): Promise<VariantImageEntity> {
    return this.getClient().variantImage.delete({
      where: { id },
    });
  }

  async reorderPositions(variantId: string, imageIds: string[]): Promise<void> {
    await this.db.$transaction(async (tx) => {
      const existingImages = await tx.variantImage.findMany({
        where: { variantId },
        select: { id: true },
      });

      const existingIdSet = new Set(existingImages.map((img) => img.id));

      for (const imageId of imageIds) {
        if (!existingIdSet.has(imageId)) {
          throw new Error(
            `Image ${imageId} does not belong to variant ${variantId}`,
          );
        }
      }

      for (let i = 0; i < imageIds.length; i++) {
        await tx.variantImage.update({
          where: { id: imageIds[i] },
          data: { position: i + 1 },
        });
      }
    });
  }
}
