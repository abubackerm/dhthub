export class CategoryUpdatedEvent {
  constructor(
    public readonly categoryId: string,
    public readonly changes: Record<string, { from: unknown; to: unknown }>,
    public readonly occurredAt: Date = new Date(),
  ) {}
}
