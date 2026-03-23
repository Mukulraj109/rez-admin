import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  useColorScheme,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '../../services/api/apiClient';
import { Colors } from '../../constants/Colors';
import { showAlert, showConfirm } from '../../utils/alert';

// ============================================
// TYPES
// ============================================

interface ReferralUser {
  _id: string;
  phoneNumber?: string;
  profile?: { firstName?: string };
  referral?: { referralCode?: string };
}

interface Referral {
  _id: string;
  referrer: ReferralUser | null;
  referee: ReferralUser | null;
  status: string;
  tier?: string;
  coinsEarned?: number;
  metadata?: {
    fraudFlag?: boolean;
    riskScore?: number;
    fraudReason?: string;
    adminApproved?: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

interface StatsSummary {
  total: number;
  pending: number;
  active: number;
  completed: number;
  expired: number;
  fraud: number;
  conversionRate: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

type StatusFilter = 'all' | 'pending' | 'active' | 'completed' | 'expired';
type TabType = 'referrals' | 'stats';

// ============================================
// CONSTANTS
// ============================================

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending: { bg: '#FEF3C7', text: '#92400E' },
  active: { bg: '#DBEAFE', text: '#1E40AF' },
  completed: { bg: '#D1FAE5', text: '#065F46' },
  expired: { bg: '#F3F4F6', text: '#6B7280' },
  rejected: { bg: '#FEE2E2', text: '#991B1B' },
  fraud: { bg: '#FEE2E2', text: '#991B1B' },
};

// ============================================
// HELPERS
// ============================================

function formatDate(dateStr: string): string {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getUserDisplay(user: ReferralUser | null): string {
  if (!user) return 'Unknown';
  if (user.profile?.firstName) return user.profile.firstName;
  if (user.phoneNumber) return user.phoneNumber;
  return 'User';
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function ReferralManagementPage() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  // Tab
  const [activeTab, setActiveTab] = useState<TabType>('stats');

  // Stats
  const [stats, setStats] = useState<StatsSummary | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Referral list
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // ============================================
  // FETCH
  // ============================================

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    const res = await apiClient.get<StatsSummary>('admin/referrals/stats-summary');
    if (res.success && res.data) {
      setStats(res.data);
    }
    setStatsLoading(false);
  }, []);

  const fetchReferrals = useCallback(async (page: number = 1, append: boolean = false) => {
    if (page === 1 && !append) setIsLoading(true);

    const params = new URLSearchParams({
      page: page.toString(),
      limit: '20',
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
    if (statusFilter !== 'all') params.append('status', statusFilter);

    const res = await apiClient.get<{ referrals: Referral[]; pagination: Pagination }>(
      `admin/referrals?${params}`
    );

    if (res.success && res.data) {
      if (append) {
        setReferrals(prev => [...prev, ...res.data!.referrals]);
      } else {
        setReferrals(res.data.referrals);
      }
      setPagination(res.data.pagination);
    }

    setIsLoading(false);
    setIsLoadingMore(false);
    setIsRefreshing(false);
  }, [statusFilter]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    if (activeTab === 'referrals') {
      fetchReferrals(1);
    }
  }, [activeTab, statusFilter]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    if (activeTab === 'stats') {
      fetchStats().then(() => setIsRefreshing(false));
    } else {
      fetchReferrals(1);
    }
  }, [activeTab, fetchStats, fetchReferrals]);

  const handleLoadMore = useCallback(() => {
    if (isLoadingMore || !pagination || pagination.page >= pagination.totalPages) return;
    setIsLoadingMore(true);
    fetchReferrals(pagination.page + 1, true);
  }, [isLoadingMore, pagination, fetchReferrals]);

  // ============================================
  // ACTIONS
  // ============================================

  const handleApprove = (referral: Referral) => {
    showConfirm(
      'Approve Referral',
      'Clear fraud flags and approve this referral?',
      async () => {
        const res = await apiClient.post(`admin/referrals/${referral._id}/approve`);
        if (res.success) {
          showAlert('Approved', 'Referral has been approved.');
          fetchReferrals(1);
          fetchStats();
        } else {
          showAlert('Error', res.message || 'Failed to approve.');
        }
      }
    );
  };

  const handleReject = (referral: Referral) => {
    showConfirm(
      'Reject Referral',
      'Mark this referral as fraudulent?',
      async () => {
        const res = await apiClient.post(`admin/referrals/${referral._id}/reject`, {
          reason: 'Admin rejected via referral management panel',
        });
        if (res.success) {
          showAlert('Rejected', 'Referral has been rejected.');
          fetchReferrals(1);
          fetchStats();
        } else {
          showAlert('Error', res.message || 'Failed to reject.');
        }
      }
    );
  };

  const handleRunFraudScan = async () => {
    showConfirm(
      'Run Fraud Scan',
      'This will scan all pending referrals for fraud patterns. Continue?',
      async () => {
        const res = await apiClient.post('admin/referrals/scan-fraud');
        if (res.success) {
          showAlert('Scan Complete', 'Fraud scan finished.');
          fetchReferrals(1);
          fetchStats();
        } else {
          showAlert('Error', res.message || 'Fraud scan failed.');
        }
      }
    );
  };

  // ============================================
  // RENDER: STATS TAB
  // ============================================

  const renderStatsTab = () => {
    if (statsLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      );
    }

    if (!stats) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No Stats Available</Text>
        </View>
      );
    }

    const statCards = [
      { label: 'Total Referrals', value: stats.total, icon: 'people-outline' as const, color: colors.info },
      { label: 'Completed', value: stats.completed, icon: 'checkmark-circle-outline' as const, color: colors.success },
      { label: 'Pending', value: stats.pending, icon: 'time-outline' as const, color: colors.warning },
      { label: 'Active', value: stats.active, icon: 'flash-outline' as const, color: colors.info },
      { label: 'Expired', value: stats.expired, icon: 'hourglass-outline' as const, color: colors.secondaryText },
      { label: 'Fraud Flagged', value: stats.fraud, icon: 'warning-outline' as const, color: colors.error },
    ];

    return (
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 60 }}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.tint} colors={[colors.tint]} />
        }
      >
        {/* Conversion Rate Hero */}
        <View style={[styles.heroCard, { backgroundColor: colors.tint }]}>
          <View style={styles.heroIcon}>
            <Ionicons name="trending-up" size={28} color="#FFFFFF" />
          </View>
          <View>
            <Text style={styles.heroValue}>{stats.conversionRate}%</Text>
            <Text style={styles.heroLabel}>Conversion Rate</Text>
          </View>
        </View>

        {/* Stats grid */}
        <View style={styles.statsGrid}>
          {statCards.map((s, i) => (
            <View key={i} style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name={s.icon} size={22} color={s.color} />
              <Text style={[styles.statValue, { color: colors.text }]}>{s.value.toLocaleString()}</Text>
              <Text style={[styles.statLabel, { color: colors.secondaryText }]}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Actions */}
        <TouchableOpacity
          style={[styles.scanBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={handleRunFraudScan}
        >
          <Ionicons name="shield-checkmark-outline" size={20} color={colors.tint} />
          <Text style={[styles.scanBtnText, { color: colors.tint }]}>Run Fraud Scan</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  };

  // ============================================
  // RENDER: REFERRALS TAB
  // ============================================

  const renderReferralCard = useCallback(({ item }: { item: Referral }) => {
    const statusStyle = STATUS_COLORS[item.status] || STATUS_COLORS.pending;
    const isFlagged = item.metadata?.fraudFlag;

    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: isFlagged ? colors.error : colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.statusText, { color: statusStyle.text }]}>
              {item.status.toUpperCase()}
            </Text>
          </View>
          {isFlagged && (
            <View style={[styles.statusBadge, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="warning" size={12} color="#DC2626" />
              <Text style={{ color: '#DC2626', fontSize: 10, fontWeight: '700', marginLeft: 4 }}>FRAUD</Text>
            </View>
          )}
          <Text style={[styles.dateText, { color: colors.secondaryText }]}>
            {formatDate(item.createdAt)}
          </Text>
        </View>

        {/* Referrer -> Referee */}
        <View style={styles.referralFlow}>
          <View style={styles.userBox}>
            <Ionicons name="person-outline" size={16} color={colors.info} />
            <View>
              <Text style={[styles.userRole, { color: colors.secondaryText }]}>Referrer</Text>
              <Text style={[styles.userName, { color: colors.text }]}>{getUserDisplay(item.referrer)}</Text>
              {item.referrer?.referral?.referralCode && (
                <Text style={[styles.refCode, { color: colors.secondaryText }]}>
                  Code: {item.referrer.referral.referralCode}
                </Text>
              )}
            </View>
          </View>
          <Ionicons name="arrow-forward" size={18} color={colors.secondaryText} />
          <View style={styles.userBox}>
            <Ionicons name="person-add-outline" size={16} color={colors.success} />
            <View>
              <Text style={[styles.userRole, { color: colors.secondaryText }]}>Referee</Text>
              <Text style={[styles.userName, { color: colors.text }]}>{getUserDisplay(item.referee)}</Text>
            </View>
          </View>
        </View>

        {/* Metadata */}
        {item.metadata?.riskScore !== undefined && (
          <View style={styles.riskRow}>
            <Text style={[styles.riskLabel, { color: colors.secondaryText }]}>Risk Score:</Text>
            <Text style={[
              styles.riskValue,
              { color: item.metadata.riskScore >= 60 ? colors.error : item.metadata.riskScore >= 30 ? colors.warning : colors.success },
            ]}>
              {item.metadata.riskScore}/100
            </Text>
          </View>
        )}

        {/* Actions for flagged */}
        {(isFlagged || item.status === 'pending') && (
          <View style={styles.cardActionRow}>
            <TouchableOpacity
              style={[styles.approveBtn, { backgroundColor: '#D1FAE5' }]}
              onPress={() => handleApprove(item)}
            >
              <Ionicons name="checkmark-circle" size={16} color="#065F46" />
              <Text style={[styles.approveBtnText, { color: '#065F46' }]}>Approve</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.rejectBtn, { backgroundColor: '#FEE2E2' }]}
              onPress={() => handleReject(item)}
            >
              <Ionicons name="close-circle" size={16} color="#991B1B" />
              <Text style={[styles.rejectBtnText, { color: '#991B1B' }]}>Reject</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }, [colors]);

  const renderReferralsTab = () => (
    <>
      {/* Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChips} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
        {(['all', 'pending', 'active', 'completed', 'expired'] as StatusFilter[]).map(f => (
          <TouchableOpacity
            key={f}
            style={[
              styles.filterChip,
              { borderColor: colors.border },
              statusFilter === f && { backgroundColor: colors.tint, borderColor: colors.tint },
            ]}
            onPress={() => setStatusFilter(f)}
          >
            <Text
              style={[
                styles.filterChipText,
                { color: colors.secondaryText },
                statusFilter === f && { color: '#FFFFFF' },
              ]}
            >
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      ) : (
        <FlatList
          data={referrals}
          keyExtractor={(item) => item._id}
          renderItem={renderReferralCard}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIcon, { backgroundColor: colors.backgroundSecondary }]}>
                <Ionicons name="people-outline" size={36} color={colors.tint} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No Referrals</Text>
              <Text style={[styles.emptySubtitle, { color: colors.secondaryText }]}>
                No referrals match the current filter.
              </Text>
            </View>
          }
          ListFooterComponent={
            isLoadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={colors.tint} />
              </View>
            ) : null
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={colors.tint}
              colors={[colors.tint]}
            />
          }
          contentContainerStyle={[styles.listContent, referrals.length === 0 && { flexGrow: 1 }]}
        />
      )}
    </>
  );

  // ============================================
  // MAIN
  // ============================================

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.pageHeader, { borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.pageTitle, { color: colors.text }]}>Referral Management</Text>
          <Text style={[styles.pageSubtitle, { color: colors.secondaryText }]}>
            Track and manage user referrals
          </Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
        {(['stats', 'referrals'] as TabType[]).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && { borderBottomColor: colors.tint, borderBottomWidth: 2 }]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[
              styles.tabText,
              { color: colors.secondaryText },
              activeTab === tab && { color: colors.tint, fontWeight: '700' },
            ]}>
              {tab === 'stats' ? 'Overview' : 'Referrals'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'stats' ? renderStatsTab() : renderReferralsTab()}
    </SafeAreaView>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: { flex: 1 },
  pageHeader: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  pageTitle: { fontSize: 22, fontWeight: '700' },
  pageSubtitle: { fontSize: 13, marginTop: 2 },

  // Tabs
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabText: { fontSize: 14, fontWeight: '600' },

  // Hero card
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroValue: { fontSize: 28, fontWeight: '800', color: '#FFFFFF' },
  heroLabel: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },

  // Stats grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    width: '48%' as any,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    alignItems: 'center',
    gap: 6,
    flexGrow: 1,
    flexBasis: '47%',
  },
  statValue: { fontSize: 22, fontWeight: '700' },
  statLabel: { fontSize: 12 },

  // Scan button
  scanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  scanBtnText: { fontSize: 15, fontWeight: '600' },

  // Filters
  filterChips: { paddingVertical: 12, maxHeight: 52 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipText: { fontSize: 13, fontWeight: '500' },

  // Card
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
  dateText: { fontSize: 11, marginLeft: 'auto' },

  // Referral flow
  referralFlow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  userBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  userRole: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },
  userName: { fontSize: 14, fontWeight: '600' },
  refCode: { fontSize: 11, marginTop: 2 },

  // Risk
  riskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  riskLabel: { fontSize: 12 },
  riskValue: { fontSize: 13, fontWeight: '700' },

  // Card actions
  cardActionRow: { flexDirection: 'row', gap: 8 },
  approveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  approveBtnText: { fontSize: 13, fontWeight: '600' },
  rejectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  rejectBtnText: { fontSize: 13, fontWeight: '600' },

  // List
  listContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 60 },

  // Loading / Empty
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 17, fontWeight: '700', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  footerLoader: { paddingVertical: 16, alignItems: 'center' },
});
