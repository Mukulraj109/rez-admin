import apiClient from './apiClient';

// ==================== TYPES ====================

export interface Sponsor {
  _id: string;
  name: string;
  slug: string;
  logo: string;
  description: string;
  brandCoinName: string;
  brandCoinLogo?: string;
  contactPerson: {
    name: string;
    email: string;
    phone?: string;
  };
  website?: string;
  industry?: string;
  totalEventsSponsored: number;
  totalParticipants: number;
  totalCoinsDistributed: number;
  totalBudgetFunded: number;
  currentBalance: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SocialImpactEvent {
  _id: string;
  name: string;
  type: 'social_impact';
  description: string;
  status: 'active' | 'inactive' | 'upcoming' | 'completed' | 'pending_approval' | 'rejected';
  eventType: string;
  eventStatus: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  merchant?: { _id: string; businessName: string; logo?: string };
  sponsor?: Sponsor;
  organizer?: { name: string; logo?: string };
  location?: { address: string; city: string; coordinates?: { lat: number; lng: number } };
  eventDate?: string;
  eventTime?: { start: string; end: string };
  rewards?: { rezCoins: number; brandCoins: number };
  capacity?: { goal: number; enrolled: number };
  impact?: { description: string; metric: string; targetValue: number; currentValue?: number };
  eventRequirements?: Array<{ text: string; isMandatory: boolean }>;
  benefits?: string[];
  schedule?: Array<{ time: string; activity: string }>;
  contact?: { phone?: string; email?: string };
  isCsrActivity?: boolean;
  featured?: boolean;
  image?: string;
  verificationConfig?: {
    methods: string[];
    geoFenceRadiusMeters?: number;
    requireCheckInBeforeComplete?: boolean;
  };
  sponsorBudget?: { allocated: number; disbursed: number };
  createdAt: string;
  updatedAt: string;
}

export interface Participant {
  _id: string;
  user: {
    _id: string;
    name: string;
    phoneNumber?: string;
    email?: string;
    profile?: { avatar?: string };
  };
  status: 'registered' | 'checked_in' | 'completed' | 'cancelled' | 'no_show';
  registeredAt: string;
  checkedInAt?: string;
  completedAt?: string;
  coinsAwarded?: { rez: number; brand: number; awardedAt?: string };
  verification?: { method?: string; verifiedAt?: string };
}

export interface SponsorBudget {
  currentBalance: number;
  totalFunded: number;
  totalAllocated: number;
  totalDisbursed: number;
  totalRefunded: number;
}

// ==================== EVENT TYPES & STATUS HELPERS ====================

export const EVENT_TYPES = [
  { value: 'blood-donation', label: 'Blood Donation', emoji: '🩸' },
  { value: 'tree-plantation', label: 'Tree Plantation', emoji: '🌳' },
  { value: 'beach-cleanup', label: 'Beach Cleanup', emoji: '🏖️' },
  { value: 'digital-literacy', label: 'Digital Literacy', emoji: '💻' },
  { value: 'food-drive', label: 'Food Drive', emoji: '🍲' },
  { value: 'health-camp', label: 'Health Camp', emoji: '🏥' },
  { value: 'skill-training', label: 'Skill Training', emoji: '🎓' },
  { value: 'women-empowerment', label: 'Women Empowerment', emoji: '👩' },
  { value: 'education', label: 'Education', emoji: '📚' },
  { value: 'environment', label: 'Environment', emoji: '🌍' },
  { value: 'other', label: 'Other', emoji: '✨' },
];

export const EVENT_STATUSES = [
  { value: 'upcoming', label: 'Upcoming', color: '#3B82F6' },
  { value: 'ongoing', label: 'Ongoing', color: '#10B981' },
  { value: 'completed', label: 'Completed', color: '#6B7280' },
  { value: 'cancelled', label: 'Cancelled', color: '#EF4444' },
];

export const PARTICIPANT_STATUSES = [
  { value: 'registered', label: 'Registered', color: '#3B82F6' },
  { value: 'checked_in', label: 'Checked In', color: '#F59E0B' },
  { value: 'completed', label: 'Completed', color: '#10B981' },
  { value: 'cancelled', label: 'Cancelled', color: '#6B7280' },
  { value: 'no_show', label: 'No Show', color: '#EF4444' },
];

export const INDUSTRIES = [
  'technology', 'healthcare', 'finance', 'retail', 'manufacturing',
  'fmcg', 'energy', 'education', 'hospitality', 'other'
];

export function getEventTypeEmoji(eventType: string): string {
  return EVENT_TYPES.find(t => t.value === eventType)?.emoji || '✨';
}

export function getStatusColor(status: string): string {
  return EVENT_STATUSES.find(s => s.value === status)?.color || '#6B7280';
}

// ==================== API SERVICE ====================

export const socialImpactService = {
  // ---- Events ----
  async getEvents(params?: {
    page?: number;
    limit?: number;
    eventStatus?: string;
    eventType?: string;
    sponsorId?: string;
    city?: string;
  }) {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.eventStatus) query.set('eventStatus', params.eventStatus);
    if (params?.eventType) query.set('eventType', params.eventType);
    if (params?.sponsorId) query.set('sponsorId', params.sponsorId);
    if (params?.city) query.set('city', params.city);
    return apiClient.get(`/programs/social-impact?${query.toString()}`);
  },

