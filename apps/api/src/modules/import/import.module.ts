import { Module, forwardRef } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { BullModule } from '@nestjs/bullmq';
import { ImportController } from './controllers/import.controller';
import { ImportWorkerController } from './controllers/import-worker.controller';
import { ImportService } from './services/import.service';
import { ImportJobService } from './services/import-job.service';
import { CsvParserService } from './services/csv-parser.service';
import { ImportValidationService } from './services/import-validation.service';
import { ImportProgressService } from './services/import-progress.service';
import { ImportProcessorService } from './services/import-processor.service';
import { CatalogImportProcessorService } from './services/catalog-import-processor.service';
import { CategoryImportProcessorService } from './services/category-import-processor.service';
import { ImageImportProcessorService } from './services/image-import-processor.service';
import { SimpleProductImportProcessorService } from './services/simple-product-import-processor.service';
import { SimpleProductImportService } from './services/simple-product-import.service';
import { CatalogImportService } from './services/catalog-import.service';
import { TemplatePackService } from './services/template-pack.service';
import { ZipExtractorService } from './services/zip-extractor.service';
import { CategoryImportService } from './services/category-import.service';
import { ImageImportService } from './services/image-import.service';
import { ImportJobRepository } from './repositories/import-job.repository';
import { ImportErrorRepository } from './repositories/import-error.repository';
import { CoreModule } from '@core/core.module';
import { CatalogModule } from '../catalog/catalog.module';
import { CellModule } from '../cell/cell.module';
import { CatalogAttributesModule } from '../catalog-attributes/catalog-attributes.module';
import { PricingModule } from '../pricing/pricing.module';
import { InventoryModule } from '../inventory/inventory.module';
import { StorageModule } from '../storage/storage.module';
import { AuditModule } from '@shared/audit';
import { SearchModule } from '../search/search.module';

@Module({
  imports: [
    CoreModule,
    EventEmitterModule,
    AuditModule,
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6380', 10),
        password: process.env.REDIS_PASSWORD || undefined,
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
      },
    }),
    BullModule.registerQueue({
      name: 'catalog-import',
      defaultJobOptions: {
        removeOnComplete: {
          count: 100,
          age: 3600,
        },
        removeOnFail: {
          count: 500,
          age: 7 * 24 * 3600,
        },
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      },
    }),
    BullModule.registerQueue({
      name: 'image-processing',
      defaultJobOptions: {
        removeOnComplete: {
          count: 100,
          age: 3600,
        },
        removeOnFail: {
          count: 500,
          age: 7 * 24 * 3600,
        },
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      },
    }),
    BullModule.registerQueue({
      name: 'category-import',
      defaultJobOptions: {
        removeOnComplete: {
          count: 100,
          age: 3600,
        },
        removeOnFail: {
          count: 500,
          age: 7 * 24 * 3600,
        },
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      },
    }),
    BullModule.registerQueue({
      name: 'simple-product-import',
      defaultJobOptions: {
        removeOnComplete: {
          count: 100,
          age: 3600,
        },
        removeOnFail: {
          count: 500,
          age: 7 * 24 * 3600,
        },
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      },
    }),
    StorageModule,
    // Import CatalogModule for ProductService, CategoryService, CategoryRepository
    CatalogModule,
    // Import CellModule for CellRepository
    CellModule,
    // Import CatalogAttributesModule for VariantAttributeService, AttributeDefinitionRepository
    forwardRef(() => CatalogAttributesModule),
    // Import PricingModule for PricingService, PriceRepository
    PricingModule,
    // Import InventoryModule for InventoryService, WarehouseRepository
    InventoryModule,
    // Import SearchModule for IndexerService (bulk search indexing after import)
    forwardRef(() => SearchModule),
  ],
  controllers: [ImportController, ImportWorkerController],
  providers: [
    // Services
    ImportService,
    ImportJobService,
    ImportProcessorService,
    CatalogImportProcessorService,
    CategoryImportProcessorService,
    ImageImportProcessorService,
    SimpleProductImportProcessorService,
    SimpleProductImportService,
    CatalogImportService,
    CsvParserService,
    ImportValidationService,
    ImportProgressService,
    TemplatePackService,
    ZipExtractorService,
    CategoryImportService,
    ImageImportService,
    // Repositories
    ImportJobRepository,
    ImportErrorRepository,
  ],
  exports: [
    ImportService,
    ImportJobService,
    ImportJobRepository,
    ImportErrorRepository,
    CsvParserService,
    ImportProgressService,
    ZipExtractorService,
    ImageImportService,
    CategoryImportService,
    SimpleProductImportProcessorService,
    SimpleProductImportService,
  ],
})
export class ImportModule {}
