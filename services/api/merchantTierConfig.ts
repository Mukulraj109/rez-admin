import { apiClient } from './apiClient';

export interface TierDetails {
  name: string;
  commissionRate: number;
  monthlyFee: number;
  maxProducts: number;
  maxStores: number;
  features: string[];
  analyticsAccess: boolean;
  prioritySupport: boolean;
  customBranding: boolean;
  apiAccess: boolean;
}

export interface MerchantTierConfigData {
  _id: string;
  tiers: {
    free: TierDetails;
    pro: TierDetails;
    enterprise: TierDetails;
  };
  updatedBy?: string;
  updatedAt: string;
  createdAt: string;
}

export interface MerchantSearchResult {
  _id: string;
  businessName: string;
  ownerName: string;
  email: string;
  phone: string;
  tier?: string;
  verificationStatus: string;
  isActive: boolean;
}

export interface MerchantSearchResponse {
  merchants: MerchantSearchResult[];
  currentPage: number;
  totalPages: number;
  totalItems: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

class MerchantTierConfigService {
  async getConfig(): Promise<MerchantTierConfigData> {
    const response = await apiClient.get<MerchantTierConfigData>('admin/merchant-tier-config');
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Failed to get merchant tier config');
  }

  async updateConfig(data: { tiers: Partial<Record<'free' | 'pro' | 'enterprise', Partial<TierDetails>>> }): Promise<MerchantTierConfigData> {
    const response = await apiClient.put<MerchantTierConfigData>('admin/merchant-tier-config', data);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Failed to update merchant tier config');
  }

  async searchMerchants(query: string, page = 1, limit = 10): Promise<MerchantSearchResponse> {
    const response = await apiClient.get<MerchantSearchResponse>(
      `admin/merchant-tier-config/merchants/search?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`
    );
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Failed to search merchants');
  }

  async assignTier(merchantId: string, tier: string): Promise<MerchantSearchResult> {
    const response = await apiClient.put<MerchantSearchResult>(
      `admin/merchant-tier-config/${merchantId}/assign`,
      { tier }
    );
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Failed to assign tier');
  }
}

export const merchantTierConfigService = new MerchantTierConfigService();
export default merchantTierConfigService;
