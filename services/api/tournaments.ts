import { apiClient } from './apiClient';

export interface TournamentAdmin {
  _id: string;
  name: string;
  description: string;
  type: 'daily' | 'weekly' | 'monthly' | 'special';
  gameType: string;
  status: 'upcoming' | 'active' | 'completed' | 'cancelled';
  startDate: string;
  endDate: string;
  maxParticipants: number;
  participantsCount: number;
  entryFee: number;
  totalPrizePool: number;
  prizes: {
    rank: number;
    coins: number;
    badge?: string;
    description?: string;
  }[];
  rules: {
    minGamesRequired: number;
    maxGamesPerDay: number;
    scoringMethod: string;
  };
  featured: boolean;
  participants: {
    user: any;
    score: number;
    gamesPlayed: number;
    prizeAwarded: boolean;
    joinedAt: string;
    lastPlayedAt?: string;
  }[];
  createdAt: string;
  updatedAt: string;
}

export interface TournamentQuery {
  page?: number;
  limit?: number;
  status?: string;
  type?: string;
}

export interface TournamentListResponse {
  tournaments: TournamentAdmin[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

class TournamentAdminService {
  async getAll(query: TournamentQuery = {}): Promise<TournamentListResponse> {
    try {
      if (__DEV__) console.log('[Tournaments] Fetching with query:', query);

      const params = new URLSearchParams();
      if (query.page) params.append('page', query.page.toString());
      if (query.limit) params.append('limit', query.limit.toString());
      if (query.status) params.append('status', query.status);
      if (query.type) params.append('type', query.type);

      const endpoint = `admin/tournaments${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await apiClient.get<TournamentListResponse>(endpoint);

      if (response.success && response.data) {
        if (__DEV__) console.log('[Tournaments] Fetched:', response.data.tournaments?.length);
        return response.data;
      }

      throw new Error(response.message || 'Failed to fetch tournaments');
    } catch (error: any) {
      if (__DEV__) console.error('[Tournaments] List error:', error.message);
      throw new Error(error.message || 'Failed to fetch tournaments');
    }
  }

  async getById(id: string): Promise<TournamentAdmin> {
    try {
      const response = await apiClient.get<{ tournament: TournamentAdmin }>(`admin/tournaments/${id}`);

      if (response.success && response.data?.tournament) {
        return response.data.tournament;
      }

      throw new Error(response.message || 'Tournament not found');
    } catch (error: any) {
      if (__DEV__) console.error('[Tournaments] Get error:', error.message);
      throw new Error(error.message || 'Failed to fetch tournament');
    }
  }

  async create(data: Partial<TournamentAdmin>): Promise<TournamentAdmin> {
    try {
      if (__DEV__) console.log('[Tournaments] Creating:', data.name);
      const response = await apiClient.post<{ tournament: TournamentAdmin }>('admin/tournaments', data);

      if (response.success && response.data?.tournament) {
        return response.data.tournament;
      }

      throw new Error(response.message || 'Failed to create tournament');
    } catch (error: any) {
      if (__DEV__) console.error('[Tournaments] Create error:', error.message);
      throw new Error(error.message || 'Failed to create tournament');
    }
  }

  async update(id: string, data: Partial<TournamentAdmin>): Promise<TournamentAdmin> {
    try {
      if (__DEV__) console.log('[Tournaments] Updating:', id);
      const response = await apiClient.put<{ tournament: TournamentAdmin }>(`admin/tournaments/${id}`, data);

      if (response.success && response.data?.tournament) {
        return response.data.tournament;
      }

      throw new Error(response.message || 'Failed to update tournament');
    } catch (error: any) {
      if (__DEV__) console.error('[Tournaments] Update error:', error.message);
      throw new Error(error.message || 'Failed to update tournament');
    }
  }

  async delete(id: string): Promise<void> {
    try {
      if (__DEV__) console.log('[Tournaments] Deleting:', id);
      const response = await apiClient.delete(`admin/tournaments/${id}`);

      if (!response.success) {
        throw new Error(response.message || 'Failed to delete tournament');
      }
    } catch (error: any) {
      if (__DEV__) console.error('[Tournaments] Delete error:', error.message);
      throw new Error(error.message || 'Failed to delete tournament');
    }
  }

  async activate(id: string): Promise<TournamentAdmin> {
    try {
      if (__DEV__) console.log('[Tournaments] Activating:', id);
      const response = await apiClient.post<{ tournament: TournamentAdmin }>(`admin/tournaments/${id}/activate`);

      if (response.success && response.data?.tournament) {
        return response.data.tournament;
      }

      throw new Error(response.message || 'Failed to activate tournament');
    } catch (error: any) {
      if (__DEV__) console.error('[Tournaments] Activate error:', error.message);
      throw new Error(error.message || 'Failed to activate tournament');
    }
  }

  async cancel(id: string): Promise<TournamentAdmin> {
    try {
      if (__DEV__) console.log('[Tournaments] Cancelling:', id);
      const response = await apiClient.post<{ tournament: TournamentAdmin }>(`admin/tournaments/${id}/cancel`);

      if (response.success && response.data?.tournament) {
        return response.data.tournament;
      }

      throw new Error(response.message || 'Failed to cancel tournament');
    } catch (error: any) {
      if (__DEV__) console.error('[Tournaments] Cancel error:', error.message);
      throw new Error(error.message || 'Failed to cancel tournament');
    }
  }

  async clone(id: string, overrides?: { name?: string; startDate?: string; endDate?: string }): Promise<TournamentAdmin> {
    try {
      if (__DEV__) console.log('[Tournaments] Cloning:', id);
      const response = await apiClient.post<{ tournament: TournamentAdmin }>(`admin/tournaments/${id}/clone`, overrides || {});

      if (response.success && response.data?.tournament) {
        return response.data.tournament;
      }

      throw new Error(response.message || 'Failed to clone tournament');
    } catch (error: any) {
      if (__DEV__) console.error('[Tournaments] Clone error:', error.message);
      throw new Error(error.message || 'Failed to clone tournament');
    }
  }

  async reactivate(id: string, startDate: string, endDate: string): Promise<TournamentAdmin> {
    try {
      if (__DEV__) console.log('[Tournaments] Reactivating:', id);
      const response = await apiClient.post<{ tournament: TournamentAdmin }>(`admin/tournaments/${id}/reactivate`, { startDate, endDate });

      if (response.success && response.data?.tournament) {
        return response.data.tournament;
      }

      throw new Error(response.message || 'Failed to reactivate tournament');
    } catch (error: any) {
      if (__DEV__) console.error('[Tournaments] Reactivate error:', error.message);
      throw new Error(error.message || 'Failed to reactivate tournament');
    }
  }

  async getParticipants(id: string): Promise<any[]> {
    try {
      const response = await apiClient.get<{ participants: any[] }>(`admin/tournaments/${id}/participants`);

      if (response.success && response.data?.participants) {
        return response.data.participants;
      }

      return [];
    } catch (error: any) {
      if (__DEV__) console.error('[Tournaments] Participants error:', error.message);
      throw new Error(error.message || 'Failed to fetch participants');
    }
  }
}

export const tournamentAdminService = new TournamentAdminService();
export default tournamentAdminService;
