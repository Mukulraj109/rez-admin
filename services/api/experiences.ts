import { apiClient } from './apiClient';
import { Colors } from '@/constants/Colors';

// ============================================
// INTERFACES
// ============================================

// Region type
export type RegionId = 'bangalore' | 'dubai';

// Region option for admin UI
export const REGIONS: { value: RegionId; label: string; flag: string }[] = [
  { value: 'bangalore', label: 'India', flag: '🇮🇳' },
  { value: 'dubai', label: 'Dubai, UAE', flag: '🇦🇪' },
];

// Store Experience interface
export interface StoreExperience {
  _id: string;
  slug: string;
  title: string;
  subtitle?: string;
  description?: string;
  icon: string;
  iconType: 'emoji' | 'url' | 'icon-name';
  type: ExperienceType;
  badge?: string;
  badgeBg?: string;
  badgeColor?: string;
  backgroundColor?: string;
  gradientColors?: string[];
  image?: string;
  bannerImage?: string;
  benefits?: string[];
  filterCriteria?: FilterCriteria;
  regions?: RegionId[];
  storeCount?: number;
  sortOrder: number;
  isActive: boolean;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
}

// Experience types
export type ExperienceType =
  | 'fastDelivery'
  | 'budgetFriendly'
  | 'premium'
  | 'organic'
  | 'oneRupee'
  | 'ninetyNine'
  | 'luxury'
  | 'verified'
  | 'partner'
  | 'mall'
  | 'custom';

// Filter criteria for store matching
export interface FilterCriteria {
  tags?: string[];
  maxDeliveryTime?: number;
  maxPrice?: number;
  minRating?: number;
  isPremium?: boolean;
  isOrganic?: boolean;
  isPartner?: boolean;
  isMall?: boolean;
  isFastDelivery?: boolean;
  isBudgetFriendly?: boolean;
  isVerified?: boolean;
  categories?: string[];
}

// Category for filter builder
export interface CategoryOption {
  _id: string;
  name: string;
  slug: string;
  icon?: string;
}

// Tag option for filter builder
export interface TagOption {
  tag: string;
  count: number;
}

// Preview store for filter builder
export interface PreviewStore {
  _id: string;
  name: string;
  logo?: string;
  city?: string;
  rating?: number;
  cashback?: number;
  category?: string;
  tags?: string[];
}

// Preview stores response
export interface PreviewStoresResponse {
  total: number;
  stores: PreviewStore[];
}

// Create/Update request
export interface ExperienceRequest {
  slug?: string;
  title: string;
  subtitle?: string;
  description?: string;
  icon: string;
  iconType?: 'emoji' | 'url' | 'icon-name';
  type: ExperienceType;
  badge?: string;
  badgeBg?: string;
  badgeColor?: string;
  backgroundColor?: string;
  gradientColors?: string[];
  image?: string;
  bannerImage?: string;
  benefits?: string[];
  filterCriteria?: FilterCriteria;
  regions?: RegionId[];
  sortOrder?: number;
  isActive?: boolean;
  isFeatured?: boolean;
}

// Stats interface
export interface ExperienceStats {
  total: number;
  active: number;
  inactive: number;
  featured: number;
  byType: Record<string, number>;
}

