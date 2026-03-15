import { useMutation, useQuery, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import {
  getCells,
  getCell,
  getCellBySlug,
  getCellsByCategorySlug,
  createCell,
  updateCell,
  deleteCell,
  assignAttributeToCell,
  removeAttributeFromCell,
  type Cell,
  type CellWithAttributes,
  type CreateCellInput,
  type UpdateCellInput,
  type AssignAttributeToCellInput,
  type CellsQueryParams,
} from './cells';
import { toast } from 'sonner';

// Query keys
export const cellKeys = {
  all: ['cells'] as const,
  lists: () => [...cellKeys.all, 'list'] as const,
  list: (params: CellsQueryParams) => [...cellKeys.lists(), params] as const,
  details: () => [...cellKeys.all, 'detail'] as const,
  detail: (id: string) => [...cellKeys.details(), id] as const,
  slug: (slug: string) => [...cellKeys.details(), slug] as const,
  category: (categorySlug: string) => ['cells', 'category', categorySlug] as const,
};

// Queries
export function useCells(params?: CellsQueryParams, options?: UseQueryOptions<Cell[]>) {
  return useQuery({
    queryKey: cellKeys.list(params || {}),
    queryFn: async () => {
      const result = await getCells(params);
      return result.data;
    },
    ...options,
  });
}

export function useCell(id: string, options?: UseQueryOptions<CellWithAttributes>) {
  return useQuery({
    queryKey: cellKeys.detail(id),
    queryFn: () => getCell(id),
    enabled: !!id,
    ...options,
  });
}

export function useCellBySlug(slug: string, options?: UseQueryOptions<CellWithAttributes>) {
  return useQuery({
    queryKey: cellKeys.slug(slug),
    queryFn: () => getCellBySlug(slug),
    enabled: !!slug,
    ...options,
  });
}

export function useCellsByCategorySlug(
  categorySlug: string,
  options?: UseQueryOptions<Cell[]>,
) {
  return useQuery({
    queryKey: cellKeys.category(categorySlug),
    queryFn: () => getCellsByCategorySlug(categorySlug),
    enabled: !!categorySlug,
    ...options,
  });
}

// Mutations
export function useCreateCell() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCellInput) => createCell(data),
    onSuccess: (data) => {
      // Invalidate all cell list queries
      queryClient.invalidateQueries({ queryKey: cellKeys.all });
      if (data.categoryId) {
        queryClient.invalidateQueries({
          queryKey: ['categories', 'detail', data.categoryId],
        });
      }
      toast.success('Cell created successfully');
    },
    onError: (error) => {
      toast.error(`Failed to create cell: ${error instanceof Error ? error.message : 'Unknown error'}`);
    },
  });
}

export function useUpdateCell() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCellInput }) =>
      updateCell(id, data),
    onSuccess: (data) => {
      // Invalidate all cell list queries
      queryClient.invalidateQueries({ queryKey: cellKeys.all });
      queryClient.invalidateQueries({ queryKey: cellKeys.detail(data.id) });
      if (data.categoryId) {
        queryClient.invalidateQueries({
          queryKey: ['categories', 'detail', data.categoryId],
        });
      }
      toast.success('Cell updated successfully');
    },
    onError: (error) => {
      toast.error(`Failed to update cell: ${error instanceof Error ? error.message : 'Unknown error'}`);
    },
  });
}

export function useDeleteCell() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteCell(id),
    onSuccess: () => {
      // Invalidate all cell list queries
      queryClient.invalidateQueries({ queryKey: cellKeys.all });
      toast.success('Cell deleted successfully');
    },
    onError: (error) => {
      toast.error(`Failed to delete cell: ${error instanceof Error ? error.message : 'Unknown error'}`);
    },
  });
}

export function useAssignAttributeToCell() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ cellId, data }: { cellId: string; data: AssignAttributeToCellInput }) =>
      assignAttributeToCell(cellId, data),
    onSuccess: (data, variables) => {
      // Invalidate all cell queries
      queryClient.invalidateQueries({ queryKey: cellKeys.all });
      toast.success('Attribute assigned to cell successfully');
    },
    onError: (error) => {
      toast.error(`Failed to assign attribute: ${error instanceof Error ? error.message : 'Unknown error'}`);
    },
  });
}

export function useRemoveAttributeFromCell() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ cellId, attributeId }: { cellId: string; attributeId: string }) =>
      removeAttributeFromCell(cellId, attributeId),
    onSuccess: (data, variables) => {
      // Invalidate all cell queries
      queryClient.invalidateQueries({ queryKey: cellKeys.all });
      toast.success('Attribute removed from cell successfully');
    },
    onError: (error) => {
      toast.error(`Failed to remove attribute: ${error instanceof Error ? error.message : 'Unknown error'}`);
    },
  });
}
