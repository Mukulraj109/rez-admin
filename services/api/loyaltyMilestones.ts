import { apiClient } from './apiClient';

export interface LoyaltyMilestone {
  _id: string;
  title: string;
  description: string;
  targetType: string;
  targetValue: number;
  reward: string;
  rewardType: string;
  rewardCoins?: number;
  rewardDiscount?: number;
  icon: string;
  color: string;
  badgeImage?: string;
  tier?: string;
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

class LoyaltyMilestonesService {
  private baseUrl = 'admin/loyalty-milestones';

  async getMilestones(params?: { page?: number; limit?: number; status?: string; targetType?: string; rewardType?: string; tier?: string; search?: string }) {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));
    if (params?.status) query.append('status', params.status);
    if (params?.targetType) query.append('targetType', params.targetType);
    if (params?.rewardType) query.append('rewardType', params.rewardType);
    if (params?.tier) query.append('tier', params.tier);
    if (params?.search) query.append('search', params.search);

    return apiClient.get<{ milestones: LoyaltyMilestone[]; pagination: any }>(`${this.baseUrl}?${query.toString()}`);
  }

  async getMilestone(id: string) {
    return apiClient.get<LoyaltyMilestone>(`${this.baseUrl}/${id}`);
  }

  async createMilestone(data: Partial<LoyaltyMilestone>) {
    return apiClient.post<LoyaltyMilestone>(this.baseUrl, data);
  }

  async updateMilestone(id: string, data: Partial<LoyaltyMilestone>) {
    return apiClient.put<LoyaltyMilestone>(`${this.baseUrl}/${id}`, data);
  }

  async toggleMilestone(id: string) {
    return apiClient.patch<LoyaltyMilestone>(`${this.baseUrl}/${id}/toggle`);
  }

  async deleteMilestone(id: string) {
    return apiClient.delete(`${this.baseUrl}/${id}`);
  }
}

export const loyaltyMilestonesService = new LoyaltyMilestonesService();
export default loyaltyMilestonesService;
