export class ImportErrorEntity {
  id: string;
  jobId: string;
  rowNumber: number;
  sku: string | null;
  message: string;
  createdAt: Date;
}
