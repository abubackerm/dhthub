import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
  type UseMutationResult,
} from '@tanstack/react-query';
import { toast } from 'sonner';
import { ApiError } from '../client';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  hardDeleteProduct,
  addVariant,
  bulkUpdateProducts,
  type ProductView,
  type CreateProductInput,
  type UpdateProductInput,
  type BulkUpdateProductInput,
  type BulkUpdateResult,
  type CreateVariantInput,
  type ProductsQueryParams,
  type PaginatedResponse,
  type VariantView,
} from './';

export const PRODUCTS_QUERY_KEY = ['products'];

export function useProducts(
  params: ProductsQueryParams = {},
): UseQueryResult<PaginatedResponse<ProductView>, Error> {
  return useQuery({
    queryKey: [...PRODUCTS_QUERY_KEY, params],
    queryFn: () => getProducts(params),
  });
}

export function useProduct(
  id: string,
): UseQueryResult<ProductView, Error> {
  return useQuery({
    queryKey: [...PRODUCTS_QUERY_KEY, id],
    queryFn: () => getProductById(id),
    enabled: !!id,
  });
}

export function useCreateProduct(): UseMutationResult<
  ProductView,
  Error,
  CreateProductInput
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRODUCTS_QUERY_KEY });
      toast.success('Product created successfully');
    },
    onError: (error: Error) => {
      console.error('Failed to create product:', error);
      const errorMessage =
        error instanceof ApiError ? error.getErrorMessage() : error.message;
      toast.error(errorMessage);
    },
  });
}

export function useUpdateProduct(): UseMutationResult<
  ProductView,
  Error,
  { id: string; data: UpdateProductInput }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => updateProduct(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRODUCTS_QUERY_KEY });
      toast.success('Product updated successfully');
    },
    onError: (error: Error) => {
      console.error('Failed to update product:', error);
      const errorMessage =
        error instanceof ApiError ? error.getErrorMessage() : error.message;
      toast.error(errorMessage);
    },
  });
}

export function useDeleteProduct(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: hardDeleteProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRODUCTS_QUERY_KEY });
      toast.success('Product deleted successfully');
    },
    onError: (error: Error) => {
      console.error('Failed to delete product:', error);
      const errorMessage =
        error instanceof ApiError ? error.getErrorMessage() : error.message;
      toast.error(errorMessage);
    },
  });
}

export function useBulkUpdateProducts(): UseMutationResult<
  BulkUpdateResult,
  Error,
  BulkUpdateProductInput
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: bulkUpdateProducts,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: PRODUCTS_QUERY_KEY });
      toast.success(`${result.updatedCount} product(s) updated`);
    },
    onError: (error: Error) => {
      console.error('Bulk update failed:', error);
      const errorMessage =
        error instanceof ApiError ? error.getErrorMessage() : error.message;
      toast.error(errorMessage);
    },
  });
}

export function useAddVariant(): UseMutationResult<
  VariantView,
  Error,
  { productId: string; data: CreateVariantInput }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, data }) => addVariant(productId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRODUCTS_QUERY_KEY });
      toast.success('Variant added successfully');
    },
    onError: (error: Error) => {
      console.error('Failed to add variant:', error);
      const errorMessage =
        error instanceof ApiError ? error.getErrorMessage() : error.message;
      toast.error(errorMessage);
    },
  });
}
