export interface AddCartItemDto {
  variantId: string;
  qty: number;
}

export interface CartItemView {
  id: string;
  variantId: string;
  sku: string;
  productName: string;
  variantName: string | null;
  image: string | null;
  qty: number;
  attributes: Record<string, any>;
  availableStock: number;
  isAvailable: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CartView {
  id: string;
  userId: string;
  items: CartItemView[];
  itemCount: number;
  submittedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
