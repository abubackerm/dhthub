export const MEMBERSHIP_CREATED = 'membership.created';

export class MembershipCreatedEvent {
  constructor(
    public readonly membershipId: string,
    public readonly userId: string,
    public readonly organizationId: string,
    public readonly roleId: string,
    public readonly occurredAt: Date = new Date(),
  ) {}
}
