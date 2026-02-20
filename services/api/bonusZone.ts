import { apiClient } from './apiClient';

// Funding source
export interface BonusFundingSource {
  type: 'platform' | 'branded' | 'partner';
  partnerId?: string;
  partnerName?: string;
  partnerLogo?: string;
}

// Eligibility criteria
export interface BonusEligibility {
  paymentMethods?: string[];
  bankCodes?: string[];
  binPrefixes?: string[];
  merchantCategories?: string[];
  storeIds?: string[];
  minSpend?: number;
  firstTransactionOnly?: boolean;
  userSegments?: string[];
  regions?: string[];
}

// Reward config
export interface BonusReward {
  type: 'percentage' | 'flat' | 'multiplier';
  value: number;
  capPerUser: number;
  capPerTransaction: number;
  totalBudget: number;
  consumedBudget: number;
  coinType: 'rez' | 'branded';
}

// Claim limits
export interface BonusLimits {
  maxClaimsPerUser: number;
  maxClaimsPerUserPerDay: number;
  totalGlobalClaims: number;
  currentGlobalClaims: number;
}

// Display settings
export interface BonusDisplay {
  icon: string;
  bannerImage?: string;
  partnerLogo?: string;
  backgroundColor?: string;
  badgeText?: string;
  featured: boolean;
  priority: number;
}

// Deep link config
export interface BonusDeepLink {
  screen: string;
  params?: Record<string, any>;
}

// Campaign type union
export type BonusCampaignType =
  | 'cashback_boost'
  | 'bank_offer'
  | 'bill_upload_bonus'
  | 'category_multiplier'
  | 'first_transaction_bonus'
  | 'festival_offer';

// Campaign status union
export type BonusCampaignStatus =
  | 'draft'
  | 'scheduled'
  | 'active'
  | 'paused'
  | 'exhausted'
  | 'expired'
  | 'cancelled';

// Main campaign interface
export interface BonusCampaignAdmin {
  _id: string;
  slug: string;
  title: string;
  subtitle: string;
  description?: string;
  campaignType: BonusCampaignType;
  fundingSource: BonusFundingSource;
  eligibility: BonusEligibility;
  reward: BonusReward;
  limits: BonusLimits;
  startTime: string;
  endTime: string;
  display: BonusDisplay;
  deepLink: BonusDeepLink;
  status: BonusCampaignStatus;
  terms: string[];
  createdAt: string;
  updatedAt: string;
}

