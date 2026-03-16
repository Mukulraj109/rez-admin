import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  useColorScheme, ActivityIndicator, TextInput, Modal, SafeAreaView, ScrollView,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { showAlert, showConfirm } from '../../utils/alert';
import { useAuth } from '../../contexts/AuthContext';
import { userWalletsService, UserWalletItem, AuditLogItem } from '../../services/api/userWallets';
import { bonusZoneService, BonusCampaignAdmin, BonusCampaignStatus } from '../../services/api/bonusZone';
import { adminActionsService, AdminActionItem, AdminActionStatus } from '../../services/api/adminActions';

type TabType = 'operations' | 'pending' | 'history';
type AdjustType = 'credit' | 'debit';
type CampaignFilter = 'all' | 'active' | 'paused';
type HistoryFilter = 'all' | 'pending_approval' | 'approved' | 'rejected' | 'executed';

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending_approval: { bg: Colors.light.warningLight, text: Colors.light.warningDeep },
  approved: { bg: Colors.light.infoLighter, text: Colors.light.infoDark },
  rejected: { bg: Colors.light.errorLight, text: Colors.light.errorDeep },
  executed: { bg: Colors.light.successLight, text: Colors.light.successDeep },
  active: { bg: Colors.light.successLight, text: Colors.light.successDeep },
  paused: { bg: Colors.light.warningLight, text: Colors.light.warningDeep },
  draft: { bg: Colors.light.gray200, text: Colors.light.gray700 },
};

const ACTION_TYPE_LABELS: Record<string, string> = {
  manual_adjustment: 'Wallet Adjustment',
  cashback_reversal: 'Cashback Reversal',
  freeze_override: 'Freeze Override',
  bulk_credit: 'Bulk Credit',
  config_change: 'Config Change',
};

export default function WalletAdjustmentScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [activeTab, setActiveTab] = useState<TabType>('operations');

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.tint }]}>
        <Text style={styles.headerTitle}>Wallet Adjustment</Text>
        <Text style={styles.headerSubtitle}>Dispute resolution with maker-checker approvals</Text>
      </View>

      <View style={[styles.tabBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {([
          { key: 'operations' as TabType, label: 'Operations', icon: 'wallet-outline' as const },
          { key: 'pending' as TabType, label: 'Pending', icon: 'hourglass-outline' as const },
          { key: 'history' as TabType, label: 'History', icon: 'time-outline' as const },
        ]).map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && { backgroundColor: colors.tint }]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Ionicons name={tab.icon} size={16} color={activeTab === tab.key ? colors.card : colors.text} />
            <Text style={[styles.tabText, { color: activeTab === tab.key ? colors.card : colors.text }]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'operations' && <OperationsTab colors={colors} />}
      {activeTab === 'pending' && <PendingApprovalsTab colors={colors} />}
      {activeTab === 'history' && <ActionHistoryTab colors={colors} />}
    </SafeAreaView>
  );
}

// ═══════════════════════════════════════════════
// TAB 1: OPERATIONS (wallet + campaigns)
// ═══════════════════════════════════════════════

function OperationsTab({ colors }: { colors: any }) {
  const [subTab, setSubTab] = useState<'wallet' | 'campaigns'>('wallet');

  return (
    <View style={{ flex: 1 }}>
      <View style={[styles.subTabBar, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.subTab, subTab === 'wallet' && { borderBottomColor: colors.tint, borderBottomWidth: 2 }]}
          onPress={() => setSubTab('wallet')}
        >
          <Text style={[styles.subTabText, { color: subTab === 'wallet' ? colors.tint : colors.icon }]}>Wallet Ops</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.subTab, subTab === 'campaigns' && { borderBottomColor: colors.tint, borderBottomWidth: 2 }]}
          onPress={() => setSubTab('campaigns')}
        >
          <Text style={[styles.subTabText, { color: subTab === 'campaigns' ? colors.tint : colors.icon }]}>Campaigns</Text>
        </TouchableOpacity>
      </View>

      {subTab === 'wallet' ? <WalletOpsSection colors={colors} /> : <CampaignsSection colors={colors} />}
    </View>
  );
}

