import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { router } from 'expo-router';
import { authService, AdminUser } from '../services/api/auth';

// Types
interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: AdminUser | null;
  token: string | null;
  error: string | null;
}

type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: { user: AdminUser; token: string } }
  | { type: 'AUTH_ERROR'; payload: string }
  | { type: 'LOGOUT' }
  | { type: 'CLEAR_ERROR' }
  | { type: 'UPDATE_USER'; payload: AdminUser };

interface AuthContextType {
  state: AuthState;
  token: string | null;
  user: AdminUser | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  updateUser: (user: AdminUser) => void;
  isAuthenticated: boolean;
  isLoading: boolean;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
}

// Initial state
const initialState: AuthState = {
  isAuthenticated: false,
  isLoading: true,
  user: null,
  token: null,
  error: null,
};

// Reducer
function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'AUTH_START':
      return {
        ...state,
        isLoading: true,
        error: null,
      };
    case 'AUTH_SUCCESS':
      return {
        ...state,
        isAuthenticated: true,
        isLoading: false,
        user: action.payload.user,
        token: action.payload.token,
        error: null,
      };
    case 'AUTH_ERROR':
      return {
        ...state,
        isAuthenticated: false,
        isLoading: false,
        user: null,
        token: null,
        error: action.payload,
      };
    case 'LOGOUT':
      if (__DEV__) console.log('🔄 [Admin] LOGOUT action dispatched');
      return {
        ...state,
        isAuthenticated: false,
        isLoading: false,
        user: null,
        token: null,
        error: null,
      };
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };
    case 'UPDATE_USER':
      return {
        ...state,
        user: action.payload,
      };
    default:
      return state;
  }
}

// Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Check for stored token on app start
  useEffect(() => {
    checkStoredToken();
  }, []);

  const checkStoredToken = async () => {
    try {
      if (__DEV__) console.log('🔍 [Admin] Checking stored authentication...');

      const isAuthenticated = await authService.isAuthenticated();

      if (isAuthenticated) {
        const [user, token] = await Promise.all([
          authService.getCurrentUser(),
          authService.getToken()
        ]);

        if (user && token) {
          if (__DEV__) console.log('✅ [Admin] Valid stored authentication found');
          dispatch({
            type: 'AUTH_SUCCESS',
            payload: { user, token }
          });
        } else {
          if (__DEV__) console.warn('❌ [Admin] Incomplete stored data, logging out');
          await authService.logout();
          dispatch({ type: 'LOGOUT' });
        }
      } else {
        if (__DEV__) console.log('❌ [Admin] No valid authentication found');
        dispatch({ type: 'LOGOUT' });
      }
    } catch (error) {
      if (__DEV__) console.error('❌ [Admin] Error checking stored authentication:', error);
      await authService.logout();
      dispatch({ type: 'LOGOUT' });
    }
  };

  const login = async (email: string, password: string) => {
    dispatch({ type: 'AUTH_START' });

    try {
      if (__DEV__) console.log('🔐 [Admin] Attempting login for:', email);

      const authResponse = await authService.login(email, password);

      if (authResponse.success && authResponse.data) {
        if (__DEV__) console.log('✅ [Admin] Login successful');

        dispatch({
          type: 'AUTH_SUCCESS',
          payload: {
            user: authResponse.data.user,
            token: authResponse.data.token
          }
        });

        // Small delay to ensure auth data is properly stored
        await new Promise(resolve => setTimeout(resolve, 100));
      } else {
        throw new Error(authResponse.message || 'Login failed');
      }
    } catch (error: any) {
      if (__DEV__) console.error('❌ [Admin] Login failed:', error.message);
      dispatch({
        type: 'AUTH_ERROR',
        payload: error.message || 'Login failed'
      });
      throw error;
    }
  };

  const logout = async () => {
    try {
      if (__DEV__) console.log('🚪 [Admin] Starting logout process...');

      await authService.logout();

      if (__DEV__) console.log('📤 [Admin] Dispatching LOGOUT action...');
      dispatch({ type: 'LOGOUT' });

      if (__DEV__) console.log('🚀 [Admin] Redirecting to login page...');
      router.replace('/(auth)/login');

      if (__DEV__) console.log('✅ [Admin] Logout completed successfully');
    } catch (error) {
      if (__DEV__) console.error('❌ [Admin] Error during logout:', error);
      dispatch({ type: 'LOGOUT' });
      router.replace('/(auth)/login');
    }
  };

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const updateUser = (user: AdminUser) => {
    dispatch({ type: 'UPDATE_USER', payload: user });
  };

  const hasPermission = (permission: string): boolean => {
    return state.user?.permissions?.includes(permission) || false;
  };

  const hasRole = (role: string): boolean => {
    if (!state.user?.role) return false;

    const roleHierarchy: Record<string, number> = {
      'support': 60,
      'operator': 70,
      'admin': 80,
      'super_admin': 100,
    };

    const userLevel = roleHierarchy[state.user.role] || 0;
    const requiredLevel = roleHierarchy[role] || 0;

    return userLevel >= requiredLevel;
  };

  const value: AuthContextType = {
    state,
    token: state.token,
    user: state.user,
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
    login,
    logout,
    clearError,
    updateUser,
    hasPermission,
    hasRole,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
