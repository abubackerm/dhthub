export const ORGANIZATION_CREATED = 'organization.created';

export class OrganizationCreatedEvent {
  constructor(
    public readonly organizationId: string,
    public readonly name: string,
    public readonly slug: string,
    public readonly ownerId: string,
    public readonly occurredAt: Date = new Date(),
  ) {}
}
