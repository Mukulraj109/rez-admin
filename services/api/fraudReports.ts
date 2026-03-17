import { apiClient } from './apiClient';

export interface FraudReportUser {
  _id: string;
  fullName?: string;
  phoneNumber?: string;
}

export interface FraudReportAssignee {
  _id: string;
  fullName?: string;
}

export interface FraudReportNote {
  note: string;
  addedBy: { _id: string; fullName?: string };
  addedAt: string;
}

export interface FraudReport {
  _id: string;
  user: FraudReportUser;
  category: 'unauthorized_transaction' | 'account_takeover' | 'phishing' | 'fake_merchant' | 'counterfeit_product' | 'other';
  description: string;
  evidence: string[];
  status: 'new' | 'investigating' | 'resolved' | 'dismissed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignedTo?: FraudReportAssignee;
  internalNotes: FraudReportNote[];
  resolution?: string;
  createdAt: string;
  updatedAt: string;
}

interface ListFraudReportsResponse {
  reports: FraudReport[];
  total: number;
  page: number;
  pages: number;
}

class FraudReportAdminService {
  async list(filters?: {
    page?: number;
    limit?: number;
    status?: string;
    priority?: string;
    category?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<ListFraudReportsResponse> {
    try {
      let url = 'admin/fraud-reports';
      const params: string[] = [];

      if (filters?.page) params.push(`page=${filters.page}`);
      if (filters?.limit) params.push(`limit=${filters.limit}`);
      if (filters?.status) params.push(`status=${encodeURIComponent(filters.status)}`);
      if (filters?.priority) params.push(`priority=${encodeURIComponent(filters.priority)}`);
      if (filters?.category) params.push(`category=${encodeURIComponent(filters.category)}`);
      if (filters?.dateFrom) params.push(`dateFrom=${encodeURIComponent(filters.dateFrom)}`);
      if (filters?.dateTo) params.push(`dateTo=${encodeURIComponent(filters.dateTo)}`);

      if (params.length > 0) url += `?${params.join('&')}`;

      const response = await apiClient.get<ListFraudReportsResponse>(url);
      if (response.success && response.data) return response.data;
      return { reports: [], total: 0, page: 1, pages: 0 };
    } catch (error) {
      if (__DEV__) console.error('[Fraud Reports Admin] Error listing reports:', error);
      return { reports: [], total: 0, page: 1, pages: 0 };
    }
  }

  async getById(id: string): Promise<FraudReport | null> {
    try {
      const response = await apiClient.get<{ report: FraudReport }>(`admin/fraud-reports/${id}`);
      if (response.success && response.data) return response.data.report;
      return null;
    } catch (error) {
      if (__DEV__) console.error('[Fraud Reports Admin] Error fetching report:', error);
      return null;
    }
  }

  async updateStatus(id: string, status: string): Promise<boolean> {
    try {
      const response = await apiClient.put(`admin/fraud-reports/${id}/status`, { status });
      return response.success;
    } catch (error) {
      if (__DEV__) console.error('[Fraud Reports Admin] Error updating status:', error);
      return false;
    }
  }

  async updatePriority(id: string, priority: string): Promise<boolean> {
    try {
      const response = await apiClient.put(`admin/fraud-reports/${id}/priority`, { priority });
      return response.success;
    } catch (error) {
      if (__DEV__) console.error('[Fraud Reports Admin] Error updating priority:', error);
      return false;
    }
  }

  async addNote(id: string, note: string): Promise<boolean> {
    try {
      const response = await apiClient.post(`admin/fraud-reports/${id}/notes`, { note });
      return response.success;
    } catch (error) {
      if (__DEV__) console.error('[Fraud Reports Admin] Error adding note:', error);
      return false;
    }
  }
}

export const fraudReportAdminService = new FraudReportAdminService();
export default fraudReportAdminService;
