import { BaseEntity } from '@shared/common/base.entity';

export enum ProductStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  ARCHIVED = 'archived',
}

export enum ProductType {
  SIMPLE = 'simple',
  VARIABLE = 'variable',
}

export class ProductEntity extends BaseEntity {
  version: number;
  sku: string | null;
  name: string;
  slug: string;
  description: string | null;
  type: ProductType;
  status: ProductStatus;
  price: number | null;
  compareAtPrice: number | null;
  costPrice: number | null;
  currency: string;
  quantity: number;
  cellId: string | null;
  isFeatured: boolean;
  metadata: Record<string, unknown> | null;
}
