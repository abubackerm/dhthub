import { Injectable, Logger, Inject } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BaseService, TransactionalExecutor } from '@shared/domain';
import { CART_EVENTS } from '@shared/events';
import {
  CartNotFoundError,
  CartItemNotFoundError,
  CartNotActiveError,
} from '../domain/errors';
import { CartRepository, CartItemRepository, CartWithItems } from '../repositories';
import { ProductVariantRepository, ProductRepository } from '../../catalog/repositories';
import { CartView, CartItemView } from '../dto/views';
import { UpdateCartItemDto, BulkAddCartItemsDto } from '../dto';
import { ProductEntity, ProductVariantEntity } from '../../catalog/entities';

@Injectable()
export class CartService extends BaseService {
  private readonly logger = new Logger(CartService.name);

  constructor(
    eventEmitter: EventEmitter2,
    @Inject('TransactionalExecutor')
    private readonly txExecutor: TransactionalExecutor,
    private readonly cartRepo: CartRepository,
    private readonly cartItemRepo: CartItemRepository,
    private readonly variantRepo: ProductVariantRepository,
    private readonly productRepo: ProductRepository,
  ) {
    super(eventEmitter);
  }

  private ensureCartEditable(cart: CartWithItems): void {
    if (!cart.isActive) {
      throw new CartNotActiveError(cart.id);
    }
  }

  async getCart(userId: string): Promise<CartView> {
    const cart = await this.cartRepo.getOrCreateActiveCart(userId);
    const cartWithItems = await this.cartRepo.findByIdWithItems(cart.id);
    if (!cartWithItems) {
      throw new CartNotFoundError(userId);
    }

    const items = await this.buildCartItems(cartWithItems);
    return CartView.fromEntity(cartWithItems, items);
  }

  async addItem(
    userId: string,
    variantId: string,
    qty: number,
  ): Promise<CartView> {
    const variant = await this.variantRepo.findById(variantId);
    if (!variant) {
      throw new CartItemNotFoundError(variantId);
    }

    const cart = await this.cartRepo.getOrCreateActiveCart(userId);
    const cartWithItems = await this.cartRepo.findByIdWithItems(cart.id);
    if (!cartWithItems) {
      throw new CartNotFoundError(userId);
    }

    this.ensureCartEditable(cartWithItems);

    const existingItem = await this.cartItemRepo.findByCartAndVariant(cart.id, variantId);

    if (existingItem) {
      const newQty = existingItem.qty + qty;
      await this.cartItemRepo.updateQty(existingItem.id, newQty);

      this.emit(CART_EVENTS.CART_ITEM_UPDATED, {
        cartItemId: existingItem.id,
        cartId: cart.id,
        variantId,
        qty: newQty,
      });
    } else {
      const cartItem = await this.cartItemRepo.create({
        cartId: cart.id,
        variantId,
        qty,
      });

      this.emit(CART_EVENTS.CART_ITEM_ADDED, {
        cartItemId: cartItem.id,
        cartId: cart.id,
        variantId,
        qty,
      });
    }

    const updatedCart = await this.cartRepo.findByIdWithItems(cart.id);
    const items = await this.buildCartItems(updatedCart!);
    return CartView.fromEntity(updatedCart!, items);
  }

  async updateItem(userId: string, itemId: string, dto: UpdateCartItemDto): Promise<CartView> {
    const cartItem = await this.cartItemRepo.findById(itemId);
    if (!cartItem) {
      throw new CartItemNotFoundError(itemId);
    }

    const cart = await this.cartRepo.getOrCreateActiveCart(userId);
    if (cart.id !== cartItem.cartId) {
      throw new CartNotFoundError(userId);
    }

    const cartWithItems = await this.cartRepo.findByIdWithItems(cart.id);
    if (!cartWithItems) {
      throw new CartNotFoundError(userId);
    }

    this.ensureCartEditable(cartWithItems);

    const variant = await this.variantRepo.findById(cartItem.variantId);
    if (!variant) {
      throw new CartItemNotFoundError(cartItem.variantId);
    }

    await this.cartItemRepo.updateQty(itemId, dto.qty);

    this.emit(CART_EVENTS.CART_ITEM_UPDATED, {
      cartItemId: itemId,
      cartId: cart.id,
      variantId: variant.id,
      qty: dto.qty,
    });

    const updatedCart = await this.cartRepo.findByIdWithItems(cart.id);
    const items = await this.buildCartItems(updatedCart!);
    return CartView.fromEntity(updatedCart!, items);
  }

