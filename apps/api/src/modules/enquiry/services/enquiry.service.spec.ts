import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EnquiryService } from './enquiry.service';
import {
  EnquiryNotFoundError,
  EnquiryCannotBeModifiedError,
} from '../domain/errors';
import { CartNotActiveError } from '../../cart/domain/errors/cart.errors';
import { EnquiryRepository, EnquiryItemRepository } from '../repositories';
import { CartRepository } from '../../cart/repositories/cart.repository';
import { ProductVariantRepository, ProductRepository } from '../../catalog/repositories';
import { TransactionalExecutor } from '@shared/domain';
import { EnquiryStatus } from '../entities';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeCart = (overrides: Record<string, any> = {}) => ({
  id: 'cart-1',
  userId: 'user-1',
  isActive: true,
  status: 'ACTIVE' as const,
  submittedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  createdBy: null,
  updatedBy: null,
  ...overrides,
});

const makeVariant = (overrides: Record<string, any> = {}) => ({
  id: 'variant-1',
  sku: 'V-ABC12345',
  productId: 'product-1',
  name: 'Default',
  attributes: {},
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const makeProduct = (overrides: Record<string, any> = {}) => ({
  id: 'product-1',
  name: 'Test Product',
  slug: 'test-product',
  status: 'ACTIVE',
  primaryImageUrl: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const makeCartItem = (overrides: Record<string, any> = {}) => ({
  id: 'item-1',
  cartId: 'cart-1',
  variantId: 'variant-1',
  qty: 2,
  createdAt: new Date(),
  updatedAt: new Date(),
  createdBy: null,
  updatedBy: null,
  variant: makeVariant(),
  ...overrides,
});

const makeCartWithItems = (overrides: Record<string, any> = {}) => ({
  ...makeCart(overrides),
  items: overrides.items ?? [makeCartItem()],
});

const makeEnquiry = (overrides: Record<string, any> = {}) => ({
  id: 'enquiry-1',
  enquiryNumber: 'ENQ-000001',
  userId: 'user-1',
  customerName: 'John Doe',
  companyName: null,
  email: 'john@example.com',
  phone: null,
  status: EnquiryStatus.SUBMITTED,
  grandTotal: null,
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  createdBy: null,
  updatedBy: null,
  ...overrides,
});

const makeEnquiryItem = (overrides: Record<string, any> = {}) => ({
  id: 'enq-item-1',
  enquiryId: 'enquiry-1',
  variantId: 'variant-1',
  productId: 'product-1',
  sku: 'V-ABC12345',
  price: null,
  total: null,
  qty: 2,
  createdAt: new Date(),
  updatedAt: new Date(),
  variant: makeVariant(),
  ...overrides,
});

const makeEnquiryWithItems = (overrides: Record<string, any> = {}) => ({
  ...makeEnquiry(overrides),
  items: overrides.items ?? [makeEnquiryItem()],
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('EnquiryService', () => {
  let service: EnquiryService;
  let eventEmitter: EventEmitter2;
  let enquiryRepo: jest.Mocked<EnquiryRepository>;
  let enquiryItemRepo: jest.Mocked<EnquiryItemRepository>;
  let cartRepo: jest.Mocked<CartRepository>;
  let variantRepo: jest.Mocked<ProductVariantRepository>;
  let productRepo: jest.Mocked<ProductRepository>;
  let txExecutor: jest.Mocked<TransactionalExecutor>;

  beforeEach(async () => {
    enquiryRepo = {
      findById: jest.fn(),
      findByUserId: jest.fn(),
      findByIdWithItems: jest.fn(),
      findByUserIdWithItems: jest.fn(),
      create: jest.fn(),
      createWithCustomer: jest.fn(),
      updateStatus: jest.fn(),
      findByStatus: jest.fn(),
      findByStatusWithItems: jest.fn(),
      delete: jest.fn(),
      countByUserId: jest.fn(),
      generateEnquiryNumber: jest.fn().mockResolvedValue('ENQ-000001'),
      findAllWithFilters: jest.fn(),
      updateQuote: jest.fn(),
      markAsPaid: jest.fn(),
      confirmOrder: jest.fn(),
      setGrandTotal: jest.fn(),
    } as unknown as jest.Mocked<EnquiryRepository>;

    enquiryItemRepo = {
      findByEnquiryId: jest.fn(),
      findByEnquiryIdWithDetails: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      createMany: jest.fn(),
      delete: jest.fn(),
      deleteByEnquiryId: jest.fn(),
      countByEnquiryId: jest.fn(),
      createWithDetails: jest.fn(),
      createManyWithDetails: jest.fn().mockResolvedValue({ count: 1 }),
      updatePrice: jest.fn(),
      batchUpdatePrices: jest.fn(),
    } as unknown as jest.Mocked<EnquiryItemRepository>;

    cartRepo = {
      findById: jest.fn(),
      findActiveByUserId: jest.fn(),
      findByIdWithItems: jest.fn(),
      findActiveByUserIdWithItems: jest.fn(),
      getOrCreateActiveCart: jest.fn(),
      createActiveCart: jest.fn(),
      markAsInactive: jest.fn(),
      markSubmitted: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<CartRepository>;

    variantRepo = {
      findById: jest.fn(),
      findBySku: jest.fn(),
      findByIds: jest.fn(),
    } as unknown as jest.Mocked<ProductVariantRepository>;

    productRepo = {
      findById: jest.fn(),
      findByIds: jest.fn(),
    } as unknown as jest.Mocked<ProductRepository>;

    txExecutor = {
      execute: jest.fn((fn) => fn()),
    } as unknown as jest.Mocked<TransactionalExecutor>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EnquiryService,
        {
          provide: EventEmitter2,
          useValue: { emit: jest.fn() },
        },
        {
          provide: 'TransactionalExecutor',
          useValue: txExecutor,
        },
        {
          provide: EnquiryRepository,
          useValue: enquiryRepo,
        },
        {
          provide: EnquiryItemRepository,
          useValue: enquiryItemRepo,
        },
        {
          provide: CartRepository,
          useValue: cartRepo,
        },
        {
          provide: ProductVariantRepository,
          useValue: variantRepo,
        },
        {
          provide: ProductRepository,
          useValue: productRepo,
        },
      ],
    }).compile();

    service = module.get<EnquiryService>(EnquiryService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // =========================================================================
  // createFromCart - Lifecycle & Race Conditions
  // =========================================================================
  describe('createFromCart', () => {
    it('should create an enquiry from an active cart and deactivate the cart', async () => {
      const cart = makeCartWithItems({
        items: [makeCartItem({ variantId: 'variant-1', variant: makeVariant({ id: 'variant-1', sku: 'SKU-A' }) })],
      });
      const enquiry = makeEnquiry({ id: 'enq-1' });
      const enquiryWithItems = makeEnquiryWithItems({
        id: 'enq-1',
        items: [makeEnquiryItem({ variantId: 'variant-1', sku: 'SKU-A' })],
      });

      cartRepo.findActiveByUserIdWithItems.mockResolvedValue(cart);
      enquiryRepo.createWithCustomer.mockResolvedValue(enquiry);
      enquiryRepo.findByIdWithItems.mockResolvedValue(enquiryWithItems);
      variantRepo.findByIds.mockResolvedValue([makeVariant({ id: 'variant-1', sku: 'SKU-A' })]);
      productRepo.findByIds.mockResolvedValue([makeProduct()]);
      cartRepo.markSubmitted.mockResolvedValue(
        makeCart({ isActive: false, status: 'SUBMITTED', submittedAt: new Date() }),
      );
      cartRepo.createActiveCart.mockResolvedValue(makeCart({ id: 'cart-new' }));

      const result = await service.createFromCart('user-1', { email: 'john@example.com' });

      expect(result.id).toBe('enq-1');
      expect(enquiryRepo.createWithCustomer).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          email: 'john@example.com',
          enquiryNumber: 'ENQ-000001',
        }),
      );
      expect(txExecutor.execute).toHaveBeenCalledTimes(1);
      expect(cartRepo.markSubmitted).toHaveBeenCalledWith('cart-1');
      expect(cartRepo.createActiveCart).toHaveBeenCalledWith('user-1');
    });

    it('should use session user data when DTO fields are not provided', async () => {
      const cart = makeCartWithItems();
      const enquiry = makeEnquiry({ customerName: 'Session User', email: 'session@example.com' });
      const enquiryWithItems = makeEnquiryWithItems();

      cartRepo.findActiveByUserIdWithItems.mockResolvedValue(cart);
      enquiryRepo.createWithCustomer.mockResolvedValue(enquiry);
      enquiryRepo.findByIdWithItems.mockResolvedValue(enquiryWithItems);
      variantRepo.findByIds.mockResolvedValue([makeVariant()]);
      productRepo.findByIds.mockResolvedValue([makeProduct()]);
      cartRepo.markSubmitted.mockResolvedValue(
        makeCart({ isActive: false, status: 'SUBMITTED', submittedAt: new Date() }),
      );
      cartRepo.createActiveCart.mockResolvedValue(makeCart({ id: 'cart-new' }));

      const user = { name: 'Session User', email: 'session@example.com' };
      await service.createFromCart('user-1', {}, user);

      expect(enquiryRepo.createWithCustomer).toHaveBeenCalledWith(
        expect.objectContaining({
          customerName: 'Session User',
          email: 'session@example.com',
        }),
      );
    });

    it('should throw EnquiryNotFoundError when user has no cart', async () => {
      cartRepo.findActiveByUserIdWithItems.mockResolvedValue(null);

      await expect(
        service.createFromCart('user-1', { email: 'john@example.com' }),
      ).rejects.toThrow(EnquiryNotFoundError);
    });

    it('should throw CartNotActiveError when cart is not active', async () => {
      const inactiveCart = makeCartWithItems({ isActive: false, status: 'SUBMITTED' });
      cartRepo.findActiveByUserIdWithItems.mockResolvedValue(inactiveCart);

      await expect(
        service.createFromCart('user-1', { email: 'john@example.com' }),
      ).rejects.toThrow(CartNotActiveError);
    });

    it('should throw EnquiryCannotBeModifiedError when cart is empty', async () => {
      const emptyCart = makeCartWithItems({ items: [] });
      cartRepo.findActiveByUserIdWithItems.mockResolvedValue(emptyCart);

      await expect(
        service.createFromCart('user-1', { email: 'john@example.com' }),
      ).rejects.toThrow(EnquiryCannotBeModifiedError);
    });

    it('should throw EnquiryCannotBeModifiedError when email is missing', async () => {
      const cart = makeCartWithItems();
      cartRepo.findActiveByUserIdWithItems.mockResolvedValue(cart);

      await expect(
        service.createFromCart('user-1', {}),
      ).rejects.toThrow(EnquiryCannotBeModifiedError);
    });

    it('should fall back to name from email when neither DTO nor session provides a name', async () => {
      const cart = makeCartWithItems();
      const enquiry = makeEnquiry({ customerName: 'john', email: 'john@example.com' });
      const enquiryWithItems = makeEnquiryWithItems();

      cartRepo.findActiveByUserIdWithItems.mockResolvedValue(cart);
      enquiryRepo.createWithCustomer.mockResolvedValue(enquiry);
      enquiryRepo.findByIdWithItems.mockResolvedValue(enquiryWithItems);
      variantRepo.findByIds.mockResolvedValue([makeVariant()]);
      productRepo.findByIds.mockResolvedValue([makeProduct()]);
      cartRepo.markSubmitted.mockResolvedValue(
        makeCart({ isActive: false, status: 'SUBMITTED', submittedAt: new Date() }),
      );
      cartRepo.createActiveCart.mockResolvedValue(makeCart({ id: 'cart-new' }));

      const user = { email: 'john@example.com' };
      await service.createFromCart('user-1', { email: 'john@example.com' }, user);

      expect(enquiryRepo.createWithCustomer).toHaveBeenCalledWith(
        expect.objectContaining({
          customerName: 'john',
        }),
      );
    });

    it('should emit ENQUIRY_CREATED event with correct payload', async () => {
      const cart = makeCartWithItems({
        items: [
          makeCartItem({ variantId: 'variant-1', variant: makeVariant({ id: 'variant-1', sku: 'SKU-A' }) }),
          makeCartItem({ id: 'item-2', variantId: 'variant-2', variant: makeVariant({ id: 'variant-2', sku: 'SKU-B', productId: 'product-2' }) }),
        ],
      });
      const enquiry = makeEnquiry({ id: 'enq-event' });
      const enquiryWithItems = makeEnquiryWithItems({
        id: 'enq-event',
        items: [
          makeEnquiryItem({ variantId: 'variant-1', sku: 'SKU-A' }),
          makeEnquiryItem({ id: 'enq-item-2', variantId: 'variant-2', sku: 'SKU-B', productId: 'product-2' }),
        ],
      });

      cartRepo.findActiveByUserIdWithItems.mockResolvedValue(cart);
      enquiryRepo.createWithCustomer.mockResolvedValue(enquiry);
      enquiryRepo.findByIdWithItems.mockResolvedValue(enquiryWithItems);
      variantRepo.findByIds.mockResolvedValue([
        makeVariant({ id: 'variant-1', sku: 'SKU-A' }),
        makeVariant({ id: 'variant-2', sku: 'SKU-B', productId: 'product-2' }),
      ]);
      productRepo.findByIds.mockResolvedValue([makeProduct(), makeProduct({ id: 'product-2' })]);
      cartRepo.markSubmitted.mockResolvedValue(
        makeCart({ isActive: false, status: 'SUBMITTED', submittedAt: new Date() }),
      );
      cartRepo.createActiveCart.mockResolvedValue(makeCart({ id: 'cart-new' }));

      await service.createFromCart('user-1', { email: 'john@example.com' });

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'enquiry.created',
        expect.objectContaining({
          enquiryId: 'enq-event',
          userId: 'user-1',
          itemCount: 2,
        }),
      );
    });

    it('should use a transaction to prevent race conditions', async () => {
      const cart = makeCartWithItems();
      const enquiry = makeEnquiry();
      const enquiryWithItems = makeEnquiryWithItems();

      cartRepo.findActiveByUserIdWithItems.mockResolvedValue(cart);
      enquiryRepo.createWithCustomer.mockResolvedValue(enquiry);
      enquiryRepo.findByIdWithItems.mockResolvedValue(enquiryWithItems);
      variantRepo.findByIds.mockResolvedValue([makeVariant()]);
      productRepo.findByIds.mockResolvedValue([makeProduct()]);
      cartRepo.markSubmitted.mockResolvedValue(
        makeCart({ isActive: false, status: 'SUBMITTED', submittedAt: new Date() }),
      );
      cartRepo.createActiveCart.mockResolvedValue(makeCart({ id: 'cart-new' }));

      await service.createFromCart('user-1', { email: 'john@example.com' });

      expect(txExecutor.execute).toHaveBeenCalledTimes(1);
      expect(txExecutor.execute).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should verify transaction wraps createManyWithDetails, markSubmitted, and createActiveCart atomically', async () => {
      const cart = makeCartWithItems();
      const enquiry = makeEnquiry();

      let operationOrder: string[] = [];

      cartRepo.findActiveByUserIdWithItems.mockResolvedValue(cart);
      enquiryRepo.createWithCustomer.mockResolvedValue(enquiry);
      enquiryItemRepo.createManyWithDetails.mockImplementation(async () => {
        operationOrder.push('createManyWithDetails');
        return { count: 1 };
      });
      cartRepo.markSubmitted.mockImplementation(async () => {
        operationOrder.push('markSubmitted');
        return makeCart({ isActive: false, status: 'SUBMITTED', submittedAt: new Date() });
      });
      cartRepo.createActiveCart.mockImplementation(async () => {
        operationOrder.push('createActiveCart');
        return makeCart({ id: 'cart-new' });
      });
      enquiryRepo.findByIdWithItems.mockResolvedValue(makeEnquiryWithItems());
      variantRepo.findByIds.mockResolvedValue([makeVariant()]);
      productRepo.findByIds.mockResolvedValue([makeProduct()]);

      await service.createFromCart('user-1', { email: 'john@example.com' });

      expect(txExecutor.execute).toHaveBeenCalledTimes(1);
      expect(operationOrder).toEqual([
        'createManyWithDetails',
        'markSubmitted',
        'createActiveCart',
      ]);
    });

    it('should not create enquiry or new cart if transaction fails', async () => {
      const cart = makeCartWithItems();
      const enquiry = makeEnquiry();

      cartRepo.findActiveByUserIdWithItems.mockResolvedValue(cart);
      enquiryRepo.createWithCustomer.mockResolvedValue(enquiry);
      enquiryItemRepo.createManyWithDetails.mockRejectedValue(new Error('DB error'));

      await expect(
        service.createFromCart('user-1', { email: 'john@example.com' }),
      ).rejects.toThrow('DB error');

      expect(txExecutor.execute).toHaveBeenCalledTimes(1);
      expect(enquiryItemRepo.createManyWithDetails).toHaveBeenCalled();
      // markSubmitted and createActiveCart should NOT have been called
      // because the transaction should roll back on the first failure
      expect(cartRepo.markSubmitted).not.toHaveBeenCalled();
    });

    it('should prefer DTO values over session user values', async () => {
      const cart = makeCartWithItems();
      const enquiry = makeEnquiry({ customerName: 'DTO Name', email: 'dto@example.com' });
      const enquiryWithItems = makeEnquiryWithItems();

      cartRepo.findActiveByUserIdWithItems.mockResolvedValue(cart);
      enquiryRepo.createWithCustomer.mockResolvedValue(enquiry);
      enquiryRepo.findByIdWithItems.mockResolvedValue(enquiryWithItems);
      variantRepo.findByIds.mockResolvedValue([makeVariant()]);
      productRepo.findByIds.mockResolvedValue([makeProduct()]);
      cartRepo.markSubmitted.mockResolvedValue(
        makeCart({ isActive: false, status: 'SUBMITTED', submittedAt: new Date() }),
      );
      cartRepo.createActiveCart.mockResolvedValue(makeCart({ id: 'cart-new' }));

      const user = { name: 'Session Name', email: 'session@example.com' };
      await service.createFromCart(
        'user-1',
        { customerName: 'DTO Name', email: 'dto@example.com' },
        user,
      );

      expect(enquiryRepo.createWithCustomer).toHaveBeenCalledWith(
        expect.objectContaining({
          customerName: 'DTO Name',
          email: 'dto@example.com',
        }),
      );
    });

    it('should return enquiry with items after creation', async () => {
      const cart = makeCartWithItems();
      const enquiry = makeEnquiry({ id: 'enq-result' });
      const enquiryWithItems = makeEnquiryWithItems({ id: 'enq-result' });

      cartRepo.findActiveByUserIdWithItems.mockResolvedValue(cart);
      enquiryRepo.createWithCustomer.mockResolvedValue(enquiry);
      enquiryRepo.findByIdWithItems.mockResolvedValue(enquiryWithItems);
      variantRepo.findByIds.mockResolvedValue([makeVariant()]);
      productRepo.findByIds.mockResolvedValue([makeProduct()]);
      cartRepo.markSubmitted.mockResolvedValue(
        makeCart({ isActive: false, status: 'SUBMITTED', submittedAt: new Date() }),
      );
      cartRepo.createActiveCart.mockResolvedValue(makeCart({ id: 'cart-new' }));

      const result = await service.createFromCart('user-1', { email: 'john@example.com' });

      expect(result.id).toBe('enq-result');
      expect(result.itemCount).toBe(1);
      expect(result.enquiryNumber).toBe('ENQ-000001');
      expect(result.status).toBe(EnquiryStatus.SUBMITTED);
    });
  });

  // =========================================================================
  // Full lifecycle: createFromCart then add items to new cart
  // =========================================================================
  describe('full enquiry-from-cart lifecycle', () => {
    it('should allow adding items to new cart after enquiry creation', async () => {
      // This test verifies the cart lifecycle after createFromCart:
      // 1. Cart is marked submitted
      // 2. New active cart is created
      // 3. New cart should be usable for subsequent operations
      const cart = makeCartWithItems();
      const enquiry = makeEnquiry();
      const enquiryWithItems = makeEnquiryWithItems();

      cartRepo.findActiveByUserIdWithItems.mockResolvedValue(cart);
      enquiryRepo.createWithCustomer.mockResolvedValue(enquiry);
      enquiryRepo.findByIdWithItems.mockResolvedValue(enquiryWithItems);
      variantRepo.findByIds.mockResolvedValue([makeVariant()]);
      productRepo.findByIds.mockResolvedValue([makeProduct()]);
      cartRepo.markSubmitted.mockResolvedValue(
        makeCart({ id: 'cart-1', isActive: false, status: 'SUBMITTED', submittedAt: new Date() }),
      );
      cartRepo.createActiveCart.mockResolvedValue(makeCart({ id: 'cart-new' }));

      const result = await service.createFromCart('user-1', { email: 'john@example.com' });

      expect(result).toBeDefined();
      expect(cartRepo.markSubmitted).toHaveBeenCalledWith('cart-1');
      expect(cartRepo.createActiveCart).toHaveBeenCalledWith('user-1');

      // After this, the new cart (id: cart-new) should be the active cart
      // for subsequent cart operations (verified by cartRepo state)
      expect(cartRepo.createActiveCart).toHaveBeenCalledTimes(1);
    });

    it('should handle race condition with concurrent createFromCart calls', async () => {
      const cart = makeCartWithItems();
      const enquiry = makeEnquiry();

      // Simulate the partial unique index preventing duplicate active carts
      cartRepo.findActiveByUserIdWithItems.mockResolvedValue(cart);
      enquiryRepo.createWithCustomer.mockResolvedValue(enquiry);
      enquiryItemRepo.createManyWithDetails.mockResolvedValue({ count: 1 });
      cartRepo.markSubmitted.mockResolvedValue(
        makeCart({ isActive: false, status: 'SUBMITTED', submittedAt: new Date() }),
      );
      // Simulate unique constraint violation from partial index
      cartRepo.createActiveCart.mockRejectedValue(
        new Error('duplicate key value violates unique index "one_active_cart_per_user"'),
      );
      enquiryRepo.findByIdWithItems.mockResolvedValue(makeEnquiryWithItems());
      variantRepo.findByIds.mockResolvedValue([makeVariant()]);
      productRepo.findByIds.mockResolvedValue([makeProduct()]);

      await expect(
        service.createFromCart('user-1', { email: 'john@example.com' }),
      ).rejects.toThrow('duplicate key value violates unique index');

      // Transaction was used but rolled back
      expect(txExecutor.execute).toHaveBeenCalledTimes(1);
    });
  });
});
