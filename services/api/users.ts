import { apiClient } from './apiClient';

export interface User {
  _id: string;
  phoneNumber: string;
  email?: string;
  profile?: {
    firstName?: string;
    lastName?: string;
    avatar?: string;
  };
  role: 'user' | 'merchant' | 'admin';
  status: 'active' | 'suspended';
  isVerified: boolean;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserWallet {
  _id: string;
  userId: string;
  balance: number;
  currency: string;
  transactions: Array<{
    _id: string;
    type: 'credit' | 'debit';
    amount: number;
    description: string;
    createdAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface UsersListResponse {
  users: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface GetUsersParams {
  page?: number;
  limit?: number;
  role?: 'user' | 'merchant' | 'admin';
  status?: 'active' | 'suspended';
  search?: string;
}

class UsersService {
  /**
   * Get list of users with pagination and filters
   */
  async getUsers(params: GetUsersParams = {}): Promise<UsersListResponse> {
    try {
      const { page = 1, limit = 20, role, status, search } = params;

      let url = `admin/users?page=${page}&limit=${limit}`;
      if (role) url += `&role=${role}`;
      if (status) url += `&status=${status}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;

      console.log('[Users] Fetching users list...');
      const response = await apiClient.get<User[]>(url);

      if (response.success) {
        console.log('[Users] Users fetched successfully');
        // Backend returns { data: { users: [...], pagination: {...} } }
        const nested = response.data as any;
        return {
          users: nested?.users || (Array.isArray(nested) ? nested : []),
          pagination: nested?.pagination || response.pagination || { page, limit, total: 0, totalPages: 0 }
        };
      }

      throw new Error(response.message || 'Failed to get users');
    } catch (error: any) {
      console.error('[Users] Get users error:', error.message);
      throw new Error(error.message || 'Failed to get users');
    }
  }

  /**
   * Get single user by ID
   */
  async getUser(userId: string): Promise<User> {
    try {
      console.log('[Users] Fetching user:', userId);
      const response = await apiClient.get<User>(`admin/users/${userId}`);

      if (response.success && response.data) {
        return response.data;
      }

      throw new Error(response.message || 'Failed to get user');
    } catch (error: any) {
      console.error('[Users] Get user error:', error.message);
      throw new Error(error.message || 'Failed to get user');
    }
  }

  /**
   * Get user wallet balance and details
   */
  async getUserWallet(userId: string): Promise<UserWallet> {
    try {
      console.log('[Users] Fetching wallet for user:', userId);
      const response = await apiClient.get<UserWallet>(`admin/users/${userId}/wallet`);

      if (response.success && response.data) {
        return response.data;
      }

      throw new Error(response.message || 'Failed to get user wallet');
    } catch (error: any) {
      console.error('[Users] Get user wallet error:', error.message);
      throw new Error(error.message || 'Failed to get user wallet');
    }
  }

  /**
   * Suspend a user
   */
  async suspendUser(userId: string, reason?: string): Promise<{ success: boolean; message: string }> {
    try {
      console.log('[Users] Suspending user:', userId);
      const response = await apiClient.post<any>(`admin/users/${userId}/suspend`, { reason });

      return {
        success: response.success,
        message: response.message || 'User suspended'
      };
    } catch (error: any) {
      console.error('[Users] Suspend user error:', error.message);
      throw new Error(error.message || 'Failed to suspend user');
    }
  }

  /**
   * Unsuspend a user
   */
  async unsuspendUser(userId: string): Promise<{ success: boolean; message: string }> {
    try {
      console.log('[Users] Unsuspending user:', userId);
      const response = await apiClient.post<any>(`admin/users/${userId}/unsuspend`);

      return {
        success: response.success,
        message: response.message || 'User unsuspended'
      };
    } catch (error: any) {
      console.error('[Users] Unsuspend user error:', error.message);
      throw new Error(error.message || 'Failed to unsuspend user');
    }
  }
}

export const usersService = new UsersService();
export default usersService;
