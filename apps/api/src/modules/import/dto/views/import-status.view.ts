import { ImportJobStatus } from '../../entities';

export class ImportErrorView {
  id: string;
  jobId: string;
  rowNumber: number;
  sku: string | null;
  message: string;
  rawData: Record<string, unknown> | null;
  createdAt: Date;
}

export class ImportStatusView {
  id: string;
  fileUrl: string;
  fileName: string | null;
  fileSize: number | null;
  type: string;
  status: ImportJobStatus;
  totalRows: number | null;
  processedRows: number;
  successRows: number;
  failedRows: number;
  lastProcessedRow: number;
  lockedAt: Date | null;
  lockedBy: string | null;
  createdBy: string | null;
  startedAt: Date | null;
  finishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  duration: number | null;
  rowsPerSecond: number | null;
}

export class ImportJobWithErrorsView extends ImportStatusView {
  errors: ImportErrorView[];
  errorCount: number;
}
