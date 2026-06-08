import { Module, forwardRef } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { BullModule } from '@nestjs/bullmq';
import { CatalogModule } from '@modules/catalog/catalog.module';
import { CellModule } from '@modules/cell/cell.module';
import { ImportModule } from '@modules/import/import.module';
import { CsvParserService } from '@modules/import/services/csv-parser.service';
import { AttributeDefinitionService } from './services/attribute-definition.service';
import { AttributeOptionService } from './services/attribute-option.service';
import { VariantAttributeService } from './services/variant-attribute.service';
import { UnitService } from './services/unit.service';
import { CategoryAttributeService } from './services/category-attribute.service';
import { AttributeImportService } from './services/attribute-import.service';
import { AttributeDefinitionRepository } from './repositories/attribute-definition.repository';
import { AttributeOptionRepository } from './repositories/attribute-option.repository';
import { VariantAttributeValueRepository } from './repositories/variant-attribute-value.repository';
import { UnitDefinitionRepository } from './repositories/unit-definition.repository';
import { CategoryAttributeRepository } from './repositories/category-attribute.repository';
import { AttributesController } from './controllers/attributes.controller';
import { UnitsController } from './controllers/units.controller';
import { CategoryAttributesController } from './controllers/category-attributes.controller';
import { VariantAttributesController } from './controllers/variant-attributes.controller';
import { AttributesWorkerController } from './controllers/attributes-worker.controller';
import { AttributeImportProcessorService } from './services/attribute-import-processor.service';

@Module({
  imports: [
    EventEmitterModule,
    BullModule.registerQueue({
      name: 'attribute-import',
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
    CatalogModule,
    CellModule,
    forwardRef(() => ImportModule),
  ],
  controllers: [
    AttributesController,
    UnitsController,
    CategoryAttributesController,
    VariantAttributesController,
    AttributesWorkerController,
  ],
  providers: [
    // Services
    AttributeDefinitionService,
    AttributeOptionService,
    VariantAttributeService,
    UnitService,
    CategoryAttributeService,
    AttributeImportService,
    AttributeImportProcessorService,
    CsvParserService,
    // Repositories
    AttributeDefinitionRepository,
    AttributeOptionRepository,
    VariantAttributeValueRepository,
    UnitDefinitionRepository,
    CategoryAttributeRepository,
  ],
  exports: [
    // Services (Public API)
    AttributeDefinitionService,
    AttributeOptionService,
    VariantAttributeService,
    UnitService,
    CategoryAttributeService,
    AttributeImportService,
    // Repositories (read-only for queries)
    AttributeDefinitionRepository,
    AttributeOptionRepository,
    CategoryAttributeRepository,
    VariantAttributeValueRepository,
    UnitDefinitionRepository,
  ],
})
export class CatalogAttributesModule {}
