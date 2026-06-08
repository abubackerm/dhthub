export class EnquiryCreatedEvent {
  constructor(
    public readonly enquiryId: string,
    public readonly userId: string,
    public readonly itemCount: number,
    public readonly occurredAt: Date = new Date(),
  ) {}
}
