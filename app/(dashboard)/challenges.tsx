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
import { challengesService, AdminChallenge, ChallengeTemplate } from '../../services/api/challenges';
import { Colors } from '../../constants/Colors';
import { format } from 'date-fns';
import { showAlert, showConfirm } from '../../utils/alert';

type StatusType = 'active' | 'inactive' | 'expired';

const TYPE_COLORS: Record<string, string> = {
  daily: '#3B82F6',
  weekly: '#8B5CF6',
  monthly: '#F59E0B',
  special: '#EF4444',
};

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: '#10B981',
  medium: '#F59E0B',
  hard: '#EF4444',
};

const STATUS_COLORS: Record<StatusType, string> = {
  active: '#10B981',
  inactive: '#94A3B8',
  expired: '#EF4444',
};

const STATUS_ICONS: Record<StatusType, string> = {
  active: 'radio-button-on',
  inactive: 'pause-circle',
  expired: 'close-circle',
};

const CHALLENGE_TYPES = ['daily', 'weekly', 'monthly', 'special'] as const;
const DIFFICULTY_LEVELS = ['easy', 'medium', 'hard'] as const;
const ACTION_OPTIONS = [
  'visit_stores',
  'upload_bills',
  'refer_friends',
  'spend_amount',
  'order_count',
  'review_count',
  'login_streak',
  'share_deals',
  'explore_categories',
  'add_favorites',
] as const;

function getStatus(item: AdminChallenge): StatusType {
  const now = new Date();
  const end = new Date(item.endDate);
  if (!item.active) return 'inactive';
  if (now > end) return 'expired';
  return 'active';
}

function formatDate(dateString: string): string {
  try {
    return format(new Date(dateString), 'MMM dd, yyyy HH:mm');
  } catch {
    return dateString;
  }
}

function formatDateShort(dateString: string): string {
  try {
    return format(new Date(dateString), 'MMM dd, HH:mm');
  } catch {
    return dateString;
  }
}

