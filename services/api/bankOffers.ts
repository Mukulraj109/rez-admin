import { apiClient } from './apiClient';

export interface BankOffer {
  _id: string;
  bankName: string;
  bankLogo?: string;
  bankCode?: string;
  offerTitle: string;
  offerDescription?: string;
  discountPercentage: number;
  maxDiscount: number;
  minTransactionAmount: number;
  cardType: string;
  cardNetwork?: string;
  validFrom: string;
  validUntil: string;
  terms: string;
  termsDetailed?: string[];
  promoCode?: string;
  usageLimitPerUser?: number;
  totalUsageLimit?: number;
  usageCount: number;
  applicableStores?: string[];
  applicableCategories?: string[];
  isActive: boolean;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

class BankOffersService {
  private baseUrl = 'admin/bank-offers';

  async getOffers(params?: { page?: number; limit?: number; status?: string; bankName?: string; cardType?: string; search?: string }) {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));
    if (params?.status) query.append('status', params.status);
    if (params?.bankName) query.append('bankName', params.bankName);
    if (params?.cardType) query.append('cardType', params.cardType);
    if (params?.search) query.append('search', params.search);

    return apiClient.get<{ offers: BankOffer[]; pagination: any }>(`${this.baseUrl}?${query.toString()}`);
  }

  async getOffer(id: string) {
    return apiClient.get<BankOffer>(`${this.baseUrl}/${id}`);
  }

  async createOffer(data: Partial<BankOffer>) {
    return apiClient.post<BankOffer>(this.baseUrl, data);
  }

  async updateOffer(id: string, data: Partial<BankOffer>) {
    return apiClient.put<BankOffer>(`${this.baseUrl}/${id}`, data);
  }

  async toggleOffer(id: string) {
    return apiClient.patch<BankOffer>(`${this.baseUrl}/${id}/toggle`);
  }

  async deleteOffer(id: string) {
    return apiClient.delete(`${this.baseUrl}/${id}`);
  }
}

export const bankOffersService = new BankOffersService();
export default bankOffersService;