// List response
export interface BonusCampaignsListResponse {
  campaigns: BonusCampaignAdmin[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Query parameters
export interface BonusCampaignsQuery {
  page?: number;
  limit?: number;
  status?: BonusCampaignStatus;
  campaignType?: BonusCampaignType;
  region?: string;
  search?: string;
}

// Analytics response (matches bonusCampaignService.getCampaignAnalytics)
export interface BonusCampaignAnalytics {
  totalClaims: number;
  creditedClaims: number;
  pendingClaims: number;
  rejectedClaims: number;
  uniqueUsers: number;
  totalCoinsDistributed: number;
  budgetUsedPercent: number;
  avgRewardPerUser: number;
}

// Claims list response
export interface BonusCampaignClaimsResponse {
  claims: BonusCampaignClaim[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Individual claim
export interface BonusCampaignClaim {
  _id: string;
  userId: string;
  userName?: string;
  userPhone?: string;
  campaignId: string;
  transactionId?: string;
  rewardAmount: number;
  rewardType: string;
  claimedAt: string;
  status: 'pending' | 'verified' | 'credited' | 'rejected' | 'failed' | 'reversed' | 'expired';
}

// Claims query
export interface BonusCampaignClaimsQuery {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}

// Dashboard stats
// Note: Backend getDashboardStats() returns activeCampaigns, totalBudgetAllocated,
// totalBudgetConsumed, totalClaimsLast30d, totalDistributedLast30d, campaignsByStatus.
// Optional fields are declared for potential future backend expansion.
export interface BonusZoneDashboard {
  activeCampaigns: number;
  totalBudgetAllocated: number;
  totalBudgetConsumed: number;
  totalClaimsLast30d: number;
  totalDistributedLast30d: number;
  campaignsByStatus: Record<string, number>;
  // Optional — not currently returned by backend
  totalCampaigns?: number;
  totalClaims?: number;
  uniqueClaimants?: number;
  campaignsByType?: Record<string, number>;
  recentCampaigns?: BonusCampaignAdmin[];
  topPerformingCampaigns?: { campaignId: string; title: string; claims: number; budgetUsed: number }[];
}

// Fraud alert
export interface BonusFraudAlert {
  _id: string;
  campaignId: string;
  campaignTitle: string;
  userId: string;
  userName?: string;
  alertType: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  detectedAt: string;
  resolved: boolean;
}

class BonusZoneService {
  /**
   * Get bonus campaigns with pagination and filters
   */
  async getCampaigns(query: BonusCampaignsQuery = {}): Promise<BonusCampaignsListResponse> {
    try {
      console.log('[BonusZone] Fetching campaigns with query:', query);

      const params = new URLSearchParams();
      if (query.page) params.append('page', query.page.toString());
      if (query.limit) params.append('limit', query.limit.toString());
      if (query.status) params.append('status', query.status);
      if (query.campaignType) params.append('campaignType', query.campaignType);
      if (query.region) params.append('region', query.region);
      if (query.search) params.append('search', query.search);

      const endpoint = `admin/bonus-zone/campaigns${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await apiClient.get<BonusCampaignsListResponse>(endpoint);

      if (response.success && response.data) {
        console.log('[BonusZone] Fetched successfully:', response.data.campaigns?.length || 0, 'campaigns');
        return response.data;
      }

      throw new Error(response.message || 'Failed to fetch bonus campaigns');
    } catch (error: any) {
      console.error('[BonusZone] Get campaigns error:', error.message);
      throw new Error(error.message || 'Failed to fetch bonus campaigns');
    }
  }

  /**
   * Create a new bonus campaign
   */
  async createCampaign(data: Partial<BonusCampaignAdmin>): Promise<BonusCampaignAdmin> {
    try {
      console.log('[BonusZone] Creating campaign:', data.title);
      const response = await apiClient.post<BonusCampaignAdmin>('admin/bonus-zone/campaigns', data);

      if (response.success && response.data) {
        console.log('[BonusZone] Campaign created:', response.data.slug);
        return response.data;
      }

      throw new Error(response.message || 'Failed to create bonus campaign');
    } catch (error: any) {
      console.error('[BonusZone] Create campaign error:', error.message);
      throw new Error(error.message || 'Failed to create bonus campaign');
    }
  }

  /**
   * Update an existing bonus campaign
   */
  async updateCampaign(id: string, data: Partial<BonusCampaignAdmin>): Promise<BonusCampaignAdmin> {
    try {
      console.log('[BonusZone] Updating campaign:', id);
      const response = await apiClient.put<BonusCampaignAdmin>(`admin/bonus-zone/campaigns/${id}`, data);

      if (response.success && response.data) {
        console.log('[BonusZone] Campaign updated:', response.data.slug);
        return response.data;
      }

      throw new Error(response.message || 'Failed to update bonus campaign');
    } catch (error: any) {
      console.error('[BonusZone] Update campaign error:', error.message);
      throw new Error(error.message || 'Failed to update bonus campaign');
    }
  }

  /**
   * Delete a bonus campaign
   */
  async deleteCampaign(id: string): Promise<void> {
    try {
      console.log('[BonusZone] Deleting campaign:', id);
      const response = await apiClient.delete(`admin/bonus-zone/campaigns/${id}`);

      if (response.success) {
        console.log('[BonusZone] Campaign deleted');
        return;
      }

      throw new Error(response.message || 'Failed to delete bonus campaign');
    } catch (error: any) {
      console.error('[BonusZone] Delete campaign error:', error.message);
      throw new Error(error.message || 'Failed to delete bonus campaign');
    }
  }

  /**
   * Update campaign status (draft, active, paused, cancelled, etc.)
   */
  async updateStatus(id: string, status: BonusCampaignStatus): Promise<BonusCampaignAdmin> {
    try {
      console.log('[BonusZone] Updating status for campaign:', id, 'to:', status);
      const response = await apiClient.patch<BonusCampaignAdmin>(`admin/bonus-zone/campaigns/${id}/status`, { status });

      if (response.success && response.data) {
        console.log('[BonusZone] Status updated to:', response.data.status);
        return response.data;
      }

      throw new Error(response.message || 'Failed to update campaign status');
    } catch (error: any) {
      console.error('[BonusZone] Update status error:', error.message);
      throw new Error(error.message || 'Failed to update campaign status');
    }
  }

  /**
   * Get analytics for a specific bonus campaign
   */
  async getCampaignAnalytics(id: string): Promise<BonusCampaignAnalytics> {
    try {
      console.log('[BonusZone] Fetching analytics for campaign:', id);
      const response = await apiClient.get<BonusCampaignAnalytics>(`admin/bonus-zone/campaigns/${id}/analytics`);

      if (response.success && response.data) {
        console.log('[BonusZone] Analytics fetched, totalClaims:', response.data.totalClaims);
        return response.data;
      }

      throw new Error(response.message || 'Failed to fetch campaign analytics');
    } catch (error: any) {
      console.error('[BonusZone] Get analytics error:', error.message);
      throw new Error(error.message || 'Failed to fetch campaign analytics');
    }
  }

  /**
   * Get claims for a specific bonus campaign
   */
  async getCampaignClaims(id: string, query: BonusCampaignClaimsQuery = {}): Promise<BonusCampaignClaimsResponse> {
    try {
      console.log('[BonusZone] Fetching claims for campaign:', id, 'query:', query);

      const params = new URLSearchParams();
      if (query.page) params.append('page', query.page.toString());
      if (query.limit) params.append('limit', query.limit.toString());
      if (query.status) params.append('status', query.status);
      if (query.search) params.append('search', query.search);

      const endpoint = `admin/bonus-zone/campaigns/${id}/claims${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await apiClient.get<BonusCampaignClaimsResponse>(endpoint);

      if (response.success && response.data) {
        console.log('[BonusZone] Claims fetched:', response.data.claims?.length || 0, 'claims');
        return response.data;
      }

      throw new Error(response.message || 'Failed to fetch campaign claims');
    } catch (error: any) {
      console.error('[BonusZone] Get claims error:', error.message);
      throw new Error(error.message || 'Failed to fetch campaign claims');
    }
  }

  /**
   * Add funds to a bonus campaign's budget
   */
  async fundCampaign(id: string, amount: number): Promise<BonusCampaignAdmin> {
    try {
      console.log('[BonusZone] Funding campaign:', id, 'amount:', amount);
      const response = await apiClient.post<BonusCampaignAdmin>(`admin/bonus-zone/campaigns/${id}/fund`, { amount });

      if (response.success && response.data) {
        console.log('[BonusZone] Campaign funded, new budget:', response.data.reward?.totalBudget);
        return response.data;
      }

      throw new Error(response.message || 'Failed to fund bonus campaign');
    } catch (error: any) {
      console.error('[BonusZone] Fund campaign error:', error.message);
      throw new Error(error.message || 'Failed to fund bonus campaign');
    }
  }

  /**
   * Duplicate an existing bonus campaign
   */
  async duplicateCampaign(id: string, newSlug?: string): Promise<BonusCampaignAdmin> {
    try {
      console.log('[BonusZone] Duplicating campaign:', id);
      const body: { newSlug?: string } = {};
      if (newSlug) body.newSlug = newSlug;

      const response = await apiClient.post<BonusCampaignAdmin>(`admin/bonus-zone/campaigns/${id}/duplicate`, body);

      if (response.success && response.data) {
        console.log('[BonusZone] Campaign duplicated:', response.data.slug);
        return response.data;
      }

      throw new Error(response.message || 'Failed to duplicate bonus campaign');
    } catch (error: any) {
      console.error('[BonusZone] Duplicate campaign error:', error.message);
      throw new Error(error.message || 'Failed to duplicate bonus campaign');
    }
  }

  /**
   * Get bonus zone dashboard overview stats
   */
  async getDashboard(): Promise<BonusZoneDashboard> {
    try {
      console.log('[BonusZone] Fetching dashboard...');
      const response = await apiClient.get<BonusZoneDashboard>('admin/bonus-zone/dashboard');

      if (response.success && response.data) {
        console.log('[BonusZone] Dashboard fetched, active campaigns:', response.data.activeCampaigns);
        return response.data;
      }

      throw new Error(response.message || 'Failed to fetch bonus zone dashboard');
    } catch (error: any) {
      console.error('[BonusZone] Get dashboard error:', error.message);
      throw new Error(error.message || 'Failed to fetch bonus zone dashboard');
    }
  }

  /**
   * Reject a bonus claim (and reverse coins if already credited)
   */
  async rejectClaim(claimId: string, reason: string): Promise<BonusCampaignClaim> {
    try {
      console.log('[BonusZone] Rejecting claim:', claimId, 'reason:', reason);
      const response = await apiClient.patch<{ claim: BonusCampaignClaim }>(`admin/bonus-zone/claims/${claimId}/reject`, { reason });

      if (response.success && response.data) {
        console.log('[BonusZone] Claim rejected:', claimId);
        return response.data.claim;
      }

      throw new Error(response.message || 'Failed to reject claim');
    } catch (error: any) {
      console.error('[BonusZone] Reject claim error:', error.message);
      throw new Error(error.message || 'Failed to reject claim');
    }
  }

  /**
   * Get fraud alerts for bonus campaigns
   */
  async getFraudAlerts(limit?: number): Promise<BonusFraudAlert[]> {
    try {
      console.log('[BonusZone] Fetching fraud alerts...');

      const params = new URLSearchParams();
      if (limit) params.append('limit', limit.toString());

      const endpoint = `admin/bonus-zone/fraud-alerts${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await apiClient.get<BonusFraudAlert[]>(endpoint);

      if (response.success && response.data) {
        console.log('[BonusZone] Fraud alerts fetched:', response.data.length);
        return response.data;
      }

      return [];
    } catch (error: any) {
      console.error('[BonusZone] Get fraud alerts error:', error.message);
      return [];
    }
  }
}

export const bonusZoneService = new BonusZoneService();
export default bonusZoneService;
