import { apiClient } from './apiClient';

export interface AdminWalletTransaction {
  _id: string;
  type: 'commission' | 'adjustment';
  amount: number;
  orderId?: string;
  orderNumber?: string;
  description: string;
  createdAt: string;
}

export interface AdminWalletSummary {
  balance: {
    total: number;
    available: number;
  };
  statistics: {
    totalCommissions: number;
    totalOrders: number;
    averageCommission: number;
  };
  recentTransactions: AdminWalletTransaction[];
}

export interface TransactionHistoryResponse {
  transactions: AdminWalletTransaction[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface DailyBreakdownItem {
  date: string;
  total: number;
  count: number;
}

export interface DailyBreakdownResponse {
  breakdown: DailyBreakdownItem[];
  days: number;
}

class AdminWalletService {
  async getWalletSummary(): Promise<AdminWalletSummary> {
    try {
      if (__DEV__) console.log('[AdminWallet] Fetching wallet summary...');
      const response = await apiClient.get<AdminWalletSummary>('admin/wallet');

      if (response.success && response.data) {
        if (__DEV__) console.log('[AdminWallet] Summary fetched successfully');
        return response.data;
      }

      throw new Error(response.message || 'Failed to get wallet summary');
    } catch (error: any) {
      if (__DEV__) console.error('[AdminWallet] Get summary error:', error.message);
      throw new Error(error.message || 'Failed to get admin wallet summary');
    }
  }

  async getTransactionHistory(
    page: number = 1,
    limit: number = 20,
    startDate?: string,
    endDate?: string
  ): Promise<TransactionHistoryResponse> {
    try {
      let url = `admin/wallet/transactions?page=${page}&limit=${limit}`;
      if (startDate) url += `&startDate=${startDate}`;
      if (endDate) url += `&endDate=${endDate}`;

      const response = await apiClient.get<TransactionHistoryResponse>(url);

      if (response.success && response.data) {
        return response.data;
      }

      throw new Error(response.message || 'Failed to get transactions');
    } catch (error: any) {
      if (__DEV__) console.error('[AdminWallet] Get transactions error:', error.message);
      throw new Error(error.message || 'Failed to get transactions');
    }
  }

  async getDailyBreakdown(days: number = 30): Promise<DailyBreakdownResponse> {
    try {
      const response = await apiClient.get<DailyBreakdownResponse>(
        `admin/wallet/daily-breakdown?days=${days}`
      );

      if (response.success && response.data) {
        return response.data;
      }

      throw new Error(response.message || 'Failed to get daily breakdown');
    } catch (error: any) {
      if (__DEV__) console.error('[AdminWallet] Get daily breakdown error:', error.message);
      throw new Error(error.message || 'Failed to get daily breakdown');
    }
  }
}

export const adminWalletService = new AdminWalletService();
export default adminWalletService;
