// Storage Service
export { storageService } from './storage';

// API Client
export { apiClient } from './api/apiClient';

// API Services
export { authService } from './api/auth';
export { dashboardService } from './api/dashboard';
export { coinRewardsService } from './api/coinRewards';
export { merchantsService } from './api/merchants';
export { ordersService } from './api/orders';
export { campaignsService } from './api/campaigns';
export { uploadsService } from './api/uploads';
export { extraRewardsService } from './api/extraRewards';
export { bonusZoneService } from './api/bonusZone';

// Types
export type { AdminUser, LoginResponse } from './api/auth';
export type { DashboardStats, RecentActivity } from './api/dashboard';
export type { PendingCoinReward, CoinRewardStats, CoinRewardsListResponse } from './api/coinRewards';
export type { Merchant, MerchantWallet, MerchantWalletSummary, WithdrawalRequest, MerchantsListResponse } from './api/merchants';
export type { Order, OrderStats, OrdersListResponse } from './api/orders';
export type { Campaign, CampaignDeal, CampaignStats, CampaignsListResponse, CampaignsQuery, StoreOption } from './api/campaigns';
export type { UploadedImage, UploadResponse } from './api/uploads';
export type { DoubleCashbackCampaign, CoinDrop, DoubleCampaignsListResponse, CoinDropsListResponse } from './api/extraRewards';
export type {
  BonusCampaignAdmin,
  BonusCampaignType,
  BonusCampaignStatus,
  BonusCampaignsListResponse,
  BonusCampaignsQuery,
  BonusCampaignAnalytics,
  BonusCampaignClaimsResponse,
  BonusCampaignClaim,
  BonusZoneDashboard,
  BonusFraudAlert,
} from './api/bonusZone';

// Re-import for local use
import { storageService } from './storage';
import { apiClient } from './api/apiClient';
import { authService } from './api/auth';
import { dashboardService } from './api/dashboard';
import { coinRewardsService } from './api/coinRewards';
import { merchantsService } from './api/merchants';
import { ordersService } from './api/orders';
import { campaignsService } from './api/campaigns';
import { uploadsService } from './api/uploads';
import { extraRewardsService } from './api/extraRewards';
import { bonusZoneService } from './api/bonusZone';

// API Service Collection
export const apiServices = {
  storage: storageService,
  client: apiClient,
  auth: authService,
  dashboard: dashboardService,
  coinRewards: coinRewardsService,
  merchants: merchantsService,
  orders: ordersService,
  campaigns: campaignsService,
  uploads: uploadsService,
  extraRewards: extraRewardsService,
  bonusZone: bonusZoneService,
};
