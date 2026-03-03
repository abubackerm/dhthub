import { BaseEntity } from '@shared/common/base.entity';

export enum MembershipStatus {
  INVITED = 'invited',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  REMOVED = 'removed',
}

export class MembershipEntity extends BaseEntity {
  userId: string;
  organizationId: string;
  roleId: string;
  status: MembershipStatus;
}
