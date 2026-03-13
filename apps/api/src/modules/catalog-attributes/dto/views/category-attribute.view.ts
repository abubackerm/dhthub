import { CategoryAttributeEntity } from '../../entities';
import { AttributeOptionView } from './attribute-option.view';
import { AttributeView } from './attribute.view';

export class CategoryAttributeView {
  assignmentId: string;
  categoryId: string;
  createdAt: Date;
  attribute: AttributeView;
  options: AttributeOptionView[];

  static fromEntity(entity: CategoryAttributeEntity): CategoryAttributeView {
    const view = new CategoryAttributeView();
    view.assignmentId = entity.id;
    view.categoryId = entity.categoryId;
    view.createdAt = entity.createdAt;
    view.attribute = AttributeView.fromEntity(entity.attribute as any);
    view.options = AttributeOptionView.fromEntities(
      ((entity.attribute as any)?.options ?? []) as any[],
    );
    return view;
  }

  static fromEntities(
    entities: CategoryAttributeEntity[],
  ): CategoryAttributeView[] {
    return entities.map((entity) => CategoryAttributeView.fromEntity(entity));
  }
}
