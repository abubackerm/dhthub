import { NotFoundError, AlreadyExistsError, InvalidOperationError } from './base.domain-error';

export class RoleNotFoundError extends NotFoundError {
  constructor(identifier: string) {
    super('Role', identifier);
  }
}

export class RoleNameExistsError extends AlreadyExistsError {
  constructor(name: string, organizationId: string) {
    super('Role', 'name', `${name} in organization ${organizationId}`);
  }
}

export class CannotDeleteSystemRoleError extends InvalidOperationError {
  constructor(roleId: string) {
    super(`Cannot delete system role: ${roleId}`, 'CANNOT_DELETE_SYSTEM_ROLE');
  }
}

export class CannotRenameSystemRoleError extends InvalidOperationError {
  constructor(roleId: string) {
    super(`Cannot rename system role: ${roleId}`, 'CANNOT_RENAME_SYSTEM_ROLE');
  }
}
