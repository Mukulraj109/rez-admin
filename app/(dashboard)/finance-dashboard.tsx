import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { router } from 'expo-router';
import { showAlert, showConfirm } from '../../utils/alert';
import {
  financeDashboardService,
  FinanceSummary,
  SettlementWallet,
} from '../../services/api/financeDashboard';

// ── Helpers ──────────────────────────────────────────────────────────

function formatCurrency(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(2) + 'K';
  return num.toFixed(2);
}

function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toLocaleString();
}

// ── Period Chip ──────────────────────────────────────────────────────

interface PeriodOption {
  label: string;
  value: number;
}

const PERIODS: PeriodOption[] = [
  { label: 'Today', value: 1 },
  { label: '7 Days', value: 7 },
  { label: '30 Days', value: 30 },
  { label: '90 Days', value: 90 },
];

// ── Stat Card ────────────────────────────────────────────────────────

interface StatCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  label: string;
  value: string;
  bgColor: string;
  textColor?: string;
}

function StatCard({ icon, iconColor, label, value, bgColor, textColor }: StatCardProps) {
  return (
    <View style={[cardStyles.card, { backgroundColor: Colors.light.card, borderColor: Colors.light.border }]}>
      <View style={[cardStyles.iconWrap, { backgroundColor: bgColor }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <Text style={[cardStyles.value, { color: textColor || Colors.light.text }]}>{value}</Text>
      <Text style={[cardStyles.label, { color: Colors.light.icon }]}>{label}</Text>
    </View>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    width: '48%',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  value: {
    fontSize: 20,
    fontWeight: '700',
  },
  label: {
    fontSize: 12,
    marginTop: 4,
  },
});

// ── Settlement Row ───────────────────────────────────────────────────

interface SettlementRowProps {
  wallet: SettlementWallet;
  onProcess: (walletId: string) => void;
  processing: boolean;
}

function SettlementRow({ wallet, onProcess, processing }: SettlementRowProps) {
  const merchantName = wallet.merchant?.fullName || 'Unknown Merchant';
  const storeName = wallet.store?.name || 'Unknown Store';
  const pendingAmount = wallet.balance?.pending || 0;
  const lastSettlement = wallet.lastSettlementAt
    ? new Date(wallet.lastSettlementAt).toLocaleDateString()
    : 'Never';

  return (
    <View style={[styles.settlementRow, { backgroundColor: Colors.light.card, borderColor: Colors.light.border }]}>
      <View style={styles.settlementInfo}>
        <Text style={[styles.merchantName, { color: Colors.light.text }]} numberOfLines={1}>
          {storeName}
        </Text>
        <Text style={[styles.merchantSub, { color: Colors.light.icon }]} numberOfLines={1}>
          {merchantName} {wallet.merchant?.phoneNumber ? `| ${wallet.merchant.phoneNumber}` : ''}
        </Text>
        <View style={styles.settlementMeta}>
          <View style={styles.metaItem}>
            <Text style={[styles.metaLabel, { color: Colors.light.icon }]}>Pending</Text>
            <Text style={[styles.metaValue, { color: pendingAmount > 0 ? Colors.light.warningDark : Colors.light.successDark }]}>
              {formatCurrency(pendingAmount)}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={[styles.metaLabel, { color: Colors.light.icon }]}>Cycle</Text>
            <View style={styles.cycleBadge}>
              <Text style={styles.cycleBadgeText}>{wallet.settlementCycle}</Text>
            </View>
          </View>
          <View style={styles.metaItem}>
            <Text style={[styles.metaLabel, { color: Colors.light.icon }]}>Last Settled</Text>
            <Text style={[styles.metaDate, { color: Colors.light.text }]}>{lastSettlement}</Text>
          </View>
        </View>
      </View>
      {pendingAmount > 0 && (
        <TouchableOpacity
          style={[styles.processBtn, processing && styles.processBtnDisabled]}
          onPress={() => onProcess(wallet._id)}
          disabled={processing}
        >
          {processing ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={styles.processBtnText}>Process</Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── Main Screen ──────────────────────────────────────────────────────

type Tab = 'overview' | 'settlements';

export default function FinanceDashboardScreen() {
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [settlements, setSettlements] = useState<SettlementWallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState(30);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Settlements pagination
  const [settlementPage, setSettlementPage] = useState(1);
  const [settlementHasMore, setSettlementHasMore] = useState(false);
  const [settlementLoadingMore, setSettlementLoadingMore] = useState(false);
  const [settlementTotal, setSettlementTotal] = useState(0);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Data Loaders ─────────────────────────────────────────────────

  const loadSummary = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const data = await financeDashboardService.getSummary(period);
      setSummary(data);
    } catch (error: any) {
      if (!silent) showAlert('Error', error.message || 'Failed to load finance summary');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [period]);

  const loadSettlements = useCallback(async (pageNum: number, append = false) => {
    try {
      if (!append) setLoading(true);
      else setSettlementLoadingMore(true);

      const data = await financeDashboardService.getSettlements({
        status: 'pending',
        page: pageNum,
        limit: 20,
      });

      if (append) {
        setSettlements(prev => [...prev, ...data.settlements]);
      } else {
        setSettlements(data.settlements);
      }
      setSettlementPage(pageNum);
      setSettlementHasMore(data.pagination.hasNextPage);
      setSettlementTotal(data.pagination.totalItems);
    } catch (error: any) {
      if (!append) showAlert('Error', error.message || 'Failed to load settlements');
    } finally {
      setLoading(false);
      setSettlementLoadingMore(false);
    }
  }, []);

  const loadAll = useCallback(async (silent = false) => {
    await Promise.all([
      loadSummary(silent),
      loadSettlements(1),
    ]);
  }, [loadSummary, loadSettlements]);

  // ── Effects ──────────────────────────────────────────────────────

  useEffect(() => {
    loadAll();
    intervalRef.current = setInterval(() => loadAll(true), 30000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [loadAll]);

  useEffect(() => {
    loadSummary();
  }, [period, loadSummary]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadAll().finally(() => setRefreshing(false));
  }, [loadAll]);

  // ── Settlement Actions ───────────────────────────────────────────

  const handleProcessSettlement = useCallback((walletId: string) => {
    showConfirm(
      'Confirm Settlement',
      'Process this settlement? Pending balance will be released to the merchant.',
      async () => {
        try {
          setProcessingId(walletId);
          const result = await financeDashboardService.processSettlement(walletId);
          showAlert('Success', `Settled ${formatCurrency(result.settledAmount)} successfully`);
          // Reload both summary and settlements
          loadAll(true);
        } catch (error: any) {
          showAlert('Error', error.message || 'Failed to process settlement');
        } finally {
          setProcessingId(null);
        }
      }
    );
  }, [loadAll]);

  const onEndReached = useCallback(() => {
    if (settlementHasMore && !settlementLoadingMore) {
      loadSettlements(settlementPage + 1, true);
    }
  }, [settlementHasMore, settlementLoadingMore, settlementPage, loadSettlements]);

  // ── Loading State ────────────────────────────────────────────────

  if (loading && !summary && settlements.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: Colors.light.background }]}>
        <ActivityIndicator size="large" color={Colors.light.info} />
        <Text style={[styles.loadingText, { color: Colors.light.icon }]}>Loading finance data...</Text>
      </View>
    );
  }

  // ── Render ───────────────────────────────────────────────────────

  const renderSettlementItem = useCallback(({ item }: { item: SettlementWallet }) => (
    <SettlementRow
      wallet={item}
      onProcess={handleProcessSettlement}
      processing={processingId === item._id}
    />
  ), [handleProcessSettlement, processingId]);

  const keyExtractor = useCallback((item: SettlementWallet) => item._id, []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: Colors.light.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: Colors.light.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <View style={styles.headerIconWrap}>
          <Ionicons name="cash-outline" size={22} color={Colors.light.info} />
        </View>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: Colors.light.text }]}>Finance Dashboard</Text>
          <Text style={[styles.headerSubtitle, { color: Colors.light.icon }]}>Auto-refreshes every 30s</Text>
        </View>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshBtn}>
          <Ionicons name="refresh" size={22} color={Colors.light.icon} />
        </TouchableOpacity>
      </View>

      {/* Tab Selector */}
      <View style={[styles.tabRow, { borderBottomColor: Colors.light.border }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'overview' && styles.tabActive]}
          onPress={() => setActiveTab('overview')}
        >
          <Text style={[styles.tabText, activeTab === 'overview' && styles.tabTextActive]}>
            Overview
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'settlements' && styles.tabActive]}
          onPress={() => setActiveTab('settlements')}
        >
          <Text style={[styles.tabText, activeTab === 'settlements' && styles.tabTextActive]}>
            Settlements ({settlementTotal})
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'overview' ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.light.info} />
          }
        >
          {summary && (
            <>
              {/* Period Selector */}
              <Text style={[styles.sectionTitle, { color: Colors.light.text }]}>Period</Text>
              <View style={styles.periodRow}>
                {PERIODS.map(p => (
                  <TouchableOpacity
                    key={p.value}
                    style={[
                      styles.periodChip,
                      period === p.value
                        ? { backgroundColor: Colors.light.info }
                        : { backgroundColor: Colors.light.card, borderColor: Colors.light.border, borderWidth: 1 },
                    ]}
                    onPress={() => setPeriod(p.value)}
                  >
                    <Text
                      style={[
                        styles.periodChipText,
                        { color: period === p.value ? '#FFF' : Colors.light.text },
                      ]}
                    >
                      {p.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* KPI Cards */}
              <Text style={[styles.sectionTitle, { color: Colors.light.text, marginTop: 20 }]}>
                Key Metrics ({summary.period}d)
              </Text>
              <View style={styles.cardGrid}>
                <StatCard
                  icon="trending-up"
                  iconColor={Colors.light.info}
                  label="Gross Merchandise Value"
                  value={formatCurrency(summary.gmv)}
                  bgColor={`${Colors.light.info}20`}
                  textColor={Colors.light.info}
                />
                <StatCard
                  icon="business"
                  iconColor={Colors.light.success}
                  label={`Platform Commission (${(summary.commissionRate * 100).toFixed(0)}%)`}
                  value={formatCurrency(summary.commission)}
                  bgColor={`${Colors.light.success}20`}
                  textColor={Colors.light.successDark}
                />
                <StatCard
                  icon="diamond"
                  iconColor={Colors.light.warning}
                  label="Coin Issuance Cost"
                  value={formatCurrency(summary.coinCost)}
                  bgColor={`${Colors.light.warning}20`}
                  textColor={Colors.light.warningDark}
                />
                <StatCard
                  icon="wallet"
                  iconColor={summary.netRevenue >= 0 ? Colors.light.success : Colors.light.error}
                  label="Net Revenue"
                  value={formatCurrency(summary.netRevenue)}
                  bgColor={summary.netRevenue >= 0 ? `${Colors.light.success}20` : `${Colors.light.error}20`}
                  textColor={summary.netRevenue >= 0 ? Colors.light.successDark : Colors.light.errorDark}
                />
              </View>

              {/* Additional Stats */}
              <Text style={[styles.sectionTitle, { color: Colors.light.text, marginTop: 20 }]}>
                Activity
              </Text>
              <View style={[styles.infoCard, { backgroundColor: Colors.light.card, borderColor: Colors.light.border }]}>
                <View style={styles.infoRow}>
                  <View style={styles.infoItem}>
                    <Text style={[styles.infoLabel, { color: Colors.light.icon }]}>Total Orders</Text>
                    <Text style={[styles.infoValue, { color: Colors.light.text }]}>
                      {formatNumber(summary.orderCount)}
                    </Text>
                  </View>
                  <View style={[styles.infoDivider, { backgroundColor: Colors.light.border }]} />
                  <View style={styles.infoItem}>
                    <Text style={[styles.infoLabel, { color: Colors.light.icon }]}>Coins Issued</Text>
                    <Text style={[styles.infoValue, { color: Colors.light.text }]}>
                      {formatNumber(summary.coinsIssued)}
                    </Text>
                  </View>
                </View>
                <View style={[styles.avgRow, { borderTopColor: Colors.light.border }]}>
                  <Text style={[styles.infoLabel, { color: Colors.light.icon }]}>Avg. Order Value</Text>
                  <Text style={[styles.infoValue, { color: Colors.light.text }]}>
                    {summary.orderCount > 0
                      ? formatCurrency(summary.gmv / summary.orderCount)
                      : '0.00'}
                  </Text>
                </View>
              </View>

              {/* Revenue Breakdown Bar */}
              <Text style={[styles.sectionTitle, { color: Colors.light.text, marginTop: 20 }]}>
                Revenue Breakdown
              </Text>
              <View style={[styles.breakdownCard, { backgroundColor: Colors.light.card, borderColor: Colors.light.border }]}>
                <View style={styles.breakdownRow}>
                  <View style={styles.breakdownItem}>
                    <View style={[styles.breakdownDot, { backgroundColor: Colors.light.info }]} />
                    <Text style={[styles.breakdownLabel, { color: Colors.light.icon }]}>GMV</Text>
                  </View>
                  <Text style={[styles.breakdownValue, { color: Colors.light.text }]}>
                    {formatCurrency(summary.gmv)}
                  </Text>
                </View>
                <View style={styles.breakdownRow}>
                  <View style={styles.breakdownItem}>
                    <View style={[styles.breakdownDot, { backgroundColor: Colors.light.success }]} />
                    <Text style={[styles.breakdownLabel, { color: Colors.light.icon }]}>Commission</Text>
                  </View>
                  <Text style={[styles.breakdownValue, { color: Colors.light.successDark }]}>
                    +{formatCurrency(summary.commission)}
                  </Text>
                </View>
                <View style={styles.breakdownRow}>
                  <View style={styles.breakdownItem}>
                    <View style={[styles.breakdownDot, { backgroundColor: Colors.light.warning }]} />
                    <Text style={[styles.breakdownLabel, { color: Colors.light.icon }]}>Coin Cost</Text>
                  </View>
                  <Text style={[styles.breakdownValue, { color: Colors.light.warningDark }]}>
                    -{formatCurrency(summary.coinCost)}
                  </Text>
                </View>
                <View style={[styles.breakdownDivider, { backgroundColor: Colors.light.border }]} />
                <View style={styles.breakdownRow}>
                  <View style={styles.breakdownItem}>
                    <View
                      style={[
                        styles.breakdownDot,
                        { backgroundColor: summary.netRevenue >= 0 ? Colors.light.success : Colors.light.error },
                      ]}
                    />
                    <Text style={[styles.breakdownLabel, { color: Colors.light.text, fontWeight: '700' }]}>
                      Net Revenue
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.breakdownValue,
                      {
                        color: summary.netRevenue >= 0 ? Colors.light.successDark : Colors.light.errorDark,
                        fontWeight: '700',
                      },
                    ]}
                  >
                    {formatCurrency(summary.netRevenue)}
                  </Text>
                </View>
              </View>

              <View style={{ height: 120 }} />
            </>
          )}
        </ScrollView>
      ) : (
        /* Settlements Tab */
        <FlatList
          data={settlements}
          renderItem={renderSettlementItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.3}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.light.info} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={[styles.emptyIcon, { backgroundColor: `${Colors.light.success}20` }]}>
                <Ionicons name="checkmark-circle" size={36} color={Colors.light.success} />
              </View>
              <Text style={[styles.emptyTitle, { color: Colors.light.text }]}>No Pending Settlements</Text>
              <Text style={[styles.emptySubtitle, { color: Colors.light.icon }]}>
                All merchant settlements are up to date
              </Text>
            </View>
          }
          ListFooterComponent={
            settlementLoadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={Colors.light.info} />
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 4 },
  headerIconWrap: { marginLeft: 10 },
  headerCenter: { flex: 1, marginLeft: 8 },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  headerSubtitle: { fontSize: 12, marginTop: 2 },
  refreshBtn: { padding: 4 },

  // Tabs
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: 16,
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginRight: 8,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: Colors.light.info,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.light.icon,
  },
  tabTextActive: {
    color: Colors.light.info,
    fontWeight: '700',
  },

  // Scroll
  scrollView: { flex: 1 },
  scrollContent: { padding: 16 },
  listContent: { padding: 16, paddingBottom: 120 },

  // Sections
  sectionTitle: { fontSize: 17, fontWeight: '700', marginBottom: 12 },

  // Period chips
  periodRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  periodChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  periodChipText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Card grid
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  // Info card (orders + coins)
  infoCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoItem: {
    flex: 1,
    alignItems: 'center',
  },
  infoDivider: {
    width: 1,
    height: 40,
  },
  infoLabel: {
    fontSize: 12,
  },
  infoValue: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 4,
  },
  avgRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },

  // Breakdown card
  breakdownCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  breakdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  breakdownDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  breakdownLabel: {
    fontSize: 13,
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  breakdownDivider: {
    height: 1,
    marginVertical: 4,
  },

  // Settlement row
  settlementRow: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  settlementInfo: {
    flex: 1,
  },
  merchantName: {
    fontSize: 15,
    fontWeight: '700',
  },
  merchantSub: {
    fontSize: 12,
    marginTop: 2,
  },
  settlementMeta: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 16,
  },
  metaItem: {},
  metaLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  metaValue: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 2,
  },
  metaDate: {
    fontSize: 12,
    marginTop: 2,
  },
  cycleBadge: {
    backgroundColor: Colors.light.backgroundSecondary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 2,
  },
  cycleBadgeText: {
    fontSize: 10,
    color: Colors.light.mutedDark,
    fontWeight: '600',
  },
  processBtn: {
    backgroundColor: Colors.light.info,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginLeft: 10,
  },
  processBtnDisabled: {
    opacity: 0.6,
  },
  processBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  emptySubtitle: {
    fontSize: 13,
    marginTop: 4,
  },

  // Footer loader
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});
