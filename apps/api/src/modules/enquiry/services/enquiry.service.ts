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
import { CreateEnquiryDto, UpdateEnquiryStatusDto } from '../dto';
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

  async createFromCart(userId: string, dto: CreateEnquiryDto): Promise<EnquiryView> {
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

    const enquiry = await this.enquiryRepo.create({
      userId,
      notes: dto.notes,
    });

    const enquiryItems = cart.items.map((item) => ({
      enquiryId: enquiry.id,
      variantId: item.variantId,
      qty: item.qty,
    }));

    await this.enquiryItemRepo.createMany(enquiryItems);

    await this.cartRepo.markSubmitted(cart.id);

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
