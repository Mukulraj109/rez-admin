import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, RefreshControl,
  ActivityIndicator, TextInput, useColorScheme, SafeAreaView,
  ScrollView, StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { showAlert, showConfirm } from '../../utils/alert';
import { bbpsAdminService, BbpsTransaction, BbpsStats } from '../../services/api/bbps';

const STATUS_OPTIONS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'processing', label: 'Processing' },
  { key: 'completed', label: 'Completed' },
  { key: 'failed', label: 'Failed' },
  { key: 'refunded', label: 'Refunded' },
];

const BILL_TYPE_OPTIONS = [
  { key: 'all', label: 'All Types' },
  { key: 'prepaid', label: 'Prepaid' },
  { key: 'postpaid', label: 'Postpaid' },
  { key: 'electricity', label: 'Electricity' },
  { key: 'dth', label: 'DTH' },
  { key: 'broadband', label: 'Broadband' },
  { key: 'gas', label: 'Gas' },
  { key: 'fastag', label: 'FASTag' },
  { key: 'water', label: 'Water' },
];

export default function BbpsTransactionsScreen() {
  const scheme = useColorScheme();
  const colors = Colors[scheme ?? 'light'];

  const [transactions, setTransactions] = useState<BbpsTransaction[]>([]);
  const [stats, setStats] = useState<BbpsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [billTypeFilter, setBillTypeFilter] = useState('all');
  const [refundingId, setRefundingId] = useState<string | null>(null);

  useEffect(() => { loadData(1); }, [statusFilter, billTypeFilter]);
  useEffect(() => { loadStats(); }, []);

  const loadStats = async () => {
    try {
      const data = await bbpsAdminService.getStats();
      setStats(data);
    } catch { /* non-blocking */ }
  };

  const loadData = async (pageNum = 1, append = false) => {
    try {
      if (!append) setLoading(true);
      const { transactions: items } = await bbpsAdminService.getTransactions(pageNum, 20, {
        status: statusFilter,
        billType: billTypeFilter,
        search: search || undefined,
      });
      setTransactions(prev => append ? [...prev, ...items] : items);
      setHasMore(items.length === 20);
      setPage(pageNum);
    } catch {
      showAlert('Error', 'Failed to load transactions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => { setRefreshing(true); loadData(1); loadStats(); };

  const handleRefund = (txn: BbpsTransaction) => {
    showConfirm(
      'Refund Transaction?',
      `Refund ${txn.amount.toFixed(2)} for ${getUserName(txn)}? This action cannot be undone.`,
      async () => {
        setRefundingId(txn._id);
        try {
          await bbpsAdminService.refundTransaction(txn._id);
          showAlert('Success', 'Transaction refunded');
          loadData(1);
          loadStats();
        } catch {
          showAlert('Error', 'Failed to refund transaction');
        } finally {
          setRefundingId(null);
        }
      },
      'Refund'
    );
  };

  const getUserName = (txn: BbpsTransaction) => {
    const u = txn.user;
    if (!u) return 'Unknown';
    if (u.fullName) return u.fullName;
    const p = u.profile;
    if (p?.firstName || p?.lastName) return `${p.firstName || ''} ${p.lastName || ''}`.trim();
    return u.phoneNumber || 'Unknown';
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch { return dateStr; }
  };

  const getStatusColor = (status: string) => {
    const map: Record<string, { bg: string; text: string }> = {
      pending: { bg: '#FEF9C3', text: '#92400E' },
      processing: { bg: '#DBEAFE', text: '#1E40AF' },
      completed: { bg: '#DCFCE7', text: '#166534' },
      failed: { bg: '#FEE2E2', text: '#991B1B' },
      refunded: { bg: '#F3E8FF', text: '#6B21A8' },
    };
    return map[status] || { bg: '#F3F4F6', text: '#374151' };
  };

  const formatCurrency = (amount: number) => amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const renderStatsCards = () => {
    if (!stats) return null;
    const cards = [
      { label: 'Total Volume', value: `${formatCurrency(stats.totalVolume)}`, icon: 'trending-up-outline' as const, color: colors.success },
      { label: 'Transactions', value: stats.totalTransactions.toLocaleString(), icon: 'receipt-outline' as const, color: colors.info },
      { label: 'Pending', value: stats.pendingCount.toLocaleString(), icon: 'time-outline' as const, color: colors.warning },
      { label: 'Failed', value: stats.failedCount.toLocaleString(), icon: 'close-circle-outline' as const, color: colors.error },
    ];
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 16 }}>
          {cards.map((c, i) => (
            <View key={i} style={[styles.statsCard, { backgroundColor: colors.card }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: `${c.color}18`, justifyContent: 'center', alignItems: 'center' }}>
                  <Ionicons name={c.icon} size={15} color={c.color} />
                </View>
                <Text style={{ fontSize: 11, color: colors.tabIconDefault, fontWeight: '600' }}>{c.label}</Text>
              </View>
              <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text }}>{c.value}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    );
  };

  const renderItem = useCallback(({ item }: { item: BbpsTransaction }) => {
    const sc = getStatusColor(item.status);
    const canRefund = item.status === 'completed' || item.status === 'failed';
    const isRefunding = refundingId === item._id;

    return (
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        {/* Top: timestamp + status */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontSize: 11, color: colors.tabIconDefault }}>{formatDate(item.createdAt)}</Text>
          <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, backgroundColor: sc.bg }}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: sc.text }}>{item.status.toUpperCase()}</Text>
          </View>
        </View>

        {/* User info */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
          <Ionicons name="person-circle-outline" size={18} color={colors.tabIconDefault} />
          <View>
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>{getUserName(item)}</Text>
            {item.user?.phoneNumber && (
              <Text style={{ fontSize: 11, color: colors.tabIconDefault }}>{item.user.phoneNumber}</Text>
            )}
          </View>
        </View>

        {/* Provider + Amount */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
          <View>
            <Text style={{ fontSize: 13, color: colors.text, fontWeight: '500' }}>
              {item.provider?.name || 'Unknown Provider'}
            </Text>
            <Text style={{ fontSize: 11, color: colors.tabIconDefault }}>
              {item.billType.toUpperCase()} {item.subscriberId ? `| ${item.subscriberId}` : ''}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text }}>
              {formatCurrency(item.amount)}
            </Text>
            {item.coinsIssued > 0 && (
              <Text style={{ fontSize: 11, color: colors.success, fontWeight: '600' }}>
                +{item.coinsIssued} coins
              </Text>
            )}
          </View>
        </View>

        {/* Reference ID */}
        {item.referenceId && (
          <Text style={{ fontSize: 10, color: colors.tabIconDefault, marginTop: 6 }}>
            Ref: {item.referenceId}
          </Text>
        )}

        {/* Error message */}
        {item.status === 'failed' && item.errorMessage && (
          <Text style={{ fontSize: 11, color: colors.error, marginTop: 4 }}>
            Error: {item.errorMessage}
          </Text>
        )}

        {/* Refund button */}
        {canRefund && item.status !== 'refunded' && (
          <TouchableOpacity
            onPress={() => handleRefund(item)}
            disabled={isRefunding}
            style={{
              marginTop: 10, backgroundColor: '#FEE2E2', borderRadius: 8,
              padding: 8, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6,
            }}
          >
            {isRefunding ? (
              <ActivityIndicator size="small" color="#991B1B" />
            ) : (
              <>
                <Ionicons name="return-down-back-outline" size={14} color="#991B1B" />
                <Text style={{ color: '#991B1B', fontWeight: '700', fontSize: 12 }}>Refund</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  }, [colors, refundingId]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{ padding: 16, paddingBottom: 0 }}>
        <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text }}>BBPS Transactions</Text>
        <Text style={{ fontSize: 13, color: colors.tabIconDefault, marginTop: 4 }}>
          Monitor bill payment transactions
        </Text>

        {/* Search */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card,
          borderRadius: 10, paddingHorizontal: 12, marginTop: 12,
        }}>
          <Ionicons name="search" size={16} color={colors.tabIconDefault} />
          <TextInput
            style={{ flex: 1, padding: 10, color: colors.text, fontSize: 14 }}
            placeholder="Search by user, reference..."
            placeholderTextColor={colors.tabIconDefault}
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={() => loadData(1)}
            returnKeyType="search"
          />
        </View>

        {/* Status tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {STATUS_OPTIONS.map(tab => (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setStatusFilter(tab.key)}
                style={{
                  paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8,
                  backgroundColor: statusFilter === tab.key ? colors.tint : colors.card,
                }}
              >
                <Text style={{
                  fontSize: 12, fontWeight: '700',
                  color: statusFilter === tab.key ? '#fff' : colors.text,
                }}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Bill type tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8, marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {BILL_TYPE_OPTIONS.map(tab => (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setBillTypeFilter(tab.key)}
                style={{
                  paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6,
                  backgroundColor: billTypeFilter === tab.key ? colors.info : colors.card,
                  borderWidth: 1, borderColor: billTypeFilter === tab.key ? colors.info : colors.border,
                }}
              >
                <Text style={{
                  fontSize: 11, fontWeight: '600',
                  color: billTypeFilter === tab.key ? '#fff' : colors.tabIconDefault,
                }}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Stats cards */}
      {renderStatsCards()}

      {/* List */}
      {loading && transactions.length === 0 ? (
        <ActivityIndicator size="large" color={colors.tint} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={item => item._id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingTop: 0, paddingBottom: 120 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />}
          onEndReached={() => hasMore && !loading && loadData(page + 1, true)}
          onEndReachedThreshold={0.3}
          ListFooterComponent={loading && transactions.length > 0 ? <ActivityIndicator style={{ marginVertical: 16 }} color={colors.tint} /> : null}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 40 }}>
              <Ionicons name="receipt-outline" size={48} color={colors.tabIconDefault} />
              <Text style={{ textAlign: 'center', color: colors.tabIconDefault, marginTop: 12 }}>
                No transactions found
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  statsCard: {
    borderRadius: 12,
    padding: 14,
    minWidth: 140,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
});
