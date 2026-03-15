import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { CatalogModule } from '@modules/catalog/catalog.module';
import { CellModule } from '@modules/cell/cell.module';
import { AttributeDefinitionService } from './services/attribute-definition.service';
import { AttributeOptionService } from './services/attribute-option.service';
import { VariantAttributeService } from './services/variant-attribute.service';
import { UnitService } from './services/unit.service';
import { CategoryAttributeService } from './services/category-attribute.service';
import { AttributeDefinitionRepository } from './repositories/attribute-definition.repository';
import { AttributeOptionRepository } from './repositories/attribute-option.repository';
import { VariantAttributeValueRepository } from './repositories/variant-attribute-value.repository';
import { UnitDefinitionRepository } from './repositories/unit-definition.repository';
import { CategoryAttributeRepository } from './repositories/category-attribute.repository';
import { AttributesController } from './controllers/attributes.controller';
import { UnitsController } from './controllers/units.controller';
import { CategoryAttributesController } from './controllers/category-attributes.controller';
import { VariantAttributesController } from './controllers/variant-attributes.controller';

@Module({
  imports: [EventEmitterModule, CatalogModule, CellModule],
  controllers: [
    AttributesController,
    UnitsController,
    CategoryAttributesController,
    VariantAttributesController,
  ],
  providers: [
    // Services
    AttributeDefinitionService,
    AttributeOptionService,
    VariantAttributeService,
    UnitService,
    CategoryAttributeService,
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
    // Repositories (read-only for queries)
    AttributeDefinitionRepository,
    AttributeOptionRepository,
    CategoryAttributeRepository,
    VariantAttributeValueRepository,
    UnitDefinitionRepository,
  ],
})
export class CatalogAttributesModule {}
