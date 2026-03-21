import { apiClient } from './apiClient';

export interface EngagementConfigItem {
  _id: string;
  action: string;
  isEnabled: boolean;
  baseCoins: number;
  bonusCoins: number;
  dailyLimit: number;
  requiresModeration: boolean;
  multiplier: number;
  multiplierEndsAt?: string;
  qualityChecks?: {
    minTextLength?: number;
    minPhotos?: number;
    minVideoLength?: number;
    minResolution?: string;
  };
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export const engagementConfigService = {
  async getAll(): Promise<EngagementConfigItem[]> {
    const res = await apiClient.get<any>('admin/engagement-config');
    return res.data?.configs || [];
  },

  async update(action: string, patch: Partial<EngagementConfigItem>): Promise<EngagementConfigItem> {
    const res = await apiClient.patch<any>(`admin/engagement-config/${action}`, patch);
    return res.data?.config;
  },

  async setCampaign(action: string, multiplier: number, endsAt: string): Promise<void> {
    await apiClient.post(`admin/engagement-config/${action}/campaign`, { multiplier, endsAt });
  },
};
