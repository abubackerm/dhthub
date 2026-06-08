import { BaseEntity } from '@shared/common/base.entity';

export class AttributeOptionEntity extends BaseEntity {
  attributeId: string;
  label: string;
  value: string;
  sortOrder: number;
}
