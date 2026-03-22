import { CategoryEntity } from '../../entities/category.entity';

export class CategoryView {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  description: string | null;
  parentId: string | null;
  path: string;
  imageUrl: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    products: number;
    cells?: number;
  };

  static fromEntity(entity: CategoryEntity): CategoryView {
    const view = new CategoryView();
    view.id = entity.id;
    view.name = entity.name;
    view.slug = entity.slug;
    view.sku = entity.sku;
    view.description = entity.description;
    view.parentId = entity.parentId;
    view.path = entity.path;
    view.imageUrl = entity.imageUrl;
    view.sortOrder = entity.sortOrder;
    view.isActive = entity.isActive;
    view.createdAt = entity.createdAt;
    view.updatedAt = entity.updatedAt;
    if ((entity as any)._count) {
      view._count = (entity as any)._count;
    }
    return view;
  }

  static fromEntities(entities: CategoryEntity[]): CategoryView[] {
    return entities.map((entity) => CategoryView.fromEntity(entity));
  }
}
