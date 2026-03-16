import { apiClient } from './apiClient';

export interface SupportMacro {
  _id: string;
  title: string;
  content: string;
  category: string;
  audience: 'user' | 'merchant' | 'all';
  shortcut?: string;
  tags: string[];
  isActive: boolean;
  usageCount: number;
  sortOrder: number;
  createdAt: string;
}

class SupportMacrosService {
  async listMacros(category?: string, audience?: string): Promise<SupportMacro[]> {
    try {
      let url = 'admin/support/macros';
      const params: string[] = [];
      if (category) params.push(`category=${category}`);
      if (audience) params.push(`audience=${audience}`);
      if (params.length) url += `?${params.join('&')}`;

      const response = await apiClient.get<{ macros: SupportMacro[] }>(url);
      if (response.success && response.data) {
        return response.data.macros;
      }
      throw new Error(response.message || 'Failed to fetch macros');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch macros');
    }
  }

  async createMacro(data: {
    title: string;
    content: string;
    category?: string;
    audience?: string;
    shortcut?: string;
    tags?: string[];
  }): Promise<SupportMacro> {
    try {
      const response = await apiClient.post<{ macro: SupportMacro }>('admin/support/macros', data);
      if (response.success && response.data) {
        return response.data.macro;
      }
      throw new Error(response.message || 'Failed to create macro');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to create macro');
    }
  }

  async updateMacro(id: string, data: Partial<{
    title: string;
    content: string;
    category: string;
    audience: string;
    shortcut: string;
    tags: string[];
    isActive: boolean;
    sortOrder: number;
  }>): Promise<SupportMacro> {
    try {
      const response = await apiClient.put<{ macro: SupportMacro }>(`admin/support/macros/${id}`, data);
      if (response.success && response.data) {
        return response.data.macro;
      }
      throw new Error(response.message || 'Failed to update macro');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to update macro');
    }
  }

  async deleteMacro(id: string): Promise<void> {
    try {
      const response = await apiClient.delete(`admin/support/macros/${id}`);
      if (!response.success) throw new Error(response.message || 'Failed to delete macro');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to delete macro');
    }
  }

  async escalateTicket(ticketId: string, team: string, reason: string): Promise<any> {
    try {
      const response = await apiClient.post<any>(`admin/support/tickets/${ticketId}/escalate`, { team, reason });
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.message || 'Failed to escalate ticket');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to escalate ticket');
    }
  }
}

export const supportMacrosService = new SupportMacrosService();
export default supportMacrosService;
