import { CategoryEntity } from '../../entities/category.entity';

export class CategoryView {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
  path: string;
  imageUrl: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;

  static fromEntity(entity: CategoryEntity): CategoryView {
    const view = new CategoryView();
    view.id = entity.id;
    view.name = entity.name;
    view.slug = entity.slug;
    view.description = entity.description;
    view.parentId = entity.parentId;
    view.path = entity.path;
    view.imageUrl = entity.imageUrl;
    view.sortOrder = entity.sortOrder;
    view.isActive = entity.isActive;
    view.createdAt = entity.createdAt;
    view.updatedAt = entity.updatedAt;
    return view;
  }

  static fromEntities(entities: CategoryEntity[]): CategoryView[] {
    return entities.map((entity) => CategoryView.fromEntity(entity));
  }
}
