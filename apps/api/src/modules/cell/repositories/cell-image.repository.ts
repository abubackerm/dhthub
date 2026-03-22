import { Injectable } from '@nestjs/common';
import { DatabaseProvider, TransactionClient } from '../../../core/database/database.provider';
import { transactionContext } from '../../../core/database/transaction-context.store';

export interface CellImageEntity {
  id: string;
  cellId: string;
  sku: string;
  storagePath: string;
  position: number;
  altText: string | null;
  isPrimary: boolean;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class CellImageRepository {
  constructor(private readonly db: DatabaseProvider) {}

  private getClient(): TransactionClient | DatabaseProvider {
    const tx = transactionContext.getStore();
    return tx ?? this.db;
  }

  async findByCellId(cellId: string): Promise<CellImageEntity[]> {
    return this.getClient().cellImage.findMany({
      where: { cellId },
      orderBy: { position: 'asc' },
    });
  }

  async findBySku(sku: string): Promise<CellImageEntity[]> {
    return this.getClient().cellImage.findMany({
      where: { sku },
      orderBy: { position: 'asc' },
    });
  }

  async findById(id: string): Promise<CellImageEntity | null> {
    return this.getClient().cellImage.findUnique({
      where: { id },
    });
  }

  async findPrimaryByCellId(cellId: string): Promise<CellImageEntity | null> {
    return this.getClient().cellImage.findFirst({
      where: { cellId, isPrimary: true },
    });
  }

  async create(data: {
    cellId: string;
    sku: string;
    storagePath: string;
    position: number;
    altText?: string | null;
    isPrimary?: boolean;
  }): Promise<CellImageEntity> {
    return this.getClient().cellImage.create({
      data: {
        cellId: data.cellId,
        sku: data.sku,
        storagePath: data.storagePath,
        position: data.position,
        altText: data.altText,
        isPrimary: data.isPrimary ?? false,
      },
    });
  }

  async upsert(
    cellId: string,
    position: number,
    storagePath: string,
    sku: string,
    altText?: string | null,
  ): Promise<CellImageEntity> {
    return this.getClient().cellImage.upsert({
      where: {
        cellId_position: {
          cellId,
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
        cellId,
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
  ): Promise<CellImageEntity> {
    return this.getClient().cellImage.update({
      where: { id },
      data,
    });
  }

  async deleteByCellId(cellId: string): Promise<{ count: number }> {
    return this.getClient().cellImage.deleteMany({
      where: { cellId },
    });
  }

  async delete(id: string): Promise<CellImageEntity> {
    return this.getClient().cellImage.delete({
      where: { id },
    });
  }
}
