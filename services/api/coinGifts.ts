import { apiClient } from './apiClient';

export interface CoinGiftUser {
  _id: string;
  fullName?: string;
  phoneNumber?: string;
}

export interface CoinGiftItem {
  _id: string;
  sender: CoinGiftUser;
  recipient: CoinGiftUser;
  amount: number;
  coinType: 'nuqta' | 'promo';
  theme: string;
  message?: string;
  deliveryType: 'instant' | 'scheduled';
  scheduledAt?: string;
  status: 'pending' | 'delivered' | 'claimed' | 'expired' | 'cancelled';
  claimedAt?: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface CoinGiftDetail extends CoinGiftItem {
  senderTxId?: string;
  recipientTxId?: string;
  metadata?: Record<string, any>;
}

interface ListCoinGiftsResponse {
  gifts: CoinGiftItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface CoinGiftDetailResponse {
  gift: CoinGiftDetail;
  transactions: any[];
  ledgerEntries: any[];
}

interface CoinGiftAnalytics {
  period: string;
  summary: {
    totalGifts: number;
    totalAmount: number;
    avgAmount: number;
    uniqueSenders: number;
    uniqueRecipients: number;
  };
  statusBreakdown: Array<{ _id: string; count: number; totalAmount: number }>;
  themeBreakdown: Array<{ _id: string; count: number; totalAmount: number }>;
  dailyVolume: Array<{ _id: string; count: number; totalAmount: number }>;
}

class CoinGiftsAdminService {
  async getAll(
    page: number = 1,
    limit: number = 20,
    status?: string,
    search?: string,
  ): Promise<ListCoinGiftsResponse> {
    try {
      let url = 'admin/coin-gifts';
      const params: string[] = [];

      params.push(`page=${page}`);
      params.push(`limit=${limit}`);
      if (status && status !== 'all') params.push(`status=${encodeURIComponent(status)}`);
      if (search) params.push(`search=${encodeURIComponent(search)}`);

      if (params.length > 0) url += `?${params.join('&')}`;

      if (__DEV__) console.log('[CoinGifts] Listing coin gifts...');
      const response = await apiClient.get<ListCoinGiftsResponse>(url);

      if (response.success && response.data) {
        if (__DEV__) console.log('[CoinGifts] Coin gifts fetched successfully');
        return response.data;
      }

      throw new Error(response.message || 'Failed to list coin gifts');
    } catch (error: any) {
      if (__DEV__) console.error('[CoinGifts] List error:', error.message);
      throw new Error(error.message || 'Failed to list coin gifts');
    }
  }

  async getById(id: string): Promise<CoinGiftDetailResponse> {
    try {
      if (__DEV__) console.log('[CoinGifts] Getting coin gift:', id);
      const response = await apiClient.get<CoinGiftDetailResponse>(`admin/coin-gifts/${id}`);

      if (response.success && response.data) {
        if (__DEV__) console.log('[CoinGifts] Coin gift detail fetched successfully');
        return response.data;
      }

      throw new Error(response.message || 'Failed to get coin gift details');
    } catch (error: any) {
      if (__DEV__) console.error('[CoinGifts] Detail error:', error.message);
      throw new Error(error.message || 'Failed to get coin gift details');
    }
  }

  async getAnalytics(days: number = 30): Promise<CoinGiftAnalytics> {
    try {
      if (__DEV__) console.log('[CoinGifts] Getting analytics...');
      const response = await apiClient.get<CoinGiftAnalytics>(`admin/coin-gifts/analytics?days=${days}`);

      if (response.success && response.data) {
        if (__DEV__) console.log('[CoinGifts] Analytics fetched successfully');
        return response.data;
      }

      throw new Error(response.message || 'Failed to get coin gift analytics');
    } catch (error: any) {
      if (__DEV__) console.error('[CoinGifts] Analytics error:', error.message);
      throw new Error(error.message || 'Failed to get coin gift analytics');
    }
  }

  async refund(id: string, reason: string): Promise<{ gift: CoinGiftItem; message: string }> {
    try {
      if (__DEV__) console.log('[CoinGifts] Refunding coin gift:', id);
      const response = await apiClient.post<{ gift: CoinGiftItem }>(`admin/coin-gifts/${id}/refund`, { reason });

      if (response.success && response.data) {
        if (__DEV__) console.log('[CoinGifts] Coin gift refunded successfully');
        return { gift: response.data.gift, message: response.message || 'Gift refunded successfully' };
      }

      throw new Error(response.message || 'Failed to refund coin gift');
    } catch (error: any) {
      if (__DEV__) console.error('[CoinGifts] Refund error:', error.message);
      throw new Error(error.message || 'Failed to refund coin gift');
    }
  }

  async deliver(id: string): Promise<{ gift: CoinGiftItem; message: string }> {
    try {
      if (__DEV__) console.log('[CoinGifts] Delivering coin gift:', id);
      const response = await apiClient.post<{ gift: CoinGiftItem }>(`admin/coin-gifts/${id}/deliver`);

      if (response.success && response.data) {
        if (__DEV__) console.log('[CoinGifts] Coin gift delivered successfully');
        return { gift: response.data.gift, message: response.message || 'Gift delivered successfully' };
      }

      throw new Error(response.message || 'Failed to deliver coin gift');
    } catch (error: any) {
      if (__DEV__) console.error('[CoinGifts] Deliver error:', error.message);
      throw new Error(error.message || 'Failed to deliver coin gift');
    }
  }
}

export const coinGiftsAdminService = new CoinGiftsAdminService();
export default coinGiftsAdminService;
