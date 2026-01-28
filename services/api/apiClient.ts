import { API_CONFIG, buildApiUrl } from '../../config/api';
import { storageService } from '../storage';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface RequestOptions {
  headers?: Record<string, string>;
  timeout?: number;
}

class ApiClient {
  private async getHeaders(customHeaders?: Record<string, string>): Promise<Record<string, string>> {
    const token = await storageService.getAuthToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...customHeaders,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  private async request<T>(
    method: string,
    endpoint: string,
    body?: any,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    const url = buildApiUrl(endpoint);
    const headers = await this.getHeaders(options?.headers);
    const timeout = options?.timeout || API_CONFIG.TIMEOUT;

    console.log(`🌐 [Admin API] ${method} ${url}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json();

      if (!response.ok) {
        console.error(`❌ [Admin API] ${method} ${endpoint} failed:`, data.message || response.statusText);

        // Handle 401 - token expired
        if (response.status === 401) {
          console.log('🔐 [Admin API] Token expired, clearing auth data');
          await storageService.logout();
        }

        return {
          success: false,
          message: data.message || `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      console.log(`✅ [Admin API] ${method} ${endpoint} success`);
      return data;
    } catch (error: any) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        console.error(`❌ [Admin API] ${method} ${endpoint} timeout`);
        return {
          success: false,
          message: 'Request timeout',
        };
      }

      console.error(`❌ [Admin API] ${method} ${endpoint} error:`, error.message);
      return {
        success: false,
        message: error.message || 'Network error',
      };
    }
  }

  async get<T>(endpoint: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>('GET', endpoint, undefined, options);
  }

  async post<T>(endpoint: string, body?: any, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>('POST', endpoint, body, options);
  }

  async put<T>(endpoint: string, body?: any, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>('PUT', endpoint, body, options);
  }

  async delete<T>(endpoint: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', endpoint, undefined, options);
  }

  async patch<T>(endpoint: string, body?: any, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>('PATCH', endpoint, body, options);
  }
}

export const apiClient = new ApiClient();
export default apiClient;
