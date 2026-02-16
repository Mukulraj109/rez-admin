import { apiClient } from './apiClient';

// ============================================
// INTERFACES
// ============================================

export interface MainCategory {
  _id: string;
  name: string;
  slug: string;
  icon?: string;
  image?: string;
  type: string;
  sortOrder: number;
  isActive: boolean;
  metadata?: { color?: string; featured?: boolean };
  maxCashback?: number;
  storeCount?: number;
  productCount?: number;
  updatedAt?: string;
  pageConfig?: PageConfig;
}

export interface PageConfig {
  isMainCategory: boolean;
  theme: {
    primaryColor: string;
    gradientColors: string[];
    icon: string;
    accentColor?: string;
    backgroundColor?: string;
  };
  banner: {
    title: string;
    subtitle: string;
    discount: string;
    tag: string;
    image?: string;
    ctaText?: string;
    ctaRoute?: string;
  };
  tabs: Array<{
    id: string;
    label: string;
    icon: string;
    serviceFilter?: string;
    sectionOverride?: string;
    enabled: boolean;
    sortOrder: number;
  }>;
  quickActions: Array<{
    id: string;
    label: string;
    icon: string;
    route: string;
    color: string;
    enabled: boolean;
    sortOrder: number;
  }>;
  sections: Array<{
    id?: string;
    type: string;
    title?: string;
    subtitle?: string;
    icon?: string;
    enabled: boolean;
    sortOrder: number;
    config?: any;
  }>;
  serviceTypes: Array<{
    id: string;
    label: string;
    icon: string;
    description: string;
    filterField: string;
    color?: string;
    gradient?: string[];
    enabled: boolean;
    sortOrder: number;
  }>;
  dietaryOptions?: Array<{
    id: string;
    label: string;
    icon: string;
    color: string;
    tags: string[];
  }>;
  curatedCollections?: Array<{
    id: string;
    title: string;
    subtitle: string;
    icon: string;
    gradient: string[];
    tags: string;
  }>;
  searchPlaceholders?: Record<string, string[]>;
  valuePropItems?: Array<{
    icon: string;
    text: string;
    color: string;
  }>;
  sortOptions?: Array<{
    id: string;
    label: string;
    icon: string;
    enabled: boolean;
    sortOrder: number;
  }>;
  filterOptions?: {
    priceMax?: number;
    priceLabel?: string;
    ratingThreshold?: number;
    showPriceFilter?: boolean;
    showRatingFilter?: boolean;
    showOpenNow?: boolean;
  };
  storeDisplayConfig?: {
    storesPerPage?: number;
    tagExclusions?: string[];
    defaultCoinsMultiplier?: number;
    defaultReviewBonus?: number;
    defaultVisitMilestone?: number;
  };
  trustBadges?: Array<{
    icon: string;
    label: string;
    color: string;
  }>;
  loyaltyConfig?: {
    emptyMessage?: string;
    displayLimit?: number;
  };
  experienceBenefits?: Array<{
    icon: string;
    title: string;
    description: string;
  }>;
}

// Section type options for dropdowns
export const SECTION_TYPES = [
  'loyalty-hub',
  'social-proof-ticker',
  'browse-grid',
  'ai-search',
  'stores-list',
  'popular-items',
  'new-stores',
  'curated-collections',
  'ugc-social',
  'offers-section',
  'experiences-section',
  'order-again',
  'footer-trust',
  'streak-loyalty',
  'service-types',
  'value-proposition',
];

// Filter field options for service types
export const FILTER_FIELD_OPTIONS = [
  'homeDelivery',
  'driveThru',
  'tableBooking',
  'dineIn',
  'storePickup',
];

// ============================================
// SERVICE CLASS
// ============================================

