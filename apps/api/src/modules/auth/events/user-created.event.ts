export const USER_CREATED = 'user.created';

export class UserCreatedEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly name: string | null,
    public readonly occurredAt: Date = new Date(),
  ) {}
}