function WalletOpsSection({ colors }: { colors: any }) {
  const [users, setUsers] = useState<UserWalletItem[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserWalletItem | null>(null);

  const [adjustUser, setAdjustUser] = useState<UserWalletItem | null>(null);
  const [adjustType, setAdjustType] = useState<AdjustType>('credit');
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjustLoading, setAdjustLoading] = useState(false);

  const [reverseUser, setReverseUser] = useState<UserWalletItem | null>(null);
  const [reverseAmount, setReverseAmount] = useState('');
  const [reverseTxId, setReverseTxId] = useState('');
  const [reverseReason, setReverseReason] = useState('');
  const [reverseLoading, setReverseLoading] = useState(false);

  const [freezeUser, setFreezeUser] = useState<UserWalletItem | null>(null);
  const [freezeReason, setFreezeReason] = useState('');
  const [freezeLoading, setFreezeLoading] = useState(false);

  const [auditUser, setAuditUser] = useState<UserWalletItem | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [auditPage, setAuditPage] = useState(1);
  const [auditTotalPages, setAuditTotalPages] = useState(1);
  const [auditLoading, setAuditLoading] = useState(false);

  const loadUsers = useCallback(async (pageNum: number = 1, append: boolean = false) => {
    setIsLoading(true);
    try {
      const result = await userWalletsService.searchUsers(search || undefined, pageNum, 20);
      setUsers(prev => append ? [...prev, ...result.users] : result.users);
      setPage(pageNum);
      setHasMore(pageNum < result.pagination.totalPages);
    } catch (err: any) {
      showAlert('Error', err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [search]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSelectedUser(null);
      loadUsers(1);
    }, 500);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search]);

  const handleAdjust = async () => {
    if (!adjustUser || !adjustAmount || !adjustReason.trim()) return;
    const amt = Number(adjustAmount);
    if (!amt || amt <= 0) return;

    const confirmed = await showConfirm(
      `${adjustType === 'credit' ? 'Credit' : 'Debit'} Wallet`,
      `${adjustType === 'credit' ? 'Add' : 'Remove'} ${amt} NC ${adjustType === 'credit' ? 'to' : 'from'} ${adjustUser.user.fullName || adjustUser.user.phoneNumber}?`,
    );
    if (!confirmed) return;

    setAdjustLoading(true);
    try {
      await userWalletsService.adjustBalance(adjustUser.user._id, {
        amount: amt, type: adjustType, reason: adjustReason.trim(),
      });
      showAlert('Success', `${adjustType === 'credit' ? 'Credited' : 'Debited'} ${amt} NC`, 'success');
      setAdjustUser(null); setAdjustAmount(''); setAdjustReason('');
      loadUsers(1);
    } catch (err: any) {
      // Handle 202 pending approval response
      if (err.message?.includes('Pending approval') || err.message?.includes('threshold')) {
        showAlert('Pending Approval', err.message, 'info');
        setAdjustUser(null); setAdjustAmount(''); setAdjustReason('');
      } else {
        showAlert('Error', err.message, 'error');
      }
    } finally {
      setAdjustLoading(false);
    }
  };

  const handleReverseCashback = async () => {
    if (!reverseUser || !reverseAmount || !reverseReason.trim()) return;
    const amt = Number(reverseAmount);
    if (!amt || amt <= 0) return;

    const confirmed = await showConfirm('Reverse Cashback', `Reverse ${amt} NC from ${reverseUser.user.fullName || reverseUser.user.phoneNumber}?`);
    if (!confirmed) return;

    setReverseLoading(true);
    try {
      await userWalletsService.reverseCashback(reverseUser.user._id, {
        amount: amt, originalTransactionId: reverseTxId.trim() || undefined, reason: reverseReason.trim(),
      });
      showAlert('Success', `Reversed ${amt} NC cashback`, 'success');
      setReverseUser(null); setReverseAmount(''); setReverseTxId(''); setReverseReason('');
      loadUsers(1);
    } catch (err: any) {
      if (err.message?.includes('Pending approval') || err.message?.includes('threshold')) {
        showAlert('Pending Approval', err.message, 'info');
        setReverseUser(null); setReverseAmount(''); setReverseTxId(''); setReverseReason('');
      } else {
        showAlert('Error', err.message, 'error');
      }
    } finally {
      setReverseLoading(false);
    }
  };

  const handleFreeze = async () => {
    if (!freezeUser || !freezeReason.trim()) return;
    setFreezeLoading(true);
    try {
      await userWalletsService.freezeWallet(freezeUser.user._id, freezeReason.trim());
      showAlert('Success', 'Wallet frozen', 'success');
      setFreezeUser(null); setFreezeReason('');
      loadUsers(1);
    } catch (err: any) {
      showAlert('Error', err.message, 'error');
    } finally {
      setFreezeLoading(false);
    }
  };

  const handleUnfreeze = async (user: UserWalletItem) => {
    const confirmed = await showConfirm('Unfreeze Wallet', `Unfreeze wallet for ${user.user.fullName || user.user.phoneNumber}?`);
    if (!confirmed) return;
    try {
      await userWalletsService.unfreezeWallet(user.user._id);
      showAlert('Success', 'Wallet unfrozen', 'success');
      loadUsers(1);
    } catch (err: any) {
      showAlert('Error', err.message, 'error');
    }
  };

  const loadAudit = async (userId: string, pg: number = 1) => {
    setAuditLoading(true);
    try {
      const result = await userWalletsService.getAuditTrail(userId, pg, 15);
      setAuditLogs(result.auditLogs);
      setAuditPage(pg);
      setAuditTotalPages(result.pagination.totalPages);
    } catch (err: any) {
      showAlert('Error', err.message, 'error');
    } finally {
      setAuditLoading(false);
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  };

  const renderUser = useCallback(({ item }: { item: UserWalletItem }) => {
    const isSelected = selectedUser?.user._id === item.user._id;
    const isFrozen = item.wallet?.isFrozen;
    const balance = item.wallet?.balance?.available ?? 0;

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.card, borderColor: isSelected ? colors.tint : colors.border }]}
        onPress={() => setSelectedUser(isSelected ? null : item)}
        activeOpacity={0.7}
      >
        <View style={styles.userRow}>
          <View style={[styles.avatar, { backgroundColor: isFrozen ? colors.error : colors.tint }]}>
            <Text style={styles.avatarText}>{getInitials(item.user.fullName)}</Text>
          </View>
          <View style={styles.userInfo}>
            <View style={styles.nameRow}>
              <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>
                {item.user.fullName || 'Unknown'}
              </Text>
              {isFrozen && (
                <View style={[styles.badge, { backgroundColor: colors.errorLight }]}>
                  <Text style={[styles.badgeText, { color: colors.errorDeep }]}>FROZEN</Text>
                </View>
              )}
            </View>
            <Text style={[styles.userPhone, { color: colors.icon }]}>{item.user.phoneNumber || item.user.email}</Text>
            <Text style={[styles.walletBalance, { color: colors.text }]}>{balance.toFixed(2)} NC</Text>
          </View>
        </View>

        {isSelected && (
          <View style={styles.actionRow}>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.successLight }]} onPress={() => { setAdjustType('credit'); setAdjustUser(item); }}>
              <Ionicons name="add-circle-outline" size={14} color="#065F46" />
              <Text style={[styles.actionText, { color: colors.successDeep }]}>Credit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.errorLight }]} onPress={() => { setAdjustType('debit'); setAdjustUser(item); }}>
              <Ionicons name="remove-circle-outline" size={14} color={colors.errorDeep} />
              <Text style={[styles.actionText, { color: colors.errorDeep }]}>Debit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.warningLight }]} onPress={() => setReverseUser(item)}>
              <Ionicons name="arrow-undo-outline" size={14} color={colors.warningDeep} />
              <Text style={[styles.actionText, { color: colors.warningDeep }]}>Reverse</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: isFrozen ? colors.successLight : colors.errorLight }]}
              onPress={() => isFrozen ? handleUnfreeze(item) : setFreezeUser(item)}
            >
              <Ionicons name={isFrozen ? 'lock-open-outline' : 'snow-outline'} size={14} color={isFrozen ? colors.successDeep : colors.errorDeep} />
              <Text style={[styles.actionText, { color: isFrozen ? colors.successDeep : colors.errorDeep }]}>
                {isFrozen ? 'Unfreeze' : 'Freeze'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.infoLighter }]} onPress={() => { setAuditUser(item); loadAudit(item.user._id, 1); }}>
              <Ionicons name="list-outline" size={14} color="#1E40AF" />
              <Text style={[styles.actionText, { color: colors.infoDark }]}>Audit</Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  }, [selectedUser, colors]);

  return (
    <View style={{ flex: 1 }}>
      <View style={[styles.searchBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Ionicons name="search" size={18} color={colors.icon} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search by name, phone, or email..."
          placeholderTextColor={colors.icon}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={colors.icon} />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={users}
        keyExtractor={item => item.user._id}
        renderItem={renderUser}
        contentContainerStyle={{ padding: 12, paddingBottom: 120 }}
        onEndReached={() => { if (!isLoading && hasMore) loadUsers(page + 1, true); }}
        onEndReachedThreshold={0.3}
        ListFooterComponent={isLoading ? <ActivityIndicator style={{ marginVertical: 16 }} color={colors.tint} /> : null}
        ListEmptyComponent={!isLoading ? (
          <View style={styles.emptyState}>
            <Ionicons name="person-outline" size={48} color={colors.icon} />
            <Text style={[styles.emptyText, { color: colors.icon }]}>Search for a user to begin</Text>
          </View>
        ) : null}
      />

      {/* Adjust Modal */}
      <Modal visible={!!adjustUser} transparent animationType="fade" onRequestClose={() => setAdjustUser(null)}>
        <View style={styles.overlay}>
          <View style={[styles.modal, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {adjustType === 'credit' ? 'Credit' : 'Debit'} Wallet
            </Text>
            <Text style={[styles.modalSub, { color: colors.icon }]}>
              {adjustUser?.user.fullName || adjustUser?.user.phoneNumber}
            </Text>
            <View style={styles.typePicker}>
              {(['credit', 'debit'] as AdjustType[]).map(t => (
                <TouchableOpacity key={t} style={[styles.typePill, adjustType === t && { backgroundColor: t === 'credit' ? colors.success : colors.error }]} onPress={() => setAdjustType(t)}>
                  <Text style={[styles.typePillText, adjustType === t && { color: colors.card }]}>{t === 'credit' ? 'Credit' : 'Debit'}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput style={[styles.input, { color: colors.text, borderColor: colors.border }]} placeholder="Amount (NC)" placeholderTextColor={colors.icon} keyboardType="numeric" value={adjustAmount} onChangeText={setAdjustAmount} />
            <TextInput style={[styles.input, styles.textArea, { color: colors.text, borderColor: colors.border }]} placeholder="Reason (required)" placeholderTextColor={colors.icon} multiline value={adjustReason} onChangeText={setAdjustReason} />
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, { borderColor: colors.border }]} onPress={() => { setAdjustUser(null); setAdjustAmount(''); setAdjustReason(''); }}>
                <Text style={{ color: colors.text }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: adjustType === 'credit' ? colors.success : colors.error }]} onPress={handleAdjust} disabled={adjustLoading || !adjustAmount || !adjustReason.trim()}>
                {adjustLoading ? <ActivityIndicator size="small" color={colors.card} /> : (
                  <Text style={{ color: colors.card, fontWeight: '600' }}>{adjustType === 'credit' ? 'Credit' : 'Debit'}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Reverse Cashback Modal */}
      <Modal visible={!!reverseUser} transparent animationType="fade" onRequestClose={() => setReverseUser(null)}>
        <View style={styles.overlay}>
          <View style={[styles.modal, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Reverse Cashback</Text>
            <Text style={[styles.modalSub, { color: colors.icon }]}>{reverseUser?.user.fullName || reverseUser?.user.phoneNumber}</Text>
            <TextInput style={[styles.input, { color: colors.text, borderColor: colors.border }]} placeholder="Amount (NC)" placeholderTextColor={colors.icon} keyboardType="numeric" value={reverseAmount} onChangeText={setReverseAmount} />
            <TextInput style={[styles.input, { color: colors.text, borderColor: colors.border }]} placeholder="Original Transaction ID (optional)" placeholderTextColor={colors.icon} value={reverseTxId} onChangeText={setReverseTxId} />
            <Text style={[styles.helperText, { color: colors.icon }]}>Provide for exact reversal. Leave blank for manual clawback.</Text>
            <TextInput style={[styles.input, styles.textArea, { color: colors.text, borderColor: colors.border }]} placeholder="Reason (required)" placeholderTextColor={colors.icon} multiline value={reverseReason} onChangeText={setReverseReason} />
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, { borderColor: colors.border }]} onPress={() => { setReverseUser(null); setReverseAmount(''); setReverseTxId(''); setReverseReason(''); }}>
                <Text style={{ color: colors.text }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.warning }]} onPress={handleReverseCashback} disabled={reverseLoading || !reverseAmount || !reverseReason.trim()}>
                {reverseLoading ? <ActivityIndicator size="small" color={colors.card} /> : <Text style={{ color: colors.card, fontWeight: '600' }}>Reverse</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Freeze Modal */}
      <Modal visible={!!freezeUser} transparent animationType="fade" onRequestClose={() => setFreezeUser(null)}>
        <View style={styles.overlay}>
          <View style={[styles.modal, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Freeze Wallet</Text>
            <Text style={[styles.modalSub, { color: colors.icon }]}>{freezeUser?.user.fullName || freezeUser?.user.phoneNumber}</Text>
            <TextInput style={[styles.input, styles.textArea, { color: colors.text, borderColor: colors.border }]} placeholder="Reason for freezing (required)" placeholderTextColor={colors.icon} multiline value={freezeReason} onChangeText={setFreezeReason} />
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, { borderColor: colors.border }]} onPress={() => { setFreezeUser(null); setFreezeReason(''); }}>
                <Text style={{ color: colors.text }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.error }]} onPress={handleFreeze} disabled={freezeLoading || !freezeReason.trim()}>
                {freezeLoading ? <ActivityIndicator size="small" color={colors.card} /> : <Text style={{ color: colors.card, fontWeight: '600' }}>Freeze</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Audit Trail Modal */}
      <Modal visible={!!auditUser} transparent animationType="fade" onRequestClose={() => setAuditUser(null)}>
        <View style={styles.overlay}>
          <View style={[styles.modal, styles.auditModal, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Audit Trail</Text>
            <Text style={[styles.modalSub, { color: colors.icon }]}>{auditUser?.user.fullName || auditUser?.user.phoneNumber}</Text>
            {auditLoading ? <ActivityIndicator style={{ marginVertical: 24 }} color={colors.tint} /> : (
              <ScrollView style={{ maxHeight: 400 }}>
                {auditLogs.map(log => {
                  const opColor = log.operation === 'credit' ? colors.success : log.operation === 'debit' ? colors.error : colors.info;
                  return (
                    <View key={log._id} style={[styles.auditItem, { borderBottomColor: colors.border }]}>
                      <View style={styles.auditHeader}>
                        <View style={[styles.badge, { backgroundColor: opColor + '20' }]}>
                          <Text style={[styles.badgeText, { color: opColor }]}>{log.operation.toUpperCase()}</Text>
                        </View>
                        <Text style={[styles.auditAmount, { color: colors.text }]}>{log.amount ? `${log.amount.toFixed(2)} NC` : '—'}</Text>
                      </View>
                      <Text style={[styles.auditDesc, { color: colors.icon }]} numberOfLines={2}>{log.reference?.description || log.operation}</Text>
                      <Text style={[styles.auditDate, { color: colors.icon }]}>{new Date(log.createdAt).toLocaleString()}</Text>
                    </View>
                  );
                })}
                {auditLogs.length === 0 && <Text style={[styles.emptyText, { color: colors.icon, textAlign: 'center', marginVertical: 24 }]}>No audit entries</Text>}
              </ScrollView>
            )}
            {auditTotalPages > 1 && (
              <View style={styles.pagination}>
                <TouchableOpacity onPress={() => auditUser && loadAudit(auditUser.user._id, auditPage - 1)} disabled={auditPage <= 1}>
                  <Ionicons name="chevron-back" size={16} color={auditPage <= 1 ? colors.icon : colors.tint} />
                </TouchableOpacity>
                <Text style={[styles.pageInfo, { color: colors.text }]}>{auditPage} / {auditTotalPages}</Text>
                <TouchableOpacity onPress={() => auditUser && loadAudit(auditUser.user._id, auditPage + 1)} disabled={auditPage >= auditTotalPages}>
                  <Ionicons name="chevron-forward" size={16} color={auditPage >= auditTotalPages ? colors.icon : colors.tint} />
                </TouchableOpacity>
              </View>
            )}
            <TouchableOpacity style={[styles.modalBtn, { borderColor: colors.border, alignSelf: 'center', marginTop: 12 }]} onPress={() => setAuditUser(null)}>
              <Text style={{ color: colors.text }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function CampaignsSection({ colors }: { colors: any }) {
  const [campaigns, setCampaigns] = useState<BonusCampaignAdmin[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<CampaignFilter>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadCampaigns = useCallback(async (pageNum: number = 1, append: boolean = false) => {
    setIsLoading(true);
    try {
      const query: any = { page: pageNum, limit: 20 };
      if (filter !== 'all') query.status = filter;
      if (search) query.search = search;
      const result = await bonusZoneService.getCampaigns(query);
      setCampaigns(prev => append ? [...prev, ...result.campaigns] : result.campaigns);
      setPage(pageNum);
      setHasMore(pageNum < (result.pagination?.totalPages || 1));
    } catch (err: any) {
      showAlert('Error', err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [search, filter]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => loadCampaigns(1), 500);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search, filter]);

  const handleToggleStatus = async (campaign: BonusCampaignAdmin) => {
    const newStatus: BonusCampaignStatus = campaign.status === 'active' ? 'paused' : 'active';
    const action = newStatus === 'paused' ? 'Freeze' : 'Resume';
    const confirmed = await showConfirm(`${action} Campaign`, `${action} "${campaign.title}"?`);
    if (!confirmed) return;
    try {
      await bonusZoneService.updateStatus(campaign._id, newStatus);
      showAlert('Success', `Campaign ${newStatus === 'paused' ? 'frozen' : 'resumed'}`, 'success');
      loadCampaigns(1);
    } catch (err: any) {
      showAlert('Error', err.message, 'error');
    }
  };

  const renderCampaign = useCallback(({ item }: { item: BonusCampaignAdmin }) => {
    const statusColor = STATUS_COLORS[item.status] || STATUS_COLORS.draft;
    const budgetPct = item.reward?.totalBudget ? Math.min(100, ((item.reward.consumedBudget || 0) / item.reward.totalBudget) * 100) : 0;
    const canToggle = item.status === 'active' || item.status === 'paused';

    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.campaignHeader}>
          <Text style={[styles.userName, { color: colors.text, flex: 1 }]} numberOfLines={1}>{item.title}</Text>
          <View style={[styles.badge, { backgroundColor: statusColor.bg }]}>
            <Text style={[styles.badgeText, { color: statusColor.text }]}>{item.status.toUpperCase()}</Text>
          </View>
        </View>
        <View style={styles.campaignMeta}>
          <View style={[styles.badge, { backgroundColor: colors.backgroundSecondary }]}>
            <Text style={[styles.badgeText, { color: colors.gray700 }]}>{item.campaignType?.replace(/_/g, ' ')}</Text>
          </View>
          {item.fundingSource?.type !== 'platform' && item.fundingSource?.partnerName && (
            <Text style={[styles.userPhone, { color: colors.icon }]}>by {item.fundingSource.partnerName}</Text>
          )}
        </View>
        {item.reward?.totalBudget > 0 && (
          <View style={styles.budgetRow}>
            <View style={[styles.budgetBar, { backgroundColor: colors.border }]}>
              <View style={[styles.budgetFill, { width: `${budgetPct}%`, backgroundColor: budgetPct > 90 ? colors.error : colors.success }]} />
            </View>
            <Text style={[styles.budgetText, { color: colors.icon }]}>{(item.reward.consumedBudget || 0).toFixed(0)} / {item.reward.totalBudget.toFixed(0)} NC</Text>
          </View>
        )}
        {canToggle && (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: item.status === 'active' ? colors.warningLight : colors.successLight, alignSelf: 'flex-start', marginTop: 8 }]}
            onPress={() => handleToggleStatus(item)}
          >
            <Ionicons name={item.status === 'active' ? 'pause-outline' : 'play-outline'} size={14} color={item.status === 'active' ? colors.warningDeep : colors.successDeep} />
            <Text style={[styles.actionText, { color: item.status === 'active' ? colors.warningDeep : colors.successDeep }]}>
              {item.status === 'active' ? 'Freeze' : 'Resume'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }, [colors]);

  return (
    <View style={{ flex: 1 }}>
      <View style={[styles.filterRow, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {(['all', 'active', 'paused'] as CampaignFilter[]).map(f => (
          <TouchableOpacity key={f} style={[styles.filterPill, filter === f && { backgroundColor: colors.tint }]} onPress={() => setFilter(f)}>
            <Text style={[styles.filterText, { color: filter === f ? colors.card : colors.text }]}>
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={[styles.searchBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Ionicons name="search" size={18} color={colors.icon} />
        <TextInput style={[styles.searchInput, { color: colors.text }]} placeholder="Search campaigns..." placeholderTextColor={colors.icon} value={search} onChangeText={setSearch} />
        {search.length > 0 && <TouchableOpacity onPress={() => setSearch('')}><Ionicons name="close-circle" size={18} color={colors.icon} /></TouchableOpacity>}
      </View>
      <FlatList
        data={campaigns}
        keyExtractor={item => item._id}
        renderItem={renderCampaign}
        contentContainerStyle={{ padding: 12, paddingBottom: 120 }}
        onEndReached={() => { if (!isLoading && hasMore) loadCampaigns(page + 1, true); }}
        onEndReachedThreshold={0.3}
        ListFooterComponent={isLoading ? <ActivityIndicator style={{ marginVertical: 16 }} color={colors.tint} /> : null}
        ListEmptyComponent={!isLoading ? (
          <View style={styles.emptyState}>
            <Ionicons name="megaphone-outline" size={48} color={colors.icon} />
            <Text style={[styles.emptyText, { color: colors.icon }]}>No campaigns found</Text>
          </View>
        ) : null}
      />
    </View>
  );
}

// ═══════════════════════════════════════════════
// TAB 2: PENDING APPROVALS
// ═══════════════════════════════════════════════

function PendingApprovalsTab({ colors }: { colors: any }) {
  const { user: currentAdmin } = useAuth();
  const [actions, setActions] = useState<AdminActionItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const [rejectTarget, setRejectTarget] = useState<AdminActionItem | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadPending = useCallback(async (pageNum: number = 1, append: boolean = false) => {
    if (pageNum === 1) setIsLoading(true);
    try {
      const result = await adminActionsService.getPendingActions(pageNum, 20);
      setActions(prev => append ? [...prev, ...result.actions] : result.actions);
      setPage(pageNum);
      setHasMore(pageNum < result.pagination.totalPages);
    } catch (err: any) {
      showAlert('Error', err.message, 'error');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadPending(1); }, []);

  const handleApprove = async (action: AdminActionItem) => {
    const confirmed = await showConfirm('Approve Action', `Approve this ${ACTION_TYPE_LABELS[action.actionType] || action.actionType}?\n\nAmount: ${action.payload.amount || 0} NC\nReason: ${action.reason}`);
    if (!confirmed) return;

    setActionLoading(action._id);
    try {
      await adminActionsService.approveAction(action._id);
      showAlert('Success', 'Action approved and executed', 'success');
      loadPending(1);
    } catch (err: any) {
      showAlert('Error', err.message, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!rejectTarget || !rejectReason.trim()) return;

    setActionLoading(rejectTarget._id);
    try {
      await adminActionsService.rejectAction(rejectTarget._id, rejectReason.trim());
      showAlert('Success', 'Action rejected', 'success');
      setRejectTarget(null);
      setRejectReason('');
      loadPending(1);
    } catch (err: any) {
      showAlert('Error', err.message, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const renderAction = useCallback(({ item }: { item: AdminActionItem }) => {
    const isSelf = currentAdmin?._id === (typeof item.initiatorId === 'object' ? item.initiatorId._id : item.initiatorId);
    const initiatorName = typeof item.initiatorId === 'object' ? (item.initiatorId.fullName || item.initiatorId.email || 'Unknown') : 'Unknown';
    const isActionLoading = actionLoading === item._id;

    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.campaignHeader}>
          <View style={[styles.badge, { backgroundColor: colors.warningLight }]}>
            <Text style={[styles.badgeText, { color: colors.warningDeep }]}>{ACTION_TYPE_LABELS[item.actionType] || item.actionType}</Text>
          </View>
          <Text style={[styles.auditDate, { color: colors.icon }]}>{new Date(item.createdAt).toLocaleString()}</Text>
        </View>

        <View style={{ marginTop: 8 }}>
          <Text style={[styles.userName, { color: colors.text }]}>
            {item.payload.type === 'credit' ? '+' : '-'}{item.payload.amount?.toFixed(2) || '0'} NC
          </Text>
          <Text style={[styles.userPhone, { color: colors.icon, marginTop: 4 }]}>
            Initiated by: {initiatorName}
          </Text>
          {item.payload.userId && (
            <Text style={[styles.userPhone, { color: colors.icon }]}>Target user: {item.payload.userId}</Text>
          )}
          <Text style={[styles.auditDesc, { color: colors.text, marginTop: 4 }]}>{item.reason}</Text>
        </View>

        <View style={[styles.actionRow, { borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.successLight, opacity: isSelf ? 0.5 : 1 }]}
            onPress={() => handleApprove(item)}
            disabled={isSelf || isActionLoading}
          >
            {isActionLoading ? <ActivityIndicator size="small" color={colors.successDeep} /> : (
              <>
                <Ionicons name="checkmark-circle-outline" size={14} color={colors.successDeep} />
                <Text style={[styles.actionText, { color: colors.successDeep }]}>Approve</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.errorLight }]}
            onPress={() => setRejectTarget(item)}
            disabled={isActionLoading}
          >
            <Ionicons name="close-circle-outline" size={14} color={colors.errorDeep} />
            <Text style={[styles.actionText, { color: colors.errorDeep }]}>Reject</Text>
          </TouchableOpacity>
          {isSelf && (
            <Text style={[styles.helperText, { color: colors.warningDeep, marginBottom: 0 }]}>Cannot approve own action</Text>
          )}
        </View>
      </View>
    );
  }, [colors, currentAdmin, actionLoading]);

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={actions}
        keyExtractor={item => item._id}
        renderItem={renderAction}
        contentContainerStyle={{ padding: 12, paddingBottom: 120 }}
        onEndReached={() => { if (!isLoading && hasMore) loadPending(page + 1, true); }}
        onEndReachedThreshold={0.3}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadPending(1); }} tintColor={colors.tint} />}
        ListFooterComponent={isLoading ? <ActivityIndicator style={{ marginVertical: 16 }} color={colors.tint} /> : null}
        ListEmptyComponent={!isLoading ? (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-done-circle-outline" size={48} color={colors.icon} />
            <Text style={[styles.emptyText, { color: colors.icon }]}>No pending approvals</Text>
          </View>
        ) : null}
      />

      {/* Reject Reason Modal */}
      <Modal visible={!!rejectTarget} transparent animationType="fade" onRequestClose={() => setRejectTarget(null)}>
        <View style={styles.overlay}>
          <View style={[styles.modal, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Reject Action</Text>
            <Text style={[styles.modalSub, { color: colors.icon }]}>
              {ACTION_TYPE_LABELS[rejectTarget?.actionType || ''] || rejectTarget?.actionType} — {rejectTarget?.payload?.amount?.toFixed(2) || '0'} NC
            </Text>
            <TextInput
              style={[styles.input, styles.textArea, { color: colors.text, borderColor: colors.border }]}
              placeholder="Rejection reason (required)"
              placeholderTextColor={colors.icon}
              multiline
              value={rejectReason}
              onChangeText={setRejectReason}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, { borderColor: colors.border }]} onPress={() => { setRejectTarget(null); setRejectReason(''); }}>
                <Text style={{ color: colors.text }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.error }]} onPress={handleReject} disabled={!rejectReason.trim()}>
                <Text style={{ color: colors.card, fontWeight: '600' }}>Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ═══════════════════════════════════════════════
// TAB 3: ACTION HISTORY
// ═══════════════════════════════════════════════

function ActionHistoryTab({ colors }: { colors: any }) {
  const [actions, setActions] = useState<AdminActionItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [filter, setFilter] = useState<HistoryFilter>('all');

  const loadHistory = useCallback(async (pageNum: number = 1, append: boolean = false) => {
    if (pageNum === 1) setIsLoading(true);
    try {
      const status = filter === 'all' ? undefined : filter as AdminActionStatus;
      const result = await adminActionsService.getActionHistory(pageNum, 20, status);
      setActions(prev => append ? [...prev, ...result.actions] : result.actions);
      setPage(pageNum);
      setHasMore(pageNum < result.pagination.totalPages);
    } catch (err: any) {
      showAlert('Error', err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [filter]);

  useEffect(() => { loadHistory(1); }, [filter]);

  const renderHistoryItem = useCallback(({ item }: { item: AdminActionItem }) => {
    const statusColor = STATUS_COLORS[item.status] || STATUS_COLORS.pending_approval;
    const initiatorName = typeof item.initiatorId === 'object' ? (item.initiatorId.fullName || item.initiatorId.email || 'Unknown') : 'Unknown';
    const approverName = item.approverId && typeof item.approverId === 'object' ? (item.approverId.fullName || item.approverId.email) : null;

    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.campaignHeader}>
          <View style={[styles.badge, { backgroundColor: statusColor.bg }]}>
            <Text style={[styles.badgeText, { color: statusColor.text }]}>{item.status.replace(/_/g, ' ').toUpperCase()}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: colors.backgroundSecondary }]}>
            <Text style={[styles.badgeText, { color: colors.gray700 }]}>{ACTION_TYPE_LABELS[item.actionType] || item.actionType}</Text>
          </View>
        </View>

        <View style={{ marginTop: 8 }}>
          <Text style={[styles.userName, { color: colors.text }]}>
            {item.payload.type === 'credit' ? '+' : '-'}{item.payload.amount?.toFixed(2) || '0'} NC
          </Text>
          <Text style={[styles.userPhone, { color: colors.icon, marginTop: 2 }]}>By: {initiatorName}</Text>
          {approverName && (
            <Text style={[styles.userPhone, { color: colors.icon }]}>
              {item.status === 'rejected' ? 'Rejected by' : 'Approved by'}: {approverName}
            </Text>
          )}
          <Text style={[styles.auditDesc, { color: colors.text, marginTop: 4 }]} numberOfLines={2}>{item.reason}</Text>
          {item.rejectionReason && (
            <Text style={[styles.auditDesc, { color: colors.error, marginTop: 2 }]} numberOfLines={2}>Rejection: {item.rejectionReason}</Text>
          )}
          <Text style={[styles.auditDate, { color: colors.icon, marginTop: 4 }]}>{new Date(item.createdAt).toLocaleString()}</Text>
        </View>
      </View>
    );
  }, [colors]);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.filterRow, { backgroundColor: colors.card, borderBottomColor: colors.border }]} contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 8, gap: 8 }}>
        {(['all', 'pending_approval', 'executed', 'approved', 'rejected'] as HistoryFilter[]).map(f => (
          <TouchableOpacity key={f} style={[styles.filterPill, filter === f && { backgroundColor: colors.tint }]} onPress={() => setFilter(f)}>
            <Text style={[styles.filterText, { color: filter === f ? colors.card : colors.text }]}>
              {f === 'all' ? 'All' : f.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={actions}
        keyExtractor={item => item._id}
        renderItem={renderHistoryItem}
        contentContainerStyle={{ padding: 12, paddingBottom: 120 }}
        onEndReached={() => { if (!isLoading && hasMore) loadHistory(page + 1, true); }}
        onEndReachedThreshold={0.3}
        ListFooterComponent={isLoading ? <ActivityIndicator style={{ marginVertical: 16 }} color={colors.tint} /> : null}
        ListEmptyComponent={!isLoading ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={48} color={colors.icon} />
            <Text style={[styles.emptyText, { color: colors.icon }]}>No action history</Text>
          </View>
        ) : null}
      />
    </View>
  );
}

// ═══════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 60, paddingBottom: 16, paddingHorizontal: 16 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: Colors.light.card },
  headerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },

  tabBar: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  tabText: { fontSize: 13, fontWeight: '600' },

  subTabBar: { flexDirection: 'row', borderBottomWidth: 1 },
  subTab: { flex: 1, alignItems: 'center', paddingVertical: 10 },
  subTabText: { fontSize: 13, fontWeight: '600' },

  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1 },
  searchInput: { flex: 1, fontSize: 14 },

  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1 },
  filterPill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16 },
  filterText: { fontSize: 13, fontWeight: '500' },

  card: { borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1 },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: Colors.light.card, fontSize: 14, fontWeight: '700' },
  userInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  userName: { fontSize: 15, fontWeight: '600' },
  userPhone: { fontSize: 12, marginTop: 2 },
  walletBalance: { fontSize: 14, fontWeight: '700', marginTop: 4 },

  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  badgeText: { fontSize: 10, fontWeight: '700' },

  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.light.gray200 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  actionText: { fontSize: 12, fontWeight: '600' },

  campaignHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  campaignMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  budgetRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  budgetBar: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  budgetFill: { height: 6, borderRadius: 3 },
  budgetText: { fontSize: 11 },

  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 14, marginTop: 12 },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modal: { width: '90%', maxWidth: 420, borderRadius: 16, padding: 20 },
  auditModal: { maxHeight: '80%' },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalSub: { fontSize: 13, marginTop: 2, marginBottom: 16 },

  typePicker: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  typePill: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: Colors.light.gray200 },
  typePillText: { fontSize: 13, fontWeight: '600', color: Colors.light.mutedDark },

  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, marginBottom: 10 },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  helperText: { fontSize: 11, marginTop: -6, marginBottom: 10, paddingHorizontal: 4 },

  modalActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'transparent' },

  auditItem: { paddingVertical: 10, borderBottomWidth: 1 },
  auditHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  auditAmount: { fontSize: 14, fontWeight: '700' },
  auditDesc: { fontSize: 12, marginTop: 4 },
  auditDate: { fontSize: 11, marginTop: 4 },

  pagination: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 16, marginTop: 12 },
  pageInfo: { fontSize: 13 },
});
