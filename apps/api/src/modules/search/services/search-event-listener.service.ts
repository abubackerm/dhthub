import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { IndexerService } from './indexer.service';
import { CATALOG_EVENTS } from '@shared/events/event-constants';
import {
  ProductVariantCreatedEvent,
  ProductVariantUpdatedEvent,
  ProductVariantDeletedEvent,
} from '@modules/catalog/events';
import { PricingCreatedEvent, PricingUpdatedEvent } from '@modules/pricing/events';
import { StockAdjustedEvent, StockReservedEvent, StockReleasedEvent } from '@modules/inventory/events';

@Injectable()
export class SearchEventListenerService implements OnModuleInit {
  private readonly logger = new Logger(SearchEventListenerService.name);

  constructor(private readonly indexerService: IndexerService) {}

  async onModuleInit() {
    this.logger.log('Search event listener initialized');
  }

  @OnEvent(CATALOG_EVENTS.PRODUCT_VARIANT_CREATED)
  async handleVariantCreated(event: ProductVariantCreatedEvent) {
    this.logger.debug(`Handling variant created event: ${event.variantId}`);
    try {
      await this.indexerService.indexVariant(event.variantId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to index variant ${event.variantId}: ${errorMessage}`);
    }
  }

  @OnEvent(CATALOG_EVENTS.PRODUCT_VARIANT_UPDATED)
  async handleVariantUpdated(event: ProductVariantUpdatedEvent) {
    this.logger.debug(`Handling variant updated event: ${event.variantId}`);
    try {
      await this.indexerService.updateVariant(event.variantId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to update variant ${event.variantId}: ${errorMessage}`);
    }
  }

  @OnEvent(CATALOG_EVENTS.PRODUCT_VARIANT_DELETED)
  async handleVariantDeleted(event: ProductVariantDeletedEvent) {
    this.logger.debug(`Handling variant deleted event: ${event.variantId}`);
    try {
      await this.indexerService.deleteVariant(event.variantId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to delete variant ${event.variantId}: ${errorMessage}`);
    }
  }

  @OnEvent('pricing.created')
  async handlePricingCreated(event: PricingCreatedEvent) {
    this.logger.debug(`Handling pricing created event for variant: ${event.variantId}`);
    try {
      await this.indexerService.updateVariant(event.variantId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to update variant ${event.variantId}: ${errorMessage}`);
    }
  }

  @OnEvent('pricing.updated')
  async handlePricingUpdated(event: PricingUpdatedEvent) {
    this.logger.debug(`Handling pricing updated event for variant: ${event.variantId}`);
    try {
      await this.indexerService.updateVariant(event.variantId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to update variant ${event.variantId}: ${errorMessage}`);
    }
  }

  @OnEvent('inventory.stock.adjusted')
  async handleStockAdjusted(event: StockAdjustedEvent) {
    this.logger.debug(`Handling stock adjusted event for variant: ${event.variantId}`);
    try {
      await this.indexerService.updateVariant(event.variantId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to update variant ${event.variantId}: ${errorMessage}`);
    }
  }

  @OnEvent('inventory.stock.reserved')
  async handleStockReserved(event: StockReservedEvent) {
    this.logger.debug(`Handling stock reserved event for variant: ${event.variantId}`);
    try {
      await this.indexerService.updateVariant(event.variantId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to update variant ${event.variantId}: ${errorMessage}`);
    }
  }

  @OnEvent('inventory.stock.released')
  async handleStockReleased(event: StockReleasedEvent) {
    this.logger.debug(`Handling stock released event for variant: ${event.variantId}`);
    try {
      await this.indexerService.updateVariant(event.variantId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to update variant ${event.variantId}: ${errorMessage}`);
    }
  }
}
