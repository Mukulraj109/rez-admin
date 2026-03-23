import { apiClient } from './apiClient';

// ---- Types ----

export type BillType = 'prepaid' | 'postpaid' | 'electricity' | 'dth' | 'broadband' | 'gas' | 'fastag' | 'water' | 'insurance' | 'loan';

export interface BbpsProvider {
  _id: string;
  name: string;
  code: string;
  billType: BillType;
  aggregatorCode: string;
  logo?: string;
  cashbackPercent: number;
  promoCoinsFixed: number;
  isActive: boolean;
  minAmount: number;
  maxAmount: number;
  createdAt: string;
  updatedAt: string;
}

export interface BbpsTransaction {
  _id: string;
  user: {
    _id: string;
    fullName?: string;
    phoneNumber?: string;
    profile?: { firstName?: string; lastName?: string };
  };
  provider: {
    _id: string;
    name: string;
    code: string;
    billType: BillType;
  };
  billType: BillType;
  amount: number;
  coinsIssued: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
  referenceId?: string;
  subscriberId?: string;
  errorMessage?: string;
  refundedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BbpsStats {
  totalVolume: number;
  totalTransactions: number;
  pendingCount: number;
  failedCount: number;
  completedCount: number;
  refundedCount: number;
  totalCoinsIssued: number;
  failedRate: number;
  volumeByBillType: { billType: string; volume: number; count: number }[];
  topProviders: { name: string; code: string; volume: number; count: number }[];
}

// ---- Service ----

export const bbpsAdminService = {
  // Providers
  async getProviders(
    page = 1,
    limit = 20,
    billType?: string,
    search?: string
  ): Promise<{ providers: BbpsProvider[]; pagination: any }> {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (billType && billType !== 'all') params.set('billType', billType);
    if (search) params.set('search', search);
    const res = await apiClient.get<any>(`admin/bbps/providers?${params}`);
    return {
      providers: res.data?.providers || res.data || [],
      pagination: res.data?.pagination || res.pagination || { page, limit, total: 0, totalPages: 0 },
    };
  },

  async createProvider(data: Partial<BbpsProvider>): Promise<BbpsProvider> {
    const res = await apiClient.post<any>('admin/bbps/providers', data);
    return res.data;
  },

  async updateProvider(id: string, data: Partial<BbpsProvider>): Promise<BbpsProvider> {
    const res = await apiClient.put<any>(`admin/bbps/providers/${id}`, data);
    return res.data;
  },

  async toggleProvider(id: string): Promise<BbpsProvider> {
    const res = await apiClient.patch<any>(`admin/bbps/providers/${id}/toggle`);
    return res.data;
  },

  // Transactions
  async getTransactions(
    page = 1,
    limit = 20,
    filters?: { status?: string; billType?: string; startDate?: string; endDate?: string; search?: string }
  ): Promise<{ transactions: BbpsTransaction[]; pagination: any }> {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (filters?.status && filters.status !== 'all') params.set('status', filters.status);
    if (filters?.billType && filters.billType !== 'all') params.set('billType', filters.billType);
    if (filters?.startDate) params.set('startDate', filters.startDate);
    if (filters?.endDate) params.set('endDate', filters.endDate);
    if (filters?.search) params.set('search', filters.search);
    const res = await apiClient.get<any>(`admin/bbps/transactions?${params}`);
    return {
      transactions: res.data?.transactions || res.data || [],
      pagination: res.data?.pagination || res.pagination || { page, limit, total: 0, totalPages: 0 },
    };
  },

  async refundTransaction(id: string, reason?: string): Promise<void> {
    await apiClient.post(`admin/bbps/transactions/${id}/refund`, { reason });
  },

  // Stats / Analytics
  async getStats(period?: string): Promise<BbpsStats> {
    const params = period ? `?period=${period}` : '';
    const res = await apiClient.get<any>(`admin/bbps/stats${params}`);
    return res.data || {
      totalVolume: 0,
      totalTransactions: 0,
      pendingCount: 0,
      failedCount: 0,
      completedCount: 0,
      refundedCount: 0,
      totalCoinsIssued: 0,
      failedRate: 0,
      volumeByBillType: [],
      topProviders: [],
    };
  },
};
