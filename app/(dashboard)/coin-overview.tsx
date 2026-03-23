/**
 * Admin Coin System Overview Page
 *
 * Dashboard showing coin stats by type (rez, branded, promo, prive),
 * daily issuance progress, and emergency kill switch controls.
 * Auto-refreshes every 30 seconds.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  SafeAreaView,
  useColorScheme,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { BRAND } from '../../constants/brand';
import { showAlert, showConfirm } from '../../utils/alert';
import {
  coinOverviewService,
  CoinOverviewData,
  CoinTypeStats,
  EmergencyStatus,
} from '../../services/api/coinOverview';

const COIN_TYPES = ['rez', 'branded', 'promo', 'prive'] as const;
type CoinType = (typeof COIN_TYPES)[number];

const COIN_LABELS: Record<CoinType, string> = {
  rez: `${BRAND.COIN_SHORT} (Core)`,
  branded: 'Branded',
  promo: 'Promo',
  prive: 'Prive',
};

const COIN_COLORS: Record<CoinType, string> = {
  rez: '#7C3AED',
  branded: '#F59E0B',
  promo: '#3B82F6',
  prive: '#10B981',
};

function formatNumber(num: number): string {
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
  return num.toLocaleString();
}

// ── Skeleton loader ──────────────────────────────────────────────────
function SkeletonBox({ width, height, style }: { width: number | string; height: number; style?: any }) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  return (
    <View
      style={[
        { width: width as any, height, borderRadius: 8, backgroundColor: colors.gray200 },
        style,
      ]}
    />
  );
}

function LoadingSkeleton() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <SkeletonBox width={28} height={28} />
          <View style={{ marginLeft: 10 }}>
            <SkeletonBox width={180} height={20} />
            <SkeletonBox width={130} height={12} style={{ marginTop: 4 }} />
          </View>
        </View>
        <SkeletonBox width={28} height={28} />
      </View>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Kill switch skeleton */}
        <SkeletonBox width="100%" height={64} style={{ borderRadius: 14, marginBottom: 16 }} />
        {/* Daily stats skeleton */}
        <SkeletonBox width="100%" height={56} style={{ borderRadius: 12, marginBottom: 20 }} />
        {/* 2x2 grid skeleton */}
        <View style={styles.grid}>
          {[1, 2, 3, 4].map((i) => (
            <SkeletonBox key={i} width="48%" height={180} style={{ borderRadius: 12, marginBottom: 10 }} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Coin type card ───────────────────────────────────────────────────
function CoinCard({ stats, type }: { stats: CoinTypeStats; type: CoinType }) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const accent = COIN_COLORS[type];
  const redemptionPct = Math.min(100, stats.redemptionRate);

  return (
    <View style={[styles.coinCard, { backgroundColor: colors.card, borderColor: colors.border, borderTopColor: accent }]}>
      {/* Header */}
      <View style={styles.coinCardHeader}>
        <View style={[styles.coinDot, { backgroundColor: accent }]} />
        <Text style={[styles.coinTypeName, { color: colors.text }]}>{COIN_LABELS[type]}</Text>
      </View>

      {/* Stats rows */}
      <View style={styles.coinStatRow}>
        <Text style={[styles.coinStatLabel, { color: colors.mutedDark }]}>Total Issued</Text>
        <Text style={[styles.coinStatValue, { color: colors.text }]}>{formatNumber(stats.totalIssued)}</Text>
      </View>
      <View style={styles.coinStatRow}>
        <Text style={[styles.coinStatLabel, { color: colors.mutedDark }]}>Total Redeemed</Text>
        <Text style={[styles.coinStatValue, { color: colors.text }]}>{formatNumber(stats.totalRedeemed)}</Text>
      </View>
      <View style={styles.coinStatRow}>
        <Text style={[styles.coinStatLabel, { color: colors.mutedDark }]}>Active Balance</Text>
        <Text style={[styles.coinStatValue, { color: accent, fontWeight: '800' }]}>{formatNumber(stats.activeBalance)}</Text>
      </View>
      <View style={styles.coinStatRow}>
        <Text style={[styles.coinStatLabel, { color: colors.mutedDark }]}>Users Holding</Text>
        <Text style={[styles.coinStatValue, { color: colors.text }]}>{formatNumber(stats.usersHolding)}</Text>
      </View>

      {/* Redemption rate bar */}
      <View style={styles.redemptionSection}>
        <View style={styles.redemptionHeader}>
          <Text style={[styles.coinStatLabel, { color: colors.mutedDark }]}>Redemption Rate</Text>
          <Text style={[styles.redemptionPct, { color: accent }]}>{stats.redemptionRate.toFixed(1)}%</Text>
        </View>
        <View style={[styles.redemptionBarTrack, { backgroundColor: colors.gray200 }]}>
          <View style={[styles.redemptionBarFill, { width: `${redemptionPct}%`, backgroundColor: accent }]} />
        </View>
      </View>

      {/* Today section */}
      <View style={[styles.todaySection, { backgroundColor: colors.backgroundSecondary }]}>
        <View style={styles.todayItem}>
          <Text style={[styles.todayLabel, { color: colors.mutedDark }]}>Issued Today</Text>
          <Text style={[styles.todayValue, { color: colors.text }]}>{formatNumber(stats.issuedToday)}</Text>
        </View>
        <View style={[styles.todayDivider, { backgroundColor: colors.border }]} />
        <View style={styles.todayItem}>
          <Text style={[styles.todayLabel, { color: colors.mutedDark }]}>Redeemed Today</Text>
          <Text style={[styles.todayValue, { color: colors.text }]}>{formatNumber(stats.redeemedToday)}</Text>
        </View>
      </View>
    </View>
  );
}

// ── Main screen ──────────────────────────────────────────────────────
export default function CoinOverviewScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [overview, setOverview] = useState<CoinOverviewData | null>(null);
  const [emergency, setEmergency] = useState<EmergencyStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pauseReason, setPauseReason] = useState('');
  const [isPausing, setIsPausing] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadData = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError(null);
      const [overviewData, emergencyData] = await Promise.all([
        coinOverviewService.getOverview(),
        coinOverviewService.getEmergencyStatus(),
      ]);
      setOverview(overviewData);
      setEmergency(emergencyData);
    } catch (err: any) {
      if (!silent) setError(err.message || 'Failed to load coin overview');
      if (__DEV__) console.error('Coin overview load error:', err);
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

  // ── Kill switch: activate ─────────────────────────────
  const handleActivateKillSwitch = useCallback(() => {
    if (!pauseReason.trim()) {
      showAlert('Reason Required', 'Please provide a reason for activating the kill switch.');
      return;
    }
    showConfirm(
      'Activate Kill Switch?',
      `This will pause ALL coin issuance across the platform.\n\nReason: ${pauseReason.trim()}`,
      async () => {
        setIsPausing(true);
        try {
          await coinOverviewService.pauseIssuance(
            COIN_TYPES as unknown as string[],
            pauseReason.trim(),
            24,
          );
          showAlert('Kill Switch Activated', 'All coin issuance has been paused.');
          setPauseReason('');
          loadData();
        } catch (err: any) {
          showAlert('Error', err.message || 'Failed to activate kill switch.');
        } finally {
          setIsPausing(false);
        }
      },
      'Activate',
      'warning',
    );
  }, [pauseReason, loadData]);

  // ── Kill switch: deactivate ───────────────────────────
  const handleDeactivateKillSwitch = useCallback(() => {
    showConfirm(
      'Resume Coin Issuance?',
      'This will re-enable coin issuance for all paused coin types.',
      async () => {
        setIsPausing(true);
        try {
          await coinOverviewService.resumeIssuance();
          showAlert('Issuance Resumed', 'All coin types have been re-enabled.');
          loadData();
        } catch (err: any) {
          showAlert('Error', err.message || 'Failed to resume issuance.');
        } finally {
          setIsPausing(false);
        }
      },
      'Resume All',
    );
  }, [loadData]);

  // ── Loading skeleton ──────────────────────────────────
  if (loading && !overview) {
    return <LoadingSkeleton />;
  }

  // ── Error state ───────────────────────────────────────
  if (error && !overview) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <View style={[styles.errorIconWrap, { backgroundColor: colors.errorLight }]}>
            <Ionicons name="alert-circle" size={40} color={colors.error} />
          </View>
          <Text style={[styles.errorTitle, { color: colors.text }]}>Failed to Load</Text>
          <Text style={[styles.errorMessage, { color: colors.mutedDark }]}>{error}</Text>
          <TouchableOpacity style={[styles.retryBtn, { backgroundColor: colors.purpleDark }]} onPress={() => loadData()}>
            <Ionicons name="refresh" size={18} color="#FFF" />
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Issuance progress ─────────────────────────────────
  const issuancePct = overview
    ? Math.min(100, (overview.issuedTodayTotal / (overview.dailyIssuanceCap || 1)) * 100)
    : 0;
  const issuanceWarning = issuancePct >= 90;

  // ── Find coin stats by type ───────────────────────────
  const getCoinStats = (type: CoinType): CoinTypeStats | undefined => {
    return overview?.coinTypes?.find((c) => c.type === type);
  };

  const killSwitchActive = emergency?.isPaused || overview?.killSwitchActive;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <Ionicons name="analytics-outline" size={26} color={colors.purpleDark} />
          <View style={{ marginLeft: 10 }}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Coin System Overview</Text>
            <Text style={[styles.headerSubtitle, { color: colors.mutedDark }]}>Auto-refreshes every 30s</Text>
          </View>
        </View>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshBtn}>
          <Ionicons name="refresh" size={22} color={colors.mutedDark} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.purpleDark} />
        }
      >
        {/* ── Kill Switch Section ──────────────────────────── */}
        <View
          style={[
            styles.killSwitchCard,
            {
              backgroundColor: killSwitchActive ? colors.errorLight : colors.card,
              borderColor: killSwitchActive ? colors.errorDark : colors.border,
            },
          ]}
        >
          <View style={styles.killSwitchHeader}>
            <View style={styles.killSwitchLeft}>
              <View style={[styles.statusDot, { backgroundColor: killSwitchActive ? colors.error : colors.success }]} />
              <View>
                <Text style={[styles.killSwitchTitle, { color: colors.text }]}>Emergency Kill Switch</Text>
                <Text style={[styles.killSwitchStatus, { color: killSwitchActive ? colors.errorDark : colors.successDark }]}>
                  {killSwitchActive ? 'ACTIVE - Issuance Paused' : 'Inactive - System Normal'}
                </Text>
              </View>
            </View>
          </View>

          {killSwitchActive && emergency ? (
            <View style={styles.killSwitchActiveDetails}>
              {emergency.pausedCoinTypes.length > 0 && (
                <Text style={[styles.killSwitchDetail, { color: colors.errorDeep }]}>
                  Paused types: {emergency.pausedCoinTypes.join(', ')}
                </Text>
              )}
              {emergency.reason && (
                <Text style={[styles.killSwitchDetail, { color: colors.errorDeep }]}>
                  Reason: {emergency.reason}
                </Text>
              )}
              {emergency.pausedAt && (
                <Text style={[styles.killSwitchDetail, { color: colors.mutedDark }]}>
                  Since: {new Date(emergency.pausedAt).toLocaleString()}
                </Text>
              )}
              {emergency.pausedBy && (
                <Text style={[styles.killSwitchDetail, { color: colors.mutedDark }]}>
                  By: {emergency.pausedBy}
                </Text>
              )}
              <TouchableOpacity
                style={[styles.killSwitchBtn, { backgroundColor: colors.successDark }]}
                onPress={handleDeactivateKillSwitch}
                disabled={isPausing}
              >
                {isPausing ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Ionicons name="play-circle" size={18} color="#FFF" />
                    <Text style={styles.killSwitchBtnText}>Resume All Issuance</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.killSwitchControls}>
              <TextInput
                style={[
                  styles.reasonInput,
                  { backgroundColor: colors.backgroundSecondary, borderColor: colors.border, color: colors.text },
                ]}
                placeholder="Reason for activating kill switch (required)"
                placeholderTextColor={colors.muted}
                value={pauseReason}
                onChangeText={setPauseReason}
                multiline
              />
              <TouchableOpacity
                style={[styles.killSwitchBtn, { backgroundColor: colors.errorDark, opacity: pauseReason.trim() ? 1 : 0.5 }]}
                onPress={handleActivateKillSwitch}
                disabled={isPausing || !pauseReason.trim()}
              >
                {isPausing ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Ionicons name="stop-circle" size={18} color="#FFF" />
                    <Text style={styles.killSwitchBtnText}>Activate Kill Switch</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ── Daily Issuance Stats ─────────────────────────── */}
        <View
          style={[
            styles.dailyCard,
            {
              backgroundColor: colors.card,
              borderColor: issuanceWarning ? colors.warningDark : colors.border,
            },
          ]}
        >
          <View style={styles.dailyHeader}>
            <Ionicons name="trending-up" size={20} color={issuanceWarning ? colors.warning : colors.purpleDark} />
            <Text style={[styles.dailyTitle, { color: colors.text }]}>Daily Issuance</Text>
          </View>
          <View style={styles.dailyStatsRow}>
            <Text style={[styles.dailyIssuedText, { color: colors.text }]}>
              Issued Today:{' '}
              <Text style={{ fontWeight: '800' }}>{formatNumber(overview?.issuedTodayTotal || 0)}</Text>
            </Text>
            <Text style={[styles.dailyCapText, { color: colors.mutedDark }]}>
              Cap: {formatNumber(overview?.dailyIssuanceCap || 0)}
            </Text>
          </View>
          <View style={[styles.progressBarTrack, { backgroundColor: colors.gray200 }]}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${issuancePct}%`,
                  backgroundColor: issuanceWarning ? colors.warning : colors.purpleDark,
                },
              ]}
            />
          </View>
          <Text style={[styles.progressPctText, { color: issuanceWarning ? colors.warningDark : colors.mutedDark }]}>
            {issuancePct.toFixed(1)}% of daily cap used
          </Text>
        </View>

        {/* ── Coin Type Cards (2x2 Grid) ──────────────────── */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Coin Types</Text>
        <View style={styles.grid}>
          {COIN_TYPES.map((type) => {
            const stats = getCoinStats(type);
            if (!stats) return null;
            return <CoinCard key={type} stats={stats} type={type} />;
          })}
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  headerSubtitle: { fontSize: 12, marginTop: 2 },
  refreshBtn: { padding: 6 },

  // Kill switch
  killSwitchCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  killSwitchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  killSwitchLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  statusDot: { width: 12, height: 12, borderRadius: 6 },
  killSwitchTitle: { fontSize: 15, fontWeight: '700' },
  killSwitchStatus: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  killSwitchActiveDetails: { marginTop: 12 },
  killSwitchDetail: { fontSize: 13, marginBottom: 4 },
  killSwitchControls: { marginTop: 12 },
  reasonInput: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 10,
    minHeight: 44,
  },
  killSwitchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
    marginTop: 4,
  },
  killSwitchBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },

  // Daily issuance
  dailyCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 20,
  },
  dailyHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  dailyTitle: { fontSize: 15, fontWeight: '700' },
  dailyStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dailyIssuedText: { fontSize: 14 },
  dailyCapText: { fontSize: 13 },
  progressBarTrack: { height: 10, borderRadius: 5, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 5 },
  progressPctText: { fontSize: 11, marginTop: 4, textAlign: 'right' },

  // Section title
  sectionTitle: { fontSize: 17, fontWeight: '700', marginBottom: 12 },

  // Grid
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },

  // Coin card
  coinCard: {
    width: '48%',
    borderRadius: 12,
    borderWidth: 1,
    borderTopWidth: 3,
    padding: 14,
    marginBottom: 12,
  },
  coinCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  coinDot: { width: 8, height: 8, borderRadius: 4 },
  coinTypeName: { fontSize: 13, fontWeight: '700' },
  coinStatRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  coinStatLabel: { fontSize: 11 },
  coinStatValue: { fontSize: 12, fontWeight: '700' },

  // Redemption bar
  redemptionSection: { marginTop: 6, marginBottom: 8 },
  redemptionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  redemptionPct: { fontSize: 12, fontWeight: '700' },
  redemptionBarTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  redemptionBarFill: { height: '100%', borderRadius: 3 },

  // Today section inside card
  todaySection: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 8,
    marginTop: 2,
  },
  todayItem: { flex: 1, alignItems: 'center' },
  todayDivider: { width: 1, marginVertical: 2 },
  todayLabel: { fontSize: 9, marginBottom: 2 },
  todayValue: { fontSize: 12, fontWeight: '700' },

  // Error state
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  errorIconWrap: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  errorTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  errorMessage: { fontSize: 14, textAlign: 'center', marginBottom: 20 },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  retryBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
});
