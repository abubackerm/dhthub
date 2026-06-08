import { BaseEntity } from '@shared/common/base.entity';

export type RolePermissions = Record<string, boolean>;

export class RoleEntity extends BaseEntity {
  name: string;
  permissions: RolePermissions;
  organizationId: string;
  isSystemRole: boolean;
}
