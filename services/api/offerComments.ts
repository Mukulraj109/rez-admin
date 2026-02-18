import { apiClient } from './apiClient';

export interface PendingComment {
  id: string;
  text: string;
  qualityScore: number;
  user: {
    id: string;
    name: string;
    avatar?: string;
  } | null;
  offer: {
    id: string;
    title: string;
  } | null;
  createdAt: string;
}

export interface CommentModerationListResponse {
  comments: PendingComment[];
  pagination: {
    current: number;
    pages: number;
    total: number;
    hasMore: boolean;
  };
}

class OfferCommentsService {
  async getPendingComments(
    page: number = 1,
    limit: number = 20
  ): Promise<CommentModerationListResponse> {
    try {
      const response = await apiClient.get<any>(
        `offers/comments/pending?page=${page}&limit=${limit}`
      );

      if (response.success) {
        const nested = response.data as any;
        return {
          comments: nested?.comments || [],
          pagination: nested?.pagination || { current: page, pages: 0, total: 0, hasMore: false },
        };
      }
      throw new Error(response.message || 'Failed to fetch pending comments');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch pending comments');
    }
  }

  async moderateComment(
    commentId: string,
    action: 'approve' | 'reject',
    notes?: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiClient.patch<any>(
        `offers/comments/${commentId}/moderate`,
        { action, notes }
      );

      return {
        success: response.success,
        message: response.message || `Comment ${action}d successfully`,
      };
    } catch (error: any) {
      throw new Error(error.message || `Failed to ${action} comment`);
    }
  }
}

export const offerCommentsService = new OfferCommentsService();
export default offerCommentsService;
