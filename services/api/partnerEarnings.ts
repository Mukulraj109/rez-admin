import { apiClient } from './apiClient';

export interface PartnerEarningsAnalytics {
  totalPartnerEarnings: number;
  totalTransactions: number;
  breakdown: Record<string, { amount: number; count: number }>;
  monthlyTrend: Array<{ year: number; month: number; amount: number; count: number }>;
  topEarners: Array<{
    userId: string;
    name: string;
    level: number;
    levelName: string;
    totalEarned: number;
    txCount: number;
  }>;
  totalPartners: number;
  pendingLiability: number;
  levelDistribution: Array<{ level: number; count: number }>;
}

export interface PartnerUser {
  _id: string;
  userId: string;
  name: string;
  email: string;
  phoneNumber?: string;
  avatar?: string;
  currentLevel: { level: number; name: string };
  earnings: { total: number; available: number; pending: number; thisMonth: number };
  totalOrders: number;
  totalSpent: number;
  lastActivityDate: string;
}

export interface PartnerEarningsConfigData {
  cashbackRates: { partner: number; influencer: number; ambassador: number };
  milestones: Array<{
    orderCount: number;
    rewardType: string;
    rewardValue: number;
    title: string;
    description: string;
  }>;
  jackpots: Array<{
    spendAmount: number;
    rewardType: string;
    rewardValue: number;
    title: string;
    description: string;
  }>;
  levelUpBonuses: { toPartner: number; toInfluencer: number; toAmbassador: number };
  transactionBonuses: {
    partner: { every: number; reward: number };
    influencer: { every: number; reward: number };
    ambassador: { every: number; reward: number };
  };
  taskRewards: { profile: number; review: number; referral: number; social: number };
  referralBonus: number;
  settlementConfig: {
    autoSettleEnabled: boolean;
    autoSettleDelayHours: number;
    requireApprovalAbove: number;
    maxDailySettlement: number;
  };
}

class PartnerEarningsService {
  async getAnalytics(): Promise<PartnerEarningsAnalytics> {
    const response = await apiClient.get<PartnerEarningsAnalytics>('admin/partner-earnings/analytics');
    if (response.success && response.data) return response.data;
    throw new Error(response.message || 'Failed to fetch analytics');
  }

  async getUsers(params?: {
    search?: string;
    level?: number;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortDir?: string;
  }): Promise<{ partners: PartnerUser[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
    const query: Record<string, any> = {};
    if (params?.search) query.search = params.search;
    if (params?.level) query.level = params.level;
    if (params?.page) query.page = params.page;
    if (params?.limit) query.limit = params.limit;
    if (params?.sortBy) query.sortBy = params.sortBy;
    if (params?.sortDir) query.sortDir = params.sortDir;

    const response = await apiClient.get<any>('admin/partner-earnings/users', query);
    if (response.success && response.data) return response.data;
    throw new Error(response.message || 'Failed to fetch partners');
  }

  async getConfig(): Promise<PartnerEarningsConfigData> {
    const response = await apiClient.get<PartnerEarningsConfigData>('admin/partner-earnings/config');
    if (response.success && response.data) return response.data;
    throw new Error(response.message || 'Failed to fetch config');
  }

  async updateConfig(data: Partial<PartnerEarningsConfigData>): Promise<PartnerEarningsConfigData> {
    const response = await apiClient.put<PartnerEarningsConfigData>('admin/partner-earnings/config', data);
    if (response.success && response.data) return response.data;
    throw new Error(response.message || 'Failed to update config');
  }

  async adjustUserEarnings(userId: string, data: { amount: number; type: 'credit' | 'debit'; reason: string }): Promise<void> {
    const response = await apiClient.post(`admin/partner-earnings/${userId}/adjust`, data);
    if (!response.success) throw new Error(response.message || 'Failed to adjust earnings');
  }
}

export const partnerEarningsService = new PartnerEarningsService();
