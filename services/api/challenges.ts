import apiClient from './apiClient';

export type ChallengeStatus = 'draft' | 'scheduled' | 'active' | 'paused' | 'completed' | 'expired' | 'disabled';
export type ChallengeVisibility = 'play_and_earn' | 'missions' | 'both';

export interface AdminChallenge {
  _id: string;
  type: 'daily' | 'weekly' | 'monthly' | 'special';
  title: string;
  description: string;
  icon: string;
  requirements: {
    action: string;
    target: number;
    stores?: string[];
    categories?: string[];
    minAmount?: number;
  };
  rewards: {
    coins: number;
    badges?: string[];
    exclusiveDeals?: string[];
    multiplier?: number;
  };
  difficulty: 'easy' | 'medium' | 'hard';
  startDate: string;
  endDate: string;
  participantCount: number;
  completionCount: number;
  active: boolean;
  featured: boolean;
  maxParticipants?: number;
  status: ChallengeStatus;
  visibility: ChallengeVisibility;
  priority: number;
  scheduledPublishAt?: string;
  pausedAt?: string;
  statusHistory?: Array<{ status: string; changedAt: string; changedBy?: string; reason?: string }>;
  createdAt: string;
  updatedAt: string;
}

export interface ConversionFunnelStep {
  count: number;
  uniqueUsers: number;
}

export interface ChallengeBreakdown {
  _id: string;
  title: string;
  participants: number;
  completions: number;
  completionRate: number;
  coinReward: number;
}

export interface ChallengeAnalytics {
  activeChallenges: number;
  totalParticipants: number;
  totalCompletions: number;
  avgCompletionRate: number;
  totalCoinLiability: number;
  byType: Record<string, number>;
  challengeBreakdown: ChallengeBreakdown[];
  conversionFunnel: Record<string, ConversionFunnelStep>;
}

export interface ChallengeTemplate {
  type: string;
  title: string;
  description: string;
  icon: string;
  requirements: { action: string; target: number; };
  rewards: { coins: number; badges?: string[]; multiplier?: number; };
  difficulty: string;
  durationDays?: number;
}

export const challengesService = {
  async list(params?: { page?: number; limit?: number; type?: string; difficulty?: string; status?: string; featured?: string }) {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.type) query.set('type', params.type);
    if (params?.difficulty) query.set('difficulty', params.difficulty);
    if (params?.status) query.set('status', params.status);
    if (params?.featured) query.set('featured', params.featured);
    return apiClient.get(`/admin/challenges?${query.toString()}`);
  },

  async getById(id: string) {
    return apiClient.get(`/admin/challenges/${id}`);
  },

  async create(data: Partial<AdminChallenge>) {
    return apiClient.post('/admin/challenges', data);
  },

  async createFromTemplate(templateIndex: number, startDate?: string, featured?: boolean) {
    return apiClient.post('/admin/challenges/from-template', { templateIndex, startDate, featured });
  },

  async update(id: string, data: Partial<AdminChallenge>) {
    return apiClient.put(`/admin/challenges/${id}`, data);
  },

  async toggle(id: string) {
    return apiClient.patch(`/admin/challenges/${id}/toggle`);
  },

  async toggleFeatured(id: string) {
    return apiClient.patch(`/admin/challenges/${id}/feature`);
  },

  async delete(id: string) {
    return apiClient.delete(`/admin/challenges/${id}`);
  },

  async getStats() {
    return apiClient.get('/admin/challenges/stats');
  },

  async getTemplates() {
    return apiClient.get('/admin/challenges/templates');
  },

  async changeStatus(id: string, status: ChallengeStatus, reason?: string) {
    return apiClient.patch(`/admin/challenges/${id}/status`, { status, reason });
  },

  async clone(id: string, overrides?: Partial<AdminChallenge>) {
    return apiClient.post(`/admin/challenges/${id}/clone`, overrides || {});
  },

  async setVisibility(id: string, visibility: ChallengeVisibility) {
    return apiClient.patch(`/admin/challenges/${id}/visibility`, { visibility });
  },

  async setPriority(id: string, priority: number) {
    return apiClient.patch(`/admin/challenges/${id}/priority`, { priority });
  },

  async getAnalytics(params?: { type?: string; period?: string }) {
    const query = new URLSearchParams();
    if (params?.type) query.set('type', params.type);
    if (params?.period) query.set('period', params.period);
    const qs = query.toString();
    return apiClient.get(`/admin/challenges/analytics${qs ? `?${qs}` : ''}`);
  },
};
