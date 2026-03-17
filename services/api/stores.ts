import { apiClient } from './apiClient';

// ============================================
// INTERFACES
// ============================================

export interface AdminStore {
  _id: string;
  name: string;
  slug: string;
  logo?: string;
  banner?: string[];
  category?: string | { _id: string; name: string; slug: string };
  categoryInfo?: { _id: string; name: string; slug: string };
  merchant?: { _id: string; name?: string; email?: string; businessName?: string };
  merchantInfo?: { _id: string; businessName?: string; ownerName?: string; email?: string };
  isActive: boolean;
  adminApproved?: boolean;
  isSuspended?: boolean;
  isFeatured?: boolean;
  ratings?: { average: number; count: number };
  serviceCapabilities?: {
    homeDelivery?: { enabled: boolean };
    driveThru?: { enabled: boolean };
    tableBooking?: { enabled: boolean };
    dineIn?: { enabled: boolean };
    storePickup?: { enabled: boolean };
  };
  location?: { city?: string; address?: string };
  createdAt?: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

// ============================================
// SERVICE CLASS
// ============================================

class StoresService {
  /**
   * Get stores with optional filters
   */
  async getStores(params: {
    category?: string;
    search?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{ stores: AdminStore[]; pagination: Pagination }> {
    try {
      const queryParts: string[] = [];
      if (params.category) queryParts.push(`category=${encodeURIComponent(params.category)}`);
      if (params.search) queryParts.push(`search=${encodeURIComponent(params.search)}`);
      if (params.isActive !== undefined) queryParts.push(`isActive=${params.isActive}`);
      if (params.page) queryParts.push(`page=${params.page}`);
      if (params.limit) queryParts.push(`limit=${params.limit}`);

      const query = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
      if (__DEV__) console.log('[Stores] Fetching stores...', query);
      const response = await apiClient.get<any>(`admin/stores${query}`);

      if (response.success && response.data) {
        if (__DEV__) console.log('[Stores] Fetched successfully');
        const stores = response.data.stores || (Array.isArray(response.data) ? response.data : []);
        const rawPag = response.data.pagination || response.pagination || {};
        const pagination: Pagination = {
          page: rawPag.page || params.page || 1,
          limit: rawPag.limit || params.limit || 20,
          total: rawPag.total || stores.length,
          pages: rawPag.pages || rawPag.totalPages || 1,
        };
        return { stores, pagination };
      }

      throw new Error(response.message || 'Failed to fetch stores');
    } catch (error: any) {
      if (__DEV__) console.error('[Stores] Get stores error:', error.message);
      throw new Error(error.message || 'Failed to fetch stores');
    }
  }

  /**
   * Get a single store by ID
   */
  async getStore(id: string): Promise<{ store: AdminStore }> {
    try {
      if (__DEV__) console.log('[Stores] Fetching store:', id);
      const response = await apiClient.get<any>(`admin/stores/${id}`);

      if (response.success && response.data) {
        if (__DEV__) console.log('[Stores] Store fetched:', response.data.store?.name || response.data.name);
        const store = response.data.store || response.data;
        return { store };
      }

      throw new Error(response.message || 'Store not found');
    } catch (error: any) {
      if (__DEV__) console.error('[Stores] Get store error:', error.message);
      throw new Error(error.message || 'Failed to fetch store');
    }
  }

  /**
   * Get stores by category
   */
  async getStoresByCategory(
    categoryId: string,
    params?: { search?: string; page?: number; limit?: number }
  ): Promise<{ stores: AdminStore[]; pagination: Pagination }> {
    try {
      const queryParts: string[] = [];
      if (params?.search) queryParts.push(`search=${encodeURIComponent(params.search)}`);
      if (params?.page) queryParts.push(`page=${params.page}`);
      if (params?.limit) queryParts.push(`limit=${params.limit}`);

      const query = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
      if (__DEV__) console.log('[Stores] Fetching stores for category:', categoryId, query);
      const response = await apiClient.get<any>(`admin/stores/category/${categoryId}${query}`);

      if (response.success && response.data) {
        if (__DEV__) console.log('[Stores] Category stores fetched');
        const stores = response.data.stores || (Array.isArray(response.data) ? response.data : []);
        const rawPag = response.data.pagination || response.pagination || {};
        const pagination: Pagination = {
          page: rawPag.page || params?.page || 1,
          limit: rawPag.limit || params?.limit || 20,
          total: rawPag.total || stores.length,
          pages: rawPag.pages || rawPag.totalPages || 1,
        };
        return { stores, pagination };
      }

      throw new Error(response.message || 'Failed to fetch stores for category');
    } catch (error: any) {
      if (__DEV__) console.error('[Stores] Get stores by category error:', error.message);
      throw new Error(error.message || 'Failed to fetch stores for category');
    }
  }

  /**
   * Reassign a store to a different category
   */
  async reassignCategory(storeId: string, categoryId: string): Promise<{ store: AdminStore }> {
    try {
      if (__DEV__) console.log('[Stores] Reassigning store:', storeId, 'to category:', categoryId);
      const response = await apiClient.put<any>(`admin/stores/${storeId}/category`, { categoryId });

      if (response.success && response.data) {
        if (__DEV__) console.log('[Stores] Store category reassigned');
        const store = response.data.store || response.data;
        return { store };
      }

      throw new Error(response.message || 'Failed to reassign category');
    } catch (error: any) {
      if (__DEV__) console.error('[Stores] Reassign category error:', error.message);
      throw new Error(error.message || 'Failed to reassign category');
    }
  }

  /**
   * Bulk reassign stores to a category
   */
  async bulkReassignCategory(storeIds: string[], categoryId: string): Promise<{ count: number }> {
    try {
      if (__DEV__) console.log('[Stores] Bulk reassigning', storeIds.length, 'stores to category:', categoryId);
      const response = await apiClient.post<any>('admin/stores/bulk-category', { storeIds, categoryId });

      if (response.success && response.data) {
        if (__DEV__) console.log('[Stores] Bulk reassign completed, count:', response.data.count);
        return { count: response.data.count || storeIds.length };
      }

      throw new Error(response.message || 'Failed to bulk reassign categories');
    } catch (error: any) {
      if (__DEV__) console.error('[Stores] Bulk reassign error:', error.message);
      throw new Error(error.message || 'Failed to bulk reassign categories');
    }
  }

  /**
   * Update admin actions on a store (approve, suspend, feature, notes)
   */
  async updateAdminActions(
    storeId: string,
    actions: {
      adminApproved?: boolean;
      isSuspended?: boolean;
      suspensionReason?: string;
      isFeatured?: boolean;
      adminNotes?: string;
    }
  ): Promise<{ store: AdminStore }> {
    try {
      if (__DEV__) console.log('[Stores] Updating admin actions for store:', storeId);
      const response = await apiClient.put<any>(`admin/stores/${storeId}/admin-actions`, actions);

      if (response.success && response.data) {
        if (__DEV__) console.log('[Stores] Admin actions updated');
        const store = response.data.store || response.data;
        return { store };
      }

      throw new Error(response.message || 'Failed to update admin actions');
    } catch (error: any) {
      if (__DEV__) console.error('[Stores] Update admin actions error:', error.message);
      throw new Error(error.message || 'Failed to update admin actions');
    }
  }

  /**
   * Toggle a service capability for a store
   */
  async toggleServiceCapability(
    storeId: string,
    capability: string,
    enabled: boolean
  ): Promise<{ store: AdminStore; message: string }> {
    try {
      if (__DEV__) console.log('[Stores] Toggling capability:', capability, enabled ? 'ON' : 'OFF', 'for store:', storeId);
      const response = await apiClient.put<any>(`admin/stores/${storeId}/service-capabilities`, {
        capability,
        enabled,
      });

      if (response.success && response.data) {
        if (__DEV__) console.log('[Stores] Capability toggled successfully');
        const store = response.data.store || response.data;
        return { store, message: response.message || `${capability} ${enabled ? 'enabled' : 'disabled'}` };
      }

      throw new Error(response.message || 'Failed to toggle service capability');
    } catch (error: any) {
      if (__DEV__) console.error('[Stores] Toggle capability error:', error.message);
      throw new Error(error.message || 'Failed to toggle service capability');
    }
  }
}

export const storesService = new StoresService();
export default storesService;
