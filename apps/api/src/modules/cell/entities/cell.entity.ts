import { BaseEntity } from '../../../shared/common/base.entity';

export class Cell extends BaseEntity {
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  categoryId: string;
}
