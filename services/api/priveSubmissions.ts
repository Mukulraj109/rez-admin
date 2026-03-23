import { apiClient } from './apiClient';

// ─── Interfaces ──────────────────────────────────────────

export interface PriveSubmission {
  _id: string;
  campaignId: { _id: string; title: string; merchantId?: { name: string } };
  userId: { _id: string; fullName?: string; phoneNumber?: string; profile?: { avatar?: string } };
  postUrl: string;
  postScreenshotUrl?: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  rejectionReason?: string;
  reviewerNote?: string;
  fraudScore?: number;
  autoFlags?: string[];
  coinsEarned: number;
  cashbackIssued: number;
  submittedAt: string;
  reviewedAt?: string;
}

export interface SubmissionStats {
  pending: number;
  approvedToday: number;
  rejectedToday: number;
  totalPendingCashback: number;
}

export interface GetSubmissionsParams {
  status?: string;
  campaignId?: string;
  page?: number;
  limit?: number;
}

export interface SubmissionsListResponse {
  submissions: PriveSubmission[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  stats?: SubmissionStats;
}

// ─── Service ─────────────────────────────────────────────

class PriveSubmissionsService {
  /**
   * Get submissions with pagination and filters
   */
  async getSubmissions(params: GetSubmissionsParams = {}): Promise<SubmissionsListResponse> {
    try {
      if (__DEV__) console.log('[PriveSubmissions] Fetching submissions with params:', params);

      const query = new URLSearchParams();
      if (params.page) query.append('page', params.page.toString());
      if (params.limit) query.append('limit', params.limit.toString());
      if (params.status) query.append('status', params.status);
      if (params.campaignId) query.append('campaignId', params.campaignId);

      const endpoint = `admin/prive/submissions${query.toString() ? `?${query.toString()}` : ''}`;
      const response = await apiClient.get<SubmissionsListResponse>(endpoint);

      if (response.success && response.data) {
        if (__DEV__) console.log('[PriveSubmissions] Fetched successfully:', response.data.submissions?.length || 0, 'submissions');
        return response.data;
      }

      throw new Error(response.message || 'Failed to fetch submissions');
    } catch (error: any) {
      if (__DEV__) console.error('[PriveSubmissions] Get submissions error:', error.message);
      throw new Error(error.message || 'Failed to fetch submissions');
    }
  }

  /**
   * Approve a submission with optional reviewer note
   */
  async approveSubmission(id: string, note?: string): Promise<PriveSubmission> {
    try {
      if (__DEV__) console.log('[PriveSubmissions] Approving submission:', id);
      const body: { note?: string } = {};
      if (note) body.note = note;

      const response = await apiClient.put<PriveSubmission>(`admin/prive/submissions/${id}/approve`, body);

      if (response.success && response.data) {
        if (__DEV__) console.log('[PriveSubmissions] Submission approved:', id);
        return response.data;
      }

      throw new Error(response.message || 'Failed to approve submission');
    } catch (error: any) {
      if (__DEV__) console.error('[PriveSubmissions] Approve error:', error.message);
      throw new Error(error.message || 'Failed to approve submission');
    }
  }

  /**
   * Reject a submission with reason and optional note
   */
  async rejectSubmission(id: string, reason: string, note?: string): Promise<PriveSubmission> {
    try {
      if (__DEV__) console.log('[PriveSubmissions] Rejecting submission:', id, 'reason:', reason);
      const body: { reason: string; note?: string } = { reason };
      if (note) body.note = note;

      const response = await apiClient.put<PriveSubmission>(`admin/prive/submissions/${id}/reject`, body);

      if (response.success && response.data) {
        if (__DEV__) console.log('[PriveSubmissions] Submission rejected:', id);
        return response.data;
      }

      throw new Error(response.message || 'Failed to reject submission');
    } catch (error: any) {
      if (__DEV__) console.error('[PriveSubmissions] Reject error:', error.message);
      throw new Error(error.message || 'Failed to reject submission');
    }
  }
}

export const priveSubmissionsService = new PriveSubmissionsService();
export default priveSubmissionsService;
