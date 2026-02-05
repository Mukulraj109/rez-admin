import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useColorScheme,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { authService, AdminUser } from '../../services/api/auth';
import { Colors } from '../../constants/Colors';
import { showAlert, showConfirm } from '../../utils/alert';

interface SettingItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  showChevron?: boolean;
}

function SettingItem({ icon, iconColor, title, subtitle, onPress, rightElement, showChevron = true }: SettingItemProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <TouchableOpacity
      style={[styles.settingItem, { backgroundColor: colors.card }]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={[styles.settingIcon, { backgroundColor: `${iconColor}20` }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <View style={styles.settingContent}>
        <Text style={[styles.settingTitle, { color: colors.text }]}>{title}</Text>
        {subtitle && (
          <Text style={[styles.settingSubtitle, { color: colors.icon }]}>{subtitle}</Text>
        )}
      </View>
      {rightElement || (showChevron && onPress && (
        <Ionicons name="chevron-forward" size={20} color={colors.icon} />
      ))}
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [user, setUser] = useState<AdminUser | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(colorScheme === 'dark');

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const adminUser = await authService.getCurrentUser();
    setUser(adminUser);
  };

  const handleLogout = () => {
    showConfirm(
      'Logout',
      'Are you sure you want to logout?',
      async () => {
        await authService.logout();
        router.replace('/(auth)/login');
      },
      'Logout'
    );
  };

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case 'super_admin': return 'Super Admin';
      case 'admin': return 'Admin';
      case 'operator': return 'Operator';
      case 'support': return 'Support';
      default: return 'Unknown';
    }
  };

  const getRoleColor = (role?: string) => {
    switch (role) {
      case 'super_admin': return '#DC2626';
      case 'admin': return '#7C3AED';
      case 'operator': return '#3B82F6';
      case 'support': return '#10B981';
      default: return colors.icon;
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Profile Section */}
      <View style={[styles.profileSection, { backgroundColor: colors.card }]}>
        <View style={[styles.avatar, { backgroundColor: colors.tint }]}>
          <Ionicons name="person" size={32} color="#FFFFFF" />
        </View>
        <View style={styles.profileInfo}>
          <Text style={[styles.profileName, { color: colors.text }]}>
            {user?.name || 'Admin User'}
          </Text>
          <Text style={[styles.profileEmail, { color: colors.icon }]}>
            {user?.email || 'admin@rez.app'}
          </Text>
          <View style={[styles.roleBadge, { backgroundColor: `${getRoleColor(user?.role)}20` }]}>
            <Text style={[styles.roleText, { color: getRoleColor(user?.role) }]}>
              {getRoleLabel(user?.role)}
            </Text>
          </View>
        </View>
      </View>

      {/* Homepage Management */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.icon }]}>HOMEPAGE MANAGEMENT</Text>
        <View style={styles.settingsGroup}>
          <SettingItem
            icon="flash"
            iconColor="#F59E0B"
            title="Deals Section"
            subtitle="Manage deals that save money"
            onPress={() => router.push('/(dashboard)/homepage-deals')}
          />
          <SettingItem
            icon="sparkles"
            iconColor="#8B5CF6"
            title="Shop by Experience"
            subtitle="Manage homepage experiences"
            onPress={() => router.push('/(dashboard)/experiences')}
          />
          <SettingItem
            icon="compass"
            iconColor="#06B6D4"
            title="Explore Section"
            subtitle="Manage explore page content"
            onPress={() => router.push('/(dashboard)/explore')}
          />
        </View>
      </View>

      {/* Offers & Zones Management */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.icon }]}>OFFERS & ZONES</Text>
        <View style={styles.settingsGroup}>
          <SettingItem
            icon="pricetag"
            iconColor="#10B981"
            title="Offers Management"
            subtitle="Create & manage all offers"
            onPress={() => router.push('/(dashboard)/offers')}
          />
        </View>
      </View>

      {/* Operations */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.icon }]}>OPERATIONS</Text>
        <View style={styles.settingsGroup}>
          <SettingItem
            icon="gift"
            iconColor="#F59E0B"
            title="Coin Rewards"
            subtitle="Review and approve rewards"
            onPress={() => router.push('/(dashboard)/coin-rewards')}
          />
          <SettingItem
            icon="wallet"
            iconColor="#10B981"
            title="Wallet Management"
            subtitle="Manage user wallets"
            onPress={() => router.push('/(dashboard)/wallet')}
          />
          <SettingItem
            icon="people"
            iconColor="#3B82F6"
            title="Users"
            subtitle="Manage user accounts"
            onPress={() => router.push('/(dashboard)/users')}
          />
          <SettingItem
            icon="shield-checkmark"
            iconColor="#8B5CF6"
            title="Verifications"
            subtitle="Review student & zone verifications"
            onPress={() => router.push('/(dashboard)/verifications')}
          />
        </View>
      </View>

      {/* System Settings */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.icon }]}>SYSTEM</Text>
        <View style={styles.settingsGroup}>
          <SettingItem
            icon="notifications"
            iconColor="#8B5CF6"
            title="Push Notifications"
            subtitle={notificationsEnabled ? 'Enabled' : 'Disabled'}
            showChevron={false}
            rightElement={
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: '#E2E8F0', true: colors.tint }}
                thumbColor="#FFFFFF"
              />
            }
          />
          <SettingItem
            icon="moon"
            iconColor="#6366F1"
            title="Dark Mode"
            subtitle={darkModeEnabled ? 'Enabled' : 'Disabled'}
            showChevron={false}
            rightElement={
              <Switch
                value={darkModeEnabled}
                onValueChange={setDarkModeEnabled}
                trackColor={{ false: '#E2E8F0', true: colors.tint }}
                thumbColor="#FFFFFF"
              />
            }
          />
        </View>
      </View>

      {/* Management (Admin only) */}
      {(user?.role === 'super_admin' || user?.role === 'admin') && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.icon }]}>MANAGEMENT</Text>
          <View style={styles.settingsGroup}>
            <SettingItem
              icon="people"
              iconColor="#06B6D4"
              title="Admin Users"
              subtitle="Manage admin accounts"
              onPress={() => showAlert('Coming Soon', 'Admin user management will be available soon')}
            />
            <SettingItem
              icon="cog"
              iconColor="#64748B"
              title="System Configuration"
              subtitle="Platform settings"
              onPress={() => showAlert('Coming Soon', 'System configuration will be available soon')}
            />
            <SettingItem
              icon="shield-checkmark"
              iconColor="#10B981"
              title="Security Settings"
              subtitle="Security policies"
              onPress={() => showAlert('Coming Soon', 'Security settings will be available soon')}
            />
          </View>
        </View>
      )}

      {/* Support */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.icon }]}>SUPPORT</Text>
        <View style={styles.settingsGroup}>
          <SettingItem
            icon="document-text"
            iconColor="#3B82F6"
            title="Documentation"
            subtitle="Admin guides and API docs"
            onPress={() => showAlert('Documentation', 'Opening documentation...')}
          />
          <SettingItem
            icon="help-circle"
            iconColor="#8B5CF6"
            title="Help & Support"
            subtitle="Contact support team"
            onPress={() => showAlert('Support', 'Contact: admin-support@rez.app')}
          />
        </View>
      </View>

      {/* Account */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.icon }]}>ACCOUNT</Text>
        <View style={styles.settingsGroup}>
          <SettingItem
            icon="key"
            iconColor="#F59E0B"
            title="Change Password"
            subtitle="Update your password"
            onPress={() => showAlert('Coming Soon', 'Password change will be available soon')}
          />
          <SettingItem
            icon="log-out"
            iconColor="#EF4444"
            title="Logout"
            subtitle="Sign out of your account"
            onPress={handleLogout}
          />
        </View>
      </View>

      {/* App Info */}
      <View style={styles.appInfo}>
        <Text style={[styles.appVersion, { color: colors.icon }]}>
          Rez Admin v1.0.0
        </Text>
        <Text style={[styles.appCopyright, { color: colors.icon }]}>
          2026 Rez Platform. All rights reserved.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    flex: 1,
    marginLeft: 16,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
  },
  profileEmail: {
    fontSize: 14,
    marginTop: 2,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  settingsGroup: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingContent: {
    flex: 1,
    marginLeft: 12,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '500',
  },
  settingSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  appInfo: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingBottom: 48,
  },
  appVersion: {
    fontSize: 13,
  },
  appCopyright: {
    fontSize: 11,
    marginTop: 4,
  },
});
