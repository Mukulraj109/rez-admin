/**
 * Admin API Service - Privé Concierge
 */

import { apiClient } from './apiClient';

export interface ConciergeTicket {
  _id: string;
  ticketNumber: string;
  subject: string;
  status: string;
  priority: string;
  priveTier: string;
  slaHours: number;
  slaDeadline: string;
  slaBreached: boolean;
  user: {
    _id: string;
    fullName?: string;
    phoneNumber?: string;
    profile?: { avatar?: string };
  };
  assignedTo?: {
    _id: string;
    name: string;
    email: string;
  };
  messages: Array<{
    sender: string;
    senderType: string;
    message: string;
    timestamp: string;
  }>;
  createdAt: string;
  resolvedAt?: string;
}

export interface ConciergeAnalytics {
  period: string;
  totalTickets: number;
  openTickets: number;
  slaBreached: number;
  slaComplianceRate: number;
  avgResponseHours: number | null;
  tierBreakdown: Array<{
    tier: string;
    count: number;
    breached: number;
    complianceRate: number;
  }>;
}

class PriveConciergeAdminApi {
  async getTickets(params?: {
    page?: number;
    limit?: number;
    status?: string;
    tier?: string;
    slaBreached?: boolean;
    search?: string;
  }): Promise<{ tickets: ConciergeTicket[]; pagination: any }> {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.status) query.set('status', params.status);
    if (params?.tier) query.set('tier', params.tier);
    if (params?.slaBreached !== undefined) query.set('slaBreached', String(params.slaBreached));
    if (params?.search) query.set('search', params.search);

    const response = await apiClient.get<{ tickets: ConciergeTicket[]; pagination: any }>(
      `/admin/prive/concierge/tickets?${query.toString()}`
    );
    return response.data;
  }

  async assignTicket(id: string, assignedTo: string): Promise<ConciergeTicket> {
    const response = await apiClient.put<{ ticket: ConciergeTicket }>(
      `/admin/prive/concierge/tickets/${id}/assign`,
      { assignedTo }
    );
    return response.data.ticket;
  }

  async respondToTicket(id: string, message: string): Promise<ConciergeTicket> {
    const response = await apiClient.post<{ ticket: ConciergeTicket }>(
      `/admin/prive/concierge/tickets/${id}/respond`,
      { message }
    );
    return response.data.ticket;
  }

  async resolveTicket(id: string, resolution?: string): Promise<ConciergeTicket> {
    const response = await apiClient.post<{ ticket: ConciergeTicket }>(
      `/admin/prive/concierge/tickets/${id}/resolve`,
      { resolution }
    );
    return response.data.ticket;
  }

  async getAnalytics(): Promise<ConciergeAnalytics> {
    const response = await apiClient.get<ConciergeAnalytics>(
      '/admin/prive/concierge/analytics'
    );
    return response.data;
  }
}

export const priveConciergeAdminApi = new PriveConciergeAdminApi();
