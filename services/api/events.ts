import { apiClient } from './apiClient';

// ============================================
// INTERFACES
// ============================================

// Event status type
export type EventStatus = 'draft' | 'published' | 'cancelled' | 'completed';

// Event interface
export interface AdminEvent {
  _id: string;
  title: string;
  slug: string;
  description?: string;
  shortDescription?: string;
  category?: EventCategory | string;
  categoryId?: string;
  image?: string;
  images?: string[];
  date: string;
  endDate?: string;
  time?: string;
  endTime?: string;
  location?: {
    type?: string;
    name?: string;
    address?: string;
    city?: string;
    coordinates?: { lat: number; lng: number };
  };
  isOnline: boolean;
  onlineLink?: string;
  price: number;
  currency?: string;
  isFree: boolean;
  slots?: {
    total: number;
    booked: number;
    available: number;
  };
  status: EventStatus;
  isFeatured: boolean;
  featuredPriority?: number;
  organizer?: {
    _id: string;
    name: string;
    logo?: string;
  };
  tags?: string[];
  bookingCount?: number;
  viewCount?: number;
  favoriteCount?: number;
  createdAt: string;
  updatedAt: string;
}

// Event Category interface
export interface EventCategory {
  _id: string;
  name: string;
  slug: string;
  icon?: string;
  color?: string;
  gradient?: string[];
  description?: string;
  isActive: boolean;
  isFeatured: boolean;
  sortOrder: number;
  eventCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

// Event Booking interface
export interface EventBooking {
  _id: string;
  event: string | AdminEvent;
  userId: {
    _id: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    email?: string;
  };
  tickets: number;
  totalAmount: number;
  amount?: number;
  status: 'confirmed' | 'cancelled' | 'pending' | 'checked_in';
  bookingReference?: string;
  bookingRef?: string;
  qrCode?: string;
  checkedInAt?: string;
  createdAt: string;
}

// Event Analytics interface
export interface EventAnalytics {
  totalBookings: number;
  totalRevenue: number;
  totalCheckins: number;
  totalViews: number;
  totalFavorites: number;
  bookingsByDay: Array<{ date: string; count: number }>;
  checkinRate: number;
  averageTicketsPerBooking: number;
  revenueByDay?: Array<{ date: string; amount: number }>;
}

// Reward Action type
export type RewardAction =
  | 'entry_reward'
  | 'purchase_reward'
  | 'sharing_reward'
  | 'voting_reward'
  | 'participation_reward'
  | 'checkin_reward'
  | 'review_reward';

// Event Reward Config interface
export interface EventRewardConfig {
  _id: string;
  eventId?: string | AdminEvent;
  eventName?: string;
  isGlobal: boolean;
  rewards: Array<{
    action: RewardAction;
    coins: number;
    dailyLimit?: number;
    requiresVerification: boolean;
  }>;
  isActive: boolean;
  validFrom?: string;
  validUntil?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Event Stats interface
export interface EventStats {
  total: number;
  active: number;
  featured: number;
  totalBookings: number;
  draft?: number;
  cancelled?: number;
  completed?: number;
}

// Create/Update Event request
export interface EventRequest {
  title: string;
  description?: string;
  shortDescription?: string;
  categoryId?: string;
  image?: string;
  images?: string[];
  date: string;
  endDate?: string;
  time?: string;
  endTime?: string;
  location?: {
    type?: string;
    name?: string;
    address?: string;
    city?: string;
    coordinates?: { lat: number; lng: number };
  };
  isOnline?: boolean;
  onlineLink?: string;
  price?: number;
  currency?: string;
  isFree?: boolean;
  slots?: {
    total: number;
  };
  status?: EventStatus;
  isFeatured?: boolean;
  featuredPriority?: number;
  tags?: string[];
}

// Create/Update Category request
export interface EventCategoryRequest {
  name: string;
  slug?: string;
  icon?: string;
  color?: string;
  gradient?: string[];
  description?: string;
  isActive?: boolean;
  isFeatured?: boolean;
  sortOrder?: number;
}

// Create/Update Reward Config request
export interface EventRewardConfigRequest {
  name: string;
  eventId?: string;
  rewards: Array<{
    action: RewardAction;
    coins: number;
    dailyLimit?: number;
    requiresVerification?: boolean;
  }>;
  isActive?: boolean;
  validFrom?: string;
  validUntil?: string;
}

// List response types
export interface EventsListResponse {
  events: AdminEvent[];
  stats?: EventStats;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext?: boolean;
    hasPrev?: boolean;
  };
}

// Events Query parameters
export interface EventsQuery {
  page?: number;
  limit?: number;
  status?: EventStatus;
  search?: string;
  featured?: boolean;
  isFree?: boolean;
  isOnline?: boolean;
  categoryId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Reward Action options for dropdowns
export const REWARD_ACTIONS: { value: RewardAction; label: string; icon: string }[] = [
  { value: 'entry_reward', label: 'Entry Reward', icon: 'ticket-outline' },
  { value: 'purchase_reward', label: 'Purchase Reward', icon: 'cart-outline' },
  { value: 'sharing_reward', label: 'Sharing Reward', icon: 'share-social-outline' },
  { value: 'voting_reward', label: 'Voting Reward', icon: 'thumbs-up-outline' },
  { value: 'participation_reward', label: 'Participation Reward', icon: 'people-outline' },
  { value: 'checkin_reward', label: 'Check-in Reward', icon: 'location-outline' },
  { value: 'review_reward', label: 'Review Reward', icon: 'star-outline' },
];

// ============================================
// SERVICE CLASS
// ============================================

class AdminEventsService {
  // ==========================================
  // EVENTS CRUD
  // ==========================================

