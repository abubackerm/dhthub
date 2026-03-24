import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BaseService } from '@shared/domain';
import { ENQUIRY_EVENTS } from '@shared/events';
import {
  EnquiryNotFoundError,
  EnquiryCannotBeModifiedError,
  CartAlreadySubmittedError,
} from '../domain/errors';
import { EnquiryRepository, EnquiryItemRepository, EnquiryWithItems } from '../repositories';
import { CartRepository } from '../../cart/repositories/cart.repository';
import { ProductVariantRepository, ProductRepository } from '../../catalog/repositories';
import { EnquiryView, EnquiryItemView } from '../dto/views';
import { CreateEnquiryDto, CreateEnquiryFromCartDto, UpdateEnquiryStatusDto, QuoteEnquiryDto, AdminListEnquiriesDto } from '../dto';
import { EnquiryStatus } from '../entities';
import { EnquiryCreatedEvent, EnquiryStatusUpdatedEvent } from '../events';

@Injectable()
export class EnquiryService extends BaseService {
  constructor(
    eventEmitter: EventEmitter2,
    private readonly enquiryRepo: EnquiryRepository,
    private readonly enquiryItemRepo: EnquiryItemRepository,
    private readonly cartRepo: CartRepository,
    private readonly variantRepo: ProductVariantRepository,
    private readonly productRepo: ProductRepository,
  ) {
    super(eventEmitter);
  }

  async createFromCart(userId: string, dto: CreateEnquiryFromCartDto, user?: any): Promise<EnquiryView> {
    const cart = await this.cartRepo.findByUserIdWithItems(userId);

    if (!cart) {
      throw new EnquiryNotFoundError(`Cart for user ${userId} not found`);
    }

    if (cart.submittedAt) {
      throw new CartAlreadySubmittedError(cart.id);
    }

    if (!cart.items || cart.items.length === 0) {
      throw new EnquiryCannotBeModifiedError(cart.id, 'Cannot create enquiry from empty cart');
    }

    // Use user's email and name if not provided in DTO
    const customerName = dto.customerName || user?.name || user?.email?.split('@')[0] || 'Customer';
    const email = dto.email || user?.email;

    if (!email) {
      throw new EnquiryCannotBeModifiedError(userId, 'Email is required to create enquiry');
    }

    const enquiryNumber = await this.enquiryRepo.generateEnquiryNumber();

    const enquiry = await this.enquiryRepo.createWithCustomer({
      userId,
      enquiryNumber,
      customerName,
      companyName: dto.companyName,
      email,
      phone: dto.phone,
      notes: dto.notes,
    });

    const enquiryItems = cart.items.map((item) => ({
      enquiryId: enquiry.id,
      variantId: item.variantId,
      productId: (item as any).variant?.productId || '',
      sku: (item as any).variant?.sku || '',
      qty: item.qty,
    }));

    await this.enquiryItemRepo.createManyWithDetails(enquiryItems);

    await this.cartRepo.markSubmitted(cart.id);

    this.emit(ENQUIRY_EVENTS.ENQUIRY_CREATED, new EnquiryCreatedEvent(
      enquiry.id,
      userId,
      enquiryItems.length,
    ));

    const enquiryWithItems = await this.enquiryRepo.findByIdWithItems(enquiry.id);
    return this.mapToEnquiryView(enquiryWithItems!);
  }

  async create(userId: string, dto: CreateEnquiryDto): Promise<EnquiryView> {
    const enquiryNumber = await this.enquiryRepo.generateEnquiryNumber();

    const enquiry = await this.enquiryRepo.createWithCustomer({
      userId,
      enquiryNumber,
      customerName: dto.customerName,
      companyName: dto.companyName,
      email: dto.email,
      phone: dto.phone,
      notes: dto.notes,
    });

    const variantIds = dto.items.map((item) => item.variantId);
    const variants = await this.variantRepo.findByIds(variantIds);
    const variantMap = new Map(variants.map((v) => [v.id, v]));

    const enquiryItems = dto.items.map((item) => {
      const variant = variantMap.get(item.variantId);
      if (!variant) {
        throw new EnquiryNotFoundError(`Variant ${item.variantId} not found`);
      }
      return {
        enquiryId: enquiry.id,
        variantId: item.variantId,
        productId: variant.productId,
        sku: variant.sku,
        qty: item.qty,
      };
    });

    await this.enquiryItemRepo.createManyWithDetails(enquiryItems);

    this.emit(ENQUIRY_EVENTS.ENQUIRY_CREATED, new EnquiryCreatedEvent(
      enquiry.id,
      userId,
      enquiryItems.length,
    ));

    const enquiryWithItems = await this.enquiryRepo.findByIdWithItems(enquiry.id);
    return this.mapToEnquiryView(enquiryWithItems!);
  }

  async findByUser(userId: string): Promise<EnquiryView[]> {
    const enquiries = await this.enquiryRepo.findByUserIdWithItems(userId);
    return await Promise.all(
      enquiries.map((enquiry) => this.mapToEnquiryView(enquiry)),
    );
  }

  async findById(id: string, userId?: string): Promise<EnquiryView> {
    const enquiry = await this.enquiryRepo.findByIdWithItems(id);

    if (!enquiry) {
      throw new EnquiryNotFoundError(id);
    }

    if (userId && enquiry.userId !== userId) {
      throw new EnquiryNotFoundError(id);
    }

    return this.mapToEnquiryView(enquiry);
  }

