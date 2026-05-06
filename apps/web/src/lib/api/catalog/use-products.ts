import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
  type UseMutationResult,
} from '@tanstack/react-query';
import { toast } from 'sonner';
import { ApiError } from '../client';
import { revalidateProductData } from './products';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  hardDeleteProduct,
  removeVariant,
  addVariant,
  updateVariant,
  addVariantImage,
  updateImage,
  removeImage,
  getVariantImages,
  reorderVariantImages,
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
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: PRODUCTS_QUERY_KEY });
      await revalidateProductData(data.slug);
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
    onSuccess: async (updatedProduct) => {
      queryClient.invalidateQueries({ queryKey: PRODUCTS_QUERY_KEY });
      await revalidateProductData(updatedProduct.slug);
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
    onSuccess: async (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: PRODUCTS_QUERY_KEY });
      // Note: Can't revalidate by slug since we only have the ID
      // The general product tag invalidation will cover this
      await revalidateProductData();
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
    onSuccess: async (result) => {
      queryClient.invalidateQueries({ queryKey: PRODUCTS_QUERY_KEY });
      // Revalidate all product pages since bulk update can affect multiple products
      await revalidateProductData();
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

export function useRemoveVariant(): UseMutationResult<void, Error, { productId: string; variantId: string }> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, variantId }) => removeVariant(productId, variantId),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: PRODUCTS_QUERY_KEY });
      await revalidateProductData();
      toast.success('Variant removed successfully');
    },
    onError: (error: Error) => {
      console.error('Failed to remove variant:', error);
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
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: PRODUCTS_QUERY_KEY });
      await revalidateProductData();
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

export function useUpdateVariant(): UseMutationResult<
  VariantView,
  Error,
  { productId: string; variantId: string; data: CreateVariantInput }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, variantId, data }) => updateVariant(productId, variantId, data),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: PRODUCTS_QUERY_KEY });
      await revalidateProductData();
      toast.success('Variant updated successfully');
    },
    onError: (error: Error) => {
      console.error('Failed to update variant:', error);
      const errorMessage =
        error instanceof ApiError ? error.getErrorMessage() : error.message;
      toast.error(errorMessage);
    },
  });
}

export function useAddVariantImage(): UseMutationResult<
  any,
  Error,
  { productId: string; variantId: string; data: { url: string; altText?: string; sortOrder?: number } }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, variantId, data }) => addVariantImage(productId, variantId, data),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: PRODUCTS_QUERY_KEY });
      await revalidateProductData();
      toast.success('Image added successfully');
    },
    onError: (error: Error) => {
      console.error('Failed to add image:', error);
      const errorMessage =
        error instanceof ApiError ? error.getErrorMessage() : error.message;
      toast.error(errorMessage);
    },
  });
}

export function useUpdateImage(): UseMutationResult<
  any,
  Error,
  { imageId: string; data: { altText?: string; sortOrder?: number; isPrimary?: boolean } }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ imageId, data }) => updateImage(imageId, data),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: PRODUCTS_QUERY_KEY });
      await revalidateProductData();
      toast.success('Image updated successfully');
    },
    onError: (error: Error) => {
      console.error('Failed to update image:', error);
      const errorMessage =
        error instanceof ApiError ? error.getErrorMessage() : error.message;
      toast.error(errorMessage);
    },
  });
}

export function useRemoveImage(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (imageId) => removeImage(imageId),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: PRODUCTS_QUERY_KEY });
      await revalidateProductData();
      toast.success('Image removed successfully');
    },
    onError: (error: Error) => {
      console.error('Failed to remove image:', error);
      const errorMessage =
        error instanceof ApiError ? error.getErrorMessage() : error.message;
      toast.error(errorMessage);
    },
  });
}

export function useReorderVariantImages(): UseMutationResult<
  void,
  Error,
  { productId: string; variantId: string; imageIds: string[] }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, variantId, imageIds }) =>
      reorderVariantImages(productId, variantId, imageIds),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: PRODUCTS_QUERY_KEY });
      await revalidateProductData();
      toast.success('Image order updated');
    },
    onError: (error: Error) => {
      console.error('Failed to reorder images:', error);
      const errorMessage =
        error instanceof ApiError ? error.getErrorMessage() : error.message;
      toast.error(errorMessage);
    },
  });
}

