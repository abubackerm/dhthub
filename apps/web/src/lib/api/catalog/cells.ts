import { apiClient } from '../client';
import type {
  Cell,
  CellWithAttributes,
  CreateCellInput,
  UpdateCellInput,
  AssignAttributeToCellInput,
  CellsQueryParams,
  PaginatedResponse,
} from './types';

export async function getCells(params?: CellsQueryParams): Promise<PaginatedResponse<Cell>> {
  const searchParams = new URLSearchParams();
  if (params?.categoryId) searchParams.append('categoryId', params.categoryId);
  if (params?.activeOnly !== undefined) searchParams.append('activeOnly', String(params.activeOnly));
  if (params?.page) searchParams.append('page', String(params.page));
  if (params?.pageSize) searchParams.append('pageSize', String(params.pageSize));

  const queryString = searchParams.toString();
  return apiClient.get<PaginatedResponse<Cell>>(
    `/v1/admin/cells${queryString ? `?${queryString}` : ''}`,
  );
}

export async function getCell(id: string): Promise<CellWithAttributes> {
  return apiClient.get<CellWithAttributes>(`/v1/admin/cells/${id}`);
}

export async function getCellBySlug(slug: string): Promise<CellWithAttributes> {
  return apiClient.get<CellWithAttributes>(`/v1/catalog/cells/${slug}`);
}

export async function getCellsByCategorySlug(categorySlug: string): Promise<Cell[]> {
  return apiClient.get<Cell[]>(`/v1/catalog/categories/${categorySlug}/cells`);
}

export async function createCell(data: CreateCellInput): Promise<Cell> {
  return apiClient.post<Cell>('/v1/admin/cells', data);
}

export async function updateCell(id: string, data: UpdateCellInput): Promise<Cell> {
  return apiClient.patch<Cell>(`/v1/admin/cells/${id}`, data);
}

export async function deleteCell(id: string): Promise<void> {
  return apiClient.delete<void>(`/v1/admin/cells/${id}`);
}

export async function assignAttributeToCell(
  cellId: string,
  data: AssignAttributeToCellInput,
): Promise<CellWithAttributes> {
  return apiClient.post<CellWithAttributes>(`/v1/admin/cells/${cellId}/attributes`, data);
}

export async function removeAttributeFromCell(
  cellId: string,
  attributeId: string,
): Promise<void> {
  return apiClient.delete<void>(`/v1/admin/cells/${cellId}/attributes/${attributeId}`);
}

export async function getCellAttributes(cellId: string) {
  const cellAttributes = await apiClient.get<
    Array<{
      id: string;
      attribute: {
        id: string;
        name: string;
        slug: string;
        dataType: string;
        isRequired: boolean;
        unit?: {
          id: string;
          name: string;
          symbol: string;
        } | null;
        options?: Array<{
          id: string;
          value: string;
          label: string;
        }>;
      };
      displayOrder: number;
    }>
  >(`/v1/admin/cells/${cellId}/attributes`);

  return cellAttributes.map((item) => ({
    id: item.attribute.id,
    name: item.attribute.name,
    slug: item.attribute.slug,
    dataType: item.attribute.dataType,
    isRequired: item.attribute.isRequired,
    options: item.attribute.options,
  }));
}