  async removeItem(userId: string, itemId: string): Promise<CartView> {
    const cartItem = await this.cartItemRepo.findById(itemId);
    if (!cartItem) {
      throw new CartItemNotFoundError(itemId);
    }

    const cart = await this.cartRepo.getOrCreateActiveCart(userId);
    if (cart.id !== cartItem.cartId) {
      throw new CartNotFoundError(userId);
    }

    const cartWithItems = await this.cartRepo.findByIdWithItems(cart.id);
    if (!cartWithItems) {
      throw new CartNotFoundError(userId);
    }

    this.ensureCartEditable(cartWithItems);

    await this.cartItemRepo.delete(itemId);

    this.emit(CART_EVENTS.CART_ITEM_REMOVED, {
      cartItemId: itemId,
      cartId: cart.id,
    });

    const updatedCart = await this.cartRepo.findByIdWithItems(cart.id);
    const items = await this.buildCartItems(updatedCart!);
    return CartView.fromEntity(updatedCart!, items);
  }

  async clearCart(userId: string): Promise<CartView> {
    const cart = await this.cartRepo.findActiveByUserIdWithItems(userId);
    if (!cart) {
      throw new CartNotFoundError(userId);
    }

    this.ensureCartEditable(cart);

    await this.cartItemRepo.deleteByCartId(cart.id);

    this.emit(CART_EVENTS.CART_CLEARED, {
      cartId: cart.id,
      userId,
    });

    const updatedCart = await this.cartRepo.findByIdWithItems(cart.id);
    const items = await this.buildCartItems(updatedCart!);
    return CartView.fromEntity(updatedCart!, items);
  }

  async bulkAddItems(userId: string, dto: BulkAddCartItemsDto): Promise<CartView> {
    const cart = await this.cartRepo.getOrCreateActiveCart(userId);
    const cartWithItems = await this.cartRepo.findByIdWithItems(cart.id);
    if (!cartWithItems) {
      throw new CartNotFoundError(userId);
    }

    this.ensureCartEditable(cartWithItems);

    for (const itemDto of dto.items) {
      const variant = await this.variantRepo.findBySku(itemDto.sku);
      if (!variant) {
        this.logger.warn(`Variant not found for SKU: ${itemDto.sku}`);
        continue;
      }

      const existingItem = await this.cartItemRepo.findByCartAndVariant(cart.id, variant.id);

      if (existingItem) {
        const newQty = existingItem.qty + itemDto.qty;
        await this.cartItemRepo.updateQty(existingItem.id, newQty);

        this.emit(CART_EVENTS.CART_ITEM_UPDATED, {
          cartItemId: existingItem.id,
          cartId: cart.id,
          variantId: variant.id,
          qty: newQty,
        });
      } else {
        const cartItem = await this.cartItemRepo.create({
          cartId: cart.id,
          variantId: variant.id,
          qty: itemDto.qty,
        });

        this.emit(CART_EVENTS.CART_ITEM_ADDED, {
          cartItemId: cartItem.id,
          cartId: cart.id,
          variantId: variant.id,
          qty: itemDto.qty,
        });
      }
    }

    const updatedCart = await this.cartRepo.findByIdWithItems(cart.id);
    const items = await this.buildCartItems(updatedCart!);
    return CartView.fromEntity(updatedCart!, items);
  }

  async submitCart(userId: string): Promise<CartView> {
    const cart = await this.cartRepo.findActiveByUserIdWithItems(userId);
    if (!cart) {
      throw new CartNotFoundError(userId);
    }

    this.ensureCartEditable(cart);

    await this.txExecutor.execute(async () => {
      await this.cartRepo.markSubmitted(cart.id);
      await this.cartRepo.createActiveCart(userId);
    });

    this.emit(CART_EVENTS.CART_SUBMITTED, {
      cartId: cart.id,
      userId,
      itemCount: cart.items.length,
    });

    const newCart = await this.cartRepo.getOrCreateActiveCart(userId);
    return CartView.fromEntity(newCart);
  }

  private async buildCartItems(cart: CartWithItems): Promise<CartItemView[]> {
    const variants = cart.items.map((item) => item.variant);
    const variantMap = new Map<string, ProductVariantEntity>(
      variants.map((v) => [v.id, v]),
    );

    const productIds = Array.from(variantMap.values()).map((v) => v.productId);
    const products = await this.productRepo.findByIds(productIds);
    const productMap = new Map<string, ProductEntity>(
      products.map((p) => [p.id, p]),
    );

    // IMPORTANT: Stock source = product_variants.quantity
    // InventoryService (inventory_levels table) is NOT used yet.
    // Do NOT switch to inventory_levels until full migration is complete.
    // Both admin UI and cart must use the SAME stock source to avoid overselling.
    const USE_INVENTORY_SERVICE = false;

    return cart.items
      .map((item: CartWithItems['items'][number]): CartItemView | null => {
        const variant = variantMap.get(item.variantId);
        if (!variant) return null;
        const product = productMap.get(variant.productId);
        if (!product) return null;
        const availableStock = USE_INVENTORY_SERVICE
          ? 0
          : variant.quantity;
        return CartItemView.fromEntity(item, variant, product, availableStock);
      })
      .filter((item): item is CartItemView => item !== null);
  }
}
