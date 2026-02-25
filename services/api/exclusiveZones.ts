import { apiClient } from './apiClient';

export interface ExclusiveZone {
  _id: string;
  name: string;
  slug: string;
  icon: string;
  iconColor: string;
  backgroundColor: string;
  description?: string;
  shortDescription?: string;
  eligibilityType: string;
  eligibilityDetails?: string;
  verificationRequired: boolean;
  offersCount: number;
  image?: string;
  bannerImage?: string;
  isActive: boolean;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

class ExclusiveZonesService {
  private baseUrl = 'admin/exclusive-zones';

  async getZones(params?: { page?: number; limit?: number; status?: string; eligibilityType?: string; search?: string }) {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));
    if (params?.status) query.append('status', params.status);
    if (params?.eligibilityType) query.append('eligibilityType', params.eligibilityType);
    if (params?.search) query.append('search', params.search);

    return apiClient.get<{ zones: ExclusiveZone[]; pagination: any }>(`${this.baseUrl}?${query.toString()}`);
  }

  async getZone(id: string) {
    return apiClient.get<ExclusiveZone>(`${this.baseUrl}/${id}`);
  }

  async createZone(data: Partial<ExclusiveZone>) {
    return apiClient.post<ExclusiveZone>(this.baseUrl, data);
  }

  async updateZone(id: string, data: Partial<ExclusiveZone>) {
    return apiClient.put<ExclusiveZone>(`${this.baseUrl}/${id}`, data);
  }

  async toggleZone(id: string) {
    return apiClient.patch<ExclusiveZone>(`${this.baseUrl}/${id}/toggle`);
  }

  async deleteZone(id: string) {
    return apiClient.delete(`${this.baseUrl}/${id}`);
  }
}

export const exclusiveZonesService = new ExclusiveZonesService();
export default exclusiveZonesService;
