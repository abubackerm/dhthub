import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
  type UseMutationResult,
} from '@tanstack/react-query';
import { toast } from 'sonner';
import { authClient } from '@/lib/auth-client';
import { ApiError } from '../client';
import {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  type CartView,
  type CartItemView,
  type AddCartItemDto,
} from './cart';

const CART_QUERY_KEY = ['cart'] as const;

export function useCart(): UseQueryResult<CartView, Error> {
  const { data: session } = authClient.useSession();
  const isAuthenticated = !!session?.user;

  return useQuery({
    queryKey: CART_QUERY_KEY,
    queryFn: getCart,
    staleTime: 1000 * 60, // 1 minute
    enabled: isAuthenticated,
  });
}

export function useAddToCart(): UseMutationResult<
  CartItemView,
  Error,
  AddCartItemDto
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: addToCart,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY });
      toast.success('Item added to cart');
    },
    onError: (error: Error) => {
      console.error('Failed to add item to cart:', error);
      const errorMessage =
        error instanceof ApiError ? error.getErrorMessage() : error.message;
      toast.error(errorMessage);
    },
  });
}

export function useUpdateCartItem(): UseMutationResult<
  CartItemView,
  Error,
  { id: string; qty: number }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, qty }) => updateCartItem(id, qty),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY });
    },
    onError: (error: Error) => {
      console.error('Failed to update cart item:', error);
      const errorMessage =
        error instanceof ApiError ? error.getErrorMessage() : error.message;
      toast.error(errorMessage);
    },
  });
}

export function useRemoveFromCart(): UseMutationResult<
  void,
  Error,
  string
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: removeFromCart,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY });
      toast.success('Item removed from cart');
    },
    onError: (error: Error) => {
      console.error('Failed to remove item from cart:', error);
      const errorMessage =
        error instanceof ApiError ? error.getErrorMessage() : error.message;
      toast.error(errorMessage);
    },
  });
}

export function useClearCart(): UseMutationResult<void, Error, void> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: clearCart,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY });
      toast.success('Cart cleared');
    },
    onError: (error: Error) => {
      console.error('Failed to clear cart:', error);
      const errorMessage =
        error instanceof ApiError ? error.getErrorMessage() : error.message;
      toast.error(errorMessage);
    },
  });
}
