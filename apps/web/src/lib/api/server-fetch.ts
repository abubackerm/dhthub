const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export interface ServerFetchOptions {
  tags?: string[];
  revalidate?: number | false;
}

export async function serverFetch<T>(
  endpoint: string,
  options?: ServerFetchOptions,
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const next: { tags?: string[]; revalidate?: number | false } = {};
  if (options?.tags?.length) next.tags = options.tags;
  if (options?.revalidate !== undefined) next.revalidate = options.revalidate;

  const response = await fetch(url, {
    credentials: "include",
    ...Object.keys(next).length > 0 ? { next } : {},
  });

  if (!response.ok) {
    throw new Error(
      `Server fetch failed: ${response.status} ${response.statusText} for ${endpoint}`,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

export async function revalidateByTag(tag: string): Promise<void> {
  const { revalidateTag } = await import("next/cache");
  revalidateTag(tag);
}
