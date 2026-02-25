import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ActivityIndicator, SafeAreaView, RefreshControl, useColorScheme,
  Modal, ScrollView, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { showAlert, showConfirm } from '../../utils/alert';
import { merchantsService, PendingWithdrawalItem, PendingWithdrawalTransaction } from '../../services/api/merchants';

// ============================================
// TYPES & CONSTANTS
// ============================================
const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending: { bg: '#FEF3C7', text: '#D97706' },
  completed: { bg: '#D1FAE5', text: '#059669' },
  rejected: { bg: '#FEE2E2', text: '#DC2626' },
  failed: { bg: '#F3F4F6', text: '#6B7280' },
  cancelled: { bg: '#F3F4F6', text: '#6B7280' },
};

// Flattened row for display
interface WithdrawalRow {
  key: string;
  merchantId: string;
  merchantName: string;
  storeName: string;
  pendingAmount: number;
  pendingCount: number;
  lastRequestDate: string;
  transactions: PendingWithdrawalTransaction[];
  rawMerchant: any;
  rawStore: any;
}

// ============================================
// MAIN COMPONENT
// ============================================
export default function MerchantWithdrawalsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [withdrawals, setWithdrawals] = useState<WithdrawalRow[]>([]);
  const [filteredWithdrawals, setFilteredWithdrawals] = useState<WithdrawalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [total, setTotal] = useState(0);

  // Detail modal
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedRow, setSelectedRow] = useState<WithdrawalRow | null>(null);

  // Approve modal
  const [approveModalVisible, setApproveModalVisible] = useState(false);
  const [approveTransaction, setApproveTransaction] = useState<PendingWithdrawalTransaction | null>(null);
  const [approveMerchantId, setApproveMerchantId] = useState('');
  const [transactionReference, setTransactionReference] = useState('');
  const [approving, setApproving] = useState(false);

  // Reject modal
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectTransaction, setRejectTransaction] = useState<PendingWithdrawalTransaction | null>(null);
  const [rejectMerchantId, setRejectMerchantId] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // DATA LOADING
  const loadWithdrawals = useCallback(async () => {
    try {
      setLoading(true);
      const response = await merchantsService.getPendingWithdrawals(1, 100);
      const items = response.withdrawals || [];

      // Flatten into rows
      const rows: WithdrawalRow[] = items.map((item: PendingWithdrawalItem, index: number) => {
        const merchantObj = item.merchantId;
        let merchantName = 'Unknown Merchant';
        let merchantId = '';
        if (merchantObj && typeof merchantObj === 'object') {
          merchantId = merchantObj._id || '';
          const profile = merchantObj.profile;
          if (profile) {
            merchantName = [profile.firstName, profile.lastName].filter(Boolean).join(' ') || merchantObj.phoneNumber || merchantObj.email || merchantId.slice(-6);
          } else {
            merchantName = merchantObj.phoneNumber || merchantObj.email || merchantId.slice(-6) || 'Unknown';
          }
        } else if (typeof merchantObj === 'string') {
          merchantId = merchantObj;
          merchantName = merchantObj.slice(-6);
        }

        const storeObj = item.store;
        let storeName = 'Unknown Store';
        if (storeObj && typeof storeObj === 'object') {
          storeName = storeObj.name || 'Unnamed Store';
        }

        const pendingTxns = item.pendingTransactions || [];
        const lastDate = pendingTxns.length > 0
          ? pendingTxns.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0].createdAt
          : '';

        return {
          key: merchantId || `row-${index}`,
          merchantId,
          merchantName,
          storeName,
          pendingAmount: item.pendingAmount || 0,
          pendingCount: pendingTxns.length,
          lastRequestDate: lastDate,
          transactions: pendingTxns,
          rawMerchant: merchantObj,
          rawStore: storeObj,
        };
      });

      setWithdrawals(rows);
      setTotal(rows.length);
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to load pending withdrawals');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadWithdrawals(); }, [loadWithdrawals]);

  // SEARCH FILTER
  useEffect(() => {
    if (!search.trim()) {
      setFilteredWithdrawals(withdrawals);
    } else {
      const q = search.trim().toLowerCase();
      setFilteredWithdrawals(
        withdrawals.filter(w =>
          w.merchantName.toLowerCase().includes(q) ||
          w.storeName.toLowerCase().includes(q)
        )
      );
    }
  }, [search, withdrawals]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadWithdrawals();
  }, [loadWithdrawals]);

  const handleSearchChange = useCallback((text: string) => {
    setSearch(text);
  }, []);

  // ACTIONS
  const handleViewDetail = (row: WithdrawalRow) => {
    setSelectedRow(row);
    setDetailModalVisible(true);
  };

  const handleOpenApprove = (merchantId: string, transaction: PendingWithdrawalTransaction) => {
    setApproveMerchantId(merchantId);
    setApproveTransaction(transaction);
    setTransactionReference('');
    setApproveModalVisible(true);
  };

  const handleApprove = async () => {
    if (!transactionReference.trim()) {
      showAlert('Error', 'Please enter a transaction reference');
      return;
    }
    if (!approveTransaction || !approveMerchantId) return;

    setApproving(true);
    try {
      const result = await merchantsService.processWithdrawal(
        approveMerchantId,
        approveTransaction._id,
        transactionReference.trim()
      );
      showAlert('Success', result.message || 'Withdrawal processed successfully');
      setApproveModalVisible(false);
      setDetailModalVisible(false);
      loadWithdrawals();
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to process withdrawal');
    } finally {
      setApproving(false);
    }
  };

  const handleOpenReject = (merchantId: string, transaction: PendingWithdrawalTransaction) => {
    setRejectMerchantId(merchantId);
    setRejectTransaction(transaction);
    setRejectReason('');
    setRejectModalVisible(true);
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      showAlert('Error', 'Please enter a rejection reason');
      return;
    }
    if (!rejectTransaction || !rejectMerchantId) return;

    setRejecting(true);
    try {
      const result = await merchantsService.rejectWithdrawal(
        rejectMerchantId,
        rejectTransaction._id,
        rejectReason.trim()
      );
      showAlert('Success', result.message || 'Withdrawal rejected');
      setRejectModalVisible(false);
      setDetailModalVisible(false);
      loadWithdrawals();
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to reject withdrawal');
    } finally {
      setRejecting(false);
    }
  };

  // HELPERS
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '--';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return '--';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // RENDERERS
  const renderWithdrawalRow = ({ item }: { item: WithdrawalRow }) => {
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
              <Text style={[styles.userLabel, { color: '#6B7280' }]}>Merchant:</Text>
              <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>
                {item.merchantName}
              </Text>
            </View>
            <View style={styles.userRow}>
              <Ionicons name="storefront-outline" size={13} color="#6B7280" />
              <Text style={[styles.userLabel, { color: '#6B7280' }]}>Store:</Text>
              <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>
                {item.storeName}
              </Text>
            </View>
          </View>
          <View style={styles.cardRightCol}>
            <Text style={[styles.amount, { color: colors.text }]}>{formatCurrency(item.pendingAmount)}</Text>
            <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS.pending.bg }]}>
              <Text style={[styles.statusText, { color: STATUS_COLORS.pending.text }]}>pending</Text>
            </View>
          </View>
        </View>
        <View style={styles.cardBottomRow}>
          <View style={styles.countBadge}>
            <Ionicons name="documents-outline" size={12} color="#6B7280" />
            <Text style={styles.countText}>{item.pendingCount} request{item.pendingCount !== 1 ? 's' : ''}</Text>
          </View>
          <Text style={styles.dateText}>{formatDate(item.lastRequestDate)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  // DETAIL MODAL
  const renderDetailModal = () => (
    <Modal visible={detailModalVisible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => { setDetailModalVisible(false); setSelectedRow(null); }}>
            <Ionicons name="close" size={28} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Withdrawal Details</Text>
          <View style={{ width: 28 }} />
        </View>
        {selectedRow ? (
          <ScrollView style={styles.detailScroll} contentContainerStyle={{ paddingBottom: 40 }}>
            {/* Merchant Info */}
            <View style={styles.detailSection}>
              <Text style={styles.sectionTitle}>Merchant</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Name</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>{selectedRow.merchantName}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Store</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>{selectedRow.storeName}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Total Pending</Text>
                <Text style={[styles.detailValue, { color: '#D97706', fontWeight: '700' }]}>
                  {formatCurrency(selectedRow.pendingAmount)}
                </Text>
              </View>
            </View>

            {/* Pending Transactions */}
            <View style={styles.detailSection}>
              <Text style={styles.sectionTitle}>
                Pending Transactions ({selectedRow.transactions.length})
              </Text>
              {selectedRow.transactions.map((tx, i) => {
                const statusStyle = STATUS_COLORS[tx.status] || STATUS_COLORS.pending;
                return (
                  <View key={tx._id || i} style={[styles.txCard, { borderColor: colors.border }]}>
                    <View style={styles.txCardHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.txAmount, { color: colors.text }]}>
                          {formatCurrency(tx.amount)}
                        </Text>
                        <Text style={styles.txDescription} numberOfLines={2}>{tx.description}</Text>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                        <Text style={[styles.statusText, { color: statusStyle.text }]}>{tx.status}</Text>
                      </View>
                    </View>
                    <Text style={styles.txDate}>{formatDateTime(tx.createdAt)}</Text>
                    {tx.withdrawalDetails?.bankAccount && (
                      <Text style={styles.txBank}>
                        Bank: ****{tx.withdrawalDetails.bankAccount.slice(-4)}
                        {tx.withdrawalDetails.ifscCode ? ` (${tx.withdrawalDetails.ifscCode})` : ''}
                      </Text>
                    )}
                    {/* Action buttons for each pending transaction */}
                    {tx.status === 'pending' && (
                      <View style={styles.txActions}>
                        <TouchableOpacity
                          style={[styles.actionButton, styles.approveButton]}
                          onPress={() => handleOpenApprove(selectedRow.merchantId, tx)}
                        >
                          <Ionicons name="checkmark-circle-outline" size={16} color="#FFFFFF" />
                          <Text style={styles.actionButtonText}>Approve</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.actionButton, styles.rejectButton]}
                          onPress={() => handleOpenReject(selectedRow.merchantId, tx)}
                        >
                          <Ionicons name="close-circle-outline" size={16} color="#FFFFFF" />
                          <Text style={styles.actionButtonText}>Reject</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </ScrollView>
        ) : null}
      </SafeAreaView>
    </Modal>
  );

  // APPROVE MODAL
  const renderApproveModal = () => (
    <Modal visible={approveModalVisible} animationType="fade" transparent>
      <View style={styles.overlayContainer}>
        <View style={[styles.dialogBox, { backgroundColor: colors.card }]}>
          <Text style={[styles.dialogTitle, { color: colors.text }]}>Approve Withdrawal</Text>
          {approveTransaction && (
            <Text style={styles.dialogSubtext}>
              Amount: {formatCurrency(approveTransaction.amount)}
            </Text>
          )}
          <Text style={[styles.inputLabel, { color: '#6B7280' }]}>Transaction Reference *</Text>
          <TextInput
            style={[styles.dialogInput, { borderColor: colors.border, color: colors.text }]}
            value={transactionReference}
            onChangeText={setTransactionReference}
            placeholder="Enter bank transaction reference..."
            placeholderTextColor="#9CA3AF"
            autoFocus
          />
          <View style={styles.dialogActions}>
            <TouchableOpacity
              style={[styles.dialogButton, styles.dialogCancelButton]}
              onPress={() => setApproveModalVisible(false)}
              disabled={approving}
            >
              <Text style={styles.dialogCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.dialogButton, styles.approveButton]}
              onPress={handleApprove}
              disabled={approving}
            >
              {approving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.actionButtonText}>Approve</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // REJECT MODAL
  const renderRejectModal = () => (
    <Modal visible={rejectModalVisible} animationType="fade" transparent>
      <View style={styles.overlayContainer}>
        <View style={[styles.dialogBox, { backgroundColor: colors.card }]}>
          <Text style={[styles.dialogTitle, { color: colors.text }]}>Reject Withdrawal</Text>
          {rejectTransaction && (
            <Text style={styles.dialogSubtext}>
              Amount: {formatCurrency(rejectTransaction.amount)}
            </Text>
          )}
          <Text style={[styles.inputLabel, { color: '#6B7280' }]}>Rejection Reason *</Text>
          <TextInput
            style={[styles.dialogInput, styles.dialogTextArea, { borderColor: colors.border, color: colors.text }]}
            value={rejectReason}
            onChangeText={setRejectReason}
            placeholder="Enter reason for rejection..."
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={3}
            autoFocus
          />
          <View style={styles.dialogActions}>
            <TouchableOpacity
              style={[styles.dialogButton, styles.dialogCancelButton]}
              onPress={() => setRejectModalVisible(false)}
              disabled={rejecting}
            >
              <Text style={styles.dialogCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.dialogButton, styles.rejectButton]}
              onPress={handleReject}
              disabled={rejecting}
            >
              {rejecting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.actionButtonText}>Reject</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // MAIN RENDER
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Merchant Withdrawals</Text>
        <Text style={[styles.headerSubtitle, { color: '#6B7280' }]}>{total} pending</Text>
      </View>

      {/* Search */}
      <View style={[styles.searchBar, { backgroundColor: colors.card }]}>
        <View style={[styles.searchInput, { borderColor: colors.border }]}>
          <Ionicons name="search-outline" size={18} color="#9CA3AF" />
          <TextInput
            style={[styles.searchTextInput, { color: colors.text }]}
            value={search}
            onChangeText={handleSearchChange}
            placeholder="Search by merchant or store name..."
            placeholderTextColor="#9CA3AF"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Withdrawal List */}
      <FlatList
        data={filteredWithdrawals}
        renderItem={renderWithdrawalRow}
        keyExtractor={(item) => item.key}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={loading
          ? <ActivityIndicator size="large" color="#3B82F6" style={{ paddingVertical: 40 }} />
          : (
            <View style={styles.emptyBox}>
              <Ionicons name="wallet-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyText}>No pending withdrawals</Text>
            </View>
          )
        }
      />

      {renderDetailModal()}
      {renderApproveModal()}
      {renderRejectModal()}
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
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  cardBottomRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 10,
  },
  countBadge: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  countText: { fontSize: 11, color: '#6B7280', fontWeight: '500' },
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
  // Transaction cards inside detail
  txCard: {
    borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 10,
  },
  txCardHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    marginBottom: 6,
  },
  txAmount: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  txDescription: { fontSize: 12, color: '#6B7280', lineHeight: 16 },
  txDate: { fontSize: 11, color: '#9CA3AF', marginBottom: 4 },
  txBank: { fontSize: 11, color: '#6B7280', marginBottom: 8 },
  txActions: {
    flexDirection: 'row', gap: 10, marginTop: 8,
  },
  actionButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10, borderRadius: 8, gap: 5,
  },
  approveButton: { backgroundColor: '#059669' },
  rejectButton: { backgroundColor: '#DC2626' },
  actionButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  // Dialog overlay
  overlayContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 24,
  },
  dialogBox: {
    width: '100%', maxWidth: 420, borderRadius: 14, padding: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 12, elevation: 8,
  },
  dialogTitle: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  dialogSubtext: { fontSize: 13, color: '#6B7280', marginBottom: 16 },
  inputLabel: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  dialogInput: {
    borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, marginBottom: 16,
  },
  dialogTextArea: { minHeight: 80, textAlignVertical: 'top' },
  dialogActions: { flexDirection: 'row', gap: 10 },
  dialogButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 12, borderRadius: 8,
  },
  dialogCancelButton: { backgroundColor: '#F3F4F6' },
  dialogCancelText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
});
