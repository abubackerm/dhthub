import { CategoryEntity } from '../../entities/category.entity';
import { CategoryView } from './category.view';

export class CategoryTreeView extends CategoryView {
  children: CategoryTreeView[];
  depth: number;
  productCount: number;
  cellCount: number;
  hasChildren: boolean;

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
    view.displayMode = entity.displayMode ?? 'VARIANT_TABLE';
    view.isActive = entity.isActive;

    // Normalize imageUrl if present
    view.imageUrl = entity.imageUrl || null;
    if (view.imageUrl && view.imageUrl.startsWith('http')) {
      const parsed = new URL(view.imageUrl);
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
    view.hasChildren = children.length > 0;
    return view;
  }

  static trimToDepth(nodes: CategoryTreeView[], maxDepth: number): CategoryTreeView[] {
    if (maxDepth < 0) return [];

    return nodes.map((node) => {
      if (node.depth >= maxDepth) {
        const trimmed = new CategoryTreeView();
        Object.assign(trimmed, node);
        trimmed.children = [];
        trimmed.hasChildren = node.children.length > 0;
        return trimmed;
      }
      return {
        ...node,
        children: CategoryTreeView.trimToDepth(node.children, maxDepth),
        hasChildren: node.children.length > 0,
      };
    });
  }
}
