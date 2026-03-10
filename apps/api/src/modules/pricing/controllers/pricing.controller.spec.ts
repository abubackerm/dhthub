import { Test, TestingModule } from '@nestjs/testing';
import { PricingController } from './pricing.controller';
import { PricingService } from '../services/pricing.service';

describe('PricingController', () => {
  let controller: PricingController;
  let service: PricingService;

  const mockPrice = {
    id: 'price-1',
    variantId: 'variant-1',
    currencyId: 'currency-1',
    currency: { code: 'USD', symbol: '$', decimals: 2 },
    tiers: [
      { id: 'tier-1', minQty: 1, maxQty: 9, unitPrice: 0.42 },
      { id: 'tier-2', minQty: 10, maxQty: 49, unitPrice: 0.31 },
    ],
  };

  const mockPricingResult = {
    priceId: 'price-1',
    variantId: 'variant-1',
    currencyCode: 'USD',
    currencySymbol: '$',
    decimals: 2,
    unitPrice: 0.31,
    totalPrice: 7.75,
    tierMinQty: 10,
    tierMaxQty: 49,
    quantity: 25,
  };

  beforeEach(async () => {
    const mockPricingService = {
      createVariantPricing: jest.fn().mockResolvedValue(mockPrice),
      replaceVariantPricing: jest.fn().mockResolvedValue(mockPrice),
      getVariantPricing: jest.fn().mockResolvedValue(mockPrice),
      getPriceForQuantity: jest.fn().mockResolvedValue(mockPricingResult),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PricingController],
      providers: [
        {
          provide: PricingService,
          useValue: mockPricingService,
        },
      ],
    }).compile();

    controller = module.get<PricingController>(PricingController);
    service = module.get<PricingService>(PricingService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createVariantPricing', () => {
    it('should create pricing for variant', async () => {
      const dto = {
        currency: 'USD',
        tiers: [
          { minQty: 1, maxQty: 9, unitPrice: 0.42 },
          { minQty: 10, maxQty: 49, unitPrice: 0.31 },
        ],
      };

      const result = await controller.createVariantPricing('variant-1', dto);

      expect(service.createVariantPricing).toHaveBeenCalledWith(
        'variant-1',
        'USD',
        dto.tiers,
      );
      expect(result).toBeDefined();
      expect(result.currency).toBe('USD');
    });
  });

  describe('replaceVariantPricing', () => {
    it('should replace pricing for variant', async () => {
      const dto = {
        currency: 'USD',
        tiers: [
          { minQty: 1, maxQty: 9, unitPrice: 0.45 },
          { minQty: 10, maxQty: 49, unitPrice: 0.35 },
        ],
      };

      const result = await controller.replaceVariantPricing('variant-1', dto);

      expect(service.replaceVariantPricing).toHaveBeenCalledWith(
        'variant-1',
        'USD',
        dto.tiers,
      );
      expect(result).toBeDefined();
    });
  });

  describe('getVariantPricing', () => {
    it('should return pricing for variant', async () => {
      const result = await controller.getVariantPricing('variant-1', 'USD');

      expect(service.getVariantPricing).toHaveBeenCalledWith('variant-1', 'USD');
      expect(result).toBeDefined();
      expect(result.currency).toBe('USD');
      expect(result.tiers).toHaveLength(2);
    });
  });

  describe('getPriceForQuantity', () => {
    it('should calculate price for quantity', async () => {
      const query = { currency: 'USD', qty: 25 };

      const result = await controller.getPriceForQuantity('variant-1', query);

      expect(service.getPriceForQuantity).toHaveBeenCalledWith('variant-1', 'USD', 25);
      expect(result).toBeDefined();
      expect(result.unitPrice).toBe(0.31);
      expect(result.totalPrice).toBe(7.75);
      expect(result.tierMinQty).toBe(10);
      expect(result.tierMaxQty).toBe(49);
    });
  });
});