class CategoriesService {
  /**
   * Get all main categories
   */
  async getMainCategories(): Promise<{ categories: MainCategory[] }> {
    try {
      console.log('[Categories] Fetching main categories...');
      const response = await apiClient.get<any>('admin/categories');

      if (response.success && response.data) {
        console.log('[Categories] Fetched successfully');
        const categories = response.data.categories || (Array.isArray(response.data) ? response.data : []);
        return { categories };
      }

      throw new Error(response.message || 'Failed to fetch categories');
    } catch (error: any) {
      console.error('[Categories] Get categories error:', error.message);
      throw new Error(error.message || 'Failed to fetch categories');
    }
  }

  /**
   * Get single category by ID
   */
  async getCategory(id: string): Promise<{ category: MainCategory }> {
    try {
      console.log('[Categories] Fetching category:', id);
      const response = await apiClient.get<any>(`admin/categories/${id}`);

      if (response.success && response.data) {
        console.log('[Categories] Category fetched:', response.data.category?.name || response.data.name);
        const category = response.data.category || response.data;
        return { category };
      }

      throw new Error(response.message || 'Category not found');
    } catch (error: any) {
      console.error('[Categories] Get category error:', error.message);
      throw new Error(error.message || 'Failed to fetch category');
    }
  }

  /**
   * Update a category
   */
  async updateCategory(id: string, data: Partial<MainCategory>): Promise<{ category: MainCategory }> {
    try {
      console.log('[Categories] Updating category:', id);
      const response = await apiClient.put<any>(`admin/categories/${id}`, data);

      if (response.success && response.data) {
        console.log('[Categories] Category updated');
        const category = response.data.category || response.data;
        return { category };
      }

      throw new Error(response.message || 'Failed to update category');
    } catch (error: any) {
      console.error('[Categories] Update category error:', error.message);
      throw new Error(error.message || 'Failed to update category');
    }
  }

  /**
   * Update entire page config for a category
   */
  async updatePageConfig(id: string, pageConfig: PageConfig): Promise<{ category: MainCategory }> {
    try {
      console.log('[Categories] Updating page config for:', id);
      const response = await apiClient.put<any>(`admin/categories/${id}/page-config`, pageConfig);

      if (response.success && response.data) {
        console.log('[Categories] Page config updated');
        const category = response.data.category || response.data;
        return { category };
      }

      throw new Error(response.message || 'Failed to update page config');
    } catch (error: any) {
      console.error('[Categories] Update page config error:', error.message);
      throw new Error(error.message || 'Failed to update page config');
    }
  }

  /**
   * Update tabs for a category
   */
  async updateTabs(id: string, tabs: PageConfig['tabs']): Promise<any> {
    try {
      console.log('[Categories] Updating tabs for:', id);
      const response = await apiClient.patch<any>(`admin/categories/${id}/tabs`, { tabs });

      if (response.success) {
        console.log('[Categories] Tabs updated');
        return response.data;
      }

      throw new Error(response.message || 'Failed to update tabs');
    } catch (error: any) {
      console.error('[Categories] Update tabs error:', error.message);
      throw new Error(error.message || 'Failed to update tabs');
    }
  }

  /**
   * Update quick actions for a category
   */
  async updateQuickActions(id: string, quickActions: PageConfig['quickActions']): Promise<any> {
    try {
      console.log('[Categories] Updating quick actions for:', id);
      const response = await apiClient.patch<any>(`admin/categories/${id}/quick-actions`, { quickActions });

      if (response.success) {
        console.log('[Categories] Quick actions updated');
        return response.data;
      }

      throw new Error(response.message || 'Failed to update quick actions');
    } catch (error: any) {
      console.error('[Categories] Update quick actions error:', error.message);
      throw new Error(error.message || 'Failed to update quick actions');
    }
  }

  /**
   * Update sections for a category
   */
  async updateSections(id: string, sections: PageConfig['sections']): Promise<any> {
    try {
      console.log('[Categories] Updating sections for:', id);
      const response = await apiClient.patch<any>(`admin/categories/${id}/sections`, { sections });

      if (response.success) {
        console.log('[Categories] Sections updated');
        return response.data;
      }

      throw new Error(response.message || 'Failed to update sections');
    } catch (error: any) {
      console.error('[Categories] Update sections error:', error.message);
      throw new Error(error.message || 'Failed to update sections');
    }
  }

