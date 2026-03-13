import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  Query,
  UseGuards,
} from '@nestjs/common';
import { InventoryService } from '../services/inventory.service';
import {
  AdjustStockDto,
  ReserveStockDto,
  ReleaseStockDto,
  CommitReservationDto,
} from '../dto';
import { StockSummaryView } from '../dto/views/stock-summary.view';
import { InventoryView } from '../dto/views/inventory.view';
import { MovementView } from '../dto/views/movement.view';
import { AuthGuard } from '../../auth/auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';

@Controller('inventory')
@UseGuards(AuthGuard, RolesGuard)
@Roles('admin', 'super_admin')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post('adjust')
  @HttpCode(HttpStatus.OK)
  async adjustStock(
    @Body() dto: AdjustStockDto,
  ): Promise<InventoryView> {
    const inventory = await this.inventoryService.adjustStock(
      dto.variantId,
      dto.warehouseId,
      dto.quantity,
      dto.reason,
    );

    return InventoryView.fromEntity(inventory);
  }

  @Post('reserve')
  @HttpCode(HttpStatus.OK)
  async reserveStock(
    @Body() dto: ReserveStockDto,
  ): Promise<InventoryView> {
    const inventory = await this.inventoryService.reserveStock(
      dto.variantId,
      dto.warehouseId,
      dto.quantity,
      dto.referenceId,
      dto.referenceType,
      dto.expiresAt ? new Date(dto.expiresAt) : undefined,
    );

    return InventoryView.fromEntity(inventory);
  }

  @Post('release')
  @HttpCode(HttpStatus.OK)
  async releaseReservation(
    @Body() dto: ReleaseStockDto,
  ): Promise<void> {
    await this.inventoryService.releaseReservation(
      dto.referenceId,
      dto.referenceType,
    );
  }

  @Post('commit')
  @HttpCode(HttpStatus.OK)
  async commitReservation(
    @Body() dto: CommitReservationDto,
  ): Promise<void> {
    await this.inventoryService.commitReservation(dto.referenceId);
  }

  @Get('variants/:variantId')
  async getVariantStockSummary(
    @Param('variantId') variantId: string,
  ): Promise<StockSummaryView> {
    const summary = await this.inventoryService.getVariantStockSummary(
      variantId,
    );
    return new StockSummaryView(summary);
  }

  @Get('variants/:variantId/sellable')
  async getSellableStock(
    @Param('variantId') variantId: string,
  ): Promise<{ sellable: number }> {
    const sellable = await this.inventoryService.getSellableStock(variantId);
    return { sellable };
  }

  @Get('variants/:variantId/warehouses/:warehouseId')
  async getWarehouseStock(
    @Param('variantId') variantId: string,
    @Param('warehouseId') warehouseId: string,
  ): Promise<InventoryView | null> {
    const inventory = await this.inventoryService.getWarehouseStock(
      variantId,
      warehouseId,
    );

    return inventory ? InventoryView.fromEntity(inventory) : null;
  }

  @Get('variants/:variantId/warehouses/:warehouseId/movements')
  async getWarehouseMovements(
    @Param('variantId') variantId: string,
    @Param('warehouseId') warehouseId: string,
    @Query('limit') limit?: string,
  ): Promise<MovementView[]> {
    const movements = await this.inventoryService.getWarehouseMovements(
      variantId,
      warehouseId,
      limit ? parseInt(limit, 10) : undefined,
    );

    return movements.map((m) => MovementView.fromEntity(m));
  }
}
