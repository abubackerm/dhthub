import { BaseEntity } from '@shared/common/base.entity';

export class CategoryEntity extends BaseEntity {
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
  path: string;
  imageUrl: string | null;
  sortOrder: number;
  isActive: boolean;
}
