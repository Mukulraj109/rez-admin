import apiClient from './apiClient';

export interface AchievementConditionRule {
  metric: string;
  operator: 'gte' | 'lte' | 'eq' | 'gt' | 'lt';
  target: number;
  weight: number;
}

export interface AchievementConditions {
  type: 'simple' | 'compound' | 'streak' | 'time_bounded';
  rules: AchievementConditionRule[];
  combinator: 'AND' | 'OR';
  streakMetric?: string;
  streakTarget?: number;
  timeWindowDays?: number;
  startsAt?: string;
  endsAt?: string;
}

export interface AchievementReward {
  coins: number;
  cashback?: number;
  multiplier?: number;
  badge?: string;
  title?: string;
}

export interface AdminAchievement {
  _id: string;
  type: string;
  title: string;
  description: string;
  icon: string;
  color?: string;
  category?: string;
  target: number;
  coinReward: number;
  badge?: string;
  isActive: boolean;
  sortOrder?: number;
  unlockCount?: number;
  createdAt: string;
  updatedAt: string;
  conditions?: AchievementConditions;
  visibility?: 'visible' | 'hidden_until_progress' | 'secret';
  repeatability?: 'one_time' | 'daily' | 'weekly' | 'monthly';
  tier?: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  reward?: AchievementReward;
  trackedMetrics?: string[];
  prerequisites?: string[];
}

export interface AchievementStats {
  totalAchievements: number;
  activeCount: number;
  totalUnlocks: number;
  mostUnlocked: { type: string; title: string; count: number } | null;
  leastUnlocked: { type: string; title: string; count: number } | null;
}

export const achievementsService = {
  async list(params?: { page?: number; limit?: number; type?: string; category?: string; isActive?: string }) {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.type) query.set('type', params.type);
    if (params?.category) query.set('category', params.category);
    if (params?.isActive) query.set('isActive', params.isActive);
    return apiClient.get(`/admin/achievements?${query.toString()}`);
  },
  async getById(id: string) {
    return apiClient.get(`/admin/achievements/${id}`);
  },
  async getStats() {
    return apiClient.get('/admin/achievements/stats');
  },
  async create(data: Partial<AdminAchievement>) {
    return apiClient.post('/admin/achievements', data);
  },
  async seed() {
    return apiClient.post('/admin/achievements/seed');
  },
  async update(id: string, data: Partial<AdminAchievement>) {
    return apiClient.put(`/admin/achievements/${id}`, data);
  },
  async toggle(id: string) {
    return apiClient.patch(`/admin/achievements/${id}/toggle`);
  },
  async delete(id: string) {
    return apiClient.delete(`/admin/achievements/${id}`);
  },
  async getMetrics() {
    return apiClient.get('/admin/achievements/metrics');
  },
};
