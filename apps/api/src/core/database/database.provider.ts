import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { PrismaClient } from '@prisma/client';

export type PrismaDelegate<T> = {
  findMany: (args?: any) => Promise<T[]>;
  findUnique: (args: any) => Promise<T | null>;
  findFirst: (args?: any) => Promise<T | null>;
  create: (args: any) => Promise<T>;
  update: (args: any) => Promise<T>;
  upsert: (args: any) => Promise<T>;
  delete: (args: any) => Promise<T>;
  deleteMany: (args: any) => Promise<{ count: number }>;
  updateMany: (args: any) => Promise<{ count: number }>;
  count: (args?: any) => Promise<number>;
  createMany: (args: any) => Promise<{ count: number }>;
  aggregate: (args?: any) => Promise<T>;
};

// Type for models accessible in transactions
export type TransactionClient = Omit<
  PrismaClient,
  | '$connect'
  | '$disconnect'
  | '$on'
  | '$transaction'
  | '$use'
  | '$extends'
  | '$queryRaw'
  | '$executeRaw'
>;

@Injectable()
export class DatabaseProvider {
  constructor(private readonly prisma: PrismaService) {}

  get user(): PrismaDelegate<any> {
    return this.prisma.user;
  }

  get organization(): PrismaDelegate<any> {
    return this.prisma.organization;
  }

  get membership(): PrismaDelegate<any> {
    return this.prisma.membership;
  }

  get role(): PrismaDelegate<any> {
    return this.prisma.role;
  }

  get product(): PrismaDelegate<any> {
    return this.prisma.product;
  }

  get productVariant(): PrismaDelegate<any> {
    return this.prisma.productVariant;
  }

  get category(): PrismaDelegate<any> {
    return this.prisma.category;
  }

  get productImage(): PrismaDelegate<any> {
    return this.prisma.productImage;
  }

  get variantImage(): PrismaDelegate<any> {
    return this.prisma.variantImage;
  }

  get attributeDefinition(): PrismaDelegate<any> {
    return this.prisma.attributeDefinition;
  }

  get attributeOption(): PrismaDelegate<any> {
    return this.prisma.attributeOption;
  }

  get categoryAttribute(): PrismaDelegate<any> {
    return this.prisma.categoryAttribute;
  }

  get unitDefinition(): PrismaDelegate<any> {
    return this.prisma.unitDefinition;
  }

  get variantAttributeValue(): PrismaDelegate<any> {
    return this.prisma.variantAttributeValue;
  }

  get cell(): PrismaDelegate<any> {
    return this.prisma.cell;
  }

  get cellAttribute(): PrismaDelegate<any> {
    return this.prisma.cellAttribute;
  }

  get cellImage(): PrismaDelegate<any> {
    return this.prisma.cellImage;
  }

  get categoryImage(): PrismaDelegate<any> {
    return this.prisma.categoryImage;
  }

  get price(): PrismaDelegate<any> {
    return this.prisma.price;
  }

  get priceTier(): PrismaDelegate<any> {
    return this.prisma.priceTier;
  }

  get currency(): PrismaDelegate<any> {
    return this.prisma.currency;
  }

  get warehouse(): PrismaDelegate<any> {
    return this.prisma.warehouse;
  }

  get inventoryLevel(): PrismaDelegate<any> {
    return this.prisma.inventoryLevel;
  }

  get inventoryMovement(): PrismaDelegate<any> {
    return this.prisma.inventoryMovement;
  }

  get inventoryReservation(): PrismaDelegate<any> {
    return this.prisma.inventoryReservation;
  }

  get importJob(): PrismaDelegate<any> {
    return this.prisma.importJob;
  }

  get importError(): PrismaDelegate<any> {
    return this.prisma.importError;
  }

  get cart(): PrismaDelegate<any> {
    return this.prisma.cart;
  }

  get cartItem(): PrismaDelegate<any> {
    return this.prisma.cartItem;
  }

  get enquiry(): PrismaDelegate<any> {
    return this.prisma.enquiry;
  }

  get enquiryItem(): PrismaDelegate<any> {
    return this.prisma.enquiryItem;
  }

  get auditLog(): PrismaDelegate<any> {
    return this.prisma.auditLog;
  }

  get pageView(): PrismaDelegate<any> {
    return this.prisma.pageView;
  }

  get productTableColumn(): PrismaDelegate<any> {
    return this.prisma.productTableColumn;
  }

  /**
   * Execute a callback within a database transaction.
   * Used for atomic operations like order creation + inventory reservation + payment record.
   *
   * @example
   * await this.db.runInTransaction(async (tx) => {
   *   await tx.order.create({ data: orderData });
   *   await tx.inventory.update({ where: { id }, data: { quantity: { decrement: 1 } } });
   *   await tx.payment.create({ data: paymentData });
   * });
   */
  async runInTransaction<T>(
    fn: (tx: TransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction(fn);
  }

  get $transaction() {
    return this.prisma.$transaction.bind(this.prisma);
  }

  get $queryRaw() {
    return this.prisma.$queryRaw.bind(this.prisma);
  }

  get $executeRaw() {
    return this.prisma.$executeRaw.bind(this.prisma);
  }
}
