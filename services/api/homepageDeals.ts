import { apiClient } from './apiClient';

// ============================================
// INTERFACES
// ============================================

export type RegionId = 'bangalore' | 'dubai' | 'china' | 'all';

export type TabType = 'offers' | 'cashback' | 'exclusive';

export type ItemType = 'category' | 'campaign' | 'zone' | 'custom';

export type VerificationType = 'student' | 'corporate' | 'defence' | 'senior' | 'birthday' | 'women' | 'none';

// Tab configuration
export interface TabConfig {
  isEnabled: boolean;
  displayName: string;
  sortOrder: number;
  maxItems: number;
}

// Section configuration
export interface HomepageDealsConfig {
  _id: string;
  sectionId: string;
  title: string;
  subtitle: string;
  icon: string;
  isActive: boolean;
  regions: RegionId[];
  tabs: {
    offers: TabConfig;
    cashback: TabConfig;
    exclusive: TabConfig;
  };
  totalImpressions: number;
  totalClicks: number;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

// Individual item in the deals section
export interface HomepageDealsItem {
  _id: string;
  tabType: TabType;
  itemType: ItemType;
  title: string;
  subtitle: string;
  icon: string;
  iconType: 'emoji' | 'ionicon' | 'url';
  gradientColors: string[];
  backgroundColor?: string;
  badgeText?: string;
  badgeBg?: string;
  badgeColor?: string;
  navigationPath: string;
  referenceType?: string;
  referenceId?: string;
  showCount: boolean;
  countLabel: string;
  cachedCount: number;
  requiresVerification: boolean;
  verificationType?: VerificationType;
  isActive: boolean;
  sortOrder: number;
  regions: RegionId[];
  impressions: number;
  clicks: number;
  ctr?: string;
  createdAt: string;
  updatedAt: string;
}

// Stats
export interface HomepageDealsStats {
  total: number;
  active: number;
  inactive: number;
  byTab: Record<string, number>;
  totalImpressions: number;
  totalClicks: number;
  ctr: number;
}

// Request types
export interface UpdateConfigRequest {
  title?: string;
  subtitle?: string;
  icon?: string;
  isActive?: boolean;
  regions?: RegionId[];
  tabs?: {
    offers?: Partial<TabConfig>;
    cashback?: Partial<TabConfig>;
    exclusive?: Partial<TabConfig>;
  };
}

export interface CreateItemRequest {
  tabType: TabType;
  itemType: ItemType;
  title: string;
  subtitle?: string;
  icon: string;
  iconType?: 'emoji' | 'ionicon' | 'url';
  gradientColors?: string[];
  backgroundColor?: string;
  badgeText?: string;
  badgeBg?: string;
  badgeColor?: string;
  navigationPath: string;
  referenceType?: string;
  referenceId?: string;
  showCount?: boolean;
  countLabel?: string;
  cachedCount?: number;
  requiresVerification?: boolean;
  verificationType?: VerificationType;
  isActive?: boolean;
  sortOrder?: number;
  regions?: RegionId[];
}

export interface UpdateItemRequest extends Partial<CreateItemRequest> {}

export interface ItemsQuery {
  tabType?: TabType;
  status?: 'active' | 'inactive' | 'all';
  page?: number;
  limit?: number;
}

// ============================================
// HOMEPAGE DEALS SERVICE
// ============================================

class HomepageDealsService {
  private baseUrl = 'admin/homepage-deals';

  // ============================================
  // CONFIGURATION
  // ============================================

  /**
   * Get section configuration
   */
  async getConfig(): Promise<HomepageDealsConfig> {
    try {
      console.log('[HomepageDeals] Fetching config...');
      const response = await apiClient.get<{ success: boolean; data: HomepageDealsConfig }>(
        `${this.baseUrl}/config`
      );

      if (response.success && response.data) {
        return response.data;
      }

      throw new Error('Failed to fetch config');
    } catch (error: any) {
      console.error('[HomepageDeals] Get config error:', error.message);
      throw error;
    }
  }

  /**
   * Update section configuration
   */
  async updateConfig(data: UpdateConfigRequest): Promise<HomepageDealsConfig> {
    try {
      console.log('[HomepageDeals] Updating config...');
      const response = await apiClient.put<{ success: boolean; data: HomepageDealsConfig }>(
        `${this.baseUrl}/config`,
        data
      );

      if (response.success && response.data) {
        console.log('[HomepageDeals] Config updated');
        return response.data;
      }

      throw new Error('Failed to update config');
    } catch (error: any) {
      console.error('[HomepageDeals] Update config error:', error.message);
      throw error;
    }
  }

  // ============================================
  // STATISTICS
  // ============================================

  /**
   * Get statistics
   */
  async getStats(): Promise<HomepageDealsStats> {
    try {
      console.log('[HomepageDeals] Fetching stats...');
      const response = await apiClient.get<{ success: boolean; data: HomepageDealsStats }>(
        `${this.baseUrl}/stats`
      );

      if (response.success && response.data) {
        return response.data;
      }

      throw new Error('Failed to fetch stats');
    } catch (error: any) {
      console.error('[HomepageDeals] Get stats error:', error.message);
      throw error;
    }
  }

  // ============================================
  // ITEMS CRUD
  // ============================================

