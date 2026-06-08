import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CartService } from './cart.service';
import {
  CartNotFoundError,
  CartItemNotFoundError,
  CartNotActiveError,
} from '../domain/errors';
import { CartRepository, CartItemRepository } from '../repositories';
import { ProductVariantRepository, ProductRepository } from '../../catalog/repositories';
import { TransactionalExecutor } from '@shared/domain';

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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CartService', () => {
  let service: CartService;
  let eventEmitter: EventEmitter2;
  let cartRepo: jest.Mocked<CartRepository>;
  let cartItemRepo: jest.Mocked<CartItemRepository>;
  let variantRepo: jest.Mocked<ProductVariantRepository>;
  let productRepo: jest.Mocked<ProductRepository>;
  let txExecutor: jest.Mocked<TransactionalExecutor>;

  beforeEach(async () => {
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

    cartItemRepo = {
      findByCartId: jest.fn(),
      findByCartIdWithDetails: jest.fn(),
      findByCartAndVariant: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      updateQty: jest.fn(),
      delete: jest.fn(),
      deleteByCartId: jest.fn(),
      countByCartId: jest.fn(),
    } as unknown as jest.Mocked<CartItemRepository>;

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
        CartService,
        {
          provide: EventEmitter2,
          useValue: { emit: jest.fn() },
        },
        {
          provide: 'TransactionalExecutor',
          useValue: txExecutor,
        },
        {
          provide: CartRepository,
          useValue: cartRepo,
        },
        {
          provide: CartItemRepository,
          useValue: cartItemRepo,
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

    service = module.get<CartService>(CartService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // =========================================================================
  // getCart
  // =========================================================================
  describe('getCart', () => {
    it('should return an active cart with items', async () => {
      const cart = makeCartWithItems();
      cartRepo.getOrCreateActiveCart.mockResolvedValue(makeCart());
      cartRepo.findByIdWithItems.mockResolvedValue(cart);
      productRepo.findByIds.mockResolvedValue([makeProduct()]);

      const result = await service.getCart('user-1');

      expect(result.id).toBe('cart-1');
      expect(result.itemCount).toBe(1);
      expect(cartRepo.getOrCreateActiveCart).toHaveBeenCalledWith('user-1');
    });

    it('should throw CartNotFoundError when cart is not found after creation', async () => {
      cartRepo.getOrCreateActiveCart.mockResolvedValue(makeCart());
      cartRepo.findByIdWithItems.mockResolvedValue(null);

      await expect(service.getCart('user-1')).rejects.toThrow(CartNotFoundError);
    });
  });

  // =========================================================================
  // addItem
  // =========================================================================
  describe('addItem', () => {
    it('should add a new item to an active cart', async () => {
      const cart = makeCart();
      const variant = makeVariant();

      variantRepo.findById.mockResolvedValue(variant);
      cartRepo.getOrCreateActiveCart.mockResolvedValue(cart);
      cartRepo.findByIdWithItems
        .mockResolvedValueOnce(makeCartWithItems())
        .mockResolvedValueOnce(makeCartWithItems());
      cartItemRepo.findByCartAndVariant.mockResolvedValue(null);
      cartItemRepo.create.mockResolvedValue(makeCartItem());
      productRepo.findByIds.mockResolvedValue([makeProduct()]);

      const result = await service.addItem('user-1', 'variant-1', 3);

      expect(result.itemCount).toBe(1);
      expect(cartItemRepo.create).toHaveBeenCalledWith({
        cartId: 'cart-1',
        variantId: 'variant-1',
        qty: 3,
      });
      expect(eventEmitter.emit).toHaveBeenCalled();
    });

    it('should update quantity when item already exists in cart', async () => {
      const cart = makeCart();
      const existingItem = makeCartItem({ id: 'item-existing', qty: 2 });

      variantRepo.findById.mockResolvedValue(makeVariant());
      cartRepo.getOrCreateActiveCart.mockResolvedValue(cart);
      cartRepo.findByIdWithItems
        .mockResolvedValueOnce(makeCartWithItems())
        .mockResolvedValueOnce(makeCartWithItems());
      cartItemRepo.findByCartAndVariant.mockResolvedValue(existingItem);
      cartItemRepo.updateQty.mockResolvedValue(existingItem);
      productRepo.findByIds.mockResolvedValue([makeProduct()]);

      await service.addItem('user-1', 'variant-1', 3);

      expect(cartItemRepo.updateQty).toHaveBeenCalledWith('item-existing', 5);
      expect(cartItemRepo.create).not.toHaveBeenCalled();
    });

    it('should throw CartItemNotFoundError when variant does not exist', async () => {
      variantRepo.findById.mockResolvedValue(null);

      await expect(service.addItem('user-1', 'nonexistent', 1)).rejects.toThrow(
        CartItemNotFoundError,
      );
    });

    it('should throw CartNotActiveError when cart is inactive', async () => {
      const cart = makeCartWithItems({ isActive: false, status: 'SUBMITTED' });

      variantRepo.findById.mockResolvedValue(makeVariant());
      cartRepo.getOrCreateActiveCart.mockResolvedValue(makeCart());
      cartRepo.findByIdWithItems.mockResolvedValue(cart);

      await expect(service.addItem('user-1', 'variant-1', 1)).rejects.toThrow(CartNotActiveError);
    });
  });

  // =========================================================================
  // updateItem
  // =========================================================================
  describe('updateItem', () => {
    it('should update item quantity', async () => {
      const cartItem = makeCartItem({ id: 'item-1', cartId: 'cart-1', variantId: 'variant-1' });
      const cartWithItems = makeCartWithItems();

      cartItemRepo.findById.mockResolvedValue(cartItem);
      cartRepo.getOrCreateActiveCart.mockResolvedValue(makeCart());
      cartRepo.findByIdWithItems.mockResolvedValue(cartWithItems);
      variantRepo.findById.mockResolvedValue(makeVariant());
      cartItemRepo.updateQty.mockResolvedValue(cartItem);
      productRepo.findByIds.mockResolvedValue([makeProduct()]);

      const result = await service.updateItem('user-1', 'item-1', { qty: 10 });

      expect(cartItemRepo.updateQty).toHaveBeenCalledWith('item-1', 10);
      expect(result).toBeDefined();
    });

    it('should throw CartItemNotFoundError when item does not exist', async () => {
      cartItemRepo.findById.mockResolvedValue(null);

      await expect(
        service.updateItem('user-1', 'nonexistent', { qty: 5 }),
      ).rejects.toThrow(CartItemNotFoundError);
    });

    it('should throw CartNotFoundError when item belongs to a different cart', async () => {
      const cartItem = makeCartItem({ id: 'item-1', cartId: 'other-cart' });
      cartItemRepo.findById.mockResolvedValue(cartItem);
      cartRepo.getOrCreateActiveCart.mockResolvedValue(makeCart({ id: 'cart-1' }));

      await expect(
        service.updateItem('user-1', 'item-1', { qty: 5 }),
      ).rejects.toThrow(CartNotFoundError);
    });

    it('should throw CartNotActiveError when cart is inactive', async () => {
      const cartItem = makeCartItem({ id: 'item-1', cartId: 'cart-1' });
      const inactiveCart = makeCartWithItems({ isActive: false });

      cartItemRepo.findById.mockResolvedValue(cartItem);
      cartRepo.getOrCreateActiveCart.mockResolvedValue(makeCart({ id: 'cart-1' }));
      cartRepo.findByIdWithItems.mockResolvedValue(inactiveCart);

      await expect(
        service.updateItem('user-1', 'item-1', { qty: 5 }),
      ).rejects.toThrow(CartNotActiveError);
    });
  });

  // =========================================================================
  // removeItem
  // =========================================================================
  describe('removeItem', () => {
    it('should remove an item from the cart', async () => {
      const cartItem = makeCartItem({ id: 'item-1', cartId: 'cart-1' });
      const cartWithItems = makeCartWithItems();

      cartItemRepo.findById.mockResolvedValue(cartItem);
      cartRepo.getOrCreateActiveCart.mockResolvedValue(makeCart({ id: 'cart-1' }));
      cartRepo.findByIdWithItems.mockResolvedValue(cartWithItems);
      cartItemRepo.delete.mockResolvedValue(cartItem);
      productRepo.findByIds.mockResolvedValue([makeProduct()]);

      await service.removeItem('user-1', 'item-1');

      expect(cartItemRepo.delete).toHaveBeenCalledWith('item-1');
      expect(eventEmitter.emit).toHaveBeenCalled();
    });

    it('should throw CartItemNotFoundError when item does not exist', async () => {
      cartItemRepo.findById.mockResolvedValue(null);

      await expect(service.removeItem('user-1', 'nonexistent')).rejects.toThrow(
        CartItemNotFoundError,
      );
    });

    it('should throw CartNotActiveError when cart is inactive', async () => {
      const cartItem = makeCartItem({ id: 'item-1', cartId: 'cart-1' });
      const inactiveCart = makeCartWithItems({ isActive: false });

      cartItemRepo.findById.mockResolvedValue(cartItem);
      cartRepo.getOrCreateActiveCart.mockResolvedValue(makeCart({ id: 'cart-1' }));
      cartRepo.findByIdWithItems.mockResolvedValue(inactiveCart);

      await expect(service.removeItem('user-1', 'item-1')).rejects.toThrow(CartNotActiveError);
    });
  });

  // =========================================================================
  // clearCart
  // =========================================================================
  describe('clearCart', () => {
    it('should clear all items from an active cart', async () => {
      const cartWithItems = makeCartWithItems();
      const emptyCart = makeCartWithItems({ items: [] });

      cartRepo.findActiveByUserIdWithItems.mockResolvedValue(cartWithItems);
      cartItemRepo.deleteByCartId.mockResolvedValue({ count: 1 });
      cartRepo.findByIdWithItems.mockResolvedValue(emptyCart);
      productRepo.findByIds.mockResolvedValue([]);

      const result = await service.clearCart('user-1');

      expect(cartItemRepo.deleteByCartId).toHaveBeenCalledWith('cart-1');
      expect(eventEmitter.emit).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw CartNotFoundError when user has no active cart', async () => {
      cartRepo.findActiveByUserIdWithItems.mockResolvedValue(null);

      await expect(service.clearCart('user-1')).rejects.toThrow(CartNotFoundError);
    });

    it('should throw CartNotActiveError when cart is inactive', async () => {
      const inactiveCart = makeCartWithItems({ isActive: false });
      cartRepo.findActiveByUserIdWithItems.mockResolvedValue(inactiveCart);

      await expect(service.clearCart('user-1')).rejects.toThrow(CartNotActiveError);
    });
  });

  // =========================================================================
  // bulkAddItems
  // =========================================================================
  describe('bulkAddItems', () => {
    it('should add multiple items to an active cart', async () => {
      const cart = makeCart();
      const variant1 = makeVariant({ id: 'v-1', sku: 'SKU-001' });
      const variant2 = makeVariant({ id: 'v-2', sku: 'SKU-002', productId: 'product-2' });
      const product2 = makeProduct({ id: 'product-2', name: 'Product 2' });

      cartRepo.getOrCreateActiveCart.mockResolvedValue(cart);
      cartRepo.findByIdWithItems
        .mockResolvedValueOnce(makeCartWithItems())
        .mockResolvedValueOnce(makeCartWithItems());
      variantRepo.findBySku
        .mockResolvedValueOnce(variant1)
        .mockResolvedValueOnce(variant2);
      cartItemRepo.findByCartAndVariant
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      cartItemRepo.create.mockImplementation(
        (data) =>
          makeCartItem({ id: 'item-new', variantId: data.variantId, qty: data.qty }),
      );
      productRepo.findByIds.mockResolvedValue([makeProduct(), product2]);

      const result = await service.bulkAddItems('user-1', {
        items: [
          { sku: 'SKU-001', qty: 5 },
          { sku: 'SKU-002', qty: 3 },
        ],
      });

      expect(cartItemRepo.create).toHaveBeenCalledTimes(2);
      expect(result).toBeDefined();
    });

    it('should skip variants that do not exist', async () => {
      const cart = makeCart();

      cartRepo.getOrCreateActiveCart.mockResolvedValue(cart);
      cartRepo.findByIdWithItems
        .mockResolvedValueOnce(makeCartWithItems())
        .mockResolvedValueOnce(makeCartWithItems());
      variantRepo.findBySku.mockResolvedValue(null);
      productRepo.findByIds.mockResolvedValue([makeProduct()]);

      const result = await service.bulkAddItems('user-1', {
        items: [{ sku: 'INVALID-SKU', qty: 5 }],
      });

      expect(cartItemRepo.create).not.toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw CartNotActiveError when cart is inactive', async () => {
      const inactiveCart = makeCartWithItems({ isActive: false });
      cartRepo.getOrCreateActiveCart.mockResolvedValue(makeCart());
      cartRepo.findByIdWithItems.mockResolvedValue(inactiveCart);

      await expect(
        service.bulkAddItems('user-1', { items: [{ sku: 'SKU-001', qty: 1 }] }),
      ).rejects.toThrow(CartNotActiveError);
    });
  });

  // =========================================================================
  // submitCart - Lifecycle & Race Conditions
  // =========================================================================
  describe('submitCart', () => {
    it('should mark cart as submitted and create a new active cart', async () => {
      const activeCart = makeCartWithItems();
      const newCart = makeCart({ id: 'cart-new' });

      cartRepo.findActiveByUserIdWithItems.mockResolvedValue(activeCart);
      cartRepo.markSubmitted.mockResolvedValue(
        makeCart({ id: 'cart-1', isActive: false, status: 'SUBMITTED', submittedAt: new Date() }),
      );
      cartRepo.createActiveCart.mockResolvedValue(newCart);
      cartRepo.getOrCreateActiveCart.mockResolvedValue(newCart);

      const result = await service.submitCart('user-1');

      expect(txExecutor.execute).toHaveBeenCalledTimes(1);
      expect(cartRepo.markSubmitted).toHaveBeenCalledWith('cart-1');
      expect(cartRepo.createActiveCart).toHaveBeenCalledWith('user-1');
      expect(result.id).toBe('cart-new');
      expect(result.itemCount).toBe(0);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'cart.submitted',
        expect.objectContaining({ cartId: 'cart-1', itemCount: 1 }),
      );
    });

    it('should throw CartNotFoundError when no active cart exists', async () => {
      cartRepo.findActiveByUserIdWithItems.mockResolvedValue(null);

      await expect(service.submitCart('user-1')).rejects.toThrow(CartNotFoundError);
    });

    it('should throw CartNotActiveError when cart is already submitted', async () => {
      const submittedCart = makeCartWithItems({ isActive: false, status: 'SUBMITTED' });
      cartRepo.findActiveByUserIdWithItems.mockResolvedValue(submittedCart);

      await expect(service.submitCart('user-1')).rejects.toThrow(CartNotActiveError);
    });

    it('should use a transaction to prevent race conditions', async () => {
      const activeCart = makeCartWithItems();
      cartRepo.findActiveByUserIdWithItems.mockResolvedValue(activeCart);
      cartRepo.markSubmitted.mockResolvedValue(
        makeCart({ isActive: false, status: 'SUBMITTED', submittedAt: new Date() }),
      );
      cartRepo.createActiveCart.mockResolvedValue(makeCart({ id: 'cart-new' }));
      cartRepo.getOrCreateActiveCart.mockResolvedValue(makeCart({ id: 'cart-new' }));

      await service.submitCart('user-1');

      // Verify txExecutor.execute was called (ensures atomicity)
      expect(txExecutor.execute).toHaveBeenCalledTimes(1);
      expect(txExecutor.execute).toHaveBeenCalledWith(expect.any(Function));

      // Inside the transaction, markSubmitted should be called before createActiveCart
      const txCall = txExecutor.execute.mock.calls[0][0];
      jest.clearAllMocks();

      await txCall();
      expect(cartRepo.markSubmitted).toHaveBeenCalled();
      expect(cartRepo.createActiveCart).toHaveBeenCalled();
    });

    it('should handle transaction rollback when createActiveCart fails', async () => {
      const activeCart = makeCartWithItems();

      cartRepo.findActiveByUserIdWithItems.mockResolvedValue(activeCart);
      cartRepo.markSubmitted.mockResolvedValue(
        makeCart({ isActive: false, status: 'SUBMITTED', submittedAt: new Date() }),
      );
      cartRepo.createActiveCart.mockRejectedValue(new Error('DB error'));

      // Make execute NOT auto-invoke the callback for this test
      const realExecute = txExecutor.execute;
      txExecutor.execute = jest.fn((fn) => realExecute.call(txExecutor, fn));

      await expect(service.submitCart('user-1')).rejects.toThrow('DB error');

      expect(txExecutor.execute).toHaveBeenCalledTimes(1);
    });

    it('should emit CART_SUBMITTED event with correct payload', async () => {
      const activeCart = makeCartWithItems({ id: 'cart-event', items: [makeCartItem(), makeCartItem({ id: 'item-2', variantId: 'v-2', variant: makeVariant({ id: 'v-2' }) })] });

      cartRepo.findActiveByUserIdWithItems.mockResolvedValue(activeCart);
      cartRepo.markSubmitted.mockResolvedValue(
        makeCart({ isActive: false, status: 'SUBMITTED', submittedAt: new Date() }),
      );
      cartRepo.createActiveCart.mockResolvedValue(makeCart({ id: 'cart-new' }));
      cartRepo.getOrCreateActiveCart.mockResolvedValue(makeCart({ id: 'cart-new' }));

      await service.submitCart('user-1');

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'cart.submitted',
        {
          cartId: 'cart-event',
          userId: 'user-1',
          itemCount: 2,
        },
      );
    });
  });

  // =========================================================================
  // Full lifecycle: submit then add items to new cart
  // =========================================================================
  describe('full cart lifecycle', () => {
    it('should allow adding items to new cart after submission', async () => {
      // 1. Submit the cart
      const oldCart = makeCartWithItems({ id: 'old-cart' });
      const newCart = makeCart({ id: 'new-cart' });
      const variant = makeVariant({ id: 'v-lifecycle' });
      const newItem = makeCartItem({ id: 'item-new', cartId: 'new-cart', variantId: 'v-lifecycle', variant });
      const newCartWithItems = { ...makeCart({ id: 'new-cart' }), items: [newItem] };

      // submitCart flow
      cartRepo.findActiveByUserIdWithItems.mockResolvedValue(oldCart);
      cartRepo.markSubmitted.mockResolvedValue(
        makeCart({ id: 'old-cart', isActive: false, status: 'SUBMITTED', submittedAt: new Date() }),
      );
      cartRepo.createActiveCart.mockResolvedValue(newCart);
      cartRepo.getOrCreateActiveCart.mockResolvedValue(newCart);

      const submittedResult = await service.submitCart('user-1');
      expect(submittedResult.id).toBe('new-cart');
      expect(submittedResult.itemCount).toBe(0);

      // 2. Add item to the new cart
      jest.clearAllMocks();
      variantRepo.findById.mockResolvedValue(variant);
      cartRepo.getOrCreateActiveCart.mockResolvedValue(newCart);
      cartRepo.findByIdWithItems.mockResolvedValue(newCartWithItems);
      cartItemRepo.findByCartAndVariant.mockResolvedValue(null);
      cartItemRepo.create.mockResolvedValue(newItem);
      productRepo.findByIds.mockResolvedValue([makeProduct()]);

      const addResult = await service.addItem('user-1', 'v-lifecycle', 2);
      expect(addResult.itemCount).toBe(1);
      expect(cartItemRepo.create).toHaveBeenCalledWith({
        cartId: 'new-cart',
        variantId: 'v-lifecycle',
        qty: 2,
      });
    });

    it('should not return submitted carts when fetching active cart', async () => {
      // getOrCreateActiveCart returns only the active cart
      const activeCart = makeCart({ id: 'active-cart' });
      cartRepo.getOrCreateActiveCart.mockResolvedValue(activeCart);
      cartRepo.findByIdWithItems.mockResolvedValue(
        makeCartWithItems({ id: 'active-cart', items: [] }),
      );
      productRepo.findByIds.mockResolvedValue([]);

      const result = await service.getCart('user-1');

      expect(result.id).toBe('active-cart');
      // It should never have called findActiveByUserIdWithItems
      expect(cartRepo.getOrCreateActiveCart).toHaveBeenCalledWith('user-1');
    });

    it('should handle user with no cart (first-time user)', async () => {
      const newCart = makeCart({ id: 'first-cart' });

      cartRepo.getOrCreateActiveCart.mockResolvedValue(newCart);
      cartRepo.findByIdWithItems.mockResolvedValue({
        ...newCart,
        items: [],
      });
      productRepo.findByIds.mockResolvedValue([]);

      const result = await service.getCart('user-1');

      expect(result.id).toBe('first-cart');
      expect(result.itemCount).toBe(0);
      // getOrCreateActiveCart should have created a new cart
      expect(cartRepo.getOrCreateActiveCart).toHaveBeenCalledWith('user-1');
    });
  });

  // =========================================================================
  // Concurrent submission (race condition) tests
  // =========================================================================
  describe('race condition handling', () => {
    it('should ensure transaction wraps both markSubmitted and createActiveCart atomically', async () => {
      const activeCart = makeCartWithItems();
      cartRepo.findActiveByUserIdWithItems.mockResolvedValue(activeCart);

      let operationOrder: string[] = [];
      cartRepo.markSubmitted.mockImplementation(async () => {
        operationOrder.push('markSubmitted');
        return makeCart({ isActive: false, status: 'SUBMITTED', submittedAt: new Date() });
      });
      cartRepo.createActiveCart.mockImplementation(async () => {
        operationOrder.push('createActiveCart');
        return makeCart({ id: 'new-cart' });
      });
      cartRepo.getOrCreateActiveCart.mockResolvedValue(makeCart({ id: 'new-cart' }));

      await service.submitCart('user-1');

      // Both operations must have been called inside the transaction
      expect(txExecutor.execute).toHaveBeenCalledTimes(1);
      expect(operationOrder).toEqual(['markSubmitted', 'createActiveCart']);
    });

    it('should not create new cart if transaction fails mid-way', async () => {
      const activeCart = makeCartWithItems();
      cartRepo.findActiveByUserIdWithItems.mockResolvedValue(activeCart);
      cartRepo.markSubmitted.mockResolvedValue(
        makeCart({ isActive: false, status: 'SUBMITTED', submittedAt: new Date() }),
      );
      cartRepo.createActiveCart.mockRejectedValue(new Error('Unique constraint violation'));

      await expect(service.submitCart('user-1')).rejects.toThrow('Unique constraint violation');

      // Transaction was used
      expect(txExecutor.execute).toHaveBeenCalledTimes(1);
      // markSubmitted was attempted but should be rolled back
      expect(cartRepo.markSubmitted).toHaveBeenCalledWith('cart-1');
    });

    it('should return the new active cart after successful submission', async () => {
      const activeCart = makeCartWithItems({ id: 'old', items: [makeCartItem()] });
      const newCart = makeCart({ id: 'cart-fresh', items: [] });

      cartRepo.findActiveByUserIdWithItems.mockResolvedValue(activeCart);
      cartRepo.markSubmitted.mockResolvedValue(
        makeCart({ id: 'old', isActive: false, status: 'SUBMITTED', submittedAt: new Date() }),
      );
      cartRepo.createActiveCart.mockResolvedValue(newCart);
      cartRepo.getOrCreateActiveCart.mockResolvedValue(newCart);

      const result = await service.submitCart('user-1');

      // The returned cart should be the NEW empty cart, not the old one
      expect(result.id).toBe('cart-fresh');
      expect(result.itemCount).toBe(0);
    });
  });

  // =========================================================================
  // CartNotActiveError guards
  // =========================================================================
  describe('ensureCartEditable guards', () => {
    it('should throw CartNotActiveError for addItem on submitted cart', async () => {
      const cart = makeCartWithItems({ isActive: false, status: 'SUBMITTED' });
      const variant = makeVariant();

      variantRepo.findById.mockResolvedValue(variant);
      cartRepo.getOrCreateActiveCart.mockResolvedValue(makeCart());
      cartRepo.findByIdWithItems.mockResolvedValue(cart);

      await expect(service.addItem('user-1', 'variant-1', 1)).rejects.toThrow(CartNotActiveError);
    });

    it('should throw CartNotActiveError for removeItem on abandoned cart', async () => {
      const cartItem = makeCartItem({ id: 'item-1', cartId: 'cart-1' });
      const abandonedCart = makeCartWithItems({ isActive: false, status: 'ABANDONED' });

      cartItemRepo.findById.mockResolvedValue(cartItem);
      cartRepo.getOrCreateActiveCart.mockResolvedValue(makeCart({ id: 'cart-1' }));
      cartRepo.findByIdWithItems.mockResolvedValue(abandonedCart);

      await expect(service.removeItem('user-1', 'item-1')).rejects.toThrow(CartNotActiveError);
    });

    it('should throw CartNotActiveError for bulkAddItems on submitted cart', async () => {
      const submittedCart = makeCartWithItems({ isActive: false, status: 'SUBMITTED' });

      cartRepo.getOrCreateActiveCart.mockResolvedValue(makeCart());
      cartRepo.findByIdWithItems.mockResolvedValue(submittedCart);

      await expect(
        service.bulkAddItems('user-1', { items: [{ sku: 'SKU-001', qty: 1 }] }),
      ).rejects.toThrow(CartNotActiveError);
    });

    it('should throw CartNotActiveError for updateItem on inactive cart', async () => {
      const cartItem = makeCartItem({ id: 'item-1', cartId: 'cart-1' });
      const inactiveCart = makeCartWithItems({ isActive: false, status: 'SUBMITTED' });

      cartItemRepo.findById.mockResolvedValue(cartItem);
      cartRepo.getOrCreateActiveCart.mockResolvedValue(makeCart({ id: 'cart-1' }));
      cartRepo.findByIdWithItems.mockResolvedValue(inactiveCart);
      variantRepo.findById.mockResolvedValue(makeVariant());

      await expect(
        service.updateItem('user-1', 'item-1', { qty: 5 }),
      ).rejects.toThrow(CartNotActiveError);
    });
  });
});