  async getEventById(id: string) {
    return apiClient.get(`/programs/social-impact/${id}`);
  },

  async createEvent(data: Partial<SocialImpactEvent>) {
    return apiClient.post('/programs/social-impact', data);
  },

  async updateEvent(id: string, data: Partial<SocialImpactEvent>) {
    return apiClient.put(`/programs/social-impact/${id}`, data);
  },

  // ---- Approval ----
  async getPendingEvents(params?: { page?: number; limit?: number }) {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    return apiClient.get(`/programs/social-impact/pending?${query.toString()}`);
  },

  async approveEvent(id: string) {
    return apiClient.post(`/programs/social-impact/${id}/approve`);
  },

  async rejectEvent(id: string, reason?: string) {
    return apiClient.post(`/programs/social-impact/${id}/reject`, { reason });
  },

  // ---- Participants ----
  async getParticipants(eventId: string, params?: { status?: string }) {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    return apiClient.get(`/programs/social-impact/${eventId}/participants?${query.toString()}`);
  },

  async checkInParticipant(eventId: string, userId: string) {
    return apiClient.post(`/programs/social-impact/${eventId}/check-in`, { userId });
  },

  async completeParticipant(eventId: string, userId: string, impactValue?: number) {
    return apiClient.post(`/programs/social-impact/${eventId}/complete`, { userId, impactValue });
  },

  async bulkComplete(eventId: string, userIds: string[]) {
    return apiClient.post(`/programs/social-impact/${eventId}/bulk-complete`, { userIds });
  },

  // ---- Verification ----
  async generateQR(eventId: string, userId: string) {
    return apiClient.post(`/programs/social-impact/${eventId}/generate-qr`, { userId });
  },

  async verifyQR(eventId: string, qrToken: string) {
    return apiClient.post(`/programs/social-impact/${eventId}/verify-qr`, { qrToken });
  },

  async generateOTP(eventId: string, userId: string) {
    return apiClient.post(`/programs/social-impact/${eventId}/generate-otp`, { userId });
  },

  // ---- Sponsors ----
  async getSponsors(params?: {
    page?: number;
    limit?: number;
    isActive?: boolean;
    industry?: string;
    search?: string;
  }) {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.isActive !== undefined) query.set('isActive', String(params.isActive));
    if (params?.industry) query.set('industry', params.industry);
    if (params?.search) query.set('search', params.search);
    return apiClient.get(`/sponsors?${query.toString()}`);
  },

  async getSponsorById(id: string) {
    return apiClient.get(`/sponsors/${id}`);
  },

  async createSponsor(data: Partial<Sponsor>) {
    return apiClient.post('/sponsors', data);
  },

  async updateSponsor(id: string, data: Partial<Sponsor>) {
    return apiClient.put(`/sponsors/${id}`, data);
  },

  async deactivateSponsor(id: string) {
    return apiClient.delete(`/sponsors/${id}`);
  },

  async activateSponsor(id: string) {
    return apiClient.post(`/sponsors/${id}/activate`);
  },

  async getSponsorEvents(id: string) {
    return apiClient.get(`/sponsors/${id}/events`);
  },

  async getSponsorAnalytics(id: string) {
    return apiClient.get(`/sponsors/${id}/analytics`);
  },

  // ---- Budget ----
  async fundSponsor(sponsorId: string, amount: number, description?: string) {
    return apiClient.post(`/sponsors/${sponsorId}/fund`, { amount, description });
  },

  async getSponsorBudget(sponsorId: string) {
    return apiClient.get(`/sponsors/${sponsorId}/budget`);
  },

  async allocateBudget(sponsorId: string, programId: string, amount: number) {
    return apiClient.post(`/sponsors/${sponsorId}/allocate`, { programId, amount });
  },

  async getSponsorLedger(sponsorId: string, params?: { page?: number; limit?: number; type?: string }) {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.type) query.set('type', params.type);
    return apiClient.get(`/sponsors/${sponsorId}/ledger?${query.toString()}`);
  },
};
