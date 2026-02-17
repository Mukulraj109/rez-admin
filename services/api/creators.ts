import apiClient from './apiClient';

// Types
export interface AdminCreator {
  id: string;
  userId: string;
  displayName: string;
  bio: string;
  avatar?: string;
  category: string;
  tags: string[];
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  tier: string;
  isVerified: boolean;
  isFeatured: boolean;
  featuredOrder?: number;
  stats: {
    totalPicks: number;
    totalViews: number;
    totalLikes: number;
    totalConversions: number;
    totalEarnings: number;
    totalFollowers: number;
    engagementRate: number;
  };
  commissionRate?: number;
  applicationDate: string;
  approvedDate?: string;
  rejectionReason?: string;
  suspensionReason?: string;
  socialLinks?: { platform: string; url: string }[];
  createdAt: string;
}

export interface AdminPick {
  id: string;
  title: string;
  productImage: string;
  productPrice: number;
  productBrand: string;
  creatorName: string;
  creatorId: string;
  status: string;
  moderationStatus: string;
  isPublished: boolean;
  views: number;
  likes: number;
  clicks: number;
  purchases: number;
  trendingScore: number;
  createdAt: string;
}

export interface AdminConversion {
  id: string;
  pickTitle: string;
  creatorName: string;
  buyerName: string;
  purchaseAmount: number;
  commissionAmount: number;
  status: string;
  createdAt: string;
}

export interface CreatorProgramStats {
  totalCreators: number;
  approvedCreators: number;
  pendingApplications: number;
  suspendedCreators: number;
  rejectedCreators: number;
  totalPicks: number;
  pendingPicks: number;
  merchantPendingPicks: number;
  totalConversions: number;
  totalCommissionPaid: number;
  creatorsByTier?: Record<string, number>;
}

export interface CreatorProgramConfig {
  enabled: boolean;
  defaultCommissionRate: number;
  tierRates: Record<string, number>;
  minPicksForTier: Record<string, number>;
  coinsPerConversion: number;
  maxDailyEarnings: number;
  pendingPeriodDays: number;
  attributionWindowHours: number;
  autoApproveCreators: boolean;
  minFollowersToApply: number;
  minVideosToApply: number;
  featuredCreatorLimit: number;
  trendingPickLimit: number;
  trendingAlgorithm: string;
}

// API Functions

export async function getCreatorApplications(params: {
  status?: string;
  page?: number;
  limit?: number;
  search?: string;
} = {}) {
  // Build query string manually since apiClient.get doesn't support params
  const queryParts: string[] = [];
  if (params.status) queryParts.push(`status=${encodeURIComponent(params.status)}`);
  if (params.page) queryParts.push(`page=${params.page}`);
  if (params.limit) queryParts.push(`limit=${params.limit}`);
  if (params.search) queryParts.push(`search=${encodeURIComponent(params.search)}`);
  const qs = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
  return apiClient.get(`/admin/creators${qs}`);
}

export async function approveCreator(id: string) {
  return apiClient.patch(`/admin/creators/${id}/approve`);
}

export async function rejectCreator(id: string, reason: string) {
  return apiClient.patch(`/admin/creators/${id}/reject`, { reason });
}

export async function toggleFeatured(id: string) {
  return apiClient.patch(`/admin/creators/${id}/feature`);
}

export async function updateCreatorTier(id: string, tier: string) {
  return apiClient.patch(`/admin/creators/${id}/tier`, { tier });
}

export async function suspendCreator(id: string, reason: string) {
  return apiClient.patch(`/admin/creators/${id}/suspend`, { reason });
}

export async function unsuspendCreator(id: string) {
  return apiClient.patch(`/admin/creators/${id}/unsuspend`);
}

export async function getCreatorProgramStats() {
  return apiClient.get('/admin/creators/stats');
}

export async function getCreatorConfig() {
  return apiClient.get('/admin/creators/config');
}

export async function updateCreatorConfig(config: Partial<CreatorProgramConfig>) {
  return apiClient.put('/admin/creators/config', config);
}

export async function getAdminPicks(params: {
  status?: string;
  page?: number;
  limit?: number;
} = {}) {
  const queryParts: string[] = [];
  if (params.status) queryParts.push(`status=${encodeURIComponent(params.status)}`);
  if (params.page) queryParts.push(`page=${params.page}`);
  if (params.limit) queryParts.push(`limit=${params.limit}`);
  const qs = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
  return apiClient.get(`/admin/creators/picks${qs}`);
}

export async function moderatePick(pickId: string, action: 'approve' | 'reject', reason?: string) {
  return apiClient.patch(`/admin/creators/picks/${pickId}/moderate`, { action, reason });
}

export async function getAdminConversions(params: {
  status?: string;
  page?: number;
  limit?: number;
} = {}) {
  const queryParts: string[] = [];
  if (params.status) queryParts.push(`status=${encodeURIComponent(params.status)}`);
  if (params.page) queryParts.push(`page=${params.page}`);
  if (params.limit) queryParts.push(`limit=${params.limit}`);
  const qs = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
  return apiClient.get(`/admin/creators/conversions${qs}`);
}
