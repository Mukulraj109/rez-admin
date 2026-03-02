/**
 * Admin API Service - Privé Program Config
 */

import { apiClient } from './apiClient';

export interface TierThresholds {
  entryTier: number;
  signatureTier: number;
  eliteTier: number;
  trustMinimum: number;
}

export interface PillarWeights {
  engagement: number;
  trust: number;
  influence: number;
  economicValue: number;
  brandAffinity: number;
  network: number;
}

export interface TierConfig {
  tier: string;
  displayName: string;
  color: string;
  coinMultiplier: number;
  conciergeAccess: boolean;
  conciergeResponseSLA: number;
  inviteCodesLimit: number;
  benefits: string[];
}

export interface FeatureFlags {
  offersEnabled: boolean;
  missionsEnabled: boolean;
  conciergeEnabled: boolean;
  smartSpendEnabled: boolean;
  redemptionEnabled: boolean;
  analyticsEnabled: boolean;
  invitesEnabled: boolean;
}

export interface PriveProgramConfig {
  tierThresholds: TierThresholds;
  pillarWeights: PillarWeights;
  tiers: TierConfig[];
  featureFlags: FeatureFlags;
  dashboardCacheTtlSeconds: number;
  notificationConfig: {
    expiryWarningDays: number;
  };
}

export interface AuditLogEntry {
  _id: string;
  userId?: string;
  action: string;
  details: string;
  previousState?: any;
  newState?: any;
  performedBy: string;
  performerType: string;
  createdAt: string;
}

class PriveConfigAdminApi {
  async getProgramConfig(): Promise<PriveProgramConfig> {
    const response = await apiClient.get<{ config: PriveProgramConfig }>('/admin/prive/program-config');
    return response.data.config;
  }

  async updateProgramConfig(config: Partial<PriveProgramConfig>): Promise<PriveProgramConfig> {
    const response = await apiClient.put<{ config: PriveProgramConfig }>('/admin/prive/program-config', config);
    return response.data.config;
  }

  async updateTierThresholds(thresholds: TierThresholds): Promise<TierThresholds> {
    const response = await apiClient.put<{ tierThresholds: TierThresholds }>(
      '/admin/prive/program-config/tier-thresholds',
      thresholds
    );
    return response.data.tierThresholds;
  }

  async updatePillarWeights(weights: PillarWeights): Promise<PillarWeights> {
    const response = await apiClient.put<{ pillarWeights: PillarWeights }>(
      '/admin/prive/program-config/pillar-weights',
      weights
    );
    return response.data.pillarWeights;
  }

  async updateFeatureFlags(flags: Partial<FeatureFlags>): Promise<FeatureFlags> {
    const response = await apiClient.put<{ featureFlags: FeatureFlags }>(
      '/admin/prive/program-config/feature-flags',
      flags
    );
    return response.data.featureFlags;
  }

  async updateTiers(tiers: TierConfig[]): Promise<TierConfig[]> {
    const response = await apiClient.put<{ tiers: TierConfig[] }>(
      '/admin/prive/program-config/tiers',
      { tiers }
    );
    return response.data.tiers;
  }

  async getAuditLog(params?: {
    page?: number;
    limit?: number;
    action?: string;
    userId?: string;
  }): Promise<{ logs: AuditLogEntry[]; pagination: any }> {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.action) query.set('action', params.action);
    if (params?.userId) query.set('userId', params.userId);

    const response = await apiClient.get<{ logs: AuditLogEntry[]; pagination: any }>(
      `/admin/prive/audit-log?${query.toString()}`
    );
    return response.data;
  }
}

export const priveConfigAdminApi = new PriveConfigAdminApi();
