import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity,
  useColorScheme, ActivityIndicator, TextInput, Modal, SafeAreaView, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { showAlert, showConfirm } from '../../utils/alert';
import { apiClient } from '../../services/api/apiClient';

interface WalletUser {
  _id: string;
  fullName: string;
  phoneNumber?: string;
  email?: string;
  avatar?: string;
  wallet?: {
    _id: string;
    balance: { total: number; available: number; pending: number };
    isFrozen: boolean;
    frozenReason?: string;
  } | null;
}

interface AuditEntry {
  _id: string;
  operation: 'credit' | 'debit' | 'adjustment' | 'freeze' | 'unfreeze';
  amount?: number;
  description: string;
  createdAt: string;
  performedBy?: string;
}

type AdjustType = 'credit' | 'debit';

export default function UserWalletsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [users, setUsers] = useState<WalletUser[]>([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [freezeUser, setFreezeUser] = useState<WalletUser | null>(null);
  const [freezeReason, setFreezeReason] = useState('');
  const [freezeLoading, setFreezeLoading] = useState(false);

  const [adjustUser, setAdjustUser] = useState<WalletUser | null>(null);
  const [adjustType, setAdjustType] = useState<AdjustType>('credit');
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjustLoading, setAdjustLoading] = useState(false);

  const [auditUser, setAuditUser] = useState<WalletUser | null>(null);
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [auditPage, setAuditPage] = useState(1);
  const [auditTotalPages, setAuditTotalPages] = useState(1);
  const [auditLoading, setAuditLoading] = useState(false);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 500);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search]);

  useEffect(() => { setPage(1); loadUsers(1); }, [debouncedSearch]);

  const loadUsers = async (pg = 1, append = false) => {
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set('search', debouncedSearch);
      params.set('page', String(pg));
      params.set('limit', '20');
      const res = await apiClient.get<any>(`admin/user-wallets?${params.toString()}`);
      if (!res.success) throw new Error(res.message);
      const raw = res.data?.users ?? [];
      // Backend returns { user: {...}, wallet: {...} } — flatten to WalletUser shape
      const list: WalletUser[] = raw.map((item: any) => ({
        _id: item.user?._id || item._id,
        fullName: item.user?.fullName || item.fullName || '',
        phoneNumber: item.user?.phoneNumber || item.phoneNumber || '',
        email: item.user?.email || item.email || '',
        avatar: item.user?.profile?.avatar || item.avatar || '',
        wallet: item.wallet ?? null,
      }));
      setUsers(append ? prev => [...prev, ...list] : list);
      const pagination = res.data?.pagination ?? res.pagination;
      setHasMore(pagination ? pagination.page < pagination.totalPages : false);
      setPage(pg);
    } catch (err: any) {
      console.error('Failed to load user wallets:', err);
    } finally { setIsLoading(false); }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadUsers(1);
    setRefreshing(false);
  }, [debouncedSearch]);

  const loadMore = () => { if (!isLoading && hasMore) loadUsers(page + 1, true); };

  const handleFreeze = async () => {
    if (!freezeUser || !freezeReason.trim()) { showAlert('Error', 'Please provide a reason.'); return; }
    const confirmed = await showConfirm('Freeze Wallet', `Are you sure you want to freeze the wallet for ${freezeUser.fullName}? This will prevent all transactions.`);
    if (!confirmed) return;
    setFreezeLoading(true);
    try {
      const res = await apiClient.post(`admin/user-wallets/${freezeUser._id}/freeze`, { reason: freezeReason.trim() });
      if (!res.success) throw new Error(res.message);
      showAlert('Success', 'Wallet frozen.');
      setFreezeUser(null); setFreezeReason(''); loadUsers(1);
    } catch (err: any) { showAlert('Error', err.message || 'Failed to freeze wallet.'); }
    finally { setFreezeLoading(false); }
  };

  const handleUnfreeze = async (user: WalletUser) => {
    const confirmed = await showConfirm('Unfreeze Wallet', `Unfreeze wallet for ${user.fullName}?`);
    if (!confirmed) return;
    try {
      const res = await apiClient.post(`admin/user-wallets/${user._id}/unfreeze`);
      if (!res.success) throw new Error(res.message);
      showAlert('Success', 'Wallet unfrozen.'); loadUsers(1);
    } catch (err: any) { showAlert('Error', err.message || 'Failed to unfreeze wallet.'); }
  };

  const handleAdjust = async () => {
    if (!adjustUser) return;
    const amt = parseFloat(adjustAmount);
    if (!amt || amt <= 0 || !Number.isFinite(amt)) { showAlert('Error', 'Enter a valid amount.'); return; }
    if (amt > 100000) { showAlert('Error', 'Amount exceeds maximum adjustment limit (100,000 NC).'); return; }
    if (!adjustReason.trim()) { showAlert('Error', 'Please provide a reason.'); return; }
    const confirmed = await showConfirm('Confirm Adjustment', `${adjustType === 'credit' ? 'Credit' : 'Debit'} ${amt} NC ${adjustType === 'credit' ? 'to' : 'from'} ${adjustUser.fullName}?`);
    if (!confirmed) return;
    setAdjustLoading(true);
    try {
      const res = await apiClient.post(`admin/user-wallets/${adjustUser._id}/adjust`, {
        amount: amt, type: adjustType, reason: adjustReason.trim(),
      });
      if (!res.success) throw new Error(res.message);
      showAlert('Success', `${adjustType === 'credit' ? 'Credited' : 'Debited'} ${amt} NC.`);
      setAdjustUser(null); setAdjustAmount(''); setAdjustReason(''); loadUsers(1);
    } catch (err: any) { showAlert('Error', err.message || 'Adjustment failed.'); }
    finally { setAdjustLoading(false); }
  };

  const openAuditTrail = (user: WalletUser) => {
    setAuditUser(user); setAuditEntries([]); setAuditPage(1); setAuditTotalPages(1);
    loadAudit(user._id, 1);
  };

  const loadAudit = async (userId: string, pg: number) => {
    setAuditLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(pg)); params.set('limit', '15');
      const res = await apiClient.get<any>(`admin/user-wallets/${userId}/audit-trail?${params.toString()}`);
      if (!res.success) throw new Error(res.message);
      setAuditEntries(res.data?.auditLogs ?? res.data?.entries ?? []);
      const pagination = res.data?.pagination ?? res.pagination;
      setAuditPage(pg); setAuditTotalPages(pagination?.totalPages ?? 1);
    } catch (err: any) { console.error('Failed to load audit trail:', err); }
    finally { setAuditLoading(false); }
  };

  const getInitials = (name: string) =>
    name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '??';

  const opColor = (op: string) => {
    if (op === 'credit') return { bg: '#D1FAE5', text: '#065F46' };
    if (op === 'debit') return { bg: '#FEE2E2', text: '#991B1B' };
    return { bg: '#DBEAFE', text: '#1E40AF' };
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const inputStyle = [styles.modalInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }];

  const renderUserCard = ({ item }: { item: WalletUser }) => (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.cardRow}>
        <View style={[styles.avatar, { backgroundColor: colors.tint }]}>
          <Text style={styles.avatarText}>{getInitials(item.fullName)}</Text>
        </View>
        <View style={styles.cardInfo}>
          <View style={styles.nameRow}>
            <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>{item.fullName}</Text>
            {item.wallet?.isFrozen && (
              <View style={styles.frozenBadge}>
                <Ionicons name="snow" size={10} color="#991B1B" />
                <Text style={styles.frozenText}>Frozen</Text>
              </View>
            )}
          </View>
          <Text style={[styles.userPhone, { color: colors.icon }]}>{item.phoneNumber || item.email || 'No contact'}</Text>
          <Text style={[styles.walletBal, { color: item.wallet ? colors.text : colors.icon }]}>
            {item.wallet ? `${(item.wallet.balance?.total ?? 0).toFixed(2)} NC` : 'No wallet'}
          </Text>
        </View>
      </View>
      <View style={styles.actions}>
        {item.wallet?.isFrozen ? (
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#D1FAE5' }]} onPress={() => handleUnfreeze(item)}>
            <Ionicons name="sunny-outline" size={14} color="#065F46" />
            <Text style={[styles.actionLabel, { color: '#065F46' }]}>Unfreeze</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#FEE2E2' }]} onPress={() => { setFreezeUser(item); setFreezeReason(''); }}>
            <Ionicons name="snow-outline" size={14} color="#991B1B" />
            <Text style={[styles.actionLabel, { color: '#991B1B' }]}>Freeze</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#DBEAFE' }]} onPress={() => { setAdjustUser(item); setAdjustType('credit'); setAdjustAmount(''); setAdjustReason(''); }}>
          <Ionicons name="swap-horizontal-outline" size={14} color="#1E40AF" />
          <Text style={[styles.actionLabel, { color: '#1E40AF' }]}>Adjust</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#F3E8FF' }]} onPress={() => openAuditTrail(item)}>
          <Ionicons name="document-text-outline" size={14} color="#7C3AED" />
          <Text style={[styles.actionLabel, { color: '#7C3AED' }]}>Audit</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.tint }]}>
        <Text style={styles.headerTitle}>User Wallets</Text>
      </View>

      <View style={[styles.searchBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Ionicons name="search" size={18} color={colors.icon} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search by name, phone, or email..."
          placeholderTextColor={colors.icon}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={colors.icon} />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={users}
        keyExtractor={item => item._id}
        renderItem={renderUserCard}
        contentContainerStyle={styles.list}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />}
        ListEmptyComponent={
          <View style={[styles.emptyState, { backgroundColor: colors.card }]}>
            <Ionicons name="wallet-outline" size={48} color={colors.icon} />
            <Text style={[styles.emptyText, { color: colors.icon }]}>No users found</Text>
          </View>
        }
        ListFooterComponent={hasMore ? <ActivityIndicator style={{ padding: 16 }} color={colors.tint} /> : null}
      />

      {/* Freeze Modal */}
      <Modal visible={!!freezeUser} transparent animationType="fade" onRequestClose={() => setFreezeUser(null)}>
        <View style={styles.overlay}>
          <View style={[styles.modal, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Freeze Wallet</Text>
            <Text style={[styles.modalSub, { color: colors.icon }]}>Freezing wallet for {freezeUser?.fullName}</Text>
            <TextInput style={inputStyle} placeholder="Reason for freezing..." placeholderTextColor={colors.icon}
              value={freezeReason} onChangeText={setFreezeReason} multiline numberOfLines={3} />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.background }]} onPress={() => setFreezeUser(null)}>
                <Text style={[styles.modalBtnText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#DC2626' }]} onPress={handleFreeze} disabled={freezeLoading}>
                {freezeLoading ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={[styles.modalBtnText, { color: '#FFF' }]}>Freeze</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Adjust Modal */}
      <Modal visible={!!adjustUser} transparent animationType="fade" onRequestClose={() => setAdjustUser(null)}>
        <View style={styles.overlay}>
          <View style={[styles.modal, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Adjust Wallet</Text>
            <Text style={[styles.modalSub, { color: colors.icon }]}>Adjusting wallet for {adjustUser?.fullName}</Text>
            <View style={styles.typePicker}>
              <TouchableOpacity style={[styles.typeBtn, adjustType === 'credit' && { backgroundColor: '#D1FAE5', borderColor: '#10B981' }]} onPress={() => setAdjustType('credit')}>
                <Text style={[styles.typeBtnText, { color: adjustType === 'credit' ? '#065F46' : colors.icon }]}>Credit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.typeBtn, adjustType === 'debit' && { backgroundColor: '#FEE2E2', borderColor: '#EF4444' }]} onPress={() => setAdjustType('debit')}>
                <Text style={[styles.typeBtnText, { color: adjustType === 'debit' ? '#991B1B' : colors.icon }]}>Debit</Text>
              </TouchableOpacity>
            </View>
            <TextInput style={inputStyle} placeholder="Amount" placeholderTextColor={colors.icon}
              value={adjustAmount} onChangeText={setAdjustAmount} keyboardType="numeric" />
            <TextInput style={[...inputStyle, styles.textarea]} placeholder="Reason for adjustment..." placeholderTextColor={colors.icon}
              value={adjustReason} onChangeText={setAdjustReason} multiline numberOfLines={3} />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.background }]} onPress={() => setAdjustUser(null)}>
                <Text style={[styles.modalBtnText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.tint }]} onPress={handleAdjust} disabled={adjustLoading}>
                {adjustLoading ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={[styles.modalBtnText, { color: '#FFF' }]}>Submit</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Audit Trail Modal */}
      <Modal visible={!!auditUser} transparent animationType="fade" onRequestClose={() => setAuditUser(null)}>
        <View style={styles.overlay}>
          <View style={[styles.modal, styles.auditModal, { backgroundColor: colors.card }]}>
            <View style={styles.auditHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Audit Trail</Text>
              <TouchableOpacity onPress={() => setAuditUser(null)}>
                <Ionicons name="close" size={22} color={colors.icon} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.modalSub, { color: colors.icon, marginBottom: 12 }]}>{auditUser?.fullName}</Text>
            {auditLoading ? (
              <ActivityIndicator style={{ padding: 24 }} color={colors.tint} />
            ) : auditEntries.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.icon, paddingVertical: 24 }]}>No audit entries found</Text>
            ) : (
              <ScrollView style={styles.auditList}>
                {auditEntries.map(entry => {
                  const oc = opColor(entry.operation);
                  return (
                    <View key={entry._id} style={[styles.auditEntry, { borderBottomColor: colors.border }]}>
                      <View style={styles.auditTop}>
                        <View style={[styles.opBadge, { backgroundColor: oc.bg }]}>
                          <Text style={[styles.opBadgeText, { color: oc.text }]}>{entry.operation}</Text>
                        </View>
                        {entry.amount != null && (
                          <Text style={[styles.auditAmount, { color: entry.operation === 'debit' ? '#DC2626' : '#10B981' }]}>
                            {entry.operation === 'debit' ? '-' : '+'}{entry.amount} NC
                          </Text>
                        )}
                      </View>
                      <Text style={[styles.auditDesc, { color: colors.text }]} numberOfLines={2}>{entry.description}</Text>
                      <Text style={[styles.auditDate, { color: colors.icon }]}>{formatDate(entry.createdAt)}</Text>
                    </View>
                  );
                })}
              </ScrollView>
            )}
            {auditTotalPages > 1 && (
              <View style={styles.pagination}>
                <TouchableOpacity style={[styles.pageBtn, auditPage <= 1 && styles.pageBtnDisabled]}
                  onPress={() => auditPage > 1 && auditUser && loadAudit(auditUser._id, auditPage - 1)} disabled={auditPage <= 1}>
                  <Ionicons name="chevron-back" size={16} color={auditPage <= 1 ? colors.icon : colors.tint} />
                  <Text style={{ color: auditPage <= 1 ? colors.icon : colors.tint, fontSize: 13 }}>Prev</Text>
                </TouchableOpacity>
                <Text style={[styles.pageInfo, { color: colors.text }]}>{auditPage} / {auditTotalPages}</Text>
                <TouchableOpacity style={[styles.pageBtn, auditPage >= auditTotalPages && styles.pageBtnDisabled]}
                  onPress={() => auditPage < auditTotalPages && auditUser && loadAudit(auditUser._id, auditPage + 1)} disabled={auditPage >= auditTotalPages}>
                  <Text style={{ color: auditPage >= auditTotalPages ? colors.icon : colors.tint, fontSize: 13 }}>Next</Text>
                  <Ionicons name="chevron-forward" size={16} color={auditPage >= auditTotalPages ? colors.icon : colors.tint} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#FFFFFF' },
  searchBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 8, borderBottomWidth: 1 },
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 6 },
  list: { padding: 16, gap: 10 },
  card: { borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1 },
  cardRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  cardInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  userName: { fontSize: 15, fontWeight: '600', flexShrink: 1 },
  userPhone: { fontSize: 12, marginTop: 2 },
  walletBal: { fontSize: 13, fontWeight: '600', marginTop: 2 },
  frozenBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#FEE2E2', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  frozenText: { fontSize: 11, fontWeight: '600', color: '#991B1B' },
  actions: { flexDirection: 'row', marginTop: 10, gap: 8 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  actionLabel: { fontSize: 12, fontWeight: '600' },
  emptyState: { padding: 40, borderRadius: 16, alignItems: 'center', gap: 12, marginTop: 20 },
  emptyText: { fontSize: 14, textAlign: 'center' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modal: { width: '100%', maxWidth: 420, borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  modalSub: { fontSize: 13, marginBottom: 16 },
  modalInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, marginBottom: 12 },
  textarea: { minHeight: 72, textAlignVertical: 'top' },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 4 },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  modalBtnText: { fontSize: 14, fontWeight: '600' },
  typePicker: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  typeBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
  typeBtnText: { fontSize: 14, fontWeight: '600' },
  auditModal: { maxHeight: '80%' },
  auditHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  auditList: { maxHeight: 380 },
  auditEntry: { paddingVertical: 10, borderBottomWidth: 1 },
  auditTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  opBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  opBadgeText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  auditAmount: { fontSize: 14, fontWeight: '700' },
  auditDesc: { fontSize: 13, marginBottom: 2 },
  auditDate: { fontSize: 11 },
  pagination: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, marginTop: 4 },
  pageBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, padding: 6 },
  pageBtnDisabled: { opacity: 0.4 },
  pageInfo: { fontSize: 13, fontWeight: '600' },
});
