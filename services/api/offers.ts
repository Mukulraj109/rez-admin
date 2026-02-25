import { API_CONFIG, buildApiUrl } from '../../config/api';
import { storageService } from '../storage';

const BASE_URL = API_CONFIG.BASE_URL;

// Types
export interface Offer {
  _id: string;
  title: string;
  subtitle?: string;
  description?: string;
  image: string;
  category: string;
  type: 'cashback' | 'discount' | 'voucher' | 'combo' | 'special' | 'walk_in';
  cashbackPercentage: number;
  originalPrice?: number;
  discountedPrice?: number;
  store: {
    id: string;
    name: string;
    logo?: string;
    rating?: number;
    verified?: boolean;
  };
  location: {
    type: 'Point';
    coordinates: [number, number];
  };
  validity: {
    startDate: string;
    endDate: string;
    isActive: boolean;
  };
  metadata: {
    priority: number;
    tags: string[];
    isNew?: boolean;
    isTrending?: boolean;
    featured?: boolean;
  };
  restrictions?: {
    minOrderValue?: number;
    maxDiscountAmount?: number;
    usageLimitPerUser?: number;
    usageLimit?: number;
  };
  exclusiveZone?: string;
  eligibilityRequirement?: string;
  isFreeDelivery?: boolean;
  bogoType?: string;
  bogoDetails?: string;
  redemptionCount?: number;
  adminApproved?: boolean;
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Store {
  _id: string;
  name: string;
  logo?: string;
}

export interface OfferStats {
  total: number;
  active: number;
  expired: number;
  inactive: number;
  byZone: Record<string, { count: number; active: number }>;
  byCategory: Record<string, number>;
}

export interface OffersListResponse {
  offers: Offer[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface CreateOfferRequest {
  title: string;
  subtitle?: string;
  description?: string;
  image: string;
  category: string;
  type: string;
  cashbackPercentage: number;
  originalPrice?: number;
  discountedPrice?: number;
  storeId: string;
  exclusiveZone?: string | null;
  eligibilityRequirement?: string;
  validity: {
    startDate: Date | string;
    endDate: Date | string;
    isActive: boolean;
  };
  metadata?: {
    priority?: number;
    tags?: string[];
    isNew?: boolean;
    isTrending?: boolean;
    featured?: boolean;
  };
  restrictions?: {
    minOrderValue?: number;
    maxDiscountAmount?: number;
    usageLimitPerUser?: number;
    usageLimit?: number;
  };
  isFreeDelivery?: boolean;
  bogoType?: string;
  bogoDetails?: string;
}

export interface OffersFilter {
  page?: number;
  limit?: number;
  exclusiveZone?: string;
  category?: string;
  type?: string;
  isActive?: string;
  search?: string;
}

// Helper to get auth headers
async function getAuthHeaders(): Promise<HeadersInit> {
  const token = await storageService.getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// API Service
export const offersService = {
  /**
   * Get all offers with optional filters
   */
  async getOffers(filters: OffersFilter = {}): Promise<OffersListResponse> {
    const headers = await getAuthHeaders();
    const params = new URLSearchParams();

    if (filters.page) params.append('page', String(filters.page));
    if (filters.limit) params.append('limit', String(filters.limit));
    if (filters.exclusiveZone) params.append('exclusiveZone', filters.exclusiveZone);
    if (filters.category) params.append('category', filters.category);
    if (filters.type) params.append('type', filters.type);
    if (filters.isActive !== undefined) params.append('isActive', filters.isActive);
    if (filters.search) params.append('search', filters.search);

    const response = await fetch(
      `${BASE_URL}/admin/offers?${params.toString()}`,
      { headers }
    );

    const data = await response.json();
    if (!data.success) throw new Error(data.message || 'Failed to fetch offers');
    return data.data;
  },

  /**
   * Get offer statistics
   */
  async getStats(): Promise<OfferStats> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BASE_URL}/admin/offers/stats`, { headers });

    const data = await response.json();
    if (!data.success) throw new Error(data.message || 'Failed to fetch stats');
    return data.data;
  },

  /**
   * Get list of stores for dropdown
   */
  async getStores(): Promise<Store[]> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BASE_URL}/admin/offers/stores`, { headers });

    const data = await response.json();
    if (!data.success) throw new Error(data.message || 'Failed to fetch stores');
    return data.data;
  },

  /**
   * Get single offer by ID
   */
  async getOffer(id: string): Promise<Offer> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BASE_URL}/admin/offers/${id}`, { headers });

    const data = await response.json();
    if (!data.success) throw new Error(data.message || 'Failed to fetch offer');
    return data.data;
  },

  /**
   * Create new offer
   */
  async createOffer(offerData: CreateOfferRequest): Promise<Offer> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BASE_URL}/admin/offers`, {
      method: 'POST',
      headers,
      body: JSON.stringify(offerData),
    });

    const data = await response.json();
    if (!data.success) throw new Error(data.message || 'Failed to create offer');
    return data.data;
  },

  /**
   * Update offer
   */
  async updateOffer(id: string, offerData: CreateOfferRequest): Promise<Offer> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BASE_URL}/admin/offers/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(offerData),
    });

    const data = await response.json();
    if (!data.success) throw new Error(data.message || 'Failed to update offer');
    return data.data;
  },

  /**
   * Toggle offer active status
   */
  async toggleOffer(id: string): Promise<{ isActive: boolean }> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BASE_URL}/admin/offers/${id}/toggle`, {
      method: 'PATCH',
      headers,
    });

    const data = await response.json();
    if (!data.success) throw new Error(data.message || 'Failed to toggle offer');
    return data.data;
  },

  /**
   * Delete offer
   */
  async deleteOffer(id: string): Promise<void> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BASE_URL}/admin/offers/${id}`, {
      method: 'DELETE',
      headers,
    });

    const data = await response.json();
    if (!data.success) throw new Error(data.message || 'Failed to delete offer');
  },

  /**
   * Get offers pending admin approval
   */
  async getPendingOffers(page = 1, limit = 20): Promise<OffersListResponse> {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${BASE_URL}/admin/offers/pending-approval?page=${page}&limit=${limit}`,
      { headers }
    );
    const data = await response.json();
    if (!data.success) throw new Error(data.message || 'Failed to fetch pending offers');
    return data.data;
  },

  /**
   * Approve an offer
   */
  async approveOffer(id: string, notes?: string): Promise<Offer> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BASE_URL}/admin/offers/${id}/approve`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ notes }),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message || 'Failed to approve offer');
    return data.data;
  },

  /**
   * Reject an offer
   */
  async rejectOffer(id: string, reason?: string): Promise<Offer> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${BASE_URL}/admin/offers/${id}/reject`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ reason }),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message || 'Failed to reject offer');
    return data.data;
  },
};

export default offersService;
