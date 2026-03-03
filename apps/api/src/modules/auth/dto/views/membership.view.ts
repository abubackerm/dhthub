import { MembershipEntity, MembershipStatus } from '../../entities';

export class MembershipView {
  id: string;
  userId: string;
  organizationId: string;
  roleId: string;
  status: MembershipStatus;
  createdAt: Date;
  updatedAt: Date;

  static fromEntity(entity: MembershipEntity): MembershipView {
    const view = new MembershipView();
    view.id = entity.id;
    view.userId = entity.userId;
    view.organizationId = entity.organizationId;
    view.roleId = entity.roleId;
    view.status = entity.status;
    view.createdAt = entity.createdAt;
    view.updatedAt = entity.updatedAt;
    return view;
  }

  static fromEntities(entities: MembershipEntity[]): MembershipView[] {
    return entities.map((entity) => MembershipView.fromEntity(entity));
  }
}
