import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { Platform, View } from 'react-native';

// Only import react-native-reanimated on native platforms
if (Platform.OS !== 'web') {
  require('react-native-reanimated');
}

import { useColorScheme } from '@/hooks/useColorScheme';
import { AuthProvider } from '@/contexts/AuthContext';
import { AlertProvider } from '@/contexts/AlertContext';
import { Colors } from '@/constants/DesignTokens';

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

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? CustomDarkTheme : CustomDefaultTheme}>
      <AuthProvider>
        <AlertProvider>
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
        </AlertProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
