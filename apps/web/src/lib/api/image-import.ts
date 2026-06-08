import { apiClient } from './client';

export interface ImageImportResponse {
  jobId: string;
  fileUrl: string;
  fileName: string;
  fileSize: number;
}

export interface ImageImportStatus {
  id: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  totalFiles: number;
  processedFiles: number;
  successFiles: number;
  failedFiles: number;
  errors: Array<{
    filename: string;
    message: string;
  }>;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  finishedAt: string | null;
}

export async function uploadImageZip(
  file: File,
): Promise<ImageImportResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const endpoint = '/v1/import/images';
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
      `Failed to create image import job: ${response.status} ${response.statusText} - ${errorText}`,
    );
  }

  return response.json();
}

export async function getImageImportStatus(
  jobId: string,
): Promise<ImageImportStatus> {
  return apiClient.get<ImageImportStatus>(`/v1/import/images/${jobId}/status`);
}
