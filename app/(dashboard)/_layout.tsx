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
          fontSize: 9,
          fontWeight: '600',
          marginTop: 2,
        },
        tabBarIconStyle: {
          marginBottom: -2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => (
            <Ionicons name="grid" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color }) => (
            <Ionicons name="compass" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="coin-rewards"
        options={{
          title: 'Coins',
          tabBarIcon: ({ color }) => (
            <Ionicons name="gift" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="merchants"
        options={{
          title: 'Shops',
          tabBarIcon: ({ color }) => (
            <Ionicons name="storefront" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          title: 'Wallet',
          tabBarIcon: ({ color }) => (
            <Ionicons name="wallet" size={22} color={color} />
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
        name="users"
        options={{
          title: 'Users',
          tabBarIcon: ({ color }) => (
            <Ionicons name="people" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'More',
          tabBarIcon: ({ color }) => (
            <Ionicons name="settings" size={22} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
