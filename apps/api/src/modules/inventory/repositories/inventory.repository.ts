import { Injectable } from '@nestjs/common';
import { DatabaseProvider, TransactionClient } from '@core/database/database.provider';
import { transactionContext } from '@core/database/transaction-context.store';
import { MovementType, MovementReason, ReservationStatus } from '../entities';

@Injectable()
export class InventoryRepository {
  constructor(private readonly db: DatabaseProvider) {}

  private getClient(): TransactionClient | DatabaseProvider {
    const tx = transactionContext.getStore();
    return tx ?? this.db;
  }

  async findInventoryLevel(
    variantId: string,
    warehouseId: string,
  ): Promise<any | null> {
    return this.getClient().inventoryLevel.findUnique({
      where: {
        variantId_warehouseId: {
          variantId,
          warehouseId,
        },
      },
    });
  }

  async findInventoryLevelById(id: string): Promise<any | null> {
    return this.getClient().inventoryLevel.findUnique({
      where: { id },
    });
  }

  async createInventoryLevel(data: {
    variantId: string;
    warehouseId: string;
    availableQty?: number;
    reservedQty?: number;
    safetyStock?: number;
  }): Promise<any> {
    return this.getClient().inventoryLevel.create({
      data: {
        variantId: data.variantId,
        warehouseId: data.warehouseId,
        availableQty: data.availableQty ?? 0,
        reservedQty: data.reservedQty ?? 0,
        safetyStock: data.safetyStock ?? 0,
      },
    });
  }

  async updateInventoryLevel(
    id: string,
    data: {
      availableQty?: number;
      reservedQty?: number;
      safetyStock?: number;
    },
  ): Promise<any> {
    return this.getClient().inventoryLevel.update({
      where: { id },
      data,
    });
  }

  async getVariantStock(variantId: string): Promise<{
    available: number;
    reserved: number;
    safetyStock: number;
  }> {
    const levels = await this.getClient().inventoryLevel.findMany({
      where: { variantId },
    });

    return levels.reduce(
      (acc, level) => ({
        available: acc.available + level.availableQty,
        reserved: acc.reserved + level.reservedQty,
        safetyStock: acc.safetyStock + level.safetyStock,
      }),
      { available: 0, reserved: 0, safetyStock: 0 },
    );
  }

  async increaseStock(
    inventoryId: string,
    quantity: number,
    movementData: {
      type: MovementType;
      reason?: MovementReason | null;
      referenceId?: string | null;
    },
  ): Promise<void> {
    await this.getClient().inventoryLevel.update({
      where: { id: inventoryId },
      data: {
        availableQty: { increment: quantity },
      },
    });

    await this.getClient().inventoryMovement.create({
      data: {
        inventoryId,
        type: movementData.type,
        quantity,
        reason: movementData.reason ?? null,
        referenceId: movementData.referenceId ?? null,
      },
    });
  }

  async decreaseStock(
    inventoryId: string,
    quantity: number,
    movementData: {
      type: MovementType;
      reason?: MovementReason | null;
      referenceId?: string | null;
    },
  ): Promise<void> {
    await this.getClient().inventoryLevel.update({
      where: { id: inventoryId },
      data: {
        availableQty: { decrement: quantity },
      },
    });

    await this.getClient().inventoryMovement.create({
      data: {
        inventoryId,
        type: movementData.type,
        quantity: -quantity,
        reason: movementData.reason ?? null,
        referenceId: movementData.referenceId ?? null,
      },
    });
  }

  async reserveStock(data: {
    inventoryId: string;
    quantity: number;
    referenceId: string;
    referenceType: string;
    expiresAt?: Date | null;
  }): Promise<{ id: string }> {
    await this.getClient().inventoryLevel.update({
      where: { id: data.inventoryId },
      data: {
        availableQty: { decrement: data.quantity },
        reservedQty: { increment: data.quantity },
      },
    });

    const reservation = await this.getClient().inventoryReservation.create({
      data: {
        inventoryId: data.inventoryId,
        quantity: data.quantity,
        referenceId: data.referenceId,
        referenceType: data.referenceType,
        status: ReservationStatus.ACTIVE,
        expiresAt: data.expiresAt ?? null,
      },
    });

    await this.getClient().inventoryMovement.create({
      data: {
        inventoryId: data.inventoryId,
        type: MovementType.RESERVATION,
        quantity: data.quantity,
        referenceId: data.referenceId,
      },
    });

    return { id: reservation.id };
  }

  async releaseReservation(reservationId: string): Promise<any> {
    const reservation = await this.getClient().inventoryReservation.findUnique({
      where: { id: reservationId },
    });

    if (!reservation) {
      return null;
    }

    await this.getClient().inventoryReservation.update({
      where: { id: reservationId },
      data: {
        status: ReservationStatus.RELEASED,
      },
    });

    await this.getClient().inventoryLevel.update({
      where: { id: reservation.inventoryId },
      data: {
        availableQty: { increment: reservation.quantity },
        reservedQty: { decrement: reservation.quantity },
      },
    });

    await this.getClient().inventoryMovement.create({
      data: {
        inventoryId: reservation.inventoryId,
        type: MovementType.RELEASE,
        quantity: reservation.quantity,
        referenceId: reservation.referenceId,
      },
    });

    return reservation;
  }

  async commitReservation(reservationId: string): Promise<any> {
    const reservation = await this.getClient().inventoryReservation.findUnique({
      where: { id: reservationId },
    });

    if (!reservation) {
      return null;
    }

    await this.getClient().inventoryReservation.update({
      where: { id: reservationId },
      data: {
        status: ReservationStatus.COMMITTED,
      },
    });

    return reservation;
  }

  async findReservationByReference(
    referenceId: string,
    referenceType?: string,
  ): Promise<any | null> {
    const where: any = { referenceId };

    if (referenceType) {
      where.referenceType = referenceType;
    }

    return this.getClient().inventoryReservation.findFirst({
      where,
    });
  }

  async findReservationById(id: string): Promise<any | null> {
    return this.getClient().inventoryReservation.findUnique({
      where: { id },
    });
  }

  async getMovements(inventoryId: string, limit?: number): Promise<any[]> {
    return this.getClient().inventoryMovement.findMany({
      where: { inventoryId },
      orderBy: { createdAt: 'desc' },
      take: limit ?? 100,
    });
  }
}
