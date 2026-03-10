import { Injectable } from '@nestjs/common';
import { DatabaseProvider, TransactionClient } from '@core/database/database.provider';
import { transactionContext } from '@core/database/transaction-context.store';

interface PriceTierInput {
  minQty: number;
  maxQty: number | null;
  unitPrice: number;
}

@Injectable()
export class PriceRepository {
  constructor(private readonly db: DatabaseProvider) {}

  private getClient(): TransactionClient | DatabaseProvider {
    const tx = transactionContext.getStore();
    return tx ?? this.db;
  }

  async createPrice(variantId: string, currencyId: string): Promise<any> {
    return this.getClient().price.create({
      data: {
        variantId,
        currencyId,
      },
    });
  }

  async addPriceTiers(priceId: string, tiers: PriceTierInput[]): Promise<{ count: number }> {
    return this.getClient().priceTier.createMany({
      data: tiers.map((tier) => ({
        priceId,
        minQty: tier.minQty,
        maxQty: tier.maxQty,
        unitPrice: tier.unitPrice,
      })),
    });
  }

  async replacePriceTiers(priceId: string, tiers: PriceTierInput[]): Promise<void> {
    await this.getClient().priceTier.deleteMany({
      where: { priceId },
    });

    await this.getClient().priceTier.createMany({
      data: tiers.map((tier) => ({
        priceId,
        minQty: tier.minQty,
        maxQty: tier.maxQty,
        unitPrice: tier.unitPrice,
      })),
    });
  }

  async findPriceByVariant(variantId: string): Promise<any[]> {
    return this.getClient().price.findMany({
      where: { variantId },
      include: {
        currency: true,
        tiers: {
          orderBy: { minQty: 'asc' },
        },
      },
    });
  }

  async findPriceForVariantCurrency(
    variantId: string,
    currencyId: string,
  ): Promise<any | null> {
    return this.getClient().price.findUnique({
      where: {
        variantId_currencyId: {
          variantId,
          currencyId,
        },
      },
      include: {
        currency: true,
        tiers: {
          orderBy: { minQty: 'asc' },
        },
      },
    });
  }

  async getPriceForQuantity(
    variantId: string,
    currencyId: string,
    quantity: number,
  ): Promise<any | null> {
    const price = await this.getClient().price.findUnique({
      where: {
        variantId_currencyId: {
          variantId,
          currencyId,
        },
      },
    });

    if (!price) {
      return null;
    }

    const tier = await this.getClient().priceTier.findFirst({
      where: {
        priceId: price.id,
        minQty: { lte: quantity },
      },
      orderBy: { minQty: 'desc' },
    });

    return { price, tier };
  }

  async deletePrice(priceId: string): Promise<any> {
    return this.getClient().price.delete({
      where: { id: priceId },
    });
  }

  async findCurrencyByCode(code: string): Promise<any | null> {
    return this.getClient().currency.findUnique({
      where: { code },
    });
  }
}
