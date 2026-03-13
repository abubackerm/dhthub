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

export async function updateAttribute(
  id: string,
  data: UpdateAttributeInput,
): Promise<AttributeView> {
  return apiClient.patch<AttributeView>(`/v1/catalog/attributes/${id}`, data);
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
