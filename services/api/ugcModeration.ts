import { apiClient } from './apiClient';

export interface UgcReel {
  _id: string;
  title: string;
  description?: string;
  videoUrl: string;
  thumbnail?: string;
  processing?: {
    thumbnailUrl?: string;
    processedUrl?: string;
  };
  creator: {
    _id: string;
    profile?: {
      firstName?: string;
      lastName?: string;
      avatar?: string;
    };
  };
  stores?: Array<{
    _id: string;
    name: string;
    logo?: string;
  }>;
  metadata?: {
    duration?: number;
  };
  moderationStatus: 'pending' | 'approved' | 'rejected';
  moderationReasons?: string[];
  isPublished: boolean;
  createdAt: string;
}

export interface UgcReelListResponse {
  reels: UgcReel[];
  pagination: {
    current: number;
    pages: number;
    total: number;
    hasMore: boolean;
  };
}

class UgcModerationService {
  async getPendingReels(
    page: number = 1,
    limit: number = 20
  ): Promise<UgcReelListResponse> {
    try {
      const response = await apiClient.get<any>(
        `ugc/pending?page=${page}&limit=${limit}`
      );

      if (response.success) {
        const nested = response.data as any;
        return {
          reels: nested?.reels || [],
          pagination: nested?.pagination || { current: page, pages: 0, total: 0, hasMore: false },
        };
      }
      throw new Error(response.message || 'Failed to fetch pending reels');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch pending reels');
    }
  }

  async moderateReel(
    reelId: string,
    action: 'approve' | 'reject',
    notes?: string,
    qualityScore?: number
  ): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiClient.patch<any>(`ugc/${reelId}/moderate`, {
        action,
        notes,
        qualityScore,
      });

      return {
        success: response.success,
        message: response.message || `Reel ${action}d successfully`,
      };
    } catch (error: any) {
      throw new Error(error.message || `Failed to ${action} reel`);
    }
  }
}

export const ugcModerationService = new UgcModerationService();
export default ugcModerationService;
