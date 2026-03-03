import { MembershipStatus } from '../entities';

export const MEMBERSHIP_STATUS_CHANGED = 'auth.membership.status_changed';

export class MembershipStatusChangedEvent {
  constructor(
    public readonly membershipId: string,
    public readonly userId: string,
    public readonly organizationId: string,
    public readonly previousStatus: MembershipStatus,
    public readonly newStatus: MembershipStatus,
    public readonly occurredAt: Date = new Date(),
  ) {}
}
