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
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import {
  adminWalletService,
  AdminWalletSummary,
  AdminWalletTransaction,
  DailyBreakdownItem,
} from '../../services/api/adminWallet';

type TabType = 'overview' | 'transactions' | 'breakdown';

export default function AdminWalletScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [summary, setSummary] = useState<AdminWalletSummary | null>(null);
  const [transactions, setTransactions] = useState<AdminWalletTransaction[]>([]);
  const [breakdown, setBreakdown] = useState<DailyBreakdownItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [txPage, setTxPage] = useState(1);
  const [txHasMore, setTxHasMore] = useState(true);
  const [txLoading, setTxLoading] = useState(false);

  const loadSummary = async () => {
    try {
      const data = await adminWalletService.getWalletSummary();
      setSummary(data);
    } catch (error) {
      console.error('Failed to load wallet summary:', error);
    }
  };

  const loadTransactions = async (page: number = 1, append: boolean = false) => {
    try {
      setTxLoading(true);
      const data = await adminWalletService.getTransactionHistory(page, 20);
      if (append) {
        setTransactions(prev => [...prev, ...data.transactions]);
      } else {
        setTransactions(data.transactions);
      }
      setTxHasMore(data.pagination.hasNext);
      setTxPage(page);
    } catch (error) {
      console.error('Failed to load transactions:', error);
    } finally {
      setTxLoading(false);
    }
  };

  const loadBreakdown = async () => {
    try {
      const data = await adminWalletService.getDailyBreakdown(30);
      setBreakdown(data.breakdown);
    } catch (error) {
      console.error('Failed to load breakdown:', error);
    }
  };

  const loadData = async () => {
    await Promise.all([loadSummary(), loadTransactions(1), loadBreakdown()]);
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  const loadMoreTransactions = () => {
    if (txHasMore && !txLoading) {
      loadTransactions(txPage + 1, true);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatShortDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
    });
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  const renderTab = (tab: TabType, label: string, icon: keyof typeof Ionicons.glyphMap) => (
    <TouchableOpacity
      key={tab}
      style={[
        styles.tab,
        activeTab === tab && { backgroundColor: colors.tint, borderColor: colors.tint },
      ]}
      onPress={() => setActiveTab(tab)}
    >
      <Ionicons
        name={icon}
        size={16}
        color={activeTab === tab ? colors.card : colors.icon}
      />
      <Text style={[styles.tabText, { color: activeTab === tab ? colors.card : colors.icon }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderTransactionItem = ({ item }: { item: AdminWalletTransaction }) => (
    <View style={[styles.txItem, { backgroundColor: colors.card }]}>
      <View style={[styles.txIcon, { backgroundColor: item.type === 'commission' ? colors.successLight : colors.errorLight }]}>
        <Ionicons
          name={item.type === 'commission' ? 'trending-up' : 'swap-horizontal'}
          size={18}
          color={item.type === 'commission' ? colors.success : colors.error}
        />
      </View>
      <View style={styles.txDetails}>
        <Text style={[styles.txDescription, { color: colors.text }]} numberOfLines={1}>
          {item.description}
        </Text>
        <Text style={[styles.txMeta, { color: colors.icon }]}>
          {item.orderNumber ? `Order #${item.orderNumber}` : item.type}
          {' · '}
          {formatDate(item.createdAt)}
        </Text>
      </View>
      <Text style={[styles.txAmount, { color: colors.success }]}>
        +{formatCurrency(item.amount)}
      </Text>
    </View>
  );

  const renderOverview = () => (
    <ScrollView
      style={styles.tabContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />
      }
    >
      {/* Balance Cards */}
      <View style={styles.balanceSection}>
        <View style={[styles.balanceCard, { backgroundColor: colors.tint }]}>
          <Text style={styles.balanceLabel}>Total Balance</Text>
          <Text style={styles.balanceAmount}>
            {formatCurrency(summary?.balance?.total || 0)}
          </Text>
          <Text style={styles.balanceSub}>Available: {formatCurrency(summary?.balance?.available || 0)}</Text>
        </View>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsSection}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Statistics</Text>
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <View style={[styles.statIcon, { backgroundColor: colors.successLight }]}>
              <Ionicons name="cash" size={20} color={colors.success} />
            </View>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {formatCurrency(summary?.statistics?.totalCommissions || 0)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.icon }]}>Total Commissions</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <View style={[styles.statIcon, { backgroundColor: colors.infoLighter }]}>
              <Ionicons name="receipt" size={20} color={colors.info} />
            </View>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {summary?.statistics?.totalOrders || 0}
            </Text>
            <Text style={[styles.statLabel, { color: colors.icon }]}>Total Orders</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <View style={[styles.statIcon, { backgroundColor: colors.warningLight }]}>
              <Ionicons name="analytics" size={20} color={colors.warning} />
            </View>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {formatCurrency(summary?.statistics?.averageCommission || 0)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.icon }]}>Avg Commission</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <View style={[styles.statIcon, { backgroundColor: '#EDE9FE' }]}>
              <Ionicons name="pie-chart" size={20} color={colors.purple} />
            </View>
            <Text style={[styles.statValue, { color: colors.text }]}>5%</Text>
            <Text style={[styles.statLabel, { color: colors.icon }]}>Commission Rate</Text>
          </View>
        </View>
      </View>

      {/* Recent Transactions */}
      <View style={styles.recentSection}>
        <View style={styles.recentHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Transactions</Text>
          <TouchableOpacity onPress={() => setActiveTab('transactions')}>
            <Text style={[styles.viewAllText, { color: colors.tint }]}>View All</Text>
          </TouchableOpacity>
        </View>
        {(summary?.recentTransactions || []).length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: colors.card }]}>
            <Ionicons name="wallet-outline" size={48} color={colors.icon} />
            <Text style={[styles.emptyText, { color: colors.icon }]}>
              No transactions yet. Commission will appear here when orders are placed.
            </Text>
          </View>
        ) : (
          summary?.recentTransactions.slice(0, 5).map((tx) => (
            <View key={tx._id}>
              {renderTransactionItem({ item: tx })}
            </View>
          ))
        )}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );

  const renderTransactions = () => (
    <FlatList
      data={transactions}
      keyExtractor={(item) => item._id}
      renderItem={renderTransactionItem}
      contentContainerStyle={styles.txList}
      onEndReached={loadMoreTransactions}
      onEndReachedThreshold={0.5}
      ListEmptyComponent={
        <View style={[styles.emptyState, { backgroundColor: colors.card }]}>
          <Ionicons name="wallet-outline" size={48} color={colors.icon} />
          <Text style={[styles.emptyText, { color: colors.icon }]}>No transactions yet</Text>
        </View>
      }
      ListFooterComponent={
        txLoading ? (
          <ActivityIndicator style={{ padding: 16 }} color={colors.tint} />
        ) : null
      }
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />
      }
    />
  );

  const renderBreakdown = () => {
    const maxTotal = Math.max(...breakdown.map(d => d.total), 1);

    return (
      <ScrollView
        style={styles.tabContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />
        }
      >
        <Text style={[styles.sectionTitle, { color: colors.text, padding: 16 }]}>
          Daily Commission (Last 30 Days)
        </Text>

        {breakdown.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: colors.card, margin: 16 }]}>
            <Ionicons name="bar-chart-outline" size={48} color={colors.icon} />
            <Text style={[styles.emptyText, { color: colors.icon }]}>No data for this period</Text>
          </View>
        ) : (
          <View style={styles.breakdownList}>
            {breakdown.map((day) => (
              <View key={day.date} style={[styles.breakdownRow, { backgroundColor: colors.card }]}>
                <View style={styles.breakdownDate}>
                  <Text style={[styles.breakdownDateText, { color: colors.text }]}>
                    {formatShortDate(day.date)}
                  </Text>
                  <Text style={[styles.breakdownCount, { color: colors.icon }]}>
                    {day.count} order{day.count !== 1 ? 's' : ''}
                  </Text>
                </View>
                <View style={styles.breakdownBarContainer}>
                  <View
                    style={[
                      styles.breakdownBar,
                      { width: `${(day.total / maxTotal) * 100}%`, backgroundColor: colors.tint },
                    ]}
                  />
                </View>
                <Text style={[styles.breakdownAmount, { color: colors.text }]}>
                  {formatCurrency(day.total)}
                </Text>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.tint }]}>
        <Text style={styles.headerTitle}>Platform Wallet</Text>
        <Text style={styles.headerSubtitle}>5% commission from all orders</Text>
      </View>

      {/* Tabs */}
      <View style={[styles.tabBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {renderTab('overview', 'Overview', 'grid-outline')}
        {renderTab('transactions', 'Transactions', 'list-outline')}
        {renderTab('breakdown', 'Daily', 'bar-chart-outline')}
      </View>

      {/* Content */}
      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'transactions' && renderTransactions()}
      {activeTab === 'breakdown' && renderBreakdown()}
    </View>
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

  // Header
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.light.card,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },

  // Tabs
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.light.gray200,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
  },

  tabContent: {
    flex: 1,
  },

  // Balance
  balanceSection: {
    padding: 16,
  },
  balanceCard: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: '700',
    color: Colors.light.card,
  },
  balanceSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 8,
  },

  // Stats
  statsSection: {
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
    width: '47%',
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },

  // Recent
  recentSection: {
    padding: 16,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Transaction Item
  txList: {
    padding: 16,
    gap: 8,
  },
  txItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  txIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  txDetails: {
    flex: 1,
  },
  txDescription: {
    fontSize: 14,
    fontWeight: '500',
  },
  txMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  txAmount: {
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 12,
  },

  // Empty State
  emptyState: {
    padding: 40,
    borderRadius: 16,
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Breakdown
  breakdownList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    gap: 12,
  },
  breakdownDate: {
    width: 70,
  },
  breakdownDateText: {
    fontSize: 13,
    fontWeight: '600',
  },
  breakdownCount: {
    fontSize: 11,
    marginTop: 2,
  },
  breakdownBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: Colors.light.gray200,
    borderRadius: 4,
    overflow: 'hidden',
  },
  breakdownBar: {
    height: '100%',
    borderRadius: 4,
  },
  breakdownAmount: {
    fontSize: 14,
    fontWeight: '600',
    width: 80,
    textAlign: 'right',
  },
});
