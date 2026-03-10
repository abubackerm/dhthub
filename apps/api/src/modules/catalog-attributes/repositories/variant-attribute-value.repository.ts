import { Injectable } from '@nestjs/common';
import { DatabaseProvider, TransactionClient } from '@core/database/database.provider';
import { transactionContext } from '@core/database/transaction-context.store';
import { VariantAttributeValueEntity } from '../entities';

@Injectable()
export class VariantAttributeValueRepository {
  constructor(private readonly db: DatabaseProvider) {}

  private getClient(): TransactionClient | DatabaseProvider {
    const tx = transactionContext.getStore();
    return tx ?? this.db;
  }

  async findById(id: string): Promise<VariantAttributeValueEntity | null> {
    return this.getClient().variantAttributeValue.findUnique({
      where: { id },
    });
  }

  async findByVariantId(variantId: string): Promise<VariantAttributeValueEntity[]> {
    return this.getClient().variantAttributeValue.findMany({
      where: { variantId },
    });
  }

  async findByVariantIdWithAttribute(variantId: string): Promise<VariantAttributeValueEntity[]> {
    return this.getClient().variantAttributeValue.findMany({
      where: { variantId },
      include: {
        attribute: true,
        option: true,
      },
    });
  }

  async create(data: {
    variantId: string;
    attributeId: string;
    numberValue?: number | null;
    textValue?: string | null;
    optionId?: string | null;
    booleanValue?: boolean | null;
  }): Promise<VariantAttributeValueEntity> {
    return this.getClient().variantAttributeValue.create({
      data: {
        variantId: data.variantId,
        attributeId: data.attributeId,
        numberValue: data.numberValue ?? null,
        textValue: data.textValue ?? null,
        optionId: data.optionId ?? null,
        booleanValue: data.booleanValue ?? null,
      },
    });
  }

  async batchCreate(
    data: Array<{
      variantId: string;
      attributeId: string;
      numberValue?: number | null;
      textValue?: string | null;
      optionId?: string | null;
      booleanValue?: boolean | null;
    }>,
  ): Promise<{ count: number }> {
    return this.getClient().variantAttributeValue.createMany({
      data,
      skipDuplicates: true,
    });
  }

  async batchInsertAttributes(
    attributes: Array<{
      variantId: string;
      attributeId: string;
      numberValue?: number | null;
      textValue?: string | null;
      optionId?: string | null;
      booleanValue?: boolean | null;
    }>,
  ): Promise<{ count: number }> {
    return this.getClient().variantAttributeValue.createMany({
      data: attributes.map((attr) => ({
        variantId: attr.variantId,
        attributeId: attr.attributeId,
        numberValue: attr.numberValue ?? null,
        textValue: attr.textValue ?? null,
        optionId: attr.optionId ?? null,
        booleanValue: attr.booleanValue ?? null,
      })),
      skipDuplicates: false,
    });
  }

  async update(
    id: string,
    data: Partial<{
      numberValue: number | null;
      textValue: string | null;
      optionId: string | null;
      booleanValue: boolean | null;
    }>,
  ): Promise<VariantAttributeValueEntity> {
    return this.getClient().variantAttributeValue.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<VariantAttributeValueEntity> {
    return this.getClient().variantAttributeValue.delete({
      where: { id },
    });
  }

  async deleteByVariantId(variantId: string): Promise<{ count: number }> {
    return this.getClient().variantAttributeValue.deleteMany({
      where: { variantId },
    });
  }

  async count(where?: Record<string, unknown>): Promise<number> {
    return this.getClient().variantAttributeValue.count({ where });
  }
}
