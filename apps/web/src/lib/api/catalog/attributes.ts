import { apiClient } from '../client';
import type {
  AssignAttributeToCategoryInput,
  AttributeOptionView,
  AttributeView,
  CategoryAttributeView,
  CreateAttributeInput,
  CreateAttributeOptionInput,
  UpdateAttributeInput,
  UpdateAttributeOptionInput,
} from './types';

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

export async function getAllAttributes(): Promise<AttributeView[]> {
  return apiClient.get<AttributeView[]>('/v1/catalog/attributes');
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
  options?: { validateOnly?: boolean },
): Promise<AttributeImportResult> {
  const formData = new FormData();
  formData.append('file', file);

  const url = new URL(`${apiClient.defaults.baseURL}/v1/catalog/attributes/import`);
  if (options?.validateOnly) {
    url.searchParams.set('validateOnly', 'true');
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

export async function getAttributeTemplate(): Promise<AttributeTemplate> {
  return apiClient.get<AttributeTemplate>('/v1/catalog/attributes/import/template');
}

export async function downloadAttributeTemplate(): Promise<Blob> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/v1/catalog/attributes/import/template/download`, {
    method: 'GET',
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to download template');
  }

  return response.blob();
}
