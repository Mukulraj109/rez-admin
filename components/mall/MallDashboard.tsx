import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { mallService, MallStats } from '../../services/api/mall';
import { Colors } from '../../constants/Colors';

interface Props {
  colors: any;
  onNavigate: (tab: string, action?: () => void) => void;
}

export default function MallDashboard({ colors, onNavigate }: Props) {
  const [stats, setStats] = useState<MallStats | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStats = async () => {
    try { setLoading(true); const data = await mallService.getStats(); setStats(data); } catch (e) { console.error('Failed to load mall stats:', e); } finally { setLoading(false); }
  };

  useEffect(() => { loadStats(); }, []);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.tint} /><Text style={[styles.loadingText, { color: colors.icon }]}>Loading stats...</Text></View>;
  }

  const statCards = [
    { label: 'Mall Stores', value: stats?.totalMallStores || 0, icon: 'business' as const, color: colors.navy },
    { label: 'Total Brands', value: stats?.totalBrands || 0, icon: 'storefront' as const, color: Colors.light.info },
    { label: 'Active Brands', value: stats?.activeBrands || 0, icon: 'checkmark-circle' as const, color: Colors.light.success },
    { label: 'Categories', value: stats?.totalCategories || 0, icon: 'apps' as const, color: colors.purple },
    { label: 'Active Offers', value: `${stats?.activeOffers || 0}/${stats?.totalOffers || 0}`, icon: 'pricetag' as const, color: Colors.light.warning },
    { label: 'Banners', value: `${stats?.activeBanners || 0}/${stats?.totalBanners || 0}`, icon: 'image' as const, color: colors.pink },
    { label: 'Collections', value: `${stats?.activeCollections || 0}/${stats?.totalCollections || 0}`, icon: 'albums' as const, color: colors.cyan },
    { label: 'Active Categories', value: stats?.activeCategories || 0, icon: 'checkmark' as const, color: '#14B8A6' },
  ];

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={false} onRefresh={loadStats} tintColor={colors.tint} />}>
      <Text style={[styles.sectionHeader, { color: colors.text }]}>Mall Overview</Text>
      <View style={styles.statsGrid}>
        {statCards.map((card, i) => (
          <View key={i} style={[styles.statCard, { backgroundColor: colors.card }]}>
            <View style={[styles.statIconBg, { backgroundColor: `${card.color}15` }]}>
              <Ionicons name={card.icon} size={22} color={card.color} />
            </View>
            <Text style={[styles.statValue, { color: colors.text }]}>{card.value}</Text>
            <Text style={[styles.statLabel, { color: colors.icon }]}>{card.label}</Text>
          </View>
        ))}
      </View>

      <Text style={[styles.sectionHeader, { color: colors.text, marginTop: 24 }]}>Quick Actions</Text>
      <View style={styles.quickActions}>
        <TouchableOpacity style={[styles.quickActionBtn, { backgroundColor: Colors.light.info + '20' }]} onPress={() => onNavigate('brands')}>
          <Ionicons name="add-circle" size={20} color={Colors.light.info} />
          <Text style={[styles.quickActionText, { color: Colors.light.info }]}>Add Brand</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.quickActionBtn, { backgroundColor: `${colors.purple}20` }]} onPress={() => onNavigate('categories')}>
          <Ionicons name="add-circle" size={20} color={colors.purple} />
          <Text style={[styles.quickActionText, { color: colors.purple }]}>Add Category</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.quickActionBtn, { backgroundColor: Colors.light.warning + '20' }]} onPress={() => onNavigate('offers')}>
          <Ionicons name="add-circle" size={20} color={Colors.light.warning} />
          <Text style={[styles.quickActionText, { color: Colors.light.warning }]}>Add Offer</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.quickActions}>
        <TouchableOpacity style={[styles.quickActionBtn, { backgroundColor: `${colors.pink}20` }]} onPress={() => onNavigate('banners')}>
          <Ionicons name="add-circle" size={20} color={colors.pink} />
          <Text style={[styles.quickActionText, { color: colors.pink }]}>Add Banner</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.quickActionBtn, { backgroundColor: `${colors.cyan}20` }]} onPress={() => onNavigate('collections')}>
          <Ionicons name="add-circle" size={20} color={colors.cyan} />
          <Text style={[styles.quickActionText, { color: colors.cyan }]}>Add Collection</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60, gap: 12 },
  loadingText: { fontSize: 14, fontWeight: '500' },
  sectionHeader: { fontSize: 18, fontWeight: '700', marginBottom: 14 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard: { width: '47%', padding: 16, borderRadius: 14, alignItems: 'center', gap: 8 },
  statIconBg: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 28, fontWeight: '800' },
  statLabel: { fontSize: 12, fontWeight: '500' },
  quickActions: { flexDirection: 'row', gap: 10, marginBottom: 32 },
  quickActionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12 },
  quickActionText: { fontSize: 13, fontWeight: '600' },
});
