import { apiClient } from '../client';
import { API_BASE_URL } from '../client';
import type {
  AssignAttributeToCategoryInput,
  AttributeOptionView,
  AttributeView,
  CategoryAttributeView,
  CreateAttributeInput,
  CreateAttributeOptionInput,
  UpdateAttributeInput,
  UpdateAttributeOptionInput,
  UnitSummary,
} from './types';

export async function getUnits(): Promise<UnitSummary[]> {
  return apiClient.get<UnitSummary[]>('/v1/catalog/units');
}

export async function getCategoryAttributes(
  categoryId: string,
): Promise<CategoryAttributeView[]> {
  return apiClient.get<CategoryAttributeView[]>(
    `/v1/catalog/categories/${categoryId}/attributes`,
  );
}

export async function createAttribute(
  data: CreateAttributeInput,
): Promise<AttributeView> {
  return apiClient.post<AttributeView>('/v1/catalog/attributes', data);
}

export interface AttributeListResponse {
  data: AttributeView[];
  total: number;
}

export interface AttributeListParams {
  skip?: number;
  take?: number;
  search?: string;
}

export async function getAllAttributes(
  params?: AttributeListParams,
): Promise<AttributeListResponse> {
  const queryParams = new URLSearchParams();
  if (params?.skip != null) {
    queryParams.set('skip', String(params.skip));
  }
  if (params?.take != null) {
    queryParams.set('take', String(params.take));
  }
  if (params?.search) {
    queryParams.set('search', params.search);
  }

  const query = queryParams.toString();
  const endpoint = `/v1/catalog/attributes${query ? `?${query}` : ''}`;

  return apiClient.get<AttributeListResponse>(endpoint);
}

export async function updateAttribute(
  id: string,
  data: UpdateAttributeInput,
): Promise<AttributeView> {
  return apiClient.patch<AttributeView>(`/v1/catalog/attributes/${id}`, data);
}

export async function deleteAttribute(
  id: string,
): Promise<void> {
  return apiClient.delete<void>(`/v1/catalog/attributes/${id}`);
}

export async function assignAttributeToCategory(
  categoryId: string,
  data: AssignAttributeToCategoryInput,
): Promise<{ id: string }> {
  return apiClient.post<{ id: string }>(
    `/v1/catalog/categories/${categoryId}/attributes`,
    data,
  );
}

export async function removeAttributeFromCategory(
  categoryId: string,
  assignmentId: string,
): Promise<void> {
  return apiClient.delete<void>(
    `/v1/catalog/categories/${categoryId}/attributes/${assignmentId}`,
  );
}

export async function getAttributeOptions(
  attributeId: string,
): Promise<AttributeOptionView[]> {
  return apiClient.get<AttributeOptionView[]>(
    `/v1/catalog/attributes/${attributeId}/options`,
  );
}

export async function createAttributeOption(
  attributeId: string,
  data: CreateAttributeOptionInput,
): Promise<AttributeOptionView> {
  return apiClient.post<AttributeOptionView>(
    `/v1/catalog/attributes/${attributeId}/options`,
    data,
  );
}

export async function updateAttributeOption(
  attributeId: string,
  optionId: string,
  data: UpdateAttributeOptionInput,
): Promise<AttributeOptionView> {
  return apiClient.patch<AttributeOptionView>(
    `/v1/catalog/attributes/${attributeId}/options/${optionId}`,
    data,
  );
}

export async function deleteAttributeOption(
  attributeId: string,
  optionId: string,
): Promise<void> {
  return apiClient.delete<void>(
    `/v1/catalog/attributes/${attributeId}/options/${optionId}`,
  );
}

export interface AttributeImportResult {
  totalRows: number;
  successRows: number;
  failedRows: number;
  skippedAttributes: string[];
  createdAttributes: string[];
  updatedAttributes: string[];
  createdOptions: number;
  updatedOptions: number;
  errors: Array<{
    rowNumber: number;
    slug?: string;
    message: string;
  }>;
}

export interface AttributeTemplate {
  filename: string;
  headers: {
    attributes: string[];
    options: string[];
  };
  description: string;
  files: {
    attributes: {
      filename: string;
      content: string;
    };
    options: {
      filename: string;
      content: string;
    };
  };
}

export async function uploadAttributesCsv(
  file: File,
  options?: { validateOnly?: boolean; conflictMode?: 'skip' | 'replace' | 'add_anyway' },
): Promise<AttributeImportResult> {
  const formData = new FormData();
  formData.append('file', file);

  const url = new URL(`${API_BASE_URL}/v1/catalog/attributes/import`);
  if (options?.validateOnly) {
    url.searchParams.set('validateOnly', 'true');
  }
  if (options?.conflictMode) {
    url.searchParams.set('conflictMode', options.conflictMode);
  }

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      // Don't set Content-Type, let FormData set it with boundary
    },
    body: formData,
    credentials: 'include',
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Upload failed');
  }

  return response.json();
}

export interface AttributeZipImportResult {
  jobId: string;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  message: string;
}

export async function uploadAttributesZip(
  file: File,
  options?: { conflictMode?: 'skip' | 'replace' | 'add_anyway' },
): Promise<AttributeZipImportResult> {
  console.log('[uploadAttributesZip] Starting ZIP upload:', file.name)
  const formData = new FormData();
  formData.append('file', file);

  const url = new URL(`${API_BASE_URL}/v1/catalog/attributes/import`);
  if (options?.conflictMode) {
    url.searchParams.set('conflictMode', options.conflictMode);
  }

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      // Don't set Content-Type, let FormData set it with boundary
    },
    body: formData,
    credentials: 'include',
  });

  console.log('[uploadAttributesZip] Response status:', response.status)

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[uploadAttributesZip] Error:', errorText)
    throw new Error(errorText || 'Upload failed');
  }

  const result = await response.json();
  console.log('[uploadAttributesZip] Response:', result)
  return result;
}

export async function getAttributeTemplate(): Promise<AttributeTemplate> {
  return apiClient.get<AttributeTemplate>('/v1/catalog/attributes/import/template');
}

export async function downloadAttributeTemplate(): Promise<Blob> {
  const response = await fetch(`${API_BASE_URL}/v1/catalog/attributes/import/template/download`, {
    method: 'GET',
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to download template');
  }

  return response.blob();
}
