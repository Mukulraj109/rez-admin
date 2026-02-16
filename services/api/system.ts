import { apiClient } from './apiClient';

// ---- Types ----

export interface ServerHealth {
  uptime: number;
  uptimeFormatted: string;
  memory: {
    heapUsed: number;
    heapTotal: number;
    rss: number;
    external: number;
    heapUsedMB: number;
    heapTotalMB: number;
    rssMB: number;
  };
  totalMemory: number;
  freeMemory: number;
  totalMemoryGB: string;
  freeMemoryGB: string;
  cpuUsagePercent: number;
  cpuCores: number;
  nodeVersion: string;
  platform: string;
  pid: number;
}

export interface DatabaseHealth {
  status: 'connected' | 'disconnected' | 'connecting' | 'disconnecting' | 'unknown';
  connectionCount: number;
  host: string;
  name: string;
}

export interface RedisHealth {
  status: 'connected' | 'disconnected';
  enabled: boolean;
  memory: string | null;
  dbSize: number;
}

export interface QueueInfo {
  name: string;
  status: 'healthy' | 'unhealthy' | 'disabled';
  waiting?: number;
  active?: number;
  completed?: number;
  failed?: number;
  delayed?: number;
  error?: string;
}

export interface QueueHealth {
  timestamp: string;
  queues: QueueInfo[];
  overall: 'healthy' | 'degraded' | 'unavailable';
}

export interface ScheduledJob {
  name: string;
  schedule: string;
  scheduleHuman: string;
  description: string;
  lastRun: string | null;
  status: 'active' | 'unknown';
}

export interface SystemHealthData {
  server: ServerHealth;
  database: DatabaseHealth;
  redis: RedisHealth;
  queues: QueueHealth;
  jobs: ScheduledJob[];
  timestamp: string;
  overallStatus: 'healthy' | 'degraded' | 'unhealthy';
}

export interface ReconciliationDiscrepancy {
  userId: string;
  type: 'purchase_vs_cashback' | 'wallet_vs_transactions' | 'order_vs_wallet_deduction' | 'order_vs_merchant_settlement';
  expected: number;
  actual: number;
  difference: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface ReconciliationResult {
  hasResults: boolean;
  message?: string;
  discrepancies?: ReconciliationDiscrepancy[];
  usersChecked?: number;
  duration?: number;
  timestamp?: string;
  summary?: {
    totalDiscrepancies: number;
    criticalCount: number;
    highCount: number;
    totalDifferenceAmount: number;
  };
}

export interface ScheduledJobsData {
  jobs: ScheduledJob[];
}

// ---- Service ----

class SystemService {
  /**
   * Get full system health overview
   */
  async getHealth(): Promise<SystemHealthData> {
    try {
      console.log('[System] Fetching system health...');
      const response = await apiClient.get<SystemHealthData>('admin/system/health');

      if (response.success && response.data) {
        console.log('[System] Health data fetched successfully');
        return response.data;
      }

      throw new Error(response.message || 'Failed to get system health');
    } catch (error: any) {
      console.error('[System] Get health error:', error.message);
      throw new Error(error.message || 'Failed to get system health');
    }
  }

  /**
   * Get latest reconciliation results
   */
  async getReconciliation(): Promise<ReconciliationResult> {
    try {
      console.log('[System] Fetching reconciliation results...');
      const response = await apiClient.get<ReconciliationResult>('admin/system/reconciliation');

      if (response.success && response.data) {
        console.log('[System] Reconciliation results fetched');
        return response.data;
      }

      throw new Error(response.message || 'Failed to get reconciliation results');
    } catch (error: any) {
      console.error('[System] Get reconciliation error:', error.message);
      throw new Error(error.message || 'Failed to get reconciliation results');
    }
  }

  /**
   * Manually trigger reconciliation
   */
  async triggerReconciliation(): Promise<ReconciliationResult> {
    try {
      console.log('[System] Triggering manual reconciliation...');
      const response = await apiClient.post<ReconciliationResult>('admin/system/reconciliation/trigger');

      if (response.success && response.data) {
        console.log('[System] Reconciliation triggered successfully');
        return { hasResults: true, ...response.data };
      }

      throw new Error(response.message || 'Failed to trigger reconciliation');
    } catch (error: any) {
      console.error('[System] Trigger reconciliation error:', error.message);
      throw new Error(error.message || 'Failed to trigger reconciliation');
    }
  }

  /**
   * Get all scheduled job statuses
   */
  async getJobs(): Promise<ScheduledJob[]> {
    try {
      console.log('[System] Fetching scheduled jobs...');
      const response = await apiClient.get<ScheduledJobsData>('admin/system/jobs');

      if (response.success && response.data) {
        console.log('[System] Job statuses fetched');
        return response.data.jobs;
      }

      throw new Error(response.message || 'Failed to get job statuses');
    } catch (error: any) {
      console.error('[System] Get jobs error:', error.message);
      throw new Error(error.message || 'Failed to get job statuses');
    }
  }
}

export const systemService = new SystemService();
export default systemService;
