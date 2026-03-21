import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  useColorScheme,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { tableBookingAdminService, AdminTableBooking } from '../../services/api/tableBookings';
import { showAlert } from '../../utils/alert';

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending: { bg: '#FEF9C3', text: '#92400E' },
  confirmed: { bg: '#DCFCE7', text: '#166534' },
  completed: { bg: '#EFF6FF', text: '#1D4ED8' },
  cancelled: { bg: '#FEE2E2', text: '#991B1B' },
  no_show: { bg: '#F3F4F6', text: '#374151' },
};

const FILTERS = ['all', 'pending', 'confirmed', 'completed', 'cancelled', 'no_show'] as const;

export default function TableBookingsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [bookings, setBookings] = useState<AdminTableBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string>('all');

  const load = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true); else setLoading(true);
      const res = await tableBookingAdminService.getBookings(1, 50, {
        status: filter === 'all' ? undefined : filter,
      });
      setBookings(res.bookings || []);
    } catch {
      showAlert('Error', 'Failed to load table bookings');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <View style={styles.headerRow}>
          <Ionicons name="restaurant" size={24} color={colors.tint} />
          <Text style={[styles.headerTitle, { color: colors.text }]}>Table Bookings</Text>
        </View>
        <Text style={[styles.headerSubtitle, { color: colors.icon }]}>
          View and manage restaurant table reservations
        </Text>
      </View>

      {/* Filter Chips */}
      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[
              styles.filterChip,
              { borderColor: colors.border },
              filter === f && { backgroundColor: colors.tint, borderColor: colors.tint },
            ]}
            onPress={() => setFilter(f)}
          >
            <Text
              style={[
                styles.filterText,
                { color: colors.icon },
                filter === f && { color: colors.card },
              ]}
            >
              {f === 'no_show' ? 'No-Show' : f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {loading ? (
        <ActivityIndicator size="large" color={colors.tint} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(b) => b._id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar-outline" size={48} color={colors.icon} />
              <Text style={[styles.emptyText, { color: colors.icon }]}>
                No {filter === 'all' ? '' : filter} bookings
              </Text>
            </View>
          }
          renderItem={({ item: b }) => {
            const storeName = typeof b.storeId === 'object' ? b.storeId?.name : 'Store';
            const statusStyle = STATUS_COLORS[b.status] || STATUS_COLORS.pending;

            return (
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.cardHeader}>
                  <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
                    {storeName} · Party of {b.partySize}
                  </Text>
                  <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                    <Text style={[styles.statusText, { color: statusStyle.text }]}>
                      {b.status.toUpperCase().replace('_', ' ')}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.cardDate, { color: colors.icon }]}>
                  {formatDate(b.bookingDate)} at {b.bookingTime}
                </Text>
                <Text style={[styles.cardCustomer, { color: colors.icon }]}>
                  {b.customerName} · {b.customerPhone}
                </Text>
                {b.specialRequests ? (
                  <Text style={[styles.cardNote, { color: colors.icon }]}>
                    "{b.specialRequests}"
                  </Text>
                ) : null}
                {b.preOrderId ? (
                  <View style={styles.preOrderBadge}>
                    <Text style={styles.preOrderText}>
                      Pre-order: {b.advancePaymentAmount?.toFixed(2) || '0.00'}
                    </Text>
                  </View>
                ) : null}
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  headerTitle: { fontSize: 24, fontWeight: '700' },
  headerSubtitle: { fontSize: 14, marginLeft: 34 },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 6,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  filterText: { fontSize: 12, fontWeight: '600' },
  listContent: { padding: 16, paddingTop: 0, paddingBottom: 120 },
  emptyContainer: { alignItems: 'center', marginTop: 40, gap: 12 },
  emptyText: { fontSize: 16, fontWeight: '500' },
  card: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontWeight: '700', fontSize: 14, flex: 1 },
  statusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  statusText: { fontSize: 10, fontWeight: '700' },
  cardDate: { marginTop: 4, fontSize: 13 },
  cardCustomer: { fontSize: 12, marginTop: 2 },
  cardNote: { fontSize: 12, marginTop: 2, fontStyle: 'italic' },
  preOrderBadge: {
    backgroundColor: '#DCFCE7',
    borderRadius: 6,
    padding: 6,
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  preOrderText: { fontSize: 12, color: '#166534', fontWeight: '600' },
});
