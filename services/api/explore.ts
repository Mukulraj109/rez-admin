import apiClient from './apiClient';

// Types
export interface Video {
  id: string;
  title: string;
  description?: string;
  thumbnail?: string;
  videoUrl: string;
  duration?: number;
  contentType: 'merchant' | 'ugc' | 'article_video';
  category?: string;
  creator?: {
    id: string;
    name: string;
    avatar?: string;
  };
  stores?: Array<{
    _id: string;
    name: string;
    logo?: string;
  }>;
  isPublished: boolean;
  isFeatured: boolean;
  isTrending: boolean;
  moderationStatus: 'pending' | 'approved' | 'rejected' | 'flagged';
  analytics: {
    views: number;
    likes: number;
    comments: number;
    shares: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface VideoStats {
  total: number;
  published: number;
  featured: number;
  trending: number;
  pending: number;
  totalViews: number;
}

export interface ExploreStats {
  reviews: {
    total: number;
    featured: number;
    verified: number;
  };
  comparisons: {
    total: number;
    featured: number;
  };
  deals: {
    active: number;
  };
  stores: {
    total: number;
  };
  activity: {
    today: number;
  };
}

export interface CreateVideoParams {
  title: string;
  description?: string;
  videoUrl: string;
  thumbnail?: string;
  duration?: number;
  contentType?: 'merchant' | 'ugc' | 'article_video';
  category?: string;
  tags?: string[];
  storeIds?: string[];
  productIds?: string[];
  isPublished?: boolean;
  isFeatured?: boolean;
  isTrending?: boolean;
}

export interface UpdateVideoParams {
  title?: string;
  description?: string;
  videoUrl?: string;
  thumbnail?: string;
  duration?: number;
  contentType?: 'merchant' | 'ugc' | 'article_video';
  category?: string;
  tags?: string[];
  storeIds?: string[];
  productIds?: string[];
  isPublished?: boolean;
  isFeatured?: boolean;
  isTrending?: boolean;
  moderationStatus?: 'pending' | 'approved' | 'rejected' | 'flagged';
}

export interface VideosResponse {
  videos: Video[];
  pagination: {
    current: number;
    pages: number;
    total: number;
    limit: number;
  };
}

// Explore Admin Service
export const exploreService = {
  // Get dashboard stats
  async getStats(): Promise<ExploreStats> {
    const response = await apiClient.get<ExploreStats>('/admin/explore/stats');
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to fetch stats');
    }
    return response.data;
  },

  // =====================================================
  // VIDEO MANAGEMENT
  // =====================================================

  // Get video stats
  async getVideoStats(): Promise<VideoStats> {
    const response = await apiClient.get<VideoStats>('/admin/explore/videos/stats');
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to fetch video stats');
    }
    return response.data;
  },

