import { BaseEntity } from '@shared/common/base.entity';

export class VariantAttributeValueEntity extends BaseEntity {
  variantId: string;
  attributeId: string;
  numberValue: number | null;
  textValue: string | null;
  optionId: string | null;
  booleanValue: boolean | null;
}
