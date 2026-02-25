import { apiClient } from './apiClient';

export interface FlashSale {
  _id: string;
  title: string;
  description: string;
  image: string;
  banner?: string;
  discountPercentage: number;
  discountAmount?: number;
  priority: number;
  startTime: string;
  endTime: string;
  maxQuantity: number;
  soldQuantity: number;
  limitPerUser: number;
  products: any[];
  stores: any[];
  category?: any;
  originalPrice?: number;
  flashSalePrice?: number;
  status: string;
  enabled: boolean;
  promoCode?: string;
  viewCount: number;
  clickCount: number;
  purchaseCount: number;
  createdAt: string;
  updatedAt: string;
}

class FlashSalesService {
  private baseUrl = 'admin/flash-sales';

  async getSales(params?: { page?: number; limit?: number; status?: string; enabled?: string; search?: string }) {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));
    if (params?.status) query.append('status', params.status);
    if (params?.enabled) query.append('enabled', params.enabled);
    if (params?.search) query.append('search', params.search);

    return apiClient.get<{ sales: FlashSale[]; pagination: any }>(`${this.baseUrl}?${query.toString()}`);
  }

  async getSale(id: string) {
    return apiClient.get<FlashSale>(`${this.baseUrl}/${id}`);
  }

  async createSale(data: Partial<FlashSale>) {
    return apiClient.post<FlashSale>(this.baseUrl, data);
  }

  async updateSale(id: string, data: Partial<FlashSale>) {
    return apiClient.put<FlashSale>(`${this.baseUrl}/${id}`, data);
  }

  async toggleSale(id: string) {
    return apiClient.patch<FlashSale>(`${this.baseUrl}/${id}/toggle`);
  }

  async deleteSale(id: string) {
    return apiClient.delete(`${this.baseUrl}/${id}`);
  }
}

export const flashSalesService = new FlashSalesService();
export default flashSalesService;
