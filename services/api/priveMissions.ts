/**
 * Admin API Service - Privé Missions
 */

import { apiClient } from './apiClient';

export interface PriveMission {
  _id: string;
  title: string;
  description: string;
  targetPillar: 'engagement' | 'trust' | 'influence' | 'economicValue' | 'brandAffinity' | 'network';
  actionType: string;
  targetCount: number;
  reward: {
    coins: number;
    coinType: string;
    pillarBoost: number;
  };
  startDate: string;
  endDate: string;
  tierRequired: string;
  maxParticipants: number;
  currentParticipants: number;
  isActive: boolean;
  priority: number;
  createdAt: string;
}

export interface MissionAnalytics {
  totalClaims: number;
  totalCompleted: number;
  totalExpired: number;
  completionRate: number;
  avgCompletionDays: number;
}

class PriveMissionsAdminApi {
  async getMissions(params?: {
    page?: number;
    limit?: number;
    status?: string;
    pillar?: string;
    tier?: string;
  }): Promise<{ missions: PriveMission[]; pagination: any }> {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.status) query.set('status', params.status);
    if (params?.pillar) query.set('pillar', params.pillar);
    if (params?.tier) query.set('tier', params.tier);

    const response = await apiClient.get<{ missions: PriveMission[]; pagination: any }>(
      `/admin/prive/missions?${query.toString()}`
    );
    return response.data;
  }

  async createMission(data: Partial<PriveMission>): Promise<PriveMission> {
    const response = await apiClient.post<{ mission: PriveMission }>('/admin/prive/missions', data);
    return response.data.mission;
  }

  async updateMission(id: string, data: Partial<PriveMission>): Promise<PriveMission> {
    const response = await apiClient.put<{ mission: PriveMission }>(`/admin/prive/missions/${id}`, data);
    return response.data.mission;
  }

  async deleteMission(id: string): Promise<void> {
    await apiClient.delete(`/admin/prive/missions/${id}`);
  }

  async getMissionAnalytics(id: string): Promise<MissionAnalytics> {
    const response = await apiClient.get<{ analytics: MissionAnalytics }>(
      `/admin/prive/missions/${id}/analytics`
    );
    return response.data.analytics;
  }
}

export const priveMissionsAdminApi = new PriveMissionsAdminApi();
