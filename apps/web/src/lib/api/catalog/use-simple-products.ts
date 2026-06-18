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
  getSimpleProductsByCategory,
  getSimpleProduct,
  createSimpleProduct,
  updateSimpleProduct,
  deleteSimpleProduct,
  addSimpleProductImage,
  getSimpleProductImages,
  updateSimpleProductImage,
  deleteSimpleProductImage,
  getSimpleProductAttributeValues,
  setSimpleProductAttributeValue,
  removeSimpleProductAttributeValue,
  type SimpleProductView,
  type SimpleProductImage,
  type SimpleProductAttributeValueView,
  type CreateSimpleProductInput,
  type UpdateSimpleProductInput,
  type CreateSimpleProductImageInput,
  type UpdateSimpleProductImageInput,
  type SetSimpleProductAttributeInput,
} from './';

export const SIMPLE_PRODUCTS_QUERY_KEY = ['simple-products'];
export const SIMPLE_PRODUCT_IMAGES_QUERY_KEY = ['simple-product-images'];

export function useSimpleProducts(
  categoryId: string,
): UseQueryResult<SimpleProductView[], Error> {
  return useQuery({
    queryKey: [...SIMPLE_PRODUCTS_QUERY_KEY, 'list', categoryId],
    queryFn: () => getSimpleProductsByCategory(categoryId),
    enabled: !!categoryId,
  });
}

export function useSimpleProduct(
  categoryId: string,
  productId: string,
): UseQueryResult<SimpleProductView, Error> {
  return useQuery({
    queryKey: [...SIMPLE_PRODUCTS_QUERY_KEY, 'detail', categoryId, productId],
    queryFn: () => getSimpleProduct(categoryId, productId),
    enabled: !!categoryId && !!productId,
  });
}

export function useCreateSimpleProduct(
  categoryId: string,
): UseMutationResult<SimpleProductView, Error, CreateSimpleProductInput> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => createSimpleProduct(categoryId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...SIMPLE_PRODUCTS_QUERY_KEY, 'list', categoryId],
      });
      toast.success('Simple product created successfully');
    },
    onError: (error: Error) => {
      console.error('Failed to create simple product:', error);
      const errorMessage =
        error instanceof ApiError ? error.getErrorMessage() : error.message;
      toast.error(errorMessage);
    },
  });
}

export function useUpdateSimpleProduct(
  categoryId: string,
): UseMutationResult<
  SimpleProductView,
  Error,
  { productId: string; data: UpdateSimpleProductInput }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, data }) =>
      updateSimpleProduct(categoryId, productId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...SIMPLE_PRODUCTS_QUERY_KEY, 'list', categoryId],
      });
      toast.success('Simple product updated successfully');
    },
    onError: (error: Error) => {
      console.error('Failed to update simple product:', error);
      const errorMessage =
        error instanceof ApiError ? error.getErrorMessage() : error.message;
      toast.error(errorMessage);
    },
  });
}

export function useDeleteSimpleProduct(
  categoryId: string,
): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (productId) => deleteSimpleProduct(categoryId, productId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...SIMPLE_PRODUCTS_QUERY_KEY, 'list', categoryId],
      });
      toast.success('Simple product deleted successfully');
    },
    onError: (error: Error) => {
      console.error('Failed to delete simple product:', error);
      const errorMessage =
        error instanceof ApiError ? error.getErrorMessage() : error.message;
      toast.error(errorMessage);
    },
  });
}

// ============================================
// Image hooks
// ============================================

export function useSimpleProductImages(
  categoryId: string,
  productId: string,
): UseQueryResult<SimpleProductImage[], Error> {
  return useQuery({
    queryKey: [...SIMPLE_PRODUCT_IMAGES_QUERY_KEY, 'list', categoryId, productId],
    queryFn: () => getSimpleProductImages(categoryId, productId),
    enabled: !!categoryId && !!productId,
  });
}