  /**
   * Update service types for a category
   */
  async updateServiceTypes(id: string, serviceTypes: PageConfig['serviceTypes']): Promise<any> {
    try {
      console.log('[Categories] Updating service types for:', id);
      const response = await apiClient.patch<any>(`admin/categories/${id}/service-types`, { serviceTypes });

      if (response.success) {
        console.log('[Categories] Service types updated');
        return response.data;
      }

      throw new Error(response.message || 'Failed to update service types');
    } catch (error: any) {
      console.error('[Categories] Update service types error:', error.message);
      throw new Error(error.message || 'Failed to update service types');
    }
  }

  /**
   * Update banner for a category
   */
  async updateBanner(id: string, banner: PageConfig['banner']): Promise<any> {
    try {
      console.log('[Categories] Updating banner for:', id);
      const response = await apiClient.patch<any>(`admin/categories/${id}/banner`, { banner });

      if (response.success) {
        console.log('[Categories] Banner updated');
        return response.data;
      }

      throw new Error(response.message || 'Failed to update banner');
    } catch (error: any) {
      console.error('[Categories] Update banner error:', error.message);
      throw new Error(error.message || 'Failed to update banner');
    }
  }

  /**
   * Update theme for a category
   */
  async updateTheme(id: string, theme: PageConfig['theme']): Promise<any> {
    try {
      console.log('[Categories] Updating theme for:', id);
      const response = await apiClient.patch<any>(`admin/categories/${id}/theme`, { theme });

      if (response.success) {
        console.log('[Categories] Theme updated');
        return response.data;
      }

      throw new Error(response.message || 'Failed to update theme');
    } catch (error: any) {
      console.error('[Categories] Update theme error:', error.message);
      throw new Error(error.message || 'Failed to update theme');
    }
  }

  /**
   * Reorder categories
   */
  async reorderCategories(orderedIds: string[]): Promise<any> {
    try {
      console.log('[Categories] Reordering categories:', orderedIds.length, 'items');
      const response = await apiClient.post<any>('admin/categories/reorder', { orderedIds });

      if (response.success) {
        console.log('[Categories] Reorder completed');
        return response.data;
      }

      throw new Error(response.message || 'Failed to reorder categories');
    } catch (error: any) {
      console.error('[Categories] Reorder error:', error.message);
      throw new Error(error.message || 'Failed to reorder categories');
    }
  }

  /**
   * Update dietary options for a category
   */
  async updateDietaryOptions(id: string, dietaryOptions: NonNullable<PageConfig['dietaryOptions']>): Promise<any> {
    try {
      console.log('[Categories] Updating dietary options for:', id);
      const response = await apiClient.patch<any>(`admin/categories/${id}/dietary-options`, { dietaryOptions });
      if (response.success) {
        console.log('[Categories] Dietary options updated');
        return response.data;
      }
      throw new Error(response.message || 'Failed to update dietary options');
    } catch (error: any) {
      console.error('[Categories] Update dietary options error:', error.message);
      throw new Error(error.message || 'Failed to update dietary options');
    }
  }

  /**
   * Update curated collections for a category
   */
  async updateCuratedCollections(id: string, curatedCollections: NonNullable<PageConfig['curatedCollections']>): Promise<any> {
    try {
      console.log('[Categories] Updating curated collections for:', id);
      const response = await apiClient.patch<any>(`admin/categories/${id}/curated-collections`, { curatedCollections });
      if (response.success) {
        console.log('[Categories] Curated collections updated');
        return response.data;
      }
      throw new Error(response.message || 'Failed to update curated collections');
    } catch (error: any) {
      console.error('[Categories] Update curated collections error:', error.message);
      throw new Error(error.message || 'Failed to update curated collections');
    }
  }

