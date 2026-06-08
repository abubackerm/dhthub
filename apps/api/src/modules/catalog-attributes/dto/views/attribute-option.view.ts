import { AttributeOptionEntity } from '../../entities';

export class AttributeOptionView {
  id: string;
  attributeId: string;
  label: string;
  value: string;
  sortOrder: number;
  createdAt: Date;

  static fromEntity(entity: AttributeOptionEntity): AttributeOptionView {
    const view = new AttributeOptionView();
    view.id = entity.id;
    view.attributeId = entity.attributeId;
    view.label = entity.label;
    view.value = entity.value;
    view.sortOrder = entity.sortOrder;
    view.createdAt = entity.createdAt;
    return view;
  }

  static fromEntities(entities: AttributeOptionEntity[]): AttributeOptionView[] {
    return entities.map((entity) => AttributeOptionView.fromEntity(entity));
  }
}
