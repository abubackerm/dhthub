import { Test, TestingModule } from '@nestjs/testing';
import { PriceRepository } from './price.repository';

describe('PriceRepository', () => {
  let repository: PriceRepository;
  let mockDb: any;

  beforeEach(async () => {
    mockDb = {
      currency: {
        findUnique: jest.fn(),
      },
      price: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        delete: jest.fn(),
      },
      priceTier: {
        createMany: jest.fn(),
        deleteMany: jest.fn(),
        findFirst: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PriceRepository,
        {
          provide: 'DatabaseProvider',
          useValue: mockDb,
        },
      ],
    }).compile();

    repository = module.get<PriceRepository>(PriceRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createPrice', () => {
    it('should create a price record', async () => {
      const mockPrice = { id: 'price-1', variantId: 'variant-1', currencyId: 'currency-1' };
      mockDb.price.create.mockResolvedValue(mockPrice);

      const result = await repository.createPrice('variant-1', 'currency-1');

      expect(result).toEqual(mockPrice);
      expect(mockDb.price.create).toHaveBeenCalledWith({
        data: {
          variantId: 'variant-1',
          currencyId: 'currency-1',
        },
      });
    });
  });

  describe('addPriceTiers', () => {
    it('should bulk insert price tiers', async () => {
      const tiers = [
        { minQty: 1, maxQty: 9, unitPrice: 0.42 },
        { minQty: 10, maxQty: 49, unitPrice: 0.31 },
      ];

      await repository.addPriceTiers('price-1', tiers);

      expect(mockDb.priceTier.createMany).toHaveBeenCalledWith({
        data: [
          { priceId: 'price-1', minQty: 1, maxQty: 9, unitPrice: 0.42 },
          { priceId: 'price-1', minQty: 10, maxQty: 49, unitPrice: 0.31 },
        ],
      });
    });
  });

  describe('replacePriceTiers', () => {
    it('should delete and recreate tiers in transaction', async () => {
      const tiers = [
        { minQty: 1, maxQty: 9, unitPrice: 0.42 },
        { minQty: 10, maxQty: 49, unitPrice: 0.31 },
      ];

      await repository.replacePriceTiers('price-1', tiers);

      expect(mockDb.priceTier.deleteMany).toHaveBeenCalledWith({
        where: { priceId: 'price-1' },
      });

      expect(mockDb.priceTier.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          { priceId: 'price-1', minQty: 1, maxQty: 9, unitPrice: 0.42 },
          { priceId: 'price-1', minQty: 10, maxQty: 49, unitPrice: 0.31 },
        ]),
      });
    });
  });

  describe('findPriceForVariantCurrency', () => {
    it('should find price with currency and tiers', async () => {
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

      mockDb.price.findUnique.mockResolvedValue(mockPrice);

      const result = await repository.findPriceForVariantCurrency('variant-1', 'USD');

      expect(result).toEqual(mockPrice);
      expect(mockDb.price.findUnique).toHaveBeenCalledWith({
        where: {
          variantId_currencyId: {
            variantId: 'variant-1',
            currencyId: 'USD',
          },
        },
        include: {
          currency: true,
          tiers: {
            orderBy: { minQty: 'asc' },
          },
        },
      });
    });

    it('should return null if price not found', async () => {
      mockDb.price.findUnique.mockResolvedValue(null);

      const result = await repository.findPriceForVariantCurrency('variant-1', 'USD');

      expect(result).toBeNull();
    });
  });

  describe('getPriceForQuantity', () => {
    it('should find applicable tier for quantity', async () => {
      const mockPrice = {
        id: 'price-1',
        variantId: 'variant-1',
        currencyId: 'currency-1',
      };

      const mockTier = { id: 'tier-2', minQty: 10, maxQty: 49, unitPrice: 0.31 };

      mockDb.price.findUnique.mockResolvedValue(mockPrice);
      mockDb.priceTier.findFirst.mockResolvedValue(mockTier);

      const result = await repository.getPriceForQuantity('variant-1', 'USD', 25);

      expect(result).toEqual({ price: mockPrice, tier: mockTier });
      expect(mockDb.priceTier.findFirst).toHaveBeenCalledWith({
        where: {
          priceId: 'price-1',
          minQty: { lte: 25 },
        },
        orderBy: { minQty: 'desc' },
      });
    });

    it('should return null if price not found', async () => {
      mockDb.price.findUnique.mockResolvedValue(null);

      const result = await repository.getPriceForQuantity('variant-1', 'USD', 25);

      expect(result).toBeNull();
    });
  });
});
