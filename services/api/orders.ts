import { apiClient } from './apiClient';

export interface Order {
  _id: string;
  orderNumber: string;
  user: {
    _id: string;
    profile?: {
      firstName?: string;
      lastName?: string;
    };
    phoneNumber: string;
    email?: string;
  };
  store: {
    _id: string;
    name: string;
    merchantId: string;
  };
  items: Array<{
    product: {
      _id: string;
      name: string;
    };
    variant?: {
      name: string;
    };
    quantity: number;
    price: number;
    total: number;
  }>;
  totals: {
    subtotal: number;
    tax: number;
    deliveryFee: number;
    discount: number;
    cashback: number;
    total: number;
    platformFee: number;
    merchantPayout: number;
  };
  payment?: {
    method: string;
    status: string;
    coinsUsed?: {
      rezCoins?: number;
      promoCoins?: number;
      storePromoCoins?: number;
      totalCoinsValue?: number;
    };
  };
  status: 'placed' | 'confirmed' | 'preparing' | 'ready' | 'dispatched' | 'delivered' | 'cancelled' | 'returned' | 'refunded';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  paymentMethod: string;
  deliveryType: 'pickup' | 'delivery';
  fulfillmentType?: 'delivery' | 'pickup' | 'drive_thru' | 'dine_in';
  fulfillmentDetails?: {
    storeAddress?: string;
    tableNumber?: string;
    vehicleInfo?: string;
    estimatedReadyTime?: string;
    pickupInstructions?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface OrderStats {
  total: number;
  today: number;
  thisWeek: number;
  thisMonth: number;
  byStatus: {
    pending: number;
    confirmed: number;
    preparing: number;
    ready: number;
    out_for_delivery: number;
    delivered: number;
    cancelled: number;
    refunded: number;
  };
  revenue: {
    today: number;
    thisWeek: number;
    thisMonth: number;
    totalPlatformFees: number;
  };
}

export interface OrdersListResponse {
  orders: Order[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

class OrdersService {
  /**
   * Get list of orders
   */
  async getOrders(
    page: number = 1,
    limit: number = 20,
    status?: string,
    merchantId?: string,
    search?: string,
    fulfillmentType?: string
  ): Promise<OrdersListResponse> {
    try {
      let url = `admin/orders?page=${page}&limit=${limit}`;
      if (status) url += `&status=${status}`;
      if (merchantId) url += `&merchantId=${merchantId}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (fulfillmentType) url += `&fulfillmentType=${fulfillmentType}`;

      console.log('[Orders] Fetching orders list...');
      const response = await apiClient.get<Order[]>(url);

      if (response.success) {
        console.log('[Orders] Orders fetched successfully');
        // Backend returns { data: { orders: [...], pagination: {...} } }
        const nested = response.data as any;
        return {
          orders: nested?.orders || (Array.isArray(nested) ? nested : []),
          pagination: nested?.pagination || response.pagination || { page, limit, total: 0, totalPages: 0 }
        };
      }

      throw new Error(response.message || 'Failed to get orders');
    } catch (error: any) {
      console.error('[Orders] Get orders error:', error.message);
      throw new Error(error.message || 'Failed to get orders');
    }
  }

  /**
   * Get single order by ID
   */
  async getOrder(orderId: string): Promise<Order> {
    try {
      console.log('[Orders] Fetching order:', orderId);
      const response = await apiClient.get<Order>(`admin/orders/${orderId}`);

      if (response.success && response.data) {
        return response.data;
      }

      throw new Error(response.message || 'Failed to get order');
    } catch (error: any) {
      console.error('[Orders] Get order error:', error.message);
      throw new Error(error.message || 'Failed to get order');
    }
  }

  /**
   * Get order statistics
   */
  async getStats(): Promise<OrderStats> {
    try {
      console.log('[Orders] Fetching order stats...');
      const response = await apiClient.get<OrderStats>('admin/orders/stats');

      if (response.success && response.data) {
        console.log('[Orders] Stats fetched successfully');
        return response.data;
      }

      throw new Error(response.message || 'Failed to get order stats');
    } catch (error: any) {
      console.error('[Orders] Get stats error:', error.message);
      throw new Error(error.message || 'Failed to get order stats');
    }
  }

  /**
   * Refund an order
   */
  async refundOrder(orderId: string, reason: string): Promise<{ success: boolean; message: string }> {
    try {
      console.log('[Orders] Refunding order:', orderId);
      const response = await apiClient.post<any>(`admin/orders/${orderId}/refund`, { reason });

      return {
        success: response.success,
        message: response.message || 'Order refunded'
      };
    } catch (error: any) {
      console.error('[Orders] Refund order error:', error.message);
      throw new Error(error.message || 'Failed to refund order');
    }
  }

  /**
   * Update order status
   */
  async updateOrderStatus(orderId: string, status: string, notes?: string): Promise<{ success: boolean; message: string }> {
    try {
      console.log('[Orders] Updating order status:', orderId, '->', status);
      const response = await apiClient.put<any>(`admin/orders/${orderId}/status`, { status, notes });

      return {
        success: response.success,
        message: response.message || 'Status updated'
      };
    } catch (error: any) {
      console.error('[Orders] Update status error:', error.message);
      throw new Error(error.message || 'Failed to update order status');
    }
  }

  /**
   * Cancel an order
   */
  async cancelOrder(orderId: string, reason: string): Promise<{ success: boolean; message: string }> {
    try {
      console.log('[Orders] Cancelling order:', orderId);
      const response = await apiClient.post<any>(`admin/orders/${orderId}/cancel`, { reason });

      return {
        success: response.success,
        message: response.message || 'Order cancelled'
      };
    } catch (error: any) {
      console.error('[Orders] Cancel order error:', error.message);
      throw new Error(error.message || 'Failed to cancel order');
    }
  }
}

export const ordersService = new OrdersService();
export default ordersService;
