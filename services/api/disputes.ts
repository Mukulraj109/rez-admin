import apiClient from './apiClient';

export interface AdminDispute {
  _id: string;
  disputeNumber: string;
  user: any;
  targetType: string;
  targetId: string;
  targetRef: string;
  store?: any;
  merchant?: string;
  reason: string;
  description: string;
  amount: number;
  currency: string;
  status: string;
  priority: string;
  evidence: Array<{
    submittedBy: string;
    submitterType: string;
    description: string;
    attachments: string[];
    submittedAt: string;
  }>;
  timeline: Array<{
    action: string;
    performedBy?: string;
    performerType: string;
    details?: string;
    timestamp: string;
  }>;
  assignedTo?: any;
  escalatedTo?: any;
  escalationReason?: string;
  resolution?: {
    decision: string;
    amount: number;
    reason: string;
    resolvedBy: string;
    resolvedAt: string;
    refundTransactionId?: string;
  };
  merchantResponse?: {
    response: string;
    attachments: string[];
    respondedAt: string;
  };
  rewardLocked: boolean;
  autoResolveAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface DisputeStats {
  open: number;
  underReview: number;
  escalated: number;
  resolvedToday: number;
  avgResolutionHours: number;
  totalDisputed: number;
  refundRate: number;
}

export const disputesService = {
  async getDisputes(params?: {
    page?: number;
    limit?: number;
    status?: string;
    priority?: string;
    assignedTo?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.status) query.set('status', params.status);
    if (params?.priority) query.set('priority', params.priority);
    if (params?.assignedTo) query.set('assignedTo', params.assignedTo);
    if (params?.search) query.set('search', params.search);
    if (params?.dateFrom) query.set('dateFrom', params.dateFrom);
    if (params?.dateTo) query.set('dateTo', params.dateTo);
    return apiClient.get(`/admin/disputes?${query.toString()}`);
  },

  async getStats() {
    return apiClient.get<DisputeStats>('/admin/disputes/stats');
  },

  async getDispute(id: string) {
    return apiClient.get<AdminDispute>(`/admin/disputes/${id}`);
  },

  async assign(id: string) {
    return apiClient.post(`/admin/disputes/${id}/assign`, {});
  },

  async resolve(id: string, data: { decision: string; amount?: number; reason: string }) {
    return apiClient.post(`/admin/disputes/${id}/resolve`, data);
  },

  async escalate(id: string, reason: string) {
    return apiClient.post(`/admin/disputes/${id}/escalate`, { reason });
  },

  async addNote(id: string, note: string) {
    return apiClient.post(`/admin/disputes/${id}/note`, { note });
  },
};

export default disputesService;
