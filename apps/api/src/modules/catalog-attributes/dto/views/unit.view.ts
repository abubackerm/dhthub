import { UnitDefinitionEntity } from '../../entities';

export class UnitView {
  id: string;
  name: string;
  createdAt: Date;

  static fromEntity(entity: UnitDefinitionEntity): UnitView {
    const view = new UnitView();
    view.id = entity.id;
    view.name = entity.name;
    view.createdAt = entity.createdAt;
    return view;
  }

  static fromEntities(entities: UnitDefinitionEntity[]): UnitView[] {
    return entities.map((entity) => UnitView.fromEntity(entity));
  }
}
