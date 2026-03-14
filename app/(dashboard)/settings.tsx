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
          <SettingItem
            icon="apps"
            iconColor="#8B5CF6"
            title="Categories"
            subtitle="Manage main categories & page configs"
            onPress={() => router.push('/(dashboard)/categories')}
          />
          <SettingItem
            icon="bag-handle"
            iconColor="#0284C7"
            title="Mall Management"
            subtitle="Manage mall brands, categories & offers"
            onPress={() => router.push('/(dashboard)/mall')}
          />
          <SettingItem
            icon="rocket"
            iconColor="#F59E0B"
            title="Extra Rewards"
            subtitle="Double cashback campaigns & coin drops"
            onPress={() => router.push('/(dashboard)/extra-rewards')}
          />
          <SettingItem
            icon="cash"
            iconColor="#10B981"
            title="Cash Store Management"
            subtitle="Vouchers, coupons, campaigns & analytics"
            onPress={() => router.push('/(dashboard)/cash-store')}
          />
          <SettingItem
            icon="airplane"
            iconColor="#8B5CF6"
            title="Travel Management"
            subtitle="Bookings, categories, cashback & analytics"
            onPress={() => router.push('/(dashboard)/travel')}
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
          <SettingItem
            icon="layers"
            iconColor="#6366F1"
            title="Offers Page Sections"
            subtitle="Toggle, reorder & configure all 21 sections"
            onPress={() => router.push('/(dashboard)/offers-sections')}
          />
          <SettingItem
            icon="flash"
            iconColor="#F97316"
            title="Flash Sales"
            subtitle="Manage flash sales & lightning deals"
            onPress={() => router.push('/(dashboard)/flash-sales')}
          />
          <SettingItem
            icon="flame"
            iconColor="#EF4444"
            title="Hotspot Areas"
            subtitle="Manage geographic deal hotspots"
            onPress={() => router.push('/(dashboard)/hotspot-areas')}
          />
          <SettingItem
            icon="card"
            iconColor="#3B82F6"
            title="Bank Offers"
            subtitle="Manage bank partnership offers"
            onPress={() => router.push('/(dashboard)/bank-offers')}
          />
          <SettingItem
            icon="document-text"
            iconColor="#8B5CF6"
            title="Upload Bill Stores"
            subtitle="Manage bill upload cashback stores"
            onPress={() => router.push('/(dashboard)/upload-bill-stores')}
          />
          <SettingItem
            icon="shield-checkmark"
            iconColor="#10B981"
            title="Exclusive Zones"
            subtitle="Manage student, corporate & birthday zones"
            onPress={() => router.push('/(dashboard)/exclusive-zones')}
          />
          <SettingItem
            icon="ribbon"
            iconColor="#059669"
            title="Special Profiles"
            subtitle="Manage defence, healthcare & other profiles"
            onPress={() => router.push('/(dashboard)/special-profiles')}
          />
          <SettingItem
            icon="trophy"
            iconColor="#F59E0B"
            title="Loyalty Milestones"
            subtitle="Manage loyalty program milestones"
            onPress={() => router.push('/(dashboard)/loyalty-milestones')}
          />
          <SettingItem
            icon="gift-outline"
            iconColor="#E11D48"
            title="Bonus Zone"
            subtitle="Cashback boosts, bank offers & bonuses"
            onPress={() => router.push('/(dashboard)/bonus-zone')}
          />
          <SettingItem
            icon="diamond-outline"
            iconColor="#C9A962"
            title="Privé"
            subtitle="Offers, vouchers, reputation & analytics"
            onPress={() => router.push('/(dashboard)/prive')}
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
            icon="settings"
            iconColor="#6366F1"
            title="Wallet Config"
            subtitle="Transfer limits, cashback tiers, fraud thresholds"
            onPress={() => router.push('/(dashboard)/wallet-config')}
          />
          <SettingItem
            icon="people-circle"
            iconColor="#0891B2"
            title="User Wallets"
            subtitle="Search, freeze, adjust user wallets"
            onPress={() => router.push('/(dashboard)/user-wallets')}
          />
          <SettingItem
            icon="card"
            iconColor="#D97706"
            title="Gift Cards"
            subtitle="Manage gift card catalog"
            onPress={() => router.push('/(dashboard)/gift-cards-admin')}
          />
          <SettingItem
            icon="gift"
            iconColor="#EC4899"
            title="Coin Gifts Management"
            subtitle="Manage coin gift campaigns"
            onPress={() => router.push('/(dashboard)/coin-gifts')}
          />
          <SettingItem
            icon="sparkles"
            iconColor="#F59E0B"
            title="Surprise Coin Drops"
            subtitle="Schedule & manage surprise coin drops"
            onPress={() => router.push('/(dashboard)/surprise-coin-drops')}
          />
          <SettingItem
            icon="cash"
            iconColor="#059669"
            title="Merchant Withdrawals"
            subtitle="Review & process merchant withdrawals"
            onPress={() => router.push('/(dashboard)/merchant-withdrawals')}
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
          <SettingItem
            icon="ribbon"
            iconColor="#C9A962"
            title="Special Programs"
            subtitle="Student Zone, Corporate Perks, Privé"
            onPress={() => router.push('/(dashboard)/special-programs')}
          />
          <SettingItem
            icon="trophy"
            iconColor="#F59E0B"
            title="Loyalty Management"
            subtitle="Manage user streaks, missions & coins"
            onPress={() => router.push('/(dashboard)/loyalty')}
          />
          <SettingItem
            icon="flag"
            iconColor="#EF4444"
            title="Challenges"
            subtitle="Manage Play & Earn challenges"
            onPress={() => router.push('/(dashboard)/challenges')}
          />
          <SettingItem
            icon="heart"
            iconColor="#EC4899"
            title="Social Impact"
            subtitle="CSR events, participants & rewards"
            onPress={() => router.push('/(dashboard)/social-impact')}
          />
          <SettingItem
            icon="business"
            iconColor="#0EA5E9"
            title="CSR Sponsors"
            subtitle="Sponsors, budgets & brand coins"
            onPress={() => router.push('/(dashboard)/sponsors')}
          />
          <SettingItem
            icon="trophy"
            iconColor="#F59E0B"
            title="Tournaments"
            subtitle="Manage tournaments & prize pools"
            onPress={() => router.push('/(dashboard)/tournaments')}
          />
          <SettingItem
            icon="book"
            iconColor="#3B82F6"
            title="Learning Content"
            subtitle="Manage educational articles & rewards"
            onPress={() => router.push('/(dashboard)/learning-content')}
          />
          <SettingItem
            icon="game-controller"
            iconColor="#3B82F6"
            title="Game Config"
            subtitle="Configure mini-games & rewards"
            onPress={() => router.push('/(dashboard)/game-config')}
          />
          <SettingItem
            icon="toggle"
            iconColor="#8B5CF6"
            title="Feature Flags"
            subtitle="Toggle sections & earning config"
            onPress={() => router.push('/(dashboard)/feature-flags')}
          />
          <SettingItem
            icon="medal"
            iconColor="#F59E0B"
            title="Achievements"
            subtitle="Manage user achievements & badges"
            onPress={() => router.push('/(dashboard)/achievements')}
          />
          <SettingItem
            icon="calendar"
            iconColor="#22C55E"
            title="Daily Check-In Config"
            subtitle="Day rewards, milestones & pro tips"
            onPress={() => router.push('/(dashboard)/daily-checkin-config')}
          />
          <SettingItem
            icon="stats-chart"
            iconColor="#10B981"
            title="Economy Dashboard"
            subtitle="Monitor coin economy & fraud"
            onPress={() => router.push('/(dashboard)/gamification-economy')}
          />
          <SettingItem
            icon="calendar"
            iconColor="#8B5CF6"
            title="Events Management"
            subtitle="Create & manage events"
            onPress={() => router.push('/(dashboard)/events')}
          />
          <SettingItem
            icon="layers"
            iconColor="#F59E0B"
            title="Event Categories"
            subtitle="Manage event categories"
            onPress={() => router.push('/(dashboard)/event-categories')}
          />
          <SettingItem
            icon="gift"
            iconColor="#10B981"
            title="Event Rewards"
            subtitle="Configure event reward rules"
            onPress={() => router.push('/(dashboard)/event-rewards')}
          />
          <SettingItem
            icon="podium"
            iconColor="#D97706"
            title="Leaderboard Config"
            subtitle="Manage leaderboards, prizes & anti-fraud"
            onPress={() => router.push('/(dashboard)/leaderboard-config')}
          />
          <SettingItem
            icon="flash"
            iconColor="#06B6D4"
            title="Quick Actions"
            subtitle="Configure homepage quick action buttons"
            onPress={() => router.push('/(dashboard)/quick-actions')}
          />
          <SettingItem
            icon="card"
            iconColor="#8B5CF6"
            title="Value Cards"
            subtitle="Manage value proposition cards"
            onPress={() => router.push('/(dashboard)/value-cards')}
          />
          <SettingItem
            icon="videocam"
            iconColor="#E11D48"
            title="Creators"
            subtitle="Manage content creators"
            onPress={() => router.push('/(dashboard)/creators')}
          />
          <SettingItem
            icon="cash"
            iconColor="#059669"
            title="Partner Earnings"
            subtitle="Track partner earnings & payouts"
            onPress={() => router.push('/(dashboard)/partner-earnings')}
          />
          <SettingItem
            icon="albums"
            iconColor="#7C3AED"
            title="Store Collections"
            subtitle="Manage curated store collections"
            onPress={() => router.push('/(dashboard)/store-collections')}
          />
          <SettingItem
            icon="receipt"
            iconColor="#F59E0B"
            title="Cashback Rules"
            subtitle="Configure cashback rules & tiers"
            onPress={() => router.push('/(dashboard)/cashback-rules')}
          />
          <SettingItem
            icon="id-card"
            iconColor="#0891B2"
            title="Membership Config"
            subtitle="Manage membership tiers & benefits"
            onPress={() => router.push('/(dashboard)/membership-config')}
          />
          <SettingItem
            icon="ticket"
            iconColor="#D97706"
            title="Voucher Management"
            subtitle="Create & manage vouchers"
            onPress={() => router.push('/(dashboard)/voucher-management')}
          />
          <SettingItem
            icon="car"
            iconColor="#3B82F6"
            title="Delivery Settings"
            subtitle="Configure delivery zones & fees"
            onPress={() => router.push('/(dashboard)/delivery-settings')}
          />
        </View>
      </View>

      {/* Engagement & UGC */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.icon }]}>ENGAGEMENT & UGC</Text>
        <View style={styles.settingsGroup}>
          <SettingItem
            icon="camera"
            iconColor="#EC4899"
            title="Photo Moderation"
            subtitle="Review user-uploaded photos"
            onPress={() => router.push('/(dashboard)/photo-moderation')}
          />
          <SettingItem
            icon="bar-chart"
            iconColor="#6366F1"
            title="Polls"
            subtitle="Create & manage polls"
            onPress={() => router.push('/(dashboard)/polls')}
          />
          <SettingItem
            icon="chatbubble-ellipses"
            iconColor="#D97706"
            title="Offer Comments"
            subtitle="Moderate offer comments"
            onPress={() => router.push('/(dashboard)/offer-comments')}
          />
          <SettingItem
            icon="videocam"
            iconColor="#EF4444"
            title="UGC Reels"
            subtitle="Moderate user-created reels"
            onPress={() => router.push('/(dashboard)/ugc-moderation')}
          />
          <SettingItem
            icon="settings"
            iconColor="#3B82F6"
            title="Engagement Config"
            subtitle="View reward settings & limits"
            onPress={() => router.push('/(dashboard)/engagement-config')}
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
              onPress={() => router.push('/(dashboard)/admin-users')}
            />
            <SettingItem
              icon="pulse"
              iconColor="#06B6D4"
              title="System Health"
              subtitle="Server, database, queues & reconciliation"
              onPress={() => router.push('/(dashboard)/system-health')}
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

      {/* Support & Moderation */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.icon }]}>SUPPORT & MODERATION</Text>
        <View style={styles.settingsGroup}>
          <SettingItem
            icon="settings"
            iconColor="#14B8A6"
            title="Support Config"
            subtitle="Hours, phone numbers, categories & callbacks"
            onPress={() => router.push('/(dashboard)/support-config')}
          />
          <SettingItem
            icon="chatbox-ellipses"
            iconColor="#3B82F6"
            title="Support Tickets"
            subtitle="Manage user support tickets"
            onPress={() => router.push('/(dashboard)/support-tickets')}
          />
          <SettingItem
            icon="construct"
            iconColor="#F97316"
            title="Support Tools"
            subtitle="Credit, debit, reverse cashback, freeze wallets & campaigns"
            onPress={() => router.push('/(dashboard)/support-tools')}
          />
          <SettingItem
            icon="help-buoy"
            iconColor="#8B5CF6"
            title="FAQ Management"
            subtitle="Manage frequently asked questions"
            onPress={() => router.push('/(dashboard)/faq-management')}
          />
          <SettingItem
            icon="notifications"
            iconColor="#F59E0B"
            title="Notification Management"
            subtitle="Send & manage push notifications"
            onPress={() => router.push('/(dashboard)/notification-management')}
          />
          <SettingItem
            icon="warning"
            iconColor="#EF4444"
            title="Fraud Reports"
            subtitle="Review fraud reports & suspicious activity"
            onPress={() => router.push('/(dashboard)/fraud-reports')}
          />
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
