import { apiClient } from './apiClient';

export interface StoreCollectionConfig {
  _id: string;
  categoryKey: string;
  displayName: string;
  description: string;
  icon: string;
  color: string;
  isEnabled: boolean;
  sortOrder: number;
  regions: string[];
  tags: string[];
  badgeText: string;
  imageUrl: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

class StoreCollectionsService {
  private baseUrl = 'admin/store-collections';

  async getAll() {
    return apiClient.get<StoreCollectionConfig[]>(this.baseUrl);
  }

  async update(categoryKey: string, data: Partial<StoreCollectionConfig>) {
    return apiClient.put<StoreCollectionConfig>(`${this.baseUrl}/${categoryKey}`, data);
  }

  async seed() {
    return apiClient.post<{ categoryKey: string; action: string }[]>(`${this.baseUrl}/seed`);
  }

  async reorder(items: { categoryKey: string; sortOrder: number }[]) {
    return apiClient.post<{ categoryKey: string; sortOrder: number }[]>(`${this.baseUrl}/reorder`, { items });
  }
}

export const storeCollectionsService = new StoreCollectionsService();
