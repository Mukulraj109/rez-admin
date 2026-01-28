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

// Types
export type { AdminUser, LoginResponse } from './api/auth';
export type { DashboardStats, RecentActivity } from './api/dashboard';
export type { PendingCoinReward, CoinRewardStats, CoinRewardsListResponse } from './api/coinRewards';
export type { Merchant, MerchantWallet, MerchantWalletSummary, WithdrawalRequest, MerchantsListResponse } from './api/merchants';
export type { Order, OrderStats, OrdersListResponse } from './api/orders';

// Re-import for local use
import { storageService } from './storage';
import { apiClient } from './api/apiClient';
import { authService } from './api/auth';
import { dashboardService } from './api/dashboard';
import { coinRewardsService } from './api/coinRewards';
import { merchantsService } from './api/merchants';
import { ordersService } from './api/orders';

// API Service Collection
export const apiServices = {
  storage: storageService,
  client: apiClient,
  auth: authService,
  dashboard: dashboardService,
  coinRewards: coinRewardsService,
  merchants: merchantsService,
  orders: ordersService,
};
