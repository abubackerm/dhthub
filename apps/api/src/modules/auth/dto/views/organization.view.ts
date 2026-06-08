import { OrganizationEntity } from '../../entities';

export class OrganizationView {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;

  static fromEntity(entity: OrganizationEntity): OrganizationView {
    const view = new OrganizationView();
    view.id = entity.id;
    view.name = entity.name;
    view.slug = entity.slug;
    view.ownerId = entity.ownerId;
    view.isArchived = entity.isArchived;
    view.createdAt = entity.createdAt;
    view.updatedAt = entity.updatedAt;
    return view;
  }

  static fromEntities(entities: OrganizationEntity[]): OrganizationView[] {
    return entities.map((entity) => OrganizationView.fromEntity(entity));
  }
}
