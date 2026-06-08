import { UserEntity } from '../../entities';

export class UserView {
  id: string;
  email: string;
  name: string | null;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;

  static fromEntity(entity: UserEntity): UserView {
    const view = new UserView();
    view.id = entity.id;
    view.email = entity.email;
    view.name = entity.name;
    view.isActive = entity.isActive;
    view.lastLoginAt = entity.lastLoginAt;
    view.createdAt = entity.createdAt;
    view.updatedAt = entity.updatedAt;
    return view;
  }

  static fromEntities(entities: UserEntity[]): UserView[] {
    return entities.map((entity) => UserView.fromEntity(entity));
  }
}
