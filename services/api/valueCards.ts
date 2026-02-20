import { apiClient } from './apiClient';

// ============================================
// TYPES
// ============================================

export interface ValueCardAdmin {
  _id: string;
  title: string;
  subtitle: string;
  emoji: string;
  deepLinkPath: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ValueCardsListResponse {
  valueCards: ValueCardAdmin[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface ValueCardsQuery {
  page?: number;
  limit?: number;
  isActive?: boolean;
  search?: string;
}

// ============================================
// SERVICE
// ============================================

class ValueCardsService {
  /**
   * Get value cards with pagination and filters
   */
  async getAll(query: ValueCardsQuery = {}): Promise<ValueCardsListResponse> {
    try {
      console.log('[ValueCards] Fetching value cards with query:', query);

      const params = new URLSearchParams();
      if (query.page) params.append('page', query.page.toString());
      if (query.limit) params.append('limit', query.limit.toString());
      if (query.isActive !== undefined) params.append('isActive', query.isActive.toString());
      if (query.search) params.append('search', query.search);

      const endpoint = `admin/value-cards${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await apiClient.get<ValueCardsListResponse>(endpoint);

      if (response.success && response.data) {
        console.log('[ValueCards] Fetched successfully:', response.data.valueCards?.length || 0, 'cards');
        return response.data;
      }

      throw new Error(response.message || 'Failed to fetch value cards');
    } catch (error: any) {
      console.error('[ValueCards] Get all error:', error.message);
      throw new Error(error.message || 'Failed to fetch value cards');
    }
  }

  /**
   * Get a single value card by ID
   */
  async getById(id: string): Promise<ValueCardAdmin> {
    try {
      console.log('[ValueCards] Fetching value card:', id);
      const response = await apiClient.get<ValueCardAdmin>(`admin/value-cards/${id}`);

      if (response.success && response.data) {
        console.log('[ValueCards] Card fetched:', response.data.title);
        return response.data;
      }

      throw new Error(response.message || 'Failed to fetch value card');
    } catch (error: any) {
      console.error('[ValueCards] Get by ID error:', error.message);
      throw new Error(error.message || 'Failed to fetch value card');
    }
  }

  /**
   * Create a new value card
   */
  async create(data: Partial<ValueCardAdmin>): Promise<ValueCardAdmin> {
    try {
      console.log('[ValueCards] Creating value card:', data.title);
      const response = await apiClient.post<ValueCardAdmin>('admin/value-cards', data);

      if (response.success && response.data) {
        console.log('[ValueCards] Card created:', response.data.title);
        return response.data;
      }

      throw new Error(response.message || 'Failed to create value card');
    } catch (error: any) {
      console.error('[ValueCards] Create error:', error.message);
      throw new Error(error.message || 'Failed to create value card');
    }
  }

  /**
   * Update an existing value card
   */
  async update(id: string, data: Partial<ValueCardAdmin>): Promise<ValueCardAdmin> {
    try {
      console.log('[ValueCards] Updating value card:', id);
      const response = await apiClient.put<ValueCardAdmin>(`admin/value-cards/${id}`, data);

      if (response.success && response.data) {
        console.log('[ValueCards] Card updated:', response.data.title);
        return response.data;
      }

      throw new Error(response.message || 'Failed to update value card');
    } catch (error: any) {
      console.error('[ValueCards] Update error:', error.message);
      throw new Error(error.message || 'Failed to update value card');
    }
  }

  /**
   * Delete a value card
   */
  async remove(id: string): Promise<void> {
    try {
      console.log('[ValueCards] Deleting value card:', id);
      const response = await apiClient.delete(`admin/value-cards/${id}`);

      if (response.success) {
        console.log('[ValueCards] Card deleted');
        return;
      }

      throw new Error(response.message || 'Failed to delete value card');
    } catch (error: any) {
      console.error('[ValueCards] Delete error:', error.message);
      throw new Error(error.message || 'Failed to delete value card');
    }
  }

  /**
   * Toggle value card active status
   */
  async toggleActive(id: string): Promise<ValueCardAdmin> {
    try {
      console.log('[ValueCards] Toggling active status for card:', id);
      const response = await apiClient.patch<ValueCardAdmin>(`admin/value-cards/${id}/toggle-active`);

      if (response.success && response.data) {
        console.log('[ValueCards] Active toggled, now:', response.data.isActive);
        return response.data;
      }

      throw new Error(response.message || 'Failed to toggle value card status');
    } catch (error: any) {
      console.error('[ValueCards] Toggle active error:', error.message);
      throw new Error(error.message || 'Failed to toggle value card status');
    }
  }
}

export const valueCardsService = new ValueCardsService();
export default valueCardsService;
