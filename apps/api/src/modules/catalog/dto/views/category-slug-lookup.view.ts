import { CategoryEntity } from '../../entities/category.entity';
import { CategoryView } from './category.view';

export class CategorySlugLookupView {
  category: CategoryView;
  ancestors: CategoryView[];
  hasChildren: boolean;

  static fromData(
    category: CategoryEntity & { _count: { children: number } },
    ancestors: CategoryEntity[],
  ): CategorySlugLookupView {
    const view = new CategorySlugLookupView();
    view.category = CategoryView.fromEntity(category);
    view.ancestors = ancestors.map((a) => CategoryView.fromEntity(a));
    view.hasChildren = category._count.children > 0;
    return view;
  }
}
