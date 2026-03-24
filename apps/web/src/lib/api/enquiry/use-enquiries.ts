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
  getMyEnquiries,
  getEnquiryById,
  createEnquiry,
  createEnquiryFromCart,
  confirmOrder,
  updateEnquiryStatus,
  type EnquiryView,
  type CreateEnquiryDto,
  type UpdateEnquiryStatusDto,
} from './enquiries';
import { ENQUIRY_QUERY_KEY } from './use-admin-enquiries';

export function useMyEnquiries(
  status?: string,
): UseQueryResult<EnquiryView[], Error> {
  return useQuery({
    queryKey: [ENQUIRY_QUERY_KEY, 'my', status],
    queryFn: () => getMyEnquiries(status),
  });
}

export function useEnquiry(id: string): UseQueryResult<EnquiryView, Error> {
  return useQuery({
    queryKey: [ENQUIRY_QUERY_KEY, id],
    queryFn: () => getEnquiryById(id),
    enabled: !!id,
  });
}

export function useCreateEnquiry(): UseMutationResult<
  EnquiryView,
  Error,
  CreateEnquiryDto
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createEnquiry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ENQUIRY_QUERY_KEY });
      toast.success('Enquiry created successfully');
    },
    onError: (error: Error) => {
      console.error('Failed to create enquiry:', error);
      const errorMessage =
        error instanceof ApiError ? error.getErrorMessage() : error.message;
      toast.error(errorMessage);
    },
  });
}

export function useCreateEnquiryFromCart(): UseMutationResult<
  EnquiryView,
  Error,
  Omit<CreateEnquiryDto, 'items'>
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createEnquiryFromCart,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ENQUIRY_QUERY_KEY });
      toast.success('Enquiry submitted successfully');
    },
    onError: (error: Error) => {
      console.error('Failed to create enquiry from cart:', error);
      const errorMessage =
        error instanceof ApiError ? error.getErrorMessage() : error.message;
      toast.error(errorMessage);
    },
  });
}

export function useConfirmOrder(): UseMutationResult<EnquiryView, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: confirmOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ENQUIRY_QUERY_KEY });
      toast.success('Order confirmed successfully');
    },
    onError: (error: Error) => {
      console.error('Failed to confirm order:', error);
      const errorMessage =
        error instanceof ApiError ? error.getErrorMessage() : error.message;
      toast.error(errorMessage);
    },
  });
}

export function useUpdateEnquiryStatus(): UseMutationResult<
  EnquiryView,
  Error,
  { id: string; data: UpdateEnquiryStatusDto }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => updateEnquiryStatus(id, data),
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
