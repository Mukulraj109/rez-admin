import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  AUTH_TOKEN: 'admin_auth_token',
  USER_DATA: 'admin_user_data',
  REFRESH_TOKEN: 'admin_refresh_token',
};

class StorageService {
  // Auth Token
  async setAuthToken(token: string): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
      console.log('✅ [Storage] Auth token saved');
    } catch (error) {
      console.error('❌ [Storage] Failed to save auth token:', error);
      throw error;
    }
  }

  async getAuthToken(): Promise<string | null> {
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      return token;
    } catch (error) {
      console.error('❌ [Storage] Failed to get auth token:', error);
      return null;
    }
  }

  async removeAuthToken(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
      console.log('✅ [Storage] Auth token removed');
    } catch (error) {
      console.error('❌ [Storage] Failed to remove auth token:', error);
    }
  }

  // User Data
  async setUserData(userData: any): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
      console.log('✅ [Storage] User data saved');
    } catch (error) {
      console.error('❌ [Storage] Failed to save user data:', error);
      throw error;
    }
  }

  async getUserData(): Promise<any | null> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('❌ [Storage] Failed to get user data:', error);
      return null;
    }
  }

  async removeUserData(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.USER_DATA);
      console.log('✅ [Storage] User data removed');
    } catch (error) {
      console.error('❌ [Storage] Failed to remove user data:', error);
    }
  }

  // Logout - Clear all auth data
  async logout(): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN),
        AsyncStorage.removeItem(STORAGE_KEYS.USER_DATA),
        AsyncStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN),
      ]);
      console.log('✅ [Storage] All auth data cleared');
    } catch (error) {
      console.error('❌ [Storage] Failed to clear auth data:', error);
    }
  }

  // Check if authenticated
  async isAuthenticated(): Promise<boolean> {
    const token = await this.getAuthToken();
    return !!token;
  }
}

export const storageService = new StorageService();
export default storageService;
