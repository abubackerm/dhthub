import { BaseEntity } from '@shared/common/base.entity';
import { ImportJobStatus } from './import-job-status.enum';

export enum ImportFileType {
  CSV = 'CSV',
  JSON = 'JSON',
  ZIP = 'ZIP',
}

export enum ImportMode {
  CREATE_ONLY = 'CREATE_ONLY',
  UPSERT = 'UPSERT',
  UPDATE_ONLY = 'UPDATE_ONLY',
}

export enum ImportType {
  CATALOG = 'CATALOG',
  ATTRIBUTES = 'ATTRIBUTES',
  IMAGES = 'IMAGES',
}

export class ImportJobEntity extends BaseEntity {
  fileUrl: string;
  fileName: string | null;
  fileSize: number | null;
  type: ImportFileType;
  status: ImportJobStatus;
  totalRows: number | null;
  processedRows: number;
  successRows: number;
  failedRows: number;
  lastProcessedRow: number;
  lockedAt: Date | null;
  lockedBy: string | null;
  startedAt: Date | null;
  finishedAt: Date | null;
  mode: ImportMode | null;
  warehouseId: string | null;
  originalFilePath: string | null;
  importType: ImportType | null;
}