function formatActionName(action: string): string {
  return action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

interface ChallengeFormData {
  type: 'daily' | 'weekly' | 'monthly' | 'special';
  title: string;
  description: string;
  icon: string;
  action: string;
  target: number;
  coins: number;
  difficulty: 'easy' | 'medium' | 'hard';
  startDate: string;
  endDate: string;
  featured: boolean;
  active: boolean;
  maxParticipants?: number;
}

const DEFAULT_FORM: ChallengeFormData = {
  type: 'daily',
  title: '',
  description: '',
  icon: '',
  action: 'visit_stores',
  target: 1,
  coins: 50,
  difficulty: 'easy',
  startDate: new Date().toISOString(),
  endDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  featured: false,
  active: true,
  maxParticipants: undefined,
};

export default function ChallengesScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  // Data state
  const [challenges, setChallenges] = useState<AdminChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Stats
  const [stats, setStats] = useState<any>(null);

  // Filters
  const [filterType, setFilterType] = useState<string>('all');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Form modal
  const [showFormModal, setShowFormModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingChallenge, setEditingChallenge] = useState<AdminChallenge | null>(null);
  const [form, setForm] = useState<ChallengeFormData>({ ...DEFAULT_FORM });

  // Template modal
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templates, setTemplates] = useState<ChallengeTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);

  // ==========================================
  // Data Loading
  // ==========================================

  const loadChallenges = useCallback(async (pageNum: number = 1, append: boolean = false) => {
    try {
      if (!append) setLoading(true);

      const params: any = { page: pageNum, limit: 20 };
      if (filterType !== 'all') params.type = filterType;
      if (filterDifficulty !== 'all') params.difficulty = filterDifficulty;
      if (filterStatus !== 'all') params.status = filterStatus;

      const response = await challengesService.list(params);

      if (response.success && response.data) {
        const data = response.data as any;
        if (append) {
          setChallenges(prev => [...prev, ...data.challenges]);
        } else {
          setChallenges(data.challenges);
        }
        setHasMore(data.pagination.hasNext);
        setPage(pageNum);
      } else {
        if (!append) setChallenges([]);
        showAlert('Error', response.message || 'Failed to load challenges');
      }
    } catch (error: any) {
      console.error('Failed to load challenges:', error);
      showAlert('Error', error.message || 'Failed to load challenges');
    } finally {
      setLoading(false);
    }
  }, [filterType, filterDifficulty, filterStatus]);

  const loadStats = useCallback(async () => {
    try {
      const response = await challengesService.getStats();
      if (response.success && response.data) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Failed to load challenge stats:', error);
    }
  }, []);

  useEffect(() => {
    loadChallenges(1);
    loadStats();
  }, [filterType, filterDifficulty, filterStatus]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadChallenges(1), loadStats()]);
    setRefreshing(false);
  }, [loadChallenges, loadStats]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      loadChallenges(page + 1, true);
    }
  }, [loading, hasMore, page, loadChallenges]);

  // ==========================================
  // Handlers
  // ==========================================

  const handleCreateNew = useCallback(() => {
    setEditingChallenge(null);
    setForm({ ...DEFAULT_FORM });
    setShowFormModal(true);
  }, []);

  const handleEdit = useCallback((challenge: AdminChallenge) => {
    setEditingChallenge(challenge);
    setForm({
      type: challenge.type,
      title: challenge.title,
      description: challenge.description,
      icon: challenge.icon,
      action: challenge.requirements.action,
      target: challenge.requirements.target,
      coins: challenge.rewards.coins,
      difficulty: challenge.difficulty,
      startDate: challenge.startDate,
      endDate: challenge.endDate,
      featured: challenge.featured,
      active: challenge.active,
      maxParticipants: challenge.maxParticipants,
    });
    setShowFormModal(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!form.title.trim()) {
      showAlert('Error', 'Please enter a title');
      return;
    }
    if (!form.description.trim()) {
      showAlert('Error', 'Please enter a description');
      return;
    }
    if (!form.icon.trim()) {
      showAlert('Error', 'Please enter an icon');
      return;
    }
    if (!form.target || form.target < 1) {
      showAlert('Error', 'Target must be at least 1');
      return;
    }
    if (form.coins < 0) {
      showAlert('Error', 'Coins must be 0 or more');
      return;
    }
    if (!form.startDate || !form.endDate) {
      showAlert('Error', 'Please set both start and end dates');
      return;
    }
    const startDate = new Date(form.startDate);
    const endDate = new Date(form.endDate);
    if (endDate <= startDate) {
      showAlert('Error', 'End date must be after start date');
      return;
    }

    setIsSaving(true);
    try {
      const payload: any = {
        type: form.type,
        title: form.title.trim(),
        description: form.description.trim(),
        icon: form.icon.trim(),
        requirements: {
          action: form.action,
          target: form.target,
        },
        rewards: {
          coins: form.coins,
        },
        difficulty: form.difficulty,
        startDate: form.startDate,
        endDate: form.endDate,
        featured: form.featured,
        active: form.active,
      };

      if (form.maxParticipants && form.maxParticipants > 0) {
        payload.maxParticipants = form.maxParticipants;
      }

      if (editingChallenge) {
        const response = await challengesService.update(editingChallenge._id, payload);
        if (response.success) {
          showAlert('Success', 'Challenge updated successfully');
        } else {
          showAlert('Error', response.message || 'Failed to update challenge');
          setIsSaving(false);
          return;
        }
      } else {
        const response = await challengesService.create(payload);
        if (response.success) {
          showAlert('Success', 'Challenge created successfully');
        } else {
          showAlert('Error', response.message || 'Failed to create challenge');
          setIsSaving(false);
          return;
        }
      }

      setShowFormModal(false);
      await Promise.all([loadChallenges(1), loadStats()]);
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to save challenge');
    } finally {
      setIsSaving(false);
    }
  }, [form, editingChallenge, loadChallenges, loadStats]);

  const handleToggle = useCallback(async (challenge: AdminChallenge) => {
    // Optimistic update
    const prevChallenges = [...challenges];
    setChallenges(prev =>
      prev.map(c => c._id === challenge._id ? { ...c, active: !c.active } : c)
    );
    try {
      const response = await challengesService.toggle(challenge._id);
      if (!response.success) {
        setChallenges(prevChallenges);
        showAlert('Error', response.message || 'Failed to toggle challenge');
      }
    } catch (error: any) {
      setChallenges(prevChallenges);
      showAlert('Error', error.message || 'Failed to toggle challenge');
    }
  }, [challenges]);

  const handleToggleFeatured = useCallback(async (challenge: AdminChallenge) => {
    // Optimistic update
    const prevChallenges = [...challenges];
    setChallenges(prev =>
      prev.map(c => c._id === challenge._id ? { ...c, featured: !c.featured } : c)
    );
    try {
      const response = await challengesService.toggleFeatured(challenge._id);
      if (!response.success) {
        setChallenges(prevChallenges);
        showAlert('Error', response.message || 'Failed to toggle featured');
      }
    } catch (error: any) {
      setChallenges(prevChallenges);
      showAlert('Error', error.message || 'Failed to toggle featured');
    }
  }, [challenges]);

  const handleDelete = useCallback((challenge: AdminChallenge) => {
    showConfirm(
      'Delete Challenge',
      `Are you sure you want to delete "${challenge.title}"?`,
      async () => {
        try {
          const response = await challengesService.delete(challenge._id);
          if (response.success) {
            showAlert('Success', 'Challenge deleted');
            await Promise.all([loadChallenges(1), loadStats()]);
          } else {
            showAlert('Error', response.message || 'Failed to delete challenge');
          }
        } catch (error: any) {
          showAlert('Error', error.message || 'Failed to delete challenge');
        }
      },
      'Delete'
    );
  }, [loadChallenges, loadStats]);

  // ==========================================
  // Template Handlers
  // ==========================================

  const handleOpenTemplates = useCallback(async () => {
    setShowTemplateModal(true);
    setTemplatesLoading(true);
    try {
      const response = await challengesService.getTemplates();
      if (response.success && response.data) {
        setTemplates(response.data as ChallengeTemplate[]);
      }
    } catch (error) {
      console.error('Failed to load templates:', error);
      showAlert('Error', 'Failed to load templates');
    } finally {
      setTemplatesLoading(false);
    }
  }, []);

  const handleCreateFromTemplate = useCallback(async (index: number) => {
    try {
      const response = await challengesService.createFromTemplate(index);
      if (response.success) {
        showAlert('Success', 'Challenge created from template');
        setShowTemplateModal(false);
        await Promise.all([loadChallenges(1), loadStats()]);
      } else {
        showAlert('Error', response.message || 'Failed to create from template');
      }
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to create from template');
    }
  }, [loadChallenges, loadStats]);

  // ==========================================
  // Render Helpers
  // ==========================================

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Challenge Management</Text>
        <Text style={[styles.headerSubtitle, { color: colors.icon }]}>
          Manage Play & Earn challenges
        </Text>
      </View>
    </View>
  );

  const renderStatsRow = () => (
    <View style={styles.statsRow}>
      {[
        { label: 'Total', value: stats?.total ?? 0, color: colors.text },
        { label: 'Active', value: stats?.active ?? 0, color: '#10B981' },
        { label: 'Completion', value: `${stats?.avgCompletionRate ?? 0}%`, color: '#3B82F6' },
      ].map((item, index) => (
        <View key={index} style={[styles.statItem, { backgroundColor: colors.card }]}>
          <Text style={[styles.statValue, { color: item.color }]}>{item.value}</Text>
          <Text style={[styles.statLabel, { color: colors.icon }]}>{item.label}</Text>
        </View>
      ))}
    </View>
  );

  const renderFilters = () => (
    <View style={styles.filtersContainer}>
      {/* Type Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {['all', ...CHALLENGE_TYPES].map(type => {
          const isActive = filterType === type;
          const typeColor = type === 'all' ? colors.tint : TYPE_COLORS[type] || colors.tint;
          return (
            <TouchableOpacity
              key={type}
              style={[
                styles.filterChip,
                {
                  backgroundColor: isActive ? `${typeColor}20` : colors.card,
                  borderColor: isActive ? typeColor : colors.border,
                },
              ]}
              onPress={() => setFilterType(type)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  { color: isActive ? typeColor : colors.icon },
                ]}
              >
                {type === 'all' ? 'All Types' : type.charAt(0).toUpperCase() + type.slice(1)}
              </Text>
            </TouchableOpacity>
          );
        })}

        <View style={styles.filterDivider} />

        {/* Difficulty Filter */}
        {['all', ...DIFFICULTY_LEVELS].map(diff => {
          const isActive = filterDifficulty === diff;
          const diffColor = diff === 'all' ? colors.tint : DIFFICULTY_COLORS[diff] || colors.tint;
          return (
            <TouchableOpacity
              key={`diff-${diff}`}
              style={[
                styles.filterChip,
                {
                  backgroundColor: isActive ? `${diffColor}20` : colors.card,
                  borderColor: isActive ? diffColor : colors.border,
                },
              ]}
              onPress={() => setFilterDifficulty(diff)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  { color: isActive ? diffColor : colors.icon },
                ]}
              >
                {diff === 'all' ? 'All Diff.' : diff.charAt(0).toUpperCase() + diff.slice(1)}
              </Text>
            </TouchableOpacity>
          );
        })}

        <View style={styles.filterDivider} />

        {/* Status Filter */}
        {['all', 'active', 'inactive', 'expired'].map(status => {
          const isActive = filterStatus === status;
          const statusColor = status === 'all' ? colors.tint : STATUS_COLORS[status as StatusType] || colors.tint;
          return (
            <TouchableOpacity
              key={`status-${status}`}
              style={[
                styles.filterChip,
                {
                  backgroundColor: isActive ? `${statusColor}20` : colors.card,
                  borderColor: isActive ? statusColor : colors.border,
                },
              ]}
              onPress={() => setFilterStatus(status)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  { color: isActive ? statusColor : colors.icon },
                ]}
              >
                {status === 'all' ? 'All Status' : status.charAt(0).toUpperCase() + status.slice(1)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  const renderButtonRow = () => (
    <View style={styles.buttonRow}>
      <TouchableOpacity
        style={[styles.createBtn, { backgroundColor: colors.tint }]}
        onPress={handleCreateNew}
      >
        <Ionicons name="add" size={18} color="#FFF" />
        <Text style={styles.createBtnText}>Create Challenge</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.templateBtn, { backgroundColor: '#8B5CF6' }]}
        onPress={handleOpenTemplates}
      >
        <Ionicons name="copy" size={18} color="#FFF" />
        <Text style={styles.createBtnText}>From Template</Text>
      </TouchableOpacity>
    </View>
  );

  const renderStatusBadge = (status: StatusType) => (
    <View style={[styles.statusChip, { backgroundColor: `${STATUS_COLORS[status]}15` }]}>
      <Ionicons name={STATUS_ICONS[status] as any} size={12} color={STATUS_COLORS[status]} />
      <Text style={[styles.statusLabel, { color: STATUS_COLORS[status] }]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Text>
    </View>
  );

  const renderTypeBadge = (type: string) => {
    const color = TYPE_COLORS[type] || '#6B7280';
    return (
      <View style={[styles.typeBadge, { backgroundColor: `${color}15` }]}>
        <Text style={[styles.typeBadgeText, { color }]}>
          {type.charAt(0).toUpperCase() + type.slice(1)}
        </Text>
      </View>
    );
  };

  const renderDifficultyBadge = (difficulty: string) => {
    const color = DIFFICULTY_COLORS[difficulty] || '#6B7280';
    return (
      <View style={[styles.difficultyBadge, { backgroundColor: `${color}15` }]}>
        <Text style={[styles.difficultyBadgeText, { color }]}>
          {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
        </Text>
      </View>
    );
  };

  // ==========================================
  // Challenge Card
  // ==========================================

  const renderChallengeItem = useCallback(({ item }: { item: AdminChallenge }) => {
    const status = getStatus(item);
    const completionRate = item.participantCount > 0
      ? ((item.completionCount / item.participantCount) * 100).toFixed(1)
      : '0';

    return (
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        {/* Card Header */}
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <Text style={styles.cardIcon}>{item.icon}</Text>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={[styles.cardDescription, { color: colors.icon }]} numberOfLines={1}>
                {item.description}
              </Text>
            </View>
          </View>
          {renderStatusBadge(status)}
        </View>

        {/* Badges Row */}
        <View style={styles.badgesRow}>
          {renderTypeBadge(item.type)}
          {renderDifficultyBadge(item.difficulty)}
          {item.featured && (
            <View style={[styles.featuredBadge, { backgroundColor: '#F59E0B15' }]}>
              <Ionicons name="star" size={11} color="#F59E0B" />
              <Text style={[styles.featuredBadgeText, { color: '#F59E0B' }]}>Featured</Text>
            </View>
          )}
        </View>

        {/* Info Row */}
        <View style={styles.metaRow}>
          <View style={styles.metaChip}>
            <Ionicons name="flash-outline" size={13} color={colors.icon} />
            <Text style={[styles.metaText, { color: colors.icon }]}>
              {formatActionName(item.requirements.action)} x{item.requirements.target}
            </Text>
          </View>
          <View style={styles.metaChip}>
            <Ionicons name="logo-bitcoin" size={13} color="#F59E0B" />
            <Text style={[styles.metaText, { color: '#F59E0B', fontWeight: '700' }]}>
              {item.rewards.coins} coins
            </Text>
          </View>
        </View>

        {/* Participants & Completion */}
        <View style={styles.metaRow}>
          <View style={styles.metaChip}>
            <Ionicons name="people-outline" size={13} color={colors.icon} />
            <Text style={[styles.metaText, { color: colors.icon }]}>
              {item.participantCount} participants
            </Text>
          </View>
          <View style={styles.metaChip}>
            <Ionicons name="checkmark-circle-outline" size={13} color={colors.icon} />
            <Text style={[styles.metaText, { color: colors.icon }]}>
              {item.completionCount} completed ({completionRate}%)
            </Text>
          </View>
        </View>

        {/* Date Row */}
        <View style={[styles.dateRow, { borderTopColor: colors.border }]}>
          <View style={styles.dateInfo}>
            <Ionicons name="calendar-outline" size={12} color={colors.icon} />
            <Text style={[styles.dateText, { color: colors.icon }]}>
              {formatDateShort(item.startDate)} - {formatDateShort(item.endDate)}
            </Text>
          </View>
          {item.maxParticipants && (
            <Text style={[styles.maxParticipantsBadge, { backgroundColor: colors.background, color: colors.icon }]}>
              Max {item.maxParticipants}
            </Text>
          )}
        </View>

        {/* Action Row */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionIconBtn, { backgroundColor: '#3B82F610' }]}
            onPress={() => handleEdit(item)}
          >
            <Ionicons name="pencil" size={16} color="#3B82F6" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.actionIconBtn,
              { backgroundColor: item.active ? '#F59E0B10' : '#10B98110' },
            ]}
            onPress={() => handleToggle(item)}
          >
            <Ionicons
              name={item.active ? 'pause' : 'play'}
              size={16}
              color={item.active ? '#F59E0B' : '#10B981'}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.actionIconBtn,
              { backgroundColor: item.featured ? '#F59E0B15' : `${colors.border}50` },
            ]}
            onPress={() => handleToggleFeatured(item)}
          >
            <Ionicons
              name={item.featured ? 'star' : 'star-outline'}
              size={16}
              color={item.featured ? '#F59E0B' : colors.icon}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionIconBtn, { backgroundColor: '#EF444410' }]}
            onPress={() => handleDelete(item)}
          >
            <Ionicons name="trash" size={16} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }, [colors, handleEdit, handleToggle, handleToggleFeatured, handleDelete]);

  // ==========================================
  // Dropdown Select Helper
  // ==========================================

  const renderSelectOptions = (
    label: string,
    options: readonly string[],
    selectedValue: string,
    onSelect: (value: string) => void,
    colorMap?: Record<string, string>
  ) => (
    <View style={styles.formGroup}>
      <Text style={[styles.formLabel, { color: colors.text }]}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.selectRow}>
          {options.map(option => {
            const isSelected = selectedValue === option;
            const optColor = colorMap?.[option] || colors.tint;
            return (
              <TouchableOpacity
                key={option}
                style={[
                  styles.selectChip,
                  {
                    backgroundColor: isSelected ? `${optColor}20` : colors.background,
                    borderColor: isSelected ? optColor : colors.border,
                  },
                ]}
                onPress={() => onSelect(option)}
              >
                <Text
                  style={[
                    styles.selectChipText,
                    { color: isSelected ? optColor : colors.icon },
                  ]}
                >
                  {option.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );

  // ==========================================
  // Form Modal
  // ==========================================

  const renderFormModal = () => {
    const isEditing = !!editingChallenge;
    const modalTitle = isEditing ? 'Edit Challenge' : 'New Challenge';

    return (
      <Modal visible={showFormModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity
              onPress={() => setShowFormModal(false)}
              style={styles.modalCloseBtn}
            >
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{modalTitle}</Text>
            <TouchableOpacity
              onPress={handleSave}
              disabled={isSaving}
              style={[styles.modalSaveBtn, { backgroundColor: colors.tint }]}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.modalSaveBtnText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formScroll} contentContainerStyle={styles.formContent}>
            {/* Type */}
            {renderSelectOptions('Type *', CHALLENGE_TYPES, form.type, (val) => setForm(p => ({ ...p, type: val as any })), TYPE_COLORS)}

            {/* Title */}
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Title *</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                value={form.title}
                onChangeText={text => setForm(p => ({ ...p, title: text }))}
                placeholder="Challenge title"
                placeholderTextColor={colors.icon}
              />
            </View>

            {/* Description */}
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Description *</Text>
              <TextInput
                style={[styles.formInput, styles.textArea, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                value={form.description}
                onChangeText={text => setForm(p => ({ ...p, description: text }))}
                placeholder="Challenge description"
                placeholderTextColor={colors.icon}
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Icon */}
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Icon *</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                value={form.icon}
                onChangeText={text => setForm(p => ({ ...p, icon: text }))}
                placeholder="Emoji icon (e.g. \ud83d\udcb0)"
                placeholderTextColor={colors.icon}
              />
            </View>

            {/* Action */}
            {renderSelectOptions('Action *', ACTION_OPTIONS, form.action, (val) => setForm(p => ({ ...p, action: val })))}

            {/* Target & Coins */}
            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Target *</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  value={form.target ? String(form.target) : ''}
                  onChangeText={text => setForm(p => ({ ...p, target: parseInt(text) || 0 }))}
                  placeholder="e.g. 3"
                  placeholderTextColor={colors.icon}
                  keyboardType="numeric"
                />
              </View>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Coins Reward *</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  value={form.coins !== undefined ? String(form.coins) : ''}
                  onChangeText={text => setForm(p => ({ ...p, coins: parseInt(text) || 0 }))}
                  placeholder="e.g. 100"
                  placeholderTextColor={colors.icon}
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* Difficulty */}
            {renderSelectOptions('Difficulty *', DIFFICULTY_LEVELS, form.difficulty, (val) => setForm(p => ({ ...p, difficulty: val as any })), DIFFICULTY_COLORS)}

            {/* Date Section */}
            <View style={[styles.dateRangeSection, { borderColor: colors.border }]}>
              <View style={styles.dateRangeTitleRow}>
                <Ionicons name="calendar" size={18} color={colors.tint} />
                <Text style={[styles.dateRangeTitle, { color: colors.text }]}>Duration</Text>
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Start Date *</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  value={form.startDate ? format(new Date(form.startDate), 'yyyy-MM-dd HH:mm') : ''}
                  onChangeText={text => {
                    const parsed = new Date(text.replace(' ', 'T'));
                    if (!isNaN(parsed.getTime())) {
                      setForm(p => ({ ...p, startDate: parsed.toISOString() }));
                    }
                  }}
                  placeholder="YYYY-MM-DD HH:mm"
                  placeholderTextColor={colors.icon}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.text }]}>End Date *</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  value={form.endDate ? format(new Date(form.endDate), 'yyyy-MM-dd HH:mm') : ''}
                  onChangeText={text => {
                    const parsed = new Date(text.replace(' ', 'T'));
                    if (!isNaN(parsed.getTime())) {
                      setForm(p => ({ ...p, endDate: parsed.toISOString() }));
                    }
                  }}
                  placeholder="YYYY-MM-DD HH:mm"
                  placeholderTextColor={colors.icon}
                />
              </View>

              {/* Duration hint */}
              {form.startDate && form.endDate && (
                <View style={[styles.durationHint, { backgroundColor: `${colors.tint}15` }]}>
                  <Ionicons name="information-circle" size={16} color={colors.tint} />
                  <Text style={[styles.durationHintText, { color: colors.tint }]}>
                    {(() => {
                      const start = new Date(form.startDate);
                      const end = new Date(form.endDate);
                      const diffMs = end.getTime() - start.getTime();
                      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
                      if (diffDays < 0) return 'End date must be after start date';
                      if (diffDays === 0) return 'Runs for less than a day';
                      if (diffDays === 1) return 'Runs for 1 day';
                      return `Runs for ${diffDays} days`;
                    })()}
                  </Text>
                </View>
              )}
            </View>

            {/* Max Participants */}
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Max Participants (optional)</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                value={form.maxParticipants ? String(form.maxParticipants) : ''}
                onChangeText={text => setForm(p => ({ ...p, maxParticipants: text ? parseInt(text) : undefined }))}
                placeholder="Leave empty for unlimited"
                placeholderTextColor={colors.icon}
                keyboardType="numeric"
              />
            </View>

            {/* Featured Toggle */}
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Featured</Text>
              <View style={[styles.switchBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Text style={[styles.switchLabel, { color: colors.icon }]}>
                  {form.featured ? 'Yes' : 'No'}
                </Text>
                <Switch
                  value={form.featured}
                  onValueChange={val => setForm(p => ({ ...p, featured: val }))}
                  trackColor={{ true: colors.tint }}
                />
              </View>
            </View>

            {/* Active Toggle */}
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Active</Text>
              <View style={[styles.switchBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Text style={[styles.switchLabel, { color: colors.icon }]}>
                  {form.active ? 'Yes' : 'No'}
                </Text>
                <Switch
                  value={form.active}
                  onValueChange={val => setForm(p => ({ ...p, active: val }))}
                  trackColor={{ true: colors.tint }}
                />
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    );
  };

  // ==========================================
  // Template Modal
  // ==========================================

  const renderTemplateModal = () => (
    <Modal visible={showTemplateModal} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <TouchableOpacity
            onPress={() => setShowTemplateModal(false)}
            style={styles.modalCloseBtn}
          >
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Challenge Templates</Text>
          <View style={{ width: 60 }} />
        </View>

        {templatesLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.tint} />
          </View>
        ) : (
          <FlatList
            data={templates}
            keyExtractor={(_, index) => `template-${index}`}
            contentContainerStyle={styles.listContent}
            renderItem={({ item, index }) => {
              const typeColor = TYPE_COLORS[item.type] || '#6B7280';
              const diffColor = DIFFICULTY_COLORS[item.difficulty] || '#6B7280';
              return (
                <TouchableOpacity
                  style={[styles.templateCard, { backgroundColor: colors.card }]}
                  onPress={() => {
                    showConfirm(
                      'Create Challenge',
                      `Create "${item.title}" challenge from this template?`,
                      () => handleCreateFromTemplate(index),
                      'Create'
                    );
                  }}
                >
                  <View style={styles.templateHeader}>
                    <Text style={styles.templateIcon}>{item.icon}</Text>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={[styles.templateTitle, { color: colors.text }]}>{item.title}</Text>
                      <Text style={[styles.templateDescription, { color: colors.icon }]} numberOfLines={2}>
                        {item.description}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.templateMeta}>
                    <View style={[styles.typeBadge, { backgroundColor: `${typeColor}15` }]}>
                      <Text style={[styles.typeBadgeText, { color: typeColor }]}>
                        {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                      </Text>
                    </View>
                    <View style={[styles.difficultyBadge, { backgroundColor: `${diffColor}15` }]}>
                      <Text style={[styles.difficultyBadgeText, { color: diffColor }]}>
                        {item.difficulty.charAt(0).toUpperCase() + item.difficulty.slice(1)}
                      </Text>
                    </View>
                    <View style={styles.metaChip}>
                      <Ionicons name="logo-bitcoin" size={12} color="#F59E0B" />
                      <Text style={[styles.metaText, { color: '#F59E0B', fontWeight: '700' }]}>
                        {item.rewards.coins}
                      </Text>
                    </View>
                    {item.durationDays && (
                      <View style={styles.metaChip}>
                        <Ionicons name="time-outline" size={12} color={colors.icon} />
                        <Text style={[styles.metaText, { color: colors.icon }]}>
                          {item.durationDays}d
                        </Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="copy-outline" size={56} color={colors.icon} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No templates</Text>
                <Text style={[styles.emptyText, { color: colors.icon }]}>
                  No challenge templates available
                </Text>
              </View>
            }
          />
        )}
      </SafeAreaView>
    </Modal>
  );

  // ==========================================
  // Main Return
  // ==========================================

  if (loading && challenges.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {renderHeader()}
      {renderStatsRow()}
      {renderFilters()}
      {renderButtonRow()}

      <FlatList
        data={challenges}
        renderItem={renderChallengeItem}
        keyExtractor={item => item._id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.tint}
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          hasMore ? (
            <ActivityIndicator style={{ padding: 16 }} color={colors.tint} />
          ) : (
            <View style={{ height: 20 }} />
          )
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="flag-outline" size={56} color={colors.icon} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No challenges</Text>
            <Text style={[styles.emptyText, { color: colors.icon }]}>
              Create your first challenge or use a template
            </Text>
          </View>
        }
      />

      {renderFormModal()}
      {renderTemplateModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 12,
  },
  statItem: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
  },

  // Filters
  filtersContainer: {
    marginBottom: 8,
  },
  filterRow: {
    paddingHorizontal: 16,
    gap: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  filterDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 4,
  },

  // Buttons
  buttonRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 12,
  },
  createBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  templateBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  createBtnText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 14,
  },

  // Card
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  card: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  cardIcon: {
    fontSize: 28,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  cardDescription: {
    fontSize: 12,
    marginTop: 2,
  },

  // Badges
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  difficultyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  difficultyBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 3,
  },
  featuredBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },

  // Status
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Meta
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 6,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
  },

  // Date Row
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 10,
    marginTop: 4,
    marginBottom: 8,
  },
  dateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 12,
  },
  maxParticipantsBadge: {
    fontSize: 11,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },

  // Action Row
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Template Card
  templateCard: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  templateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  templateIcon: {
    fontSize: 32,
  },
  templateTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  templateDescription: {
    fontSize: 13,
    marginTop: 2,
  },
  templateMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  // Empty State
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 12,
  },
  emptyText: {
    fontSize: 14,
    marginTop: 4,
  },

  // Modal
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  modalSaveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  modalSaveBtnText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 14,
  },

  // Form
  formScroll: {
    flex: 1,
  },
  formContent: {
    padding: 16,
    paddingBottom: 40,
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  formInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  formRow: {
    flexDirection: 'row',
    marginBottom: 0,
  },

  // Select
  selectRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  selectChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  selectChipText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Date Range
  dateRangeSection: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  dateRangeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  dateRangeTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  durationHint: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    gap: 8,
  },
  durationHintText: {
    fontSize: 13,
    fontWeight: '500',
  },

  // Switch Box
  switchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
});
