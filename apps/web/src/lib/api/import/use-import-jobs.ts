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
  getImportJobs,
  getImportJob,
  cancelImportJob,
  getImportJobErrors,
  downloadErrorCsv,
  createImportJob,
  type ImportJobView,
  type ImportJobListResponse,
  type ImportJobWithErrorsView,
  type ImportJobsQueryParams,
  type CreateImportJobResponse,
  type ImportMode,
} from '../import';

export const IMPORT_JOBS_QUERY_KEY = ['import-jobs'];

export interface UseImportJobsParams extends ImportJobsQueryParams {
  enabled?: boolean;
  refetchInterval?: number | false;
}

export function useImportJobs(
  params: UseImportJobsParams = {},
): UseQueryResult<ImportJobListResponse, Error> {
  const { enabled = true, refetchInterval = false, ...queryParams } = params;

  return useQuery({
    queryKey: [...IMPORT_JOBS_QUERY_KEY, queryParams],
    queryFn: () => getImportJobs(queryParams),
    enabled,
    refetchInterval,
    staleTime: 30 * 1000, // 30 seconds - jobs change frequently during processing
  });
}

export function useImportJob(
  id: string,
  options?: { enabled?: boolean; refetchInterval?: number | false },
): UseQueryResult<ImportJobView, Error> {
  const { enabled = !!id, refetchInterval = 5000 } = options || {};

  return useQuery({
    queryKey: [...IMPORT_JOBS_QUERY_KEY, id],
    queryFn: () => getImportJob(id),
    enabled,
    // Poll every 5 seconds when job is active (PENDING, PROCESSING, VALIDATING)
    refetchInterval: (data) => {
      if (refetchInterval !== undefined && refetchInterval === false) {
        return false;
      }
      if (typeof refetchInterval === 'number') {
        return refetchInterval;
      }
      // Default: poll every 5 seconds for active jobs, stop polling for completed/failed jobs
      const activeStatuses = ['PENDING', 'PROCESSING', 'VALIDATING'];
      return data?.status && activeStatuses.includes(data.status) ? 5000 : false;
    },
    staleTime: 10 * 1000, // 10 seconds
  });
}

export function useImportJobErrors(
  id: string,
  options?: { limit?: number; offset?: number; enabled?: boolean },
): UseQueryResult<ImportJobWithErrorsView, Error> {
  const { limit, offset, enabled = !!id } = options || {};

  return useQuery({
    queryKey: [...IMPORT_JOBS_QUERY_KEY, id, 'errors', { limit, offset }],
    queryFn: () => getImportJobErrors(id, { limit, offset }),
    enabled,
  });
}

export function useCreateImportJob(): UseMutationResult<
  CreateImportJobResponse,
  Error,
  { file: File; mode: ImportMode; warehouseId?: string; createdBy?: string }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ file, mode, warehouseId, createdBy }) =>
      createImportJob(file, { mode, warehouseId, createdBy }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: IMPORT_JOBS_QUERY_KEY });
      toast.success('Import job created successfully');
    },
    onError: (error: Error) => {
      console.error('Failed to create import job:', error);
      const errorMessage =
        error instanceof ApiError ? error.getErrorMessage() : error.message;
      toast.error(errorMessage);
    },
  });
}

export function useCancelImportJob(): UseMutationResult<
  ImportJobView,
  Error,
  string
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => cancelImportJob(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: IMPORT_JOBS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: [...IMPORT_JOBS_QUERY_KEY, id] });
      toast.success('Import job cancelled successfully');
    },
    onError: (error: Error) => {
      console.error('Failed to cancel import job:', error);
      const errorMessage =
        error instanceof ApiError ? error.getErrorMessage() : error.message;
      toast.error(errorMessage);
    },
  });
}

export function useDownloadErrorReport(): UseMutationResult<
  void,
  Error,
  { id: string; filename?: string }
> {
  return useMutation({
    mutationFn: async ({ id, filename }) => {
      const blob = await downloadErrorCsv(id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || `import-errors-${id}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
    onSuccess: (_, { filename }) => {
      toast.success(`Error report downloaded: ${filename}`);
    },
    onError: (error: Error) => {
      console.error('Failed to download error report:', error);
      const errorMessage =
        error instanceof ApiError ? error.getErrorMessage() : error.message;
      toast.error(errorMessage);
    },
  });
}
