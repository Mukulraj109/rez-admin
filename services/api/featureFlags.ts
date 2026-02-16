import apiClient from './apiClient';

export interface FeatureFlagItem {
  _id: string;
  key: string;
  label: string;
  group: string;
  enabled: boolean;
  sortOrder: number;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface EarningConfigData {
  _id?: string;
  streaks: {
    login: { milestones: { day: number; coins: number }[] };
    order: { milestones: { day: number; coins: number }[] };
    review: { milestones: { day: number; coins: number }[] };
  };
  referral: {
    referrerAmount: number;
    refereeDiscount: number;
    milestoneBonus: number;
    minOrders: number;
    minSpend: number;
    timeframeDays: number;
    expiryDays: number;
  };
  dailyCheckin: {
    baseCoins: number;
    bonuses: { streak: number; coins: number }[];
  };
  billUpload: {
    minAmount: number;
    maxCashbackPercent: number;
    maxCashbackAmount: number;
  };
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export const featureFlagsService = {
  // Feature Flags
  async listFlags(group?: string) {
    const query = group ? `?group=${group}` : '';
    return apiClient.get(`/admin/feature-flags/flags${query}`);
  },
  async getFlag(key: string) {
    return apiClient.get(`/admin/feature-flags/flags/${key}`);
  },
  async createFlag(data: Partial<FeatureFlagItem>) {
    return apiClient.post('/admin/feature-flags/flags', data);
  },
  async updateFlag(key: string, data: Partial<FeatureFlagItem>) {
    return apiClient.put(`/admin/feature-flags/flags/${key}`, data);
  },
  async toggleFlag(key: string) {
    return apiClient.patch(`/admin/feature-flags/flags/${key}/toggle`);
  },
  async reorderFlags(items: { key: string; sortOrder: number }[]) {
    return apiClient.patch('/admin/feature-flags/flags/reorder', { items });
  },
  async deleteFlag(key: string) {
    return apiClient.delete(`/admin/feature-flags/flags/${key}`);
  },
  async seedFlags() {
    return apiClient.post('/admin/feature-flags/flags/seed');
  },

  // Earning Config
  async getEarningConfig() {
    return apiClient.get('/admin/feature-flags/earning-config');
  },
  async updateEarningConfig(data: Partial<EarningConfigData>) {
    return apiClient.put('/admin/feature-flags/earning-config', data);
  },
  async seedEarningConfig() {
    return apiClient.post('/admin/feature-flags/earning-config/seed');
  },
};