  /**
   * Update search placeholders for a category
   */
  async updateSearchPlaceholders(id: string, searchPlaceholders: NonNullable<PageConfig['searchPlaceholders']>): Promise<any> {
    try {
      console.log('[Categories] Updating search placeholders for:', id);
      const response = await apiClient.patch<any>(`admin/categories/${id}/search-placeholders`, { searchPlaceholders });
      if (response.success) {
        console.log('[Categories] Search placeholders updated');
        return response.data;
      }
      throw new Error(response.message || 'Failed to update search placeholders');
    } catch (error: any) {
      console.error('[Categories] Update search placeholders error:', error.message);
      throw new Error(error.message || 'Failed to update search placeholders');
    }
  }

  /**
   * Update value prop items for a category
   */
  async updateValuePropItems(id: string, valuePropItems: NonNullable<PageConfig['valuePropItems']>): Promise<any> {
    try {
      console.log('[Categories] Updating value prop items for:', id);
      const response = await apiClient.patch<any>(`admin/categories/${id}/value-prop-items`, { valuePropItems });
      if (response.success) {
        console.log('[Categories] Value prop items updated');
        return response.data;
      }
      throw new Error(response.message || 'Failed to update value prop items');
    } catch (error: any) {
      console.error('[Categories] Update value prop items error:', error.message);
      throw new Error(error.message || 'Failed to update value prop items');
    }
  }

  /**
   * Create a new category
   */
  async createCategory(data: {
    name: string;
    slug?: string;
    description?: string;
    icon?: string;
    image?: string;
    type: string;
    parentCategory?: string | null;
    isActive?: boolean;
    sortOrder?: number;
    metadata?: { color?: string; featured?: boolean; description?: string };
  }): Promise<{ category: MainCategory }> {
    try {
      console.log('[Categories] Creating category:', data.name);
      const response = await apiClient.post<any>('admin/categories', data);
      if (response.success && response.data) {
        console.log('[Categories] Category created');
        return { category: response.data.category || response.data };
      }
      throw new Error(response.message || 'Failed to create category');
    } catch (error: any) {
      console.error('[Categories] Create category error:', error.message);
      throw new Error(error.message || 'Failed to create category');
    }
  }

  /**
   * Delete a category (blocked if stores or subcategories exist)
   */
  async deleteCategory(id: string): Promise<void> {
    try {
      console.log('[Categories] Deleting category:', id);
      const response = await apiClient.delete<any>(`admin/categories/${id}`);
      if (response.success) {
        console.log('[Categories] Category deleted');
        return;
      }
      throw new Error(response.message || 'Failed to delete category');
    } catch (error: any) {
      console.error('[Categories] Delete category error:', error.message);
      throw new Error(error.message || 'Failed to delete category');
    }
  }

  /**
   * Get subcategories for a category
   */
  async getSubcategories(parentId: string): Promise<{ subcategories: any[] }> {
    try {
      console.log('[Categories] Fetching subcategories for:', parentId);
      const response = await apiClient.get<any>(`admin/categories/${parentId}/subcategories`);
      if (response.success && response.data) {
        return { subcategories: response.data.subcategories || [] };
      }
      throw new Error(response.message || 'Failed to fetch subcategories');
    } catch (error: any) {
      console.error('[Categories] Get subcategories error:', error.message);
      throw new Error(error.message || 'Failed to fetch subcategories');
    }
  }

  /**
   * Create a subcategory
   */
  async createSubcategory(parentId: string, data: {
    name: string;
    slug?: string;
    icon?: string;
    image?: string;
    isActive?: boolean;
    metadata?: { color?: string; description?: string };
  }): Promise<{ subcategory: any }> {
    try {
      console.log('[Categories] Creating subcategory for:', parentId);
      const response = await apiClient.post<any>(`admin/categories/${parentId}/subcategories`, data);
      if (response.success && response.data) {
        return { subcategory: response.data.subcategory || response.data };
      }
      throw new Error(response.message || 'Failed to create subcategory');
    } catch (error: any) {
      console.error('[Categories] Create subcategory error:', error.message);
      throw new Error(error.message || 'Failed to create subcategory');
    }
  }

