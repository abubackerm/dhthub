import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { EventEmitterModule } from '@nestjs/event-emitter';

import { CatalogModule } from '@modules/catalog';
import { CatalogAttributesModule } from '@modules/catalog-attributes/catalog-attributes.module';
import { PricingModule } from '@modules/pricing';
import { InventoryModule } from '@modules/inventory';
import { DatabaseModule } from '@core/database';
import { CacheModule as CoreCacheModule } from '@core/cache';

import { SearchController } from './controllers/search.controller';
import { SearchService } from './services/search.service';
import { IndexerService } from './services/indexer.service';
import { VariantDocumentBuilder } from './services/document-builder.service';
import { SearchEventListenerService } from './services/search-event-listener.service';
import { MeiliClient } from './meilisearch/meili.client';

@Module({
  imports: [
    ConfigModule,
    EventEmitterModule.forRoot(),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 60,
    }]),
    DatabaseModule,
    CoreCacheModule,
    CatalogModule,
    CatalogAttributesModule,
    PricingModule,
    InventoryModule,
  ],
  controllers: [SearchController],
  providers: [
    MeiliClient,
    SearchService,
    IndexerService,
    VariantDocumentBuilder,
    SearchEventListenerService,
  ],
  exports: [
    SearchService,
    IndexerService,
    MeiliClient,
  ],
})
export class SearchModule {
  constructor(private readonly indexerService: IndexerService) {}

  async onModuleInit() {
    await this.indexerService.ensureIndex();
  }
}
