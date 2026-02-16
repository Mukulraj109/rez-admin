import apiClient from './apiClient';

export interface GameConfigItem {
  _id: string;
  gameType: 'spin_wheel' | 'memory_match' | 'coin_hunt' | 'guess_price' | 'quiz' | 'scratch_card';
  displayName: string;
  description: string;
  icon: string;
  isEnabled: boolean;
  dailyLimit: number;
  cooldownMinutes: number;
  rewards: {
    minCoins: number;
    maxCoins: number;
    bonusMultiplier: number;
  };
  difficulty: {
    easy: { timeLimit: number; gridSize?: number; lives?: number; };
    medium: { timeLimit: number; gridSize?: number; lives?: number; };
    hard: { timeLimit: number; gridSize?: number; lives?: number; };
  };
  config: Record<string, any>;
  schedule: {
    availableFrom?: string;
    availableUntil?: string;
    availableDays: number[];
    availableHours?: { start: number; end: number; };
  };
  sortOrder: number;
  featured: boolean;
  createdAt: string;
  updatedAt: string;
}

export const gameConfigService = {
  async list(enabled?: boolean) {
    const query = enabled !== undefined ? `?enabled=${enabled}` : '';
    return apiClient.get(`/admin/game-config${query}`);
  },
  async getByType(gameType: string) {
    return apiClient.get(`/admin/game-config/${gameType}`);
  },
  async create(data: Partial<GameConfigItem>) {
    return apiClient.post('/admin/game-config', data);
  },
  async seed() {
    return apiClient.post('/admin/game-config/seed');
  },
  async update(id: string, data: Partial<GameConfigItem>) {
    return apiClient.put(`/admin/game-config/${id}`, data);
  },
  async toggle(id: string) {
    return apiClient.patch(`/admin/game-config/${id}/toggle`);
  },
  async toggleFeatured(id: string) {
    return apiClient.patch(`/admin/game-config/${id}/featured`);
  },
  async reorder(items: { id: string; sortOrder: number }[]) {
    return apiClient.patch('/admin/game-config/reorder', { items });
  },
  async delete(id: string) {
    return apiClient.delete(`/admin/game-config/${id}`);
  },
};
