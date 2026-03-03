import { BaseEntity } from '@shared/common/base.entity';

export class OrganizationEntity extends BaseEntity {
  name: string;
  slug: string;
  ownerId: string;
  isArchived: boolean;
}
