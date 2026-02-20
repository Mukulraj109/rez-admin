import { apiClient } from './apiClient';

export interface LearningContentAdmin {
  _id: string;
  slug: string;
  title: string;
  category: 'coin-system' | 'earning-tips' | 'platform-guide' | 'coin-types';
  contentType: 'article' | 'video';
  body: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  coinReward: number;
  estimatedMinutes: number;
  sortOrder: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LearningContentQuery {
  page?: number;
  limit?: number;
  category?: string;
  contentType?: string;
  isPublished?: boolean;
}

export interface LearningContentListResponse {
  items: LearningContentAdmin[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

class LearningContentService {
  async getAll(query: LearningContentQuery = {}): Promise<LearningContentListResponse> {
    try {
      console.log('[LearningContent] Fetching with query:', query);

      const params = new URLSearchParams();
      if (query.page) params.append('page', query.page.toString());
      if (query.limit) params.append('limit', query.limit.toString());
      if (query.category) params.append('category', query.category);
      if (query.contentType) params.append('contentType', query.contentType);
      if (query.isPublished !== undefined) params.append('isPublished', String(query.isPublished));

      const endpoint = `admin/learning-content${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await apiClient.get<LearningContentListResponse>(endpoint);

      if (response.success && response.data) {
        console.log('[LearningContent] Fetched:', response.data.items?.length, 'items');
        return response.data;
      }

      throw new Error(response.message || 'Failed to fetch learning content');
    } catch (error: any) {
      console.error('[LearningContent] List error:', error.message);
      throw new Error(error.message || 'Failed to fetch learning content');
    }
  }

  async getById(id: string): Promise<LearningContentAdmin> {
    try {
      const response = await apiClient.get<{ item: LearningContentAdmin }>(`admin/learning-content/${id}`);

      if (response.success && response.data?.item) {
        return response.data.item;
      }

      throw new Error(response.message || 'Learning content not found');
    } catch (error: any) {
      console.error('[LearningContent] Get error:', error.message);
      throw new Error(error.message || 'Failed to fetch learning content');
    }
  }

  async create(data: Partial<LearningContentAdmin>): Promise<LearningContentAdmin> {
    try {
      console.log('[LearningContent] Creating:', data.title);
      const response = await apiClient.post<{ item: LearningContentAdmin }>('admin/learning-content', data);

      if (response.success && response.data?.item) {
        console.log('[LearningContent] Created:', response.data.item._id);
        return response.data.item;
      }

      throw new Error(response.message || 'Failed to create learning content');
    } catch (error: any) {
      console.error('[LearningContent] Create error:', error.message);
      throw new Error(error.message || 'Failed to create learning content');
    }
  }

  async update(id: string, data: Partial<LearningContentAdmin>): Promise<LearningContentAdmin> {
    try {
      console.log('[LearningContent] Updating:', id);
      const response = await apiClient.put<{ item: LearningContentAdmin }>(`admin/learning-content/${id}`, data);

      if (response.success && response.data?.item) {
        console.log('[LearningContent] Updated:', id);
        return response.data.item;
      }

      throw new Error(response.message || 'Failed to update learning content');
    } catch (error: any) {
      console.error('[LearningContent] Update error:', error.message);
      throw new Error(error.message || 'Failed to update learning content');
    }
  }

  async togglePublished(id: string): Promise<LearningContentAdmin> {
    try {
      console.log('[LearningContent] Toggling published:', id);
      const response = await apiClient.patch<{ item: LearningContentAdmin }>(`admin/learning-content/${id}/toggle`);

      if (response.success && response.data?.item) {
        return response.data.item;
      }

      throw new Error(response.message || 'Failed to toggle publish status');
    } catch (error: any) {
      console.error('[LearningContent] Toggle error:', error.message);
      throw new Error(error.message || 'Failed to toggle publish status');
    }
  }

  async delete(id: string): Promise<void> {
    try {
      console.log('[LearningContent] Deleting:', id);
      const response = await apiClient.delete(`admin/learning-content/${id}`);

      if (!response.success) {
        throw new Error(response.message || 'Failed to delete learning content');
      }

      console.log('[LearningContent] Deleted:', id);
    } catch (error: any) {
      console.error('[LearningContent] Delete error:', error.message);
      throw new Error(error.message || 'Failed to delete learning content');
    }
  }
}

export const learningContentService = new LearningContentService();
export default learningContentService;
