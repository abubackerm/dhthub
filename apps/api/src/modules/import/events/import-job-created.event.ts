export class ImportJobCreatedEvent {
  constructor(
    public readonly jobId: string,
    public readonly fileUrl: string,
    public readonly fileName: string | null,
    public readonly fileSize: number | null,
    public readonly type: string,
    public readonly totalRows: number | null,
    public readonly createdBy: string | null,
    public readonly importType: string | null,
    public readonly occurredAt: Date = new Date(),
  ) {}
}
