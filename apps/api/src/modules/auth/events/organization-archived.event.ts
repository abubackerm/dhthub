export const ORGANIZATION_ARCHIVED = 'auth.organization.archived';

export class OrganizationArchivedEvent {
  constructor(
    public readonly organizationId: string,
    public readonly name: string,
    public readonly slug: string,
    public readonly ownerId: string,
    public readonly occurredAt: Date = new Date(),
  ) {}
}
