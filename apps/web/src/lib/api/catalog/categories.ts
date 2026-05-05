import { apiClient } from '../client';
import { serverFetch } from '../server-fetch';
import type {
  Category,
  CategoryTreeNode,
  CreateCategoryInput,
  UpdateCategoryInput,
  LeafPageView,
  ConsolidatedLeafPageView,
  AggregatedFilterDataView,
} from './types';

export const CACHE_TAG_CATALOG = 'catalog';

export async function getCategories(): Promise<Category[]> {
  return apiClient.get<Category[]>('/v1/catalog/categories');
}

export async function getCategoryTree(options?: { maxDepth?: number }): Promise<CategoryTreeNode[]> {
  const params = new URLSearchParams();
  if (options?.maxDepth !== undefined) {
    params.set('maxDepth', String(options.maxDepth));
  }
  const qs = params.toString();
  const url = `/v1/catalog/categories/tree${qs ? `?${qs}` : ''}`;
  return apiClient.get<CategoryTreeNode[]>(url);
}

export interface CategorySlugLookupResult {
  category: Category;
  ancestors: Category[];
  hasChildren: boolean;
}

export async function getCategoryBySlugLookup(slug: string): Promise<CategorySlugLookupResult> {
  return apiClient.get<CategorySlugLookupResult>(`/v1/catalog/categories/${slug}/lookup`);
}

export async function getServerCategoryBySlugLookup(slug: string): Promise<CategorySlugLookupResult> {
  return serverFetch<CategorySlugLookupResult>(`/v1/catalog/categories/${slug}/lookup`, {
    tags: [CACHE_TAG_CATALOG],
  });
}

export async function getServerCategoryTree(options?: { maxDepth?: number }): Promise<CategoryTreeNode[]> {
  const params = new URLSearchParams();
  if (options?.maxDepth !== undefined) {
    params.set('maxDepth', String(options.maxDepth));
  }
  const qs = params.toString();
  const url = `/v1/catalog/categories/tree${qs ? `?${qs}` : ''}`;
  return serverFetch<CategoryTreeNode[]>(url, {
    tags: [CACHE_TAG_CATALOG],
  });
}

export async function getCategoryById(id: string): Promise<Category> {
  return apiClient.get<Category>(`/v1/catalog/categories/${id}`);
}

export async function getLeafPageData(slug: string): Promise<LeafPageView> {
  return apiClient.get<LeafPageView>(`/v1/catalog/categories/${slug}/leaf-data`);
}

export async function getConsolidatedLeafData(slug: string): Promise<ConsolidatedLeafPageView> {
  return apiClient.get<ConsolidatedLeafPageView>(`/v1/catalog/categories/${slug}/consolidated-leaf-data`);
}

export async function getAggregatedFilterData(slug: string): Promise<AggregatedFilterDataView> {
  return apiClient.get<AggregatedFilterDataView>(`/v1/catalog/categories/${slug}/filter-data`);
}

export async function getServerLeafPageData(slug: string): Promise<LeafPageView> {
  return serverFetch<LeafPageView>(`/v1/catalog/categories/${slug}/leaf-data`, {
    tags: [CACHE_TAG_CATALOG],
  });
}

export async function getServerConsolidatedLeafData(slug: string): Promise<ConsolidatedLeafPageView> {
  return serverFetch<ConsolidatedLeafPageView>(`/v1/catalog/categories/${slug}/consolidated-leaf-data`, {
    tags: [CACHE_TAG_CATALOG],
  });
}

export async function getServerAggregatedFilterData(slug: string): Promise<AggregatedFilterDataView> {
  return serverFetch<AggregatedFilterDataView>(`/v1/catalog/categories/${slug}/filter-data`, {
    tags: [CACHE_TAG_CATALOG],
  });
}

export async function createCategory(
  data: CreateCategoryInput,
): Promise<Category> {
  return apiClient.post<Category>('/v1/catalog/categories', data);
}

export async function updateCategory(
  id: string,
  data: UpdateCategoryInput,
): Promise<Category> {
  return apiClient.patch<Category>(`/v1/catalog/categories/${id}`, data);
}

export async function deleteCategory(id: string): Promise<void> {
  return apiClient.delete<void>(`/v1/catalog/categories/${id}`);
}

// Category Import APIs
export interface CategoryImportResult {
  totalRows: number;
  successRows: number;
  failedRows: number;
  createdCategories: Array<{
    id: string;
    name: string;
    sku: string;
    path: string;
  }>;
  createdCells: Array<{
    id: string;
    name: string;
    sku: string;
    path: string;
  }>;
  updatedCategories?: Array<{
    id: string;
    name: string;
    sku: string;
    path: string;
  }>;
  errors: Array<{
    rowNumber: number;
    name?: string;
    sku?: string;
    errorType: 'DUPLICATE_SLUG' | 'INVALID_PARENT_SKU' | 'BRANCH_LEAF_CONFLICT' | 'VALIDATION_ERROR';
    message: string;
  }>;
}

export interface CategoryCreateImportResponse {
  jobId: string;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  totalRows: number;
}

export interface CategoryUpdateImportResponse {
  jobId: string;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  totalRows: number;
}

export async function createCategoryImportJob(
  file: File,
  mode: 'CREATE' | 'UPDATE' | 'EDIT',
): Promise<CategoryCreateImportResponse | CategoryUpdateImportResponse> {
  const formData = new FormData();
  formData.append('file', file);
  
  if (mode === 'CREATE') {
    formData.append('importType', 'CATEGORY_CREATE');
  } else if (mode === 'UPDATE') {
    formData.append('importType', 'CATEGORY_UPDATE');
  } else if (mode === 'EDIT') {
    formData.append('importType', 'CATEGORY_EDIT');
  }

  const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/v1/import/jobs`;

  const response = await fetch(url, {
    method: 'POST',
    body: formData,
    credentials: 'include',
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Failed to create import job');
  }

  return response.json();
}

export async function getCategoryImportResults(jobId: string): Promise<CategoryImportResult> {
  const response = await apiClient.get<{
    successRows: number;
    failedRows: number;
    errors: Array<{
      rowNumber: number;
      sku?: string;
      message: string;
    }>;
  }>(`/v1/import/jobs/${jobId}/errors`);

  // Transform backend error format to frontend format
  return {
    totalRows: response.successRows + response.failedRows,
    successRows: response.successRows,
    failedRows: response.failedRows,
    createdCategories: [], // Populated from error records in full implementation
    createdCells: [],
    errors: response.errors.map((e) => ({
      rowNumber: e.rowNumber,
      sku: e.sku,
      errorType: 'VALIDATION_ERROR' as const,
      message: e.message,
    })),
  };
}

export async function downloadCategoryImportErrors(jobId: string): Promise<Blob> {
  const endpoint = `/v1/import/jobs/${jobId}/errors/download`;
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

  const { content } = await response.json() as {
    filename: string;
    contentType: string;
    content: string;
  };

  return new Blob([content], { type: 'text/csv' });
}
