import apiClient from './apiClient';

export interface MilestoneReward {
  day: number;
  coins: number;
  badge?: string;
}

export interface DailyCheckinConfig {
  _id: string;
  dayRewards: number[];
  milestoneRewards: MilestoneReward[];
  proTips: string[];
  affiliateTip: string;
  reviewTimeframe: string;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export const dailyCheckinConfigService = {
  async getConfig() {
    return apiClient.get<DailyCheckinConfig>('/admin/daily-checkin-config');
  },

  async updateConfig(data: Partial<Omit<DailyCheckinConfig, '_id' | 'createdAt' | 'updatedAt'>>) {
    return apiClient.put<DailyCheckinConfig>('/admin/daily-checkin-config', data);
  },

  async resetConfig() {
    return apiClient.post<DailyCheckinConfig>('/admin/daily-checkin-config/reset');
  },
};
