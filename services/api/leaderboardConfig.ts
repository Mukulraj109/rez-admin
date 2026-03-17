import { apiClient } from './apiClient';

// ============================================
// TYPES
// ============================================

export type LeaderboardType = 'coins' | 'spending' | 'reviews' | 'referrals' | 'cashback' | 'streak' | 'custom';
export type LeaderboardPeriod = 'daily' | 'weekly' | 'monthly' | 'all-time';
export type LeaderboardStatus = 'active' | 'paused' | 'archived';

export interface LeaderboardPrize {
  rankStart: number;
  rankEnd: number;
  prizeAmount: number;
  prizeLabel: string;
}

export interface LeaderboardEligibility {
  minAccountAgeDays: number;
  minActivityThreshold: number;
  requiredVerification: string;
  excludedUserIds: string[];
}

export interface LeaderboardAntiFraud {
  maxRankJumpPerCycle: number;
  minDifferentDays: number;
  flagDuplicateDevices: boolean;
}

export interface LeaderboardDisplay {
  icon: string;
  backgroundColor: string;
  featured: boolean;
  priority: number;
}

export interface LeaderboardConfigAdmin {
  _id: string;
  slug: string;
  title: string;
  subtitle: string;
  leaderboardType: LeaderboardType;
  period: LeaderboardPeriod;
  sources: string[];
  prizePool: LeaderboardPrize[];
  eligibility: LeaderboardEligibility;
  antiFraud: LeaderboardAntiFraud;
  display: LeaderboardDisplay;
  topN: number;
  status: LeaderboardStatus;
  participantsCount: number;
  totalPrizesDistributed: number;
  createdAt: string;
  updatedAt: string;
}

