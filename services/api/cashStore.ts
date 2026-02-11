/**
 * Cash Store Admin API Service
 *
 * CRUD operations for VoucherBrands, Coupons, DoubleCashbackCampaigns, CoinDrops,
 * and read-only AffiliateAnalytics via backend admin endpoints.
 * Uses existing endpoints at /api/admin/vouchers/*, /api/admin/coupons/*,
 * /api/admin/double-campaigns/*, /api/admin/coin-drops/*, /api/cashstore/affiliate/*
 */

import { apiClient } from './apiClient';

// Types

export interface VoucherBrand {
  _id: string;
  name: string;
  slug: string;
  logo: string;
  description?: string;
  category: string;
  cashbackRate: number;
  denominations: number[];
  termsAndConditions: string[];
  rating: number;
  reviewCount: number;
  isActive: boolean;
  isFeatured: boolean;
  isNewlyAdded: boolean;
  backgroundColor?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminCoupon {
  _id: string;
  title: string;
  couponCode: string;
  description: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  minOrderValue: number;
  maxDiscountCap: number;
  validFrom: string;
  validTo: string;
  usageLimit: number;
  usedCount: number;
  isActive: boolean;
  isAutoApply: boolean;
  tags: string[];
  category?: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DoubleCashbackCampaign {
  _id: string;
  title: string;
  subtitle: string;
  description?: string;
  multiplier: number;
  startTime: string;
  endTime: string;
  eligibleStores: string[];
  eligibleStoreNames: string[];
  eligibleCategories: string[];
  terms: string[];
  minOrderValue: number;
  maxCashback: number;
  backgroundColor?: string;
  bannerImage?: string;
  icon?: string;
  priority: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CoinDrop {
  _id: string;
  storeId: string;
  storeName: string;
  storeLogo: string;
  multiplier: number;
  normalCashback: number;
  category: string;
  startTime: string;
  endTime: string;
  minOrderValue: number;
  maxCashback: number;
  priority: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AffiliateAnalytics {
  brand: { id: string; name: string; logo: string };
  clicks: number;
  purchases: number;
  revenue: number;
  cashbackPaid: number;
  conversionRate: number;
}

class CashStoreService {
  // ==================== VOUCHER BRANDS ====================

  async getVoucherBrands(params?: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    isActive?: boolean;
    isFeatured?: boolean;
  }): Promise<{ voucherBrands: VoucherBrand[]; pagination: any }> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.search) queryParams.append('search', params.search);
      if (params?.category) queryParams.append('category', params.category);
      if (params?.isActive !== undefined) queryParams.append('isActive', params.isActive.toString());
      if (params?.isFeatured !== undefined) queryParams.append('isFeatured', params.isFeatured.toString());

      const url = `/admin/vouchers?${queryParams.toString()}`;
      const response = await apiClient.get<VoucherBrand[]>(url);
      if (response.success) {
        return {
          voucherBrands: response.data || [],
          pagination: response.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 },
        };
      }
      throw new Error(response.message || 'Failed to fetch voucher brands');
    } catch (error: any) {
      console.error('[CashStoreService] getVoucherBrands error:', error);
      throw error;
    }
  }

  async createVoucherBrand(data: Partial<VoucherBrand>): Promise<VoucherBrand> {
    try {
      const response = await apiClient.post<VoucherBrand>('/admin/vouchers', data);
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.message || 'Failed to create voucher brand');
    } catch (error: any) {
      console.error('[CashStoreService] createVoucherBrand error:', error);
      throw error;
    }
  }

  async updateVoucherBrand(brandId: string, data: Partial<VoucherBrand>): Promise<VoucherBrand> {
    try {
      const response = await apiClient.put<VoucherBrand>(`/admin/vouchers/${brandId}`, data);
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.message || 'Failed to update voucher brand');
    } catch (error: any) {
      console.error('[CashStoreService] updateVoucherBrand error:', error);
      throw error;
    }
  }

  async deleteVoucherBrand(brandId: string): Promise<void> {
    try {
      const response = await apiClient.delete(`/admin/vouchers/${brandId}`);
      if (!response.success) {
        throw new Error(response.message || 'Failed to delete voucher brand');
      }
    } catch (error: any) {
      console.error('[CashStoreService] deleteVoucherBrand error:', error);
      throw error;
    }
  }

  async toggleVoucherBrand(brandId: string): Promise<VoucherBrand> {
    try {
      const response = await apiClient.put<VoucherBrand>(`/admin/vouchers/${brandId}/toggle`, {});
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.message || 'Failed to toggle voucher brand');
    } catch (error: any) {
      console.error('[CashStoreService] toggleVoucherBrand error:', error);
      throw error;
    }
  }

  // ==================== COUPONS ====================

  async getCoupons(params?: {
    page?: number;
    limit?: number;
    search?: string;
    isActive?: boolean;
    discountType?: 'PERCENTAGE' | 'FIXED';
    category?: string;
  }): Promise<{ coupons: AdminCoupon[]; pagination: any }> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.search) queryParams.append('search', params.search);
      if (params?.isActive !== undefined) queryParams.append('isActive', params.isActive.toString());
      if (params?.discountType) queryParams.append('discountType', params.discountType);
      if (params?.category) queryParams.append('category', params.category);

      const url = `/admin/coupons?${queryParams.toString()}`;
      const response = await apiClient.get<AdminCoupon[]>(url);
      if (response.success) {
        return {
          coupons: response.data || [],
          pagination: response.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 },
        };
      }
      throw new Error(response.message || 'Failed to fetch coupons');
    } catch (error: any) {
      console.error('[CashStoreService] getCoupons error:', error);
      throw error;
    }
  }

  async createCoupon(data: Partial<AdminCoupon>): Promise<AdminCoupon> {
    try {
      const response = await apiClient.post<AdminCoupon>('/admin/coupons', data);
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.message || 'Failed to create coupon');
    } catch (error: any) {
      console.error('[CashStoreService] createCoupon error:', error);
      throw error;
    }
  }

  async updateCoupon(couponId: string, data: Partial<AdminCoupon>): Promise<AdminCoupon> {
    try {
      const response = await apiClient.put<AdminCoupon>(`/admin/coupons/${couponId}`, data);
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.message || 'Failed to update coupon');
    } catch (error: any) {
      console.error('[CashStoreService] updateCoupon error:', error);
      throw error;
    }
  }

  async deleteCoupon(couponId: string): Promise<void> {
    try {
      const response = await apiClient.delete(`/admin/coupons/${couponId}`);
      if (!response.success) {
        throw new Error(response.message || 'Failed to delete coupon');
      }
    } catch (error: any) {
      console.error('[CashStoreService] deleteCoupon error:', error);
      throw error;
    }
  }

  async toggleCoupon(couponId: string): Promise<AdminCoupon> {
    try {
      const response = await apiClient.put<AdminCoupon>(`/admin/coupons/${couponId}/toggle`, {});
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.message || 'Failed to toggle coupon');
    } catch (error: any) {
      console.error('[CashStoreService] toggleCoupon error:', error);
      throw error;
    }
  }

  // ==================== DOUBLE CASHBACK CAMPAIGNS ====================

  async getDoubleCampaigns(params?: {
    page?: number;
    limit?: number;
    search?: string;
    isActive?: boolean;
  }): Promise<{ campaigns: DoubleCashbackCampaign[]; pagination: any }> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.search) queryParams.append('search', params.search);
      if (params?.isActive !== undefined) queryParams.append('isActive', params.isActive.toString());

      const url = `/admin/double-campaigns?${queryParams.toString()}`;
      const response = await apiClient.get<DoubleCashbackCampaign[]>(url);
      if (response.success) {
        return {
          campaigns: response.data || [],
          pagination: response.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 },
        };
      }
      throw new Error(response.message || 'Failed to fetch double cashback campaigns');
    } catch (error: any) {
      console.error('[CashStoreService] getDoubleCampaigns error:', error);
      throw error;
    }
  }

  async createDoubleCampaign(data: Partial<DoubleCashbackCampaign>): Promise<DoubleCashbackCampaign> {
    try {
      const response = await apiClient.post<DoubleCashbackCampaign>('/admin/double-campaigns', data);
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.message || 'Failed to create double cashback campaign');
    } catch (error: any) {
      console.error('[CashStoreService] createDoubleCampaign error:', error);
      throw error;
    }
  }

  async updateDoubleCampaign(campaignId: string, data: Partial<DoubleCashbackCampaign>): Promise<DoubleCashbackCampaign> {
    try {
      const response = await apiClient.put<DoubleCashbackCampaign>(`/admin/double-campaigns/${campaignId}`, data);
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.message || 'Failed to update double cashback campaign');
    } catch (error: any) {
      console.error('[CashStoreService] updateDoubleCampaign error:', error);
      throw error;
    }
  }

  async deleteDoubleCampaign(campaignId: string): Promise<void> {
    try {
      const response = await apiClient.delete(`/admin/double-campaigns/${campaignId}`);
      if (!response.success) {
        throw new Error(response.message || 'Failed to delete double cashback campaign');
      }
    } catch (error: any) {
      console.error('[CashStoreService] deleteDoubleCampaign error:', error);
      throw error;
    }
  }

  async toggleDoubleCampaign(campaignId: string): Promise<DoubleCashbackCampaign> {
    try {
      const response = await apiClient.put<DoubleCashbackCampaign>(`/admin/double-campaigns/${campaignId}/toggle`, {});
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.message || 'Failed to toggle double cashback campaign');
    } catch (error: any) {
      console.error('[CashStoreService] toggleDoubleCampaign error:', error);
      throw error;
    }
  }

  // ==================== COIN DROPS ====================

  async getCoinDrops(params?: {
    page?: number;
    limit?: number;
    search?: string;
    isActive?: boolean;
    category?: string;
  }): Promise<{ coinDrops: CoinDrop[]; pagination: any }> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.search) queryParams.append('search', params.search);
      if (params?.isActive !== undefined) queryParams.append('isActive', params.isActive.toString());
      if (params?.category) queryParams.append('category', params.category);

      const url = `/admin/coin-drops?${queryParams.toString()}`;
      const response = await apiClient.get<CoinDrop[]>(url);
      if (response.success) {
        return {
          coinDrops: response.data || [],
          pagination: response.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 },
        };
      }
      throw new Error(response.message || 'Failed to fetch coin drops');
    } catch (error: any) {
      console.error('[CashStoreService] getCoinDrops error:', error);
      throw error;
    }
  }

  async getCoinDropStores(search?: string): Promise<{ _id: string; name: string; logo: string; category: string }[]> {
    try {
      const queryParams = new URLSearchParams();
      if (search) queryParams.append('search', search);

      const url = `/admin/coin-drops/stores?${queryParams.toString()}`;
      const response = await apiClient.get<{ _id: string; name: string; logo: string; category: string }[]>(url);
      if (response.success) {
        return response.data || [];
      }
      throw new Error(response.message || 'Failed to fetch coin drop stores');
    } catch (error: any) {
      console.error('[CashStoreService] getCoinDropStores error:', error);
      throw error;
    }
  }

  async createCoinDrop(data: Partial<CoinDrop>): Promise<CoinDrop> {
    try {
      const response = await apiClient.post<CoinDrop>('/admin/coin-drops', data);
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.message || 'Failed to create coin drop');
    } catch (error: any) {
      console.error('[CashStoreService] createCoinDrop error:', error);
      throw error;
    }
  }

  async updateCoinDrop(coinDropId: string, data: Partial<CoinDrop>): Promise<CoinDrop> {
    try {
      const response = await apiClient.put<CoinDrop>(`/admin/coin-drops/${coinDropId}`, data);
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.message || 'Failed to update coin drop');
    } catch (error: any) {
      console.error('[CashStoreService] updateCoinDrop error:', error);
      throw error;
    }
  }

  async deleteCoinDrop(coinDropId: string): Promise<void> {
    try {
      const response = await apiClient.delete(`/admin/coin-drops/${coinDropId}`);
      if (!response.success) {
        throw new Error(response.message || 'Failed to delete coin drop');
      }
    } catch (error: any) {
      console.error('[CashStoreService] deleteCoinDrop error:', error);
      throw error;
    }
  }

  async toggleCoinDrop(coinDropId: string): Promise<CoinDrop> {
    try {
      const response = await apiClient.put<CoinDrop>(`/admin/coin-drops/${coinDropId}/toggle`, {});
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.message || 'Failed to toggle coin drop');
    } catch (error: any) {
      console.error('[CashStoreService] toggleCoinDrop error:', error);
      throw error;
    }
  }

  // ==================== AFFILIATE ANALYTICS ====================

  async getAffiliateAnalytics(brandId: string): Promise<AffiliateAnalytics> {
    try {
      const response = await apiClient.get<AffiliateAnalytics>(`/cashstore/affiliate/analytics/${brandId}`);
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.message || 'Failed to fetch affiliate analytics');
    } catch (error: any) {
      console.error('[CashStoreService] getAffiliateAnalytics error:', error);
      throw error;
    }
  }
}

export const cashStoreAdminService = new CashStoreService();
export default cashStoreAdminService;