  // Get all videos with filters
  async getVideos(
    page: number = 1,
    limit: number = 20,
    status?: string,
    contentType?: string,
    featured?: boolean,
    trending?: boolean,
    search?: string
  ): Promise<VideosResponse> {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    if (status) params.append('status', status);
    if (contentType) params.append('contentType', contentType);
    if (featured !== undefined) params.append('featured', featured.toString());
    if (trending !== undefined) params.append('trending', trending.toString());
    if (search) params.append('search', search);

    const response = await apiClient.get<VideosResponse>(`/admin/explore/videos?${params.toString()}`);
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to fetch videos');
    }
    return response.data;
  },

  // Get single video
  async getVideo(videoId: string): Promise<Video> {
    const response = await apiClient.get<{ video: Video }>(`/admin/explore/videos/${videoId}`);
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to fetch video');
    }
    return response.data.video;
  },

  // Create new video
  async createVideo(params: CreateVideoParams): Promise<Video> {
    const response = await apiClient.post<{ video: Video }>('/admin/explore/videos', params);
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to create video');
    }
    return response.data.video;
  },

  // Update video
  async updateVideo(videoId: string, params: UpdateVideoParams): Promise<Video> {
    const response = await apiClient.put<{ video: Video }>(`/admin/explore/videos/${videoId}`, params);
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to update video');
    }
    return response.data.video;
  },

  // Delete video
  async deleteVideo(videoId: string): Promise<void> {
    const response = await apiClient.delete(`/admin/explore/videos/${videoId}`);
    if (!response.success) {
      throw new Error(response.message || 'Failed to delete video');
    }
  },

  // Toggle video featured status
  async toggleFeatured(videoId: string, featured?: boolean): Promise<{ isFeatured: boolean }> {
    const response = await apiClient.put<{ video: { id: string; isFeatured: boolean } }>(
      `/admin/explore/videos/${videoId}/feature`,
      { featured }
    );
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to toggle featured status');
    }
    return { isFeatured: response.data.video.isFeatured };
  },

  // Toggle video trending status
  async toggleTrending(videoId: string, trending?: boolean): Promise<{ isTrending: boolean }> {
    const response = await apiClient.put<{ video: { id: string; isTrending: boolean } }>(
      `/admin/explore/videos/${videoId}/trending`,
      { trending }
    );
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to toggle trending status');
    }
    return { isTrending: response.data.video.isTrending };
  },

  // Toggle video publish status
  async togglePublished(videoId: string, published?: boolean): Promise<{ isPublished: boolean }> {
    const response = await apiClient.put<{ video: { id: string; isPublished: boolean } }>(
      `/admin/explore/videos/${videoId}/publish`,
      { published }
    );
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to toggle publish status');
    }
    return { isPublished: response.data.video.isPublished };
  },

  // Bulk update videos
  async bulkUpdate(
    videoIds: string[],
    action: 'publish' | 'unpublish' | 'feature' | 'unfeature' | 'trending' | 'untrending' | 'approve' | 'reject'
  ): Promise<{ modifiedCount: number }> {
    const response = await apiClient.post<{ modifiedCount: number }>(
      '/admin/explore/videos/bulk-update',
      { videoIds, action }
    );
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to bulk update videos');
    }
    return response.data;
  },

  // =====================================================
  // REVIEWS MANAGEMENT
  // =====================================================

  // Get featured reviews
  async getFeaturedReviews(page: number = 1, limit: number = 20) {
    const response = await apiClient.get(`/admin/explore/featured-reviews?page=${page}&limit=${limit}`);
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to fetch featured reviews');
    }
    return response.data;
  },

  // Get eligible reviews for featuring
  async getEligibleReviews(page: number = 1, limit: number = 20, minRating: number = 4) {
    const response = await apiClient.get(
      `/admin/explore/eligible-reviews?page=${page}&limit=${limit}&minRating=${minRating}`
    );
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to fetch eligible reviews');
    }
    return response.data;
  },

  // Toggle review featured status
  async toggleReviewFeatured(reviewId: string, featured?: boolean) {
    const response = await apiClient.put(`/admin/explore/reviews/${reviewId}/feature`, { featured });
    if (!response.success) {
      throw new Error(response.message || 'Failed to toggle review featured status');
    }
    return response.data;
  },

  // Bulk feature/unfeature reviews
  async bulkToggleReviews(reviewIds: string[], featured: boolean) {
    const response = await apiClient.post('/admin/explore/reviews/bulk-feature', {
      reviewIds,
      featured
    });
    if (!response.success) {
      throw new Error(response.message || 'Failed to bulk update reviews');
    }
    return response.data;
  },

  // =====================================================
  // COMPARISONS MANAGEMENT
  // =====================================================

  // Get featured comparisons
  async getFeaturedComparisons(page: number = 1, limit: number = 20) {
    const response = await apiClient.get(`/admin/explore/featured-comparisons?page=${page}&limit=${limit}`);
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to fetch featured comparisons');
    }
    return response.data;
  },

  // Toggle comparison featured status
  async toggleComparisonFeatured(comparisonId: string, featured?: boolean) {
    const response = await apiClient.put(`/admin/explore/comparisons/${comparisonId}/feature`, { featured });
    if (!response.success) {
      throw new Error(response.message || 'Failed to toggle comparison featured status');
    }
    return response.data;
  }
};

export default exploreService;
