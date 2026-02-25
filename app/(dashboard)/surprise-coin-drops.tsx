import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  useColorScheme,
  ActivityIndicator,
  Modal,
  TextInput,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  surpriseCoinDropsService,
  SurpriseCoinDrop,
  AnalyticsResponse,
} from '../../services/api/surpriseCoinDrops';
import { Colors } from '../../constants/Colors';
import { format } from 'date-fns';
import { showAlert, showConfirm } from '../../utils/alert';

type TabType = 'drops' | 'analytics';
type StatusFilter = 'all' | 'available' | 'claimed' | 'expired';
type ReasonFilter = 'all' | 'random' | 'milestone' | 'promo' | 'special_event' | 'welcome' | 'comeback';

const STATUS_COLORS: Record<string, string> = {
  available: '#10B981',
  claimed: '#3B82F6',
  expired: '#EF4444',
};

const STATUS_ICONS: Record<string, string> = {
  available: 'gift-outline',
  claimed: 'checkmark-circle',
  expired: 'close-circle',
};

const REASON_LABELS: Record<string, string> = {
  random: 'Random',
  milestone: 'Milestone',
  promo: 'Promo',
  special_event: 'Special Event',
  welcome: 'Welcome',
  comeback: 'Comeback',
};

function formatDate(dateString: string): string {
  try {
    return format(new Date(dateString), 'MMM dd, yyyy HH:mm');
  } catch {
    return dateString;
  }
}

function getUserDisplay(userId: SurpriseCoinDrop['userId']): string {
  if (typeof userId === 'object' && userId !== null) {
    return userId.fullName || userId.phoneNumber || String(userId._id).slice(0, 8);
  }
  return String(userId).slice(0, 8);
}

