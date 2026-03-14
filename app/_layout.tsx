import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, Redirect, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { Platform, View, ActivityIndicator } from 'react-native';

// Only import react-native-reanimated on native platforms
if (Platform.OS !== 'web') {
  require('react-native-reanimated');
}

import { useColorScheme } from '@/hooks/useColorScheme';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { AlertProvider } from '@/contexts/AlertContext';
import { Colors } from '@/constants/DesignTokens';
import { installProductionConsoleGuard } from '@/utils/logger';

// Admin roles allowed to access the admin portal
const ADMIN_ROLES = ['support', 'operator', 'admin', 'super_admin'];

// Custom Theme to match DesignTokens (Red admin theme)
const CustomDefaultTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: Colors.gray[50],
    primary: Colors.primary[500],
    text: Colors.text.primary,
    border: Colors.border.default,
    card: Colors.background.primary,
  },
};

const CustomDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: Colors.gray[900],
    primary: Colors.primary[400],
    text: Colors.gray[100],
    border: Colors.gray[700],
    card: Colors.gray[800],
  },
};

// Inner layout with auth guard — must be inside AuthProvider
function AuthGuardedLayout() {
  const colorScheme = useColorScheme();
  const { isAuthenticated, isLoading, user } = useAuth();
  const segments = useSegments();

  // Show loading while checking auth
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colorScheme === 'dark' ? Colors.gray[900] : Colors.gray[50] }}>
        <ActivityIndicator size="large" color={Colors.primary[500]} />
      </View>
    );
  }

  // Check if current route is in the auth group
  const inAuthGroup = segments[0] === '(auth)';

  // If not authenticated and trying to access protected routes, redirect to login
  if (!isAuthenticated && !inAuthGroup) {
    return <Redirect href="/(auth)/login" />;
  }

  // If authenticated but not an admin role, redirect to login
  if (isAuthenticated && !inAuthGroup && user?.role && !ADMIN_ROLES.includes(user.role)) {
    return <Redirect href="/(auth)/login" />;
  }

  // If authenticated and in auth group, redirect to dashboard
  if (isAuthenticated && inAuthGroup && user?.role && ADMIN_ROLES.includes(user.role)) {
    return <Redirect href="/(dashboard)" />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: colorScheme === 'dark' ? Colors.gray[900] : Colors.gray[50] }}>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: colorScheme === 'dark' ? Colors.gray[900] : Colors.gray[50] }
        }}
      >
        {/* Entry Point */}
        <Stack.Screen name="index" options={{ headerShown: false }} />

        {/* Authentication Flow */}
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />

        {/* Main Dashboard */}
        <Stack.Screen name="(dashboard)" options={{ headerShown: false }} />

        {/* Merchants Management */}
        <Stack.Screen name="merchants" options={{ headerShown: false }} />

        {/* Users Management */}
        <Stack.Screen name="users" options={{ headerShown: false }} />

        {/* Coin Rewards */}
        <Stack.Screen name="coin-rewards" options={{ headerShown: false }} />

        {/* Transactions */}
        <Stack.Screen name="transactions" options={{ headerShown: false }} />

        {/* Settings */}
        <Stack.Screen name="settings" options={{ headerShown: false }} />

        {/* Not Found */}
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} backgroundColor="transparent" translucent />
    </View>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  React.useEffect(() => {
    installProductionConsoleGuard();
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? CustomDarkTheme : CustomDefaultTheme}>
      <AuthProvider>
        <AlertProvider>
          <AuthGuardedLayout />
        </AlertProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
