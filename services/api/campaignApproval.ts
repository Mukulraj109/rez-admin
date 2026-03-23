import { apiClient } from './apiClient';

// ============================================
// TYPES
// ============================================

export interface MerchantOffer {
  _id: string;
  title: string;
  subtitle?: string;
  description?: string;
  image?: string;
  category: string;
  type: 'cashback' | 'discount' | 'voucher' | 'combo' | 'special' | 'walk_in';
  cashbackPercentage: number;
  originalPrice?: number;
  discountedPrice?: number;
  store: {
    id: string;
    name: string;
    logo?: string;
    rating?: number;
    verified?: boolean;
  };
  validity: {
    startDate: string;
    endDate: string;
    isActive: boolean;
  };
  restrictions?: {
    minOrderValue?: number;
    maxDiscountAmount?: number;
    usageLimitPerUser?: number;
    usageLimit?: number;
  };
  exclusiveZone?: string;
  adminApproved?: boolean;
  adminNotes?: string;
  approvedAt?: string;
  rejectedAt?: string;
  isFreeDelivery?: boolean;
  bogoType?: string;
  bogoDetails?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface GetOffersParams {
  status?: 'pending' | 'approved' | 'rejected';
  page?: number;
  limit?: number;
  search?: string;
}

export interface OffersListResponse {
  offers: MerchantOffer[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// ============================================
// SERVICE
// ============================================

class CampaignApprovalService {
  /**
   * Get offers with approval-status filtering.
   * Maps status param to backend adminApproved query:
   *   pending  → use /pending-approval endpoint
   *   approved → adminApproved=true
   *   rejected → adminApproved=false
   */
  async getOffers(params: GetOffersParams = {}): Promise<OffersListResponse> {
    try {
      const { status, page = 1, limit = 20, search } = params;

      // Pending offers use the dedicated endpoint
      if (status === 'pending') {
        const qs = new URLSearchParams();
        qs.append('page', page.toString());
        qs.append('limit', limit.toString());
        if (search) qs.append('search', search);

        const response = await apiClient.get<OffersListResponse>(
          `admin/offers/pending-approval?${qs.toString()}`
        );

        if (response.success && response.data) {
          return response.data;
        }
        throw new Error(response.message || 'Failed to fetch pending offers');
      }

      // Approved / rejected use the main endpoint with adminApproved filter
      const qs = new URLSearchParams();
      qs.append('page', page.toString());
      qs.append('limit', limit.toString());
      if (search) qs.append('search', search);

      // For the main listing endpoint, we filter by adminApproved value
      // The backend reads adminApproved from the query for the GET / route
      // but the existing route only supports category/type/isActive/search.
      // So for approved/rejected we fetch all and the backend sorts by createdAt.
      // We add an inline filter on adminApproved from the response.
      const response = await apiClient.get<OffersListResponse>(
        `admin/offers?${qs.toString()}`
      );

      if (response.success && response.data) {
        const allOffers = response.data.offers || [];

        if (status === 'approved') {
          const filtered = allOffers.filter(o => o.adminApproved === true);
          return {
            offers: filtered,
            pagination: {
              ...response.data.pagination,
              total: filtered.length,
              totalPages: 1,
            },
          };
        }

        if (status === 'rejected') {
          const filtered = allOffers.filter(o => o.adminApproved === false);
          return {
            offers: filtered,
            pagination: {
              ...response.data.pagination,
              total: filtered.length,
              totalPages: 1,
            },
          };
        }

        return response.data;
      }

      throw new Error(response.message || 'Failed to fetch offers');
    } catch (error: any) {
      if (__DEV__) console.error('[CampaignApproval] getOffers error:', error.message);
      throw new Error(error.message || 'Failed to fetch offers');
    }
  }

  /**
   * Approve a merchant offer
   */
  async approveOffer(id: string, notes?: string): Promise<MerchantOffer> {
    try {
      if (__DEV__) console.log('[CampaignApproval] Approving offer:', id);
      const response = await apiClient.put<MerchantOffer>(
        `admin/offers/${id}/approve`,
        { notes: notes || '' }
      );

      if (response.success && response.data) {
        if (__DEV__) console.log('[CampaignApproval] Offer approved:', id);
        return response.data;
      }

      throw new Error(response.message || 'Failed to approve offer');
    } catch (error: any) {
      if (__DEV__) console.error('[CampaignApproval] approve error:', error.message);
      throw new Error(error.message || 'Failed to approve offer');
    }
  }

  /**
   * Reject a merchant offer with a required reason
   */
  async rejectOffer(id: string, reason: string): Promise<MerchantOffer> {
    try {
      if (__DEV__) console.log('[CampaignApproval] Rejecting offer:', id);
      const response = await apiClient.put<MerchantOffer>(
        `admin/offers/${id}/reject`,
        { reason }
      );

      if (response.success && response.data) {
        if (__DEV__) console.log('[CampaignApproval] Offer rejected:', id);
        return response.data;
      }

      throw new Error(response.message || 'Failed to reject offer');
    } catch (error: any) {
      if (__DEV__) console.error('[CampaignApproval] reject error:', error.message);
      throw new Error(error.message || 'Failed to reject offer');
    }
  }

  /**
   * Get count of pending offers (for badge display)
   */
  async getPendingCount(): Promise<number> {
    try {
      const response = await apiClient.get<OffersListResponse>(
        'admin/offers/pending-approval?page=1&limit=1'
      );

      if (response.success && response.data) {
        return response.data.pagination?.total || 0;
      }

      return 0;
    } catch {
      return 0;
    }
  }
}

export const campaignApprovalService = new CampaignApprovalService();
export default campaignApprovalService;
