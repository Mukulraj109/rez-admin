/**
 * Table Bookings Admin API Service
 */

import { apiClient } from './apiClient';

export interface AdminTableBooking {
  _id: string;
  bookingNumber: string;
  storeId: { _id: string; name: string; logo?: string };
  userId: { profile?: { firstName?: string; lastName?: string }; phoneNumber?: string };
  bookingDate: string;
  bookingTime: string;
  partySize: number;
  customerName: string;
  customerPhone: string;
  specialRequests?: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  preOrderId?: string;
  preOrderStatus?: string;
  advancePaymentAmount?: number;
  createdAt: string;
}

export const tableBookingAdminService = {
  async getBookings(
    page = 1,
    limit = 20,
    filters: { status?: string; storeId?: string; date?: string } = {}
  ): Promise<{ bookings: AdminTableBooking[]; pagination: any }> {
    try {
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('limit', String(limit));
      if (filters.status) params.append('status', filters.status);
      if (filters.storeId) params.append('storeId', filters.storeId);
      if (filters.date) params.append('date', filters.date);

      const response = await apiClient.get<any>(`/table-bookings/admin?${params.toString()}`);
      if (response.success && response.data) {
        return {
          bookings: response.data.bookings || [],
          pagination: response.data.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 },
        };
      }
      throw new Error(response.message || 'Failed to fetch table bookings');
    } catch (error: any) {
      if (__DEV__) console.error('[TableBookingAdmin] getBookings error:', error);
      throw error;
    }
  },
};

export default tableBookingAdminService;
