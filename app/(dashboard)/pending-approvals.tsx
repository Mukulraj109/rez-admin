import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  useColorScheme, ActivityIndicator, TextInput, Modal,
  SafeAreaView, ScrollView, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { showAlert, showConfirm } from '../../utils/alert';
import { useAuth } from '../../contexts/AuthContext';
import { adminActionsService, AdminActionItem, AdminActionStatus } from '../../services/api/adminActions';

type TabType = 'pending' | 'history';
type HistoryFilter = 'all' | 'pending_approval' | 'approved' | 'rejected' | 'executed';

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending_approval: { bg: Colors.light.warningLight, text: Colors.light.warningDeep },
  approved: { bg: Colors.light.infoLighter, text: Colors.light.infoDark },
  rejected: { bg: Colors.light.errorLight, text: Colors.light.errorDeep },
  executed: { bg: Colors.light.successLight, text: Colors.light.successDeep },
};

const ACTION_TYPE_LABELS: Record<string, string> = {
  manual_adjustment: 'Wallet Adjustment',
  cashback_reversal: 'Cashback Reversal',
  freeze_override: 'Freeze Override',
  bulk_credit: 'Bulk Credit',
  config_change: 'Config Change',
};

export default function PendingApprovalsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { user: currentAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('pending');

  // Pending state
  const [pendingActions, setPendingActions] = useState<AdminActionItem[]>([]);
  const [pendingLoading, setPendingLoading] = useState(true);
  const [pendingRefreshing, setPendingRefreshing] = useState(false);
  const [pendingPage, setPendingPage] = useState(1);
  const [pendingHasMore, setPendingHasMore] = useState(true);

  // History state
  const [historyActions, setHistoryActions] = useState<AdminActionItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyHasMore, setHistoryHasMore] = useState(true);
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>('all');

  // Action state
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<AdminActionItem | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const loadPending = useCallback(async (pageNum = 1, append = false) => {
    if (pageNum === 1) setPendingLoading(true);
    try {
      const result = await adminActionsService.getPendingActions(pageNum, 20);
      setPendingActions(prev => append ? [...prev, ...result.actions] : result.actions);
      setPendingPage(pageNum);
      setPendingHasMore(pageNum < result.pagination.totalPages);
    } catch (err: any) {
      showAlert('Error', err.message || 'Failed to load pending actions');
    } finally {
      setPendingLoading(false);
      setPendingRefreshing(false);
    }
  }, []);

  const loadHistory = useCallback(async (pageNum = 1, append = false) => {
    if (pageNum === 1) setHistoryLoading(true);
    try {
      const status = historyFilter === 'all' ? undefined : historyFilter as AdminActionStatus;
      const result = await adminActionsService.getActionHistory(pageNum, 20, status);
      setHistoryActions(prev => append ? [...prev, ...result.actions] : result.actions);
      setHistoryPage(pageNum);
      setHistoryHasMore(pageNum < result.pagination.totalPages);
    } catch (err: any) {
      showAlert('Error', err.message || 'Failed to load history');
    } finally {
      setHistoryLoading(false);
    }
  }, [historyFilter]);

  useEffect(() => { loadPending(1); }, [loadPending]);
  useEffect(() => { if (activeTab === 'history') loadHistory(1); }, [activeTab, loadHistory]);

  const handleApprove = async (action: AdminActionItem) => {
    const confirmed = await showConfirm(
      'Approve Action',
      `Approve this ${ACTION_TYPE_LABELS[action.actionType] || action.actionType}?\n\nAmount: ${action.payload?.amount || 0} NC\nReason: ${action.reason}`
    );
    if (!confirmed) return;

    setActionLoading(action._id);
    try {
      await adminActionsService.approveAction(action._id);
      showAlert('Success', 'Action approved and executed');
      loadPending(1);
    } catch (err: any) {
      showAlert('Error', err.message || 'Failed to approve');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!rejectTarget || !rejectReason.trim()) return;
    setActionLoading(rejectTarget._id);
    try {
      await adminActionsService.rejectAction(rejectTarget._id, rejectReason.trim());
      showAlert('Success', 'Action rejected');
      setRejectTarget(null);
      setRejectReason('');
      loadPending(1);
    } catch (err: any) {
      showAlert('Error', err.message || 'Failed to reject');
    } finally {
      setActionLoading(null);
    }
  };

  const renderPendingItem = useCallback(({ item }: { item: AdminActionItem }) => {
    const isSelf = currentAdmin?._id === (typeof item.initiatorId === 'object' ? item.initiatorId._id : item.initiatorId);
    const initiatorName = typeof item.initiatorId === 'object' ? (item.initiatorId.fullName || item.initiatorId.email || 'Unknown') : 'Unknown';
    const isProcessing = actionLoading === item._id;

    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={[styles.badge, { backgroundColor: colors.warningLight }]}>
            <Text style={[styles.badgeText, { color: colors.warningDeep }]}>{ACTION_TYPE_LABELS[item.actionType] || item.actionType}</Text>
          </View>
          <Text style={{ fontSize: 11, color: colors.icon }}>{new Date(item.createdAt).toLocaleString()}</Text>
        </View>

        <View style={{ marginTop: 8 }}>
          <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>
            {item.payload?.type === 'credit' ? '+' : '-'}{item.payload?.amount?.toFixed(2) || '0'} NC
          </Text>
          <Text style={{ fontSize: 12, color: colors.icon, marginTop: 2 }}>Initiated by: {initiatorName}</Text>
          {item.payload?.userId && <Text style={{ fontSize: 12, color: colors.icon }}>Target: {item.payload.userId}</Text>}
          <Text style={{ fontSize: 12, color: colors.text, marginTop: 4 }}>{item.reason}</Text>
        </View>

        <View style={[styles.actionRow, { borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.successLight, opacity: isSelf ? 0.5 : 1 }]}
            onPress={() => handleApprove(item)}
            disabled={isSelf || isProcessing}
          >
            {isProcessing ? <ActivityIndicator size="small" color={colors.successDeep} /> : (
              <>
                <Ionicons name="checkmark-circle-outline" size={14} color={colors.successDeep} />
                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.successDeep }}>Approve</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.errorLight }]}
            onPress={() => setRejectTarget(item)}
            disabled={isProcessing}
          >
            <Ionicons name="close-circle-outline" size={14} color={colors.errorDeep} />
            <Text style={{ fontSize: 12, fontWeight: '600', color: colors.errorDeep }}>Reject</Text>
          </TouchableOpacity>
          {isSelf && <Text style={{ fontSize: 11, color: colors.warningDeep }}>Cannot approve own action</Text>}
        </View>
      </View>
    );
  }, [colors, currentAdmin, actionLoading]);

  const renderHistoryItem = useCallback(({ item }: { item: AdminActionItem }) => {
    const statusColor = STATUS_COLORS[item.status] || STATUS_COLORS.pending_approval;
    const initiatorName = typeof item.initiatorId === 'object' ? (item.initiatorId.fullName || item.initiatorId.email || 'Unknown') : 'Unknown';
    const approverName = item.approverId && typeof item.approverId === 'object' ? (item.approverId.fullName || item.approverId.email) : null;

    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={[styles.badge, { backgroundColor: statusColor.bg }]}>
            <Text style={[styles.badgeText, { color: statusColor.text }]}>{item.status.replace(/_/g, ' ').toUpperCase()}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: colors.backgroundSecondary }]}>
            <Text style={[styles.badgeText, { color: colors.gray700 }]}>{ACTION_TYPE_LABELS[item.actionType] || item.actionType}</Text>
          </View>
        </View>
        <View style={{ marginTop: 8 }}>
          <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text }}>
            {item.payload?.type === 'credit' ? '+' : '-'}{item.payload?.amount?.toFixed(2) || '0'} NC
          </Text>
          <Text style={{ fontSize: 12, color: colors.icon, marginTop: 2 }}>By: {initiatorName}</Text>
          {approverName && (
            <Text style={{ fontSize: 12, color: colors.icon }}>
              {item.status === 'rejected' ? 'Rejected by' : 'Approved by'}: {approverName}
            </Text>
          )}
          <Text style={{ fontSize: 12, color: colors.text, marginTop: 4 }} numberOfLines={2}>{item.reason}</Text>
          {item.rejectionReason && <Text style={{ fontSize: 12, color: colors.error, marginTop: 2 }} numberOfLines={2}>Rejection: {item.rejectionReason}</Text>}
          <Text style={{ fontSize: 11, color: colors.icon, marginTop: 4 }}>{new Date(item.createdAt).toLocaleString()}</Text>
        </View>
      </View>
    );
  }, [colors]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.tint }]}>
        <Text style={styles.headerTitle}>Pending Approvals</Text>
        <Text style={styles.headerSubtitle}>
          {pendingActions.length} action{pendingActions.length !== 1 ? 's' : ''} awaiting review
        </Text>
      </View>

      {/* Tab Bar */}
      <View style={[styles.tabBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {(['pending', 'history'] as TabType[]).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && { backgroundColor: colors.tint }]}
            onPress={() => setActiveTab(tab)}
          >
            <Ionicons
              name={tab === 'pending' ? 'hourglass' : 'document-text'}
              size={14}
              color={activeTab === tab ? colors.card : colors.icon}
            />
            <Text style={[styles.tabText, { color: activeTab === tab ? colors.card : colors.text }]}>
              {tab === 'pending' ? `Pending (${pendingActions.length})` : 'History'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Pending Tab */}
      {activeTab === 'pending' && (
        <FlatList
          data={pendingActions}
          keyExtractor={item => item._id}
          renderItem={renderPendingItem}
          contentContainerStyle={{ padding: 12, paddingBottom: 120 }}
          onEndReached={() => { if (!pendingLoading && pendingHasMore) loadPending(pendingPage + 1, true); }}
          onEndReachedThreshold={0.3}
          refreshControl={<RefreshControl refreshing={pendingRefreshing} onRefresh={() => { setPendingRefreshing(true); loadPending(1); }} tintColor={colors.tint} />}
          ListFooterComponent={pendingLoading && pendingActions.length > 0 ? <ActivityIndicator style={{ marginVertical: 16 }} color={colors.tint} /> : null}
          ListEmptyComponent={!pendingLoading ? (
            <View style={styles.emptyState}>
              <Ionicons name="checkmark-done-circle-outline" size={48} color={colors.icon} />
              <Text style={{ fontSize: 14, color: colors.icon, marginTop: 12 }}>No pending approvals</Text>
            </View>
          ) : <ActivityIndicator size="large" color={colors.tint} style={{ marginTop: 40 }} />}
        />
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <View style={{ flex: 1 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 50, borderBottomWidth: 1, borderBottomColor: colors.border }} contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 8, gap: 8 }}>
            {(['all', 'pending_approval', 'executed', 'approved', 'rejected'] as HistoryFilter[]).map(f => (
              <TouchableOpacity key={f} style={[styles.filterPill, historyFilter === f && { backgroundColor: colors.tint }]} onPress={() => setHistoryFilter(f)}>
                <Text style={{ fontSize: 13, fontWeight: '500', color: historyFilter === f ? colors.card : colors.text }}>
                  {f === 'all' ? 'All' : f.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <FlatList
            data={historyActions}
            keyExtractor={item => item._id}
            renderItem={renderHistoryItem}
            contentContainerStyle={{ padding: 12, paddingBottom: 120 }}
            onEndReached={() => { if (!historyLoading && historyHasMore) loadHistory(historyPage + 1, true); }}
            onEndReachedThreshold={0.3}
            ListFooterComponent={historyLoading ? <ActivityIndicator style={{ marginVertical: 16 }} color={colors.tint} /> : null}
            ListEmptyComponent={!historyLoading ? (
              <View style={styles.emptyState}>
                <Ionicons name="document-text-outline" size={48} color={colors.icon} />
                <Text style={{ fontSize: 14, color: colors.icon, marginTop: 12 }}>No action history</Text>
              </View>
            ) : null}
          />
        </View>
      )}

      {/* Reject Reason Modal */}
      <Modal visible={!!rejectTarget} transparent animationType="fade" onRequestClose={() => setRejectTarget(null)}>
        <View style={styles.overlay}>
          <View style={[styles.modal, { backgroundColor: colors.card }]}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>Reject Action</Text>
            <Text style={{ fontSize: 13, color: colors.icon, marginTop: 2, marginBottom: 16 }}>
              {ACTION_TYPE_LABELS[rejectTarget?.actionType || ''] || rejectTarget?.actionType} — {rejectTarget?.payload?.amount?.toFixed(2) || '0'} NC
            </Text>
            <TextInput
              style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, minHeight: 80, textAlignVertical: 'top', color: colors.text, fontSize: 14, marginBottom: 10 }}
              placeholder="Rejection reason (required)"
              placeholderTextColor={colors.icon}
              multiline
              value={rejectReason}
              onChangeText={setRejectReason}
            />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
              <TouchableOpacity
                style={{ flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, alignItems: 'center' }}
                onPress={() => { setRejectTarget(null); setRejectReason(''); }}
              >
                <Text style={{ color: colors.text, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, backgroundColor: colors.error, borderRadius: 10, padding: 12, alignItems: 'center' }}
                onPress={handleReject}
                disabled={!rejectReason.trim()}
              >
                <Text style={{ color: colors.card, fontWeight: '600' }}>Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: 60, paddingBottom: 16, paddingHorizontal: 16 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: Colors.light.card },
  headerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  tabBar: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  tabText: { fontSize: 13, fontWeight: '600' },
  filterPill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16 },
  card: { borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12, paddingTop: 12, borderTopWidth: 1 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modal: { width: '90%', maxWidth: 420, borderRadius: 16, padding: 20 },
});
