import { apiClient } from './apiClient';

export interface PendingCoinReward {
  _id: string;
  user: {
    _id: string;
    profile?: {
      firstName?: string;
      lastName?: string;
    };
    phoneNumber: string;
    email?: string;
  };
  amount: number;
  percentage: number;
  source: 'purchase_bonus' | 'social_media_post' | 'review_bonus' | 'referral_bonus';
  referenceType: 'order' | 'post' | 'review' | 'referral';
  referenceId: string;
  status: 'pending' | 'approved' | 'rejected' | 'credited';
  submittedAt: string;
  reviewedAt?: string;
  creditedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
  approvalNotes?: string;
  metadata?: Record<string, any>;
}

export interface CoinRewardStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  credited: number;
  totalCoinsAwarded: number;
  totalCoinsPending: number;
}

export interface CoinRewardsListResponse {
  rewards: PendingCoinReward[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

class CoinRewardsService {
  /**
   * Get list of pending coin rewards
   */
  async getRewards(
    page: number = 1,
    limit: number = 20,
    status?: string,
    source?: string
  ): Promise<CoinRewardsListResponse> {
    try {
      let url = `admin/coin-rewards?page=${page}&limit=${limit}`;
      if (status) url += `&status=${status}`;
      if (source) url += `&source=${source}`;

      console.log('[CoinRewards] Fetching rewards list...');
      const response = await apiClient.get<PendingCoinReward[]>(url);

      if (response.success) {
        console.log('[CoinRewards] Rewards fetched successfully');
        // Backend returns { data: { rewards: [...], pagination: {...} } }
        const nested = response.data as any;
        return {
          rewards: nested?.rewards || (Array.isArray(nested) ? nested : []),
          pagination: nested?.pagination || response.pagination || { page, limit, total: 0, totalPages: 0 }
        };
      }

      throw new Error(response.message || 'Failed to get rewards');
    } catch (error: any) {
      console.error('[CoinRewards] Get rewards error:', error.message);
      throw new Error(error.message || 'Failed to get rewards');
    }
  }

  /**
   * Get single coin reward by ID
   */
  async getReward(rewardId: string): Promise<PendingCoinReward> {
    try {
      console.log('[CoinRewards] Fetching reward:', rewardId);
      const response = await apiClient.get<PendingCoinReward>(`admin/coin-rewards/${rewardId}`);

      if (response.success && response.data) {
        return response.data;
      }

      throw new Error(response.message || 'Failed to get reward');
    } catch (error: any) {
      console.error('[CoinRewards] Get reward error:', error.message);
      throw new Error(error.message || 'Failed to get reward');
    }
  }

  /**
   * Get coin rewards statistics
   */
  async getStats(): Promise<CoinRewardStats> {
    try {
      console.log('[CoinRewards] Fetching stats...');
      const response = await apiClient.get<CoinRewardStats>('admin/coin-rewards/stats');

      if (response.success && response.data) {
        console.log('[CoinRewards] Stats fetched successfully');
        return response.data;
      }

      throw new Error(response.message || 'Failed to get stats');
    } catch (error: any) {
      console.error('[CoinRewards] Get stats error:', error.message);
      throw new Error(error.message || 'Failed to get stats');
    }
  }

  /**
   * Approve a pending coin reward
   */
  async approveReward(rewardId: string, notes?: string): Promise<{ success: boolean; message: string }> {
    try {
      console.log('[CoinRewards] Approving reward:', rewardId);
      const response = await apiClient.post<any>(`admin/coin-rewards/${rewardId}/approve`, { notes });

      return {
        success: response.success,
        message: response.message || 'Reward approved successfully'
      };
    } catch (error: any) {
      console.error('[CoinRewards] Approve reward error:', error.message);
      throw new Error(error.message || 'Failed to approve reward');
    }
  }

  /**
   * Reject a pending coin reward
   */
  async rejectReward(rewardId: string, reason: string): Promise<{ success: boolean; message: string }> {
    try {
      console.log('[CoinRewards] Rejecting reward:', rewardId);
      const response = await apiClient.post<any>(`admin/coin-rewards/${rewardId}/reject`, { reason });

      return {
        success: response.success,
        message: response.message || 'Reward rejected'
      };
    } catch (error: any) {
      console.error('[CoinRewards] Reject reward error:', error.message);
      throw new Error(error.message || 'Failed to reject reward');
    }
  }

  /**
   * Bulk approve multiple rewards
   */
  async bulkApprove(rewardIds: string[]): Promise<{ success: boolean; message: string; processed: number }> {
    try {
      console.log('[CoinRewards] Bulk approving:', rewardIds.length, 'rewards');
      const response = await apiClient.post<{ processed: number }>('admin/coin-rewards/bulk-approve', { rewardIds });

      return {
        success: response.success,
        message: response.message || 'Rewards approved',
        processed: response.data?.processed || rewardIds.length
      };
    } catch (error: any) {
      console.error('[CoinRewards] Bulk approve error:', error.message);
      throw new Error(error.message || 'Failed to bulk approve');
    }
  }

  /**
   * Bulk reject multiple rewards
   */
  async bulkReject(rewardIds: string[], reason: string): Promise<{ success: boolean; message: string; processed: number }> {
    try {
      console.log('[CoinRewards] Bulk rejecting:', rewardIds.length, 'rewards');
      const response = await apiClient.post<{ processed: number }>('admin/coin-rewards/bulk-reject', { rewardIds, reason });

      return {
        success: response.success,
        message: response.message || 'Rewards rejected',
        processed: response.data?.processed || rewardIds.length
      };
    } catch (error: any) {
      console.error('[CoinRewards] Bulk reject error:', error.message);
      throw new Error(error.message || 'Failed to bulk reject');
    }
  }
}

export const coinRewardsService = new CoinRewardsService();
export default coinRewardsService;
