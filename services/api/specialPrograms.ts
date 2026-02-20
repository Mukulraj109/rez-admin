import { apiClient } from './apiClient';

// ============================================
// TYPE DEFINITIONS
// ============================================

export type ProgramSlug = 'student_zone' | 'corporate_perks' | 'nuqta_prive';
export type MemberStatus = 'pending_verification' | 'active' | 'suspended' | 'expired' | 'revoked';

export interface ProgramBenefit {
  title: string;
  description: string;
  icon: string;
  type: 'earning_multiplier' | 'exclusive_campaign' | 'task_reward' | 'perk' | 'recognition';
}

export interface ProgramConfig {
  _id: string;
  slug: ProgramSlug;
  name: string;
  description: string;
  badge: string;
  icon: string;
  eligibility: {
    requiresVerification: boolean;
    verificationZone?: string;
    requiresPriveScore?: boolean;
    minPriveScore?: number;
    customRules?: Array<{ type: string; value: number; label: string }>;
  };
  benefits: ProgramBenefit[];
  earningConfig: {
    monthlyCap: number;
    multiplier: number;
    multiplierAppliesTo: string[];
    earningsDisplayText: string;
  };
  linkedCampaigns: string[];
  gradientColors: string[];
  isActive: boolean;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProgramMember {
  _id: string;
  user: {
    _id: string;
    fullName?: string;
    phoneNumber?: string;
    email?: string;
    profile?: { firstName?: string; lastName?: string };
  };
  programSlug: ProgramSlug;
  status: MemberStatus;
  activatedAt?: string;
  currentMonthEarnings: number;
  totalEarnings: number;
  totalMultiplierBonus: number;
  monthsActive: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProgramStats {
  totalActiveMembers: number;
  totalPendingVerifications: number;
  totalMonthlyEarnings: number;
  totalMultiplierBonus: number;
  byProgram: Record<string, {
    activeMembers: number;
    pendingVerifications: number;
    monthlyEarnings: number;
    multiplierBonus: number;
  }>;
}

export interface MembersListResponse {
  members: ProgramMember[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ProgramUpdateRequest {
  earningConfig?: {
    monthlyCap?: number;
    multiplier?: number;
    multiplierAppliesTo?: string[];
    earningsDisplayText?: string;
  };
  benefits?: ProgramBenefit[];
  eligibility?: ProgramConfig['eligibility'];
  description?: string;
  isActive?: boolean;
  priority?: number;
  gradientColors?: string[];
}

// ============================================
// SPECIAL PROGRAMS ADMIN SERVICE
// ============================================

class SpecialProgramsService {
  /**
   * Get all program configs
   */
  async getPrograms(): Promise<ProgramConfig[]> {
    try {
      const response = await apiClient.get<any>('admin/special-programs');
      if (response.success && response.data) {
        return response.data.programs || response.data || [];
      }
      throw new Error(response.message || 'Failed to get programs');
    } catch (error: any) {
      console.error('[SpecialPrograms] Get programs error:', error.message);
      throw new Error(error.message || 'Failed to get programs');
    }
  }

  /**
   * Get program stats
   */
  async getStats(): Promise<ProgramStats> {
    try {
      const response = await apiClient.get<ProgramStats>('admin/special-programs/stats');
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.message || 'Failed to get stats');
    } catch (error: any) {
      console.error('[SpecialPrograms] Get stats error:', error.message);
      throw new Error(error.message || 'Failed to get stats');
    }
  }

  /**
   * Get single program config
   */
  async getProgram(slug: ProgramSlug): Promise<ProgramConfig> {
    try {
      const response = await apiClient.get<ProgramConfig>(`admin/special-programs/${slug}`);
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.message || 'Failed to get program');
    } catch (error: any) {
      console.error('[SpecialPrograms] Get program error:', error.message);
      throw new Error(error.message || 'Failed to get program');
    }
  }

  /**
   * Update program config
   */
  async updateProgram(slug: ProgramSlug, data: ProgramUpdateRequest): Promise<ProgramConfig> {
    try {
      const response = await apiClient.put<ProgramConfig>(`admin/special-programs/${slug}`, data);
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.message || 'Failed to update program');
    } catch (error: any) {
      console.error('[SpecialPrograms] Update program error:', error.message);
      throw new Error(error.message || 'Failed to update program');
    }
  }

  /**
   * Toggle program active status
   */
  async toggleProgram(slug: ProgramSlug): Promise<ProgramConfig> {
    try {
      const response = await apiClient.patch<ProgramConfig>(`admin/special-programs/${slug}/toggle`);
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.message || 'Failed to toggle program');
    } catch (error: any) {
      console.error('[SpecialPrograms] Toggle program error:', error.message);
      throw new Error(error.message || 'Failed to toggle program');
    }
  }

  /**
   * Get members for a program
   */
  async getMembers(
    slug: ProgramSlug,
    page: number = 1,
    limit: number = 20,
    status?: MemberStatus,
    search?: string
  ): Promise<MembersListResponse> {
    try {
      let url = `admin/special-programs/${slug}/members?page=${page}&limit=${limit}`;
      if (status) url += `&status=${status}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;

      const response = await apiClient.get<any>(url);
      if (response.success) {
        // sendPaginated puts array directly in data, pagination in meta.pagination
        const members = Array.isArray(response.data) ? response.data : (response.data?.members || []);
        const paginationMeta = response.meta?.pagination || response.data?.pagination || {};
        return {
          members,
          pagination: {
            page: paginationMeta.page || page,
            limit: paginationMeta.limit || limit,
            total: paginationMeta.total || 0,
            totalPages: paginationMeta.pages || paginationMeta.totalPages || 0,
          },
        };
      }
      throw new Error(response.message || 'Failed to get members');
    } catch (error: any) {
      console.error('[SpecialPrograms] Get members error:', error.message);
      throw new Error(error.message || 'Failed to get members');
    }
  }

  /**
   * Update member status (approve, suspend, revoke, reactivate)
   */
  async updateMemberStatus(
    slug: ProgramSlug,
    userId: string,
    action: 'activate' | 'suspend' | 'revoke' | 'reactivate',
    reason?: string,
    expiresAt?: string
  ): Promise<any> {
    try {
      const body: any = { action, reason };
      if (expiresAt) body.expiresAt = expiresAt;
      const response = await apiClient.patch<any>(
        `admin/special-programs/${slug}/members/${userId}`,
        body
      );
      if (response.success) {
        return response.data;
      }
      throw new Error(response.message || 'Failed to update member status');
    } catch (error: any) {
      console.error('[SpecialPrograms] Update member error:', error.message);
      throw new Error(error.message || 'Failed to update member status');
    }
  }
}

export const specialProgramsService = new SpecialProgramsService();
