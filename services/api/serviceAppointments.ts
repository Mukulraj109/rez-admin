/**
 * Service Appointments Admin API Service
 */

import { apiClient } from './apiClient';

export interface AdminServiceAppointment {
  _id: string;
  appointmentNumber: string;
  store: { _id: string; name: string; logo?: string };
  user: { profile?: { firstName?: string; lastName?: string }; phoneNumber?: string };
  serviceType: string;
  appointmentDate: string;
  appointmentTime: string;
  duration: number;
  customerName: string;
  customerPhone: string;
  specialInstructions?: string;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  staffMember?: string;
  createdAt: string;
}

export const serviceAppointmentAdminService = {
  async getAppointments(
    page = 1,
    limit = 20,
    filters: { status?: string; storeId?: string; date?: string } = {}
  ): Promise<{ appointments: AdminServiceAppointment[]; pagination: any }> {
    try {
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('limit', String(limit));
      if (filters.status) params.append('status', filters.status);
      if (filters.storeId) params.append('storeId', filters.storeId);
      if (filters.date) params.append('date', filters.date);

      const response = await apiClient.get<any>(`/admin/service-appointments?${params.toString()}`);
      if (response.success && response.data) {
        return {
          appointments: response.data.appointments || [],
          pagination: response.data.pagination || { page: 1, limit: 20, total: 0, pages: 0 },
        };
      }
      throw new Error(response.message || 'Failed to fetch service appointments');
    } catch (error: any) {
      if (__DEV__) console.error('[ServiceAppointmentAdmin] getAppointments error:', error);
      throw error;
    }
  },

  async updateStatus(id: string, status: string): Promise<void> {
    await apiClient.put(`/admin/service-appointments/${id}/status`, { status });
  },
};
