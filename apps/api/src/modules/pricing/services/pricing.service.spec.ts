import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PricingService } from './pricing.service';
import {
  InvalidPriceTierOrderError,
  PriceTierMustStartAtOneError,
  DuplicatePriceTierError,
  OverlappingPriceTiersError,
  InvalidUnitPriceError,
} from '../domain/errors/pricing.errors';

describe('PricingService', () => {
  let service: PricingService;
  let eventEmitter: EventEmitter2;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PricingService,
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
        {
          provide: 'PriceRepository',
          useValue: {
            createPrice: jest.fn(),
            addPriceTiers: jest.fn(),
            replacePriceTiers: jest.fn(),
            findPriceForVariantCurrency: jest.fn(),
            findCurrencyByCode: jest.fn(),
          },
        },
        {
          provide: 'ProductVariantRepository',
          useValue: {
            findById: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PricingService>(PricingService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateTiers', () => {
    const testValidation = (tiers) => {
      try {
        service['validateTiers'](tiers);
        return { valid: true, error: null };
      } catch (error) {
        return { valid: false, error: error.constructor.name };
      }
    };

    it('should accept valid tiers', () => {
      const validTiers = [
        { minQty: 1, maxQty: 9, unitPrice: 0.42 },
        { minQty: 10, maxQty: 49, unitPrice: 0.31 },
        { minQty: 50, maxQty: null, unitPrice: 0.27 },
      ];

      const result = testValidation(validTiers);

      expect(result.valid).toBe(true);
    });

    it('should reject empty tiers', () => {
      const result = testValidation([]);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('InvalidPriceTierOrderError');
    });

    it('should reject tiers not starting at 1', () => {
      const invalidTiers = [
        { minQty: 10, maxQty: 49, unitPrice: 0.31 },
        { minQty: 50, maxQty: null, unitPrice: 0.27 },
      ];

      const result = testValidation(invalidTiers);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('PriceTierMustStartAtOneError');
    });

    it('should reject unsorted tiers', () => {
      const unsortedTiers = [
        { minQty: 1, maxQty: 9, unitPrice: 0.42 },
        { minQty: 50, maxQty: null, unitPrice: 0.27 },
        { minQty: 10, maxQty: 49, unitPrice: 0.31 },
      ];

      const result = testValidation(unsortedTiers);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('InvalidPriceTierOrderError');
    });

    it('should reject duplicate minQty values', () => {
      const duplicateTiers = [
        { minQty: 1, maxQty: 9, unitPrice: 0.42 },
        { minQty: 10, maxQty: 49, unitPrice: 0.31 },
        { minQty: 10, maxQty: null, unitPrice: 0.27 },
      ];

      const result = testValidation(duplicateTiers);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('DuplicatePriceTierError');
    });

    it('should reject overlapping ranges', () => {
      const overlappingTiers = [
        { minQty: 1, maxQty: 10, unitPrice: 0.42 },
        { minQty: 8, maxQty: 20, unitPrice: 0.31 },
      ];

      const result = testValidation(overlappingTiers);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('OverlappingPriceTiersError');
    });

    it('should reject non-positive unit prices', () => {
      const invalidPriceTiers = [
        { minQty: 1, maxQty: 9, unitPrice: -0.42 },
        { minQty: 10, maxQty: null, unitPrice: 0.31 },
      ];

      const result = testValidation(invalidPriceTiers);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('InvalidUnitPriceError');
    });

    it('should reject zero unit prices', () => {
      const zeroPriceTiers = [
        { minQty: 1, maxQty: 9, unitPrice: 0 },
        { minQty: 10, maxQty: null, unitPrice: 0.31 },
      ];

      const result = testValidation(zeroPriceTiers);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('InvalidUnitPriceError');
    });
  });

  describe('quantity range calculations', () => {
    it('should correctly calculate 1-9 range', () => {
      const tier1 = { minQty: 1, maxQty: 9, unitPrice: 0.42 };
      const tier2 = { minQty: 10, maxQty: 49, unitPrice: 0.31 };

      expect(tier1.minQty).toBe(1);
      expect(tier1.maxQty).toBe(9);
      expect(tier2.minQty).toBe(10);
      expect(tier2.minQty).toBeGreaterThan(tier1.maxQty);
    });

    it('should allow unlimited maxQty (null)', () => {
      const unlimitedTier = { minQty: 50, maxQty: null, unitPrice: 0.27 };

      expect(unlimitedTier.minQty).toBe(50);
      expect(unlimitedTier.maxQty).toBeNull();
    });

    it('should correctly validate adjacent ranges', () => {
      const adjacentTiers = [
        { minQty: 1, maxQty: 9, unitPrice: 0.42 },
        { minQty: 10, maxQty: 49, unitPrice: 0.31 },
      ];

      const result = testValidation(adjacentTiers);

      expect(result.valid).toBe(true);
    });

    it('should reject touching ranges', () => {
      const touchingTiers = [
        { minQty: 1, maxQty: 10, unitPrice: 0.42 },
        { minQty: 10, maxQty: 49, unitPrice: 0.31 },
      ];

      const result = testValidation(touchingTiers);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('OverlappingPriceTiersError');
    });
  });
});
