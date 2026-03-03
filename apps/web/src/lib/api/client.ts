const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface ApiErrorResponse {
  statusCode: number;
  error: string;
  message: string;
  timestamp: string;
  path: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  getErrorMessage(): string {
    // If error data contains a structured error response, extract the message
    if (typeof this.data === 'object' && this.data !== null) {
      const errorResponse = this.data as ApiErrorResponse;
      if (errorResponse.message) {
        return errorResponse.message;
      }
    }

    // Return default error message
    return this.message;
  }

  getErrorCode(): string | undefined {
    if (typeof this.data === 'object' && this.data !== null) {
      const errorResponse = this.data as ApiErrorResponse;
      return errorResponse.error;
    }
    return undefined;
  }
}

export interface ApiResponse<T> {
  data: T;
}

export async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const headers: Record<string, string> = {
    ...((options?.headers as Record<string, string>) ?? {}),
  };

  if (options?.body) {
    headers['Content-Type'] ??= 'application/json';
  }

  const config: RequestInit = {
    ...options,
    headers,
    credentials: 'include',
  };

  try {
    const response = await fetch(url, config);

    if (!response.ok) {
      let errorData: unknown;
      try {
        errorData = await response.json();
      } catch {
        errorData = await response.text();
      }

      // Log detailed error information for debugging
      console.error(`API Request Failed: ${config.method} ${url}`, {
        status: response.status,
        statusText: response.statusText,
        errorData,
      });

      throw new ApiError(
        `HTTP ${response.status}: ${response.statusText}`,
        response.status,
        errorData,
      );
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(
      error instanceof Error ? error.message : 'Network error',
      0,
    );
  }
}

export const apiClient = {
  get: <T>(endpoint: string) =>
    apiRequest<T>(endpoint, { method: 'GET' }),

  post: <T>(endpoint: string, data?: unknown) =>
    apiRequest<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }),

  patch: <T>(endpoint: string, data?: unknown) =>
    apiRequest<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    }),

  delete: <T>(endpoint: string) =>
    apiRequest<T>(endpoint, { method: 'DELETE' }),
};
