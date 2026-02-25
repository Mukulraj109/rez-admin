import { apiClient } from './apiClient';

export interface UserWalletItem {
  user: {
    _id: string;
    phoneNumber: string;
    fullName: string;
    email?: string;
    profile?: { avatar?: string };
  };
  wallet: {
    _id: string;
    balance: {
      total: number;
      available: number;
      pending: number;
      cashback: number;
    };
    isFrozen: boolean;
    frozenReason?: string;
    lastTransactionAt?: string;
  } | null;
}

export interface AuditLogItem {
  _id: string;
  userId: string;
  walletId: string;
  operation: string;
  amount: number;
  balanceBefore: {
    total: number;
    available: number;
    pending: number;
    cashback: number;
  };
  balanceAfter: {
    total: number;
    available: number;
    pending: number;
    cashback: number;
  };
  reference: {
    type: string;
    description?: string;
  };
  metadata?: {
    source?: string;
    adminUserId?: string;
  };
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface SearchUsersResponse {
  users: UserWalletItem[];
  pagination: Pagination;
}

interface AuditTrailResponse {
  auditLogs: AuditLogItem[];
  pagination: Pagination;
}

class UserWalletsService {
  async searchUsers(
    search?: string,
    page: number = 1,
    limit: number = 20
  ): Promise<SearchUsersResponse> {
    try {
      let url = `admin/user-wallets?page=${page}&limit=${limit}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;

      console.log('[UserWallets] Searching users...');
      const response = await apiClient.get<SearchUsersResponse>(url);

      if (response.success && response.data) {
        console.log('[UserWallets] Users fetched successfully');
        return response.data;
      }

      throw new Error(response.message || 'Failed to search users');
    } catch (error: any) {
      console.error('[UserWallets] Search users error:', error.message);
      throw new Error(error.message || 'Failed to search users');
    }
  }

  async freezeWallet(userId: string, reason: string): Promise<void> {
    try {
      console.log('[UserWallets] Freezing wallet for user:', userId);
      const response = await apiClient.post(`admin/user-wallets/${userId}/freeze`, { reason });

      if (response.success) {
        console.log('[UserWallets] Wallet frozen successfully');
        return;
      }

      throw new Error(response.message || 'Failed to freeze wallet');
    } catch (error: any) {
      console.error('[UserWallets] Freeze wallet error:', error.message);
      throw new Error(error.message || 'Failed to freeze wallet');
    }
  }

  async unfreezeWallet(userId: string): Promise<void> {
    try {
      console.log('[UserWallets] Unfreezing wallet for user:', userId);
      const response = await apiClient.post(`admin/user-wallets/${userId}/unfreeze`);

      if (response.success) {
        console.log('[UserWallets] Wallet unfrozen successfully');
        return;
      }

      throw new Error(response.message || 'Failed to unfreeze wallet');
    } catch (error: any) {
      console.error('[UserWallets] Unfreeze wallet error:', error.message);
      throw new Error(error.message || 'Failed to unfreeze wallet');
    }
  }

  async adjustBalance(
    userId: string,
    data: { amount: number; type: 'credit' | 'debit'; reason: string }
  ): Promise<void> {
    try {
      console.log('[UserWallets] Adjusting balance for user:', userId);
      const response = await apiClient.post(`admin/user-wallets/${userId}/adjust`, data);

      if (response.success) {
        console.log('[UserWallets] Balance adjusted successfully');
        return;
      }

      throw new Error(response.message || 'Failed to adjust balance');
    } catch (error: any) {
      console.error('[UserWallets] Adjust balance error:', error.message);
      throw new Error(error.message || 'Failed to adjust balance');
    }
  }

  async getAuditTrail(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<AuditTrailResponse> {
    try {
      console.log('[UserWallets] Fetching audit trail for user:', userId);
      const response = await apiClient.get<AuditTrailResponse>(
        `admin/user-wallets/${userId}/audit-trail?page=${page}&limit=${limit}`
      );

      if (response.success && response.data) {
        console.log('[UserWallets] Audit trail fetched successfully');
        return response.data;
      }

      throw new Error(response.message || 'Failed to get audit trail');
    } catch (error: any) {
      console.error('[UserWallets] Get audit trail error:', error.message);
      throw new Error(error.message || 'Failed to get audit trail');
    }
  }
}

export const userWalletsService = new UserWalletsService();
export default userWalletsService;
