import { API_CONFIG, buildApiUrl } from '../../config/api';
import { storageService } from '../storage';

const BASE_URL = API_CONFIG.BASE_URL;

// Types
export interface DoubleCashbackCampaign {
  _id: string;
  title: string;
  subtitle: string;
  description?: string;
  multiplier: number;
  startTime: string;
  endTime: string;
  eligibleStores: string[];
  eligibleStoreNames: string[];
  eligibleCategories: string[];
  terms: string[];
  minOrderValue?: number;
  maxCashback?: number;
  backgroundColor: string;
  bannerImage?: string;
  icon: string;
  isActive: boolean;
  priority: number;
  usageCount: number;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CoinDrop {
  _id: string;
  storeId: string | { _id: string; name?: string; logo?: string };
  storeName: string;
  storeLogo?: string;
  multiplier: number;
  normalCashback: number;
  boostedCashback: number;
  category: string;
  startTime: string;
  endTime: string;
  minOrderValue?: number;
  maxCashback?: number;
  isActive: boolean;
  priority: number;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface StoreOption {
  _id: string;
  name: string;
  logo?: string;
  category?: string;
}

export interface DoubleCampaignsListResponse {
  campaigns: DoubleCashbackCampaign[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface CoinDropsListResponse {
  coinDrops: CoinDrop[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface DoubleCampaignsFilter {
  page?: number;
  limit?: number;
  status?: string;
  running?: string;
}

export interface CoinDropsFilter {
  page?: number;
  limit?: number;
  status?: string;
  category?: string;
  running?: string;
}

export interface CreateDoubleCampaignRequest {
  title: string;
  subtitle: string;
  multiplier: number;
  startTime: string | Date;
  endTime: string | Date;
  description?: string;
  eligibleStores?: string[];
  eligibleStoreNames?: string[];
  eligibleCategories?: string[];
  terms?: string[];
  minOrderValue?: number;
  maxCashback?: number;
  backgroundColor?: string;
  bannerImage?: string;
  icon?: string;
  priority?: number;
}

export interface CreateCoinDropRequest {
  storeId: string;
  multiplier: number;
  normalCashback: number;
  category: string;
  startTime: string | Date;
  endTime: string | Date;
  minOrderValue?: number;
  maxCashback?: number;
  priority?: number;
}

// Helper to get auth headers
async function getAuthHeaders(): Promise<HeadersInit> {
  const token = await storageService.getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// API Service
export const extraRewardsService = {
  // ==========================================
  // Double Cashback Campaigns
  // ==========================================

  /**
   * Get all double cashback campaigns with optional filters
   */
  async getCampaigns(filters: DoubleCampaignsFilter = {}): Promise<DoubleCampaignsListResponse> {
    const headers = await getAuthHeaders();
    const params = new URLSearchParams();

    if (filters.page) params.append('page', String(filters.page));
    if (filters.limit) params.append('limit', String(filters.limit));
    if (filters.status) params.append('status', filters.status);
    if (filters.running) params.append('running', filters.running);

    const response = await fetch(
      `${BASE_URL}/admin/double-campaigns?${params.toString()}`,
      { headers }
    );

    const data = await response.json();
    if (!data.success) throw new Error(data.message || 'Failed to fetch campaigns');
    return data.data;
  },

  /**
   * Get single double cashback campaign by ID
   */
  async getCampaign(id: string): Promise<DoubleCashbackCampaign> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BASE_URL}/admin/double-campaigns/${id}`, { headers });

    const data = await response.json();
    if (!data.success) throw new Error(data.message || 'Failed to fetch campaign');
    return data.data;
  },

  /**
   * Create new double cashback campaign
   */
  async createCampaign(campaignData: CreateDoubleCampaignRequest): Promise<DoubleCashbackCampaign> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BASE_URL}/admin/double-campaigns`, {
      method: 'POST',
      headers,
      body: JSON.stringify(campaignData),
    });

    const data = await response.json();
    if (!data.success) throw new Error(data.message || 'Failed to create campaign');
    return data.data;
  },

  /**
   * Update double cashback campaign
   */
  async updateCampaign(id: string, campaignData: CreateDoubleCampaignRequest): Promise<DoubleCashbackCampaign> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BASE_URL}/admin/double-campaigns/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(campaignData),
    });

    const data = await response.json();
    if (!data.success) throw new Error(data.message || 'Failed to update campaign');
    return data.data;
  },

