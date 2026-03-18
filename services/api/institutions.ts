import { apiClient } from './apiClient';

export interface VerifiedInstitution {
  _id: string;
  name: string;
  slug: string;
  type: 'college' | 'company';
  aliases: string[];
  emailDomains: string[];
  city: string;
  state?: string;
  isActive: boolean;
  autoVerifyEnabled: boolean;
  estimatedStudentCount?: number;
  logoUrl?: string;
  verifiedCount?: number;
  pendingCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface InstitutionListResponse {
  institutions: VerifiedInstitution[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

class InstitutionsService {
  async getInstitutions(params?: {
    type?: 'college' | 'company';
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<InstitutionListResponse> {
    try {
      const query = new URLSearchParams();
      if (params?.type) query.set('type', params.type);
      if (params?.search) query.set('search', params.search);
      if (params?.page) query.set('page', params.page.toString());
      if (params?.limit) query.set('limit', params.limit.toString());

      const response = await apiClient.get<InstitutionListResponse>(
        `admin/institutions?${query.toString()}`
      );

      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.message || 'Failed to fetch institutions');
    } catch (error: any) {
      if (__DEV__) console.log('[InstitutionsService] getInstitutions error:', error.message);
      throw error;
    }
  }

  async createInstitution(data: {
    name: string;
    type: 'college' | 'company';
    emailDomains: string[];
    aliases: string[];
    city: string;
    state?: string;
    autoVerifyEnabled: boolean;
  }): Promise<VerifiedInstitution> {
    try {
      const response = await apiClient.post<{ institution: VerifiedInstitution }>(
        'admin/institutions',
        data
      );
      if (response.success && response.data) {
        return response.data.institution;
      }
      throw new Error(response.message || 'Failed to create institution');
    } catch (error: any) {
      if (__DEV__) console.log('[InstitutionsService] create error:', error.message);
      throw error;
    }
  }

  async updateInstitution(
    id: string,
    data: Partial<{
      name: string;
      type: 'college' | 'company';
      emailDomains: string[];
      aliases: string[];
      city: string;
      state: string;
      autoVerifyEnabled: boolean;
    }>
  ): Promise<VerifiedInstitution> {
    try {
      const response = await apiClient.put<{ institution: VerifiedInstitution }>(
        `admin/institutions/${id}`,
        data
      );
      if (response.success && response.data) {
        return response.data.institution;
      }
      throw new Error(response.message || 'Failed to update institution');
    } catch (error: any) {
      if (__DEV__) console.log('[InstitutionsService] update error:', error.message);
      throw error;
    }
  }

  async deleteInstitution(id: string): Promise<void> {
    try {
      const response = await apiClient.delete(`admin/institutions/${id}`);
      if (!response.success) {
        throw new Error(response.message || 'Failed to delete institution');
      }
    } catch (error: any) {
      if (__DEV__) console.log('[InstitutionsService] delete error:', error.message);
      throw error;
    }
  }
}

export const institutionsService = new InstitutionsService();
