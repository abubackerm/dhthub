import { RoleEntity, RolePermissions } from '../../entities';

export class RoleView {
  id: string;
  name: string;
  permissions: RolePermissions;
  organizationId: string;
  isSystemRole: boolean;
  createdAt: Date;
  updatedAt: Date;

  static fromEntity(entity: RoleEntity): RoleView {
    const view = new RoleView();
    view.id = entity.id;
    view.name = entity.name;
    view.permissions = entity.permissions;
    view.organizationId = entity.organizationId;
    view.isSystemRole = entity.isSystemRole;
    view.createdAt = entity.createdAt;
    view.updatedAt = entity.updatedAt;
    return view;
  }

  static fromEntities(entities: RoleEntity[]): RoleView[] {
    return entities.map((entity) => RoleView.fromEntity(entity));
  }
}
