import { apiClient } from './apiClient';

export interface SupportTicketItem {
  _id: string;
  ticketNumber: string;
  user: { _id: string; fullName?: string; phoneNumber?: string };
  subject: string;
  category: string;
  priority: string;
  status: string;
  assignedTo?: { _id: string; fullName?: string };
  messages: Array<{
    sender: string;
    senderType: string;
    message: string;
    attachments?: string[];
    timestamp: string;
    isRead: boolean;
  }>;
  rating?: { score: number; comment?: string };
  attachments?: string[];
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SupportStatistics {
  total: number;
  byStatus: Record<string, number>;
  byCategory: Record<string, number>;
  averageRating: number;
  ratingCount: number;
  openCount: number;
  inProgressCount: number;
}

interface ListTicketsResponse {
  tickets: SupportTicketItem[];
  total: number;
  page: number;
  pages: number;
}

class SupportAdminService {
  async listTickets(filters?: {
    page?: number;
    limit?: number;
    status?: string;
    category?: string;
    priority?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<ListTicketsResponse> {
    try {
      let url = 'admin/support/tickets';
      const params: string[] = [];

      if (filters?.page) params.push(`page=${filters.page}`);
      if (filters?.limit) params.push(`limit=${filters.limit}`);
      if (filters?.status) params.push(`status=${encodeURIComponent(filters.status)}`);
      if (filters?.category) params.push(`category=${encodeURIComponent(filters.category)}`);
      if (filters?.priority) params.push(`priority=${encodeURIComponent(filters.priority)}`);
      if (filters?.search) params.push(`search=${encodeURIComponent(filters.search)}`);
      if (filters?.dateFrom) params.push(`dateFrom=${encodeURIComponent(filters.dateFrom)}`);
      if (filters?.dateTo) params.push(`dateTo=${encodeURIComponent(filters.dateTo)}`);

      if (params.length > 0) url += `?${params.join('&')}`;

      const response = await apiClient.get<ListTicketsResponse>(url);
      if (response.success && response.data) return response.data;
      return { tickets: [], total: 0, page: 1, pages: 0 };
    } catch (error) {
      console.error('[Support Admin] Error listing tickets:', error);
      return { tickets: [], total: 0, page: 1, pages: 0 };
    }
  }

  async getTicket(id: string): Promise<SupportTicketItem | null> {
    try {
      const response = await apiClient.get<{ ticket: SupportTicketItem }>(`admin/support/tickets/${id}`);
      if (response.success && response.data) return response.data.ticket;
      return null;
    } catch (error) {
      console.error('[Support Admin] Error fetching ticket:', error);
      return null;
    }
  }

  async assignTicket(id: string, agentId: string): Promise<boolean> {
    try {
      const response = await apiClient.put(`admin/support/tickets/${id}/assign`, { agentId });
      return response.success;
    } catch (error) {
      console.error('[Support Admin] Error assigning ticket:', error);
      return false;
    }
  }

  async replyToTicket(id: string, message: string): Promise<boolean> {
    try {
      const response = await apiClient.post(`admin/support/tickets/${id}/messages`, { message });
      return response.success;
    } catch (error) {
      console.error('[Support Admin] Error replying to ticket:', error);
      return false;
    }
  }

  async updateStatus(id: string, status: string): Promise<boolean> {
    try {
      const response = await apiClient.put(`admin/support/tickets/${id}/status`, { status });
      return response.success;
    } catch (error) {
      console.error('[Support Admin] Error updating status:', error);
      return false;
    }
  }

  async getAgents(): Promise<Array<{ _id: string; fullName: string; email: string; openTickets: number }>> {
    try {
      const response = await apiClient.get<{ agents: Array<{ _id: string; fullName: string; email: string; openTickets: number }> }>('admin/support/agents');
      if (response.success && response.data) return response.data.agents || [];
      return [];
    } catch (error) {
      console.error('[Support Admin] Error fetching agents:', error);
      return [];
    }
  }

  async markAsRead(id: string): Promise<boolean> {
    try {
      const response = await apiClient.post(`admin/support/tickets/${id}/read`);
      return response.success;
    } catch (error) {
      console.error('[Support Admin] Error marking as read:', error);
      return false;
    }
  }

  async getStatistics(): Promise<SupportStatistics | null> {
    try {
      const response = await apiClient.get<SupportStatistics>('admin/support/statistics');
      if (response.success && response.data) return response.data;
      return null;
    } catch (error) {
      console.error('[Support Admin] Error fetching statistics:', error);
      return null;
    }
  }
}

export const supportAdminService = new SupportAdminService();
export default supportAdminService;
