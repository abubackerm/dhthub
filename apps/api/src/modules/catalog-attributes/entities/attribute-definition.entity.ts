import { BaseEntity } from '@shared/common/base.entity';

export enum AttributeDataType {
  NUMBER = 'number',
  TEXT = 'text',
  ENUM = 'enum',
  BOOLEAN = 'boolean',
}

export enum AttributeFilterType {
  RANGE = 'RANGE',
  CHECKBOX = 'CHECKBOX',
  SELECT = 'SELECT',
}

export class AttributeDefinitionEntity extends BaseEntity {
  name: string;
  slug: string;
  dataType: AttributeDataType;
  group: string | null;
  sortOrder: number;
  filterType: AttributeFilterType | null;
  unitId: string | null;
  unit?: { id: string; name: string; symbol: string } | null;
  isFilterable: boolean;
  isRequired: boolean;
}
