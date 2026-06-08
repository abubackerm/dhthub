export class CategoryCreatedEvent {
  constructor(
    public readonly categoryId: string,
    public readonly name: string,
    public readonly slug: string,
    public readonly parentId: string | null,
    public readonly occurredAt: Date = new Date(),
  ) {}
}
