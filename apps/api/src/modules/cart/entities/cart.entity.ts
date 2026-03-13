import { BaseEntity } from '@shared/common/base.entity';

export class CartEntity extends BaseEntity {
  userId: string;
  submittedAt: Date | null;
}