  /**
   * Get events with pagination and filters
   */
  async getEvents(query: EventsQuery = {}): Promise<EventsListResponse> {
    try {
      if (__DEV__) console.log('[Events] Fetching events with query:', query);

      const params = new URLSearchParams();
      if (query.page) params.append('page', query.page.toString());
      if (query.limit) params.append('limit', query.limit.toString());
      if (query.status) params.append('status', query.status);
      if (query.search) params.append('search', query.search);
      if (query.featured !== undefined) params.append('featured', query.featured.toString());
      if (query.isFree !== undefined) params.append('isFree', query.isFree.toString());
      if (query.isOnline !== undefined) params.append('isOnline', query.isOnline.toString());
      if (query.categoryId) params.append('categoryId', query.categoryId);
      if (query.sortBy) params.append('sortBy', query.sortBy);
      if (query.sortOrder) params.append('sortOrder', query.sortOrder);

      const endpoint = `admin/events${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await apiClient.get<any>(endpoint);

      if (response.success && response.data) {
        const raw = response.data;
        if (__DEV__) console.log('[Events] Fetched successfully:', raw.events?.length || 0, 'events');
        // Backend returns { events, total, page, pages, hasMore } — map to EventsListResponse
        return {
          events: raw.events || [],
          pagination: {
            page: raw.page || query.page || 1,
            limit: query.limit || 20,
            total: raw.total || 0,
            totalPages: raw.pages || 1,
            hasNext: raw.hasMore,
          },
          stats: raw.stats,
        };
      }

      throw new Error(response.message || 'Failed to fetch events');
    } catch (error: any) {
      if (__DEV__) console.error('[Events] Get events error:', error.message);
      throw new Error(error.message || 'Failed to fetch events');
    }
  }

  /**
   * Get single event by ID
   */
  async getEventById(id: string): Promise<AdminEvent> {
    try {
      if (__DEV__) console.log('[Events] Fetching event:', id);
      const response = await apiClient.get<AdminEvent>(`admin/events/${id}`);

      if (response.success && response.data) {
        if (__DEV__) console.log('[Events] Event fetched:', response.data.title);
        return response.data;
      }

      throw new Error(response.message || 'Event not found');
    } catch (error: any) {
      if (__DEV__) console.error('[Events] Get event error:', error.message);
      throw new Error(error.message || 'Failed to fetch event');
    }
  }

  /**
   * Create new event
   */
  async createEvent(data: EventRequest): Promise<AdminEvent> {
    try {
      if (__DEV__) console.log('[Events] Creating event:', data.title);
      const response = await apiClient.post<AdminEvent>('admin/events', data);

      if (response.success && response.data) {
        if (__DEV__) console.log('[Events] Event created:', response.data._id);
        return response.data;
      }

      throw new Error(response.message || 'Failed to create event');
    } catch (error: any) {
      if (__DEV__) console.error('[Events] Create event error:', error.message);
      throw new Error(error.message || 'Failed to create event');
    }
  }

  /**
   * Update event
   */
  async updateEvent(id: string, data: Partial<EventRequest>): Promise<AdminEvent> {
    try {
      if (__DEV__) console.log('[Events] Updating event:', id);
      const response = await apiClient.put<AdminEvent>(`admin/events/${id}`, data);

      if (response.success && response.data) {
        if (__DEV__) console.log('[Events] Event updated:', response.data.title);
        return response.data;
      }

      throw new Error(response.message || 'Failed to update event');
    } catch (error: any) {
      if (__DEV__) console.error('[Events] Update event error:', error.message);
      throw new Error(error.message || 'Failed to update event');
    }
  }

  /**
   * Delete event
   */
  async deleteEvent(id: string): Promise<void> {
    try {
      if (__DEV__) console.log('[Events] Deleting event:', id);
      const response = await apiClient.delete(`admin/events/${id}`);

      if (response.success) {
        if (__DEV__) console.log('[Events] Event deleted');
        return;
      }

      throw new Error(response.message || 'Failed to delete event');
    } catch (error: any) {
      if (__DEV__) console.error('[Events] Delete event error:', error.message);
      throw new Error(error.message || 'Failed to delete event');
    }
  }

  /**
   * Update event status
   */
  async updateEventStatus(id: string, status: EventStatus): Promise<AdminEvent> {
    try {
      if (__DEV__) console.log('[Events] Updating event status:', id, '->', status);
      const response = await apiClient.put<AdminEvent>(`admin/events/${id}/status`, { status });

      if (response.success && response.data) {
        if (__DEV__) console.log('[Events] Event status updated:', response.data.status);
        return response.data;
      }

      throw new Error(response.message || 'Failed to update event status');
    } catch (error: any) {
      if (__DEV__) console.error('[Events] Update status error:', error.message);
      throw new Error(error.message || 'Failed to update event status');
    }
  }

  /**
   * Toggle featured status for event
   */
  async toggleFeatured(id: string, featured: boolean, priority?: number): Promise<AdminEvent> {
    try {
      if (__DEV__) console.log('[Events] Toggling featured:', id, '->', featured);
      const body: any = { featured };
      if (priority !== undefined) body.priority = priority;

      const response = await apiClient.put<AdminEvent>(`admin/events/${id}/featured`, body);

      if (response.success && response.data) {
        if (__DEV__) console.log('[Events] Featured toggled:', response.data.isFeatured);
        return response.data;
      }

      throw new Error(response.message || 'Failed to toggle featured status');
    } catch (error: any) {
      if (__DEV__) console.error('[Events] Toggle featured error:', error.message);
      throw new Error(error.message || 'Failed to toggle featured status');
    }
  }

  /**
   * Get bookings for an event
   */
  async getEventBookings(id: string, page: number = 1, limit: number = 20): Promise<{
    bookings: EventBooking[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    try {
      if (__DEV__) console.log('[Events] Fetching bookings for event:', id);
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', limit.toString());

      const endpoint = `admin/events/${id}/bookings?${params.toString()}`;
      const response = await apiClient.get<any>(endpoint);

      if (response.success && response.data) {
        const raw = response.data;
        if (__DEV__) console.log('[Events] Bookings fetched:', raw.bookings?.length || 0);
        // Backend returns { bookings, total, page, pages, stats }
        return {
          bookings: raw.bookings || [],
          pagination: {
            page: raw.page || page,
            limit: limit,
            total: raw.total || 0,
            totalPages: raw.pages || 1,
          },
        };
      }

      throw new Error(response.message || 'Failed to fetch bookings');
    } catch (error: any) {
      if (__DEV__) console.error('[Events] Get bookings error:', error.message);
      throw new Error(error.message || 'Failed to fetch bookings');
    }
  }

  /**
   * Get analytics for an event
   */
  async getEventAnalytics(id: string): Promise<EventAnalytics> {
    try {
      if (__DEV__) console.log('[Events] Fetching analytics for event:', id);
      const response = await apiClient.get<any>(`admin/events/${id}/analytics`);

      if (response.success && response.data) {
        const raw = response.data;
        // Backend returns { event: { analytics }, bookingStats, attendanceStats, dailyBookings }
        // Transform to flat EventAnalytics shape expected by frontend
        const bookingStats: any[] = raw.bookingStats || [];
        const attendanceStats = raw.attendanceStats || {};

        const totalBookings = bookingStats.reduce((sum: number, s: any) => sum + (s.count || 0), 0);
        const totalRevenue = bookingStats.reduce((sum: number, s: any) => sum + (s.revenue || 0), 0);
        const confirmedBookings = bookingStats.find((s: any) => s._id === 'confirmed')?.count || 0;
        const totalCheckins = attendanceStats.totalCheckedIn || 0;

        const analytics: EventAnalytics = {
          totalBookings,
          totalRevenue,
          totalCheckins,
          totalViews: raw.event?.analytics?.views || 0,
          totalFavorites: raw.event?.analytics?.favorites || 0,
          checkinRate: confirmedBookings > 0 ? totalCheckins / confirmedBookings : 0,
          averageTicketsPerBooking: totalBookings > 0 ? totalBookings / bookingStats.length : 0,
          bookingsByDay: (raw.dailyBookings || []).map((d: any) => ({
            date: d._id,
            count: d.count,
          })),
        };

        if (__DEV__) console.log('[Events] Analytics fetched and transformed');
        return analytics;
      }

      throw new Error(response.message || 'Failed to fetch analytics');
    } catch (error: any) {
      if (__DEV__) console.error('[Events] Get analytics error:', error.message);
      throw new Error(error.message || 'Failed to fetch analytics');
    }
  }

  // ==========================================
  // EVENT CATEGORIES CRUD
  // ==========================================

  /**
   * Get all event categories
   */
  async getCategories(): Promise<EventCategory[]> {
    try {
      if (__DEV__) console.log('[Events] Fetching categories...');
      const response = await apiClient.get<any>('admin/event-categories');

      if (response.success && response.data) {
        // Backend returns { categories: [...] } inside data
        const categories = response.data.categories || response.data;
        const arr = Array.isArray(categories) ? categories : [];
        if (__DEV__) console.log('[Events] Categories fetched:', arr.length);
        return arr;
      }

      throw new Error(response.message || 'Failed to fetch categories');
    } catch (error: any) {
      if (__DEV__) console.error('[Events] Get categories error:', error.message);
      throw new Error(error.message || 'Failed to fetch categories');
    }
  }

  /**
   * Create new event category
   */
  async createCategory(data: EventCategoryRequest): Promise<EventCategory> {
    try {
      if (__DEV__) console.log('[Events] Creating category:', data.name);
      const response = await apiClient.post<EventCategory>('admin/event-categories', data);

      if (response.success && response.data) {
        if (__DEV__) console.log('[Events] Category created:', response.data.slug);
        return response.data;
      }

      throw new Error(response.message || 'Failed to create category');
    } catch (error: any) {
      if (__DEV__) console.error('[Events] Create category error:', error.message);
      throw new Error(error.message || 'Failed to create category');
    }
  }

  /**
   * Update event category
   */
  async updateCategory(id: string, data: Partial<EventCategoryRequest>): Promise<EventCategory> {
    try {
      if (__DEV__) console.log('[Events] Updating category:', id);
      const response = await apiClient.put<EventCategory>(`admin/event-categories/${id}`, data);

      if (response.success && response.data) {
        if (__DEV__) console.log('[Events] Category updated:', response.data.name);
        return response.data;
      }

      throw new Error(response.message || 'Failed to update category');
    } catch (error: any) {
      if (__DEV__) console.error('[Events] Update category error:', error.message);
      throw new Error(error.message || 'Failed to update category');
    }
  }

  /**
   * Delete event category
   */
  async deleteCategory(id: string): Promise<void> {
    try {
      if (__DEV__) console.log('[Events] Deleting category:', id);
      const response = await apiClient.delete(`admin/event-categories/${id}`);

      if (response.success) {
        if (__DEV__) console.log('[Events] Category deleted');
        return;
      }

      throw new Error(response.message || 'Failed to delete category');
    } catch (error: any) {
      if (__DEV__) console.error('[Events] Delete category error:', error.message);
      throw new Error(error.message || 'Failed to delete category');
    }
  }

  /**
   * Reorder event categories
   */
  async reorderCategories(orderedIds: string[]): Promise<void> {
    try {
      if (__DEV__) console.log('[Events] Reordering categories:', orderedIds.length, 'items');
      // Backend expects { order: [{ id, sortOrder }] }
      const order = orderedIds.map((id, index) => ({ id, sortOrder: index }));
      const response = await apiClient.put('admin/event-categories/reorder', { order });

      if (response.success) {
        if (__DEV__) console.log('[Events] Categories reordered');
        return;
      }

      throw new Error(response.message || 'Failed to reorder categories');
    } catch (error: any) {
      if (__DEV__) console.error('[Events] Reorder categories error:', error.message);
      throw new Error(error.message || 'Failed to reorder categories');
    }
  }

  // ==========================================
  // EVENT REWARD CONFIGS
  // ==========================================

  /**
   * Get all reward configs
   */
  async getRewardConfigs(): Promise<EventRewardConfig[]> {
    try {
      if (__DEV__) console.log('[Events] Fetching reward configs...');
      const response = await apiClient.get<any>('admin/event-rewards');

      if (response.success && response.data) {
        // Backend returns { configs: [...] } inside data
        const configs = response.data.configs || response.data;
        const arr = Array.isArray(configs) ? configs : [];
        if (__DEV__) console.log('[Events] Reward configs fetched:', arr.length);
        return arr;
      }

      throw new Error(response.message || 'Failed to fetch reward configs');
    } catch (error: any) {
      if (__DEV__) console.error('[Events] Get reward configs error:', error.message);
      throw new Error(error.message || 'Failed to fetch reward configs');
    }
  }

  /**
   * Get global default reward config
   */
  async getGlobalRewardConfig(): Promise<EventRewardConfig | null> {
    try {
      if (__DEV__) console.log('[Events] Fetching global reward config...');
      const response = await apiClient.get<any>('admin/event-rewards/global');

      if (response.success && response.data) {
        // Backend returns { config: {...} } inside data
        const config = response.data.config || response.data;
        if (__DEV__) console.log('[Events] Global config fetched');
        return config;
      }

      // No global config exists yet
      return null;
    } catch (error: any) {
      if (__DEV__) console.error('[Events] Get global config error:', error.message);
      return null;
    }
  }

  /**
   * Create new reward config
   */
  async createRewardConfig(data: EventRewardConfigRequest): Promise<EventRewardConfig> {
    try {
      if (__DEV__) console.log('[Events] Creating reward config');
      const response = await apiClient.post<EventRewardConfig>('admin/event-rewards', data);

      if (response.success && response.data) {
        if (__DEV__) console.log('[Events] Reward config created:', response.data._id);
        return response.data;
      }

      throw new Error(response.message || 'Failed to create reward config');
    } catch (error: any) {
      if (__DEV__) console.error('[Events] Create reward config error:', error.message);
      throw new Error(error.message || 'Failed to create reward config');
    }
  }

  /**
   * Update reward config
   */
  async updateRewardConfig(id: string, data: Partial<EventRewardConfigRequest>): Promise<EventRewardConfig> {
    try {
      if (__DEV__) console.log('[Events] Updating reward config:', id);
      const response = await apiClient.put<EventRewardConfig>(`admin/event-rewards/${id}`, data);

      if (response.success && response.data) {
        if (__DEV__) console.log('[Events] Reward config updated');
        return response.data;
      }

      throw new Error(response.message || 'Failed to update reward config');
    } catch (error: any) {
      if (__DEV__) console.error('[Events] Update reward config error:', error.message);
      throw new Error(error.message || 'Failed to update reward config');
    }
  }

  /**
   * Delete reward config
   */
  async deleteRewardConfig(id: string): Promise<void> {
    try {
      if (__DEV__) console.log('[Events] Deleting reward config:', id);
      const response = await apiClient.delete(`admin/event-rewards/${id}`);

      if (response.success) {
        if (__DEV__) console.log('[Events] Reward config deleted');
        return;
      }

      throw new Error(response.message || 'Failed to delete reward config');
    } catch (error: any) {
      if (__DEV__) console.error('[Events] Delete reward config error:', error.message);
      throw new Error(error.message || 'Failed to delete reward config');
    }
  }
}

export const adminEventsService = new AdminEventsService();
export default adminEventsService;
