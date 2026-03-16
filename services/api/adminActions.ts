import { apiClient } from './apiClient';

export type AdminActionType = 'manual_adjustment' | 'bulk_credit' | 'freeze_override' | 'config_change' | 'cashback_reversal';
export type AdminActionStatus = 'pending_approval' | 'approved' | 'rejected' | 'executed';

export interface AdminActionItem {
  _id: string;
  actionType: AdminActionType;
  initiatorId: {
    _id: string;
    fullName?: string;
    email?: string;
    phoneNumber?: string;
  };
  approverId?: {
    _id: string;
    fullName?: string;
    email?: string;
    phoneNumber?: string;
  };
  status: AdminActionStatus;
  payload: Record<string, any>;
  reason: string;
  threshold: number;
  rejectionReason?: string;
  failureReason?: string;
  executedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface ActionsListResponse {
  actions: AdminActionItem[];
  pagination: Pagination;
}

class AdminActionsService {
  async getPendingActions(
    page: number = 1,
    limit: number = 20,
    actionType?: AdminActionType,
  ): Promise<ActionsListResponse> {
    try {
      let url = `admin/admin-actions?page=${page}&limit=${limit}`;
      if (actionType) url += `&actionType=${actionType}`;

      const response = await apiClient.get<ActionsListResponse>(url);
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.message || 'Failed to fetch pending actions');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch pending actions');
    }
  }

  async getActionHistory(
    page: number = 1,
    limit: number = 20,
    status?: AdminActionStatus,
    actionType?: AdminActionType,
  ): Promise<ActionsListResponse> {
    try {
      let url = `admin/admin-actions/history?page=${page}&limit=${limit}`;
      if (status) url += `&status=${status}`;
      if (actionType) url += `&actionType=${actionType}`;

      const response = await apiClient.get<ActionsListResponse>(url);
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.message || 'Failed to fetch action history');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch action history');
    }
  }

  async approveAction(actionId: string): Promise<AdminActionItem> {
    try {
      const response = await apiClient.post<{ action: AdminActionItem }>(
        `admin/admin-actions/${actionId}/approve`,
      );
      if (response.success && response.data) {
        return response.data.action;
      }
      throw new Error(response.message || 'Failed to approve action');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to approve action');
    }
  }

  async rejectAction(actionId: string, rejectionReason: string): Promise<AdminActionItem> {
    try {
      const response = await apiClient.post<{ action: AdminActionItem }>(
        `admin/admin-actions/${actionId}/reject`,
        { rejectionReason },
      );
      if (response.success && response.data) {
        return response.data.action;
      }
      throw new Error(response.message || 'Failed to reject action');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to reject action');
    }
  }

  async getApprovalThreshold(): Promise<number> {
    try {
      const response = await apiClient.get<{ threshold: number }>(
        'admin/admin-actions/threshold',
      );
      if (response.success && response.data) {
        return response.data.threshold;
      }
      return 50000; // Fallback
    } catch {
      return 50000;
    }
  }
}

export const adminActionsService = new AdminActionsService();
export default adminActionsService;
