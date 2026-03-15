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
  Switch,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  leaderboardConfigService,
  LeaderboardConfigAdmin,
  LeaderboardStats,
  LeaderboardAnalytics,
  LeaderboardPrize,
  LeaderboardType,
  LeaderboardPeriod,
  LeaderboardStatus,
  PrizeHistoryEntry,
} from '../../services/api/leaderboardConfig';
import { Colors } from '../../constants/Colors';
import { showAlert, showConfirm } from '../../utils/alert';

// ============================================
// TYPES & CONSTANTS
// ============================================

type StatusFilter = 'all' | LeaderboardStatus;

const STATUS_COLORS: Record<string, string> = {
  active: Colors.light.success,
  paused: Colors.light.warning,
  archived: Colors.light.mutedDark,
};

const LEADERBOARD_TYPE_LABELS: Record<LeaderboardType, string> = {
  coins: 'Coins',
  spending: 'Spending',
  reviews: 'Reviews',
  referrals: 'Referrals',
  cashback: 'Cashback',
  streak: 'Streak',
  custom: 'Custom',
};

const PERIOD_LABELS: Record<LeaderboardPeriod, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  'all-time': 'All Time',
};

const COIN_TRANSACTION_SOURCES = [
  'order', 'creator_pick_reward', 'social_share_reward',
  'spin_wheel', 'scratch_card', 'quiz_game', 'memory_match',
  'coin_hunt', 'guess_price', 'daily_login', 'achievement',
  'challenge', 'admin', 'review', 'bill_upload', 'survey',
  'merchant_award', 'bonus_campaign', 'referral',
  'cashback', 'purchase_reward',
];

const VERIFICATION_OPTIONS = [
  { key: '', label: 'None' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'kyc', label: 'KYC' },
];

// ============================================
// FORM DEFAULTS
// ============================================

interface LeaderboardFormData {
  slug: string;
  title: string;
  subtitle: string;
  leaderboardType: LeaderboardType;
  period: LeaderboardPeriod;
  sources: string[];
  prizePool: LeaderboardPrize[];
  eligibility: {
    minAccountAgeDays: number;
    minActivityThreshold: number;
    requiredVerification: string;
    excludedUserIds: string[];
  };
  antiFraud: {
    maxRankJumpPerCycle: number;
    minDifferentDays: number;
    flagDuplicateDevices: boolean;
  };
  display: {
    icon: string;
    backgroundColor: string;
    featured: boolean;
    priority: number;
  };
  topN: number;
  status: LeaderboardStatus;
}

const DEFAULT_FORM: LeaderboardFormData = {
  slug: '',
  title: '',
  subtitle: '',
  leaderboardType: 'coins',
  period: 'weekly',
  sources: [],
  prizePool: [],
  eligibility: {
    minAccountAgeDays: 0,
    minActivityThreshold: 0,
    requiredVerification: '',
    excludedUserIds: [],
  },
  antiFraud: {
    maxRankJumpPerCycle: 50,
    minDifferentDays: 3,
    flagDuplicateDevices: true,
  },
  display: {
    icon: 'trophy',
    backgroundColor: Colors.light.warningLight,
    featured: false,
    priority: 50,
  },
  topN: 100,
  status: 'paused',
};

// ============================================
// MAIN COMPONENT
// ============================================

