export class ImportJobCompletedEvent {
  constructor(
    public readonly jobId: string,
    public readonly totalRows: number | null,
    public readonly processedRows: number,
    public readonly successRows: number,
    public readonly failedRows: number,
    public readonly duration: number,
    public readonly rowsPerSecond: number,
    public readonly occurredAt: Date = new Date(),
  ) {}
}