  async updateStatus(id: string, dto: UpdateEnquiryStatusDto, updatedBy?: string): Promise<EnquiryView> {
    const enquiry = await this.enquiryRepo.findById(id);

    if (!enquiry) {
      throw new EnquiryNotFoundError(id);
    }

    const previousStatus = enquiry.status;

    if (previousStatus === dto.status) {
      throw new EnquiryCannotBeModifiedError(id, `Status is already ${dto.status}`);
    }

    await this.enquiryRepo.updateStatus(id, dto.status, updatedBy);

    this.emit(ENQUIRY_EVENTS.ENQUIRY_STATUS_UPDATED, new EnquiryStatusUpdatedEvent(
      id,
      previousStatus,
      dto.status,
      dto.notes || null,
    ));

    const enquiryWithItems = await this.enquiryRepo.findByIdWithItems(id);
    return this.mapToEnquiryView(enquiryWithItems!);
  }

  async findByStatus(status: EnquiryStatus): Promise<EnquiryView[]> {
    const enquiries = await this.enquiryRepo.findByStatusWithItems(status);
    return await Promise.all(
      enquiries.map((enquiry) => this.mapToEnquiryView(enquiry)),
    );
  }

  async findAllForAdmin(dto: AdminListEnquiriesDto): Promise<{ enquiries: EnquiryView[]; total: number }> {
    const filters = {
      status: dto.status,
      search: dto.search,
      page: dto.page ? parseInt(dto.page) : undefined,
      limit: dto.limit ? parseInt(dto.limit) : undefined,
    };

    const { enquiries, total } = await this.enquiryRepo.findAllWithFilters(filters);

    const enquiriesWithViews = await Promise.all(
      enquiries.map(async (enquiry) => {
        const enquiryWithItems = await this.enquiryRepo.findByIdWithItems(enquiry.id);
        return this.mapToEnquiryView(enquiryWithItems!);
      }),
    );

    return { enquiries: enquiriesWithViews, total };
  }

  async findByIdForAdmin(id: string): Promise<EnquiryView> {
    const enquiry = await this.enquiryRepo.findByIdWithItems(id);

    if (!enquiry) {
      throw new EnquiryNotFoundError(id);
    }

    return this.mapToEnquiryView(enquiry);
  }

  async addQuote(id: string, dto: QuoteEnquiryDto, updatedBy?: string): Promise<EnquiryView> {
    const enquiry = await this.enquiryRepo.findByIdWithItems(id);

    if (!enquiry) {
      throw new EnquiryNotFoundError(id);
    }

    const itemMap = new Map(enquiry.items.map((item: any) => [item.id, item]));

    const updates = dto.items.map((quoteItem) => {
      const item = itemMap.get(quoteItem.itemId);
      if (!item) {
        throw new EnquiryNotFoundError(`Item ${quoteItem.itemId} not found in enquiry`);
      }
      const total = quoteItem.price * item.qty;
      return {
        id: quoteItem.itemId,
        price: quoteItem.price,
        total,
      };
    });

    await this.enquiryItemRepo.batchUpdatePrices(updates, updatedBy);

    const grandTotal = updates.reduce((sum, update) => sum + update.total, 0);

    await this.enquiryRepo.setGrandTotal(id, grandTotal, updatedBy);

    await this.enquiryRepo.updateQuote(id, updatedBy);

    const enquiryWithItems = await this.enquiryRepo.findByIdWithItems(id);
    return this.mapToEnquiryView(enquiryWithItems!);
  }

  async confirmOrder(id: string, userId: string): Promise<EnquiryView> {
    const enquiry = await this.enquiryRepo.findById(id);

    if (!enquiry) {
      throw new EnquiryNotFoundError(id);
    }

    if (enquiry.userId !== userId) {
      throw new EnquiryNotFoundError(id);
    }

    if (enquiry.status !== EnquiryStatus.QUOTED) {
      throw new EnquiryCannotBeModifiedError(id, `Cannot confirm order with status ${enquiry.status}`);
    }

    await this.enquiryRepo.confirmOrder(id, userId);

    const enquiryWithItems = await this.enquiryRepo.findByIdWithItems(id);
    return this.mapToEnquiryView(enquiryWithItems!);
  }

  async markAsPaid(id: string, updatedBy?: string): Promise<EnquiryView> {
    const enquiry = await this.enquiryRepo.findById(id);

    if (!enquiry) {
      throw new EnquiryNotFoundError(id);
    }

    if (enquiry.status !== EnquiryStatus.CONFIRMED && enquiry.status !== EnquiryStatus.PAYMENT_PENDING) {
      throw new EnquiryCannotBeModifiedError(id, `Cannot mark as paid with status ${enquiry.status}`);
    }

    await this.enquiryRepo.markAsPaid(id, updatedBy);

    const enquiryWithItems = await this.enquiryRepo.findByIdWithItems(id);
    return this.mapToEnquiryView(enquiryWithItems!);
  }

  private async mapToEnquiryView(enquiry: EnquiryWithItems): Promise<EnquiryView> {
    const variantIds = enquiry.items.map((item) => item.variantId);
    
    const variants = await this.variantRepo.findByIds(variantIds);
    const variantMap = new Map(variants.map((v) => [v.id, v]));

    const productIds = variants.map((v) => v.productId);
    const products = await this.productRepo.findByIds(productIds);
    const productMap = new Map(products.map((p) => [p.id, p]));

    const items = EnquiryItemView.fromEntities(
      enquiry.items,
      variantMap,
      productMap,
    );

    return EnquiryView.fromEntity(enquiry, items);
  }
}
