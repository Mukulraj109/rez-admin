import { API_CONFIG } from '../../config/api';
import { storageService } from '../storage';

const BASE_URL = API_CONFIG.BASE_URL;

// Types
export interface SurpriseCoinDrop {
  _id: string;
  userId: string | { _id: string; fullName?: string; phoneNumber?: string };
  coins: number;
  reason: 'random' | 'milestone' | 'promo' | 'special_event' | 'welcome' | 'comeback';
  message: string;
  status: 'available' | 'claimed' | 'expired';
  expiresAt: string;
  claimedAt?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface SurpriseCoinDropsListResponse {
  drops: SurpriseCoinDrop[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface SurpriseCoinDropsFilter {
  page?: number;
  limit?: number;
  status?: string;
  reason?: string;
  userId?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface CreateSurpriseCoinDropRequest {
  userId: string;
  coins: number;
  reason?: string;
  message?: string;
  expiryHours?: number;
  metadata?: Record<string, any>;
}

export interface BulkCreateRequest {
  userIds: string[];
  coins: number;
  reason?: string;
  message?: string;
  expiryHours?: number;
  metadata?: Record<string, any>;
}

export interface AnalyticsResponse {
  period: string;
  summary: {
    totalDrops: number;
    totalCoins: number;
    avgCoins: number;
    uniqueUsers: number;
    claimRate: number;
    unclaimed: number;
  };
  statusBreakdown: Array<{ _id: string; count: number; totalCoins: number }>;
  reasonBreakdown: Array<{ _id: string; count: number; totalCoins: number }>;
  dailyVolume: Array<{ _id: string; count: number; totalCoins: number }>;
}

// Helper to get auth headers
async function getAuthHeaders(): Promise<HeadersInit> {
  const token = await storageService.getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export const surpriseCoinDropsService = {
  /**
   * Get all surprise coin drops with optional filters
   */
  async getDrops(filters: SurpriseCoinDropsFilter = {}): Promise<SurpriseCoinDropsListResponse> {
    const headers = await getAuthHeaders();
    const params = new URLSearchParams();

    if (filters.page) params.append('page', String(filters.page));
    if (filters.limit) params.append('limit', String(filters.limit));
    if (filters.status) params.append('status', filters.status);
    if (filters.reason) params.append('reason', filters.reason);
    if (filters.userId) params.append('userId', filters.userId);
    if (filters.search) params.append('search', filters.search);
    if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.append('dateTo', filters.dateTo);

    const response = await fetch(
      `${BASE_URL}/admin/surprise-coin-drops?${params.toString()}`,
      { headers }
    );

    const data = await response.json();
    if (!data.success) throw new Error(data.message || 'Failed to fetch surprise coin drops');
    return data.data;
  },

  /**
   * Get analytics for surprise coin drops
   */
  async getAnalytics(days?: number): Promise<AnalyticsResponse> {
    const headers = await getAuthHeaders();
    const params = days ? `?days=${days}` : '';
    const response = await fetch(
      `${BASE_URL}/admin/surprise-coin-drops/analytics${params}`,
      { headers }
    );

    const data = await response.json();
    if (!data.success) throw new Error(data.message || 'Failed to fetch analytics');
    return data.data;
  },

  /**
   * Get single surprise coin drop by ID
   */
  async getDrop(id: string): Promise<SurpriseCoinDrop> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BASE_URL}/admin/surprise-coin-drops/${id}`, { headers });

    const data = await response.json();
    if (!data.success) throw new Error(data.message || 'Failed to fetch surprise coin drop');
    return data.data;
  },

  /**
   * Create a surprise coin drop for one user
   */
  async createDrop(dropData: CreateSurpriseCoinDropRequest): Promise<SurpriseCoinDrop> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BASE_URL}/admin/surprise-coin-drops`, {
      method: 'POST',
      headers,
      body: JSON.stringify(dropData),
    });

    const data = await response.json();
    if (!data.success) throw new Error(data.message || 'Failed to create surprise coin drop');
    return data.data;
  },

  /**
   * Bulk create surprise coin drops for multiple users
   */
  async bulkCreate(bulkData: BulkCreateRequest): Promise<{ created: number; skipped: number; invalidIds: number }> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BASE_URL}/admin/surprise-coin-drops/bulk`, {
      method: 'POST',
      headers,
      body: JSON.stringify(bulkData),
    });

    const data = await response.json();
    if (!data.success) throw new Error(data.message || 'Failed to bulk create surprise coin drops');
    return data.data;
  },

  /**
   * Update a surprise coin drop
   */
  async updateDrop(id: string, dropData: Partial<CreateSurpriseCoinDropRequest>): Promise<SurpriseCoinDrop> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BASE_URL}/admin/surprise-coin-drops/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(dropData),
    });

    const data = await response.json();
    if (!data.success) throw new Error(data.message || 'Failed to update surprise coin drop');
    return data.data;
  },

  /**
   * Delete a surprise coin drop (only unclaimed)
   */
  async deleteDrop(id: string): Promise<void> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BASE_URL}/admin/surprise-coin-drops/${id}`, {
      method: 'DELETE',
      headers,
    });

    const data = await response.json();
    if (!data.success) throw new Error(data.message || 'Failed to delete surprise coin drop');
  },

  /**
   * Manually expire all old unclaimed drops
   */
  async expireOldDrops(): Promise<{ expiredCount: number }> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BASE_URL}/admin/surprise-coin-drops/expire-old`, {
      method: 'POST',
      headers,
    });

    const data = await response.json();
    if (!data.success) throw new Error(data.message || 'Failed to expire old drops');
    return data.data;
  },
};

export default surpriseCoinDropsService;
