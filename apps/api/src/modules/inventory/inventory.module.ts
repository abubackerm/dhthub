import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { InventoryController, WarehouseController } from './controllers';
import { InventoryService, WarehouseService } from './services';
import { InventoryRepository, WarehouseRepository } from './repositories';

@Module({
  imports: [EventEmitterModule],
  controllers: [InventoryController, WarehouseController],
  providers: [
    InventoryService,
    WarehouseService,
    InventoryRepository,
    WarehouseRepository,
  ],
  exports: [
    InventoryService,
    WarehouseService,
    InventoryRepository,
    WarehouseRepository,
  ],
})
export class InventoryModule {}
