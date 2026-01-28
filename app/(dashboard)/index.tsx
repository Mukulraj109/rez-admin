import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  useColorScheme,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { dashboardService, DashboardStats } from '../../services/api/dashboard';
import { authService } from '../../services/api/auth';
import { Colors } from '../../constants/Colors';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  trend?: { value: number; positive: boolean };
  onPress?: () => void;
}

function StatCard({ title, value, subtitle, icon, iconColor, trend, onPress }: StatCardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <TouchableOpacity
      style={[styles.statCard, { backgroundColor: colors.card }]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={[styles.iconContainer, { backgroundColor: `${iconColor}20` }]}>
        <Ionicons name={icon} size={24} color={iconColor} />
      </View>
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statTitle, { color: colors.icon }]}>{title}</Text>
      {subtitle && (
        <Text style={[styles.statSubtitle, { color: colors.icon }]}>{subtitle}</Text>
      )}
      {trend && (
        <View style={styles.trendContainer}>
          <Ionicons
            name={trend.positive ? 'trending-up' : 'trending-down'}
            size={14}
            color={trend.positive ? colors.success : colors.error}
          />
          <Text
            style={[
              styles.trendText,
              { color: trend.positive ? colors.success : colors.error },
            ]}
          >
            {trend.value}%
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function DashboardScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [adminName, setAdminName] = useState('Admin');

  useEffect(() => {
    loadData();
    loadAdminInfo();
  }, []);

  const loadAdminInfo = async () => {
    const user = await authService.getCurrentUser();
    if (user) {
      setAdminName(user.name || 'Admin');
    }
  };

  const loadData = async () => {
    try {
      const data = await dashboardService.getStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />
      }
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.tint }]}>
        <View>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.adminName}>{adminName}</Text>
        </View>
        <TouchableOpacity
          style={styles.notificationButton}
          onPress={() => router.push('/notifications')}
        >
          <Ionicons name="notifications-outline" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Quick Stats */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Overview</Text>
        <View style={styles.statsGrid}>
          <StatCard
            title="Total Revenue"
            value={stats?.revenue?.thisMonth ? formatCurrency(stats.revenue.thisMonth) : '0'}
            subtitle="This Month"
            icon="wallet"
            iconColor="#10B981"
            onPress={() => router.push('/transactions')}
          />
          <StatCard
            title="Platform Fees"
            value={stats?.revenue?.totalPlatformFees ? formatCurrency(stats.revenue.totalPlatformFees) : '0'}
            subtitle="15% of sales"
            icon="cash"
            iconColor="#3B82F6"
          />
          <StatCard
            title="Orders Today"
            value={stats?.orders?.today || 0}
            subtitle={`${stats?.orders?.thisWeek || 0} this week`}
            icon="receipt"
            iconColor="#F59E0B"
            onPress={() => router.push('/(dashboard)/orders')}
          />
          <StatCard
            title="Pending Orders"
            value={stats?.orders?.pendingCount || 0}
            icon="hourglass"
            iconColor="#EF4444"
            onPress={() => router.push('/(dashboard)/orders')}
          />
        </View>
      </View>

      {/* Merchants Stats */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Merchants</Text>
        <View style={styles.statsGrid}>
          <StatCard
            title="Total Merchants"
            value={stats?.merchants?.total || 0}
            icon="storefront"
            iconColor="#8B5CF6"
            onPress={() => router.push('/(dashboard)/merchants')}
          />
          <StatCard
            title="Pending Approval"
            value={stats?.merchants?.pending || 0}
            icon="time"
            iconColor="#F59E0B"
            onPress={() => router.push('/(dashboard)/merchants')}
          />
          <StatCard
            title="Active"
            value={stats?.merchants?.active || 0}
            icon="checkmark-circle"
            iconColor="#10B981"
          />
          <StatCard
            title="New This Month"
            value={stats?.merchants?.newThisMonth || 0}
            icon="add-circle"
            iconColor="#3B82F6"
          />
        </View>
      </View>

      {/* Users Stats */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Users</Text>
        <View style={styles.statsGrid}>
          <StatCard
            title="Total Users"
            value={formatNumber(stats?.users?.total || 0)}
            icon="people"
            iconColor="#06B6D4"
          />
          <StatCard
            title="Active Users"
            value={formatNumber(stats?.users?.active || 0)}
            icon="person-circle"
            iconColor="#10B981"
          />
          <StatCard
            title="New Today"
            value={stats?.users?.newToday || 0}
            icon="person-add"
            iconColor="#3B82F6"
          />
          <StatCard
            title="New This Month"
            value={formatNumber(stats?.users?.newThisMonth || 0)}
            icon="trending-up"
            iconColor="#8B5CF6"
          />
        </View>
      </View>

      {/* Coins Stats */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Rez Coins</Text>
        <View style={styles.statsGrid}>
          <StatCard
            title="Total Awarded"
            value={formatNumber(stats?.coins?.totalAwarded || 0)}
            icon="sparkles"
            iconColor="#F59E0B"
          />
          <StatCard
            title="Pending Approval"
            value={stats?.coins?.pendingApproval || 0}
            icon="hourglass"
            iconColor="#EF4444"
            onPress={() => router.push('/(dashboard)/coin-rewards')}
          />
          <StatCard
            title="Awarded Today"
            value={formatNumber(stats?.coins?.awardedToday || 0)}
            icon="today"
            iconColor="#10B981"
          />
          <StatCard
            title="This Month"
            value={formatNumber(stats?.coins?.awardedThisMonth || 0)}
            icon="calendar"
            iconColor="#3B82F6"
          />
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
        <View style={[styles.actionsCard, { backgroundColor: colors.card }]}>
          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => router.push('/(dashboard)/coin-rewards')}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="gift" size={20} color="#DC2626" />
            </View>
            <Text style={[styles.actionText, { color: colors.text }]}>Review Coin Rewards</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.icon} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => router.push('/(dashboard)/merchants')}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#DBEAFE' }]}>
              <Ionicons name="storefront" size={20} color="#3B82F6" />
            </View>
            <Text style={[styles.actionText, { color: colors.text }]}>Approve Merchants</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.icon} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => router.push('/(dashboard)/orders')}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#D1FAE5' }]}>
              <Ionicons name="receipt" size={20} color="#10B981" />
            </View>
            <Text style={[styles.actionText, { color: colors.text }]}>Manage Orders</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.icon} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => router.push('/(dashboard)/wallet')}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#F3E8FF' }]}>
              <Ionicons name="wallet" size={20} color="#8B5CF6" />
            </View>
            <Text style={[styles.actionText, { color: colors.text }]}>Platform Wallet</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.icon} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  greeting: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  adminName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    width: '48%',
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  statTitle: {
    fontSize: 13,
    marginTop: 4,
  },
  statSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 4,
  },
  trendText: {
    fontSize: 12,
    fontWeight: '500',
  },
  actionsCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  actionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
});
