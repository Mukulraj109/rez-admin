/**
 * Mall Admin API Service
 *
 * CRUD operations for MallBrands, MallCategories, MallOffers via backend admin endpoints.
 * Uses existing endpoints at /api/mall/admin/*
 */

import { apiClient } from './apiClient';

// Types
export interface MallBrand {
  _id: string;
  id?: string;
  name: string;
  slug: string;
  description?: string;
  logo: string;
  banner?: string[];
  externalUrl?: string;
  tier: 'standard' | 'premium' | 'exclusive' | 'luxury';
  cashback: {
    percentage: number;
    maxAmount?: number;
    minPurchase?: number;
    earlyBirdBonus?: number;
  };
  ratings: {
    average: number;
    count: number;
    successRate: number;
  };
  mallCategory?: { _id: string; name: string; slug: string };
  badges: string[];
  isActive: boolean;
  isFeatured: boolean;
  isLuxury: boolean;
  isNewArrival: boolean;
  tags?: string[];
  analytics?: {
    views: number;
    clicks: number;
    purchases: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface MallCategory {
  _id: string;
  id?: string;
  name: string;
  slug: string;
  description?: string;
  icon: string;
  image?: string;
  color: string;
  maxCashback: number;
  sortOrder: number;
  brandCount: number;
  isActive: boolean;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MallOffer {
  _id: string;
  id?: string;
  title: string;
  subtitle?: string;
  description?: string;
  image: string;
  brand?: { _id: string; name: string; logo: string };
  offerType: 'cashback' | 'discount' | 'coins' | 'combo';
  value: number;
  valueType: 'percentage' | 'fixed';
  extraCoins?: number;
  validFrom: string;
  validUntil: string;
  isActive: boolean;
  isMallExclusive: boolean;
  badge?: string;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

export interface MallStats {
  totalBrands: number;
  activeBrands: number;
  totalCategories: number;
  activeCategories: number;
  activeOffers: number;
  totalOffers: number;
  activeBanners: number;
  totalMallStores: number;
}

class MallService {
  // ==================== STATS ====================

  async getStats(): Promise<MallStats> {
    try {
      const response = await apiClient.get<MallStats>('/mall/admin/stats');
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.message || 'Failed to fetch mall stats');
    } catch (error: any) {
      console.error('[MallService] getStats error:', error);
      throw error;
    }
  }

  // ==================== BRANDS ====================

  async getBrands(params?: {
    page?: number;
    limit?: number;
    tier?: string;
    search?: string;
    isActive?: boolean;
  }): Promise<{ brands: MallBrand[]; pagination: any }> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.tier) queryParams.append('tier', params.tier);
      if (params?.search) queryParams.append('search', params.search);
      if (params?.isActive !== undefined) queryParams.append('isActive', params.isActive.toString());

      const url = `/mall/brands?${queryParams.toString()}`;
      const response = await apiClient.get<MallBrand[]>(url);
      if (response.success) {
        return {
          brands: response.data || [],
          pagination: response.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 },
        };
      }
      throw new Error(response.message || 'Failed to fetch brands');
    } catch (error: any) {
      console.error('[MallService] getBrands error:', error);
      throw error;
    }
  }

  async createBrand(data: Partial<MallBrand>): Promise<MallBrand> {
    try {
      const response = await apiClient.post<MallBrand>('/mall/admin/brands', data);
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.message || 'Failed to create brand');
    } catch (error: any) {
      console.error('[MallService] createBrand error:', error);
      throw error;
    }
  }

  async updateBrand(brandId: string, data: Partial<MallBrand>): Promise<MallBrand> {
    try {
      const response = await apiClient.put<MallBrand>(`/mall/admin/brands/${brandId}`, data);
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.message || 'Failed to update brand');
    } catch (error: any) {
      console.error('[MallService] updateBrand error:', error);
      throw error;
    }
  }

  async deleteBrand(brandId: string): Promise<void> {
    try {
      const response = await apiClient.delete(`/mall/admin/brands/${brandId}`);
      if (!response.success) {
        throw new Error(response.message || 'Failed to delete brand');
      }
    } catch (error: any) {
      console.error('[MallService] deleteBrand error:', error);
      throw error;
    }
  }

  // ==================== CATEGORIES ====================

  async getCategories(): Promise<MallCategory[]> {
    try {
      const response = await apiClient.get<MallCategory[]>('/mall/categories');
      if (response.success) {
        return response.data || [];
      }
      throw new Error(response.message || 'Failed to fetch categories');
    } catch (error: any) {
      console.error('[MallService] getCategories error:', error);
      throw error;
    }
  }

  async createCategory(data: Partial<MallCategory>): Promise<MallCategory> {
    try {
      const response = await apiClient.post<MallCategory>('/mall/admin/categories', data);
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.message || 'Failed to create category');
    } catch (error: any) {
      console.error('[MallService] createCategory error:', error);
      throw error;
    }
  }

  async updateCategory(categoryId: string, data: Partial<MallCategory>): Promise<MallCategory> {
    try {
      const response = await apiClient.put<MallCategory>(`/mall/admin/categories/${categoryId}`, data);
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.message || 'Failed to update category');
    } catch (error: any) {
      console.error('[MallService] updateCategory error:', error);
      throw error;
    }
  }

  async deleteCategory(categoryId: string): Promise<void> {
    try {
      const response = await apiClient.delete(`/mall/admin/categories/${categoryId}`);
      if (!response.success) {
        throw new Error(response.message || 'Failed to delete category');
      }
    } catch (error: any) {
      console.error('[MallService] deleteCategory error:', error);
      throw error;
    }
  }

  // ==================== OFFERS ====================

  async getOffers(params?: {
    page?: number;
    limit?: number;
    isActive?: boolean;
  }): Promise<{ offers: MallOffer[]; pagination: any }> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());

      const url = `/mall/offers?${queryParams.toString()}`;
      const response = await apiClient.get<MallOffer[]>(url);
      if (response.success) {
        return {
          offers: response.data || [],
          pagination: response.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 },
        };
      }
      throw new Error(response.message || 'Failed to fetch offers');
    } catch (error: any) {
      console.error('[MallService] getOffers error:', error);
      throw error;
    }
  }

  async createOffer(data: Partial<MallOffer>): Promise<MallOffer> {
    try {
      const response = await apiClient.post<MallOffer>('/mall/admin/offers', data);
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.message || 'Failed to create offer');
    } catch (error: any) {
      console.error('[MallService] createOffer error:', error);
      throw error;
    }
  }

  async updateOffer(offerId: string, data: Partial<MallOffer>): Promise<MallOffer> {
    try {
      const response = await apiClient.put<MallOffer>(`/mall/admin/offers/${offerId}`, data);
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.message || 'Failed to update offer');
    } catch (error: any) {
      console.error('[MallService] updateOffer error:', error);
      throw error;
    }
  }

  async deleteOffer(offerId: string): Promise<void> {
    try {
      const response = await apiClient.delete(`/mall/admin/offers/${offerId}`);
      if (!response.success) {
        throw new Error(response.message || 'Failed to delete offer');
      }
    } catch (error: any) {
      console.error('[MallService] deleteOffer error:', error);
      throw error;
    }
  }
}

export const mallService = new MallService();
export default mallService;