// List response
export interface ExperiencesListResponse {
  experiences: StoreExperience[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Query parameters
export interface ExperiencesQuery {
  page?: number;
  limit?: number;
  status?: 'active' | 'inactive' | 'all';
  featured?: boolean;
  type?: ExperienceType;
  search?: string;
  sortBy?: 'sortOrder' | 'title' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

// ============================================
// EXPERIENCE TYPE OPTIONS (for dropdowns)
// ============================================

export const EXPERIENCE_TYPES: { value: ExperienceType; label: string }[] = [
  { value: 'fastDelivery', label: '⚡ Fast Delivery' },
  { value: 'budgetFriendly', label: '💰 Budget Friendly' },
  { value: 'oneRupee', label: '₹1 Store' },
  { value: 'ninetyNine', label: '₹99 Store' },
  { value: 'premium', label: '👑 Premium' },
  { value: 'luxury', label: '💎 Luxury' },
  { value: 'organic', label: '🌿 Organic' },
  { value: 'verified', label: '✓ Verified' },
  { value: 'partner', label: '🤝 Partner' },
  { value: 'mall', label: '🏬 Mall' },
  { value: 'custom', label: '⚙️ Custom' },
];

// Background color presets
export const BACKGROUND_COLORS = [
  '#FEF3C7', // Yellow light
  Colors.light.infoLighter, // Blue light
  '#D1FAE5', // Green light
  '#FCE7F3', // Pink light
  '#E0E7FF', // Indigo light
  '#FEE2E2', // Red light
  '#F3E8FF', // Purple light
  '#ECFDF5', // Emerald light
  '#FFF7ED', // Orange light
  Colors.light.successLighter, // Lime light
];

// Common emojis for experiences
export const COMMON_EMOJIS = [
  '⚡', '🚀', '💨', '🏃', // Speed/Delivery
  '💰', '🪙', '💸', '🎯', // Budget/Deals
  '👑', '💎', '✨', '🌟', // Premium/Luxury
  '🌿', '🥬', '🥗', '🌱', // Organic
  '🛍️', '🛒', '🏪', '🏬', // Shopping
  '👔', '👗', '👟', '👜', // Fashion
  '🎁', '🎀', '💝', '🎊', // Gifting
  '👶', '🧸', '🎮', '📱', // Kids/Tech
  '🍔', '🍕', '☕', '🍰', // Food
  '💄', '💅', '🧴', '✂️', // Beauty
];

// ============================================
// SERVICE CLASS
// ============================================

class ExperiencesService {
  /**
   * Get experiences with pagination and filters
   */
  async getExperiences(query: ExperiencesQuery = {}): Promise<ExperiencesListResponse> {
    try {
      if (__DEV__) console.log('[Experiences] Fetching experiences with query:', query);

      const params = new URLSearchParams();
      if (query.page) params.append('page', query.page.toString());
      if (query.limit) params.append('limit', query.limit.toString());
      if (query.status) params.append('status', query.status);
      if (query.featured !== undefined) params.append('featured', query.featured.toString());
      if (query.type) params.append('type', query.type);
      if (query.search) params.append('search', query.search);
      if (query.sortBy) params.append('sortBy', query.sortBy);
      if (query.sortOrder) params.append('sortOrder', query.sortOrder);

      const endpoint = `admin/experiences${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await apiClient.get<ExperiencesListResponse>(endpoint);

      if (response.success && response.data) {
        if (__DEV__) console.log('[Experiences] Fetched successfully:', response.data.experiences?.length || 0, 'experiences');
        return response.data;
      }

      throw new Error(response.message || 'Failed to fetch experiences');
    } catch (error: any) {
      if (__DEV__) console.error('[Experiences] Get experiences error:', error.message);
      throw new Error(error.message || 'Failed to fetch experiences');
    }
  }

  /**
   * Get experience statistics
   */
  async getStats(): Promise<ExperienceStats> {
    try {
      if (__DEV__) console.log('[Experiences] Fetching stats...');
      const response = await apiClient.get<ExperienceStats>('admin/experiences/stats');

      if (response.success && response.data) {
        if (__DEV__) console.log('[Experiences] Stats fetched successfully');
        return response.data;
      }

      throw new Error(response.message || 'Failed to fetch stats');
    } catch (error: any) {
      if (__DEV__) console.error('[Experiences] Get stats error:', error.message);
      throw new Error(error.message || 'Failed to fetch experience stats');
    }
  }

  /**
   * Get single experience by ID
   */
  async getExperienceById(id: string): Promise<StoreExperience> {
    try {
      if (__DEV__) console.log('[Experiences] Fetching experience:', id);
      const response = await apiClient.get<StoreExperience>(`admin/experiences/${id}`);

      if (response.success && response.data) {
        if (__DEV__) console.log('[Experiences] Experience fetched:', response.data.title);
        return response.data;
      }

      throw new Error(response.message || 'Experience not found');
    } catch (error: any) {
      if (__DEV__) console.error('[Experiences] Get experience error:', error.message);
      throw new Error(error.message || 'Failed to fetch experience');
    }
  }

  /**
   * Create new experience
   */
  async createExperience(data: ExperienceRequest): Promise<StoreExperience> {
    try {
      if (__DEV__) console.log('[Experiences] Creating experience:', data.title);
      const response = await apiClient.post<StoreExperience>('admin/experiences', data);

      if (response.success && response.data) {
        if (__DEV__) console.log('[Experiences] Experience created:', response.data.slug);
        return response.data;
      }

      throw new Error(response.message || 'Failed to create experience');
    } catch (error: any) {
      if (__DEV__) console.error('[Experiences] Create experience error:', error.message);
      throw new Error(error.message || 'Failed to create experience');
    }
  }

  /**
   * Update experience
   */
  async updateExperience(id: string, data: Partial<ExperienceRequest>): Promise<StoreExperience> {
    try {
      if (__DEV__) console.log('[Experiences] Updating experience:', id);
      const response = await apiClient.put<StoreExperience>(`admin/experiences/${id}`, data);

      if (response.success && response.data) {
        if (__DEV__) console.log('[Experiences] Experience updated:', response.data.slug);
        return response.data;
      }

      throw new Error(response.message || 'Failed to update experience');
    } catch (error: any) {
      if (__DEV__) console.error('[Experiences] Update experience error:', error.message);
      throw new Error(error.message || 'Failed to update experience');
    }
  }

  /**
   * Delete experience
   */
  async deleteExperience(id: string): Promise<void> {
    try {
      if (__DEV__) console.log('[Experiences] Deleting experience:', id);
      const response = await apiClient.delete(`admin/experiences/${id}`);

      if (response.success) {
        if (__DEV__) console.log('[Experiences] Experience deleted');
        return;
      }

      throw new Error(response.message || 'Failed to delete experience');
    } catch (error: any) {
      if (__DEV__) console.error('[Experiences] Delete experience error:', error.message);
      throw new Error(error.message || 'Failed to delete experience');
    }
  }

  /**
   * Toggle experience active status
   */
  async toggleExperience(id: string): Promise<{ isActive: boolean }> {
    try {
      if (__DEV__) console.log('[Experiences] Toggling experience:', id);
      const response = await apiClient.patch<{ isActive: boolean }>(`admin/experiences/${id}/toggle`);

      if (response.success && response.data) {
        if (__DEV__) console.log('[Experiences] Experience toggled, isActive:', response.data.isActive);
        return response.data;
      }

      throw new Error(response.message || 'Failed to toggle experience');
    } catch (error: any) {
      if (__DEV__) console.error('[Experiences] Toggle experience error:', error.message);
      throw new Error(error.message || 'Failed to toggle experience');
    }
  }

  /**
   * Toggle experience featured status
   */
  async toggleFeatured(id: string): Promise<{ isFeatured: boolean }> {
    try {
      if (__DEV__) console.log('[Experiences] Toggling featured:', id);
      const response = await apiClient.patch<{ isFeatured: boolean }>(`admin/experiences/${id}/feature`);

      if (response.success && response.data) {
        if (__DEV__) console.log('[Experiences] Featured toggled, isFeatured:', response.data.isFeatured);
        return response.data;
      }

      throw new Error(response.message || 'Failed to toggle featured status');
    } catch (error: any) {
      if (__DEV__) console.error('[Experiences] Toggle featured error:', error.message);
      throw new Error(error.message || 'Failed to toggle featured status');
    }
  }

  /**
   * Reorder experiences
   */
  async reorderExperiences(items: Array<{ id: string; sortOrder: number }>): Promise<void> {
    try {
      if (__DEV__) console.log('[Experiences] Reordering:', items.length, 'experiences');
      const response = await apiClient.patch('admin/experiences/reorder', { items });

      if (response.success) {
        if (__DEV__) console.log('[Experiences] Reorder completed');
        return;
      }

      throw new Error(response.message || 'Failed to reorder experiences');
    } catch (error: any) {
      if (__DEV__) console.error('[Experiences] Reorder error:', error.message);
      throw new Error(error.message || 'Failed to reorder experiences');
    }
  }

  /**
   * Get categories for filter builder
   */
  async getCategories(): Promise<CategoryOption[]> {
    try {
      if (__DEV__) console.log('[Experiences] Fetching categories...');
      const response = await apiClient.get<CategoryOption[]>('admin/experiences/categories/list');

      if (response.success && response.data) {
        if (__DEV__) console.log('[Experiences] Categories fetched:', response.data.length);
        return response.data;
      }

      throw new Error(response.message || 'Failed to fetch categories');
    } catch (error: any) {
      if (__DEV__) console.error('[Experiences] Get categories error:', error.message);
      throw new Error(error.message || 'Failed to fetch categories');
    }
  }

  /**
   * Get common tags for filter builder
   */
  async getTags(): Promise<TagOption[]> {
    try {
      if (__DEV__) console.log('[Experiences] Fetching tags...');
      const response = await apiClient.get<TagOption[]>('admin/experiences/tags/list');

      if (response.success && response.data) {
        if (__DEV__) console.log('[Experiences] Tags fetched:', response.data.length);
        return response.data;
      }

      throw new Error(response.message || 'Failed to fetch tags');
    } catch (error: any) {
      if (__DEV__) console.error('[Experiences] Get tags error:', error.message);
      throw new Error(error.message || 'Failed to fetch tags');
    }
  }

  /**
   * Preview stores matching filter criteria
   */
  async previewStores(filterCriteria: FilterCriteria, limit: number = 10): Promise<PreviewStoresResponse> {
    try {
      if (__DEV__) console.log('[Experiences] Previewing stores with criteria:', filterCriteria);
      const response = await apiClient.post<PreviewStoresResponse>('admin/experiences/preview-stores', {
        filterCriteria,
        limit,
      });

      if (response.success && response.data) {
        if (__DEV__) console.log('[Experiences] Preview:', response.data.total, 'stores match');
        return response.data;
      }

      throw new Error(response.message || 'Failed to preview stores');
    } catch (error: any) {
      if (__DEV__) console.error('[Experiences] Preview stores error:', error.message);
      throw new Error(error.message || 'Failed to preview stores');
    }
  }

  /**
   * Refresh store count for an experience
   */
  async refreshStoreCount(id: string): Promise<{ storeCount: number }> {
    try {
      if (__DEV__) console.log('[Experiences] Refreshing store count for:', id);
      const response = await apiClient.patch<{ storeCount: number }>(`admin/experiences/${id}/refresh-count`);

      if (response.success && response.data) {
        if (__DEV__) console.log('[Experiences] Store count refreshed:', response.data.storeCount);
        return response.data;
      }

      throw new Error(response.message || 'Failed to refresh store count');
    } catch (error: any) {
      if (__DEV__) console.error('[Experiences] Refresh count error:', error.message);
      throw new Error(error.message || 'Failed to refresh store count');
    }
  }

  /**
   * Refresh store counts for all experiences
   */
  async refreshAllStoreCounts(): Promise<{ totalExperiences: number; updated: number }> {
    try {
      if (__DEV__) console.log('[Experiences] Refreshing all store counts...');
      const response = await apiClient.post<{ totalExperiences: number; updated: number }>('admin/experiences/refresh-all-counts');

      if (response.success && response.data) {
        if (__DEV__) console.log('[Experiences] All counts refreshed:', response.data);
        return response.data;
      }

      throw new Error(response.message || 'Failed to refresh all store counts');
    } catch (error: any) {
      if (__DEV__) console.error('[Experiences] Refresh all counts error:', error.message);
      throw new Error(error.message || 'Failed to refresh all store counts');
    }
  }

  /**
   * Search stores for assignment
   */
  async searchStores(query: string): Promise<{ stores: AssignableStore[]; total: number }> {
    try {
      if (__DEV__) console.log('[Experiences] Searching stores:', query);
      // Build query params in URL since apiClient.get doesn't handle query params
      const endpoint = `admin/experiences/stores/search?q=${encodeURIComponent(query)}&limit=10`;
      const response = await apiClient.get<{ stores: AssignableStore[]; total: number }>(endpoint);

      if (response.success && response.data) {
        return response.data;
      }

      throw new Error(response.message || 'Failed to search stores');
    } catch (error: any) {
      if (__DEV__) console.error('[Experiences] Search stores error:', error.message);
      throw new Error(error.message || 'Failed to search stores');
    }
  }

  /**
   * Get suggested stores (popular/top-rated) for quick assignment
   */
  async getSuggestedStores(): Promise<{ stores: AssignableStore[]; total: number }> {
    try {
      if (__DEV__) console.log('[Experiences] Fetching suggested stores...');
      const response = await apiClient.get<{ stores: AssignableStore[]; total: number }>('admin/experiences/stores/suggested');

      if (response.success && response.data) {
        return response.data;
      }

      throw new Error(response.message || 'Failed to fetch suggested stores');
    } catch (error: any) {
      if (__DEV__) console.error('[Experiences] Get suggested stores error:', error.message);
      throw new Error(error.message || 'Failed to fetch suggested stores');
    }
  }

  /**
   * Get assigned stores for an experience
   */
  async getAssignedStores(experienceId: string): Promise<{ stores: AssignableStore[]; total: number }> {
    try {
      if (__DEV__) console.log('[Experiences] Getting assigned stores for:', experienceId);
      const response = await apiClient.get<{ stores: AssignableStore[]; total: number }>(`admin/experiences/${experienceId}/assigned-stores`);

      if (response.success && response.data) {
        return response.data;
      }

      throw new Error(response.message || 'Failed to get assigned stores');
    } catch (error: any) {
      if (__DEV__) console.error('[Experiences] Get assigned stores error:', error.message);
      throw new Error(error.message || 'Failed to get assigned stores');
    }
  }

  /**
   * Assign a store to an experience
   */
  async assignStore(experienceId: string, storeId: string): Promise<void> {
    try {
      if (__DEV__) console.log('[Experiences] Assigning store:', storeId, 'to experience:', experienceId);
      const response = await apiClient.post(`admin/experiences/${experienceId}/assign-store`, { storeId });

      if (response.success) {
        if (__DEV__) console.log('[Experiences] Store assigned successfully');
        return;
      }

      throw new Error(response.message || 'Failed to assign store');
    } catch (error: any) {
      if (__DEV__) console.error('[Experiences] Assign store error:', error.message);
      throw new Error(error.message || 'Failed to assign store');
    }
  }

  /**
   * Remove a store from an experience
   */
  async removeStore(experienceId: string, storeId: string): Promise<void> {
    try {
      if (__DEV__) console.log('[Experiences] Removing store:', storeId, 'from experience:', experienceId);
      const response = await apiClient.delete(`admin/experiences/${experienceId}/remove-store/${storeId}`);

      if (response.success) {
        if (__DEV__) console.log('[Experiences] Store removed successfully');
        return;
      }

      throw new Error(response.message || 'Failed to remove store');
    } catch (error: any) {
      if (__DEV__) console.error('[Experiences] Remove store error:', error.message);
      throw new Error(error.message || 'Failed to remove store');
    }
  }
}

// Assignable store interface
export interface AssignableStore {
  _id: string;
  name: string;
  logo?: string;
  category?: string;
  city?: string;
  rating?: number;
  cashback?: number;
  tags?: string[];
}

export const experiencesService = new ExperiencesService();
export default experiencesService;
