import { AttributeDefinitionEntity } from '../../entities';

export class AttributeView {
  id: string;
  name: string;
  slug: string;
  dataType: 'number' | 'text' | 'enum' | 'boolean';
  group: string | null;
  sortOrder: number;
  filterType: 'RANGE' | 'CHECKBOX' | 'SELECT' | null;
  isFilterable: boolean;
  isRequired: boolean;
  createdAt: Date;
  updatedAt: Date;

  static fromEntity(entity: AttributeDefinitionEntity): AttributeView {
    const view = new AttributeView();
    view.id = entity.id;
    view.name = entity.name;
    view.slug = entity.slug;
    view.dataType = entity.dataType as 'number' | 'text' | 'enum' | 'boolean';
    view.group = entity.group;
    view.sortOrder = entity.sortOrder;
    view.filterType = entity.filterType as 'RANGE' | 'CHECKBOX' | 'SELECT' | null;
    view.isFilterable = entity.isFilterable;
    view.isRequired = entity.isRequired;
    view.createdAt = entity.createdAt;
    view.updatedAt = entity.updatedAt;
    return view;
  }

  static fromEntities(entities: AttributeDefinitionEntity[]): AttributeView[] {
    return entities.map((entity) => AttributeView.fromEntity(entity));
  }
}
