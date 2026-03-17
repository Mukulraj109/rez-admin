import { apiClient } from './apiClient';

// ============================================
// TYPES — matches SubscriptionTier model
// ============================================

export interface SubscriptionTierBenefits {
  cashbackMultiplier: number;
  freeDeliveries: number;
  maxWishlists: number;
  prioritySupport: boolean;
  exclusiveDeals: boolean;
  earlyAccess: boolean;
  freeDelivery: boolean;
  unlimitedWishlists: boolean;
  earlyFlashSaleAccess: boolean;
  personalShopper: boolean;
  premiumEvents: boolean;
  conciergeService: boolean;
  birthdayOffer: boolean;
  anniversaryOffer: boolean;
}

export interface SubscriptionTierConfig {
  _id: string;
  tier: string;
  name: string;
  description: string;
  pricing: {
    monthly: number;
    yearly: number;
    yearlyDiscount: number;
  };
  benefits: SubscriptionTierBenefits;
  features: string[];
  isActive: boolean;
  sortOrder: number;
  trialDays: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSubscriptionTierData {
  tier: string;
  name: string;
  description?: string;
  pricing: {
    monthly: number;
    yearly: number;
    yearlyDiscount: number;
  };
  benefits: Partial<SubscriptionTierBenefits>;
  features: string[];
  isActive?: boolean;
  sortOrder?: number;
  trialDays?: number;
}

export interface SubscriberInfo {
  _id: string;
  user: {
    _id: string;
    fullName: string;
    phoneNumber: string;
    email?: string;
  };
  tier: string;
  status: string;
  billingCycle: string;
  price: number;
  startDate: string;
  endDate: string;
  autoRenew: boolean;
  createdAt: string;
}

export interface SubscribersResponse {
  subscribers: SubscriberInfo[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  tierDistribution: Array<{ _id: string; count: number }>;
}

// ============================================
// SERVICE
// ============================================

class MembershipAdminService {
  /**
   * List all subscription tiers with optional active filter
   */
  async listPlans(isActive?: boolean): Promise<SubscriptionTierConfig[]> {
    try {
      const params = new URLSearchParams();
      if (isActive !== undefined) params.append('isActive', isActive.toString());

      const endpoint = `admin/membership/plans${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await apiClient.get<SubscriptionTierConfig[]>(endpoint);

      if (response.success && response.data) {
        return response.data;
      }

      throw new Error(response.message || 'Failed to fetch subscription tiers');
    } catch (error: any) {
      if (__DEV__) console.error('[Membership] List plans error:', error.message);
      throw new Error(error.message || 'Failed to fetch subscription tiers');
    }
  }

  /**
   * Create a new subscription tier
   */
  async createPlan(data: CreateSubscriptionTierData): Promise<SubscriptionTierConfig> {
    try {
      const response = await apiClient.post<SubscriptionTierConfig>('admin/membership/plans', data);

      if (response.success && response.data) {
        return response.data;
      }

      throw new Error(response.message || 'Failed to create subscription tier');
    } catch (error: any) {
      if (__DEV__) console.error('[Membership] Create plan error:', error.message);
      throw new Error(error.message || 'Failed to create subscription tier');
    }
  }

  /**
   * Update an existing subscription tier
   */
  async updatePlan(id: string, data: Partial<CreateSubscriptionTierData>): Promise<SubscriptionTierConfig> {
    try {
      const response = await apiClient.put<SubscriptionTierConfig>(`admin/membership/plans/${id}`, data);

      if (response.success && response.data) {
        return response.data;
      }

      throw new Error(response.message || 'Failed to update subscription tier');
    } catch (error: any) {
      if (__DEV__) console.error('[Membership] Update plan error:', error.message);
      throw new Error(error.message || 'Failed to update subscription tier');
    }
  }

  /**
   * Deactivate (soft delete) a subscription tier
   */
  async deletePlan(id: string): Promise<void> {
    try {
      const response = await apiClient.delete(`admin/membership/plans/${id}`);

      if (response.success) return;

      throw new Error(response.message || 'Failed to deactivate subscription tier');
    } catch (error: any) {
      if (__DEV__) console.error('[Membership] Delete plan error:', error.message);
      throw new Error(error.message || 'Failed to deactivate subscription tier');
    }
  }

  /**
   * Get subscribers list with pagination and filtering
   */
  async getSubscribers(params?: {
    tier?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<SubscribersResponse> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.tier) queryParams.append('tier', params.tier);
      if (params?.status) queryParams.append('status', params.status);
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());

      const endpoint = `admin/membership/subscribers${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await apiClient.get<SubscribersResponse>(endpoint);

      if (response.success && response.data) {
        return response.data;
      }

      throw new Error(response.message || 'Failed to fetch subscribers');
    } catch (error: any) {
      if (__DEV__) console.error('[Membership] Get subscribers error:', error.message);
      throw new Error(error.message || 'Failed to fetch subscribers');
    }
  }

  /**
   * Override a subscriber's tier (admin manual change)
   */
  async overrideSubscriberTier(userId: string, newTier: string, reason: string): Promise<any> {
    try {
      const response = await apiClient.post(`admin/membership/subscribers/${userId}/override`, {
        newTier,
        reason,
      });

      if (response.success) return response.data;

      throw new Error(response.message || 'Failed to override subscriber tier');
    } catch (error: any) {
      if (__DEV__) console.error('[Membership] Override error:', error.message);
      throw new Error(error.message || 'Failed to override subscriber tier');
    }
  }
}

export const membershipAdminService = new MembershipAdminService();
export default membershipAdminService;
