import { apiClient } from './apiClient';

// ============================================
// TYPES
// ============================================

export interface QuickActionAdmin {
  _id: string;
  slug: string;
  title: string;
  subtitle: string;
  icon: string;
  iconColor: string;
  deepLinkPath: string;
  targetAchievementTypes: string[];
  priority: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface QuickActionsListResponse {
  quickActions: QuickActionAdmin[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface QuickActionsQuery {
  page?: number;
  limit?: number;
  isActive?: boolean;
  search?: string;
}

// ============================================
// SERVICE
// ============================================

class QuickActionsService {
  /**
   * Get quick actions with pagination and filters
   */
  async getAll(query: QuickActionsQuery = {}): Promise<QuickActionsListResponse> {
    try {
      console.log('[QuickActions] Fetching quick actions with query:', query);

      const params = new URLSearchParams();
      if (query.page) params.append('page', query.page.toString());
      if (query.limit) params.append('limit', query.limit.toString());
      if (query.isActive !== undefined) params.append('isActive', query.isActive.toString());
      if (query.search) params.append('search', query.search);

      const endpoint = `admin/quick-actions${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await apiClient.get<QuickActionsListResponse>(endpoint);

      if (response.success && response.data) {
        console.log('[QuickActions] Fetched successfully:', response.data.quickActions?.length || 0, 'actions');
        return response.data;
      }

      throw new Error(response.message || 'Failed to fetch quick actions');
    } catch (error: any) {
      console.error('[QuickActions] Get all error:', error.message);
      throw new Error(error.message || 'Failed to fetch quick actions');
    }
  }

  /**
   * Get a single quick action by ID
   */
  async getById(id: string): Promise<QuickActionAdmin> {
    try {
      console.log('[QuickActions] Fetching quick action:', id);
      const response = await apiClient.get<QuickActionAdmin>(`admin/quick-actions/${id}`);

      if (response.success && response.data) {
        console.log('[QuickActions] Action fetched:', response.data.slug);
        return response.data;
      }

      throw new Error(response.message || 'Failed to fetch quick action');
    } catch (error: any) {
      console.error('[QuickActions] Get by ID error:', error.message);
      throw new Error(error.message || 'Failed to fetch quick action');
    }
  }

  /**
   * Create a new quick action
   */
  async create(data: Partial<QuickActionAdmin>): Promise<QuickActionAdmin> {
    try {
      console.log('[QuickActions] Creating quick action:', data.title);
      const response = await apiClient.post<QuickActionAdmin>('admin/quick-actions', data);

      if (response.success && response.data) {
        console.log('[QuickActions] Action created:', response.data.slug);
        return response.data;
      }

      throw new Error(response.message || 'Failed to create quick action');
    } catch (error: any) {
      console.error('[QuickActions] Create error:', error.message);
      throw new Error(error.message || 'Failed to create quick action');
    }
  }

  /**
   * Update an existing quick action
   */
  async update(id: string, data: Partial<QuickActionAdmin>): Promise<QuickActionAdmin> {
    try {
      console.log('[QuickActions] Updating quick action:', id);
      const response = await apiClient.put<QuickActionAdmin>(`admin/quick-actions/${id}`, data);

      if (response.success && response.data) {
        console.log('[QuickActions] Action updated:', response.data.slug);
        return response.data;
      }

      throw new Error(response.message || 'Failed to update quick action');
    } catch (error: any) {
      console.error('[QuickActions] Update error:', error.message);
      throw new Error(error.message || 'Failed to update quick action');
    }
  }

  /**
   * Delete a quick action
   */
  async remove(id: string): Promise<void> {
    try {
      console.log('[QuickActions] Deleting quick action:', id);
      const response = await apiClient.delete(`admin/quick-actions/${id}`);

      if (response.success) {
        console.log('[QuickActions] Action deleted');
        return;
      }

      throw new Error(response.message || 'Failed to delete quick action');
    } catch (error: any) {
      console.error('[QuickActions] Delete error:', error.message);
      throw new Error(error.message || 'Failed to delete quick action');
    }
  }

  /**
   * Toggle quick action active status
   */
  async toggleActive(id: string): Promise<QuickActionAdmin> {
    try {
      console.log('[QuickActions] Toggling active status for action:', id);
      const response = await apiClient.patch<QuickActionAdmin>(`admin/quick-actions/${id}/toggle-active`);

      if (response.success && response.data) {
        console.log('[QuickActions] Active toggled, now:', response.data.isActive);
        return response.data;
      }

      throw new Error(response.message || 'Failed to toggle quick action status');
    } catch (error: any) {
      console.error('[QuickActions] Toggle active error:', error.message);
      throw new Error(error.message || 'Failed to toggle quick action status');
    }
  }

  /**
   * Reorder quick actions by sending ordered IDs
   */
  async reorder(orderedIds: string[]): Promise<void> {
    try {
      console.log('[QuickActions] Reordering quick actions:', orderedIds.length, 'items');
      const response = await apiClient.post('admin/quick-actions/reorder', { orderedIds });

      if (response.success) {
        console.log('[QuickActions] Reorder successful');
        return;
      }

      throw new Error(response.message || 'Failed to reorder quick actions');
    } catch (error: any) {
      console.error('[QuickActions] Reorder error:', error.message);
      throw new Error(error.message || 'Failed to reorder quick actions');
    }
  }
}

export const quickActionsService = new QuickActionsService();
export default quickActionsService;
