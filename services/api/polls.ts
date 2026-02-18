import { apiClient } from './apiClient';

export interface PollOption {
  id: string;
  text: string;
  imageUrl?: string;
  voteCount: number;
}

export interface Poll {
  _id: string;
  title: string;
  description?: string;
  options: PollOption[];
  category?: string;
  store?: {
    _id: string;
    name: string;
    logo?: string;
  };
  totalVotes: number;
  coinsPerVote: number;
  isDaily: boolean;
  tags: string[];
  status: 'draft' | 'active' | 'closed' | 'archived';
  startsAt: string;
  endsAt: string;
  createdAt: string;
}

export interface PollListResponse {
  polls: Poll[];
  pagination: {
    current: number;
    pages: number;
    total: number;
    hasMore: boolean;
  };
}

export interface CreatePollPayload {
  title: string;
  description?: string;
  options: Array<{ text: string; imageUrl?: string }>;
  category?: string;
  storeId?: string;
  startsAt: string;
  endsAt: string;
  coinsPerVote?: number;
  isDaily?: boolean;
  tags?: string[];
}

class PollsService {
  async getPolls(
    page: number = 1,
    limit: number = 20,
    status?: string
  ): Promise<PollListResponse> {
    try {
      let url = `polls/active?page=${page}&limit=${limit}`;
      // For admin, we want all polls not just active ones
      // Use the active endpoint but we'll also fetch by status
      if (status && status !== 'all') {
        url = `polls/active?page=${page}&limit=${limit}&status=${status}`;
      }

      const response = await apiClient.get<any>(url);

      if (response.success) {
        const nested = response.data as any;
        return {
          polls: nested?.polls || [],
          pagination: nested?.pagination || { current: page, pages: 0, total: 0, hasMore: false },
        };
      }
      throw new Error(response.message || 'Failed to fetch polls');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch polls');
    }
  }

  async createPoll(payload: CreatePollPayload): Promise<{ success: boolean; poll: Poll }> {
    try {
      const response = await apiClient.post<any>('polls', payload);

      if (response.success) {
        return { success: true, poll: response.data?.poll || response.data };
      }
      throw new Error(response.message || 'Failed to create poll');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to create poll');
    }
  }

  async updatePoll(
    pollId: string,
    updates: Partial<{
      title: string;
      description: string;
      status: string;
      startsAt: string;
      endsAt: string;
      coinsPerVote: number;
      isDaily: boolean;
      tags: string[];
      category: string;
    }>
  ): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiClient.patch<any>(`polls/${pollId}`, updates);

      return {
        success: response.success,
        message: response.message || 'Poll updated successfully',
      };
    } catch (error: any) {
      throw new Error(error.message || 'Failed to update poll');
    }
  }

  async archivePoll(pollId: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiClient.delete<any>(`polls/${pollId}`);

      return {
        success: response.success,
        message: response.message || 'Poll archived successfully',
      };
    } catch (error: any) {
      throw new Error(error.message || 'Failed to archive poll');
    }
  }
}

export const pollsService = new PollsService();
export default pollsService;
