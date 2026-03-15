import { apiClient } from './client';

export type ImportMode = 'CREATE_ONLY' | 'UPSERT' | 'UPDATE_ONLY';

export interface ImportJobView {
  id: string;
  fileUrl: string;
  fileName: string | null;
  fileSize: number | null;
  type: string;
  status: string;
  totalRows: number | null;
  processedRows: number;
  successRows: number;
  failedRows: number;
  lastProcessedRow: number;
  lockedAt: string | null;
  lockedBy: string | null;
  createdBy: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  duration: number | null;
  rowsPerSecond: number | null;
}

export interface ImportJobListResponse {
  data: ImportJobView[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

export interface CreateImportJobResponse {
  jobId: string;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  totalRows: number;
}

export interface ValidateImportResponse {
  isValid: boolean;
  totalRows: number;
  totalErrors: number;
  totalWarnings: number;
  errors: Array<{
    rowNumber: number;
    sku?: string;
    field?: string;
    message: string;
    severity: 'error' | 'warning';
  }>;
}

export async function searchCategories(query: string, limit = 20, leafOnly = true) {
  const params = new URLSearchParams({ q: query });
  if (limit) {
    params.set('limit', String(limit));
  }
  if (leafOnly) {
    params.set('leafOnly', 'true');
  }
  return apiClient.get<Array<{ id: string; name: string; path: string }>>(
    `/v1/catalog/categories/search?${params.toString()}`,
  );
}

export async function downloadTemplate(cellId?: string) {
  const endpoint = cellId
    ? `/v1/import/template?cellId=${encodeURIComponent(cellId)}`
    : '/v1/import/template';
  return apiClient.get<{
    filename: string;
    headers: Array<{ name: string; required: boolean; description: string }>;
    description: string;
    content: string;
  }>(endpoint);
}

export async function validateImport(
  file: File,
  options?: { createdBy?: string },
): Promise<ValidateImportResponse> {
  const formData = new FormData();
  formData.append('file', file);
  if (options?.createdBy) {
    formData.append('createdBy', options.createdBy);
  }

  const endpoint = '/v1/import/jobs?validateOnly=true';

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}${endpoint}`,
    {
      method: 'POST',
      body: formData,
      credentials: 'include',
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to validate import: ${response.statusText}`);
  }

  return response.json();
}

export async function createImportJob(
  file: File,
  options: {
    createdBy?: string;
    mode: ImportMode;
    warehouseId?: string;
  },
): Promise<CreateImportJobResponse> {
  const formData = new FormData();
  formData.append('file', file);
  if (options.createdBy) {
    formData.append('createdBy', options.createdBy);
  }
  formData.append('mode', options.mode);
  if (options.warehouseId) {
    formData.append('warehouseId', options.warehouseId);
  }

  const endpoint = '/v1/import/jobs';

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}${endpoint}`,
    {
      method: 'POST',
      body: formData,
      credentials: 'include',
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to create import job: ${response.status} ${response.statusText} - ${errorText}`,
    );
  }

  return response.json();
}

export async function getImportJob(id: string): Promise<ImportJobView> {
  return apiClient.get<ImportJobView>(`/v1/import/jobs/${id}`);
}

export async function cancelImportJob(id: string): Promise<ImportJobView> {
  return apiClient.delete<ImportJobView>(`/v1/import/jobs/${id}`);
}

export interface ImportJobWithErrorsView extends ImportJobView {
  errors: Array<{
    id: string;
    jobId: string;
    rowNumber: number;
    sku: string | null;
    message: string;
    createdAt: string;
  }>;
  errorCount: number;
}

export async function getImportJobErrors(
  id: string,
  options?: { limit?: number; offset?: number },
): Promise<ImportJobWithErrorsView> {
  const params = new URLSearchParams();
  if (options?.limit != null) {
    params.set('limit', String(options.limit));
  }
  if (options?.offset != null) {
    params.set('offset', String(options.offset));
  }

  const query = params.toString();
  const endpoint = `/v1/import/jobs/${id}/errors${query ? `?${query}` : ''}`;

  return apiClient.get<ImportJobWithErrorsView>(endpoint);
}

export async function downloadErrorCsv(id: string): Promise<Blob> {
  const endpoint = `/v1/import/jobs/${id}/errors/download`;
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}${endpoint}`,
    {
      method: 'GET',
      credentials: 'include',
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to download error CSV: ${response.statusText}`);
  }

  const { content } = (await response.json()) as {
    filename: string;
    contentType: string;
    content: string;
  };

  return new Blob([content], { type: 'text/csv' });
}

export async function downloadTemplatePack() {
  const endpoint = '/v1/import/template-pack';
  return apiClient.get<{
    filename: string;
    contentType: string;
    content: string;
  }>(endpoint);
}