export default function LeaderboardConfigScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  // List state
  const [configs, setConfigs] = useState<LeaderboardConfigAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Stats
  const [stats, setStats] = useState<LeaderboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // Form modal
  const [showFormModal, setShowFormModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingConfig, setEditingConfig] = useState<LeaderboardConfigAdmin | null>(null);
  const [formData, setFormData] = useState<LeaderboardFormData>(DEFAULT_FORM);
  const [excludedIdsInput, setExcludedIdsInput] = useState('');

  // Analytics modal
  const [selectedAnalyticsId, setSelectedAnalyticsId] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<LeaderboardAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // Prize history
  const [showPrizeHistory, setShowPrizeHistory] = useState(false);
  const [prizeHistoryConfigId, setPrizeHistoryConfigId] = useState<string | null>(null);
  const [prizeHistory, setPrizeHistory] = useState<PrizeHistoryEntry[]>([]);
  const [prizeHistoryLoading, setPrizeHistoryLoading] = useState(false);
  const [prizeHistoryPage, setPrizeHistoryPage] = useState(1);
  const [prizeHistoryTotalPages, setPrizeHistoryTotalPages] = useState(1);

  // ==========================================
  // DATA LOADING
  // ==========================================

  const loadConfigs = useCallback(async (pageNum: number = 1) => {
    try {
      if (pageNum === 1) setLoading(true);
      const query: any = { page: pageNum, limit: 20 };
      if (statusFilter !== 'all') query.status = statusFilter;
      if (searchQuery.trim()) query.search = searchQuery.trim();

      const data = await leaderboardConfigService.getAll(query);
      setConfigs(data.configs);
      setTotalPages(data.pagination.pages);
      setPage(pageNum);
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to load configs');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter, searchQuery]);

  const loadStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const data = await leaderboardConfigService.getStats();
      setStats(data);
    } catch (error: any) {
      console.error('Stats error:', error);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const loadAnalytics = useCallback(async (configId: string) => {
    try {
      setAnalyticsLoading(true);
      setSelectedAnalyticsId(configId);
      const data = await leaderboardConfigService.getAnalytics(configId);
      setAnalytics(data);
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to load analytics');
    } finally {
      setAnalyticsLoading(false);
    }
  }, []);

  const loadPrizeHistory = useCallback(async (configId: string, pageNum: number = 1) => {
    try {
      setPrizeHistoryLoading(true);
      const data = await leaderboardConfigService.getPrizeHistory({ configId, page: pageNum, limit: 20 });
      setPrizeHistory(data.prizes);
      setPrizeHistoryTotalPages(data.pagination.pages);
      setPrizeHistoryPage(pageNum);
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to load prize history');
    } finally {
      setPrizeHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfigs(1);
    loadStats();
  }, [statusFilter]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadConfigs(1);
    loadStats();
  }, [loadConfigs, loadStats]);

  // ==========================================
  // ACTIONS
  // ==========================================

  const handleCreate = () => {
    setEditingConfig(null);
    setFormData({ ...DEFAULT_FORM, prizePool: [], sources: [] });
    setExcludedIdsInput('');
    setShowFormModal(true);
  };

  const handleEdit = (config: LeaderboardConfigAdmin) => {
    setEditingConfig(config);
    setFormData({
      slug: config.slug,
      title: config.title,
      subtitle: config.subtitle,
      leaderboardType: config.leaderboardType,
      period: config.period,
      sources: (config as any).coinTransactionSources || config.sources || [],
      prizePool: config.prizePool || [],
      eligibility: {
        minAccountAgeDays: config.eligibility?.minAccountAgeDays || 0,
        minActivityThreshold: config.eligibility?.minActivityThreshold || 0,
        requiredVerification: config.eligibility?.requiredVerification || '',
        excludedUserIds: config.eligibility?.excludedUserIds || [],
      },
      antiFraud: {
        maxRankJumpPerCycle: config.antiFraud?.maxRankJumpPerCycle || 50,
        minDifferentDays: config.antiFraud?.minDifferentDays || 3,
        flagDuplicateDevices: config.antiFraud?.flagDuplicateDevices ?? true,
      },
      display: {
        icon: config.display?.icon || 'trophy',
        backgroundColor: config.display?.backgroundColor || colors.warningLight,
        featured: config.display?.featured || false,
        priority: config.display?.priority || 50,
      },
      topN: config.topN || 100,
      status: config.status,
    });
    setExcludedIdsInput((config.eligibility?.excludedUserIds || []).join(', '));
    setShowFormModal(true);
  };

  const handleSave = async () => {
    if (!formData.slug || !formData.title) {
      showAlert('Error', 'Slug and title are required');
      return;
    }

    try {
      setIsSaving(true);
      // Map frontend 'sources' to backend 'coinTransactionSources'
      const { sources, ...rest } = formData;
      const payload = {
        ...rest,
        coinTransactionSources: sources,
        eligibility: {
          ...formData.eligibility,
          excludedUserIds: excludedIdsInput
            ? excludedIdsInput.split(',').map(s => s.trim()).filter(Boolean)
            : [],
        },
      };

      if (editingConfig) {
        await leaderboardConfigService.update(editingConfig._id, payload);
        showAlert('Success', 'Leaderboard config updated successfully');
      } else {
        await leaderboardConfigService.create(payload);
        showAlert('Success', 'Leaderboard config created successfully');
      }
      setShowFormModal(false);
      loadConfigs(1);
      loadStats();
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to save config');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (config: LeaderboardConfigAdmin) => {
    if (config.status === 'active') {
      showAlert('Error', 'Cannot delete an active leaderboard. Pause or archive it first.');
      return;
    }

    showConfirm(
      'Delete Leaderboard',
      `Are you sure you want to delete "${config.title}"?`,
      async () => {
        try {
          await leaderboardConfigService.remove(config._id);
          showAlert('Success', 'Leaderboard deleted');
          loadConfigs(page);
          loadStats();
        } catch (error: any) {
          showAlert('Error', error.message || 'Failed to delete');
        }
      }
    );
  };

  const handleStatusChange = async (config: LeaderboardConfigAdmin, newStatus: LeaderboardStatus) => {
    try {
      await leaderboardConfigService.updateStatus(config._id, newStatus);
      showAlert('Success', `Status changed to ${newStatus}`);
      loadConfigs(page);
      loadStats();
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to update status');
    }
  };

  const handleDistributePrizes = async (config: LeaderboardConfigAdmin) => {
    showConfirm(
      'Distribute Prizes',
      `Are you sure you want to distribute prizes for "${config.title}"?`,
      async () => {
        try {
          const result = await leaderboardConfigService.distributePrizes(config._id);
          showAlert('Success', `Distributed ${result.distributed} prizes totaling ${result.totalAmount} coins`);
          loadConfigs(page);
          loadStats();
        } catch (error: any) {
          showAlert('Error', error.message || 'Failed to distribute prizes');
        }
      }
    );
  };

  const handleViewPrizeHistory = (config: LeaderboardConfigAdmin) => {
    setPrizeHistoryConfigId(config._id);
    setShowPrizeHistory(true);
    loadPrizeHistory(config._id, 1);
  };

  // ==========================================
  // PRIZE POOL HELPERS
  // ==========================================

  const addPrizeRow = () => {
    setFormData(prev => ({
      ...prev,
      prizePool: [
        ...prev.prizePool,
        { rankStart: (prev.prizePool.length > 0 ? prev.prizePool[prev.prizePool.length - 1].rankEnd + 1 : 1), rankEnd: 1, prizeAmount: 0, prizeLabel: '' },
      ],
    }));
  };

  const removePrizeRow = (index: number) => {
    setFormData(prev => ({
      ...prev,
      prizePool: prev.prizePool.filter((_, i) => i !== index),
    }));
  };

  const updatePrizeRow = (index: number, field: keyof LeaderboardPrize, value: any) => {
    setFormData(prev => ({
      ...prev,
      prizePool: prev.prizePool.map((p, i) =>
        i === index ? { ...p, [field]: field === 'prizeLabel' ? value : (Number(value) || 0) } : p
      ),
    }));
  };

  // ==========================================
  // RENDERERS
  // ==========================================

  const renderStatusBadge = (status: string) => (
    <View style={[styles.statusBadge, { backgroundColor: `${STATUS_COLORS[status] || colors.slateMedium}20` }]}>
      <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[status] || colors.slateMedium }]} />
      <Text style={[styles.statusText, { color: STATUS_COLORS[status] || colors.slateMedium }]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Text>
    </View>
  );

  const getPrizePoolTotal = (prizePool: LeaderboardPrize[]) => {
    return prizePool.reduce((sum, p) => {
      const count = Math.max(1, p.rankEnd - p.rankStart + 1);
      return sum + p.prizeAmount * count;
    }, 0);
  };

  const renderConfigCard = ({ item }: { item: LeaderboardConfigAdmin }) => (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <View style={[styles.iconCircle, { backgroundColor: item.display?.backgroundColor || colors.warningLight }]}>
            <Ionicons name={(item.display?.icon as any) || 'trophy'} size={20} color={colors.navy} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.cardSlug}>{item.slug}</Text>
          </View>
        </View>
        {renderStatusBadge(item.status)}
      </View>

      {/* Info Row */}
      <View style={styles.cardInfoRow}>
        <View style={styles.infoChip}>
          <Text style={styles.infoChipText}>
            {LEADERBOARD_TYPE_LABELS[item.leaderboardType] || item.leaderboardType}
          </Text>
        </View>
        <View style={styles.infoChip}>
          <Text style={styles.infoChipText}>
            {PERIOD_LABELS[item.period] || item.period}
          </Text>
        </View>
        <View style={styles.infoChip}>
          <Text style={styles.infoChipText}>
            Top {item.topN || 100}
          </Text>
        </View>
        {item.display?.featured && (
          <View style={[styles.infoChip, { backgroundColor: colors.warningLight }]}>
            <Text style={[styles.infoChipText, { color: colors.warningDark }]}>Featured</Text>
          </View>
        )}
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <Text style={styles.statsText}>
          Prize Pool: {getPrizePoolTotal(item.prizePool || []).toLocaleString()} coins
        </Text>
        <Text style={styles.statsText}>
          Participants: {item.participantsCount || 0}
        </Text>
      </View>

      {/* Actions */}
      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => handleEdit(item)}>
          <Ionicons name="create-outline" size={18} color={colors.info} />
          <Text style={[styles.actionText, { color: colors.info }]}>Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={() => loadAnalytics(item._id)}>
          <Ionicons name="bar-chart-outline" size={18} color={colors.purple} />
          <Text style={[styles.actionText, { color: colors.purple }]}>Analytics</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={() => handleViewPrizeHistory(item)}>
          <Ionicons name="time-outline" size={18} color={colors.cyan} />
          <Text style={[styles.actionText, { color: colors.cyan }]}>History</Text>
        </TouchableOpacity>

        {item.status === 'active' && (
          <TouchableOpacity style={styles.actionBtn} onPress={() => handleDistributePrizes(item)}>
            <Ionicons name="gift-outline" size={18} color={colors.success} />
            <Text style={[styles.actionText, { color: colors.success }]}>Prizes</Text>
          </TouchableOpacity>
        )}

        {item.status === 'active' && (
          <TouchableOpacity style={styles.actionBtn} onPress={() => handleStatusChange(item, 'paused')}>
            <Ionicons name="pause-circle-outline" size={18} color={colors.warning} />
            <Text style={[styles.actionText, { color: colors.warning }]}>Pause</Text>
          </TouchableOpacity>
        )}

        {item.status === 'paused' && (
          <TouchableOpacity style={styles.actionBtn} onPress={() => handleStatusChange(item, 'active')}>
            <Ionicons name="play-circle-outline" size={18} color={colors.success} />
            <Text style={[styles.actionText, { color: colors.success }]}>Activate</Text>
          </TouchableOpacity>
        )}

        {item.status !== 'archived' && (
          <TouchableOpacity style={styles.actionBtn} onPress={() => handleStatusChange(item, 'archived')}>
            <Ionicons name="archive-outline" size={18} color={colors.mutedDark} />
            <Text style={[styles.actionText, { color: colors.mutedDark }]}>Archive</Text>
          </TouchableOpacity>
        )}

        {item.status !== 'active' && (
          <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(item)}>
            <Ionicons name="trash-outline" size={18} color={colors.error} />
            <Text style={[styles.actionText, { color: colors.error }]}>Del</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  // ==========================================
  // STATS ROW
  // ==========================================

  const renderStatsRow = () => {
    if (statsLoading) {
      return <ActivityIndicator size="small" color={colors.info} style={{ paddingVertical: 12 }} />;
    }
    if (!stats) return null;

    return (
      <View style={styles.dashboardGrid}>
        <View style={[styles.dashboardCard, { backgroundColor: colors.infoLight }]}>
          <Text style={[styles.dashboardValue, { color: '#1D4ED8' }]}>{stats.activeLeaderboards}</Text>
          <Text style={styles.dashboardLabel}>Active</Text>
        </View>
        <View style={[styles.dashboardCard, { backgroundColor: colors.successLighter }]}>
          <Text style={[styles.dashboardValue, { color: colors.greenDark }]}>{stats.totalPrizesDistributed?.toLocaleString()}</Text>
          <Text style={styles.dashboardLabel}>Prizes Given</Text>
        </View>
        <View style={[styles.dashboardCard, { backgroundColor: colors.warningLight }]}>
          <Text style={[styles.dashboardValue, { color: colors.warningDark }]}>{stats.participationRate}%</Text>
          <Text style={styles.dashboardLabel}>Participation</Text>
        </View>
      </View>
    );
  };

  // ==========================================
  // FORM MODAL
  // ==========================================

  const renderFormModal = () => (
    <Modal visible={showFormModal} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowFormModal(false)}>
            <Ionicons name="close" size={28} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: colors.text }]}>
            {editingConfig ? 'Edit Leaderboard' : 'Create Leaderboard'}
          </Text>
          <TouchableOpacity onPress={handleSave} disabled={isSaving}>
            {isSaving ? (
              <ActivityIndicator size="small" color={colors.info} />
            ) : (
              <Text style={styles.saveBtn}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.formScroll} contentContainerStyle={{ paddingBottom: 40 }}>
          {/* Basic Info */}
          <Text style={styles.formSectionTitle}>Basic Info</Text>

          <Text style={styles.formLabel}>Slug (unique identifier)</Text>
          <TextInput
            style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
            value={formData.slug}
            onChangeText={(v) => setFormData(prev => ({ ...prev, slug: v.toLowerCase().replace(/[^a-z0-9-]/g, '-') }))}
            placeholder="weekly-top-spenders"
            placeholderTextColor={colors.muted}
            editable={!editingConfig}
          />

          <Text style={styles.formLabel}>Title</Text>
          <TextInput
            style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
            value={formData.title}
            onChangeText={(v) => setFormData(prev => ({ ...prev, title: v }))}
            placeholder="Top Spenders This Week"
            placeholderTextColor={colors.muted}
          />

          <Text style={styles.formLabel}>Subtitle</Text>
          <TextInput
            style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
            value={formData.subtitle}
            onChangeText={(v) => setFormData(prev => ({ ...prev, subtitle: v }))}
            placeholder="Compete for weekly prizes!"
            placeholderTextColor={colors.muted}
          />

          <Text style={styles.formLabel}>Leaderboard Type</Text>
          <View style={styles.chipRow}>
            {(Object.entries(LEADERBOARD_TYPE_LABELS) as [LeaderboardType, string][]).map(([key, label]) => (
              <TouchableOpacity
                key={key}
                style={[styles.chip, formData.leaderboardType === key && styles.chipSelected]}
                onPress={() => setFormData(prev => ({ ...prev, leaderboardType: key }))}
              >
                <Text style={[styles.chipText, formData.leaderboardType === key && styles.chipTextSelected]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.formLabel}>Period</Text>
          <View style={styles.chipRow}>
            {(Object.entries(PERIOD_LABELS) as [LeaderboardPeriod, string][]).map(([key, label]) => (
              <TouchableOpacity
                key={key}
                style={[styles.chip, formData.period === key && styles.chipSelected]}
                onPress={() => setFormData(prev => ({ ...prev, period: key }))}
              >
                <Text style={[styles.chipText, formData.period === key && styles.chipTextSelected]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.formLabel}>Status</Text>
          <View style={styles.chipRow}>
            {(['active', 'paused', 'archived'] as LeaderboardStatus[]).map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.chip, formData.status === s && styles.chipSelected]}
                onPress={() => setFormData(prev => ({ ...prev, status: s }))}
              >
                <Text style={[styles.chipText, formData.status === s && styles.chipTextSelected]}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Sources */}
          <Text style={styles.formSectionTitle}>Sources</Text>
          <Text style={styles.formHint}>Select CoinTransaction sources to track. Leave empty for all.</Text>
          <View style={styles.chipRow}>
            {COIN_TRANSACTION_SOURCES.map((src) => {
              const selected = formData.sources.includes(src);
              return (
                <TouchableOpacity
                  key={src}
                  style={[styles.chip, selected && styles.chipSelected]}
                  onPress={() => setFormData(prev => ({
                    ...prev,
                    sources: selected
                      ? prev.sources.filter(s => s !== src)
                      : [...prev.sources, src],
                  }))}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                    {src.replace(/_/g, ' ')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Prize Pool */}
          <Text style={styles.formSectionTitle}>Prize Pool</Text>
          {formData.prizePool.map((prize, index) => (
            <View key={index} style={styles.prizeRow}>
              <View style={styles.prizeRowHeader}>
                <Text style={styles.prizeRowLabel}>Prize Tier {index + 1}</Text>
                <TouchableOpacity onPress={() => removePrizeRow(index)}>
                  <Ionicons name="close-circle" size={20} color={colors.error} />
                </TouchableOpacity>
              </View>
              <View style={styles.formRow}>
                <View style={styles.formRowItem}>
                  <Text style={styles.formLabel}>Rank Start</Text>
                  <TextInput
                    style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
                    value={String(prize.rankStart || '')}
                    onChangeText={(v) => updatePrizeRow(index, 'rankStart', v)}
                    keyboardType="numeric"
                    placeholder="1"
                    placeholderTextColor={colors.muted}
                  />
                </View>
                <View style={styles.formRowItem}>
                  <Text style={styles.formLabel}>Rank End</Text>
                  <TextInput
                    style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
                    value={String(prize.rankEnd || '')}
                    onChangeText={(v) => updatePrizeRow(index, 'rankEnd', v)}
                    keyboardType="numeric"
                    placeholder="1"
                    placeholderTextColor={colors.muted}
                  />
                </View>
              </View>
              <View style={styles.formRow}>
                <View style={styles.formRowItem}>
                  <Text style={styles.formLabel}>Prize Amount</Text>
                  <TextInput
                    style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
                    value={String(prize.prizeAmount || '')}
                    onChangeText={(v) => updatePrizeRow(index, 'prizeAmount', v)}
                    keyboardType="numeric"
                    placeholder="500"
                    placeholderTextColor={colors.muted}
                  />
                </View>
                <View style={styles.formRowItem}>
                  <Text style={styles.formLabel}>Prize Label</Text>
                  <TextInput
                    style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
                    value={prize.prizeLabel}
                    onChangeText={(v) => updatePrizeRow(index, 'prizeLabel', v)}
                    placeholder="Gold Prize"
                    placeholderTextColor={colors.muted}
                  />
                </View>
              </View>
            </View>
          ))}
          <TouchableOpacity style={styles.addPrizeBtn} onPress={addPrizeRow}>
            <Ionicons name="add-circle" size={22} color={colors.info} />
            <Text style={styles.addPrizeBtnText}>Add Prize Tier</Text>
          </TouchableOpacity>

          {/* Eligibility */}
          <Text style={styles.formSectionTitle}>Eligibility</Text>

          <View style={styles.formRow}>
            <View style={styles.formRowItem}>
              <Text style={styles.formLabel}>Min Account Age (days)</Text>
              <TextInput
                style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
                value={String(formData.eligibility.minAccountAgeDays || '')}
                onChangeText={(v) => setFormData(prev => ({
                  ...prev,
                  eligibility: { ...prev.eligibility, minAccountAgeDays: Number(v) || 0 },
                }))}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={colors.muted}
              />
            </View>
            <View style={styles.formRowItem}>
              <Text style={styles.formLabel}>Min Activity Threshold</Text>
              <TextInput
                style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
                value={String(formData.eligibility.minActivityThreshold || '')}
                onChangeText={(v) => setFormData(prev => ({
                  ...prev,
                  eligibility: { ...prev.eligibility, minActivityThreshold: Number(v) || 0 },
                }))}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={colors.muted}
              />
            </View>
          </View>

          <Text style={styles.formLabel}>Required Verification</Text>
          <View style={styles.chipRow}>
            {VERIFICATION_OPTIONS.map(({ key, label }) => (
              <TouchableOpacity
                key={key}
                style={[styles.chip, formData.eligibility.requiredVerification === key && styles.chipSelected]}
                onPress={() => setFormData(prev => ({
                  ...prev,
                  eligibility: { ...prev.eligibility, requiredVerification: key },
                }))}
              >
                <Text style={[styles.chipText, formData.eligibility.requiredVerification === key && styles.chipTextSelected]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.formLabel}>Excluded User IDs (comma-separated)</Text>
          <TextInput
            style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
            value={excludedIdsInput}
            onChangeText={setExcludedIdsInput}
            placeholder="userId1, userId2"
            placeholderTextColor={colors.muted}
          />

          {/* Anti-Fraud */}
          <Text style={styles.formSectionTitle}>Anti-Fraud</Text>

          <View style={styles.formRow}>
            <View style={styles.formRowItem}>
              <Text style={styles.formLabel}>Max Rank Jump/Cycle</Text>
              <TextInput
                style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
                value={String(formData.antiFraud.maxRankJumpPerCycle || '')}
                onChangeText={(v) => setFormData(prev => ({
                  ...prev,
                  antiFraud: { ...prev.antiFraud, maxRankJumpPerCycle: Number(v) || 0 },
                }))}
                keyboardType="numeric"
                placeholder="50"
                placeholderTextColor={colors.muted}
              />
            </View>
            <View style={styles.formRowItem}>
              <Text style={styles.formLabel}>Min Different Days</Text>
              <TextInput
                style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
                value={String(formData.antiFraud.minDifferentDays || '')}
                onChangeText={(v) => setFormData(prev => ({
                  ...prev,
                  antiFraud: { ...prev.antiFraud, minDifferentDays: Number(v) || 0 },
                }))}
                keyboardType="numeric"
                placeholder="3"
                placeholderTextColor={colors.muted}
              />
            </View>
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.formLabel}>Flag Duplicate Devices</Text>
            <Switch
              value={formData.antiFraud.flagDuplicateDevices}
              onValueChange={(v) => setFormData(prev => ({
                ...prev,
                antiFraud: { ...prev.antiFraud, flagDuplicateDevices: v },
              }))}
            />
          </View>

          {/* Display */}
          <Text style={styles.formSectionTitle}>Display</Text>

          <View style={styles.formRow}>
            <View style={styles.formRowItem}>
              <Text style={styles.formLabel}>Icon (Ionicons name)</Text>
              <TextInput
                style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
                value={formData.display.icon}
                onChangeText={(v) => setFormData(prev => ({
                  ...prev,
                  display: { ...prev.display, icon: v },
                }))}
                placeholder="trophy"
                placeholderTextColor={colors.muted}
              />
            </View>
            <View style={styles.formRowItem}>
              <Text style={styles.formLabel}>Background Color</Text>
              <TextInput
                style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
                value={formData.display.backgroundColor}
                onChangeText={(v) => setFormData(prev => ({
                  ...prev,
                  display: { ...prev.display, backgroundColor: v },
                }))}
                placeholder={colors.warningLight}
                placeholderTextColor={colors.muted}
              />
              {formData.display.backgroundColor ? (
                <View style={[styles.colorPreview, { backgroundColor: formData.display.backgroundColor }]} />
              ) : null}
            </View>
          </View>

          <View style={styles.formRow}>
            <View style={styles.formRowItem}>
              <Text style={styles.formLabel}>Priority (0-100)</Text>
              <TextInput
                style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
                value={String(formData.display.priority || '')}
                onChangeText={(v) => setFormData(prev => ({
                  ...prev,
                  display: { ...prev.display, priority: Number(v) || 0 },
                }))}
                keyboardType="numeric"
                placeholder="50"
                placeholderTextColor={colors.muted}
              />
            </View>
            <View style={styles.formRowItem}>
              <Text style={styles.formLabel}>Top N (10-1000)</Text>
              <TextInput
                style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
                value={String(formData.topN || '')}
                onChangeText={(v) => {
                  const val = Math.max(10, Math.min(1000, Number(v) || 10));
                  setFormData(prev => ({ ...prev, topN: val }));
                }}
                keyboardType="numeric"
                placeholder="100"
                placeholderTextColor={colors.muted}
              />
            </View>
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.formLabel}>Featured</Text>
            <Switch
              value={formData.display.featured}
              onValueChange={(v) => setFormData(prev => ({
                ...prev,
                display: { ...prev.display, featured: v },
              }))}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  // ==========================================
  // ANALYTICS MODAL
  // ==========================================

  const renderAnalyticsModal = () => (
    <Modal visible={!!selectedAnalyticsId} animationType="slide" transparent>
      <View style={styles.analyticsOverlay}>
        <View style={[styles.analyticsContainer, { backgroundColor: colors.card }]}>
          <View style={styles.analyticsHeader}>
            <Text style={[styles.analyticsTitle, { color: colors.text }]}>Leaderboard Analytics</Text>
            <TouchableOpacity onPress={() => { setSelectedAnalyticsId(null); setAnalytics(null); }}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {analyticsLoading ? (
            <ActivityIndicator size="large" color={colors.info} style={{ paddingVertical: 40 }} />
          ) : analytics ? (
            <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
              <View style={styles.analyticsGrid}>
                <View style={styles.analyticsCard}>
                  <Text style={styles.analyticsCardValue}>{analytics.totalParticipants}</Text>
                  <Text style={styles.analyticsCardLabel}>Total Participants</Text>
                </View>
                <View style={styles.analyticsCard}>
                  <Text style={styles.analyticsCardValue}>{analytics.activeParticipants}</Text>
                  <Text style={styles.analyticsCardLabel}>Active Now</Text>
                </View>
                <View style={styles.analyticsCard}>
                  <Text style={styles.analyticsCardValue}>{analytics.totalPrizesAwarded?.toLocaleString()}</Text>
                  <Text style={styles.analyticsCardLabel}>Prizes Awarded</Text>
                </View>
                <View style={styles.analyticsCard}>
                  <Text style={styles.analyticsCardValue}>{analytics.avgScore?.toLocaleString()}</Text>
                  <Text style={styles.analyticsCardLabel}>Avg Score</Text>
                </View>
                <View style={styles.analyticsCard}>
                  <Text style={styles.analyticsCardValue}>{analytics.cyclesCompleted}</Text>
                  <Text style={styles.analyticsCardLabel}>Cycles Done</Text>
                </View>
                <View style={styles.analyticsCard}>
                  <Text style={[styles.analyticsCardValue, { fontSize: 14 }]} numberOfLines={1}>{analytics.topScorer || 'N/A'}</Text>
                  <Text style={styles.analyticsCardLabel}>Top Scorer</Text>
                </View>
              </View>
            </ScrollView>
          ) : null}
        </View>
      </View>
    </Modal>
  );

  // ==========================================
  // PRIZE HISTORY MODAL
  // ==========================================

  const renderPrizeHistoryModal = () => (
    <Modal visible={showPrizeHistory} animationType="slide" transparent>
      <View style={styles.analyticsOverlay}>
        <View style={[styles.analyticsContainer, { backgroundColor: colors.card, maxHeight: '80%' }]}>
          <View style={styles.analyticsHeader}>
            <Text style={[styles.analyticsTitle, { color: colors.text }]}>Prize History</Text>
            <TouchableOpacity onPress={() => { setShowPrizeHistory(false); setPrizeHistoryConfigId(null); }}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {prizeHistoryLoading ? (
            <ActivityIndicator size="large" color={colors.info} style={{ paddingVertical: 40 }} />
          ) : prizeHistory.length > 0 ? (
            <ScrollView>
              {prizeHistory.map((entry) => (
                <View key={entry._id} style={[styles.prizeHistoryRow, { borderColor: colors.border }]}>
                  <View style={styles.prizeHistoryInfo}>
                    <Text style={[styles.prizeHistoryUser, { color: colors.text }]} numberOfLines={1}>
                      {entry.userName || entry.userId}
                    </Text>
                    <Text style={styles.prizeHistoryMeta}>
                      Rank #{entry.rank} - {entry.prizeLabel}
                    </Text>
                    <Text style={styles.prizeHistoryDate}>
                      {entry.cycle} - {new Date(entry.distributedAt).toLocaleDateString()}
                    </Text>
                  </View>
                  <Text style={styles.prizeHistoryAmount}>{entry.prizeAmount} coins</Text>
                </View>
              ))}

              {prizeHistoryTotalPages > 1 && (
                <View style={styles.pagination}>
                  <TouchableOpacity
                    style={[styles.pageBtn, prizeHistoryPage <= 1 && styles.pageBtnDisabled]}
                    onPress={() => prizeHistoryPage > 1 && prizeHistoryConfigId && loadPrizeHistory(prizeHistoryConfigId, prizeHistoryPage - 1)}
                    disabled={prizeHistoryPage <= 1}
                  >
                    <Text style={styles.pageBtnText}>Previous</Text>
                  </TouchableOpacity>
                  <Text style={styles.pageInfo}>Page {prizeHistoryPage} of {prizeHistoryTotalPages}</Text>
                  <TouchableOpacity
                    style={[styles.pageBtn, prizeHistoryPage >= prizeHistoryTotalPages && styles.pageBtnDisabled]}
                    onPress={() => prizeHistoryPage < prizeHistoryTotalPages && prizeHistoryConfigId && loadPrizeHistory(prizeHistoryConfigId, prizeHistoryPage + 1)}
                    disabled={prizeHistoryPage >= prizeHistoryTotalPages}
                  >
                    <Text style={styles.pageBtnText}>Next</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="time-outline" size={48} color={colors.gray300} />
              <Text style={styles.emptyText}>No prize history found</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );

  // ==========================================
  // MAIN RENDER
  // ==========================================

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Leaderboard Config</Text>
        <TouchableOpacity style={styles.createBtn} onPress={handleCreate}>
          <Ionicons name="add" size={20} color={colors.card} />
          <Text style={styles.createBtnText}>Create</Text>
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <View style={[styles.filtersBar, { backgroundColor: colors.card }]}>
        <TextInput
          style={[styles.searchInput, { color: colors.text, borderColor: colors.border }]}
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={() => loadConfigs(1)}
          placeholder="Search leaderboards..."
          placeholderTextColor={colors.muted}
          returnKeyType="search"
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChips}>
          {(['all', 'active', 'paused', 'archived'] as StatusFilter[]).map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.filterChip, statusFilter === s && styles.filterChipActive]}
              onPress={() => setStatusFilter(s)}
            >
              <Text style={[styles.filterChipText, statusFilter === s && styles.filterChipTextActive]}>
                {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Content */}
      <FlatList
        data={configs}
        renderItem={renderConfigCard}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={renderStatsRow}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator size="large" color={colors.info} style={{ paddingVertical: 40 }} />
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="trophy-outline" size={48} color={colors.gray300} />
              <Text style={styles.emptyText}>No leaderboard configs found</Text>
            </View>
          )
        }
        ListFooterComponent={
          totalPages > 1 ? (
            <View style={styles.pagination}>
              <TouchableOpacity
                style={[styles.pageBtn, page <= 1 && styles.pageBtnDisabled]}
                onPress={() => page > 1 && loadConfigs(page - 1)}
                disabled={page <= 1}
              >
                <Text style={styles.pageBtnText}>Previous</Text>
              </TouchableOpacity>
              <Text style={styles.pageInfo}>Page {page} of {totalPages}</Text>
              <TouchableOpacity
                style={[styles.pageBtn, page >= totalPages && styles.pageBtnDisabled]}
                onPress={() => page < totalPages && loadConfigs(page + 1)}
                disabled={page >= totalPages}
              >
                <Text style={styles.pageBtnText}>Next</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
      />

      {/* Modals */}
      {renderFormModal()}
      {renderAnalyticsModal()}
      {renderPrizeHistoryModal()}
    </View>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 22, fontWeight: '700' },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.info,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  createBtnText: { color: Colors.light.card, fontWeight: '600', fontSize: 14 },

  // Filters
  filtersBar: { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.light.gray200 },
  searchInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    marginBottom: 8,
  },
  filterChips: { flexDirection: 'row' },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.light.backgroundSecondary,
    marginRight: 8,
  },
  filterChipActive: { backgroundColor: Colors.light.info },
  filterChipText: { fontSize: 12, color: Colors.light.mutedDark, fontWeight: '500' },
  filterChipTextActive: { color: Colors.light.card, fontWeight: '600' },

  // Dashboard Stats
  dashboardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  dashboardCard: { flex: 1, minWidth: '30%', borderRadius: 12, padding: 14, alignItems: 'center' },
  dashboardValue: { fontSize: 22, fontWeight: '700' },
  dashboardLabel: { fontSize: 11, color: Colors.light.mutedDark, marginTop: 4, fontWeight: '500' },

  // Config Card
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.light.gray200,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 },
  iconCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '600' },
  cardSlug: { fontSize: 11, color: Colors.light.muted, marginTop: 1 },
  cardInfoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  infoChip: { backgroundColor: Colors.light.backgroundSecondary, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  infoChipText: { fontSize: 11, fontWeight: '500', color: Colors.light.gray700 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  statsText: { fontSize: 11, color: Colors.light.muted },
  cardActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, borderTopWidth: 1, borderTopColor: Colors.light.backgroundSecondary, paddingTop: 10 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingVertical: 4, paddingHorizontal: 6 },
  actionText: { fontSize: 12, fontWeight: '500' },

  // Status Badge
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, gap: 4 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: '600' },

  // Form Modal
  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.gray200,
  },
  modalTitle: { fontSize: 17, fontWeight: '600' },
  saveBtn: { fontSize: 16, fontWeight: '600', color: Colors.light.info },
  formScroll: { paddingHorizontal: 20 },
  formSectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.light.navy, marginTop: 20, marginBottom: 10, borderBottomWidth: 1, borderBottomColor: Colors.light.backgroundSecondary, paddingBottom: 6 },
  formLabel: { fontSize: 13, fontWeight: '500', color: Colors.light.mutedDark, marginTop: 10, marginBottom: 4 },
  formHint: { fontSize: 12, color: Colors.light.muted, fontStyle: 'italic', marginBottom: 4 },
  formInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  formRow: { flexDirection: 'row', gap: 12 },
  formRowItem: { flex: 1 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: Colors.light.backgroundSecondary },
  chipSelected: { backgroundColor: Colors.light.info },
  chipText: { fontSize: 12, color: Colors.light.mutedDark, fontWeight: '500' },
  chipTextSelected: { color: Colors.light.card, fontWeight: '600' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },

  // Prize Pool rows
  prizeRow: {
    backgroundColor: Colors.light.backgroundTertiary,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.light.gray200,
  },
  prizeRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  prizeRowLabel: { fontSize: 13, fontWeight: '600', color: Colors.light.gray700 },
  addPrizeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  addPrizeBtnText: { fontSize: 14, fontWeight: '600', color: Colors.light.info },

  // Color preview
  colorPreview: {
    width: '100%',
    height: 24,
    borderRadius: 6,
    marginTop: 4,
    borderWidth: 1,
    borderColor: Colors.light.gray200,
  },

  // Analytics Modal
  analyticsOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  analyticsContainer: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '70%' },
  analyticsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  analyticsTitle: { fontSize: 18, fontWeight: '700' },
  analyticsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  analyticsCard: { width: '47%', backgroundColor: Colors.light.backgroundTertiary, borderRadius: 10, padding: 14, alignItems: 'center' },
  analyticsCardValue: { fontSize: 22, fontWeight: '700', color: Colors.light.navy },
  analyticsCardLabel: { fontSize: 11, color: Colors.light.mutedDark, marginTop: 4, fontWeight: '500' },

  // Prize History
  prizeHistoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
  },
  prizeHistoryInfo: { flex: 1, gap: 2 },
  prizeHistoryUser: { fontSize: 14, fontWeight: '600' },
  prizeHistoryMeta: { fontSize: 12, color: Colors.light.mutedDark },
  prizeHistoryDate: { fontSize: 11, color: Colors.light.muted },
  prizeHistoryAmount: { fontSize: 14, fontWeight: '700', color: Colors.light.success, marginLeft: 8 },

  // Empty & Pagination
  emptyContainer: { paddingVertical: 40, alignItems: 'center' },
  emptyText: { fontSize: 14, color: Colors.light.muted, marginTop: 10 },
  pagination: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16 },
  pageBtn: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: Colors.light.info, borderRadius: 8 },
  pageBtnDisabled: { opacity: 0.4 },
  pageBtnText: { color: Colors.light.card, fontWeight: '500', fontSize: 13 },
  pageInfo: { fontSize: 13, color: Colors.light.mutedDark },
});
