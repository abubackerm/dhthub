import { RolePermissions } from '../entities';

export const ROLE_CREATED = 'auth.role.created';

export class RoleCreatedEvent {
  constructor(
    public readonly roleId: string,
    public readonly name: string,
    public readonly permissions: RolePermissions,
    public readonly organizationId: string,
    public readonly isSystemRole: boolean,
    public readonly occurredAt: Date = new Date(),
  ) {}
}
