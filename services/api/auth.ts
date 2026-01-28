import { apiClient } from './apiClient';
import { storageService } from '../storage';

export interface AdminUser {
  _id: string;
  email: string;
  name: string;
  role: 'support' | 'operator' | 'admin' | 'super_admin';
  level: number;
  permissions: string[];
  lastLogin?: string;
  createdAt: string;
}

export interface LoginResponse {
  success: boolean;
  message?: string;
  data?: {
    user: AdminUser;
    token: string;
  };
}

class AuthService {
  /**
   * Login admin user
   * Uses the same auth endpoint but requires admin role on backend
   */
  async login(email: string, password: string): Promise<LoginResponse> {
    try {
      console.log('🔐 [Admin Auth] Attempting login for:', email);

      // Use the regular auth endpoint - backend validates admin role
      const response = await apiClient.post<{ user: AdminUser; token: string }>(
        'auth/login',
        { email, password }
      );

      if (response.success && response.data) {
        // Verify user has admin role
        const user = response.data.user;
        const adminRoles = ['support', 'operator', 'admin', 'super_admin'];

        if (!user.role || !adminRoles.includes(user.role)) {
          console.error('❌ [Admin Auth] User does not have admin privileges');
          return {
            success: false,
            message: 'Access denied. Admin privileges required.',
          };
        }

        // Store auth data
        await storageService.setAuthToken(response.data.token);
        await storageService.setUserData(response.data.user);

        console.log('✅ [Admin Auth] Login successful, role:', user.role);
        return {
          success: true,
          data: response.data,
        };
      }

      return {
        success: false,
        message: response.message || 'Login failed',
      };
    } catch (error: any) {
      console.error('❌ [Admin Auth] Login error:', error.message);
      return {
        success: false,
        message: error.message || 'Login failed',
      };
    }
  }

  /**
   * Logout and clear all auth data
   */
  async logout(): Promise<void> {
    try {
      console.log('🚪 [Admin Auth] Logging out...');

      // Call backend logout endpoint (optional)
      try {
        await apiClient.post('auth/logout');
      } catch (e) {
        // Ignore logout API errors
      }

      // Clear local storage
      await storageService.logout();
      console.log('✅ [Admin Auth] Logout complete');
    } catch (error) {
      console.error('❌ [Admin Auth] Logout error:', error);
      // Still clear local storage even if API fails
      await storageService.logout();
    }
  }

  /**
   * Get current user from storage
   */
  async getCurrentUser(): Promise<AdminUser | null> {
    try {
      const userData = await storageService.getUserData();
      return userData;
    } catch (error) {
      console.error('❌ [Admin Auth] Get current user error:', error);
      return null;
    }
  }

  /**
   * Get stored auth token
   */
  async getToken(): Promise<string | null> {
    return await storageService.getAuthToken();
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    return await storageService.isAuthenticated();
  }

  /**
   * Refresh user profile from backend
   */
  async refreshProfile(): Promise<AdminUser | null> {
    try {
      const response = await apiClient.get<{ user: AdminUser }>('auth/me');

      if (response.success && response.data?.user) {
        await storageService.setUserData(response.data.user);
        return response.data.user;
      }

      return null;
    } catch (error) {
      console.error('❌ [Admin Auth] Refresh profile error:', error);
      return null;
    }
  }
}

export const authService = new AuthService();
export default authService;