  /**
   * Toggle double cashback campaign active status
   */
  async toggleCampaign(id: string): Promise<{ isActive: boolean }> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BASE_URL}/admin/double-campaigns/${id}/toggle`, {
      method: 'PATCH',
      headers,
    });

    const data = await response.json();
    if (!data.success) throw new Error(data.message || 'Failed to toggle campaign');
    return data.data;
  },

  /**
   * Delete double cashback campaign
   */
  async deleteCampaign(id: string): Promise<void> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BASE_URL}/admin/double-campaigns/${id}`, {
      method: 'DELETE',
      headers,
    });

    const data = await response.json();
    if (!data.success) throw new Error(data.message || 'Failed to delete campaign');
  },

  // ==========================================
  // Coin Drops
  // ==========================================

  /**
   * Get all coin drops with optional filters
   */
  async getCoinDrops(filters: CoinDropsFilter = {}): Promise<CoinDropsListResponse> {
    const headers = await getAuthHeaders();
    const params = new URLSearchParams();

    if (filters.page) params.append('page', String(filters.page));
    if (filters.limit) params.append('limit', String(filters.limit));
    if (filters.status) params.append('status', filters.status);
    if (filters.category) params.append('category', filters.category);
    if (filters.running) params.append('running', filters.running);

    const response = await fetch(
      `${BASE_URL}/admin/coin-drops?${params.toString()}`,
      { headers }
    );

    const data = await response.json();
    if (!data.success) throw new Error(data.message || 'Failed to fetch coin drops');
    return data.data;
  },

  /**
   * Get list of stores for coin drop dropdown
   */
  async getCoinDropStores(search?: string): Promise<StoreOption[]> {
    const headers = await getAuthHeaders();
    const params = new URLSearchParams();

    if (search) params.append('q', search);

    const response = await fetch(
      `${BASE_URL}/admin/coin-drops/stores?${params.toString()}`,
      { headers }
    );

    const data = await response.json();
    if (!data.success) throw new Error(data.message || 'Failed to fetch stores');
    return data.data;
  },

  /**
   * Get single coin drop by ID
   */
  async getCoinDrop(id: string): Promise<CoinDrop> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BASE_URL}/admin/coin-drops/${id}`, { headers });

    const data = await response.json();
    if (!data.success) throw new Error(data.message || 'Failed to fetch coin drop');
    return data.data;
  },

  /**
   * Create new coin drop
   */
  async createCoinDrop(coinDropData: CreateCoinDropRequest): Promise<CoinDrop> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BASE_URL}/admin/coin-drops`, {
      method: 'POST',
      headers,
      body: JSON.stringify(coinDropData),
    });

    const data = await response.json();
    if (!data.success) throw new Error(data.message || 'Failed to create coin drop');
    return data.data;
  },

  /**
   * Update coin drop
   */
  async updateCoinDrop(id: string, coinDropData: CreateCoinDropRequest): Promise<CoinDrop> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BASE_URL}/admin/coin-drops/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(coinDropData),
    });

    const data = await response.json();
    if (!data.success) throw new Error(data.message || 'Failed to update coin drop');
    return data.data;
  },

  /**
   * Toggle coin drop active status
   */
  async toggleCoinDrop(id: string): Promise<{ isActive: boolean }> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BASE_URL}/admin/coin-drops/${id}/toggle`, {
      method: 'PATCH',
      headers,
    });

    const data = await response.json();
    if (!data.success) throw new Error(data.message || 'Failed to toggle coin drop');
    return data.data;
  },

  /**
   * Delete coin drop
   */
  async deleteCoinDrop(id: string): Promise<void> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BASE_URL}/admin/coin-drops/${id}`, {
      method: 'DELETE',
      headers,
    });

    const data = await response.json();
    if (!data.success) throw new Error(data.message || 'Failed to delete coin drop');
  },
};

export default extraRewardsService;
