import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
  type UseMutationResult,
} from '@tanstack/react-query';
import { toast } from 'sonner';
import { ApiError } from '../client';

export const CATEGORY_TOO_MANY_LEAVES_CODE = 'CATEGORY_TOO_MANY_LEAVES';

export function isCategoryTooManyLeavesError(error: unknown): boolean {
  if (!(error instanceof ApiError)) return false;
  return error.status === 413;
}

export function getCategoryTooManyLeavesMessage(error: ApiError): string | undefined {
  if (error.status !== 413) return undefined;
  return error.getErrorMessage();
}
import {
  getCategories,
  getCategoryTree,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  getLeafPageData,
  getConsolidatedLeafData,
  getAggregatedFilterData,
  getSimpleProductsBySlug,
  type Category,
  type CategoryTreeNode,
  type CreateCategoryInput,
  type UpdateCategoryInput,
  type LeafPageView,
  type ConsolidatedLeafPageView,
  type AggregatedFilterDataView,
  type SimpleProductView,
} from './';

export const CATEGORIES_QUERY_KEY = ['categories'];
export const CATEGORY_TREE_QUERY_KEY = ['category-tree'];
export const LEAF_PAGE_DATA_QUERY_KEY = ['leaf-page-data'];

export function useCategories(): UseQueryResult<Category[], Error> {
  return useQuery({
    queryKey: CATEGORIES_QUERY_KEY,
    queryFn: getCategories,
  });
}

export function useCategoryTree(options?: { maxDepth?: number }): UseQueryResult<CategoryTreeNode[], Error> {
  return useQuery({
    queryKey: CATEGORY_TREE_QUERY_KEY,
    queryFn: () => getCategoryTree(options),
    staleTime: 5 * 60 * 1000, // 5 minutes - category tree changes infrequently
    gcTime: 10 * 60 * 1000, // 10 minutes - keep cached data longer
    refetchOnWindowFocus: false, // Don't refetch when tab regains focus
    refetchOnMount: false, // Don't refetch on component mount if data exists
  });
}

export function useCategory(id: string): UseQueryResult<Category, Error> {
  return useQuery({
    queryKey: ['category', id],
    queryFn: () => getCategoryById(id),
    enabled: !!id,
  });
}

export function useLeafPageData(slug?: string): UseQueryResult<LeafPageView, Error> {
  return useQuery({
    queryKey: [...LEAF_PAGE_DATA_QUERY_KEY, slug],
    queryFn: () => getLeafPageData(slug!),
    enabled: !!slug,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useConsolidatedLeafData(slug?: string): UseQueryResult<ConsolidatedLeafPageView, Error> {
  return useQuery({
    queryKey: [...LEAF_PAGE_DATA_QUERY_KEY, 'consolidated', slug],
    queryFn: () => getConsolidatedLeafData(slug!),
    enabled: !!slug,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useAggregatedFilterData(slug?: string): UseQueryResult<AggregatedFilterDataView, Error> {
  return useQuery({
    queryKey: [...LEAF_PAGE_DATA_QUERY_KEY, 'filter-data', slug],
    queryFn: () => getAggregatedFilterData(slug!),
    enabled: !!slug, // Only fetch if slug is provided
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useCreateCategory(): UseMutationResult<
  Category,
  Error,
  CreateCategoryInput
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCategory,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: CATEGORY_TREE_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: LEAF_PAGE_DATA_QUERY_KEY });
      toast.success('Category created successfully');
    },
    onError: (error: Error) => {
      console.error('Failed to create category:', error);

      let errorMessage = 'Failed to create category';

      if (error instanceof ApiError) {
        errorMessage = error.getErrorMessage();
      } else {
        errorMessage = error.message;
      }

      toast.error(errorMessage);
    },
  });
}

export function useUpdateCategory(): UseMutationResult<
  Category,
  Error,
  { id: string; data: UpdateCategoryInput }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => updateCategory(id, data),
    onSuccess: (updatedCategory) => {
      queryClient.invalidateQueries({ queryKey: CATEGORY_TREE_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: LEAF_PAGE_DATA_QUERY_KEY });
      toast.success('Category updated successfully');
    },
    onError: (error: Error) => {
      console.error('Failed to update category:', error);

      let errorMessage = 'Failed to update category';

      if (error instanceof ApiError) {
        errorMessage = error.getErrorMessage();
      } else {
        errorMessage = error.message;
      }

      toast.error(errorMessage);
    },
  });
}

export function useSimpleProductsBySlug(
  slug?: string,
): UseQueryResult<SimpleProductView[], Error> {
  return useQuery({
    queryKey: [...LEAF_PAGE_DATA_QUERY_KEY, 'simple-products', slug],
    queryFn: () => getSimpleProductsBySlug(slug!),
    enabled: !!slug,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useDeleteCategory(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATEGORY_TREE_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: LEAF_PAGE_DATA_QUERY_KEY });
      toast.success('Category deleted successfully');
    },
    onError: (error: Error) => {
      console.error('Failed to delete category:', {
        message: error.message,
        stack: error.stack,
      });

      let errorMessage = 'Failed to delete category';

      if (error instanceof ApiError) {
        errorMessage = error.getErrorMessage();
      } else {
        errorMessage = error.message;
      }

      toast.error(errorMessage);
    },
  });
}
