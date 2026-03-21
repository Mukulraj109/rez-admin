import { apiClient } from './apiClient';

export interface AdminReview {
  _id: string;
  rating: number;
  title?: string;
  comment: string;
  images?: string[];
  moderationStatus: 'pending' | 'approved' | 'rejected';
  moderationReason?: string;
  moderatedAt?: string;
  createdAt: string;
  isActive: boolean;
  user?: {
    _id: string;
    profile?: { firstName?: string; lastName?: string; avatar?: string };
    email?: string;
    phoneNumber?: string;
  };
  store?: {
    _id: string;
    name: string;
    logo?: string;
  };
}

export interface ReviewStats {
  pending: number;
  approved: number;
  rejected: number;
}

export const reviewsAdminService = {
  async getReviews(
    page = 1,
    limit = 20,
    status = 'pending',
    search?: string
  ): Promise<{ reviews: AdminReview[]; pagination: any }> {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      status,
    });
    if (search) params.set('search', search);
    const res = await apiClient.get<any>(`admin/reviews?${params}`);
    return {
      reviews: res.data || [],
      pagination: res.meta?.pagination || { page, limit, total: 0, totalPages: 0 },
    };
  },

  async getStats(): Promise<ReviewStats> {
    const res = await apiClient.get<any>('admin/reviews/stats');
    return res.data || { pending: 0, approved: 0, rejected: 0 };
  },

  async approveReview(id: string): Promise<void> {
    await apiClient.put(`admin/reviews/${id}/approve`, {});
  },

  async rejectReview(id: string, reason: string): Promise<void> {
    await apiClient.put(`admin/reviews/${id}/reject`, { reason });
  },

  async deleteReview(id: string): Promise<void> {
    await apiClient.delete(`admin/reviews/${id}`);
  },
};
