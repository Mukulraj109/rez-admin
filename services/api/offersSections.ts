import { apiClient } from './apiClient';

// ============================================
// INTERFACES
// ============================================

export interface OffersSectionConfig {
  _id: string;
  sectionKey: string;
  displayName: string;
  tab: 'offers' | 'cashback' | 'exclusive';
  isEnabled: boolean;
  sortOrder: number;
  maxItems: number;
  regions: string[];
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateSectionRequest {
  isEnabled?: boolean;
  sortOrder?: number;
  maxItems?: number;
  regions?: string[];
  displayName?: string;
}

export interface SeedResult {
  sectionKey: string;
  action: 'created' | 'exists';
}

// ============================================
// OFFERS SECTIONS CONFIG SERVICE
// ============================================

class OffersSectionsService {
  private baseUrl = 'admin/offers-sections';

  /**
   * Get all section configurations
   */
  async getSections(): Promise<OffersSectionConfig[]> {
    try {
      const response = await apiClient.get<{ success: boolean; data: OffersSectionConfig[] }>(
        this.baseUrl
      );

      if (response.success && response.data) {
        return response.data;
      }

      throw new Error('Failed to fetch section configs');
    } catch (error: any) {
      console.error('[OffersSections] Get sections error:', error.message);
      throw error;
    }
  }

  /**
   * Update a section's configuration
   */
  async updateSection(sectionKey: string, data: UpdateSectionRequest): Promise<OffersSectionConfig> {
    try {
      const response = await apiClient.put<{ success: boolean; data: OffersSectionConfig }>(
        `${this.baseUrl}/${sectionKey}`,
        data
      );

      if (response.success && response.data) {
        return response.data;
      }

      throw new Error('Failed to update section config');
    } catch (error: any) {
      console.error('[OffersSections] Update section error:', error.message);
      throw error;
    }
  }

  /**
   * Seed default configurations for all sections
   */
  async seedDefaults(): Promise<SeedResult[]> {
    try {
      const response = await apiClient.post<{ success: boolean; data: SeedResult[] }>(
        `${this.baseUrl}/seed`
      );

      if (response.success && response.data) {
        return response.data;
      }

      throw new Error('Failed to seed section configs');
    } catch (error: any) {
      console.error('[OffersSections] Seed error:', error.message);
      throw error;
    }
  }

  /**
   * Toggle section visibility
   */
  async toggleSection(sectionKey: string, isEnabled: boolean): Promise<OffersSectionConfig> {
    return this.updateSection(sectionKey, { isEnabled });
  }

  /**
   * Update section sort order
   */
  async updateSortOrder(sectionKey: string, sortOrder: number): Promise<OffersSectionConfig> {
    return this.updateSection(sectionKey, { sortOrder });
  }

  /**
   * Update section max items limit
   */
  async updateMaxItems(sectionKey: string, maxItems: number): Promise<OffersSectionConfig> {
    return this.updateSection(sectionKey, { maxItems });
  }
}

export const offersSectionsService = new OffersSectionsService();
export default offersSectionsService;
