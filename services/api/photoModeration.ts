import { apiClient } from './apiClient';

export interface PhotoUploadItem {
  _id: string;
  user: {
    _id: string;
    firstName?: string;
    lastName?: string;
    profilePicture?: string;
  };
  store?: {
    _id: string;
    name: string;
    logo?: string;
  };
  photos: Array<{
    url: string;
    publicId: string;
    width?: number;
    height?: number;
    fileSize?: number;
  }>;
  caption?: string;
  contentType: string;
  moderationStatus: 'pending' | 'approved' | 'rejected';
  moderatedBy?: string;
  moderationNotes?: string;
  qualityScore?: number;
  coinsAwarded?: number;
  createdAt: string;
}

export interface PhotoModerationListResponse {
  photos: PhotoUploadItem[];
  pagination: {
    current: number;
    pages: number;
    total: number;
    hasMore: boolean;
  };
}

class PhotoModerationService {
  async getPendingPhotos(
    page: number = 1,
    limit: number = 20
  ): Promise<PhotoModerationListResponse> {
    try {
      const response = await apiClient.get<any>(`photos/pending?page=${page}&limit=${limit}`);

      if (response.success) {
        const nested = response.data as any;
        return {
          photos: nested?.photos || [],
          pagination: nested?.pagination || { current: page, pages: 0, total: 0, hasMore: false },
        };
      }
      throw new Error(response.message || 'Failed to fetch pending photos');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch pending photos');
    }
  }

  async moderatePhoto(
    photoId: string,
    action: 'approve' | 'reject',
    notes?: string,
    qualityScore?: number
  ): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiClient.patch<any>(`photos/${photoId}/moderate`, {
        action,
        notes,
        qualityScore,
      });

      return {
        success: response.success,
        message: response.message || `Photo ${action}d successfully`,
      };
    } catch (error: any) {
      throw new Error(error.message || `Failed to ${action} photo`);
    }
  }
}

export const photoModerationService = new PhotoModerationService();
export default photoModerationService;
