import { CategoryEntity } from '../../entities/category.entity';
import { CategoryView } from './category.view';

export class CategoryTreeView extends CategoryView {
  children: CategoryTreeView[];
  depth: number;

  static fromEntity(
    entity: CategoryEntity,
    children: CategoryTreeView[] = [],
    depth: number = 0,
  ): CategoryTreeView {
    const view = new CategoryTreeView();
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
    view.children = children;
    view.depth = depth;
    return view;
  }
}