export function useAddSimpleProductImage(
  categoryId: string,
  productId: string,
): UseMutationResult<SimpleProductImage, Error, CreateSimpleProductImageInput> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => addSimpleProductImage(categoryId, productId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...SIMPLE_PRODUCT_IMAGES_QUERY_KEY, 'list', categoryId, productId],
      });
      queryClient.invalidateQueries({
        queryKey: [...SIMPLE_PRODUCTS_QUERY_KEY, 'detail', categoryId, productId],
      });
      queryClient.invalidateQueries({
        queryKey: [...SIMPLE_PRODUCTS_QUERY_KEY, 'list', categoryId],
      });
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

export function useUpdateSimpleProductImage(
  categoryId: string,
  productId: string,
): UseMutationResult<
  SimpleProductImage,
  Error,
  { imageId: string; data: UpdateSimpleProductImageInput }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ imageId, data }) =>
      updateSimpleProductImage(categoryId, productId, imageId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...SIMPLE_PRODUCT_IMAGES_QUERY_KEY, 'list', categoryId, productId],
      });
      queryClient.invalidateQueries({
        queryKey: [...SIMPLE_PRODUCTS_QUERY_KEY, 'detail', categoryId, productId],
      });
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

export function useDeleteSimpleProductImage(
  categoryId: string,
  productId: string,
): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (imageId) =>
      deleteSimpleProductImage(categoryId, productId, imageId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...SIMPLE_PRODUCT_IMAGES_QUERY_KEY, 'list', categoryId, productId],
      });
      queryClient.invalidateQueries({
        queryKey: [...SIMPLE_PRODUCTS_QUERY_KEY, 'detail', categoryId, productId],
      });
      queryClient.invalidateQueries({
        queryKey: [...SIMPLE_PRODUCTS_QUERY_KEY, 'list', categoryId],
      });
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

// ============================================
// Attribute Value hooks
// ============================================

export const SIMPLE_PRODUCT_ATTRIBUTES_QUERY_KEY = ['simple-product-attributes'];

export function useSimpleProductAttributeValues(
  categoryId: string,
  productId: string,
): UseQueryResult<SimpleProductAttributeValueView[], Error> {
  return useQuery({
    queryKey: [...SIMPLE_PRODUCT_ATTRIBUTES_QUERY_KEY, 'list', categoryId, productId],
    queryFn: () => getSimpleProductAttributeValues(categoryId, productId),
    enabled: !!categoryId && !!productId,
  });
}

export function useSetSimpleProductAttribute(
  categoryId: string,
  productId: string,
): UseMutationResult<
  SimpleProductAttributeValueView,
  Error,
  SetSimpleProductAttributeInput
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => setSimpleProductAttributeValue(categoryId, productId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...SIMPLE_PRODUCT_ATTRIBUTES_QUERY_KEY, 'list', categoryId, productId],
      });
      queryClient.invalidateQueries({
        queryKey: [...SIMPLE_PRODUCTS_QUERY_KEY, 'list', categoryId],
      });
      toast.success('Attribute value saved');
    },
    onError: (error: Error) => {
      console.error('Failed to set attribute value:', error);
      const errorMessage =
        error instanceof ApiError ? error.getErrorMessage() : error.message;
      toast.error(errorMessage);
    },
  });
}

export function useRemoveSimpleProductAttribute(
  categoryId: string,
  productId: string,
): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (attributeId) =>
      removeSimpleProductAttributeValue(categoryId, productId, attributeId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...SIMPLE_PRODUCT_ATTRIBUTES_QUERY_KEY, 'list', categoryId, productId],
      });
      queryClient.invalidateQueries({
        queryKey: [...SIMPLE_PRODUCTS_QUERY_KEY, 'list', categoryId],
      });
      toast.success('Attribute removed');
    },
    onError: (error: Error) => {
      console.error('Failed to remove attribute:', error);
      const errorMessage =
        error instanceof ApiError ? error.getErrorMessage() : error.message;
      toast.error(errorMessage);
    },
  });
}