  /**
   * Get all items
   */
  async getItems(query?: ItemsQuery): Promise<{
    items: HomepageDealsItem[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    try {
      console.log('[HomepageDeals] Fetching items...', query);
      const response = await apiClient.get<{
        success: boolean;
        data: {
          items: HomepageDealsItem[];
          pagination: any;
        };
      }>(`${this.baseUrl}/items`, query);

      if (response.success && response.data) {
        return response.data;
      }

      throw new Error('Failed to fetch items');
    } catch (error: any) {
      console.error('[HomepageDeals] Get items error:', error.message);
      throw error;
    }
  }

  /**
   * Get single item by ID
   */
  async getItem(id: string): Promise<HomepageDealsItem> {
    try {
      console.log('[HomepageDeals] Fetching item:', id);
      const response = await apiClient.get<{ success: boolean; data: HomepageDealsItem }>(
        `${this.baseUrl}/items/${id}`
      );

      if (response.success && response.data) {
        return response.data;
      }

      throw new Error('Failed to fetch item');
    } catch (error: any) {
      console.error('[HomepageDeals] Get item error:', error.message);
      throw error;
    }
  }

  /**
   * Create new item
   */
  async createItem(data: CreateItemRequest): Promise<HomepageDealsItem> {
    try {
      console.log('[HomepageDeals] Creating item:', data.title);
      const response = await apiClient.post<{ success: boolean; data: HomepageDealsItem }>(
        `${this.baseUrl}/items`,
        data
      );

      if (response.success && response.data) {
        console.log('[HomepageDeals] Item created:', response.data._id);
        return response.data;
      }

      throw new Error('Failed to create item');
    } catch (error: any) {
      console.error('[HomepageDeals] Create item error:', error.message);
      throw error;
    }
  }

  /**
   * Update item
   */
  async updateItem(id: string, data: UpdateItemRequest): Promise<HomepageDealsItem> {
    try {
      console.log('[HomepageDeals] Updating item:', id);
      const response = await apiClient.put<{ success: boolean; data: HomepageDealsItem }>(
        `${this.baseUrl}/items/${id}`,
        data
      );

      if (response.success && response.data) {
        console.log('[HomepageDeals] Item updated');
        return response.data;
      }

      throw new Error('Failed to update item');
    } catch (error: any) {
      console.error('[HomepageDeals] Update item error:', error.message);
      throw error;
    }
  }

  /**
   * Delete item
   */
  async deleteItem(id: string): Promise<void> {
    try {
      console.log('[HomepageDeals] Deleting item:', id);
      const response = await apiClient.delete<{ success: boolean }>(
        `${this.baseUrl}/items/${id}`
      );

      if (response.success) {
        console.log('[HomepageDeals] Item deleted');
        return;
      }

      throw new Error('Failed to delete item');
    } catch (error: any) {
      console.error('[HomepageDeals] Delete item error:', error.message);
      throw error;
    }
  }

  /**
   * Toggle item visibility
   */
  async toggleItem(id: string): Promise<{ isActive: boolean }> {
    try {
      console.log('[HomepageDeals] Toggling item:', id);
      const response = await apiClient.patch<{ success: boolean; data: { isActive: boolean } }>(
        `${this.baseUrl}/items/${id}/toggle`
      );

      if (response.success && response.data) {
        console.log('[HomepageDeals] Item toggled:', response.data.isActive);
        return response.data;
      }

      throw new Error('Failed to toggle item');
    } catch (error: any) {
      console.error('[HomepageDeals] Toggle item error:', error.message);
      throw error;
    }
  }

  // ============================================
  // REORDERING
  // ============================================

  /**
   * Reorder items (bulk update sort order)
   */
  async reorderItems(items: { id: string; sortOrder: number }[]): Promise<void> {
    try {
      console.log('[HomepageDeals] Reordering items:', items.length);
      const response = await apiClient.patch<{ success: boolean }>(
        `${this.baseUrl}/items/reorder`,
        { items }
      );

      if (response.success) {
        console.log('[HomepageDeals] Items reordered');
        return;
      }

      throw new Error('Failed to reorder items');
    } catch (error: any) {
      console.error('[HomepageDeals] Reorder error:', error.message);
      throw error;
    }
  }

  /**
   * Move item up
   */
  async moveItemUp(id: string): Promise<void> {
    try {
      console.log('[HomepageDeals] Moving item up:', id);
      const response = await apiClient.patch<{ success: boolean }>(
        `${this.baseUrl}/items/${id}/move-up`
      );

      if (response.success) {
        console.log('[HomepageDeals] Item moved up');
        return;
      }

      throw new Error('Failed to move item up');
    } catch (error: any) {
      console.error('[HomepageDeals] Move up error:', error.message);
      throw error;
    }
  }

  /**
   * Move item down
   */
  async moveItemDown(id: string): Promise<void> {
    try {
      console.log('[HomepageDeals] Moving item down:', id);
      const response = await apiClient.patch<{ success: boolean }>(
        `${this.baseUrl}/items/${id}/move-down`
      );

      if (response.success) {
        console.log('[HomepageDeals] Item moved down');
        return;
      }

      throw new Error('Failed to move item down');
    } catch (error: any) {
      console.error('[HomepageDeals] Move down error:', error.message);
      throw error;
    }
  }

  /**
   * Update cached count for item
   */
  async updateItemCount(id: string, count: number): Promise<void> {
    try {
      console.log('[HomepageDeals] Updating item count:', id, count);
      const response = await apiClient.patch<{ success: boolean }>(
        `${this.baseUrl}/items/${id}/update-count`,
        { count }
      );

      if (response.success) {
        console.log('[HomepageDeals] Item count updated');
        return;
      }

      throw new Error('Failed to update item count');
    } catch (error: any) {
      console.error('[HomepageDeals] Update count error:', error.message);
      throw error;
    }
  }
}

// Export singleton instance
export const homepageDealsService = new HomepageDealsService();

export default homepageDealsService;
