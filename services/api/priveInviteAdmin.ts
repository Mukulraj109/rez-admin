import { apiClient } from './apiClient';

// Types
export interface PriveAccessRecord {
  _id: string;
  userId: string;
  userName?: string;
  userPhone?: string;
  userEmail?: string;
  status: 'active' | 'suspended' | 'revoked';
  grantMethod: 'invite' | 'admin_whitelist' | 'auto_qualify';
  invitedBy?: string;
  inviterName?: string;
  inviteCodeUsed?: string;
  isWhitelisted: boolean;
  whitelistReason?: string;
  tierOverride?: string;
  activatedAt: string;
  suspendedAt?: string;
  suspendReason?: string;
  createdAt: string;
}

export interface PriveInviteCodeAdmin {
  _id: string;
  code: string;
  creatorId: string;
  creatorName?: string;
  creatorTier: string;
  usageCount: number;
  maxUses: number;
  isActive: boolean;
  expiresAt: string;
  createdAt: string;
  usedBy: Array<{ userId: string; usedAt: string }>;
}

export interface PriveInviteAnalytics {
  totalAccess: number;
  activeAccess: number;
  byMethod: Array<{ _id: string; count: number }>;
  whitelistedCount: number;
  totalCodes: number;
  activeCodes: number;
  totalUsage: number;
  avgUsagePerCode: number;
  topInviters: Array<{
    userId: string;
    name: string;
    totalInvites: number;
    activeCodes: number;
  }>;
  recentActivity: Array<{
    type: string;
    userId: string;
    userName: string;
    timestamp: string;
  }>;
}

export interface PriveInviteConfig {
  enabled: boolean;
  inviterRewardCoins: number;
  inviteeRewardCoins: number;
  maxCodesPerUser: number;
  codeExpiryDays: number;
  maxUsesPerCode: number;
  minTierToInvite: 'entry' | 'signature' | 'elite';
  cooldownHours: number;
  fraudBlockThreshold: number;
}

class PriveInviteAdminApi {
  // Access Management
  async getAccessList(params?: {
    page?: number;
    limit?: number;
    status?: string;
    method?: string;
    search?: string;
  }) {
    return apiClient.get('/admin/prive/access', { params });
  }

  async grantAccess(data: {
    userId?: string;
    phone?: string;
    email?: string;
    reason: string;
    tierOverride?: string;
  }) {
    return apiClient.post('/admin/prive/access/grant', data);
  }

  async revokeAccess(data: {
    userId: string;
    action: 'suspend' | 'revoke' | 'remove_whitelist';
    reason: string;
  }) {
    return apiClient.post('/admin/prive/access/revoke', data);
  }

  // Invite Codes
  async getInviteCodes(params?: {
    page?: number;
    limit?: number;
    active?: boolean;
    creatorId?: string;
    search?: string;
  }) {
    return apiClient.get('/admin/prive/invite-codes', { params });
  }

  async deactivateCode(id: string) {
    return apiClient.patch(`/admin/prive/invite-codes/${id}/deactivate`);
  }

  // Analytics
  async getInviteAnalytics() {
    return apiClient.get('/admin/prive/invite-analytics');
  }

  // Config
  async getInviteConfig() {
    return apiClient.get('/admin/prive/invite-config');
  }

  async updateInviteConfig(config: Partial<PriveInviteConfig>) {
    return apiClient.put('/admin/prive/invite-config', config);
  }
}

export const priveInviteAdminApi = new PriveInviteAdminApi();
export default priveInviteAdminApi;
