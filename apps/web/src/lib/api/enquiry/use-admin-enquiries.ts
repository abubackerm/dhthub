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
  getAdminEnquiries,
  getAdminEnquiryById,
  quoteEnquiry,
  updateAdminEnquiryStatus,
  markAsPaid,
  type EnquiryView,
  type QuoteEnquiryDto,
  type UpdateEnquiryStatusDto,
  type AdminListEnquiriesDto,
} from './enquiries';

export const ENQUIRY_QUERY_KEY = ['enquiries'];

export function useAdminEnquiries(
  params?: AdminListEnquiriesDto,
): UseQueryResult<{ enquiries: EnquiryView[]; total: number }, Error> {
  return useQuery({
    queryKey: [ENQUIRY_QUERY_KEY, 'admin', params],
    queryFn: () => getAdminEnquiries(params),
  });
}

export function useAdminEnquiry(id: string): UseQueryResult<EnquiryView, Error> {
  return useQuery({
    queryKey: [ENQUIRY_QUERY_KEY, 'admin', id],
    queryFn: () => getAdminEnquiryById(id),
    enabled: !!id,
  });
}

export function useQuoteEnquiry(): UseMutationResult<
  EnquiryView,
  Error,
  { id: string; data: QuoteEnquiryDto }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => quoteEnquiry(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ENQUIRY_QUERY_KEY });
      toast.success('Quote added successfully');
    },
    onError: (error: Error) => {
      console.error('Failed to quote enquiry:', error);
      const errorMessage =
        error instanceof ApiError ? error.getErrorMessage() : error.message;
      toast.error(errorMessage);
    },
  });
}

export function useUpdateAdminEnquiryStatus(): UseMutationResult<
  EnquiryView,
  Error,
  { id: string; data: UpdateEnquiryStatusDto }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => updateAdminEnquiryStatus(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ENQUIRY_QUERY_KEY });
      toast.success('Enquiry status updated successfully');
    },
    onError: (error: Error) => {
      console.error('Failed to update enquiry status:', error);
      const errorMessage =
        error instanceof ApiError ? error.getErrorMessage() : error.message;
      toast.error(errorMessage);
    },
  });
}

export function useMarkAsPaid(): UseMutationResult<EnquiryView, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markAsPaid,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ENQUIRY_QUERY_KEY });
      toast.success('Order marked as paid successfully');
    },
    onError: (error: Error) => {
      console.error('Failed to mark as paid:', error);
      const errorMessage =
        error instanceof ApiError ? error.getErrorMessage() : error.message;
      toast.error(errorMessage);
    },
  });
}
