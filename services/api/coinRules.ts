import { apiClient } from './apiClient';

// ── Interfaces ──

export interface CoinExpiryRule {
  expiryDays: number;
  maxUsagePct: number;
}

export interface CoinExpiryConfig {
  rez: CoinExpiryRule;
  prive: CoinExpiryRule;
  promo: CoinExpiryRule;
  branded: CoinExpiryRule;
}

export interface MultiplierRule {
  name: string;
  coinType: 'rez' | 'branded' | 'promo' | 'prive';
  multiplier: number;
  type: 'category' | 'time_based' | 'event' | 'subscription';
  isActive: boolean;
  startDate?: string;
  endDate?: string;
  conditions?: string;
  categories?: string[];
}

export interface DailyCaps {
  perUserPerDay: number;
  globalDailyIssuance: number;
  perTransactionMax: number;
}

export interface CoinRulesData {
  expiryConfig: CoinExpiryConfig;
  multiplierRules: MultiplierRule[];
  dailyCaps: DailyCaps;
}

// ── Service ──

class CoinRulesService {
  async getRules(): Promise<CoinRulesData> {
    const response = await apiClient.get<CoinRulesData>('admin/coin-rules');
    if (response.success && response.data) return response.data;
    throw new Error(response.message || 'Failed to fetch coin rules');
  }

  async updateRules(data: Partial<CoinRulesData>): Promise<CoinRulesData> {
    const response = await apiClient.put<CoinRulesData>('admin/coin-rules', data);
    if (response.success && response.data) return response.data;
    throw new Error(response.message || 'Failed to update coin rules');
  }

  async addMultiplierRule(rule: Omit<MultiplierRule, 'isActive'> & { isActive?: boolean }): Promise<{ rule: MultiplierRule; totalRules: number }> {
    const response = await apiClient.post<{ rule: MultiplierRule; totalRules: number }>('admin/coin-rules/multiplier', rule);
    if (response.success && response.data) return response.data;
    throw new Error(response.message || 'Failed to add multiplier rule');
  }

  async updateMultiplierRule(index: number, updates: Partial<MultiplierRule>): Promise<{ rule: MultiplierRule; index: number }> {
    const response = await apiClient.put<{ rule: MultiplierRule; index: number }>(`admin/coin-rules/multiplier/${index}`, updates);
    if (response.success && response.data) return response.data;
    throw new Error(response.message || 'Failed to update multiplier rule');
  }

  async deleteMultiplierRule(index: number): Promise<{ removed: MultiplierRule; remainingCount: number }> {
    const response = await apiClient.delete<{ removed: MultiplierRule; remainingCount: number }>(`admin/coin-rules/multiplier/${index}`);
    if (response.success && response.data) return response.data;
    throw new Error(response.message || 'Failed to delete multiplier rule');
  }
}

export const coinRulesService = new CoinRulesService();
