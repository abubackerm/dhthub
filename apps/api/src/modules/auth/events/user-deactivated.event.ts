export const USER_DEACTIVATED = 'auth.user.deactivated';

export class UserDeactivatedEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly name: string | null,
    public readonly occurredAt: Date = new Date(),
  ) {}
}
