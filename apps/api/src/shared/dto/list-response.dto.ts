export class ListResponseMeta {
  total: number;
  limit: number;
  offset: number;
}

export class PaginatedResponseDto<T> {
  data: T[];
  meta: ListResponseMeta;
}
