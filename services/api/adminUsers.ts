import { apiClient } from './apiClient';

export interface AdminUser {
  _id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  isActive: boolean;
  lastLogin: string | null;
  createdAt: string;
  assignedTickets: number;
}

export interface CreateAdminData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
}

export interface UpdateAdminData {
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  isActive?: boolean;
  password?: string;
}

class AdminUsersService {
  async listAdmins(): Promise<AdminUser[]> {
    try {
      const response = await apiClient.get<{ adminUsers: AdminUser[] }>('admin/admin-users');
      if (response.success && response.data) return response.data.adminUsers || [];
      return [];
    } catch (error) {
      if (__DEV__) console.error('[AdminUsers] Error listing admins:', error);
      return [];
    }
  }

  async createAdmin(data: CreateAdminData): Promise<AdminUser | null> {
    try {
      const response = await apiClient.post<{ adminUser: AdminUser }>('admin/admin-users', data);
      if (response.success && response.data) return response.data.adminUser;
      return null;
    } catch (error) {
      if (__DEV__) console.error('[AdminUsers] Error creating admin:', error);
      return null;
    }
  }

  async updateAdmin(id: string, data: UpdateAdminData): Promise<AdminUser | null> {
    try {
      const response = await apiClient.put<{ adminUser: AdminUser }>(`admin/admin-users/${id}`, data);
      if (response.success && response.data) return response.data.adminUser;
      return null;
    } catch (error) {
      if (__DEV__) console.error('[AdminUsers] Error updating admin:', error);
      return null;
    }
  }

  async deactivateAdmin(id: string): Promise<boolean> {
    try {
      const response = await apiClient.delete(`admin/admin-users/${id}`);
      return response.success;
    } catch (error) {
      if (__DEV__) console.error('[AdminUsers] Error deactivating admin:', error);
      return false;
    }
  }
}

export const adminUsersService = new AdminUsersService();
export default adminUsersService;
