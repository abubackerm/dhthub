import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ImportController } from './controllers/import.controller';
import { ImportService } from './services/import.service';
import { ImportJobService } from './services/import-job.service';
import { CsvParserService } from './services/csv-parser.service';
import { ImportValidationService } from './services/import-validation.service';
import { ImportProgressService } from './services/import-progress.service';
import { ImportJobRepository } from './repositories/import-job.repository';
import { ImportErrorRepository } from './repositories/import-error.repository';
import { CoreModule } from '@core/core.module';
import { CatalogModule } from '../catalog/catalog.module';
import { CatalogAttributesModule } from '../catalog-attributes/catalog-attributes.module';
import { PricingModule } from '../pricing/pricing.module';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [
    CoreModule,
    EventEmitterModule,
    // Import CatalogModule for ProductService, CategoryService, CategoryRepository
    CatalogModule,
    // Import CatalogAttributesModule for VariantAttributeService, AttributeDefinitionRepository
    CatalogAttributesModule,
    // Import PricingModule for PricingService, PriceRepository
    PricingModule,
    // Import InventoryModule for InventoryService, WarehouseRepository
    InventoryModule,
  ],
  controllers: [ImportController],
  providers: [
    // Services
    ImportService,
    ImportJobService,
    CsvParserService,
    ImportValidationService,
    ImportProgressService,
    // Repositories
    ImportJobRepository,
    ImportErrorRepository,
  ],
  exports: [
    ImportService,
    ImportJobService,
    ImportJobRepository,
    ImportErrorRepository,
  ],
})
export class ImportModule {}
