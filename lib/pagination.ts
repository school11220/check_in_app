export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export function parsePagination(searchParams: URLSearchParams, defaults = { page: 1, pageSize: 25 }) {
  const rawPage = Number(searchParams.get('page') || defaults.page);
  const rawPageSize = Number(searchParams.get('pageSize') || defaults.pageSize);
  const page = Number.isFinite(rawPage) ? Math.max(1, Math.floor(rawPage)) : defaults.page;
  const pageSize = Number.isFinite(rawPageSize) ? Math.min(100, Math.max(1, Math.floor(rawPageSize))) : defaults.pageSize;
  return { page, pageSize, skip: (page - 1) * pageSize };
}

export function paginationMeta(page: number, pageSize: number, total: number): PaginationMeta {
  return { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export function parseCursorPagination(searchParams: URLSearchParams, defaultPageSize = 50) {
  const raw = Number(searchParams.get('pageSize') || defaultPageSize);
  return {
    cursor: searchParams.get('cursor') || undefined,
    pageSize: Number.isFinite(raw) ? Math.min(100, Math.max(1, Math.floor(raw))) : defaultPageSize,
  };
}
