import { apiClient } from './apiClient';

export interface UploadBillStore {
  _id: string;
  name: string;
  logo?: string;
  category: string;
  coinsPerRupee: number;
  maxCoinsPerBill: number;
  minBillAmount: number;
  verificationRequired: boolean;
  verificationTime: string;
  instructions?: string[];
  acceptedBillTypes?: string[];
  isActive: boolean;
  priority: number;
  totalUploads: number;
  createdAt: string;
  updatedAt: string;
}

class UploadBillStoresService {
  private baseUrl = 'admin/upload-bill-stores';

  async getStores(params?: { page?: number; limit?: number; status?: string; category?: string; search?: string }) {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));
    if (params?.status) query.append('status', params.status);
    if (params?.category) query.append('category', params.category);
    if (params?.search) query.append('search', params.search);

    return apiClient.get<{ stores: UploadBillStore[]; pagination: any }>(`${this.baseUrl}?${query.toString()}`);
  }

  async getStore(id: string) {
    return apiClient.get<UploadBillStore>(`${this.baseUrl}/${id}`);
  }

  async createStore(data: Partial<UploadBillStore>) {
    return apiClient.post<UploadBillStore>(this.baseUrl, data);
  }

  async updateStore(id: string, data: Partial<UploadBillStore>) {
    return apiClient.put<UploadBillStore>(`${this.baseUrl}/${id}`, data);
  }

  async toggleStore(id: string) {
    return apiClient.patch<UploadBillStore>(`${this.baseUrl}/${id}/toggle`);
  }

  async deleteStore(id: string) {
    return apiClient.delete(`${this.baseUrl}/${id}`);
  }
}

export const uploadBillStoresService = new UploadBillStoresService();
export default uploadBillStoresService;
