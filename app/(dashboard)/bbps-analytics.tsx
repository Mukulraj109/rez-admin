import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, useColorScheme, SafeAreaView,
  ScrollView, StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { showAlert } from '../../utils/alert';
import { bbpsAdminService, BbpsStats } from '../../services/api/bbps';

const PERIOD_OPTIONS = [
  { key: '7d', label: '7 Days' },
  { key: '30d', label: '30 Days' },
  { key: '90d', label: '90 Days' },
  { key: 'all', label: 'All Time' },
];

export default function BbpsAnalyticsScreen() {
  const scheme = useColorScheme();
  const colors = Colors[scheme ?? 'light'];

  const [stats, setStats] = useState<BbpsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState('30d');

  useEffect(() => { loadStats(); }, [period]);

  const loadStats = async () => {
    try {
      if (!refreshing) setLoading(true);
      const data = await bbpsAdminService.getStats(period);
      setStats(data);
    } catch {
      showAlert('Error', 'Failed to load analytics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => { setRefreshing(true); loadStats(); };

  const formatCurrency = (amount: number) =>
    amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const formatNumber = (n: number) => n.toLocaleString();

  const getBillTypeColor = (type: string) => {
    const map: Record<string, string> = {
      prepaid: '#3B82F6', postpaid: '#8B5CF6', electricity: '#F59E0B',
      dth: '#EC4899', broadband: '#06B6D4', gas: '#EF4444',
      fastag: '#10B981', water: '#0EA5E9', insurance: '#6366F1', loan: '#D97706',
    };
    return map[type] || colors.tabIconDefault;
  };

  const getBillTypeIcon = (type: string): keyof typeof Ionicons.glyphMap => {
    const map: Record<string, keyof typeof Ionicons.glyphMap> = {
      prepaid: 'phone-portrait-outline',
      postpaid: 'call-outline',
      electricity: 'flash-outline',
      dth: 'tv-outline',
      broadband: 'wifi-outline',
      gas: 'flame-outline',
      fastag: 'car-outline',
      water: 'water-outline',
      insurance: 'shield-checkmark-outline',
      loan: 'cash-outline',
    };
    return map[type] || 'receipt-outline';
  };

  if (loading && !stats) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.tint} />
        <Text style={{ color: colors.tabIconDefault, marginTop: 12 }}>Loading analytics...</Text>
      </SafeAreaView>
    );
  }

  const maxVolume = stats?.volumeByBillType?.length
    ? Math.max(...stats.volumeByBillType.map(v => v.volume), 1)
    : 1;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />}
      >
        {/* Header */}
        <View style={{ padding: 16, paddingBottom: 0 }}>
          <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text }}>BBPS Analytics</Text>
          <Text style={{ fontSize: 13, color: colors.tabIconDefault, marginTop: 4 }}>
            Bill payment performance metrics
          </Text>

          {/* Period selector */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12, marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {PERIOD_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt.key}
                  onPress={() => setPeriod(opt.key)}
                  style={{
                    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8,
                    backgroundColor: period === opt.key ? colors.tint : colors.card,
                  }}
                >
                  <Text style={{
                    fontSize: 12, fontWeight: '700',
                    color: period === opt.key ? '#fff' : colors.text,
                  }}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Summary Cards */}
        <View style={{ paddingHorizontal: 16 }}>
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
            <View style={[styles.summaryCard, { backgroundColor: colors.card, flex: 1 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: `${colors.success}18`, justifyContent: 'center', alignItems: 'center' }}>
                  <Ionicons name="trending-up" size={18} color={colors.success} />
                </View>
                <Text style={{ fontSize: 12, color: colors.tabIconDefault, fontWeight: '600' }}>Total Volume</Text>
              </View>
              <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text }}>
                {formatCurrency(stats?.totalVolume ?? 0)}
              </Text>
            </View>
            <View style={[styles.summaryCard, { backgroundColor: colors.card, flex: 1 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: `${colors.info}18`, justifyContent: 'center', alignItems: 'center' }}>
                  <Ionicons name="receipt" size={18} color={colors.info} />
                </View>
                <Text style={{ fontSize: 12, color: colors.tabIconDefault, fontWeight: '600' }}>Transactions</Text>
              </View>
              <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text }}>
                {formatNumber(stats?.totalTransactions ?? 0)}
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
            <View style={[styles.summaryCard, { backgroundColor: colors.card, flex: 1 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: `${colors.purple}18`, justifyContent: 'center', alignItems: 'center' }}>
                  <Ionicons name="gift" size={18} color={colors.purple} />
                </View>
                <Text style={{ fontSize: 12, color: colors.tabIconDefault, fontWeight: '600' }}>Coins Issued</Text>
              </View>
              <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text }}>
                {formatNumber(stats?.totalCoinsIssued ?? 0)}
              </Text>
            </View>
            <View style={[styles.summaryCard, { backgroundColor: colors.card, flex: 1 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: `${colors.error}18`, justifyContent: 'center', alignItems: 'center' }}>
                  <Ionicons name="alert-circle" size={18} color={colors.error} />
                </View>
                <Text style={{ fontSize: 12, color: colors.tabIconDefault, fontWeight: '600' }}>Failed Rate</Text>
              </View>
              <Text style={{ fontSize: 22, fontWeight: '800', color: (stats?.failedRate ?? 0) > 5 ? colors.error : colors.text }}>
                {(stats?.failedRate ?? 0).toFixed(1)}%
              </Text>
            </View>
          </View>
        </View>

        {/* Revenue by Bill Type */}
        <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: `${colors.warning}18`, justifyContent: 'center', alignItems: 'center' }}>
              <Ionicons name="bar-chart-outline" size={18} color={colors.warning} />
            </View>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>Revenue by Bill Type</Text>
          </View>
          <View style={[styles.chartCard, { backgroundColor: colors.card }]}>
            {(stats?.volumeByBillType ?? []).length === 0 ? (
              <View style={{ alignItems: 'center', padding: 24 }}>
                <Ionicons name="bar-chart-outline" size={40} color={colors.tabIconDefault} />
                <Text style={{ color: colors.tabIconDefault, marginTop: 8 }}>No data yet</Text>
              </View>
            ) : (
              stats!.volumeByBillType.map((item, index) => {
                const barWidth = Math.max((item.volume / maxVolume) * 100, 5);
                const typeColor = getBillTypeColor(item.billType);
                return (
                  <View key={item.billType} style={{ marginBottom: index < stats!.volumeByBillType.length - 1 ? 14 : 0 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons name={getBillTypeIcon(item.billType)} size={14} color={typeColor} />
                        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text, textTransform: 'capitalize' }}>
                          {item.billType}
                        </Text>
                      </View>
                      <Text style={{ fontSize: 12, color: colors.tabIconDefault }}>
                        {formatCurrency(item.volume)} ({item.count})
                      </Text>
                    </View>
                    <View style={{ height: 8, backgroundColor: `${typeColor}18`, borderRadius: 4, overflow: 'hidden' }}>
                      <View style={{
                        height: '100%', width: `${barWidth}%`,
                        backgroundColor: typeColor, borderRadius: 4,
                      }} />
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </View>

        {/* Top Providers */}
        <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: `${colors.info}18`, justifyContent: 'center', alignItems: 'center' }}>
              <Ionicons name="trophy-outline" size={18} color={colors.info} />
            </View>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>Top 5 Providers by Volume</Text>
          </View>
          <View style={[styles.chartCard, { backgroundColor: colors.card }]}>
            {(stats?.topProviders ?? []).length === 0 ? (
              <View style={{ alignItems: 'center', padding: 24 }}>
                <Ionicons name="trophy-outline" size={40} color={colors.tabIconDefault} />
                <Text style={{ color: colors.tabIconDefault, marginTop: 8 }}>No data yet</Text>
              </View>
            ) : (
              stats!.topProviders.map((provider, index) => (
                <View
                  key={provider.code}
                  style={{
                    flexDirection: 'row', alignItems: 'center',
                    paddingVertical: 10,
                    borderBottomWidth: index < stats!.topProviders.length - 1 ? StyleSheet.hairlineWidth : 0,
                    borderBottomColor: colors.border,
                  }}
                >
                  {/* Rank badge */}
                  <View style={{
                    width: 28, height: 28, borderRadius: 14,
                    backgroundColor: index === 0 ? '#FEF3C7' : index === 1 ? '#F1F5F9' : index === 2 ? '#FED7AA' : colors.background,
                    justifyContent: 'center', alignItems: 'center', marginRight: 10,
                  }}>
                    <Text style={{
                      fontSize: 12, fontWeight: '800',
                      color: index === 0 ? '#92400E' : index === 1 ? '#475569' : index === 2 ? '#9A3412' : colors.tabIconDefault,
                    }}>
                      {index + 1}
                    </Text>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>{provider.name}</Text>
                    <Text style={{ fontSize: 11, color: colors.tabIconDefault }}>{provider.code}</Text>
                  </View>

                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>
                      {formatCurrency(provider.volume)}
                    </Text>
                    <Text style={{ fontSize: 11, color: colors.tabIconDefault }}>
                      {formatNumber(provider.count)} txns
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </View>

        {/* Transaction Status Breakdown */}
        <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: `${colors.indigo}18`, justifyContent: 'center', alignItems: 'center' }}>
              <Ionicons name="pie-chart-outline" size={18} color={colors.indigo} />
            </View>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>Transaction Status</Text>
          </View>
          <View style={[styles.chartCard, { backgroundColor: colors.card }]}>
            {([
              { label: 'Completed', value: stats?.completedCount ?? 0, color: colors.success, icon: 'checkmark-circle' as const },
              { label: 'Pending', value: stats?.pendingCount ?? 0, color: colors.warning, icon: 'time' as const },
              { label: 'Failed', value: stats?.failedCount ?? 0, color: colors.error, icon: 'close-circle' as const },
              { label: 'Refunded', value: stats?.refundedCount ?? 0, color: colors.purple, icon: 'return-down-back' as const },
            ]).map((item, index) => (
              <View
                key={item.label}
                style={{
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                  paddingVertical: 12,
                  borderBottomWidth: index < 3 ? StyleSheet.hairlineWidth : 0,
                  borderBottomColor: colors.border,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name={item.icon} size={18} color={item.color} />
                  <Text style={{ fontSize: 14, color: colors.text, fontWeight: '500' }}>{item.label}</Text>
                </View>
                <View style={{
                  paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
                  backgroundColor: `${item.color}18`,
                }}>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: item.color }}>
                    {formatNumber(item.value)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  summaryCard: {
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  chartCard: {
    borderRadius: 12,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
});
