import { apiClient } from './apiClient';

// ============================================
// TYPE DEFINITIONS
// ============================================

export type VerificationType =
  | 'student'
  | 'corporate'
  | 'defence'
  | 'healthcare'
  | 'senior'
  | 'teacher'
  | 'government'
  | 'differentlyAbled';

export type VerificationStatus = 'pending' | 'approved' | 'rejected';

export interface SubmittedData {
  documentType?: string;
  documentUrl?: string;
  email?: string;
  dateOfBirth?: string;
  instituteName?: string;
  companyName?: string;
  serviceNumber?: string;
  gender?: string;
}

export interface UserInfo {
  _id: string;
  fullName?: string; // At root level
  email?: string; // At root level
  phoneNumber?: string; // At root level
  profile?: {
    fullName?: string;
    firstName?: string;
    lastName?: string;
  };
  createdAt?: string;
}

export interface ZoneVerification {
  _id: string;
  userId: UserInfo | string;
  zoneSlug: string;
  verificationType: VerificationType;
  status: VerificationStatus;
  submittedData: SubmittedData;
  reviewedBy?: {
    _id: string;
    fullName?: string;
    profile?: {
      firstName?: string;
      lastName?: string;
    };
  } | string;
  reviewedAt?: string;
  rejectionReason?: string;
  expiresAt?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VerificationStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  byType: Record<string, {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  }>;
}

export interface VerificationsListResponse {
  verifications: ZoneVerification[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ReviewRequest {
  status: 'approved' | 'rejected';
  rejectionReason?: string;
  expiresAt?: string;
}

// ============================================
// ZONE VERIFICATIONS SERVICE
// ============================================

class ZoneVerificationsService {
  /**
   * Get list of verification requests
   */
  async getVerifications(
    page: number = 1,
    limit: number = 20,
    status?: VerificationStatus | 'all',
    verificationType?: VerificationType
  ): Promise<VerificationsListResponse> {
    try {
      let url = `admin/zone-verifications?page=${page}&limit=${limit}`;
      if (status && status !== 'all') url += `&status=${status}`;
      if (verificationType) url += `&verificationType=${verificationType}`;

      if (__DEV__) console.log('[ZoneVerifications] Fetching verifications...');
      const response = await apiClient.get<any>(url);

      if (response.success && response.data) {
        if (__DEV__) console.log('[ZoneVerifications] Verifications fetched successfully');
        return {
          verifications: response.data.verifications || [],
          pagination: response.data.pagination || { page, limit, total: 0, totalPages: 0, hasNext: false, hasPrev: false }
        };
      }

      throw new Error(response.message || 'Failed to get verifications');
    } catch (error: any) {
      if (__DEV__) console.error('[ZoneVerifications] Get verifications error:', error.message);
      throw new Error(error.message || 'Failed to get verifications');
    }
  }

  /**
   * Get verification statistics
   */
  async getStats(): Promise<VerificationStats> {
    try {
      if (__DEV__) console.log('[ZoneVerifications] Fetching stats...');
      const response = await apiClient.get<VerificationStats>('admin/zone-verifications/stats');

      if (response.success && response.data) {
        if (__DEV__) console.log('[ZoneVerifications] Stats fetched successfully');
        return response.data;
      }

      throw new Error(response.message || 'Failed to get stats');
    } catch (error: any) {
      if (__DEV__) console.error('[ZoneVerifications] Get stats error:', error.message);
      throw new Error(error.message || 'Failed to get stats');
    }
  }

  /**
   * Get single verification by ID
   */
  async getVerification(verificationId: string): Promise<ZoneVerification> {
    try {
      if (__DEV__) console.log('[ZoneVerifications] Fetching verification:', verificationId);
      const response = await apiClient.get<ZoneVerification>(`admin/zone-verifications/${verificationId}`);

      if (response.success && response.data) {
        return response.data;
      }

      throw new Error(response.message || 'Failed to get verification');
    } catch (error: any) {
      if (__DEV__) console.error('[ZoneVerifications] Get verification error:', error.message);
      throw new Error(error.message || 'Failed to get verification');
    }
  }

  /**
   * Approve a verification
   */
  async approveVerification(
    verificationId: string,
    expiresAt?: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      if (__DEV__) console.log('[ZoneVerifications] Approving verification:', verificationId);
      const body: ReviewRequest = { status: 'approved' };
      if (expiresAt) body.expiresAt = expiresAt;

      const response = await apiClient.patch<any>(`admin/zone-verifications/${verificationId}/review`, body);

      return {
        success: response.success,
        message: response.message || 'Verification approved'
      };
    } catch (error: any) {
      if (__DEV__) console.error('[ZoneVerifications] Approve verification error:', error.message);
      throw new Error(error.message || 'Failed to approve verification');
    }
  }

  /**
   * Reject a verification
   */
  async rejectVerification(
    verificationId: string,
    reason: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      if (__DEV__) console.log('[ZoneVerifications] Rejecting verification:', verificationId);
      const body: ReviewRequest = {
        status: 'rejected',
        rejectionReason: reason
      };

      const response = await apiClient.patch<any>(`admin/zone-verifications/${verificationId}/review`, body);

      return {
        success: response.success,
        message: response.message || 'Verification rejected'
      };
    } catch (error: any) {
      if (__DEV__) console.error('[ZoneVerifications] Reject verification error:', error.message);
      throw new Error(error.message || 'Failed to reject verification');
    }
  }

