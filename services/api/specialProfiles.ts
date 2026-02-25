import { apiClient } from './apiClient';

export interface SpecialProfile {
  _id: string;
  name: string;
  slug: string;
  icon: string;
  iconColor: string;
  backgroundColor: string;
  description?: string;
  verificationRequired: string;
  verificationDocuments?: string[];
  verificationTime: string;
  offersCount: number;
  discountRange?: string;
  image?: string;
  bannerImage?: string;
  benefits?: string[];
  isActive: boolean;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

class SpecialProfilesService {
  private baseUrl = 'admin/special-profiles';

  async getProfiles(params?: { page?: number; limit?: number; status?: string; search?: string }) {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));
    if (params?.status) query.append('status', params.status);
    if (params?.search) query.append('search', params.search);

    return apiClient.get<{ profiles: SpecialProfile[]; pagination: any }>(`${this.baseUrl}?${query.toString()}`);
  }

  async getProfile(id: string) {
    return apiClient.get<SpecialProfile>(`${this.baseUrl}/${id}`);
  }

  async createProfile(data: Partial<SpecialProfile>) {
    return apiClient.post<SpecialProfile>(this.baseUrl, data);
  }

  async updateProfile(id: string, data: Partial<SpecialProfile>) {
    return apiClient.put<SpecialProfile>(`${this.baseUrl}/${id}`, data);
  }

  async toggleProfile(id: string) {
    return apiClient.patch<SpecialProfile>(`${this.baseUrl}/${id}/toggle`);
  }

  async deleteProfile(id: string) {
    return apiClient.delete(`${this.baseUrl}/${id}`);
  }
}

export const specialProfilesService = new SpecialProfilesService();
export default specialProfilesService;
