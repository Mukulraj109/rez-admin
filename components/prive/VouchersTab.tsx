import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, RefreshControl, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import priveAdminApi from '@/services/api/priveAdmin';
import { Colors } from '@/constants/Colors';

export default function VouchersTab({ colors }: { colors: any }) {
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  const fetchVouchers = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await priveAdminApi.getVouchers({
        status: statusFilter !== 'all' ? statusFilter : undefined,
        search: search || undefined,
      });
      if (res.data?.data) {
        setVouchers(res.data.data.vouchers || []);
      }
    } catch (err) {
      console.error('Failed to fetch vouchers:', err);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => { fetchVouchers(); }, [fetchVouchers]);

  const handleInvalidate = async (id: string) => {
    try {
      await priveAdminApi.invalidateVoucher(id);
      fetchVouchers();
    } catch (err) {
      console.error('Failed to invalidate:', err);
    }
  };

  const handleExtend = async (id: string) => {
    try {
      await priveAdminApi.extendVoucher(id, { extendDays: 30 });
      fetchVouchers();
    } catch (err) {
      console.error('Failed to extend:', err);
    }
  };

  const statuses = ['all', 'active', 'used', 'expired', 'cancelled'];

  return (
    <ScrollView
      style={styles.tabContent}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={fetchVouchers} />}
    >
      {/* Filters */}
      <View style={[styles.searchBar, { backgroundColor: colors.card }]}>
        <Ionicons name="search-outline" size={18} color={colors.icon} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search by code or user..."
          placeholderTextColor={colors.secondaryText}
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={fetchVouchers}
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
        {statuses.map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.filterChip, statusFilter === s && styles.filterChipActive]}
            onPress={() => setStatusFilter(s)}
          >
            <Text style={{ color: statusFilter === s ? colors.card : colors.secondaryText, fontSize: 12 }}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {isLoading && vouchers.length === 0 ? (
        <ActivityIndicator size="large" color={colors.gold} style={{ marginTop: 40 }} />
      ) : vouchers.length === 0 ? (
        <Text style={[styles.emptyText, { color: colors.secondaryText }]}>No vouchers found</Text>
      ) : (
        vouchers.map((v: any) => (
          <View key={v._id} style={[styles.card, { backgroundColor: colors.card }]}>
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>{v.code}</Text>
                <Text style={[styles.cardSubtitle, { color: colors.secondaryText }]}>
                  {v.type} | {v.coinAmount} {v.coinType || 'rez'} coins | {v.currency} {v.value}
                </Text>
                <Text style={[styles.cardSubtitle, { color: colors.secondaryText }]}>
                  User: {v.userId?.fullName || v.userId?.phoneNumber || v.userId || 'Unknown'}
                </Text>
                <Text style={[styles.cardSubtitle, { color: colors.secondaryText }]}>
                  {v.createdAt ? new Date(v.createdAt).toLocaleString() : ''}{v.expiresAt ? ` | Expires: ${new Date(v.expiresAt).toLocaleDateString()}` : ''}
                </Text>
              </View>
              <View style={[
                styles.statusBadge,
                { backgroundColor: v.status === 'active' ? `${Colors.light.success}20` : v.status === 'cancelled' ? `${Colors.light.error}20` : '#FF980020' },
              ]}>
                <Text style={{
                  color: v.status === 'active' ? colors.success : v.status === 'cancelled' ? colors.error : colors.warning,
                  fontSize: 11,
                }}>
                  {v.status}
                </Text>
              </View>
            </View>
            {v.status === 'active' && (
              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: `${Colors.light.warning}20` }]}
                  onPress={() => handleExtend(v._id)}
                >
                  <Text style={{ color: colors.warning, fontSize: 12 }}>+30 Days</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: `${Colors.light.error}20` }]}
                  onPress={() => handleInvalidate(v._id)}
                >
                  <Text style={{ color: colors.error, fontSize: 12 }}>Invalidate</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  tabContent: { flex: 1, padding: 16 },
  searchBar: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 10, gap: 8, marginBottom: 12 },
  searchInput: { flex: 1, fontSize: 14 },
  filterRow: { marginBottom: 12, maxHeight: 36 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, backgroundColor: '#2a2a2a', marginRight: 8 },
  filterChipActive: { backgroundColor: Colors.light.gold },
  card: { borderRadius: 12, padding: 16, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardTitle: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  cardSubtitle: { fontSize: 12, marginTop: 2 },
  cardActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  actionBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  emptyText: { textAlign: 'center', marginTop: 40, fontSize: 14 },
});
