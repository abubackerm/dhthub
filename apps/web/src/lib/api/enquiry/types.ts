export type EnquiryStatus =
  | 'SUBMITTED'
  | 'IN_PROGRESS'
  | 'QUOTED'
  | 'AWAITING_CONFIRMATION'
  | 'CONFIRMED'
  | 'PAYMENT_PENDING'
  | 'PAID'
  | 'PROCESSING'
  | 'IN_TRANSIT'
  | 'DELIVERED';

export interface EnquiryItemView {
  id: string;
  enquiryId: string;
  variantId: string;
  productId: string;
  sku: string;
  productName: string;
  variantName: string | null;
  image: string | null;
  price: number | null;
  total: number | null;
  qty: number;
  createdAt: string;
  updatedAt: string;
}

export interface EnquiryView {
  id: string;
  enquiryNumber: string | null;
  userId: string;
  customerName: string;
  companyName: string | null;
  email: string;
  phone: string | null;
  status: EnquiryStatus;
  grandTotal: number | null;
  items: EnquiryItemView[];
  itemCount: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEnquiryItemDto {
  variantId: string;
  qty: number;
}

export interface CreateEnquiryDto {
  customerName: string;
  companyName?: string;
  email: string;
  phone?: string;
  notes?: string;
  items: CreateEnquiryItemDto[];
}

export interface QuoteItemDto {
  itemId: string;
  price: number;
}

export interface QuoteEnquiryDto {
  items: QuoteItemDto[];
}

export interface UpdateEnquiryStatusDto {
  status: EnquiryStatus;
  notes?: string;
}

export interface AdminListEnquiriesDto {
  status?: EnquiryStatus;
  search?: string;
  page?: string;
  limit?: string;
}

export interface AdminEnquiriesResponse {
  enquiries: EnquiryView[];
  total: number;
}

export interface EnquiryQueryParams {
  status?: EnquiryStatus;
  page?: number;
  limit?: number;
}
