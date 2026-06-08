import { BaseEntity } from '@shared/common/base.entity';

export class CategoryAttributeEntity extends BaseEntity {
  categoryId: string;
  attributeId: string;
  attribute?: any;
}
