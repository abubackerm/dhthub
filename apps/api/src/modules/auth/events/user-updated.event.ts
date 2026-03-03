export const USER_UPDATED = 'auth.user.updated';

export class UserUpdatedEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly name: string | null,
    public readonly isActive: boolean,
    public readonly changes: Record<string, unknown>,
    public readonly occurredAt: Date = new Date(),
  ) {}
}
