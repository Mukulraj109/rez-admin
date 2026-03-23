import { apiClient } from './apiClient';

export interface CoinTypeStats {
  type: string;
  totalIssued: number;
  totalRedeemed: number;
  activeBalance: number;
  usersHolding: number;
  redemptionRate: number;
  issuedToday: number;
  redeemedToday: number;
}

export interface CoinOverviewData {
  coinTypes: CoinTypeStats[];
  killSwitchActive: boolean;
  dailyIssuanceCap: number;
  issuedTodayTotal: number;
  pausedCoinTypes?: string[];
}

export interface EmergencyStatus {
  isPaused: boolean;
  pausedCoinTypes: string[];
  pausedAt?: string;
  pausedBy?: string;
  reason?: string;
}

class CoinOverviewService {
  async getOverview(): Promise<CoinOverviewData> {
    const response = await apiClient.get<CoinOverviewData>('/admin/coins/overview');
    if (response.success && response.data) return response.data;
    throw new Error(response.message || 'Failed to fetch coin overview');
  }

  async getEmergencyStatus(): Promise<EmergencyStatus> {
    const response = await apiClient.get<EmergencyStatus>('/admin/coins/emergency/status');
    if (response.success && response.data) return response.data;
    throw new Error(response.message || 'Failed to fetch emergency status');
  }

  async pauseIssuance(coinTypes: string[], reason: string, durationHours?: number): Promise<void> {
    const response = await apiClient.post('/admin/coins/emergency/pause', {
      coinTypes,
      reason,
      durationHours,
    });
    if (!response.success) throw new Error(response.message || 'Failed to pause issuance');
  }

  async resumeIssuance(coinTypes?: string[]): Promise<void> {
    const response = await apiClient.post('/admin/coins/emergency/resume', {
      coinTypes,
    });
    if (!response.success) throw new Error(response.message || 'Failed to resume issuance');
  }
}

export const coinOverviewService = new CoinOverviewService();
