export interface EmailJobData {
  to: string;
  subject: string;
  template: string;
  data: Record<string, unknown>;
}

export interface ImportJobData {
  fileId: string;
  fileName: string;
  fileType: 'csv' | 'xlsx' | 'json';
  userId: string;
}

export interface ExportJobData {
  format: 'csv' | 'xlsx' | 'json';
  filters: Record<string, unknown>;
  userId: string;
}

export interface NotificationJobData {
  userId: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
}

export interface ImageProcessingJobData {
  imageId: string;
  imageUrl: string;
  operations: Array<{
    type: 'resize' | 'compress' | 'convert';
    options: Record<string, unknown>;
  }>;
}

export type JobTypeMap = {
  email: EmailJobData;
  import: ImportJobData;
  export: ExportJobData;
  notification: NotificationJobData;
  'image-processing': ImageProcessingJobData;
};

export type JobName = keyof JobTypeMap;
