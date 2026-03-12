export class ImportJobFailedEvent {
  constructor(
    public readonly jobId: string,
    public readonly totalRows: number | null,
    public readonly processedRows: number,
    public readonly successRows: number,
    public readonly failedRows: number,
    public readonly error: string,
    public readonly occurredAt: Date = new Date(),
  ) {}
}
