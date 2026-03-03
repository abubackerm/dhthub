import { BaseEntity } from '@shared/common/base.entity';

export class UserEntity extends BaseEntity {
  email: string;
  passwordHash: string;
  name: string | null;
  isActive: boolean;
  lastLoginAt: Date | null;
}
