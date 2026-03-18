import { apiClient } from './apiClient';

export type ReferralStatus = 'pending' | 'contacted' | 'onboarded' | 'declined';

export interface InstituteReferral {
  _id: string;
  instituteName: string;
  instituteType: 'college' | 'company';
  submittedBy: {
    _id: string;
    phoneNumber: string;
    profile?: { firstName?: string; lastName?: string };
  };
  city: string;
  adminContactEmail?: string;
  status: ReferralStatus;
  rewardCredited: boolean;
  rewardAmount: number;
  createdAt: string;
}

export interface ReferralListResponse {
  referrals: InstituteReferral[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

class InstituteReferralsService {
  async getReferrals(params?: {
    status?: ReferralStatus;
    page?: number;
    limit?: number;
  }): Promise<ReferralListResponse> {
    try {
      const query = new URLSearchParams();
      if (params?.status) query.set('status', params.status);
      if (params?.page) query.set('page', params.page.toString());
      if (params?.limit) query.set('limit', params.limit.toString());

      const response = await apiClient.get<ReferralListResponse>(
        `admin/institute-referrals?${query.toString()}`
      );
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.message || 'Failed to fetch referrals');
    } catch (error: any) {
      if (__DEV__) console.log('[InstituteReferralsService] getReferrals error:', error.message);
      throw error;
    }
  }

  async updateStatus(id: string, status: ReferralStatus): Promise<void> {
    try {
      const response = await apiClient.put(`admin/institute-referrals/${id}/status`, { status });
      if (!response.success) {
        throw new Error(response.message || 'Failed to update status');
      }
    } catch (error: any) {
      if (__DEV__) console.log('[InstituteReferralsService] updateStatus error:', error.message);
      throw error;
    }
  }

  async markOnboarded(id: string): Promise<{
    instituteName: string;
    rewardCredited: boolean;
  }> {
    try {
      const response = await apiClient.put<{
        instituteName: string;
        rewardCredited: boolean;
      }>(`admin/institute-referrals/${id}/onboard`, {});
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.message || 'Failed to mark as onboarded');
    } catch (error: any) {
      if (__DEV__) console.log('[InstituteReferralsService] markOnboarded error:', error.message);
      throw error;
    }
  }
}

export const instituteReferralsService = new InstituteReferralsService();