export interface LeaderboardConfigListResponse {
  configs: LeaderboardConfigAdmin[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface LeaderboardConfigQuery {
  page?: number;
  limit?: number;
  status?: LeaderboardStatus;
  search?: string;
}

export interface LeaderboardStats {
  activeLeaderboards: number;
  totalPrizesDistributed: number;
  participationRate: number;
  configsByStatus: Record<string, number>;
}

export interface LeaderboardAnalytics {
  totalParticipants: number;
  activeParticipants: number;
  totalPrizesAwarded: number;
  avgScore: number;
  topScorer: string;
  cyclesCompleted: number;
}

export interface PrizeHistoryEntry {
  _id: string;
  configId: string;
  configTitle: string;
  userId: string;
  userName?: string;
  rank: number;
  prizeAmount: number;
  prizeLabel: string;
  cycle: string;
  distributedAt: string;
}

export interface PrizeHistoryResponse {
  prizes: PrizeHistoryEntry[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface PrizeHistoryQuery {
  page?: number;
  limit?: number;
  configId?: string;
}

// ============================================
// SERVICE
// ============================================

class LeaderboardConfigService {
  /**
   * Get leaderboard configs with pagination and filters
   */
  async getAll(query: LeaderboardConfigQuery = {}): Promise<LeaderboardConfigListResponse> {
    try {
      if (__DEV__) console.log('[LeaderboardConfig] Fetching configs with query:', query);

      const params = new URLSearchParams();
      if (query.page) params.append('page', query.page.toString());
      if (query.limit) params.append('limit', query.limit.toString());
      if (query.status) params.append('status', query.status);
      if (query.search) params.append('search', query.search);

      const endpoint = `admin/leaderboard/configs${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await apiClient.get<LeaderboardConfigListResponse>(endpoint);

      if (response.success && response.data) {
        if (__DEV__) console.log('[LeaderboardConfig] Fetched successfully:', response.data.configs?.length || 0, 'configs');
        return response.data;
      }

      throw new Error(response.message || 'Failed to fetch leaderboard configs');
    } catch (error: any) {
      if (__DEV__) console.error('[LeaderboardConfig] Get all error:', error.message);
      throw new Error(error.message || 'Failed to fetch leaderboard configs');
    }
  }

  /**
   * Get a single leaderboard config by ID
   */
  async getById(id: string): Promise<LeaderboardConfigAdmin> {
    try {
      if (__DEV__) console.log('[LeaderboardConfig] Fetching config:', id);
      const response = await apiClient.get<LeaderboardConfigAdmin>(`admin/leaderboard/configs/${id}`);

      if (response.success && response.data) {
        if (__DEV__) console.log('[LeaderboardConfig] Config fetched:', response.data.slug);
        return response.data;
      }

      throw new Error(response.message || 'Failed to fetch leaderboard config');
    } catch (error: any) {
      if (__DEV__) console.error('[LeaderboardConfig] Get by ID error:', error.message);
      throw new Error(error.message || 'Failed to fetch leaderboard config');
    }
  }

  /**
   * Create a new leaderboard config
   */
  async create(data: Partial<LeaderboardConfigAdmin>): Promise<LeaderboardConfigAdmin> {
    try {
      if (__DEV__) console.log('[LeaderboardConfig] Creating config:', data.title);
      const response = await apiClient.post<LeaderboardConfigAdmin>('admin/leaderboard/configs', data);

      if (response.success && response.data) {
        if (__DEV__) console.log('[LeaderboardConfig] Config created:', response.data.slug);
        return response.data;
      }

      throw new Error(response.message || 'Failed to create leaderboard config');
    } catch (error: any) {
      if (__DEV__) console.error('[LeaderboardConfig] Create error:', error.message);
      throw new Error(error.message || 'Failed to create leaderboard config');
    }
  }

  /**
   * Update an existing leaderboard config
   */
  async update(id: string, data: Partial<LeaderboardConfigAdmin>): Promise<LeaderboardConfigAdmin> {
    try {
      if (__DEV__) console.log('[LeaderboardConfig] Updating config:', id);
      const response = await apiClient.put<LeaderboardConfigAdmin>(`admin/leaderboard/configs/${id}`, data);

      if (response.success && response.data) {
        if (__DEV__) console.log('[LeaderboardConfig] Config updated:', response.data.slug);
        return response.data;
      }

      throw new Error(response.message || 'Failed to update leaderboard config');
    } catch (error: any) {
      if (__DEV__) console.error('[LeaderboardConfig] Update error:', error.message);
      throw new Error(error.message || 'Failed to update leaderboard config');
    }
  }

  /**
   * Delete a leaderboard config
   */
  async remove(id: string): Promise<void> {
    try {
      if (__DEV__) console.log('[LeaderboardConfig] Deleting config:', id);
      const response = await apiClient.delete(`admin/leaderboard/configs/${id}`);

      if (response.success) {
        if (__DEV__) console.log('[LeaderboardConfig] Config deleted');
        return;
      }

      throw new Error(response.message || 'Failed to delete leaderboard config');
    } catch (error: any) {
      if (__DEV__) console.error('[LeaderboardConfig] Delete error:', error.message);
      throw new Error(error.message || 'Failed to delete leaderboard config');
    }
  }

  /**
   * Update leaderboard config status (active, paused, archived)
   */
  async updateStatus(id: string, status: LeaderboardStatus): Promise<LeaderboardConfigAdmin> {
    try {
      if (__DEV__) console.log('[LeaderboardConfig] Updating status for config:', id, 'to:', status);
      const response = await apiClient.patch<LeaderboardConfigAdmin>(`admin/leaderboard/configs/${id}/status`, { status });

      if (response.success && response.data) {
        if (__DEV__) console.log('[LeaderboardConfig] Status updated to:', response.data.status);
        return response.data;
      }

      throw new Error(response.message || 'Failed to update config status');
    } catch (error: any) {
      if (__DEV__) console.error('[LeaderboardConfig] Update status error:', error.message);
      throw new Error(error.message || 'Failed to update config status');
    }
  }

  /**
   * Get dashboard stats for leaderboard configs
   */
  async getStats(): Promise<LeaderboardStats> {
    try {
      if (__DEV__) console.log('[LeaderboardConfig] Fetching stats...');
      const response = await apiClient.get<LeaderboardStats>('admin/leaderboard/configs/stats');

      if (response.success && response.data) {
        if (__DEV__) console.log('[LeaderboardConfig] Stats fetched, active:', response.data.activeLeaderboards);
        return response.data;
      }

      throw new Error(response.message || 'Failed to fetch leaderboard stats');
    } catch (error: any) {
      if (__DEV__) console.error('[LeaderboardConfig] Get stats error:', error.message);
      throw new Error(error.message || 'Failed to fetch leaderboard stats');
    }
  }

  /**
   * Get analytics for a specific leaderboard config
   */
  async getAnalytics(id: string): Promise<LeaderboardAnalytics> {
    try {
      if (__DEV__) console.log('[LeaderboardConfig] Fetching analytics for config:', id);
      const response = await apiClient.get<LeaderboardAnalytics>(`admin/leaderboard/configs/${id}/analytics`);

      if (response.success && response.data) {
        if (__DEV__) console.log('[LeaderboardConfig] Analytics fetched, participants:', response.data.totalParticipants);
        return response.data;
      }

      throw new Error(response.message || 'Failed to fetch config analytics');
    } catch (error: any) {
      if (__DEV__) console.error('[LeaderboardConfig] Get analytics error:', error.message);
      throw new Error(error.message || 'Failed to fetch config analytics');
    }
  }

  /**
   * Get prize distribution history
   */
  async getPrizeHistory(query: PrizeHistoryQuery = {}): Promise<PrizeHistoryResponse> {
    try {
      if (__DEV__) console.log('[LeaderboardConfig] Fetching prize history with query:', query);

      const params = new URLSearchParams();
      if (query.page) params.append('page', query.page.toString());
      if (query.limit) params.append('limit', query.limit.toString());
      if (query.configId) params.append('configId', query.configId);

      const endpoint = `admin/leaderboard/configs/prize-history${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await apiClient.get<PrizeHistoryResponse>(endpoint);

      if (response.success && response.data) {
        if (__DEV__) console.log('[LeaderboardConfig] Prize history fetched:', response.data.prizes?.length || 0, 'entries');
        return response.data;
      }

      throw new Error(response.message || 'Failed to fetch prize history');
    } catch (error: any) {
      if (__DEV__) console.error('[LeaderboardConfig] Get prize history error:', error.message);
      throw new Error(error.message || 'Failed to fetch prize history');
    }
  }

  /**
   * Trigger prize distribution for a leaderboard config
   */
  async distributePrizes(id: string): Promise<{ distributed: number; flagged: number; totalEntries: number }> {
    try {
      if (__DEV__) console.log('[LeaderboardConfig] Distributing prizes for config:', id);
      const response = await apiClient.post<{ distributed: number; flagged: number; totalEntries: number }>(`admin/leaderboard/configs/${id}/distribute-prizes`);

      if (response.success && response.data) {
        if (__DEV__) console.log('[LeaderboardConfig] Prizes distributed:', response.data.distributed, 'flagged:', response.data.flagged);
        return response.data;
      }

      throw new Error(response.message || 'Failed to distribute prizes');
    } catch (error: any) {
      if (__DEV__) console.error('[LeaderboardConfig] Distribute prizes error:', error.message);
      throw new Error(error.message || 'Failed to distribute prizes');
    }
  }

  /**
   * Manually refresh leaderboard cache for all active configs
   */
  async refreshCache(): Promise<void> {
    try {
      if (__DEV__) console.log('[LeaderboardConfig] Refreshing leaderboard cache...');
      const response = await apiClient.post('admin/leaderboard/configs/refresh');

      if (response.success) {
        if (__DEV__) console.log('[LeaderboardConfig] Cache refreshed');
        return;
      }

      throw new Error(response.message || 'Failed to refresh cache');
    } catch (error: any) {
      if (__DEV__) console.error('[LeaderboardConfig] Refresh cache error:', error.message);
      throw new Error(error.message || 'Failed to refresh cache');
    }
  }
}

export const leaderboardConfigService = new LeaderboardConfigService();
export default leaderboardConfigService;
