import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator, RefreshControl, StyleSheet } from 'react-native';
import priveAdminApi from '@/services/api/priveAdmin';
import { Colors } from '@/constants/Colors';

function StatCard({ label, value, colors }: { label: string; value: string | number; colors: any }) {
  return (
    <View style={[styles.statCard, { backgroundColor: Colors.light.card }]}>
      <Text style={[styles.statValue, { color: Colors.light.gold }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: Colors.light.secondaryText }]}>{label}</Text>
    </View>
  );
}

export default function AnalyticsTab({ colors }: { colors: any }) {
  const [analytics, setAnalytics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      const res = await priveAdminApi.getAnalytics();
      if (res.data?.data) {
        setAnalytics(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchAnalytics(); }, []);

  if (isLoading) {
    return <ActivityIndicator size="large" color={colors.gold} style={{ marginTop: 40 }} />;
  }

  if (!analytics) {
    return <Text style={[styles.emptyText, { color: colors.secondaryText }]}>No data available</Text>;
  }

  const summary = analytics.offerSummary || {};

  return (
    <ScrollView
      style={styles.tabContent}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={fetchAnalytics} />}
    >
      {/* Summary Cards */}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Offer Performance</Text>
      <View style={styles.statsGrid}>
        <StatCard label="Total Offers" value={summary.totalOffers || 0} colors={colors} />
        <StatCard label="Active" value={summary.activeOffers || 0} colors={colors} />
        <StatCard label="Total Views" value={summary.totalViews || 0} colors={colors} />
        <StatCard label="Total Clicks" value={summary.totalClicks || 0} colors={colors} />
        <StatCard label="CTR" value={`${(summary.overallCTR || 0).toFixed(1)}%`} colors={colors} />
        <StatCard label="Redemptions" value={summary.totalRedemptions || 0} colors={colors} />
      </View>

      {/* Tier Distribution */}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>User Tier Distribution</Text>
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        {(analytics.tierDistribution || []).map((item: any) => (
          <View key={item._id} style={styles.distributionRow}>
            <Text style={[styles.distributionLabel, { color: colors.text }]}>
              {item._id || 'none'}
            </Text>
            <Text style={[styles.distributionValue, { color: colors.gold }]}>
              {item.count} users
            </Text>
          </View>
        ))}
      </View>

      {/* Voucher Stats */}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Voucher Stats</Text>
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        {(analytics.voucherStats || []).map((item: any) => (
          <View key={item._id} style={styles.distributionRow}>
            <Text style={[styles.distributionLabel, { color: colors.text }]}>
              {item._id}
            </Text>
            <Text style={[styles.distributionValue, { color: colors.secondaryText }]}>
              {item.count} ({item.totalValue?.toLocaleString()} value)
            </Text>
          </View>
        ))}
      </View>

      {/* Top Offers */}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Top Performing Offers</Text>
      {(analytics.topPerformingOffers || []).map((offer: any, i: number) => (
        <View key={offer._id} style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            #{i + 1} {offer.title}
          </Text>
          <Text style={[styles.cardSubtitle, { color: colors.secondaryText }]}>
            {offer.brand} | Views: {offer.views} | CTR: {offer.ctr?.toFixed(1)}%
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  tabContent: { flex: 1, padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginTop: 8, marginBottom: 12 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  statCard: { width: '31%', borderRadius: 10, padding: 14, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '600' },
  statLabel: { fontSize: 11, marginTop: 4, textAlign: 'center' },
  card: { borderRadius: 12, padding: 16, marginBottom: 12 },
  cardTitle: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  cardSubtitle: { fontSize: 12, marginTop: 2 },
  distributionRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#333' },
  distributionLabel: { fontSize: 14 },
  distributionValue: { fontSize: 14, fontWeight: '500' },
  emptyText: { textAlign: 'center', marginTop: 40, fontSize: 14 },
});
