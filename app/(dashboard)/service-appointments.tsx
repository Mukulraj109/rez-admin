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
import { serviceAppointmentAdminService, AdminServiceAppointment } from '../../services/api/serviceAppointments';
import { showAlert } from '../../utils/alert';

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending: { bg: '#FEF9C3', text: '#92400E' },
  confirmed: { bg: '#DCFCE7', text: '#166534' },
  in_progress: { bg: '#DBEAFE', text: '#1E40AF' },
  completed: { bg: '#EFF6FF', text: '#1D4ED8' },
  cancelled: { bg: '#FEE2E2', text: '#991B1B' },
};

const FILTERS = ['all', 'pending', 'confirmed', 'in_progress', 'completed', 'cancelled'] as const;

export default function ServiceAppointmentsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [appointments, setAppointments] = useState<AdminServiceAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string>('all');

  const load = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true); else setLoading(true);
      const res = await serviceAppointmentAdminService.getAppointments(1, 50, {
        status: filter === 'all' ? undefined : filter,
      });
      setAppointments(res.appointments || []);
    } catch {
      showAlert('Error', 'Failed to load service appointments');
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

  const getUserName = (appt: AdminServiceAppointment) => {
    if (appt.customerName) return appt.customerName;
    const p = appt.user?.profile;
    if (p?.firstName || p?.lastName) return `${p.firstName || ''} ${p.lastName || ''}`.trim();
    return 'Unknown';
  };

  const renderItem = ({ item }: { item: AdminServiceAppointment }) => {
    const statusColor = STATUS_COLORS[item.status] || STATUS_COLORS.pending;
    return (
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.appointmentNumber, { color: colors.tint }]}>
            {item.appointmentNumber}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor.bg }]}>
            <Text style={[styles.statusText, { color: statusColor.text }]}>
              {item.status.replace('_', ' ')}
            </Text>
          </View>
        </View>

        <Text style={[styles.customerName, { color: colors.text }]}>{getUserName(item)}</Text>
        <Text style={[styles.serviceType, { color: colors.tint }]}>{item.serviceType}</Text>

        <View style={styles.detailRow}>
          <Ionicons name="calendar-outline" size={14} color={colors.icon} />
          <Text style={[styles.detailText, { color: colors.icon }]}>
            {formatDate(item.appointmentDate)} at {item.appointmentTime}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Ionicons name="time-outline" size={14} color={colors.icon} />
          <Text style={[styles.detailText, { color: colors.icon }]}>{item.duration} min</Text>
        </View>

        {item.store?.name && (
          <View style={styles.detailRow}>
            <Ionicons name="storefront-outline" size={14} color={colors.icon} />
            <Text style={[styles.detailText, { color: colors.icon }]}>{item.store.name}</Text>
          </View>
        )}

        {item.customerPhone && (
          <View style={styles.detailRow}>
            <Ionicons name="call-outline" size={14} color={colors.icon} />
            <Text style={[styles.detailText, { color: colors.icon }]}>{item.customerPhone}</Text>
          </View>
        )}

        {item.specialInstructions && (
          <Text style={[styles.notes, { color: colors.icon }]} numberOfLines={2}>
            {item.specialInstructions}
          </Text>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <View style={styles.headerRow}>
          <Ionicons name="calendar" size={24} color={colors.tint} />
          <Text style={[styles.headerTitle, { color: colors.text }]}>Service Appointments</Text>
        </View>
        <Text style={[styles.headerSubtitle, { color: colors.icon }]}>
          Manage service appointments across all niches
        </Text>
      </View>

      {/* Filter Chips */}
      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[
              styles.filterChip,
              filter === f && { backgroundColor: colors.tint },
              filter !== f && { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
            ]}
            onPress={() => setFilter(f)}
          >
            <Text style={[
              styles.filterText,
              { color: filter === f ? '#fff' : colors.text },
            ]}>
              {f === 'all' ? 'All' : f.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      {loading ? (
        <ActivityIndicator size="large" color={colors.tint} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={appointments}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.tint} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="calendar-outline" size={48} color="#cbd5e1" />
              <Text style={[styles.emptyText, { color: colors.icon }]}>No service appointments found</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 16, paddingTop: 8 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerTitle: { fontSize: 22, fontWeight: '700' },
  headerSubtitle: { fontSize: 13, marginTop: 4 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  filterText: { fontSize: 12, fontWeight: '600' },
  card: { borderRadius: 14, padding: 14, marginBottom: 12, shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  appointmentNumber: { fontSize: 13, fontWeight: '700' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  customerName: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  serviceType: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  detailText: { fontSize: 12 },
  notes: { fontSize: 12, fontStyle: 'italic', marginTop: 6 },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyText: { fontSize: 14, marginTop: 12 },
});
