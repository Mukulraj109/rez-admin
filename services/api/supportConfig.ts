import { apiClient } from './apiClient';

export interface DaySchedule {
  dayOfWeek: number;
  dayName: string;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

export interface Holiday {
  date: string;
  name: string;
}

export interface SupportPhoneNumber {
  region: string;
  number: string;
  displayNumber: string;
  label: string;
  isActive: boolean;
  sortOrder: number;
}

export interface CallbackSettings {
  enabled: boolean;
  maxPerUserPerDay: number;
  estimatedWaitMinutes: number;
}

export interface SupportCategoryConfig {
  id: string;
  name: string;
  icon: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  slaMinutes: number;
  isActive: boolean;
  sortOrder: number;
}

export interface QueueStatus {
  override: boolean;
  message: string;
  severity: 'normal' | 'busy' | 'critical';
}

export interface SupportConfigData {
  supportHours: {
    timezone: string;
    schedule: DaySchedule[];
    holidays: Holiday[];
  };
  phoneNumbers: SupportPhoneNumber[];
  callbackSettings: CallbackSettings;
  categories: SupportCategoryConfig[];
  queueStatus: QueueStatus;
}

export interface SupportConfig extends SupportConfigData {
  _id: string;
  createdAt: string;
  updatedAt: string;
}

class SupportConfigService {
  async getConfig(): Promise<SupportConfig> {
    try {
      const response = await apiClient.get<SupportConfig>('admin/support-config');
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.message || 'Failed to get support config');
    } catch (error: any) {
      if (__DEV__) console.error('[SupportConfig] Get config error:', error.message);
      throw new Error(error.message || 'Failed to get support config');
    }
  }

  async updateConfig(data: Partial<SupportConfigData>): Promise<SupportConfig> {
    try {
      const response = await apiClient.put<SupportConfig>('admin/support-config', data);
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.message || 'Failed to update support config');
    } catch (error: any) {
      if (__DEV__) console.error('[SupportConfig] Update config error:', error.message);
      throw new Error(error.message || 'Failed to update support config');
    }
  }
}

export const supportConfigService = new SupportConfigService();
export default supportConfigService;
