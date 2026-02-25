import { apiClient } from './apiClient';

export interface WalletConfigData {
  transferLimits: {
    dailyMax: number;
    perTransactionMax: number;
    minAmount: number;
    requireOtpAbove: number;
    maxRecipientsPerDay: number;
  };
  giftLimits: {
    dailyMax: number;
    perGiftMax: number;
    minAmount: number;
    requireOtpAbove: number;
  };
  rechargeConfig: {
    cashbackPercentage: number;
    maxCashback: number;
    minRecharge: number;
    tiers: Array<{ min: number; cashbackPercent: number }>;
  };
  expiryConfig: {
    promoExpiryDays: number;
    alertDaysBefore: number;
    gracePeriodDays: number;
  };
  commissionRate: number;
  coinConversion: {
    nuqtaToInr: number;
    promoToInr: number;
    brandedToInr: number;
  };
  fraudThresholds: {
    maxTransfersPerHour: number;
    maxGiftsPerDay: number;
    suspiciousAmountThreshold: number;
    autoFreezeMultiplier: number;
  };
}

export interface WalletConfig extends WalletConfigData {
  _id: string;
  createdAt: string;
  updatedAt: string;
}

class WalletConfigService {
  async getConfig(): Promise<WalletConfig> {
    try {
      console.log('[WalletConfig] Fetching wallet config...');
      const response = await apiClient.get<WalletConfig>('admin/wallet-config');

      if (response.success && response.data) {
        console.log('[WalletConfig] Config fetched successfully');
        return response.data;
      }

      throw new Error(response.message || 'Failed to get wallet config');
    } catch (error: any) {
      console.error('[WalletConfig] Get config error:', error.message);
      throw new Error(error.message || 'Failed to get wallet config');
    }
  }

  async updateConfig(data: Partial<WalletConfigData>): Promise<WalletConfig> {
    try {
      console.log('[WalletConfig] Updating wallet config...');
      const response = await apiClient.put<WalletConfig>('admin/wallet-config', data);

      if (response.success && response.data) {
        console.log('[WalletConfig] Config updated successfully');
        return response.data;
      }

      throw new Error(response.message || 'Failed to update wallet config');
    } catch (error: any) {
      console.error('[WalletConfig] Update config error:', error.message);
      throw new Error(error.message || 'Failed to update wallet config');
    }
  }
}

export const walletConfigService = new WalletConfigService();
export default walletConfigService;
