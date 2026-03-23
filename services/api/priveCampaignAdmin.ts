import { apiClient } from './apiClient';

export interface SubmissionItem {
  _id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  userFollowers: number;
  campaignId: string;
  campaignTitle: string;
  merchantName: string;
  postUrl: string;
  postScreenshotUrl: string;
  submittedAt: string;
  status: string;
  estimatedCashback: number;
  fraudScore: number;
  autoFlags: string[];
}

export interface SubmissionStats {
  pending: number;
  approvedToday: number;
  rejectedToday: number;
  totalPendingCashback: number;
}

export interface SubmissionsResponse {
  submissions: SubmissionItem[];
  stats: SubmissionStats;
  pagination: { page: number; limit: number; total: number; hasMore: boolean };
}

export interface CampaignItem {
  _id: string;
  title: string;
  merchantName: string;
  merchantLogo: string;
  status: string;
  slots: number;
  slotsUsed: number;
  budget: number;
  budgetUsed: number;
  validFrom: string;
  validTo: string;
  minPriveTier: string;
  createdAt: string;
}

class PriveCampaignAdminApi {
  async getSubmissions(params?: {
    status?: string;
    campaignId?: string;
    page?: number;
    limit?: number;
  }): Promise<SubmissionsResponse> {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.campaignId) query.set('campaignId', params.campaignId);
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    const response = await apiClient.get<{ data: SubmissionsResponse }>(`/admin/prive/submissions?${query.toString()}`);
    return (response as any).data;
  }

  async approveSubmission(id: string, note?: string): Promise<any> {
    return apiClient.put(`/admin/prive/submissions/${id}/approve`, { note });
  }

  async rejectSubmission(id: string, reason: string, note?: string): Promise<any> {
    return apiClient.put(`/admin/prive/submissions/${id}/reject`, { reason, note });
  }

  async getPendingCampaigns(params?: { page?: number; limit?: number }): Promise<any> {
    const query = new URLSearchParams();
    query.set('status', 'pending_approval');
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    const response = await apiClient.get<any>(`/admin/prive/submissions/campaigns?${query.toString()}`);
    return (response as any).data;
  }

  async approveCampaign(id: string, note?: string): Promise<any> {
    return apiClient.put(`/admin/prive/submissions/campaigns/${id}/approve`, { note });
  }

  async rejectCampaign(id: string, note?: string): Promise<any> {
    return apiClient.put(`/admin/prive/submissions/campaigns/${id}/reject`, { note });
  }
}

export const priveCampaignAdminApi = new PriveCampaignAdminApi();
