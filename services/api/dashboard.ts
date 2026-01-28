import { apiClient } from './apiClient';

export interface DashboardStats {
  merchants: {
    total: number;
    active: number;
    pending: number;
    suspended: number;
    newThisMonth: number;
  };
  users: {
    total: number;
    active: number;
    newThisMonth: number;
    newToday: number;
  };
  orders: {
    total: number;
    today: number;
    thisWeek: number;
    thisMonth: number;
    pendingCount: number;
  };
  revenue: {
    today: number;
    thisWeek: number;
    thisMonth: number;
    totalPlatformFees: number;
  };
  coins: {
    totalAwarded: number;
    pendingApproval: number;
    awardedToday: number;
    awardedThisMonth: number;
  };
}

export interface RecentActivity {
  id: string;
  type: 'order' | 'merchant' | 'user' | 'coin_reward' | 'transaction';
  title: string;
  description: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

class DashboardService {
  /**
   * Get platform dashboard statistics
   */
  async getStats(): Promise<DashboardStats> {
    try {
      console.log('[Dashboard] Fetching platform stats...');
      const response = await apiClient.get<DashboardStats>('admin/dashboard/stats');

      if (response.success && response.data) {
        console.log('[Dashboard] Stats fetched successfully');
        return response.data;
      }

      throw new Error(response.message || 'Failed to get stats');
    } catch (error: any) {
      console.error('[Dashboard] Get stats error:', error.message);
      throw new Error(error.message || 'Failed to get dashboard stats');
    }
  }

  /**
   * Get recent platform activity
   */
  async getRecentActivity(limit: number = 20): Promise<RecentActivity[]> {
    try {
      console.log('[Dashboard] Fetching recent activity...');
      const response = await apiClient.get<RecentActivity[]>(`admin/dashboard/recent-activity?limit=${limit}`);

      if (response.success) {
        console.log('[Dashboard] Recent activity fetched');
        return response.data || [];
      }

      throw new Error(response.message || 'Failed to get activity');
    } catch (error: any) {
      console.error('[Dashboard] Get recent activity error:', error.message);
      throw new Error(error.message || 'Failed to get recent activity');
    }
  }
}

export const dashboardService = new DashboardService();
export default dashboardService;
