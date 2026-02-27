import { apiClient } from './apiClient';

export interface VoucherBrand {
  _id: string;
  name: string;
  logo: string;
  backgroundColor: string;
  logoColor: string;
  description: string;
  cashbackRate: number;
  category: string;
  denominations: number[];
  termsAndConditions: string[];
  isFeatured: boolean;
  isNewlyAdded: boolean;
  isActive: boolean;
  purchaseCount: number;
  viewCount: number;
  store?: {
    _id: string;
    name: string;
    logo: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface ListVouchersResponse {
  vouchers: VoucherBrand[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface VoucherCreateData {
  name: string;
  logo: string;
  backgroundColor: string;
  logoColor: string;
  description: string;
  cashbackRate: number;
  category: string;
  denominations: number[];
  termsAndConditions: string[];
  isFeatured?: boolean;
  isNewlyAdded?: boolean;
  store?: string;
}

class VoucherAdminService {
  async list(filters?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    category?: string;
    featured?: boolean;
  }): Promise<ListVouchersResponse> {
    try {
      let url = 'admin/vouchers';
      const params: string[] = [];

      if (filters?.page) params.push(`page=${filters.page}`);
      if (filters?.limit) params.push(`limit=${filters.limit}`);
      if (filters?.search) params.push(`search=${encodeURIComponent(filters.search)}`);
      if (filters?.status) params.push(`status=${encodeURIComponent(filters.status)}`);
      if (filters?.category) params.push(`category=${encodeURIComponent(filters.category)}`);
      if (filters?.featured !== undefined) params.push(`featured=${filters.featured}`);

      if (params.length > 0) url += `?${params.join('&')}`;

      const response = await apiClient.get<ListVouchersResponse>(url);
      if (response.success && response.data) return response.data;
      return { vouchers: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } };
    } catch (error) {
      console.error('[Voucher Admin] Error listing vouchers:', error);
      return { vouchers: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } };
    }
  }

  async getById(id: string): Promise<VoucherBrand | null> {
    try {
      const response = await apiClient.get<{ voucher: VoucherBrand }>(`admin/vouchers/${id}`);
      if (response.success && response.data) return response.data.voucher;
      return null;
    } catch (error) {
      console.error('[Voucher Admin] Error getting voucher:', error);
      return null;
    }
  }

  async create(data: VoucherCreateData): Promise<VoucherBrand | null> {
    try {
      const response = await apiClient.post<{ voucher: VoucherBrand }>('admin/vouchers', data);
      if (response.success && response.data) return response.data.voucher;
      return null;
    } catch (error) {
      console.error('[Voucher Admin] Error creating voucher:', error);
      return null;
    }
  }

  async update(id: string, data: Partial<VoucherCreateData>): Promise<VoucherBrand | null> {
    try {
      const response = await apiClient.put<{ voucher: VoucherBrand }>(`admin/vouchers/${id}`, data);
      if (response.success && response.data) return response.data.voucher;
      return null;
    } catch (error) {
      console.error('[Voucher Admin] Error updating voucher:', error);
      return null;
    }
  }

  async toggleActive(id: string): Promise<boolean> {
    try {
      const response = await apiClient.patch(`admin/vouchers/${id}/toggle`);
      return response.success;
    } catch (error) {
      console.error('[Voucher Admin] Error toggling voucher:', error);
      return false;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const response = await apiClient.delete(`admin/vouchers/${id}`);
      return response.success;
    } catch (error) {
      console.error('[Voucher Admin] Error deleting voucher:', error);
      return false;
    }
  }
}

export const voucherAdminService = new VoucherAdminService();
export default voucherAdminService;
