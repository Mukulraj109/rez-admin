import { apiClient } from './apiClient';

export interface Merchant {
  _id: string;
  userId: string;
  businessName: string;
  businessType: string;
  email: string;
  phoneNumber: string;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  verificationStatus: 'pending' | 'verified' | 'failed';
  stores: Array<{
    _id: string;
    name: string;
    status: string;
  }>;
  bankDetails?: {
    accountNumber: string;
    ifscCode: string;
    accountHolderName: string;
    isVerified: boolean;
  };
  documents?: Array<{
    type: string;
    url: string;
    status: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface MerchantWallet {
  _id: string;
  merchant: string;
  balance: {
    total: number;
    available: number;
    pending: number;
    withdrawn: number;
  };
  statistics: {
    totalSales: number;
    totalPlatformFees: number;
    netSales: number;
    totalOrders: number;
    averageOrderValue: number;
  };
  bankDetails?: {
    accountNumber: string;
    ifscCode: string;
    accountHolderName: string;
    bankName: string;
    isVerified: boolean;
  };
  isActive: boolean;
  createdAt: string;
}

export interface MerchantWalletSummary {
  merchantId: string;
  businessName: string;
  balance: {
    total: number;
    available: number;
    pending: number;
    withdrawn: number;
  };
  statistics: {
    totalSales: number;
    totalPlatformFees: number;
    netSales: number;
    totalOrders: number;
  };
}

export interface WithdrawalRequest {
  _id: string;
  merchantId: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  bankDetails: {
    accountNumber: string;
    ifscCode: string;
    accountHolderName: string;
    bankName: string;
  };
  requestedAt: string;
  processedAt?: string;
  processedBy?: string;
  rejectionReason?: string;
}

export interface MerchantsListResponse {
  merchants: Merchant[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

class MerchantsService {
  /**
   * Get list of merchants
   */
  async getMerchants(
    page: number = 1,
    limit: number = 20,
    status?: string,
    search?: string
  ): Promise<MerchantsListResponse> {
    try {
      let url = `admin/merchants?page=${page}&limit=${limit}`;
      if (status) url += `&status=${status}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;

      console.log('[Merchants] Fetching merchants list...');
      const response = await apiClient.get<Merchant[]>(url);

      if (response.success) {
        console.log('[Merchants] Merchants fetched successfully');
        // Backend returns { data: { merchants: [...], pagination: {...} } }
        const nested = response.data as any;
        return {
          merchants: nested?.merchants || (Array.isArray(nested) ? nested : []),
          pagination: nested?.pagination || response.pagination || { page, limit, total: 0, totalPages: 0 }
        };
      }

      throw new Error(response.message || 'Failed to get merchants');
    } catch (error: any) {
      console.error('[Merchants] Get merchants error:', error.message);
      throw new Error(error.message || 'Failed to get merchants');
    }
  }

  /**
   * Get single merchant by ID
   */
  async getMerchant(merchantId: string): Promise<Merchant> {
    try {
      console.log('[Merchants] Fetching merchant:', merchantId);
      const response = await apiClient.get<Merchant>(`admin/merchants/${merchantId}`);

      if (response.success && response.data) {
        return response.data;
      }

      throw new Error(response.message || 'Failed to get merchant');
    } catch (error: any) {
      console.error('[Merchants] Get merchant error:', error.message);
      throw new Error(error.message || 'Failed to get merchant');
    }
  }

  /**
   * Approve a merchant
   */
  async approveMerchant(merchantId: string): Promise<{ success: boolean; message: string }> {
    try {
      console.log('[Merchants] Approving merchant:', merchantId);
      const response = await apiClient.post<any>(`admin/merchants/${merchantId}/approve`);

      return {
        success: response.success,
        message: response.message || 'Merchant approved'
      };
    } catch (error: any) {
      console.error('[Merchants] Approve merchant error:', error.message);
      throw new Error(error.message || 'Failed to approve merchant');
    }
  }

  /**
   * Reject a merchant
   */
  async rejectMerchant(merchantId: string, reason: string): Promise<{ success: boolean; message: string }> {
    try {
      console.log('[Merchants] Rejecting merchant:', merchantId);
      const response = await apiClient.post<any>(`admin/merchants/${merchantId}/reject`, { reason });

      return {
        success: response.success,
        message: response.message || 'Merchant rejected'
      };
    } catch (error: any) {
      console.error('[Merchants] Reject merchant error:', error.message);
      throw new Error(error.message || 'Failed to reject merchant');
    }
  }

  /**
   * Suspend a merchant
   */
  async suspendMerchant(merchantId: string, reason: string): Promise<{ success: boolean; message: string }> {
    try {
      console.log('[Merchants] Suspending merchant:', merchantId);
      const response = await apiClient.post<any>(`admin/merchants/${merchantId}/suspend`, { reason });

      return {
        success: response.success,
        message: response.message || 'Merchant suspended'
      };
    } catch (error: any) {
      console.error('[Merchants] Suspend merchant error:', error.message);
      throw new Error(error.message || 'Failed to suspend merchant');
    }
  }

  // ==================== Merchant Wallet Endpoints ====================

  /**
   * Get all merchant wallets (admin overview)
   */
  async getMerchantWallets(
    page: number = 1,
    limit: number = 20
  ): Promise<{ wallets: MerchantWalletSummary[]; pagination: any }> {
    try {
      console.log('[Merchants] Fetching merchant wallets...');
      const response = await apiClient.get<MerchantWalletSummary[]>(`admin/merchant-wallets?page=${page}&limit=${limit}`);

      if (response.success) {
        console.log('[Merchants] Wallets fetched successfully');
        return {
          wallets: response.data || [],
          pagination: response.pagination || { page, limit, total: 0, totalPages: 0 }
        };
      }

      throw new Error(response.message || 'Failed to get wallets');
    } catch (error: any) {
      console.error('[Merchants] Get merchant wallets error:', error.message);
      throw new Error(error.message || 'Failed to get merchant wallets');
    }
  }

  /**
   * Get wallet statistics
   */
  async getWalletStats(): Promise<any> {
    try {
      console.log('[Merchants] Fetching wallet stats...');
      const response = await apiClient.get<any>('admin/merchant-wallets/stats');

      if (response.success && response.data) {
        return response.data;
      }

      throw new Error(response.message || 'Failed to get wallet stats');
    } catch (error: any) {
      console.error('[Merchants] Get wallet stats error:', error.message);
      throw new Error(error.message || 'Failed to get wallet stats');
    }
  }

  /**
   * Get single merchant wallet
   */
  async getMerchantWallet(merchantId: string): Promise<MerchantWallet> {
    try {
      console.log('[Merchants] Fetching wallet for merchant:', merchantId);
      const response = await apiClient.get<MerchantWallet>(`admin/merchant-wallets/${merchantId}`);

      if (response.success && response.data) {
        return response.data;
      }

      throw new Error(response.message || 'Failed to get wallet');
    } catch (error: any) {
      console.error('[Merchants] Get merchant wallet error:', error.message);
      throw new Error(error.message || 'Failed to get merchant wallet');
    }
  }

  /**
   * Get merchant wallet transactions
   */
  async getWalletTransactions(
    merchantId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ transactions: any[]; pagination: any }> {
    try {
      console.log('[Merchants] Fetching wallet transactions for:', merchantId);
      const response = await apiClient.get<any[]>(`admin/merchant-wallets/${merchantId}/transactions?page=${page}&limit=${limit}`);

      if (response.success) {
        return {
          transactions: response.data || [],
          pagination: response.pagination || { page, limit, total: 0, totalPages: 0 }
        };
      }

      throw new Error(response.message || 'Failed to get transactions');
    } catch (error: any) {
      console.error('[Merchants] Get wallet transactions error:', error.message);
      throw new Error(error.message || 'Failed to get wallet transactions');
    }
  }

  /**
   * Get pending withdrawal requests
   */
  async getPendingWithdrawals(
    page: number = 1,
    limit: number = 20
  ): Promise<{ withdrawals: WithdrawalRequest[]; pagination: any }> {
    try {
      console.log('[Merchants] Fetching pending withdrawals...');
      const response = await apiClient.get<WithdrawalRequest[]>(`admin/merchant-wallets/withdrawals/pending?page=${page}&limit=${limit}`);

      if (response.success) {
        return {
          withdrawals: response.data || [],
          pagination: response.pagination || { page, limit, total: 0, totalPages: 0 }
        };
      }

      throw new Error(response.message || 'Failed to get withdrawals');
    } catch (error: any) {
      console.error('[Merchants] Get pending withdrawals error:', error.message);
      throw new Error(error.message || 'Failed to get pending withdrawals');
    }
  }

  /**
   * Approve a withdrawal request
   */
  async approveWithdrawal(withdrawalId: string): Promise<{ success: boolean; message: string }> {
    try {
      console.log('[Merchants] Approving withdrawal:', withdrawalId);
      const response = await apiClient.post<any>(`admin/merchant-wallets/withdrawals/${withdrawalId}/approve`);

      return {
        success: response.success,
        message: response.message || 'Withdrawal approved'
      };
    } catch (error: any) {
      console.error('[Merchants] Approve withdrawal error:', error.message);
      throw new Error(error.message || 'Failed to approve withdrawal');
    }
  }

  /**
   * Reject a withdrawal request
   */
  async rejectWithdrawal(withdrawalId: string, reason: string): Promise<{ success: boolean; message: string }> {
    try {
      console.log('[Merchants] Rejecting withdrawal:', withdrawalId);
      const response = await apiClient.post<any>(`admin/merchant-wallets/withdrawals/${withdrawalId}/reject`, { reason });

      return {
        success: response.success,
        message: response.message || 'Withdrawal rejected'
      };
    } catch (error: any) {
      console.error('[Merchants] Reject withdrawal error:', error.message);
      throw new Error(error.message || 'Failed to reject withdrawal');
    }
  }
}

export const merchantsService = new MerchantsService();
export default merchantsService;
