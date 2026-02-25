import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ActivityIndicator, SafeAreaView, RefreshControl, useColorScheme,
  Modal, ScrollView, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { showAlert, showConfirm } from '../../utils/alert';
import { coinGiftsAdminService, CoinGiftItem } from '../../services/api/coinGifts';

// ============================================
// TYPES & CONSTANTS
// ============================================
const STATUS_TABS = ['all', 'pending', 'delivered', 'claimed', 'expired', 'cancelled'] as const;
type StatusTab = typeof STATUS_TABS[number];

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending: { bg: '#FEF3C7', text: '#D97706' },
  delivered: { bg: '#DBEAFE', text: '#2563EB' },
  claimed: { bg: '#D1FAE5', text: '#059669' },
  expired: { bg: '#F3F4F6', text: '#6B7280' },
  cancelled: { bg: '#FEE2E2', text: '#DC2626' },
};

const COIN_TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  nuqta: { bg: '#EDE9FE', text: '#7C3AED' },
  promo: { bg: '#FEF3C7', text: '#D97706' },
};

// ============================================
// MAIN COMPONENT
// ============================================
export default function CoinGiftsAdminScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [gifts, setGifts] = useState<CoinGiftItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<StatusTab>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedGift, setSelectedGift] = useState<CoinGiftItem | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailData, setDetailData] = useState<any>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // DATA LOADING
  const loadGifts = useCallback(async (pageNum: number = 1, append: boolean = false) => {
    try {
      if (!append) setLoading(true);
      else setLoadingMore(true);

      const response = await coinGiftsAdminService.getAll(
        pageNum,
        20,
        selectedStatus !== 'all' ? selectedStatus : undefined,
        search.trim() || undefined,
      );

      if (append) {
        setGifts(prev => [...prev, ...response.gifts]);
      } else {
        setGifts(response.gifts);
      }

      setPage(response.pagination.page);
      setTotalPages(response.pagination.totalPages);
      setTotal(response.pagination.total);
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to load coin gifts');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [selectedStatus, search]);

  useEffect(() => { loadGifts(1); }, [loadGifts]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadGifts(1);
  }, [loadGifts]);

  const onEndReached = useCallback(() => {
    if (!loadingMore && page < totalPages) {
      loadGifts(page + 1, true);
    }
  }, [loadingMore, page, totalPages, loadGifts]);

  const handleSearchChange = useCallback((text: string) => {
    setSearch(text);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      // loadGifts will re-trigger via useEffect dependency on search
    }, 500);
  }, []);

  // ACTIONS
  const handleViewDetail = async (gift: CoinGiftItem) => {
    setSelectedGift(gift);
    setDetailModalVisible(true);
    setDetailLoading(true);
    try {
      const data = await coinGiftsAdminService.getById(gift._id);
      setDetailData(data);
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to load gift details');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleRefund = (gift: CoinGiftItem) => {
    if (gift.status !== 'pending' && gift.status !== 'delivered') {
      showAlert('Error', `Cannot refund gift in '${gift.status}' status`);
      return;
    }
    showConfirm(
      'Refund Gift',
      `Refund ${gift.amount} NC from this gift back to the sender?`,
      async () => {
        try {
          const result = await coinGiftsAdminService.refund(gift._id, 'Admin manual refund');
          showAlert('Success', result.message);
          loadGifts(1);
          setDetailModalVisible(false);
        } catch (error: any) {
          showAlert('Error', error.message || 'Failed to refund gift');
        }
      },
    );
  };

  const handleDeliver = (gift: CoinGiftItem) => {
    if (gift.status !== 'pending') {
      showAlert('Error', `Cannot deliver gift in '${gift.status}' status`);
      return;
    }
    showConfirm(
      'Deliver Gift',
      'Manually deliver this gift to the recipient?',
      async () => {
        try {
          const result = await coinGiftsAdminService.deliver(gift._id);
          showAlert('Success', result.message);
          loadGifts(1);
          setDetailModalVisible(false);
        } catch (error: any) {
          showAlert('Error', error.message || 'Failed to deliver gift');
        }
      },
    );
  };

  // HELPERS
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatDateTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const getUserDisplay = (user: CoinGiftItem['sender']) => {
    if (!user) return 'Unknown';
    if (typeof user === 'string') return user;
    return user.fullName || user.phoneNumber || user._id?.slice(-6) || 'Unknown';
  };

  // RENDERERS
  const renderGiftRow = ({ item }: { item: CoinGiftItem }) => {
    const statusStyle = STATUS_COLORS[item.status] || STATUS_COLORS.pending;
    const coinStyle = COIN_TYPE_COLORS[item.coinType] || COIN_TYPE_COLORS.nuqta;

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => handleViewDetail(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardTopRow}>
          <View style={styles.cardLeftCol}>
            <View style={styles.userRow}>
              <Ionicons name="person-outline" size={13} color="#6B7280" />
              <Text style={[styles.userLabel, { color: '#6B7280' }]}>From:</Text>
              <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>
                {getUserDisplay(item.sender)}
              </Text>
            </View>
            <View style={styles.userRow}>
              <Ionicons name="arrow-forward-outline" size={13} color="#6B7280" />
              <Text style={[styles.userLabel, { color: '#6B7280' }]}>To:</Text>
              <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>
                {getUserDisplay(item.recipient)}
              </Text>
            </View>
          </View>
          <View style={styles.cardRightCol}>
            <Text style={[styles.amount, { color: colors.text }]}>{item.amount} NC</Text>
            <View style={[styles.coinBadge, { backgroundColor: coinStyle.bg }]}>
              <Text style={[styles.coinBadgeText, { color: coinStyle.text }]}>{item.coinType}</Text>
            </View>
          </View>
        </View>
        <View style={styles.cardBottomRow}>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.statusText, { color: statusStyle.text }]}>{item.status}</Text>
          </View>
          <View style={styles.deliveryBadge}>
            <Ionicons
              name={item.deliveryType === 'scheduled' ? 'time-outline' : 'flash-outline'}
              size={12}
              color="#6B7280"
            />
            <Text style={styles.deliveryText}>{item.deliveryType}</Text>
          </View>
          <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  // DETAIL MODAL
  const renderDetailModal = () => (
    <Modal visible={detailModalVisible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => { setDetailModalVisible(false); setDetailData(null); }}>
            <Ionicons name="close" size={28} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Gift Details</Text>
          <View style={{ width: 28 }} />
        </View>
        {detailLoading ? (
          <ActivityIndicator size="large" color="#3B82F6" style={{ paddingVertical: 40 }} />
        ) : selectedGift ? (
          <ScrollView style={styles.detailScroll} contentContainerStyle={{ paddingBottom: 40 }}>
            {/* Status */}
            <View style={styles.detailSection}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Status</Text>
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: (STATUS_COLORS[selectedGift.status] || STATUS_COLORS.pending).bg },
                ]}>
                  <Text style={[
                    styles.statusText,
                    { color: (STATUS_COLORS[selectedGift.status] || STATUS_COLORS.pending).text },
                  ]}>{selectedGift.status}</Text>
                </View>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Amount</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>{selectedGift.amount} NC</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Coin Type</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>{selectedGift.coinType}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Theme</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>{selectedGift.theme}</Text>
              </View>
            </View>

            {/* Sender / Recipient */}
            <View style={styles.detailSection}>
              <Text style={styles.sectionTitle}>Sender</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>
                {getUserDisplay(selectedGift.sender)}
              </Text>
              {selectedGift.sender?.phoneNumber && (
                <Text style={styles.phoneText}>{selectedGift.sender.phoneNumber}</Text>
              )}
            </View>
            <View style={styles.detailSection}>
              <Text style={styles.sectionTitle}>Recipient</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>
                {getUserDisplay(selectedGift.recipient)}
              </Text>
              {selectedGift.recipient?.phoneNumber && (
                <Text style={styles.phoneText}>{selectedGift.recipient.phoneNumber}</Text>
              )}
            </View>

            {/* Delivery */}
            <View style={styles.detailSection}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Delivery Type</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>{selectedGift.deliveryType}</Text>
              </View>
              {selectedGift.scheduledAt && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Scheduled At</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{formatDateTime(selectedGift.scheduledAt)}</Text>
                </View>
              )}
              {selectedGift.claimedAt && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Claimed At</Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>{formatDateTime(selectedGift.claimedAt)}</Text>
                </View>
              )}
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Expires At</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>{formatDateTime(selectedGift.expiresAt)}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Created</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>{formatDateTime(selectedGift.createdAt)}</Text>
              </View>
            </View>

            {/* Message */}
            {selectedGift.message && (
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Message</Text>
                <Text style={[styles.messageText, { color: colors.text }]}>{selectedGift.message}</Text>
              </View>
            )}

            {/* Transactions */}
            {detailData?.transactions?.length > 0 && (
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Transactions ({detailData.transactions.length})</Text>
                {detailData.transactions.map((tx: any, i: number) => (
                  <View key={tx._id || i} style={[styles.txRow, { borderColor: colors.border }]}>
                    <Text style={[styles.txType, { color: colors.text }]}>{tx.type || tx.source}</Text>
                    <Text style={[styles.txAmount, { color: tx.amount > 0 ? '#059669' : '#DC2626' }]}>
                      {tx.amount > 0 ? '+' : ''}{tx.amount} NC
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Actions */}
            <View style={styles.detailActions}>
              {(selectedGift.status === 'pending' || selectedGift.status === 'delivered') && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.refundButton]}
                  onPress={() => handleRefund(selectedGift)}
                >
                  <Ionicons name="return-down-back-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.actionButtonText}>Refund</Text>
                </TouchableOpacity>
              )}
              {selectedGift.status === 'pending' && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.deliverButton]}
                  onPress={() => handleDeliver(selectedGift)}
                >
                  <Ionicons name="send-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.actionButtonText}>Deliver</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        ) : null}
      </SafeAreaView>
    </Modal>
  );

  // MAIN RENDER
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Coin Gifts</Text>
        <Text style={[styles.headerSubtitle, { color: '#6B7280' }]}>{total} total</Text>
      </View>

      {/* Search */}
      <View style={[styles.searchBar, { backgroundColor: colors.card }]}>
        <View style={[styles.searchInput, { borderColor: colors.border }]}>
          <Ionicons name="search-outline" size={18} color="#9CA3AF" />
          <TextInput
            style={[styles.searchTextInput, { color: colors.text }]}
            value={search}
            onChangeText={handleSearchChange}
            placeholder="Search by phone or gift ID..."
            placeholderTextColor="#9CA3AF"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Status Tabs */}
      <View style={[styles.filtersBar, { backgroundColor: colors.card }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          {STATUS_TABS.map(tab => (
            <TouchableOpacity
              key={tab}
              style={[styles.filterChip, selectedStatus === tab && styles.filterChipActive]}
              onPress={() => setSelectedStatus(tab)}
            >
              <Text style={[styles.chipText, selectedStatus === tab && styles.chipTextActive]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Gift List */}
      <FlatList
        data={gifts}
        renderItem={renderGiftRow}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.3}
        ListFooterComponent={loadingMore ? (
          <ActivityIndicator size="small" color="#3B82F6" style={{ paddingVertical: 16 }} />
        ) : null}
        ListEmptyComponent={loading
          ? <ActivityIndicator size="large" color="#3B82F6" style={{ paddingVertical: 40 }} />
          : (
            <View style={styles.emptyBox}>
              <Ionicons name="gift-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyText}>No coin gifts found</Text>
            </View>
          )
        }
      />

      {renderDetailModal()}
    </View>
  );
}

// ============================================
// STYLES
// ============================================
const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 22, fontWeight: '700' },
  headerSubtitle: { fontSize: 13, fontWeight: '500' },
  searchBar: { paddingHorizontal: 16, paddingVertical: 10 },
  searchInput: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 8, gap: 8,
  },
  searchTextInput: { flex: 1, fontSize: 14, paddingVertical: 0 },
  filtersBar: { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  filterRow: { flexDirection: 'row' },
  filterChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
    backgroundColor: '#F3F4F6', marginRight: 8,
  },
  filterChipActive: { backgroundColor: '#3B82F6' },
  chipText: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
  chipTextActive: { color: '#FFF', fontWeight: '600' },
  card: {
    borderRadius: 12, marginBottom: 10, borderWidth: 1, padding: 14,
  },
  cardTopRow: {
    flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10,
  },
  cardLeftCol: { flex: 1, marginRight: 12, gap: 4 },
  cardRightCol: { alignItems: 'flex-end', gap: 4 },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  userLabel: { fontSize: 11, fontWeight: '500' },
  userName: { fontSize: 13, fontWeight: '600', flexShrink: 1 },
  amount: { fontSize: 18, fontWeight: '700' },
  coinBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  coinBadgeText: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase' },
  cardBottomRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 10,
  },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  deliveryBadge: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  deliveryText: { fontSize: 11, color: '#6B7280', fontWeight: '500' },
  dateText: { fontSize: 11, color: '#9CA3AF', marginLeft: 'auto' },
  emptyBox: { paddingVertical: 40, alignItems: 'center' },
  emptyText: { fontSize: 14, color: '#9CA3AF', marginTop: 10 },
  // Detail Modal
  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 17, fontWeight: '600' },
  detailScroll: { paddingHorizontal: 20 },
  detailSection: {
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: '#6B7280', marginBottom: 6 },
  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 4,
  },
  detailLabel: { fontSize: 13, fontWeight: '500', color: '#6B7280' },
  detailValue: { fontSize: 14, fontWeight: '600' },
  phoneText: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  messageText: {
    fontSize: 14, lineHeight: 20, backgroundColor: '#F9FAFB',
    padding: 10, borderRadius: 8, overflow: 'hidden',
  },
  txRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 6, borderBottomWidth: 1,
  },
  txType: { fontSize: 13, fontWeight: '500' },
  txAmount: { fontSize: 13, fontWeight: '600' },
  detailActions: {
    flexDirection: 'row', gap: 12, paddingVertical: 20,
  },
  actionButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 12, borderRadius: 10, gap: 6,
  },
  refundButton: { backgroundColor: '#DC2626' },
  deliverButton: { backgroundColor: '#2563EB' },
  actionButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
});
