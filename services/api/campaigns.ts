import { apiClient } from './apiClient';

// Campaign Deal interface
export interface CampaignDeal {
  store?: string;
  storeId?: string;
  image: string;
  cashback?: string;
  coins?: string;
  bonus?: string;
  drop?: string;
  discount?: string;
  endsIn?: string;
  // Price for paid deals (0 or undefined = free deal)
  price?: number;
  currency?: 'INR' | 'AED' | 'USD';
  // Limit for redemptions (0 = unlimited)
  purchaseLimit?: number;
  // Track how many times redeemed (read-only)
  purchaseCount?: number;
}

// Campaign interface
export interface Campaign {
  _id: string;
  campaignId: string;
  title: string;
  subtitle: string;
  description?: string;
  badge: string;
  badgeBg: string;
  badgeColor: string;
  gradientColors: string[];
  type: 'cashback' | 'coins' | 'bank' | 'bill' | 'drop' | 'new-user' | 'flash' | 'general';
  deals: CampaignDeal[];
  startTime: string;
  endTime: string;
  isActive: boolean;
  priority: number;
  eligibleCategories?: string[];
  terms?: string[];
  minOrderValue?: number;
  maxBenefit?: number;
  icon?: string;
  bannerImage?: string;
  region?: 'bangalore' | 'dubai' | 'china' | 'all';
  createdAt: string;
  updatedAt: string;
  // Computed fields
  isRunning?: boolean;
  isExpired?: boolean;
  isUpcoming?: boolean;
  dealsCount?: number;
}

// Create/Update campaign request
export interface CampaignRequest {
  campaignId?: string;
  title: string;
  subtitle: string;
  description?: string;
  badge: string;
  badgeBg?: string;
  badgeColor?: string;
  gradientColors?: string[];
  type?: Campaign['type'];
  deals?: CampaignDeal[];
  startTime: string;
  endTime: string;
  isActive?: boolean;
  priority?: number;
  eligibleCategories?: string[];
  terms?: string[];
  minOrderValue?: number;
  maxBenefit?: number;
  icon?: string;
  bannerImage?: string;
  region?: Campaign['region'];
}

// Campaign stats interface
export interface CampaignStats {
  total: number;
  active: number;
  running: number;
  upcoming: number;
  recentlyExpired: number;
  totalDeals: number;
  byType: Record<string, number>;
  byRegion: Record<string, number>;
}

// Store for deal assignment
export interface StoreOption {
  _id: string;
  name: string;
  logo?: string;
  category?: string;
  location?: any;
}

