import { apiClient } from '../client';
import type {
  CartView,
  CartItemView,
  AddCartItemDto,
} from './types';

export async function getCart(): Promise<CartView> {
  return apiClient.get<CartView>('/v1/cart');
}

export async function addToCart(
  data: AddCartItemDto,
): Promise<CartItemView> {
  return apiClient.post<CartItemView>('/v1/cart/items', data);
}

export async function updateCartItem(
  id: string,
  qty: number,
): Promise<CartItemView> {
  return apiClient.patch<CartItemView>(`/v1/cart/items/${id}`, { qty });
}

export async function removeFromCart(id: string): Promise<void> {
  return apiClient.delete<void>(`/v1/cart/items/${id}`);
}

export async function clearCart(): Promise<void> {
  return apiClient.delete<void>('/v1/cart');
}
