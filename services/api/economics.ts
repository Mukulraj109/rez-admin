import { apiClient } from './apiClient';

export interface CashbackToday {
  totalAmount: number;
  transactionCount: number;
  yesterdayAmount: number;
}

export interface MerchantLiabilityStats {
  totalPending: number;
  totalSettled: number;
  activeCount: number;
  pendingSettlementCount: number;
  disputedCount: number;
}

export interface FraudFlaggedUser {
  userId: string;
  userName: string;
  totalEarned: number;
  transactionCount: number;
}

export interface FraudAlerts {
  alertCount: number;
  threshold: number;
  window: string;
  topFlaggedUsers: FraudFlaggedUser[];
  hourlyAlertCounts: Array<{ hour: number; count: number }>;
}

export interface CoinIssuance {
  todayTotal: number;
  yesterdayTotal: number;
  changePercent: number;
  hourlyRate: number;
  topSources: Array<{ source: string; amount: number; count: number }>;
}

export interface RewardReversals {
  pendingReversals: number;
  completedReversalsToday: number;
  completedReversalAmount: number;
  oldestPendingAge: number | null;
}

export interface SettlementDue {
  totalDueMerchants: number;
  totalPendingAmount: number;
  topMerchants: Array<{
    merchantId: string;
    storeName: string;
    pendingAmount: number;
    settlementCycle: string;
  }>;
}

export interface EconomicsOverview {
  cashbackToday: CashbackToday;
  merchantLiability: MerchantLiabilityStats;
  fraudAlerts: FraudAlerts;
  coinIssuance: CoinIssuance;
  rewardReversals: RewardReversals;
  settlementDue: SettlementDue;
  lastUpdated: string;
}

class EconomicsService {
  async getOverview(): Promise<EconomicsOverview> {
    const response = await apiClient.get<EconomicsOverview>('admin/economics/overview');
    if (response.success && response.data) return response.data;
    throw new Error(response.message || 'Failed to fetch economics overview');
  }
}

export const economicsService = new EconomicsService();
