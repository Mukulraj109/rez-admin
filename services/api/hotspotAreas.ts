import { apiClient } from './apiClient';

export interface HotspotArea {
  _id: string;
  name: string;
  slug: string;
  coordinates: { lat: number; lng: number };
  radius: number;
  city: string;
  state?: string;
  country: string;
  image?: string;
  isActive: boolean;
  priority: number;
  totalDeals: number;
  createdAt: string;
  updatedAt: string;
}

class HotspotAreasService {
  private baseUrl = 'admin/hotspot-areas';

  async getAreas(params?: { page?: number; limit?: number; status?: string; city?: string; search?: string }) {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));
    if (params?.status) query.append('status', params.status);
    if (params?.city) query.append('city', params.city);
    if (params?.search) query.append('search', params.search);

    return apiClient.get<{ areas: HotspotArea[]; pagination: any }>(`${this.baseUrl}?${query.toString()}`);
  }

  async getArea(id: string) {
    return apiClient.get<HotspotArea>(`${this.baseUrl}/${id}`);
  }

  async createArea(data: Partial<HotspotArea>) {
    return apiClient.post<HotspotArea>(this.baseUrl, data);
  }

  async updateArea(id: string, data: Partial<HotspotArea>) {
    return apiClient.put<HotspotArea>(`${this.baseUrl}/${id}`, data);
  }

  async toggleArea(id: string) {
    return apiClient.patch<HotspotArea>(`${this.baseUrl}/${id}/toggle`);
  }

  async deleteArea(id: string) {
    return apiClient.delete(`${this.baseUrl}/${id}`);
  }
}

export const hotspotAreasService = new HotspotAreasService();
export default hotspotAreasService;