  /**
   * Update a subcategory
   */
  async updateSubcategory(parentId: string, subId: string, data: any): Promise<{ subcategory: any }> {
    try {
      console.log('[Categories] Updating subcategory:', subId);
      const response = await apiClient.put<any>(`admin/categories/${parentId}/subcategories/${subId}`, data);
      if (response.success && response.data) {
        return { subcategory: response.data.subcategory || response.data };
      }
      throw new Error(response.message || 'Failed to update subcategory');
    } catch (error: any) {
      console.error('[Categories] Update subcategory error:', error.message);
      throw new Error(error.message || 'Failed to update subcategory');
    }
  }

  /**
   * Delete a subcategory (blocked if stores exist)
   */
  async deleteSubcategory(parentId: string, subId: string): Promise<void> {
    try {
      console.log('[Categories] Deleting subcategory:', subId);
      const response = await apiClient.delete<any>(`admin/categories/${parentId}/subcategories/${subId}`);
      if (response.success) {
        console.log('[Categories] Subcategory deleted');
        return;
      }
      throw new Error(response.message || 'Failed to delete subcategory');
    } catch (error: any) {
      console.error('[Categories] Delete subcategory error:', error.message);
      throw new Error(error.message || 'Failed to delete subcategory');
    }
  }

  /**
   * Reorder subcategories
   */
  async reorderSubcategories(parentId: string, orderedIds: string[]): Promise<void> {
    try {
      console.log('[Categories] Reordering subcategories for:', parentId);
      const response = await apiClient.post<any>(`admin/categories/${parentId}/subcategories/reorder`, { orderedIds });
      if (response.success) {
        console.log('[Categories] Subcategories reordered');
        return;
      }
      throw new Error(response.message || 'Failed to reorder subcategories');
    } catch (error: any) {
      console.error('[Categories] Reorder subcategories error:', error.message);
      throw new Error(error.message || 'Failed to reorder subcategories');
    }
  }

  /**
   * Update sort/filter/display options for a category
   */
  async updateSortFilterOptions(id: string, data: {
    sortOptions?: PageConfig['sortOptions'];
    filterOptions?: PageConfig['filterOptions'];
    storeDisplayConfig?: PageConfig['storeDisplayConfig'];
    trustBadges?: PageConfig['trustBadges'];
    loyaltyConfig?: PageConfig['loyaltyConfig'];
    experienceBenefits?: PageConfig['experienceBenefits'];
  }): Promise<any> {
    try {
      console.log('[Categories] Updating sort/filter options for:', id);
      const response = await apiClient.patch<any>(`admin/categories/${id}/sort-filter-options`, data);
      if (response.success) {
        console.log('[Categories] Sort/filter options updated');
        return response.data;
      }
      throw new Error(response.message || 'Failed to update sort/filter options');
    } catch (error: any) {
      console.error('[Categories] Update sort/filter options error:', error.message);
      throw new Error(error.message || 'Failed to update sort/filter options');
    }
  }

  /**
   * Toggle category active status
   */
  async toggleCategory(id: string): Promise<{ isActive: boolean }> {
    try {
      console.log('[Categories] Toggling category:', id);
      const response = await apiClient.patch<{ isActive: boolean }>(`admin/categories/${id}/toggle`);

      if (response.success && response.data) {
        console.log('[Categories] Category toggled, isActive:', response.data.isActive);
        return response.data;
      }

      throw new Error(response.message || 'Failed to toggle category');
    } catch (error: any) {
      console.error('[Categories] Toggle category error:', error.message);
      throw new Error(error.message || 'Failed to toggle category');
    }
  }
}

export const categoriesService = new CategoriesService();
export default categoriesService;
