export class ImportErrorEntity {
  id: string;
  jobId: string;
  rowNumber: number;
  sku: string | null;
  message: string;
  rawData: Record<string, unknown> | null;
  sourceFile: string | null;
  createdAt: Date;
}
