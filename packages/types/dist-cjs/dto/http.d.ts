export interface ApiResponse<T> {
    data: T;
}
export interface PaginationMeta {
    total: number;
    page: number;
    size: number;
    totalPages: number;
}
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
    meta: PaginationMeta;
}