export default function SurpriseCoinDropsPage() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];

  const [activeTab, setActiveTab] = useState<TabType>('drops');
  const [drops, setDrops] = useState<SurpriseCoinDrop[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [reasonFilter, setReasonFilter] = useState<ReasonFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Analytics state
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // Create modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    userId: '',
    coins: '',
    reason: 'promo' as string,
    message: 'Surprise! You got bonus coins!',
    expiryHours: '24',
  });
  const [creating, setCreating] = useState(false);

  // Bulk create modal
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkForm, setBulkForm] = useState({
    userIds: '',
    coins: '',
    reason: 'promo' as string,
    message: 'Surprise! You got bonus coins!',
    expiryHours: '24',
  });
  const [bulkCreating, setBulkCreating] = useState(false);

  const fetchDrops = useCallback(async (pageNum = 1, isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const result = await surpriseCoinDropsService.getDrops({
        page: pageNum,
        limit: 20,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        reason: reasonFilter !== 'all' ? reasonFilter : undefined,
        search: searchQuery || undefined,
      });
      setDrops(result.drops);
      setPage(result.pagination.page);
      setTotalPages(result.pagination.totalPages);
      setTotal(result.pagination.total);
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to load drops');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter, reasonFilter, searchQuery]);

  const fetchAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    try {
      const result = await surpriseCoinDropsService.getAnalytics(30);
      setAnalytics(result);
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to load analytics');
    } finally {
      setAnalyticsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'drops') fetchDrops(1);
    else fetchAnalytics();
  }, [activeTab, statusFilter, reasonFilter]);

  const handleSearch = () => {
    fetchDrops(1);
  };

  const handleCreateDrop = async () => {
    if (!createForm.userId.trim()) {
      showAlert('Error', 'User ID is required');
      return;
    }
    const coins = parseInt(createForm.coins);
    if (!coins || coins < 1 || coins > 10000) {
      showAlert('Error', 'Coins must be between 1 and 10000');
      return;
    }

    setCreating(true);
    try {
      await surpriseCoinDropsService.createDrop({
        userId: createForm.userId.trim(),
        coins,
        reason: createForm.reason,
        message: createForm.message,
        expiryHours: parseInt(createForm.expiryHours) || 24,
      });
      showAlert('Success', 'Surprise coin drop created');
      setShowCreateModal(false);
      setCreateForm({ userId: '', coins: '', reason: 'promo', message: 'Surprise! You got bonus coins!', expiryHours: '24' });
      fetchDrops(1);
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to create drop');
    } finally {
      setCreating(false);
    }
  };

  const handleBulkCreate = async () => {
    const userIds = bulkForm.userIds.split(/[\n,]+/).map(id => id.trim()).filter(Boolean);
    if (userIds.length === 0) {
      showAlert('Error', 'At least one User ID is required');
      return;
    }
    const coins = parseInt(bulkForm.coins);
    if (!coins || coins < 1 || coins > 10000) {
      showAlert('Error', 'Coins must be between 1 and 10000');
      return;
    }

    setBulkCreating(true);
    try {
      const result = await surpriseCoinDropsService.bulkCreate({
        userIds,
        coins,
        reason: bulkForm.reason,
        message: bulkForm.message,
        expiryHours: parseInt(bulkForm.expiryHours) || 24,
      });
      showAlert('Success', `Created ${result.created} drops. Skipped: ${result.skipped}. Invalid IDs: ${result.invalidIds}`);
      setShowBulkModal(false);
      setBulkForm({ userIds: '', coins: '', reason: 'promo', message: 'Surprise! You got bonus coins!', expiryHours: '24' });
      fetchDrops(1);
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to bulk create');
    } finally {
      setBulkCreating(false);
    }
  };

  const handleDeleteDrop = async (drop: SurpriseCoinDrop) => {
    if (drop.status === 'claimed') {
      showAlert('Error', 'Cannot delete a claimed drop');
      return;
    }
    const confirmed = await showConfirm(
      'Delete Drop',
      `Delete ${drop.coins} NC drop for ${getUserDisplay(drop.userId)}?`
    );
    if (!confirmed) return;

    try {
      await surpriseCoinDropsService.deleteDrop(drop._id);
      showAlert('Success', 'Drop deleted');
      fetchDrops(page);
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to delete');
    }
  };

  const handleExpireOld = async () => {
    const confirmed = await showConfirm(
      'Expire Old Drops',
      'This will expire all unclaimed drops past their expiry date. Continue?'
    );
    if (!confirmed) return;

    try {
      const result = await surpriseCoinDropsService.expireOldDrops();
      showAlert('Success', `${result.expiredCount} drops expired`);
      fetchDrops(page);
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to expire drops');
    }
  };

  const renderDropItem = ({ item }: { item: SurpriseCoinDrop }) => {
    const statusColor = STATUS_COLORS[item.status] || '#94A3B8';
    const statusIcon = STATUS_ICONS[item.status] || 'help-circle';

    return (
      <View style={[styles.card, { backgroundColor: isDark ? '#1E293B' : '#FFF' }]}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <Ionicons name={statusIcon as any} size={18} color={statusColor} />
            <Text style={[styles.statusBadge, { color: statusColor }]}>
              {item.status.toUpperCase()}
            </Text>
          </View>
          <View style={[styles.reasonBadge, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]}>
            <Text style={[styles.reasonText, { color: isDark ? '#CBD5E1' : '#475569' }]}>
              {REASON_LABELS[item.reason] || item.reason}
            </Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.cardRow}>
            <Text style={[styles.cardLabel, { color: isDark ? '#94A3B8' : '#6B7280' }]}>User</Text>
            <Text style={[styles.cardValue, { color: isDark ? '#F1F5F9' : '#1F2937' }]}>
              {getUserDisplay(item.userId)}
            </Text>
          </View>
          <View style={styles.cardRow}>
            <Text style={[styles.cardLabel, { color: isDark ? '#94A3B8' : '#6B7280' }]}>Coins</Text>
            <Text style={[styles.coinsValue, { color: '#F59E0B' }]}>{item.coins} NC</Text>
          </View>
          <View style={styles.cardRow}>
            <Text style={[styles.cardLabel, { color: isDark ? '#94A3B8' : '#6B7280' }]}>Message</Text>
            <Text style={[styles.cardValue, { color: isDark ? '#F1F5F9' : '#1F2937' }]} numberOfLines={1}>
              {item.message}
            </Text>
          </View>
          <View style={styles.cardRow}>
            <Text style={[styles.cardLabel, { color: isDark ? '#94A3B8' : '#6B7280' }]}>Created</Text>
            <Text style={[styles.cardValue, { color: isDark ? '#F1F5F9' : '#1F2937' }]}>
              {formatDate(item.createdAt)}
            </Text>
          </View>
          <View style={styles.cardRow}>
            <Text style={[styles.cardLabel, { color: isDark ? '#94A3B8' : '#6B7280' }]}>Expires</Text>
            <Text style={[styles.cardValue, { color: isDark ? '#F1F5F9' : '#1F2937' }]}>
              {formatDate(item.expiresAt)}
            </Text>
          </View>
          {item.claimedAt && (
            <View style={styles.cardRow}>
              <Text style={[styles.cardLabel, { color: isDark ? '#94A3B8' : '#6B7280' }]}>Claimed</Text>
              <Text style={[styles.cardValue, { color: '#10B981' }]}>
                {formatDate(item.claimedAt)}
              </Text>
            </View>
          )}
        </View>

        {item.status !== 'claimed' && (
          <View style={styles.cardActions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={() => handleDeleteDrop(item)}
            >
              <Ionicons name="trash-outline" size={16} color="#EF4444" />
              <Text style={styles.deleteButtonText}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const renderAnalytics = () => {
    if (analyticsLoading) {
      return <ActivityIndicator size="large" color={colors.tint} style={{ marginTop: 40 }} />;
    }
    if (!analytics) return null;

    const { summary, statusBreakdown, reasonBreakdown } = analytics;

    return (
      <ScrollView style={styles.analyticsContainer} showsVerticalScrollIndicator={false}>
        {/* Summary Cards */}
        <View style={styles.statsGrid}>
          {[
            { label: 'Total Drops', value: summary.totalDrops, icon: 'gift-outline', color: '#3B82F6' },
            { label: 'Total Coins', value: summary.totalCoins.toLocaleString(), icon: 'wallet-outline', color: '#F59E0B' },
            { label: 'Avg Coins', value: summary.avgCoins, icon: 'analytics-outline', color: '#8B5CF6' },
            { label: 'Unique Users', value: summary.uniqueUsers, icon: 'people-outline', color: '#10B981' },
            { label: 'Claim Rate', value: `${summary.claimRate}%`, icon: 'checkmark-circle-outline', color: '#06B6D4' },
            { label: 'Unclaimed', value: summary.unclaimed, icon: 'time-outline', color: '#EF4444' },
          ].map((stat, i) => (
            <View key={i} style={[styles.statCard, { backgroundColor: isDark ? '#1E293B' : '#FFF' }]}>
              <Ionicons name={stat.icon as any} size={24} color={stat.color} />
              <Text style={[styles.statValue, { color: isDark ? '#F1F5F9' : '#1F2937' }]}>{stat.value}</Text>
              <Text style={[styles.statLabel, { color: isDark ? '#94A3B8' : '#6B7280' }]}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Status Breakdown */}
        <View style={[styles.sectionCard, { backgroundColor: isDark ? '#1E293B' : '#FFF' }]}>
          <Text style={[styles.sectionTitle, { color: isDark ? '#F1F5F9' : '#1F2937' }]}>By Status</Text>
          {statusBreakdown.map((item: any, i: number) => (
            <View key={i} style={styles.breakdownRow}>
              <View style={styles.breakdownLeft}>
                <View style={[styles.dot, { backgroundColor: STATUS_COLORS[item._id] || '#94A3B8' }]} />
                <Text style={[styles.breakdownLabel, { color: isDark ? '#CBD5E1' : '#374151' }]}>
                  {item._id}
                </Text>
              </View>
              <View style={styles.breakdownRight}>
                <Text style={[styles.breakdownCount, { color: isDark ? '#F1F5F9' : '#1F2937' }]}>{item.count}</Text>
                <Text style={[styles.breakdownCoins, { color: '#F59E0B' }]}>{item.totalCoins} NC</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Reason Breakdown */}
        <View style={[styles.sectionCard, { backgroundColor: isDark ? '#1E293B' : '#FFF', marginBottom: 40 }]}>
          <Text style={[styles.sectionTitle, { color: isDark ? '#F1F5F9' : '#1F2937' }]}>By Reason</Text>
          {reasonBreakdown.map((item: any, i: number) => (
            <View key={i} style={styles.breakdownRow}>
              <Text style={[styles.breakdownLabel, { color: isDark ? '#CBD5E1' : '#374151' }]}>
                {REASON_LABELS[item._id] || item._id}
              </Text>
              <View style={styles.breakdownRight}>
                <Text style={[styles.breakdownCount, { color: isDark ? '#F1F5F9' : '#1F2937' }]}>{item.count}</Text>
                <Text style={[styles.breakdownCoins, { color: '#F59E0B' }]}>{item.totalCoins} NC</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    );
  };

  const renderCreateModal = () => (
    <Modal visible={showCreateModal} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: isDark ? '#1E293B' : '#FFF' }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: isDark ? '#F1F5F9' : '#1F2937' }]}>Create Surprise Drop</Text>
            <TouchableOpacity onPress={() => setShowCreateModal(false)}>
              <Ionicons name="close" size={24} color={isDark ? '#94A3B8' : '#6B7280'} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <Text style={[styles.fieldLabel, { color: isDark ? '#CBD5E1' : '#374151' }]}>User ID *</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: isDark ? '#0F172A' : '#F9FAFB', color: isDark ? '#F1F5F9' : '#1F2937' }]}
              value={createForm.userId}
              onChangeText={t => setCreateForm(p => ({ ...p, userId: t }))}
              placeholder="Paste user ObjectId"
              placeholderTextColor={isDark ? '#64748B' : '#9CA3AF'}
            />

            <Text style={[styles.fieldLabel, { color: isDark ? '#CBD5E1' : '#374151' }]}>Coins *</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: isDark ? '#0F172A' : '#F9FAFB', color: isDark ? '#F1F5F9' : '#1F2937' }]}
              value={createForm.coins}
              onChangeText={t => setCreateForm(p => ({ ...p, coins: t.replace(/[^0-9]/g, '') }))}
              keyboardType="number-pad"
              placeholder="1 - 10000"
              placeholderTextColor={isDark ? '#64748B' : '#9CA3AF'}
            />

            <Text style={[styles.fieldLabel, { color: isDark ? '#CBD5E1' : '#374151' }]}>Reason</Text>
            <View style={styles.reasonOptions}>
              {Object.entries(REASON_LABELS).map(([key, label]) => (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.reasonChip,
                    { backgroundColor: createForm.reason === key ? '#3B82F6' : (isDark ? '#334155' : '#F1F5F9') },
                  ]}
                  onPress={() => setCreateForm(p => ({ ...p, reason: key }))}
                >
                  <Text style={{ color: createForm.reason === key ? '#FFF' : (isDark ? '#CBD5E1' : '#475569'), fontSize: 13 }}>
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.fieldLabel, { color: isDark ? '#CBD5E1' : '#374151' }]}>Message</Text>
            <TextInput
              style={[styles.textInput, styles.multilineInput, { backgroundColor: isDark ? '#0F172A' : '#F9FAFB', color: isDark ? '#F1F5F9' : '#1F2937' }]}
              value={createForm.message}
              onChangeText={t => setCreateForm(p => ({ ...p, message: t }))}
              multiline
              maxLength={200}
              placeholderTextColor={isDark ? '#64748B' : '#9CA3AF'}
            />

            <Text style={[styles.fieldLabel, { color: isDark ? '#CBD5E1' : '#374151' }]}>Expiry (hours)</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: isDark ? '#0F172A' : '#F9FAFB', color: isDark ? '#F1F5F9' : '#1F2937' }]}
              value={createForm.expiryHours}
              onChangeText={t => setCreateForm(p => ({ ...p, expiryHours: t.replace(/[^0-9]/g, '') }))}
              keyboardType="number-pad"
              placeholder="24"
              placeholderTextColor={isDark ? '#64748B' : '#9CA3AF'}
            />
          </ScrollView>

          <TouchableOpacity
            style={[styles.submitButton, creating && styles.submitButtonDisabled]}
            onPress={handleCreateDrop}
            disabled={creating}
          >
            {creating ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <Text style={styles.submitButtonText}>Create Drop</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderBulkModal = () => (
    <Modal visible={showBulkModal} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: isDark ? '#1E293B' : '#FFF' }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: isDark ? '#F1F5F9' : '#1F2937' }]}>Bulk Create Drops</Text>
            <TouchableOpacity onPress={() => setShowBulkModal(false)}>
              <Ionicons name="close" size={24} color={isDark ? '#94A3B8' : '#6B7280'} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <Text style={[styles.fieldLabel, { color: isDark ? '#CBD5E1' : '#374151' }]}>User IDs * (one per line or comma-separated)</Text>
            <TextInput
              style={[styles.textInput, styles.multilineInput, { height: 120, backgroundColor: isDark ? '#0F172A' : '#F9FAFB', color: isDark ? '#F1F5F9' : '#1F2937' }]}
              value={bulkForm.userIds}
              onChangeText={t => setBulkForm(p => ({ ...p, userIds: t }))}
              multiline
              placeholder="6abc123...\n6def456..."
              placeholderTextColor={isDark ? '#64748B' : '#9CA3AF'}
            />

            <Text style={[styles.fieldLabel, { color: isDark ? '#CBD5E1' : '#374151' }]}>Coins per user *</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: isDark ? '#0F172A' : '#F9FAFB', color: isDark ? '#F1F5F9' : '#1F2937' }]}
              value={bulkForm.coins}
              onChangeText={t => setBulkForm(p => ({ ...p, coins: t.replace(/[^0-9]/g, '') }))}
              keyboardType="number-pad"
              placeholder="1 - 10000"
              placeholderTextColor={isDark ? '#64748B' : '#9CA3AF'}
            />

            <Text style={[styles.fieldLabel, { color: isDark ? '#CBD5E1' : '#374151' }]}>Reason</Text>
            <View style={styles.reasonOptions}>
              {Object.entries(REASON_LABELS).map(([key, label]) => (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.reasonChip,
                    { backgroundColor: bulkForm.reason === key ? '#3B82F6' : (isDark ? '#334155' : '#F1F5F9') },
                  ]}
                  onPress={() => setBulkForm(p => ({ ...p, reason: key }))}
                >
                  <Text style={{ color: bulkForm.reason === key ? '#FFF' : (isDark ? '#CBD5E1' : '#475569'), fontSize: 13 }}>
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.fieldLabel, { color: isDark ? '#CBD5E1' : '#374151' }]}>Message</Text>
            <TextInput
              style={[styles.textInput, styles.multilineInput, { backgroundColor: isDark ? '#0F172A' : '#F9FAFB', color: isDark ? '#F1F5F9' : '#1F2937' }]}
              value={bulkForm.message}
              onChangeText={t => setBulkForm(p => ({ ...p, message: t }))}
              multiline
              maxLength={200}
              placeholderTextColor={isDark ? '#64748B' : '#9CA3AF'}
            />

            <Text style={[styles.fieldLabel, { color: isDark ? '#CBD5E1' : '#374151' }]}>Expiry (hours)</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: isDark ? '#0F172A' : '#F9FAFB', color: isDark ? '#F1F5F9' : '#1F2937' }]}
              value={bulkForm.expiryHours}
              onChangeText={t => setBulkForm(p => ({ ...p, expiryHours: t.replace(/[^0-9]/g, '') }))}
              keyboardType="number-pad"
              placeholder="24"
              placeholderTextColor={isDark ? '#64748B' : '#9CA3AF'}
            />
          </ScrollView>

          <TouchableOpacity
            style={[styles.submitButton, bulkCreating && styles.submitButtonDisabled]}
            onPress={handleBulkCreate}
            disabled={bulkCreating}
          >
            {bulkCreating ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <Text style={styles.submitButtonText}>Bulk Create</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#0F172A' : '#F5F7FA' }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: isDark ? '#1E293B' : '#FFF' }]}>
        <Text style={[styles.headerTitle, { color: isDark ? '#F1F5F9' : '#1F2937' }]}>
          Surprise Coin Drops
        </Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerButton} onPress={handleExpireOld}>
            <Ionicons name="timer-outline" size={18} color="#EF4444" />
            <Text style={styles.headerButtonExpireText}>Expire Old</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton} onPress={() => setShowBulkModal(true)}>
            <Ionicons name="people" size={18} color="#3B82F6" />
            <Text style={styles.headerButtonBulkText}>Bulk</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.addButton} onPress={() => setShowCreateModal(true)}>
            <Ionicons name="add" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View style={[styles.tabs, { backgroundColor: isDark ? '#1E293B' : '#FFF' }]}>
        {(['drops', 'analytics'] as TabType[]).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'drops' ? `Drops (${total})` : 'Analytics'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'drops' ? (
        <>
          {/* Filters */}
          <View style={styles.filtersContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersRow}>
              {(['all', 'available', 'claimed', 'expired'] as StatusFilter[]).map(s => (
                <TouchableOpacity
                  key={s}
                  style={[
                    styles.filterChip,
                    { backgroundColor: statusFilter === s ? '#3B82F6' : (isDark ? '#334155' : '#E2E8F0') },
                  ]}
                  onPress={() => setStatusFilter(s)}
                >
                  <Text style={{ color: statusFilter === s ? '#FFF' : (isDark ? '#CBD5E1' : '#475569'), fontSize: 13, fontWeight: '600' }}>
                    {s === 'all' ? 'All Status' : s.charAt(0).toUpperCase() + s.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersRow}>
              {(['all', ...Object.keys(REASON_LABELS)] as ReasonFilter[]).map(r => (
                <TouchableOpacity
                  key={r}
                  style={[
                    styles.filterChip,
                    { backgroundColor: reasonFilter === r ? '#8B5CF6' : (isDark ? '#334155' : '#E2E8F0') },
                  ]}
                  onPress={() => setReasonFilter(r)}
                >
                  <Text style={{ color: reasonFilter === r ? '#FFF' : (isDark ? '#CBD5E1' : '#475569'), fontSize: 13, fontWeight: '600' }}>
                    {r === 'all' ? 'All Reasons' : (REASON_LABELS[r] || r)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Search */}
            <View style={[styles.searchBar, { backgroundColor: isDark ? '#1E293B' : '#FFF' }]}>
              <Ionicons name="search" size={18} color={isDark ? '#64748B' : '#9CA3AF'} />
              <TextInput
                style={[styles.searchInput, { color: isDark ? '#F1F5F9' : '#1F2937' }]}
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={handleSearch}
                placeholder="Search by phone number..."
                placeholderTextColor={isDark ? '#64748B' : '#9CA3AF'}
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => { setSearchQuery(''); fetchDrops(1); }}>
                  <Ionicons name="close-circle" size={18} color={isDark ? '#64748B' : '#9CA3AF'} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* List */}
          <FlatList
            data={drops}
            keyExtractor={item => item._id}
            renderItem={renderDropItem}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => fetchDrops(1, true)} />
            }
            ListEmptyComponent={
              !loading ? (
                <View style={styles.emptyState}>
                  <Ionicons name="gift-outline" size={48} color={isDark ? '#475569' : '#D1D5DB'} />
                  <Text style={[styles.emptyText, { color: isDark ? '#94A3B8' : '#6B7280' }]}>
                    No surprise coin drops found
                  </Text>
                </View>
              ) : null
            }
            ListFooterComponent={
              loading ? <ActivityIndicator color={colors.tint} style={{ marginVertical: 20 }} /> : (
                totalPages > 1 ? (
                  <View style={styles.pagination}>
                    <TouchableOpacity
                      style={[styles.pageButton, page <= 1 && styles.pageButtonDisabled]}
                      onPress={() => page > 1 && fetchDrops(page - 1)}
                      disabled={page <= 1}
                    >
                      <Ionicons name="chevron-back" size={18} color={page <= 1 ? '#94A3B8' : '#3B82F6'} />
                    </TouchableOpacity>
                    <Text style={[styles.pageText, { color: isDark ? '#CBD5E1' : '#6B7280' }]}>
                      Page {page} of {totalPages}
                    </Text>
                    <TouchableOpacity
                      style={[styles.pageButton, page >= totalPages && styles.pageButtonDisabled]}
                      onPress={() => page < totalPages && fetchDrops(page + 1)}
                      disabled={page >= totalPages}
                    >
                      <Ionicons name="chevron-forward" size={18} color={page >= totalPages ? '#94A3B8' : '#3B82F6'} />
                    </TouchableOpacity>
                  </View>
                ) : null
              )
            }
          />
        </>
      ) : (
        renderAnalytics()
      )}

      {renderCreateModal()}
      {renderBulkModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  headerButtonExpireText: { fontSize: 13, fontWeight: '600', color: '#EF4444' },
  headerButtonBulkText: { fontSize: 13, fontWeight: '600', color: '#3B82F6' },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#3B82F6',
  },
  tabText: { fontSize: 14, fontWeight: '600', color: '#94A3B8' },
  tabTextActive: { color: '#3B82F6' },
  filtersContainer: { paddingTop: 8 },
  filtersRow: { paddingHorizontal: 12, marginBottom: 6 },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    marginVertical: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchInput: { flex: 1, fontSize: 14 },
  listContent: { paddingHorizontal: 12, paddingBottom: 20 },
  card: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusBadge: { fontSize: 12, fontWeight: '700' },
  reasonBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  reasonText: { fontSize: 11, fontWeight: '600' },
  cardBody: { gap: 6 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardLabel: { fontSize: 13 },
  cardValue: { fontSize: 13, fontWeight: '600', maxWidth: '60%', textAlign: 'right' },
  coinsValue: { fontSize: 15, fontWeight: '700' },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  deleteButton: { backgroundColor: '#FEE2E2' },
  deleteButtonText: { fontSize: 13, fontWeight: '600', color: '#EF4444' },
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 15 },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 16,
  },
  pageButton: { padding: 8 },
  pageButtonDisabled: { opacity: 0.4 },
  pageText: { fontSize: 14 },
  // Analytics
  analyticsContainer: { padding: 12 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  statCard: {
    width: '31%',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: { fontSize: 20, fontWeight: '800' },
  statLabel: { fontSize: 11, fontWeight: '600', textAlign: 'center' },
  sectionCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  breakdownLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  breakdownLabel: { fontSize: 14, fontWeight: '500', textTransform: 'capitalize' },
  breakdownRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  breakdownCount: { fontSize: 14, fontWeight: '700' },
  breakdownCoins: { fontSize: 13, fontWeight: '600' },
  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 16,
    maxHeight: '85%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalBody: { padding: 16, maxHeight: 400 },
  fieldLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 12 },
  textInput: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  multilineInput: { minHeight: 70, textAlignVertical: 'top' },
  reasonOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  reasonChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  submitButton: {
    backgroundColor: '#3B82F6',
    margin: 16,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
