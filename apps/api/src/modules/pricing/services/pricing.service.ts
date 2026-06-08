import { Injectable, Optional } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BaseService } from '@shared/domain/base.service';
import {
  CurrencyNotFoundError,
  VariantNotFoundError,
  InvalidPriceTierOrderError,
  PriceTierMustStartAtOneError,
  DuplicatePriceTierError,
  OverlappingPriceTiersError,
  InvalidUnitPriceError,
  PricingNotFoundError,
} from '../domain/errors/pricing.errors';
import { PriceRepository } from '../repositories/price.repository';
import { PricingCreatedEvent } from '../events/pricing-created.event';
import { PricingUpdatedEvent } from '../events/pricing-updated.event';

interface PriceTierInput {
  minQty: number;
  maxQty: number | null;
  unitPrice: number;
}

@Injectable()
export class PricingService extends BaseService {
  constructor(
    eventEmitter: EventEmitter2,
    private readonly priceRepo: PriceRepository,
    @Optional() private readonly variantRepo?: any,
  ) {
    super(eventEmitter);
  }

  private validateTiers(tiers: PriceTierInput[]): void {
    if (tiers.length === 0) {
      throw new InvalidPriceTierOrderError();
    }

    // Check if tiers are sorted by minQty
    for (let i = 1; i < tiers.length; i++) {
      if (tiers[i].minQty <= tiers[i - 1].minQty) {
        throw new InvalidPriceTierOrderError();
      }
    }

    // Check if first tier starts at 1
    if (tiers[0].minQty !== 1) {
      throw new PriceTierMustStartAtOneError();
    }

    // Check for duplicate minQty values
    const minQtyValues = tiers.map((t) => t.minQty);
    const uniqueMinQtyValues = new Set(minQtyValues);
    if (minQtyValues.length !== uniqueMinQtyValues.size) {
      throw new DuplicatePriceTierError(tiers[0].minQty);
    }

    // Check for overlapping ranges
    for (let i = 0; i < tiers.length - 1; i++) {
      const currentTier = tiers[i];
      const nextTier = tiers[i + 1];

      if (currentTier.maxQty !== null && currentTier.maxQty >= nextTier.minQty) {
        throw new OverlappingPriceTiersError();
      }
    }

    // Validate unit prices are positive
    for (const tier of tiers) {
      if (tier.unitPrice <= 0) {
        throw new InvalidUnitPriceError();
      }
    }
  }

  private async ensureVariantExists(variantId: string): Promise<void> {
    if (this.variantRepo) {
      const variant = await this.variantRepo.findById(variantId);
      if (!variant) {
        throw new VariantNotFoundError(variantId);
      }
    }
  }

  private async ensureCurrencyExists(currencyCode: string): Promise<void> {
    const currency = await this.priceRepo.findCurrencyByCode(currencyCode);
    if (!currency) {
      throw new CurrencyNotFoundError(currencyCode);
    }
  }

  async createVariantPricing(
    variantId: string,
    currencyCode: string,
    tiers: PriceTierInput[],
    _userId?: string,
  ): Promise<any> {
    await this.ensureVariantExists(variantId);
    await this.ensureCurrencyExists(currencyCode);

    this.validateTiers(tiers);

    // Check if pricing already exists
    const existingPricing = await this.priceRepo.findPriceForVariantCurrency(
      variantId,
      currencyCode,
    );

    if (existingPricing) {
      throw new DuplicatePriceTierError(existingPricing.id);
    }

    const currency = await this.priceRepo.findCurrencyByCode(currencyCode);
    const price = await this.priceRepo.createPrice(
      variantId,
      currency!.id,
    );

    await this.priceRepo.addPriceTiers(price.id, tiers);

    // Emit domain event
    this.emit('pricing.created', new PricingCreatedEvent(
      price.id,
      variantId,
      currencyCode,
      tiers.length,
    ));

    // Cache invalidation hook (Phase 10)
    this.invalidateCache(variantId);

    return this.priceRepo.findPriceForVariantCurrency(
      variantId,
      currencyCode,
    );
  }

  async replaceVariantPricing(
    variantId: string,
    currencyCode: string,
    tiers: PriceTierInput[],
    _userId?: string,
  ): Promise<any> {
    await this.ensureVariantExists(variantId);
    await this.ensureCurrencyExists(currencyCode);

    this.validateTiers(tiers);

    const existingPricing = await this.priceRepo.findPriceForVariantCurrency(
      variantId,
      currencyCode,
    );

    if (!existingPricing) {
      // Create new pricing if it doesn't exist
      return this.createVariantPricing(
        variantId,
        currencyCode,
        tiers,
        _userId,
      );
    }

    // Replace tiers in transaction
    await this.priceRepo.replacePriceTiers(existingPricing.id, tiers);

    // Emit domain event
    this.emit('pricing.updated', new PricingUpdatedEvent(
      existingPricing.id,
      variantId,
      currencyCode,
      tiers.length,
    ));

    // Cache invalidation hook (Phase 10)
    this.invalidateCache(variantId);

    return this.priceRepo.findPriceForVariantCurrency(
      variantId,
      currencyCode,
    );
  }

  async getVariantPricing(
    variantId: string,
    currencyCode: string,
  ): Promise<any | null> {
    return this.priceRepo.findPriceForVariantCurrency(
      variantId,
      currencyCode,
    );
  }

  async getPriceForQuantity(
    variantId: string,
    currencyCode: string,
    quantity: number,
  ): Promise<any | null> {
    const result = await this.priceRepo.getPriceForQuantity(
      variantId,
      currencyCode,
      quantity,
    );

    if (!result) {
      return null;
    }

    const { price, tier } = result;

    if (!tier) {
      return null;
    }

    // Verify quantity falls within tier range
    if (tier.maxQty !== null && quantity > tier.maxQty) {
      return null;
    }

    return {
      priceId: price.id,
      variantId: price.variantId,
      currencyCode: price.currency.code,
      currencySymbol: price.currency.symbol,
      decimals: price.currency.decimals,
      unitPrice: Number(tier.unitPrice),
      totalPrice: Number(tier.unitPrice) * quantity,
      tierMinQty: tier.minQty,
      tierMaxQty: tier.maxQty,
      quantity,
    };
  }

  async getVariantPriceForCart(
    variantId: string,
    qty: number,
    currencyCode: string,
  ): Promise<any> {
    const result = await this.getPriceForQuantity(
      variantId,
      currencyCode,
      qty,
    );

    if (!result) {
      throw new PricingNotFoundError(variantId, currencyCode);
    }

    return result;
  }

  private invalidateCache(_variantId: string): void {
    // Cache invalidation hook placeholder for Phase 10
    // When Redis caching is implemented, this will invalidate:
    // this.cache?.invalidate(`variant:${_variantId}:pricing`)
  }
}
