import { CategoryEntity } from '../../entities/category.entity';
import { CategoryView } from './category.view';

export class CategoryTreeView extends CategoryView {
  children: CategoryTreeView[];
  depth: number;
  productCount: number;
  cellCount: number;

  static fromEntity(
    entity: CategoryEntity & { _count?: { products?: number; cells?: number } },
    children: CategoryTreeView[] = [],
    depth: number = 0,
  ): CategoryTreeView {
    const view = new CategoryTreeView();
    view.id = entity.id;
    view.name = entity.name;
    view.slug = entity.slug;
    view.sku = entity.sku;
    view.description = entity.description;
    view.parentId = entity.parentId;
    view.path = entity.path;
    view.sortOrder = entity.sortOrder;
    view.isActive = entity.isActive;
    
    // Normalize imageUrl if present
    if (entity.imageUrl && entity.imageUrl.startsWith('http')) {
      const parsed = new URL(entity.imageUrl);
      view.imageUrl = parsed.pathname;
    }
    if (view.imageUrl && view.imageUrl.startsWith('/catalog')) {
      view.imageUrl = view.imageUrl.replace('/catalog', '');
    }
    view.createdAt = entity.createdAt;
    view.updatedAt = entity.updatedAt;
    view.children = children;
    view.depth = depth;
    view.productCount = entity._count?.products ?? 0;
    view.cellCount = entity._count?.cells ?? 0;
    return view;
  }
}
