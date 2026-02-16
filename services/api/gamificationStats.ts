import apiClient from './apiClient';

export interface EconomyStats {
  totalInCirculation: number;
  totalEarnedAllTime: number;
  totalSpentAllTime: number;
  coinsEarnedToday: number;
  coinsSpentToday: number;
  coinsEarnedThisWeek: number;
  coinsSpentThisWeek: number;
  coinsEarnedThisMonth: number;
  coinsSpentThisMonth: number;
  netFlowToday: number;
}

export interface EngagementStats {
  totalAchievementsUnlocked: number;
  totalChallengesCompleted: number;
  activeChallenges: number;
  totalGameSessions: number;
  gameSessionsToday: number;
}

export interface FraudAlert {
  userId: string;
  totalEarned: number;
  transactionCount: number;
  userName?: string;
  userPhone?: string;
}

export interface FraudAlertResponse {
  alerts: FraudAlert[];
  alertCount: number;
  threshold: number;
  window: string;
}

export const gamificationStatsService = {
  async getEconomy() {
    return apiClient.get('/admin/gamification-stats/economy');
  },
  async getEngagement() {
    return apiClient.get('/admin/gamification-stats/engagement');
  },
  async getFraudAlerts() {
    return apiClient.get('/admin/gamification-stats/fraud-alerts');
  },
};
