import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BaseService } from '@shared/domain';
import { INVENTORY_EVENTS } from '@shared/events';
import {
  OutOfStockError,
  WarehouseNotFoundError,
  InventoryLevelNotFoundError,
  ReservationNotFoundError,
  InvalidReservationStatusError,
} from '../domain/errors';
import { InventoryRepository, WarehouseRepository } from '../repositories';
import { MovementType, MovementReason, ReservationStatus } from '../entities';
import {
  StockAdjustedEvent,
  StockReservedEvent,
  StockReleasedEvent,
} from '../events';

@Injectable()
export class InventoryService extends BaseService {
  constructor(
    eventEmitter: EventEmitter2,
    private readonly inventoryRepo: InventoryRepository,
    private readonly warehouseRepo: WarehouseRepository,
  ) {
    super(eventEmitter);
  }

  async adjustStock(
    variantId: string,
    warehouseId: string,
    quantity: number,
    reason?: MovementReason,
  ): Promise<any> {
    const warehouse = await this.warehouseRepo.findById(warehouseId);
    if (!warehouse) {
      throw new WarehouseNotFoundError(warehouseId);
    }

    const inventory = await this.inventoryRepo.findInventoryLevel(
      variantId,
      warehouseId,
    );

    if (!inventory) {
      throw new InventoryLevelNotFoundError(`variant:${variantId},warehouse:${warehouseId}`);
    }

    const previousAvailable = inventory.availableQty;
    const movementReason = reason ?? MovementReason.MANUAL_ADJUSTMENT;

    if (quantity > 0) {
      await this.inventoryRepo.increaseStock(inventory.id, quantity, {
        type: MovementType.STOCK_IN,
        reason: movementReason,
      });
    } else if (quantity < 0) {
      const availableToDecrease = previousAvailable - inventory.safetyStock;
      const decreaseAmount = Math.abs(quantity);

      if (decreaseAmount > availableToDecrease) {
        throw new OutOfStockError(variantId, availableToDecrease, decreaseAmount);
      }

      await this.inventoryRepo.decreaseStock(inventory.id, decreaseAmount, {
        type: MovementType.STOCK_OUT,
        reason: movementReason,
      });
    }

    const updatedInventory = await this.inventoryRepo.findInventoryLevel(
      variantId,
      warehouseId,
    );

    this.emit(
      INVENTORY_EVENTS.STOCK_ADJUSTED,
      new StockAdjustedEvent(
        variantId,
        warehouseId,
        quantity,
        previousAvailable,
        updatedInventory!.availableQty,
        movementReason,
      ),
    );

    return updatedInventory;
  }

  async reserveStock(
    variantId: string,
    warehouseId: string,
    quantity: number,
    referenceId: string,
    referenceType: string,
    expiresAt?: Date,
  ): Promise<{ id: string }> {
    const warehouse = await this.warehouseRepo.findById(warehouseId);
    if (!warehouse) {
      throw new WarehouseNotFoundError(warehouseId);
    }

    const inventory = await this.inventoryRepo.findInventoryLevel(
      variantId,
      warehouseId,
    );

    if (!inventory) {
      throw new InventoryLevelNotFoundError(`variant:${variantId},warehouse:${warehouseId}`);
    }

    if (quantity > inventory.availableQty) {
      throw new OutOfStockError(variantId, inventory.availableQty, quantity);
    }

    const reservation = await this.inventoryRepo.reserveStock({
      inventoryId: inventory.id,
      quantity,
      referenceId,
      referenceType,
      expiresAt: expiresAt ?? null,
    });

    this.emit(
      INVENTORY_EVENTS.STOCK_RESERVED,
      new StockReservedEvent(
        variantId,
        warehouseId,
        quantity,
        referenceId,
        referenceType,
        expiresAt ?? null,
      ),
    );

    return reservation;
  }

  async releaseReservation(
    referenceId: string,
    referenceType?: string,
  ): Promise<void> {
    const reservation = await this.inventoryRepo.findReservationByReference(
      referenceId,
      referenceType,
    );

    if (!reservation) {
      throw new ReservationNotFoundError(referenceId, referenceType);
    }

    if (reservation.status !== ReservationStatus.ACTIVE) {
      throw new InvalidReservationStatusError(
        referenceId,
        reservation.status,
        'release',
      );
    }

    const inventory = await this.inventoryRepo.findInventoryLevelById(
      reservation.inventoryId,
    );

    if (!inventory) {
      throw new InventoryLevelNotFoundError(reservation.inventoryId);
    }

    await this.inventoryRepo.releaseReservation(reservation.id);

    this.emit(
      INVENTORY_EVENTS.STOCK_RELEASED,
      new StockReleasedEvent(
        inventory.variantId,
        inventory.warehouseId,
        reservation.quantity,
        referenceId,
        reservation.referenceType,
      ),
    );
  }

  async commitReservation(referenceId: string): Promise<void> {
    const reservation = await this.inventoryRepo.findReservationByReference(
      referenceId,
    );

    if (!reservation) {
      throw new ReservationNotFoundError(referenceId);
    }

    if (reservation.status !== ReservationStatus.ACTIVE) {
      throw new InvalidReservationStatusError(
        referenceId,
        reservation.status,
        'commit',
      );
    }

    await this.inventoryRepo.commitReservation(reservation.id);
  }

  async getAvailableStock(variantId: string): Promise<number> {
    const stock = await this.inventoryRepo.getVariantStock(variantId);
    return stock.available;
  }

  async getSellableStock(variantId: string): Promise<number> {
    const stock = await this.inventoryRepo.getVariantStock(variantId);
    return Math.max(0, stock.available - stock.safetyStock);
  }

  async getVariantStockSummary(variantId: string): Promise<{
    available: number;
    reserved: number;
    safetyStock: number;
    sellable: number;
  }> {
    const stock = await this.inventoryRepo.getVariantStock(variantId);
    return {
      available: stock.available,
      reserved: stock.reserved,
      safetyStock: stock.safetyStock,
      sellable: Math.max(0, stock.available - stock.safetyStock),
    };
  }

  async getWarehouseStock(
    variantId: string,
    warehouseId: string,
  ): Promise<any | null> {
    const warehouse = await this.warehouseRepo.findById(warehouseId);
    if (!warehouse) {
      throw new WarehouseNotFoundError(warehouseId);
    }

    const inventory = await this.inventoryRepo.findInventoryLevel(
      variantId,
      warehouseId,
    );

    if (!inventory) {
      return null;
    }

    return {
      variantId,
      warehouseId,
      warehouseName: warehouse.name,
      availableQty: inventory.availableQty,
      reservedQty: inventory.reservedQty,
      safetyStock: inventory.safetyStock,
      sellableQty: Math.max(0, inventory.availableQty - inventory.safetyStock),
      createdAt: inventory.createdAt,
      updatedAt: inventory.updatedAt,
    };
  }

  async getWarehouseMovements(
    variantId: string,
    warehouseId: string,
    limit?: number,
  ): Promise<any[]> {
    const inventory = await this.inventoryRepo.findInventoryLevel(
      variantId,
      warehouseId,
    );

    if (!inventory) {
      throw new InventoryLevelNotFoundError(`variant:${variantId},warehouse:${warehouseId}`);
    }

    return this.inventoryRepo.getMovements(inventory.id, limit);
  }
}
