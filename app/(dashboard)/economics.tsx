import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  useColorScheme,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { economicsService, EconomicsOverview } from '../../services/api/economics';
import { Colors } from '../../constants/Colors';
import { router } from 'expo-router';

function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toLocaleString();
}

function formatSourceName(source: string): string {
  return source
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

interface StatCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  label: string;
  value: string | number;
  bgColor: string;
  textColor?: string;
}

function StatCard({ icon, iconColor, label, value, bgColor, textColor }: StatCardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <View style={[statCardStyles.card, { backgroundColor: Colors.light.card, borderColor: Colors.light.border }]}>
      <View style={[statCardStyles.iconWrap, { backgroundColor: bgColor }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <Text style={[statCardStyles.value, { color: textColor || Colors.light.text }]}>
        {typeof value === 'number' ? formatNumber(value) : value}
      </Text>
      <Text style={[statCardStyles.label, { color: Colors.light.icon }]}>{label}</Text>
    </View>
  );
}

const statCardStyles = StyleSheet.create({
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
    fontSize: 22,
    fontWeight: '700',
  },
  label: {
    fontSize: 12,
    marginTop: 4,
  },
});

export default function EconomicsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [data, setData] = useState<EconomicsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadData = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const overview = await economicsService.getOverview();
      setData(overview);
    } catch (error) {
      if (__DEV__) console.error('Failed to load economics data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    intervalRef.current = setInterval(() => loadData(true), 30000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  if (loading && !data) {
    return (
      <View style={[styles.centered, { backgroundColor: Colors.light.background }]}>
        <ActivityIndicator size="large" color={Colors.light.warning} />
        <Text style={[styles.loadingText, { color: Colors.light.icon }]}>Loading economics data...</Text>
      </View>
    );
  }

  const cashbackTrend = data?.cashbackToday.yesterdayAmount
    ? Math.round(((data.cashbackToday.totalAmount - data.cashbackToday.yesterdayAmount) / data.cashbackToday.yesterdayAmount) * 100)
    : data?.cashbackToday.totalAmount ? 100 : 0;

  const maxHourlyCount = data?.fraudAlerts.hourlyAlertCounts.length
    ? Math.max(...data.fraudAlerts.hourlyAlertCounts.map((h) => h.count), 1)
    : 1;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: Colors.light.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: Colors.light.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: Colors.light.text }]}>Economic Control Center</Text>
          <Text style={[styles.headerSubtitle, { color: Colors.light.icon }]}>
            Auto-refreshes every 30s
          </Text>
        </View>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshBtn}>
          <Ionicons name="refresh" size={22} color={Colors.light.icon} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.light.warning} />
        }
      >
        {data && (
          <>
            {/* ── Section 1: Cashback Hero ─────────────────────── */}
            <Text style={[styles.sectionTitle, { color: Colors.light.text }]}>Cashback Today</Text>

            <View style={[styles.heroCard, { backgroundColor: Colors.light.warning, borderColor: Colors.light.warningDark }]}>
              <View style={styles.heroRow}>
                <View>
                  <Text style={styles.heroLabel}>Total Cashback Issued</Text>
                  <Text style={styles.heroValue}>{formatNumber(data.cashbackToday.totalAmount)}</Text>
                </View>
                <View style={styles.heroIconWrap}>
                  <Ionicons name="cash" size={32} color={Colors.light.card} />
                </View>
              </View>
              <View style={styles.heroSubRow}>
                <View style={styles.heroSubItem}>
                  <Text style={styles.heroSubLabel}>Transactions</Text>
                  <Text style={styles.heroSubValue}>{formatNumber(data.cashbackToday.transactionCount)}</Text>
                </View>
                <View style={styles.heroSubItem}>
                  <Text style={styles.heroSubLabel}>vs Yesterday</Text>
                  <Text style={styles.heroSubValue}>
                    {cashbackTrend >= 0 ? '↑' : '↓'} {Math.abs(cashbackTrend)}%
                  </Text>
                </View>
                <View style={styles.heroSubItem}>
                  <Text style={styles.heroSubLabel}>Yesterday</Text>
                  <Text style={styles.heroSubValue}>{formatNumber(data.cashbackToday.yesterdayAmount)}</Text>
                </View>
              </View>
            </View>

            {/* ── Section 2: Merchant Liability ────────────────── */}
            <Text style={[styles.sectionTitle, { color: Colors.light.text, marginTop: 24 }]}>Merchant Liability</Text>

            <View style={styles.cardGrid}>
              <StatCard
                icon="wallet"
                iconColor={Colors.light.warning}
                label="Total Pending"
                value={data.merchantLiability.totalPending}
                bgColor={`${Colors.light.warning}20`}
                textColor={Colors.light.warningDark}
              />
              <StatCard
                icon="checkmark-circle"
                iconColor={Colors.light.success}
                label="Total Settled"
                value={data.merchantLiability.totalSettled}
                bgColor={`${Colors.light.success}20`}
                textColor={Colors.light.successDark}
              />
              <StatCard
                icon="hourglass"
                iconColor={Colors.light.info}
                label="Awaiting Settlement"
                value={data.merchantLiability.pendingSettlementCount}
                bgColor={`${Colors.light.info}20`}
              />
              <StatCard
                icon="alert-circle"
                iconColor={Colors.light.error}
                label="Disputed"
                value={data.merchantLiability.disputedCount}
                bgColor={`${Colors.light.error}20`}
                textColor={Colors.light.errorDark}
              />
            </View>

            {/* ── Section 3: Fraud Spike Monitor ───────────────── */}
            <Text style={[styles.sectionTitle, { color: Colors.light.text, marginTop: 24 }]}>Fraud Spike Monitor</Text>

            {data.fraudAlerts.alertCount > 0 ? (
              <View>
                <View style={[styles.alertBanner, { backgroundColor: Colors.light.warningLight, borderColor: Colors.light.warning }]}>
                  <Ionicons name="warning" size={20} color={Colors.light.warningDark} />
                  <Text style={[styles.alertBannerText, { color: Colors.light.warningDeep }]}>
                    {data.fraudAlerts.alertCount} user(s) earned &gt; {formatNumber(data.fraudAlerts.threshold)} coins in {data.fraudAlerts.window}
                  </Text>
                </View>

                {/* Hourly bar chart */}
                {data.fraudAlerts.hourlyAlertCounts.length > 0 && (
                  <View style={[styles.chartCard, { backgroundColor: Colors.light.card, borderColor: Colors.light.border }]}>
                    <Text style={[styles.chartTitle, { color: Colors.light.text }]}>Hourly Fraud Alerts (24h)</Text>
                    {data.fraudAlerts.hourlyAlertCounts.map((item) => (
                      <View key={item.hour} style={styles.barRow}>
                        <Text style={[styles.barLabel, { color: Colors.light.icon }]}>{item.hour}h</Text>
                        <View style={styles.barTrack}>
                          <View
                            style={[
                              styles.barFill,
                              {
                                width: `${(item.count / maxHourlyCount) * 100}%`,
                                backgroundColor: item.count > 0 ? Colors.light.error : Colors.light.gray200,
                              },
                            ]}
                          />
                        </View>
                        <Text style={[styles.barCount, { color: Colors.light.icon }]}>{item.count}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Top flagged users */}
                {data.fraudAlerts.topFlaggedUsers.map((user, idx) => (
                  <View
                    key={user.userId || idx}
                    style={[styles.fraudCard, { backgroundColor: Colors.light.errorLight, borderColor: '#FECACA' }]}
                  >
                    <View style={styles.fraudHeader}>
                      <View style={[styles.fraudIconWrap, { backgroundColor: Colors.light.errorLight }]}>
                        <Ionicons name="alert-circle" size={20} color={Colors.light.error} />
                      </View>
                      <View style={styles.fraudInfo}>
                        <Text style={[styles.fraudName, { color: Colors.light.errorDeep }]}>
                          {user.userName?.trim() || 'Unknown User'}
                        </Text>
                        <Text style={[styles.fraudId, { color: colors.errorDarker }]}>
                          ID: {String(user.userId).substring(0, 12)}...
                        </Text>
                      </View>
                    </View>
                    <View style={styles.fraudMetrics}>
                      <View style={styles.fraudMetricItem}>
                        <Text style={[styles.fraudMetricLabel, { color: colors.errorDarker }]}>Coins Earned</Text>
                        <Text style={[styles.fraudMetricValue, { color: Colors.light.errorDeep }]}>
                          {formatNumber(user.totalEarned)}
                        </Text>
                      </View>
                      <View style={styles.fraudMetricItem}>
                        <Text style={[styles.fraudMetricLabel, { color: colors.errorDarker }]}>Transactions</Text>
                        <Text style={[styles.fraudMetricValue, { color: Colors.light.errorDeep }]}>
                          {user.transactionCount}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View style={[styles.noAlertsCard, { backgroundColor: colors.successLighter, borderColor: '#BBF7D0' }]}>
                <Ionicons name="checkmark-circle" size={24} color="#16A34A" />
                <Text style={[styles.noAlertsText, { color: '#166534' }]}>
                  No fraud alerts in the last 24 hours
                </Text>
              </View>
            )}

            {/* ── Section 4: Coin Issuance Rate ────────────────── */}
            <Text style={[styles.sectionTitle, { color: Colors.light.text, marginTop: 24 }]}>Coin Issuance Rate</Text>

            <View
              style={[
                styles.issuanceCard,
                {
                  backgroundColor: data.coinIssuance.changePercent >= 0 ? `${Colors.light.success}15` : `${Colors.light.error}15`,
                  borderColor: data.coinIssuance.changePercent >= 0 ? Colors.light.success : Colors.light.error,
                },
              ]}
            >
              <View style={styles.issuanceRow}>
                <View style={styles.issuanceItem}>
                  <Text style={[styles.issuanceLabel, { color: Colors.light.icon }]}>Today</Text>
                  <Text style={[styles.issuanceBigValue, { color: Colors.light.text }]}>
                    {formatNumber(data.coinIssuance.todayTotal)}
                  </Text>
                </View>
                <View style={styles.issuanceItem}>
                  <Text style={[styles.issuanceLabel, { color: Colors.light.icon }]}>Rate</Text>
                  <Text style={[styles.issuanceBigValue, { color: Colors.light.text }]}>
                    {formatNumber(data.coinIssuance.hourlyRate)}/hr
                  </Text>
                </View>
                <View style={styles.issuanceItem}>
                  <Text style={[styles.issuanceLabel, { color: Colors.light.icon }]}>vs Yesterday</Text>
                  <Text
                    style={[
                      styles.issuanceBigValue,
                      { color: data.coinIssuance.changePercent >= 0 ? Colors.light.success : Colors.light.error },
                    ]}
                  >
                    {data.coinIssuance.changePercent >= 0 ? '↑' : '↓'} {Math.abs(data.coinIssuance.changePercent)}%
                  </Text>
                </View>
              </View>
            </View>

            {/* Top Sources */}
            {data.coinIssuance.topSources.length > 0 && (
              <View style={[styles.sourcesCard, { backgroundColor: Colors.light.card, borderColor: Colors.light.border }]}>
                <Text style={[styles.sourcesTitle, { color: Colors.light.text }]}>Top Sources Today</Text>
                {data.coinIssuance.topSources.map((src, idx) => (
                  <View
                    key={src.source}
                    style={[
                      styles.sourceRow,
                      idx < data.coinIssuance.topSources.length - 1 && { borderBottomWidth: 1, borderBottomColor: Colors.light.border },
                    ]}
                  >
                    <View style={styles.sourceInfo}>
                      <Text style={[styles.sourceRank, { color: Colors.light.icon }]}>#{idx + 1}</Text>
                      <Text style={[styles.sourceName, { color: Colors.light.text }]}>
                        {formatSourceName(src.source)}
                      </Text>
                    </View>
                    <View style={styles.sourceStats}>
                      <Text style={[styles.sourceAmount, { color: Colors.light.text }]}>
                        {formatNumber(src.amount)}
                      </Text>
                      <View style={styles.sourceBadge}>
                        <Text style={styles.sourceBadgeText}>{src.count} txns</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* ── Section 5: Reward Reversal Queue ─────────────── */}
            <Text style={[styles.sectionTitle, { color: Colors.light.text, marginTop: 24 }]}>Reward Reversal Queue</Text>

            <View style={styles.cardGrid}>
              <StatCard
                icon="time"
                iconColor={Colors.light.warning}
                label="Pending Reversals"
                value={data.rewardReversals.pendingReversals}
                bgColor={`${Colors.light.warning}20`}
                textColor={data.rewardReversals.pendingReversals > 0 ? Colors.light.warningDark : undefined}
              />
              <StatCard
                icon="checkmark-done"
                iconColor={Colors.light.success}
                label="Completed Today"
                value={data.rewardReversals.completedReversalsToday}
                bgColor={`${Colors.light.success}20`}
              />
            </View>

            {data.rewardReversals.completedReversalAmount > 0 && (
              <View style={[styles.infoRow, { backgroundColor: Colors.light.card, borderColor: Colors.light.border }]}>
                <Text style={[styles.infoLabel, { color: Colors.light.icon }]}>Reversed Amount Today</Text>
                <Text style={[styles.infoValue, { color: Colors.light.text }]}>
                  {formatNumber(data.rewardReversals.completedReversalAmount)} NC
                </Text>
              </View>
            )}

            {data.rewardReversals.oldestPendingAge !== null && data.rewardReversals.oldestPendingAge > 0 && (
              <View
                style={[
                  styles.warningRow,
                  {
                    backgroundColor: data.rewardReversals.oldestPendingAge > 24 ? Colors.light.errorLight : '#FFFBEB',
                    borderColor: data.rewardReversals.oldestPendingAge > 24 ? '#FECACA' : '#FDE68A',
                  },
                ]}
              >
                <Ionicons
                  name="warning"
                  size={16}
                  color={data.rewardReversals.oldestPendingAge > 24 ? Colors.light.error : Colors.light.warning}
                />
                <Text
                  style={[
                    styles.warningText,
                    { color: data.rewardReversals.oldestPendingAge > 24 ? Colors.light.errorDeep : Colors.light.warningDeep },
                  ]}
                >
                  Oldest pending reversal: {data.rewardReversals.oldestPendingAge}h ago
                </Text>
              </View>
            )}

            {/* ── Section 6: Settlement Due ────────────────────── */}
            <Text style={[styles.sectionTitle, { color: Colors.light.text, marginTop: 24 }]}>Settlement Due Merchants</Text>

            <View style={styles.cardGrid}>
              <StatCard
                icon="people"
                iconColor={Colors.light.info}
                label="Merchants Due"
                value={data.settlementDue.totalDueMerchants}
                bgColor={`${Colors.light.info}20`}
              />
              <StatCard
                icon="cash"
                iconColor={Colors.light.warning}
                label="Total Pending"
                value={data.settlementDue.totalPendingAmount}
                bgColor={`${Colors.light.warning}20`}
                textColor={Colors.light.warningDark}
              />
            </View>

            {/* Top merchants table */}
            {data.settlementDue.topMerchants.length > 0 && (
              <View style={[styles.tableCard, { backgroundColor: Colors.light.card, borderColor: Colors.light.border }]}>
                <Text style={[styles.tableTitle, { color: Colors.light.text }]}>Top Pending Settlements</Text>
                <View style={styles.tableHeader}>
                  <Text style={[styles.tableHeaderText, { color: Colors.light.icon, flex: 2 }]}>Store</Text>
                  <Text style={[styles.tableHeaderText, { color: Colors.light.icon, flex: 1, textAlign: 'right' }]}>Amount</Text>
                  <Text style={[styles.tableHeaderText, { color: Colors.light.icon, flex: 1, textAlign: 'right' }]}>Cycle</Text>
                </View>
                {data.settlementDue.topMerchants.map((m, idx) => (
                  <View
                    key={m.merchantId || idx}
                    style={[
                      styles.tableRow,
                      idx < data.settlementDue.topMerchants.length - 1 && { borderBottomWidth: 1, borderBottomColor: Colors.light.border },
                    ]}
                  >
                    <Text style={[styles.tableCell, { color: Colors.light.text, flex: 2 }]} numberOfLines={1}>
                      {m.storeName}
                    </Text>
                    <Text style={[styles.tableCell, { color: Colors.light.warningDark, flex: 1, textAlign: 'right', fontWeight: '600' }]}>
                      {formatNumber(m.pendingAmount)}
                    </Text>
                    <View style={{ flex: 1, alignItems: 'flex-end' }}>
                      <View style={styles.cycleBadge}>
                        <Text style={styles.cycleBadgeText}>{m.settlementCycle}</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Last updated */}
            <View style={styles.lastUpdated}>
              <Text style={[styles.lastUpdatedText, { color: Colors.light.icon }]}>
                Last updated: {new Date(data.lastUpdated).toLocaleTimeString()}
              </Text>
            </View>

            <View style={{ height: 40 }} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 4 },
  headerCenter: { flex: 1, marginLeft: 12 },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  headerSubtitle: { fontSize: 12, marginTop: 2 },
  refreshBtn: { padding: 4 },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16 },
  sectionTitle: { fontSize: 17, fontWeight: '700', marginBottom: 12 },

  // Hero card
  heroCard: { borderRadius: 16, borderWidth: 1, padding: 20, marginBottom: 14 },
  heroRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroLabel: { fontSize: 13, color: Colors.light.warningLight, fontWeight: '500' },
  heroValue: { fontSize: 32, fontWeight: '800', color: Colors.light.card, marginTop: 4 },
  heroIconWrap: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  heroSubRow: { flexDirection: 'row', marginTop: 16, gap: 20 },
  heroSubItem: { flex: 1 },
  heroSubLabel: { fontSize: 11, color: Colors.light.warningLight },
  heroSubValue: { fontSize: 16, fontWeight: '700', color: Colors.light.card, marginTop: 2 },

  // Card grid
  cardGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },

  // Alert banner
  alertBanner: {
    flexDirection: 'row', alignItems: 'center',
    padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 10, gap: 10,
  },
  alertBannerText: { fontSize: 13, fontWeight: '500', flex: 1 },

  // Chart card (fraud bars)
  chartCard: { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 10 },
  chartTitle: { fontSize: 13, fontWeight: '600', marginBottom: 10 },
  barRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  barLabel: { width: 28, fontSize: 10, textAlign: 'right', marginRight: 8 },
  barTrack: { flex: 1, height: 14, backgroundColor: Colors.light.backgroundSecondary, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4 },
  barCount: { width: 24, fontSize: 10, textAlign: 'center', marginLeft: 6 },

  // Fraud cards
  fraudCard: { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 10 },
  fraudHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  fraudIconWrap: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  fraudInfo: { flex: 1 },
  fraudName: { fontSize: 14, fontWeight: '700' },
  fraudId: { fontSize: 11, marginTop: 2 },
  fraudMetrics: { flexDirection: 'row', marginTop: 12, gap: 20 },
  fraudMetricItem: { flex: 1 },
  fraudMetricLabel: { fontSize: 11 },
  fraudMetricValue: { fontSize: 18, fontWeight: '700', marginTop: 2 },

  // No alerts
  noAlertsCard: {
    flexDirection: 'row', alignItems: 'center',
    padding: 16, borderRadius: 12, borderWidth: 1, gap: 12,
  },
  noAlertsText: { fontSize: 14, fontWeight: '500', flex: 1 },

  // Issuance card
  issuanceCard: { borderRadius: 12, borderWidth: 1, padding: 16, marginBottom: 10 },
  issuanceRow: { flexDirection: 'row', justifyContent: 'space-between' },
  issuanceItem: { alignItems: 'center', flex: 1 },
  issuanceLabel: { fontSize: 11 },
  issuanceBigValue: { fontSize: 18, fontWeight: '700', marginTop: 4 },

  // Sources card
  sourcesCard: { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 4 },
  sourcesTitle: { fontSize: 13, fontWeight: '600', marginBottom: 10 },
  sourceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
  sourceInfo: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 8 },
  sourceRank: { fontSize: 12, fontWeight: '600', width: 24 },
  sourceName: { fontSize: 13, fontWeight: '500' },
  sourceStats: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sourceAmount: { fontSize: 14, fontWeight: '700' },
  sourceBadge: { backgroundColor: Colors.light.infoLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  sourceBadgeText: { fontSize: 10, color: Colors.light.info, fontWeight: '600' },

  // Info row
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 14, borderRadius: 10, borderWidth: 1, marginBottom: 8,
  },
  infoLabel: { fontSize: 12 },
  infoValue: { fontSize: 14, fontWeight: '700' },

  // Warning row
  warningRow: {
    flexDirection: 'row', alignItems: 'center',
    padding: 12, borderRadius: 10, borderWidth: 1, gap: 8, marginBottom: 4,
  },
  warningText: { fontSize: 13, fontWeight: '500' },

  // Settlement table
  tableCard: { borderRadius: 12, borderWidth: 1, padding: 14 },
  tableTitle: { fontSize: 13, fontWeight: '600', marginBottom: 10 },
  tableHeader: { flexDirection: 'row', paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: Colors.light.gray200 },
  tableHeaderText: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  tableCell: { fontSize: 13 },
  cycleBadge: { backgroundColor: Colors.light.backgroundSecondary, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  cycleBadgeText: { fontSize: 10, color: Colors.light.mutedDark, fontWeight: '600' },

  // Last updated
  lastUpdated: { alignItems: 'center', marginTop: 16 },
  lastUpdatedText: { fontSize: 11 },
});
