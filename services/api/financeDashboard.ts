import { apiClient } from './apiClient';

export interface FinanceSummary {
  gmv: number;
  commission: number;
  commissionRate: number;
  coinCost: number;
  netRevenue: number;
  orderCount: number;
  coinsIssued: number;
  period: number;
}

export interface SettlementWallet {
  _id: string;
  merchant: {
    _id: string;
    fullName?: string;
    phoneNumber?: string;
  } | null;
  store: {
    _id: string;
    name?: string;
  } | null;
  balance: {
    total: number;
    available: number;
    pending: number;
    withdrawn: number;
    held: number;
  };
  statistics: {
    totalSales: number;
    totalPlatformFees: number;
    netSales: number;
    totalOrders: number;
  };
  settlementCycle: string;
  lastSettlementAt?: string;
  createdAt: string;
}

export interface SettlementsResponse {
  settlements: SettlementWallet[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

interface GetSettlementsParams {
  status?: 'pending' | 'settled';
  page?: number;
  limit?: number;
}

class FinanceDashboardService {
  async getSummary(period: number = 30): Promise<FinanceSummary> {
    const response = await apiClient.get<FinanceSummary>(`admin/finance/summary?period=${period}`);
    if (response.success && response.data) return response.data;
    throw new Error(response.message || 'Failed to fetch finance summary');
  }

  async getSettlements(params: GetSettlementsParams = {}): Promise<SettlementsResponse> {
    const query = new URLSearchParams();
    if (params.status) query.set('status', params.status);
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));

    const response = await apiClient.get<SettlementsResponse>(`admin/finance/settlements?${query.toString()}`);
    if (response.success && response.data) return response.data;
    throw new Error(response.message || 'Failed to fetch settlements');
  }

  async processSettlement(merchantWalletId: string): Promise<{ walletId: string; settledAmount: number }> {
    const response = await apiClient.post<{ walletId: string; settledAmount: number }>(
      `admin/finance/settlements/${merchantWalletId}/process`
    );
    if (response.success && response.data) return response.data;
    throw new Error(response.message || 'Failed to process settlement');
  }
}

export const financeDashboardService = new FinanceDashboardService();
