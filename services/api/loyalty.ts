import { apiClient } from './apiClient';

export interface LoyaltyUser {
  _id: string;
  userId: {
    _id: string;
    profile?: {
      firstName?: string;
      lastName?: string;
    };
    phoneNumber: string;
    email?: string;
  };
  streak: {
    current: number;
    target: number;
    lastCheckin?: string;
  };
  brandLoyalty: Array<{
    brandId: string;
    brandName: string;
    purchaseCount: number;
    tier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
    progress: number;
    nextTierAt: number;
  }>;
  missions: Array<{
    missionId: string;
    title: string;
    progress: number;
    target: number;
    reward: number;
    icon: string;
    completedAt?: string;
  }>;
  coins: {
    available: number;
    expiring: number;
    expiryDate?: string;
    history: Array<{
      amount: number;
      type: 'earned' | 'spent' | 'expired';
      description: string;
      date: string;
    }>;
  };
  categoryCoins: Record<string, { available: number; expiring: number; expiryDate?: string }>;
  createdAt: string;
  updatedAt: string;
}

export interface LoyaltyStats {
  totalUsers: number;
  activeStreaks: number;
  totalCoinsEarned: number;
  completedMissions: number;
  avgStreak: number;
  topCategory: string;
}

export interface LoyaltyListResponse {
  users: LoyaltyUser[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

class LoyaltyService {
  /**
   * Get list of loyalty users
   */
  async getUsers(
    page: number = 1,
    limit: number = 20,
    search?: string,
    category?: string,
    sortBy?: string
  ): Promise<LoyaltyListResponse> {
    try {
      let url = `admin/loyalty?page=${page}&limit=${limit}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (category) url += `&category=${encodeURIComponent(category)}`;
      if (sortBy) url += `&sortBy=${encodeURIComponent(sortBy)}`;

      console.log('[Loyalty] Fetching users list...');
      const response = await apiClient.get<LoyaltyUser[]>(url);

      if (response.success) {
        console.log('[Loyalty] Users fetched successfully');
        // Backend returns { data: { users: [...], pagination: {...} } }
        const nested = response.data as any;
        return {
          users: nested?.users || (Array.isArray(nested) ? nested : []),
          pagination: nested?.pagination || response.pagination || { page, limit, total: 0, totalPages: 0 }
        };
      }

      throw new Error(response.message || 'Failed to get users');
    } catch (error: any) {
      console.error('[Loyalty] Get users error:', error.message);
      throw new Error(error.message || 'Failed to get users');
    }
  }

  /**
   * Get loyalty statistics
   */
  async getStats(): Promise<LoyaltyStats> {
    try {
      console.log('[Loyalty] Fetching stats...');
      const response = await apiClient.get<LoyaltyStats>('admin/loyalty/stats');

      if (response.success && response.data) {
        console.log('[Loyalty] Stats fetched successfully');
        return response.data;
      }

      throw new Error(response.message || 'Failed to get stats');
    } catch (error: any) {
      console.error('[Loyalty] Get stats error:', error.message);
      throw new Error(error.message || 'Failed to get stats');
    }
  }

  /**
   * Get single loyalty user by ID
   */
  async getUser(userId: string): Promise<LoyaltyUser> {
    try {
      console.log('[Loyalty] Fetching user:', userId);
      const response = await apiClient.get<LoyaltyUser>(`admin/loyalty/${userId}`);

      if (response.success && response.data) {
        return response.data;
      }

      throw new Error(response.message || 'Failed to get user');
    } catch (error: any) {
      console.error('[Loyalty] Get user error:', error.message);
      throw new Error(error.message || 'Failed to get user');
    }
  }

  /**
   * Add coins to a user's balance
   */
  async addCoins(
    userId: string,
    amount: number,
    reason: string,
    category?: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      console.log('[Loyalty] Adding coins to user:', userId, 'amount:', amount);
      const response = await apiClient.post<any>(`admin/loyalty/${userId}/add-coins`, {
        amount,
        reason,
        ...(category && { category })
      });

      return {
        success: response.success,
        message: response.message || 'Coins added successfully'
      };
    } catch (error: any) {
      console.error('[Loyalty] Add coins error:', error.message);
      throw new Error(error.message || 'Failed to add coins');
    }
  }

  /**
   * Reset a user's streak
   */
  async resetStreak(userId: string): Promise<{ success: boolean; message: string }> {
    try {
      console.log('[Loyalty] Resetting streak for user:', userId);
      const response = await apiClient.post<any>(`admin/loyalty/${userId}/reset-streak`, {});

      return {
        success: response.success,
        message: response.message || 'Streak reset successfully'
      };
    } catch (error: any) {
      console.error('[Loyalty] Reset streak error:', error.message);
      throw new Error(error.message || 'Failed to reset streak');
    }
  }

  /**
   * Reset a user's missions
   */
  async resetMissions(
    userId: string,
    category?: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      console.log('[Loyalty] Resetting missions for user:', userId);
      const response = await apiClient.post<any>(`admin/loyalty/${userId}/reset-missions`, {
        ...(category && { category })
      });

      return {
        success: response.success,
        message: response.message || 'Missions reset successfully'
      };
    } catch (error: any) {
      console.error('[Loyalty] Reset missions error:', error.message);
      throw new Error(error.message || 'Failed to reset missions');
    }
  }
}

export const loyaltyService = new LoyaltyService();
export default loyaltyService;
