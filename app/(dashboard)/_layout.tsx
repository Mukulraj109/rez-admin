import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import { Colors } from '../../constants/Colors';

export default function DashboardLayout() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

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
    </Tabs>
  );
}
