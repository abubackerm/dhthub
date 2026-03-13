import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { WarehouseService } from '../services/warehouse.service';
import { CreateWarehouseDto, UpdateWarehouseDto } from '../dto';
import { WarehouseView } from '../dto/views/warehouse.view';
import { AuthGuard } from '../../auth/auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';

@Controller('inventory/warehouses')
@UseGuards(AuthGuard, RolesGuard)
@Roles('admin', 'super_admin')
export class WarehouseController {
  constructor(private readonly warehouseService: WarehouseService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createWarehouse(
    @Body() dto: CreateWarehouseDto,
  ): Promise<WarehouseView> {
    const warehouse = await this.warehouseService.createWarehouse(
      dto.name,
      dto.code,
      dto.location,
    );

    return WarehouseView.fromEntity(warehouse);
  }

  @Get()
  async getWarehouses(): Promise<WarehouseView[]> {
    const warehouses = await this.warehouseService.getWarehouses();
    return warehouses.map((w) => WarehouseView.fromEntity(w));
  }

  @Get(':id')
  async getWarehouse(
    @Param('id') id: string,
  ): Promise<WarehouseView> {
    const warehouse = await this.warehouseService.getWarehouse(id);
    return WarehouseView.fromEntity(warehouse);
  }

  @Put(':id')
  async updateWarehouse(
    @Param('id') id: string,
    @Body() dto: UpdateWarehouseDto,
  ): Promise<WarehouseView> {
    const warehouse = await this.warehouseService.updateWarehouse(id, dto);
    return WarehouseView.fromEntity(warehouse);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteWarehouse(
    @Param('id') id: string,
  ): Promise<void> {
    await this.warehouseService.deleteWarehouse(id);
  }
}
