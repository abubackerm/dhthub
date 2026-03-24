import { apiClient } from '../client';
import type {
  CreateEnquiryDto,
  EnquiryView,
  QuoteEnquiryDto,
  UpdateEnquiryStatusDto,
  AdminListEnquiriesDto,
  AdminEnquiriesResponse,
} from './types';

// Customer endpoints
export async function getMyEnquiries(status?: string): Promise<EnquiryView[]> {
  const qs = status ? `?status=${status}` : '';
  return apiClient.get<EnquiryView[]>(`/v1/enquiries${qs}`);
}

export async function getEnquiryById(id: string): Promise<EnquiryView> {
  return apiClient.get<EnquiryView>(`/v1/enquiries/${id}`);
}

export async function createEnquiry(data: CreateEnquiryDto): Promise<EnquiryView> {
  return apiClient.post<EnquiryView>('/v1/enquiries', data);
}

export async function createEnquiryFromCart(
  data: Omit<CreateEnquiryDto, 'items'>,
): Promise<EnquiryView> {
  return apiClient.post<EnquiryView>('/v1/enquiries/from-cart', data);
}

export async function confirmOrder(id: string): Promise<EnquiryView> {
  return apiClient.post<EnquiryView>(`/v1/enquiries/${id}/confirm`);
}

export async function updateEnquiryStatus(
  id: string,
  data: UpdateEnquiryStatusDto,
): Promise<EnquiryView> {
  return apiClient.patch<EnquiryView>(`/v1/enquiries/${id}/status`, data);
}

// Admin endpoints
export async function getAdminEnquiries(
  params?: AdminListEnquiriesDto,
): Promise<AdminEnquiriesResponse> {
  const searchParams = new URLSearchParams();

  if (params?.status) searchParams.set('status', params.status);
  if (params?.search) searchParams.set('search', params.search);
  if (params?.page) searchParams.set('page', params.page);
  if (params?.limit) searchParams.set('limit', params.limit);

  const qs = searchParams.toString();
  const endpoint = qs ? `/v1/admin/enquiries?${qs}` : '/v1/admin/enquiries';

  return apiClient.get<AdminEnquiriesResponse>(endpoint);
}

export async function getAdminEnquiryById(id: string): Promise<EnquiryView> {
  return apiClient.get<EnquiryView>(`/v1/admin/enquiries/${id}`);
}

export async function quoteEnquiry(
  id: string,
  data: QuoteEnquiryDto,
): Promise<EnquiryView> {
  return apiClient.patch<EnquiryView>(`/v1/admin/enquiries/${id}/quote`, data);
}

export async function updateAdminEnquiryStatus(
  id: string,
  data: UpdateEnquiryStatusDto,
): Promise<EnquiryView> {
  return apiClient.patch<EnquiryView>(`/v1/admin/enquiries/${id}/status`, data);
}

export async function markAsPaid(id: string): Promise<EnquiryView> {
  return apiClient.post<EnquiryView>(`/v1/admin/enquiries/${id}/mark-paid`);
}
