import { Injectable } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { DatabaseProvider } from '@core/database/database.provider';

@Injectable()
export class VariantDocumentBuilder {
  private readonly logger = new Logger(VariantDocumentBuilder.name);

  constructor(
    private readonly db: DatabaseProvider,
  ) {}

  async buildDocument(variantId: string): Promise<Record<string, unknown> | null> {
    const variant = await this.db.productVariant.findUnique({
      where: { id: variantId },
      include: {
        product: {
          include: {
            cell: {
              include: {
                category: true,
              },
            },
          },
        },
        images: {
          where: { isPrimary: true },
          take: 1,
        },
      },
    });

    if (!variant) {
      this.logger.warn(`Variant ${variantId} not found`);
      return null;
    }

    const [attributes, pricing, inventory] = await Promise.all([
      this.getVariantAttributes(variantId),
      this.getVariantPricing(variantId),
      this.getVariantInventory(variantId),
    ]);

    const document = {
      variantId: variant.id,
      productId: variant.productId,
      productName: variant.product.name,
      sku: variant.sku,
      cellId: variant.product.cellId,
      categoryId: variant.product.cell?.categoryId ?? null,
      categoryPath: variant.product.cell?.category?.path ?? null,
      categoryName: variant.product.cell?.category?.name ?? null,
      cellName: variant.product.cell?.name ?? null,
      price: pricing.price,
      currency: pricing.currency,
      stock: inventory.stock,
      image: variant.images[0]?.url ?? null,
      attributes: this.normalizeAttributes(attributes),
    };

    return document;
  }

  private async getVariantAttributes(variantId: string) {
    const values = await this.db.variantAttributeValue.findMany({
      where: { variantId },
      include: {
        attribute: true,
        option: true,
      },
    });

    return values;
  }

  private async getVariantPricing(variantId: string) {
    const price = await this.db.price.findFirst({
      where: { variantId },
      include: {
        currency: true,
        tiers: {
          orderBy: { minQty: 'asc' },
          take: 1,
        },
      },
    });

    return {
      price: price?.tiers[0]?.unitPrice?.toNumber() ?? null,
      currency: price?.currency?.code ?? 'USD',
    };
  }

  private async getVariantInventory(variantId: string) {
    const inventoryLevels = await this.db.inventoryLevel.findMany({
      where: { variantId },
    });

    const stock = inventoryLevels.reduce(
      (sum: number, level: any) => sum + (level.availableQty ?? 0),
      0,
    );

    return { stock };
  }

  private async normalizeAttributes(values: any[]) {
    const attributes: Record<string, string | number | boolean> = {};

    for (const value of values) {
      const { attribute, option } = value;

      switch (attribute.dataType) {
        case 'NUMBER':
          attributes[attribute.slug] = value.numberValue;
          break;
        case 'TEXT':
          attributes[attribute.slug] = value.textValue;
          break;
        case 'BOOLEAN':
          attributes[attribute.slug] = value.booleanValue;
          break;
        case 'ENUM':
          if (option) {
            attributes[attribute.slug] = option.label;
          }
          break;
      }
    }

    return attributes;
  }
}