  /**
   * Revoke an approved verification
   */
  async revokeVerification(
    verificationId: string,
    reason?: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      if (__DEV__) console.log('[ZoneVerifications] Revoking verification:', verificationId);
      const body: ReviewRequest = {
        status: 'rejected',
        ...(reason && { rejectionReason: reason }),
      };

      const response = await apiClient.patch<any>(`admin/zone-verifications/${verificationId}/review`, body);

      return {
        success: response.success,
        message: response.message || 'Verification revoked'
      };
    } catch (error: any) {
      if (__DEV__) console.error('[ZoneVerifications] Revoke verification error:', error.message);
      throw new Error(error.message || 'Failed to revoke verification');
    }
  }

  /**
   * Re-approve a rejected verification
   */
  async reApproveVerification(
    verificationId: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      if (__DEV__) console.log('[ZoneVerifications] Re-approving verification:', verificationId);
      const body: ReviewRequest = { status: 'approved' };

      const response = await apiClient.patch<any>(`admin/zone-verifications/${verificationId}/review`, body);

      return {
        success: response.success,
        message: response.message || 'Verification re-approved'
      };
    } catch (error: any) {
      if (__DEV__) console.error('[ZoneVerifications] Re-approve verification error:', error.message);
      throw new Error(error.message || 'Failed to re-approve verification');
    }
  }

  /**
   * Delete a verification
   */
  async deleteVerification(verificationId: string): Promise<{ success: boolean; message: string }> {
    try {
      if (__DEV__) console.log('[ZoneVerifications] Deleting verification:', verificationId);
      const response = await apiClient.delete<any>(`admin/zone-verifications/${verificationId}`);

      return {
        success: response.success,
        message: response.message || 'Verification deleted'
      };
    } catch (error: any) {
      if (__DEV__) console.error('[ZoneVerifications] Delete verification error:', error.message);
      throw new Error(error.message || 'Failed to delete verification');
    }
  }

  async bulkApproveByInstitution(instituteName: string): Promise<{
    approved: number;
    message: string;
  }> {
    try {
      const response = await apiClient.post<{ approved: number; message: string }>(
        'admin/zone-verifications/bulk-approve',
        { instituteName }
      );
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.message || 'Bulk approve failed');
    } catch (error: any) {
      if (__DEV__) console.error('[ZoneVerifications] Bulk approve error:', error.message);
      throw new Error(error.message || 'Failed to bulk approve');
    }
  }
}

export const zoneVerificationsService = new ZoneVerificationsService();
export default zoneVerificationsService;
