import { Tabs, Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme, View, ActivityIndicator } from 'react-native';
import { Colors } from '../../constants/Colors';
import { useAuth } from '../../contexts/AuthContext';

export default function DashboardLayout() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { isAuthenticated, isLoading } = useAuth();

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#DC2626" />
      </View>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.tint,
        tabBarInactiveTintColor: colors.tabIconDefault,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          height: 70,
          paddingTop: 8,
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 8,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginTop: 2,
        },
        tabBarIconStyle: {
          marginBottom: -2,
        },
      }}
    >
      {/* Main 5 Tabs */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => (
            <Ionicons name="grid" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Orders',
          tabBarIcon: ({ color }) => (
            <Ionicons name="receipt" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="campaigns"
        options={{
          title: 'Campaigns',
          tabBarIcon: ({ color }) => (
            <Ionicons name="megaphone" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="merchants"
        options={{
          title: 'Merchants',
          tabBarIcon: ({ color }) => (
            <Ionicons name="storefront" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'More',
          tabBarIcon: ({ color }) => (
            <Ionicons name="menu" size={22} color={color} />
          ),
        }}
      />

      {/* Hidden tabs - accessible via More menu */}
      <Tabs.Screen
        name="explore"
        options={{
          href: null, // Hide from tab bar
        }}
      />
      <Tabs.Screen
        name="experiences"
        options={{
          href: null, // Hide from tab bar
        }}
      />
      <Tabs.Screen
        name="coin-rewards"
        options={{
          href: null, // Hide from tab bar
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          href: null, // Hide from tab bar
        }}
      />
      <Tabs.Screen
        name="users"
        options={{
          href: null, // Hide from tab bar
        }}
      />
      <Tabs.Screen
        name="offers"
        options={{
          href: null, // Hide from tab bar
        }}
      />
      <Tabs.Screen
        name="homepage-deals"
        options={{
          href: null, // Hide from tab bar
        }}
      />
      <Tabs.Screen
        name="verifications"
        options={{
          href: null, // Hide from tab bar - accessible via More menu
        }}
      />
      <Tabs.Screen
        name="loyalty"
        options={{
          href: null, // Hide from tab bar - accessible via More menu
        }}
      />
      <Tabs.Screen
        name="mall"
        options={{
          href: null, // Hide from tab bar - accessible via More menu
        }}
      />
      <Tabs.Screen
        name="extra-rewards"
        options={{
          href: null, // Hide from tab bar - accessible via More menu
        }}
      />
      <Tabs.Screen
        name="cash-store"
        options={{
          href: null, // Hide from tab bar - accessible via More menu
        }}
      />
      <Tabs.Screen
        name="travel"
        options={{
          href: null, // Hide from tab bar - accessible via More menu
        }}
      />
      <Tabs.Screen
        name="system-health"
        options={{
          href: null, // Hide from tab bar - accessible via More menu
        }}
      />
      <Tabs.Screen
        name="challenges"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="game-config"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="feature-flags"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="achievements"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="gamification-economy"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="categories"
        options={{
          href: null, // Hide from tab bar - accessible via More menu
        }}
      />
    </Tabs>
  );
}