// List response
export interface CampaignsListResponse {
  campaigns: Campaign[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Query parameters
export interface CampaignsQuery {
  page?: number;
  limit?: number;
  status?: 'active' | 'inactive';
  type?: Campaign['type'];
  region?: Campaign['region'];
  search?: string;
  running?: boolean;
  expired?: boolean;
  upcoming?: boolean;
}

class CampaignsService {
  /**
   * Get campaigns with pagination and filters
   */
  async getCampaigns(query: CampaignsQuery = {}): Promise<CampaignsListResponse> {
    try {
      console.log('[Campaigns] Fetching campaigns with query:', query);

      const params = new URLSearchParams();
      if (query.page) params.append('page', query.page.toString());
      if (query.limit) params.append('limit', query.limit.toString());
      if (query.status) params.append('status', query.status);
      if (query.type) params.append('type', query.type);
      if (query.region) params.append('region', query.region);
      if (query.search) params.append('search', query.search);
      if (query.running) params.append('running', 'true');
      if (query.expired) params.append('expired', 'true');
      if (query.upcoming) params.append('upcoming', 'true');

      const endpoint = `admin/campaigns${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await apiClient.get<CampaignsListResponse>(endpoint);

      if (response.success && response.data) {
        console.log('[Campaigns] Fetched successfully:', response.data.campaigns?.length || 0, 'campaigns');
        return response.data;
      }

      throw new Error(response.message || 'Failed to fetch campaigns');
    } catch (error: any) {
      console.error('[Campaigns] Get campaigns error:', error.message);
      throw new Error(error.message || 'Failed to fetch campaigns');
    }
  }

  /**
   * Get campaign statistics
   */
  async getStats(): Promise<CampaignStats> {
    try {
      console.log('[Campaigns] Fetching stats...');
      const response = await apiClient.get<CampaignStats>('admin/campaigns/stats');

      if (response.success && response.data) {
        console.log('[Campaigns] Stats fetched successfully');
        return response.data;
      }

      throw new Error(response.message || 'Failed to fetch stats');
    } catch (error: any) {
      console.error('[Campaigns] Get stats error:', error.message);
      throw new Error(error.message || 'Failed to fetch campaign stats');
    }
  }

  /**
   * Get stores for deal assignment dropdown
   */
  async getStores(search?: string, limit: number = 50): Promise<StoreOption[]> {
    try {
      console.log('[Campaigns] Fetching stores...');
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      params.append('limit', limit.toString());

      const endpoint = `admin/campaigns/stores?${params.toString()}`;
      const response = await apiClient.get<StoreOption[]>(endpoint);

      if (response.success && response.data) {
        console.log('[Campaigns] Stores fetched:', response.data.length);
        return response.data;
      }

      return [];
    } catch (error: any) {
      console.error('[Campaigns] Get stores error:', error.message);
      return [];
    }
  }

  /**
   * Get single campaign by ID
   */
  async getCampaignById(id: string): Promise<Campaign> {
    try {
      console.log('[Campaigns] Fetching campaign:', id);
      const response = await apiClient.get<Campaign>(`admin/campaigns/${id}`);

      if (response.success && response.data) {
        console.log('[Campaigns] Campaign fetched:', response.data.title);
        return response.data;
      }

      throw new Error(response.message || 'Campaign not found');
    } catch (error: any) {
      console.error('[Campaigns] Get campaign error:', error.message);
      throw new Error(error.message || 'Failed to fetch campaign');
    }
  }

  /**
   * Create new campaign
   */
  async createCampaign(data: CampaignRequest): Promise<Campaign> {
    try {
      console.log('[Campaigns] Creating campaign:', data.title);
      const response = await apiClient.post<Campaign>('admin/campaigns', data);

      if (response.success && response.data) {
        console.log('[Campaigns] Campaign created:', response.data.campaignId);
        return response.data;
      }

      throw new Error(response.message || 'Failed to create campaign');
    } catch (error: any) {
      console.error('[Campaigns] Create campaign error:', error.message);
      throw new Error(error.message || 'Failed to create campaign');
    }
  }

  /**
   * Update campaign
   */
  async updateCampaign(id: string, data: Partial<CampaignRequest>): Promise<Campaign> {
    try {
      console.log('[Campaigns] Updating campaign:', id);
      const response = await apiClient.put<Campaign>(`admin/campaigns/${id}`, data);

      if (response.success && response.data) {
        console.log('[Campaigns] Campaign updated:', response.data.campaignId);
        return response.data;
      }

      throw new Error(response.message || 'Failed to update campaign');
    } catch (error: any) {
      console.error('[Campaigns] Update campaign error:', error.message);
      throw new Error(error.message || 'Failed to update campaign');
    }
  }

  /**
   * Delete campaign
   */
  async deleteCampaign(id: string): Promise<void> {
    try {
      console.log('[Campaigns] Deleting campaign:', id);
      const response = await apiClient.delete(`admin/campaigns/${id}`);

      if (response.success) {
        console.log('[Campaigns] Campaign deleted');
        return;
      }

      throw new Error(response.message || 'Failed to delete campaign');
    } catch (error: any) {
      console.error('[Campaigns] Delete campaign error:', error.message);
      throw new Error(error.message || 'Failed to delete campaign');
    }
  }

  /**
   * Toggle campaign active status
   */
  async toggleCampaign(id: string): Promise<{ isActive: boolean }> {
    try {
      console.log('[Campaigns] Toggling campaign:', id);
      const response = await apiClient.patch<{ isActive: boolean }>(`admin/campaigns/${id}/toggle`);

      if (response.success && response.data) {
        console.log('[Campaigns] Campaign toggled, isActive:', response.data.isActive);
        return response.data;
      }

      throw new Error(response.message || 'Failed to toggle campaign');
    } catch (error: any) {
      console.error('[Campaigns] Toggle campaign error:', error.message);
      throw new Error(error.message || 'Failed to toggle campaign');
    }
  }

  /**
   * Add deal to campaign
   */
  async addDeal(campaignId: string, deal: CampaignDeal): Promise<Campaign> {
    try {
      console.log('[Campaigns] Adding deal to campaign:', campaignId);
      const response = await apiClient.post<Campaign>(`admin/campaigns/${campaignId}/deals`, deal);

      if (response.success && response.data) {
        console.log('[Campaigns] Deal added');
        return response.data;
      }

      throw new Error(response.message || 'Failed to add deal');
    } catch (error: any) {
      console.error('[Campaigns] Add deal error:', error.message);
      throw new Error(error.message || 'Failed to add deal');
    }
  }

  /**
   * Remove deal from campaign
   */
  async removeDeal(campaignId: string, dealIndex: number): Promise<Campaign> {
    try {
      console.log('[Campaigns] Removing deal from campaign:', campaignId, 'index:', dealIndex);
      const response = await apiClient.delete<Campaign>(`admin/campaigns/${campaignId}/deals/${dealIndex}`);

      if (response.success && response.data) {
        console.log('[Campaigns] Deal removed');
        return response.data;
      }

      throw new Error(response.message || 'Failed to remove deal');
    } catch (error: any) {
      console.error('[Campaigns] Remove deal error:', error.message);
      throw new Error(error.message || 'Failed to remove deal');
    }
  }

  /**
   * Duplicate campaign
   */
  async duplicateCampaign(id: string): Promise<Campaign> {
    try {
      console.log('[Campaigns] Duplicating campaign:', id);
      const response = await apiClient.post<Campaign>(`admin/campaigns/${id}/duplicate`);

      if (response.success && response.data) {
        console.log('[Campaigns] Campaign duplicated:', response.data.campaignId);
        return response.data;
      }

      throw new Error(response.message || 'Failed to duplicate campaign');
    } catch (error: any) {
      console.error('[Campaigns] Duplicate campaign error:', error.message);
      throw new Error(error.message || 'Failed to duplicate campaign');
    }
  }

  /**
   * Bulk action on campaigns
   */
  async bulkAction(action: 'activate' | 'deactivate' | 'delete', campaignIds: string[]): Promise<void> {
    try {
      console.log('[Campaigns] Bulk action:', action, 'on', campaignIds.length, 'campaigns');
      const response = await apiClient.post('admin/campaigns/bulk-action', { action, campaignIds });

      if (response.success) {
        console.log('[Campaigns] Bulk action completed');
        return;
      }

      throw new Error(response.message || 'Bulk action failed');
    } catch (error: any) {
      console.error('[Campaigns] Bulk action error:', error.message);
      throw new Error(error.message || 'Failed to perform bulk action');
    }
  }
}

export const campaignsService = new CampaignsService();
export default campaignsService;
