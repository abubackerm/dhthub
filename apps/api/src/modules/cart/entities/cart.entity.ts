import { BaseEntity } from '@shared/common/base.entity';

export class CartEntity extends BaseEntity {
  userId: string;
  isActive: boolean;
  status: 'ACTIVE' | 'SUBMITTED' | 'ABANDONED';
  submittedAt: Date | null;
}
