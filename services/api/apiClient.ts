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
  private isRefreshing: boolean = false;
  private refreshPromise: Promise<string | null> | null = null;

  /**
   * Attempt to refresh the access token using the stored refresh token.
   * Returns the new access token on success, or null on failure.
   */
  private async attemptTokenRefresh(): Promise<string | null> {
    // Deduplicate concurrent refresh attempts
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    this.isRefreshing = true;
    this.refreshPromise = (async () => {
      try {
        const refreshToken = await storageService.getRefreshToken();
        if (!refreshToken) return null;

        const url = buildApiUrl('admin/auth/refresh-token');
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });

        const data = await response.json();

        if (response.ok && data?.success && data?.data?.token) {
          await storageService.setAuthToken(data.data.token);
          if (data.data.refreshToken) {
            await storageService.setRefreshToken(data.data.refreshToken);
          }
          if (data.data.user) {
            await storageService.setUserData(data.data.user);
          }
          if (__DEV__) console.log('[Admin API] Token refreshed successfully');
          return data.data.token as string;
        }

        return null;
      } catch (err) {
        if (__DEV__) console.error('[Admin API] Token refresh failed:', err);
        return null;
      } finally {
        this.isRefreshing = false;
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

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

    if (__DEV__) console.log(`🌐 [Admin API] ${method} ${url}`);

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
        if (__DEV__) console.error(`❌ [Admin API] ${method} ${endpoint} failed:`, data.message || response.statusText);

        // Handle 401 - attempt token refresh before logging out
        if (response.status === 401 && !endpoint.includes('/auth/')) {
          if (__DEV__) console.log('[Admin API] Token expired, attempting refresh...');
          const newToken = await this.attemptTokenRefresh();
          if (newToken) {
            // Retry the original request with the new token
            const retryHeaders = { ...headers, Authorization: `Bearer ${newToken}` };
            const retryResponse = await fetch(url, {
              method,
              headers: retryHeaders,
              body: body ? JSON.stringify(body) : undefined,
            });
            const retryData = await retryResponse.json();
            if (retryResponse.ok) {
              if (__DEV__) console.log(`✅ [Admin API] ${method} ${endpoint} success (after refresh)`);
              return retryData;
            }
          }

          // Refresh failed — log out
          if (__DEV__) console.log('[Admin API] Token refresh failed, clearing auth data');
          await storageService.logout();
        }

        return {
          success: false,
          message: data.message || `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      if (__DEV__) console.log(`✅ [Admin API] ${method} ${endpoint} success`);
      return data;
    } catch (error: any) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        if (__DEV__) console.error(`❌ [Admin API] ${method} ${endpoint} timeout`);
        return {
          success: false,
          message: 'Request timeout',
        };
      }

      if (__DEV__) console.error(`❌ [Admin API] ${method} ${endpoint} error:`, error.message);
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

  /**
   * Upload file using FormData
   * @param endpoint API endpoint
   * @param formData FormData with file(s)
   * @param options Request options
   */
  async uploadFile<T>(
    endpoint: string,
    formData: FormData,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    const url = buildApiUrl(endpoint);
    const token = await storageService.getAuthToken();
    const timeout = options?.timeout || 60000; // 60 second timeout for uploads

    if (__DEV__) console.log(`📤 [Admin API] UPLOAD ${url}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const headers: Record<string, string> = {
        ...options?.headers,
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Don't set Content-Type for FormData - let the browser set it with boundary
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json();

      if (!response.ok) {
        if (__DEV__) console.error(`❌ [Admin API] UPLOAD ${endpoint} failed:`, data.message || response.statusText);

        if (response.status === 401 && !endpoint.includes('/auth/')) {
          if (__DEV__) console.log('[Admin API] Token expired during upload, attempting refresh...');
          const newToken = await this.attemptTokenRefresh();
          if (newToken) {
            // Retry the upload with the new token
            const retryHeaders: Record<string, string> = { ...options?.headers };
            retryHeaders['Authorization'] = `Bearer ${newToken}`;
            const retryResponse = await fetch(url, {
              method: 'POST',
              headers: retryHeaders,
              body: formData,
            });
            const retryData = await retryResponse.json();
            if (retryResponse.ok) {
              if (__DEV__) console.log(`✅ [Admin API] UPLOAD ${endpoint} success (after refresh)`);
              return retryData;
            }
          }

          if (__DEV__) console.log('[Admin API] Token refresh failed, clearing auth data');
          await storageService.logout();
        }

        return {
          success: false,
          message: data.message || `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      if (__DEV__) console.log(`✅ [Admin API] UPLOAD ${endpoint} success`);
      return data;
    } catch (error: any) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        if (__DEV__) console.error(`❌ [Admin API] UPLOAD ${endpoint} timeout`);
        return {
          success: false,
          message: 'Upload timeout',
        };
      }

      if (__DEV__) console.error(`❌ [Admin API] UPLOAD ${endpoint} error:`, error.message);
      return {
        success: false,
        message: error.message || 'Upload failed',
      };
    }
  }
}

export const apiClient = new ApiClient();
export default apiClient;
