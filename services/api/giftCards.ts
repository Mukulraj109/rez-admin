import { apiClient } from './apiClient';

export interface GiftCardItem {
  _id: string;
  name: string;
  description?: string;
  logo?: string;
  color?: string;
  category: string;
  denominations: number[];
  cashbackPercentage: number;
  termsAndConditions?: string;
  validityDays: number;
  storeId?: string;
  isActive: boolean;
  createdAt: string;
}

export interface CreateGiftCardData {
  name: string;
  description?: string;
  logo?: string;
  color?: string;
  category: string;
  denominations: number[];
  cashbackPercentage?: number;
  termsAndConditions?: string;
  validityDays?: number;
  storeId?: string;
}

interface ListGiftCardsResponse {
  giftCards: GiftCardItem[];
  total: number;
}

class GiftCardsAdminService {
  async list(filters?: {
    category?: string;
    search?: string;
    isActive?: boolean;
  }): Promise<ListGiftCardsResponse> {
    try {
      let url = 'admin/gift-cards';
      const params: string[] = [];

      if (filters?.category) params.push(`category=${encodeURIComponent(filters.category)}`);
      if (filters?.search) params.push(`search=${encodeURIComponent(filters.search)}`);
      if (filters?.isActive !== undefined) params.push(`isActive=${filters.isActive}`);

      if (params.length > 0) url += `?${params.join('&')}`;

      console.log('[GiftCards] Listing gift cards...');
      const response = await apiClient.get<ListGiftCardsResponse>(url);

      if (response.success && response.data) {
        console.log('[GiftCards] Gift cards fetched successfully');
        return response.data;
      }

      throw new Error(response.message || 'Failed to list gift cards');
    } catch (error: any) {
      console.error('[GiftCards] List error:', error.message);
      throw new Error(error.message || 'Failed to list gift cards');
    }
  }

  async create(data: CreateGiftCardData): Promise<GiftCardItem> {
    try {
      console.log('[GiftCards] Creating gift card...');
      const response = await apiClient.post<GiftCardItem>('admin/gift-cards', data);

      if (response.success && response.data) {
        console.log('[GiftCards] Gift card created successfully');
        return response.data;
      }

      throw new Error(response.message || 'Failed to create gift card');
    } catch (error: any) {
      console.error('[GiftCards] Create error:', error.message);
      throw new Error(error.message || 'Failed to create gift card');
    }
  }

  async update(id: string, data: Partial<CreateGiftCardData>): Promise<GiftCardItem> {
    try {
      console.log('[GiftCards] Updating gift card:', id);
      const response = await apiClient.put<GiftCardItem>(`admin/gift-cards/${id}`, data);

      if (response.success && response.data) {
        console.log('[GiftCards] Gift card updated successfully');
        return response.data;
      }

      throw new Error(response.message || 'Failed to update gift card');
    } catch (error: any) {
      console.error('[GiftCards] Update error:', error.message);
      throw new Error(error.message || 'Failed to update gift card');
    }
  }

  async deactivate(id: string): Promise<void> {
    try {
      console.log('[GiftCards] Deactivating gift card:', id);
      const response = await apiClient.delete(`admin/gift-cards/${id}`);

      if (response.success) {
        console.log('[GiftCards] Gift card deactivated successfully');
        return;
      }

      throw new Error(response.message || 'Failed to deactivate gift card');
    } catch (error: any) {
      console.error('[GiftCards] Deactivate error:', error.message);
      throw new Error(error.message || 'Failed to deactivate gift card');
    }
  }
}

export const giftCardsAdminService = new GiftCardsAdminService();
export default giftCardsAdminService;
