import { apiClient } from './apiClient';

// Types
export interface PriveOffer {
  _id: string;
  title: string;
  subtitle: string;
  description: string;
  brand: {
    name: string;
    logo?: string;
  };
  reward: {
    type: 'percentage' | 'fixed' | 'coins';
    value: number;
    displayText: string;
    coinType?: 'rez' | 'prive' | 'branded';
  };
  tierRequired: 'none' | 'entry' | 'signature' | 'elite';
  category?: string;
  isActive: boolean;
  isFeatured: boolean;
  isExclusive: boolean;
  startsAt: string;
  expiresAt: string;
  views: number;
  clicks: number;
  redemptions: number;
  totalLimit?: number;
  limitPerUser?: number;
  priority: number;
  images?: string[];
  coverImage?: string;
  terms?: string[];
  howToRedeem?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PriveVoucher {
  _id: string;
  userId: any;
  code: string;
  type: 'gift_card' | 'bill_pay' | 'experience' | 'charity';
  coinAmount: number;
  coinType: string;
  value: number;
  currency: string;
  status: 'active' | 'used' | 'expired' | 'cancelled';
  expiresAt: string;
  usedAt?: string;
  partnerName?: string;
  category?: string;
  createdAt: string;
}

export interface UserReputation {
  _id: string;
  userId: string;
  pillars: Record<string, { score: number; factors: any }>;
  totalScore: number;
  tier: string;
  isEligible: boolean;
  lastCalculated: string;
  history: any[];
}

export interface PriveAnalytics {
  offerSummary: {
    totalOffers: number;
    activeOffers: number;
    totalViews: number;
    totalClicks: number;
    overallCTR: number;
    totalRedemptions: number;
  };
  offersByTier: Array<{ _id: string; count: number }>;
  offersByType: Array<{ _id: string; count: number }>;
  topPerformingOffers: Array<{
    _id: string;
    title: string;
    brand: string;
    views: number;
    clicks: number;
    ctr: number;
    redemptions: number;
  }>;
  voucherStats: Array<{ _id: string; count: number; totalValue: number }>;
  tierDistribution: Array<{ _id: string; count: number }>;
  scoreDistribution: Array<{ _id: string; count: number }>;
}

// API Service
class PriveAdminApi {
  // Offers
  async getOffers(params?: {
    page?: number;
    limit?: number;
    status?: string;
    tier?: string;
    search?: string;
    featured?: boolean;
  }) {
    return apiClient.get('/admin/prive/offers', { params });
  }

  async createOffer(data: Partial<PriveOffer>) {
    return apiClient.post('/admin/prive/offers', data);
  }

  async updateOffer(id: string, data: Partial<PriveOffer>) {
    return apiClient.put(`/admin/prive/offers/${id}`, data);
  }

  async deleteOffer(id: string) {
    return apiClient.delete(`/admin/prive/offers/${id}`);
  }

  async toggleOfferStatus(id: string) {
    return apiClient.patch(`/admin/prive/offers/${id}/status`);
  }

  // Vouchers
  async getVouchers(params?: {
    page?: number;
    limit?: number;
    status?: string;
    userId?: string;
    type?: string;
    search?: string;
  }) {
    return apiClient.get('/admin/prive/vouchers', { params });
  }

  async invalidateVoucher(id: string, reason?: string) {
    return apiClient.patch(`/admin/prive/vouchers/${id}/invalidate`, { reason });
  }

  async issueVoucher(data: {
    userId: string;
    type: string;
    coinAmount: number;
    category?: string;
    partnerName?: string;
    partnerLogo?: string;
    reason: string;
  }) {
    return apiClient.post('/admin/prive/vouchers', data);
  }

  async extendVoucher(id: string, data: { newExpiresAt?: string; extendDays?: number }) {
    return apiClient.patch(`/admin/prive/vouchers/${id}/extend`, data);
  }

  // Reputation
  async getUserReputation(userId: string) {
    return apiClient.get(`/admin/prive/users/${userId}/reputation`);
  }

  async overrideReputation(userId: string, data: {
    pillars: Record<string, number>;
    reason: string;
  }) {
    return apiClient.patch(`/admin/prive/users/${userId}/reputation`, data);
  }

  // Recalculate
  async recalculateReputation(userId: string) {
    return apiClient.post(`/admin/prive/users/${userId}/recalculate`);
  }

  // Redemption Config (via WalletConfig)
  async getRedemptionConfig() {
    return apiClient.get('/admin/wallet-config');
  }

  async updateRedemptionConfig(redemptionConfig: Record<string, any>) {
    return apiClient.put('/admin/wallet-config', { redemptionConfig });
  }

  // Habit Loop Config (via WalletConfig)
  async updateHabitLoopConfig(habitLoopConfig: Record<string, any>) {
    return apiClient.put('/admin/wallet-config', { habitLoopConfig });
  }

  // Analytics
  async getAnalytics() {
    return apiClient.get('/admin/prive/analytics');
  }

  // Smart Spend
  async getSmartSpendItems(params?: {
    page?: number;
    limit?: number;
    status?: string;
    itemType?: string;
    section?: string;
    search?: string;
    featured?: string;
  }) {
    return apiClient.get('/admin/prive/smart-spend', { params });
  }

  async createSmartSpendItem(data: any) {
    return apiClient.post('/admin/prive/smart-spend', data);
  }

  async updateSmartSpendItem(id: string, data: any) {
    return apiClient.put(`/admin/prive/smart-spend/${id}`, data);
  }

  async deleteSmartSpendItem(id: string) {
    return apiClient.delete(`/admin/prive/smart-spend/${id}`);
  }

  async toggleSmartSpendItemStatus(id: string) {
    return apiClient.patch(`/admin/prive/smart-spend/${id}/status`);
  }

  async getSmartSpendAnalytics() {
    return apiClient.get('/admin/prive/smart-spend/analytics');
  }
}

export const priveAdminApi = new PriveAdminApi();
export default priveAdminApi;
