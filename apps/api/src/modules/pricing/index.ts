// Pricing Module - Public API
//
// This module follows the Aggregate Boundary pattern:
// - Price is the aggregate root
// - PriceTier and Price are internal entities
// - Other modules should ONLY inject PricingService for business operations
// - Other modules can inject PriceRepository for read-only queries

// Module
export { PricingModule } from './pricing.module';

// Services
export { PricingService } from './services/pricing.service';

// Repositories (Public - read-only access)
export { PriceRepository } from './repositories/price.repository';

// Events
export * from './events';

// Domain Errors
export {
  CurrencyNotFoundError,
  VariantNotFoundError,
  InvalidPriceTierOrderError,
  PriceTierMustStartAtOneError,
  DuplicatePriceTierError,
  OverlappingPriceTiersError,
  InvalidUnitPriceError,
  PricingNotFoundError,
} from './domain/errors/pricing.errors';
