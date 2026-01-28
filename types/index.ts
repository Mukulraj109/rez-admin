// Re-export types from services
export * from '../services/api/auth';
export * from '../services/api/coinRewards';
export * from '../services/api/dashboard';
export * from '../services/api/merchants';
export * from '../services/api/orders';

// Common types
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  pagination?: Pagination;
}
