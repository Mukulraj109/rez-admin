import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, RefreshControl, useColorScheme, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { showAlert } from '../../utils/alert';
import {
  partnerEarningsService,
  PartnerEarningsAnalytics,
  PartnerUser,
  PartnerEarningsConfigData,
} from '../../services/api/partnerEarnings';

type TabKey = 'analytics' | 'users' | 'config';

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'analytics', label: 'Analytics', icon: 'bar-chart' },
  { key: 'users', label: 'Users', icon: 'people' },
  { key: 'config', label: 'Configuration', icon: 'settings' },
];

const LEVEL_NAMES: Record<number, string> = { 1: 'Partner', 2: 'Influencer', 3: 'Ambassador' };

export default function PartnerEarningsAdmin() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

  const [activeTab, setActiveTab] = useState<TabKey>('analytics');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Analytics state
  const [analytics, setAnalytics] = useState<PartnerEarningsAnalytics | null>(null);

  // Users state
  const [users, setUsers] = useState<PartnerUser[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [userPage, setUserPage] = useState(1);
  const [userTotal, setUserTotal] = useState(0);

  // Config state
  const [config, setConfig] = useState<PartnerEarningsConfigData | null>(null);
  const [configDirty, setConfigDirty] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);

  // Adjust modal
  const [adjustModal, setAdjustModal] = useState<{ visible: boolean; userId: string; name: string }>({
    visible: false, userId: '', name: '',
  });
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustType, setAdjustType] = useState<'credit' | 'debit'>('credit');
  const [adjustReason, setAdjustReason] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      if (activeTab === 'analytics') {
        const data = await partnerEarningsService.getAnalytics();
        setAnalytics(data);
      } else if (activeTab === 'users') {
        const data = await partnerEarningsService.getUsers({
          search: userSearch || undefined,
          page: userPage,
          limit: 20,
        });
        setUsers(data.partners);
        setUserTotal(data.pagination.total);
      } else if (activeTab === 'config') {
        const data = await partnerEarningsService.getConfig();
        setConfig(data);
        setConfigDirty(false);
      }
    } catch (err: any) {
      showAlert('Error', err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [activeTab, userSearch, userPage]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const handleSaveConfig = async () => {
    if (!config) return;
    try {
      setSavingConfig(true);
      await partnerEarningsService.updateConfig(config);
      setConfigDirty(false);
      showAlert('Success', 'Configuration saved');
    } catch (err: any) {
      showAlert('Error', err.message);
    } finally {
      setSavingConfig(false);
    }
  };

  const handleAdjust = async () => {
    const amt = parseFloat(adjustAmount);
    if (!amt || amt <= 0) return showAlert('Error', 'Enter a valid amount');
    if (!adjustReason.trim()) return showAlert('Error', 'Reason is required');
    try {
      await partnerEarningsService.adjustUserEarnings(adjustModal.userId, {
        amount: amt,
        type: adjustType,
        reason: adjustReason.trim(),
      });
      showAlert('Success', `${adjustType === 'credit' ? 'Credited' : 'Debited'} ${amt} NC`);
      setAdjustModal({ visible: false, userId: '', name: '' });
      setAdjustAmount('');
      setAdjustReason('');
      if (activeTab === 'users') fetchData();
    } catch (err: any) {
      showAlert('Error', err.message);
    }
  };

  const updateConfig = (path: string, value: any) => {
    if (!config) return;
    const keys = path.split('.');
    const updated = JSON.parse(JSON.stringify(config));
    let obj: any = updated;
    for (let i = 0; i < keys.length - 1; i++) obj = obj[keys[i]];
    obj[keys[keys.length - 1]] = value;
    setConfig(updated);
    setConfigDirty(true);
  };

  // --- RENDER ---
  const renderTabs = () => (
    <View style={[s.tabBar, { backgroundColor: isDark ? colors.slateDark : colors.background }]}>
      {TABS.map((tab) => (
        <TouchableOpacity
          key={tab.key}
          style={[s.tab, activeTab === tab.key && { backgroundColor: colors.tint, borderRadius: 8 }]}
          onPress={() => setActiveTab(tab.key)}
        >
          <Ionicons name={tab.icon as any} size={18} color={activeTab === tab.key ? colors.card : colors.text} />
          <Text style={[s.tabLabel, { color: activeTab === tab.key ? colors.card : colors.text }]}>{tab.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderAnalytics = () => {
    if (!analytics) return null;
    return (
      <View style={s.section}>
        {/* Summary Cards */}
        <View style={s.cardRow}>
          <View style={[s.card, { backgroundColor: isDark ? colors.slateDark : colors.card }]}>
            <Text style={[s.cardLabel, { color: colors.text }]}>Total Earnings</Text>
            <Text style={[s.cardValue, { color: colors.tint }]}>{analytics.totalPartnerEarnings.toLocaleString()} NC</Text>
          </View>
          <View style={[s.card, { backgroundColor: isDark ? colors.slateDark : colors.card }]}>
            <Text style={[s.cardLabel, { color: colors.text }]}>Pending Liability</Text>
            <Text style={[s.cardValue, { color: colors.warning }]}>{analytics.pendingLiability.toLocaleString()} NC</Text>
          </View>
        </View>
        <View style={s.cardRow}>
          <View style={[s.card, { backgroundColor: isDark ? colors.slateDark : colors.card }]}>
            <Text style={[s.cardLabel, { color: colors.text }]}>Total Partners</Text>
            <Text style={[s.cardValue, { color: colors.tint }]}>{analytics.totalPartners}</Text>
          </View>
          <View style={[s.card, { backgroundColor: isDark ? colors.slateDark : colors.card }]}>
            <Text style={[s.cardLabel, { color: colors.text }]}>Transactions</Text>
            <Text style={[s.cardValue, { color: colors.tint }]}>{analytics.totalTransactions.toLocaleString()}</Text>
          </View>
        </View>

        {/* Breakdown by type */}
        <View style={[s.tableCard, { backgroundColor: isDark ? colors.slateDark : colors.card }]}>
          <Text style={[s.tableTitle, { color: colors.text }]}>Earnings by Type</Text>
          {Object.entries(analytics.breakdown).map(([type, data]) => (
            <View key={type} style={s.tableRow}>
              <Text style={[s.tableCell, { color: colors.text }]}>{type}</Text>
              <Text style={[s.tableCell, { color: colors.text, textAlign: 'right' }]}>{data.amount.toLocaleString()} NC</Text>
              <Text style={[s.tableCellSmall, { color: colors.mutedDark }]}>{data.count} txns</Text>
            </View>
          ))}
        </View>

        {/* Level Distribution */}
        <View style={[s.tableCard, { backgroundColor: isDark ? colors.slateDark : colors.card }]}>
          <Text style={[s.tableTitle, { color: colors.text }]}>Level Distribution</Text>
          {analytics.levelDistribution.map((l) => (
            <View key={l.level} style={s.tableRow}>
              <Text style={[s.tableCell, { color: colors.text }]}>Level {l.level} ({LEVEL_NAMES[l.level] || 'Unknown'})</Text>
              <Text style={[s.tableCell, { color: colors.text, textAlign: 'right' }]}>{l.count} partners</Text>
            </View>
          ))}
        </View>

        {/* Top Earners */}
        <View style={[s.tableCard, { backgroundColor: isDark ? colors.slateDark : colors.card }]}>
          <Text style={[s.tableTitle, { color: colors.text }]}>Top 20 Earners</Text>
          {analytics.topEarners.map((e, i) => (
            <View key={e.userId} style={s.tableRow}>
              <Text style={[s.tableCellSmall, { color: colors.mutedDark }]}>#{i + 1}</Text>
              <Text style={[s.tableCell, { color: colors.text, flex: 2 }]}>{e.name}</Text>
              <Text style={[s.tableCellSmall, { color: colors.mutedDark }]}>L{e.level}</Text>
              <Text style={[s.tableCell, { color: colors.tint, textAlign: 'right' }]}>{e.totalEarned.toLocaleString()} NC</Text>
            </View>
          ))}
        </View>

        {/* Monthly Trend */}
        <View style={[s.tableCard, { backgroundColor: isDark ? colors.slateDark : colors.card }]}>
          <Text style={[s.tableTitle, { color: colors.text }]}>Monthly Trend (Last 6 Months)</Text>
          {analytics.monthlyTrend.map((m) => (
            <View key={`${m.year}-${m.month}`} style={s.tableRow}>
              <Text style={[s.tableCell, { color: colors.text }]}>{m.year}-{String(m.month).padStart(2, '0')}</Text>
              <Text style={[s.tableCell, { color: colors.tint, textAlign: 'right' }]}>{m.amount.toLocaleString()} NC</Text>
              <Text style={[s.tableCellSmall, { color: colors.mutedDark }]}>{m.count} txns</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderUsers = () => (
    <View style={s.section}>
      <View style={[s.searchBar, { backgroundColor: isDark ? colors.slateDark : colors.card }]}>
        <Ionicons name="search" size={18} color={colors.mutedDark} />
        <TextInput
          style={[s.searchInput, { color: colors.text }]}
          placeholder="Search by name, email, phone..."
          placeholderTextColor={colors.muted}
          value={userSearch}
          onChangeText={(t) => { setUserSearch(t); setUserPage(1); }}
        />
      </View>

      {users.map((u) => (
        <View key={u._id} style={[s.userCard, { backgroundColor: isDark ? colors.slateDark : colors.card }]}>
          <View style={s.userHeader}>
            <View style={s.avatar}>
              <Text style={s.avatarText}>
                {(u.name || '?').charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.userName, { color: colors.text }]}>{u.name || 'Unknown'}</Text>
              <Text style={{ fontSize: 12, color: colors.mutedDark }}>
                Level {u.currentLevel?.level || 0} ({u.currentLevel?.name || 'None'}) · {u.totalOrders} orders
              </Text>
            </View>
            <TouchableOpacity
              style={s.adjustBtn}
              onPress={() => setAdjustModal({ visible: true, userId: u.userId, name: u.name })}
            >
              <Ionicons name="create-outline" size={16} color={colors.tint} />
              <Text style={{ fontSize: 12, color: colors.tint }}>Adjust</Text>
            </TouchableOpacity>
          </View>
          <View style={s.userStats}>
            <View style={s.userStat}>
              <Text style={{ fontSize: 11, color: colors.mutedDark }}>Total Earned</Text>
              <Text style={[s.userStatValue, { color: colors.tint }]}>{(u.earnings?.total || 0).toLocaleString()}</Text>
            </View>
            <View style={s.userStat}>
              <Text style={{ fontSize: 11, color: colors.mutedDark }}>Pending</Text>
              <Text style={[s.userStatValue, { color: colors.warning }]}>{(u.earnings?.pending || 0).toLocaleString()}</Text>
            </View>
            <View style={s.userStat}>
              <Text style={{ fontSize: 11, color: colors.mutedDark }}>This Month</Text>
              <Text style={[s.userStatValue, { color: colors.text }]}>{(u.earnings?.thisMonth || 0).toLocaleString()}</Text>
            </View>
            <View style={s.userStat}>
              <Text style={{ fontSize: 11, color: colors.mutedDark }}>Total Spent</Text>
              <Text style={[s.userStatValue, { color: colors.text }]}>{(u.totalSpent || 0).toLocaleString()}</Text>
            </View>
          </View>
        </View>
      ))}

      {/* Pagination */}
      <View style={s.pagination}>
        <TouchableOpacity
          disabled={userPage <= 1}
          onPress={() => setUserPage((p) => Math.max(1, p - 1))}
          style={[s.pageBtn, userPage <= 1 && { opacity: 0.4 }]}
        >
          <Text style={{ color: colors.tint }}>Previous</Text>
        </TouchableOpacity>
        <Text style={{ color: colors.text }}>Page {userPage} · {userTotal} total</Text>
        <TouchableOpacity
          disabled={users.length < 20}
          onPress={() => setUserPage((p) => p + 1)}
          style={[s.pageBtn, users.length < 20 && { opacity: 0.4 }]}
        >
          <Text style={{ color: colors.tint }}>Next</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderConfig = () => {
    if (!config) return null;

    const renderField = (label: string, path: string, value: number, suffix = '') => (
      <View style={s.fieldRow} key={path}>
        <Text style={[s.fieldLabel, { color: colors.text }]}>{label}</Text>
        <View style={s.fieldInputWrap}>
          <TextInput
            style={[s.fieldInput, { color: colors.text, borderColor: isDark ? Colors.dark.border : colors.gray300 }]}
            value={String(value)}
            keyboardType="numeric"
            onChangeText={(t) => updateConfig(path, parseFloat(t) || 0)}
          />
          {suffix ? <Text style={{ color: colors.mutedDark, fontSize: 12 }}>{suffix}</Text> : null}
        </View>
      </View>
    );

    return (
      <View style={s.section}>
        {/* Cashback Rates */}
        <View style={[s.configCard, { backgroundColor: isDark ? colors.slateDark : colors.card }]}>
          <Text style={[s.configTitle, { color: colors.text }]}>Cashback Rates</Text>
          {renderField('Partner (Level 1)', 'cashbackRates.partner', config.cashbackRates.partner, '%')}
          {renderField('Influencer (Level 2)', 'cashbackRates.influencer', config.cashbackRates.influencer, '%')}
          {renderField('Ambassador (Level 3)', 'cashbackRates.ambassador', config.cashbackRates.ambassador, '%')}
        </View>

        {/* Level-Up Bonuses */}
        <View style={[s.configCard, { backgroundColor: isDark ? colors.slateDark : colors.card }]}>
          <Text style={[s.configTitle, { color: colors.text }]}>Level-Up Bonuses</Text>
          {renderField('To Partner', 'levelUpBonuses.toPartner', config.levelUpBonuses.toPartner, 'NC')}
          {renderField('To Influencer', 'levelUpBonuses.toInfluencer', config.levelUpBonuses.toInfluencer, 'NC')}
          {renderField('To Ambassador', 'levelUpBonuses.toAmbassador', config.levelUpBonuses.toAmbassador, 'NC')}
        </View>

        {/* Task Rewards */}
        <View style={[s.configCard, { backgroundColor: isDark ? colors.slateDark : colors.card }]}>
          <Text style={[s.configTitle, { color: colors.text }]}>Task Rewards</Text>
          {renderField('Profile Completion', 'taskRewards.profile', config.taskRewards.profile, 'pts')}
          {renderField('Review Cashback', 'taskRewards.review', config.taskRewards.review, 'NC')}
          {renderField('Referral Cashback', 'taskRewards.referral', config.taskRewards.referral, 'NC')}
          {renderField('Social Share', 'taskRewards.social', config.taskRewards.social, 'pts')}
        </View>

        {/* Referral */}
        <View style={[s.configCard, { backgroundColor: isDark ? colors.slateDark : colors.card }]}>
          <Text style={[s.configTitle, { color: colors.text }]}>Referral</Text>
          {renderField('Referral Bonus', 'referralBonus', config.referralBonus, 'NC')}
        </View>

        {/* Settlement */}
        <View style={[s.configCard, { backgroundColor: isDark ? colors.slateDark : colors.card }]}>
          <Text style={[s.configTitle, { color: colors.text }]}>Settlement</Text>
          {renderField('Auto-Settle Delay', 'settlementConfig.autoSettleDelayHours', config.settlementConfig.autoSettleDelayHours, 'hours')}
          {renderField('Require Approval Above', 'settlementConfig.requireApprovalAbove', config.settlementConfig.requireApprovalAbove, 'NC')}
          {renderField('Max Daily Settlement', 'settlementConfig.maxDailySettlement', config.settlementConfig.maxDailySettlement, 'NC')}
        </View>

        {/* Save Button */}
        {configDirty && (
          <TouchableOpacity
            style={[s.saveBtn, { backgroundColor: colors.tint }]}
            onPress={handleSaveConfig}
            disabled={savingConfig}
          >
            {savingConfig ? (
              <ActivityIndicator color={colors.card} size="small" />
            ) : (
              <Text style={s.saveBtnText}>Save Configuration</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <ScrollView
      style={[s.container, { backgroundColor: isDark ? Colors.dark.background : colors.slate }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={[s.pageTitle, { color: colors.text }]}>Partner Earnings</Text>
      {renderTabs()}

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      ) : (
        <>
          {activeTab === 'analytics' && renderAnalytics()}
          {activeTab === 'users' && renderUsers()}
          {activeTab === 'config' && renderConfig()}
        </>
      )}

      {/* Adjust Modal */}
      <Modal visible={adjustModal.visible} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={[s.modalContent, { backgroundColor: isDark ? colors.slateDark : colors.card }]}>
            <Text style={[s.modalTitle, { color: colors.text }]}>Adjust Earnings: {adjustModal.name}</Text>

            <View style={s.toggleRow}>
              <TouchableOpacity
                style={[s.toggleBtn, adjustType === 'credit' && { backgroundColor: colors.success }]}
                onPress={() => setAdjustType('credit')}
              >
                <Text style={{ color: adjustType === 'credit' ? colors.card : colors.text }}>Credit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.toggleBtn, adjustType === 'debit' && { backgroundColor: colors.error }]}
                onPress={() => setAdjustType('debit')}
              >
                <Text style={{ color: adjustType === 'debit' ? colors.card : colors.text }}>Debit</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={[s.modalInput, { color: colors.text, borderColor: isDark ? Colors.dark.border : colors.gray300 }]}
              placeholder="Amount (NC)"
              placeholderTextColor={colors.muted}
              keyboardType="numeric"
              value={adjustAmount}
              onChangeText={setAdjustAmount}
            />
            <TextInput
              style={[s.modalInput, s.modalTextArea, { color: colors.text, borderColor: isDark ? Colors.dark.border : colors.gray300 }]}
              placeholder="Reason (required)"
              placeholderTextColor={colors.muted}
              multiline
              value={adjustReason}
              onChangeText={setAdjustReason}
            />

            <View style={s.modalActions}>
              <TouchableOpacity style={s.modalCancel} onPress={() => setAdjustModal({ visible: false, userId: '', name: '' })}>
                <Text style={{ color: colors.mutedDark }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.modalConfirm, { backgroundColor: colors.tint }]} onPress={handleAdjust}>
                <Text style={{ color: colors.card, fontWeight: '600' }}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  pageTitle: { fontSize: 24, fontWeight: '700', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  center: { padding: 60, alignItems: 'center' },

  // Tabs
  tabBar: { flexDirection: 'row', marginHorizontal: 16, borderRadius: 10, padding: 4, marginBottom: 16 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10 },
  tabLabel: { fontSize: 13, fontWeight: '600' },

  section: { paddingHorizontal: 16 },

  // Cards
  cardRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  card: { flex: 1, borderRadius: 12, padding: 16, elevation: 1 },
  cardLabel: { fontSize: 12, marginBottom: 4 },
  cardValue: { fontSize: 20, fontWeight: '700' },

  // Tables
  tableCard: { borderRadius: 12, padding: 16, marginBottom: 12, elevation: 1 },
  tableTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: Colors.light.gray200 },
  tableCell: { flex: 1, fontSize: 13 },
  tableCellSmall: { width: 70, fontSize: 12, textAlign: 'right' },

  // Search
  searchBar: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12, gap: 8, elevation: 1 },
  searchInput: { flex: 1, fontSize: 14 },

  // User cards
  userCard: { borderRadius: 12, padding: 14, marginBottom: 10, elevation: 1 },
  userHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.light.navy, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: Colors.light.card, fontWeight: '700', fontSize: 15 },
  userName: { fontSize: 14, fontWeight: '600' },
  adjustBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: Colors.light.gray300 },
  userStats: { flexDirection: 'row', marginTop: 10, gap: 4 },
  userStat: { flex: 1, alignItems: 'center' },
  userStatValue: { fontSize: 14, fontWeight: '600', marginTop: 2 },

  // Pagination
  pagination: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  pageBtn: { paddingHorizontal: 12, paddingVertical: 6 },

  // Config
  configCard: { borderRadius: 12, padding: 16, marginBottom: 12, elevation: 1 },
  configTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  fieldRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  fieldLabel: { fontSize: 13, flex: 1 },
  fieldInputWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  fieldInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, width: 80, textAlign: 'right', fontSize: 14 },
  saveBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8, marginBottom: 16 },
  saveBtnText: { color: Colors.light.card, fontSize: 16, fontWeight: '600' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '90%', maxWidth: 400, borderRadius: 16, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: '600', marginBottom: 16 },
  toggleRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  toggleBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: Colors.light.gray300 },
  modalInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, marginBottom: 12 },
  modalTextArea: { height: 80, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 8 },
  modalCancel: { paddingHorizontal: 16, paddingVertical: 10 },
  modalConfirm: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
});
