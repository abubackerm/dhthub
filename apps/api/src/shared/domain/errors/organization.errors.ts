import { NotFoundError, AlreadyExistsError, InvalidOperationError } from './base.domain-error';

export class OrganizationNotFoundError extends NotFoundError {
  constructor(identifier: string) {
    super('Organization', identifier);
  }
}

export class SlugAlreadyExistsError extends AlreadyExistsError {
  constructor(slug: string) {
    super('Organization', 'slug', slug);
  }
}

export class OrganizationArchivedError extends InvalidOperationError {
  constructor(organizationId: string) {
    super(
      `Cannot perform operation on archived organization: ${organizationId}`,
      'ORGANIZATION_ARCHIVED',
    );
  }
}

export class OrganizationAlreadyArchivedError extends InvalidOperationError {
  constructor(organizationId: string) {
    super(`Organization is already archived: ${organizationId}`, 'ORGANIZATION_ALREADY_ARCHIVED');
  }
}
