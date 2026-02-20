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
import { achievementsService, AdminAchievement, AchievementStats } from '../../services/api/achievements';
import { Colors } from '../../constants/Colors';
import { showAlert, showConfirm } from '../../utils/alert';
import { router } from 'expo-router';

interface ConditionRule {
  metric: string;
  operator: string;
  target: number;
  weight: number;
}

interface AchievementFormData {
  type: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  category: string;
  target: number;
  coinReward: number;
  badge: string;
  isActive: boolean;
  sortOrder: number;
  // New fields
  conditionType: string;
  conditionCombinator: string;
  conditionRules: ConditionRule[];
  visibility: string;
  repeatability: string;
  tier: string;
  cashbackReward: number;
  multiplierReward: number;
}

const DEFAULT_FORM: AchievementFormData = {
  type: '',
  title: '',
  description: '',
  icon: '',
  color: '#10B981',
  category: '',
  target: 1,
  coinReward: 100,
  badge: '',
  isActive: true,
  sortOrder: 0,
  conditionType: 'simple',
  conditionCombinator: 'AND',
  conditionRules: [{ metric: 'totalOrders', operator: 'gte', target: 1, weight: 1 }],
  visibility: 'visible',
  repeatability: 'one_time',
  tier: 'bronze',
  cashbackReward: 0,
  multiplierReward: 0,
};

const METRIC_OPTIONS = [
  'totalOrders', 'totalSpent', 'uniqueStoresOrdered',
  'totalReviews', 'totalHelpfulVotes',
  'totalVideos', 'totalVideoViews',
  'totalProjects', 'projectEarnings',
  'totalReferrals',
  'billsUploaded', 'socialSharesApproved',
  'loginStreak', 'longestLoginStreak',
  'totalCoinsEarned', 'offersRedeemed',
  'totalActivity', 'daysActive',
];

const OPERATOR_OPTIONS = ['gte', 'lte', 'eq', 'gt', 'lt'];
const TIER_OPTIONS = ['bronze', 'silver', 'gold', 'platinum', 'diamond'];
const VISIBILITY_OPTIONS = ['visible', 'hidden_until_progress', 'secret'];
const REPEATABILITY_OPTIONS = ['one_time', 'daily', 'weekly', 'monthly'];
const CONDITION_TYPE_OPTIONS = ['simple', 'compound', 'streak', 'time_bounded'];

const CATEGORY_OPTIONS = [
  'shopping', 'social', 'engagement', 'special',
  'ORDERS', 'SPENDING', 'REVIEWS', 'VIDEOS',
  'PROJECTS', 'VOUCHERS', 'REFERRALS', 'LOYALTY', 'ACTIVITY',
];

const FILTER_OPTIONS = [
  { label: 'All', value: '' },
  { label: 'Active', value: 'true' },
  { label: 'Inactive', value: 'false' },
];

export default function AchievementsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  // Data state
  const [achievements, setAchievements] = useState<AdminAchievement[]>([]);
  const [stats, setStats] = useState<AchievementStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filter state
  const [activeFilter, setActiveFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Modal state
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingAchievement, setEditingAchievement] = useState<AdminAchievement | null>(null);
  const [form, setForm] = useState<AchievementFormData>(DEFAULT_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  // Load data
  useEffect(() => {
    loadAchievements();
    loadStats();
  }, [activeFilter, categoryFilter]);

  const loadAchievements = useCallback(async (pageNum: number = 1) => {
    try {
      if (pageNum === 1) setLoading(true);
      const params: any = { page: pageNum, limit: 20 };
      if (activeFilter) params.isActive = activeFilter;
      if (categoryFilter) params.category = categoryFilter;

      const response = await achievementsService.list(params);
      if (response.success && response.data) {
        setAchievements(response.data.achievements || []);
        setTotalPages(response.data.pagination?.totalPages || 1);
        setPage(pageNum);
      }
    } catch (error: any) {
      console.error('Failed to load achievements:', error);
      showAlert('Error', 'Failed to load achievements');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeFilter, categoryFilter]);

  const loadStats = useCallback(async () => {
    try {
      const response = await achievementsService.getStats();
      if (response.success && response.data) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadAchievements(1);
    loadStats();
  }, [loadAchievements, loadStats]);

  // CRUD operations
  const handleSeed = async () => {
    const confirmed = await showConfirm(
      'Seed Achievements',
      'This will import all achievements from the config file. Existing ones will be skipped. Continue?'
    );
    if (!confirmed) return;

    setIsSeeding(true);
    try {
      const response = await achievementsService.seed();
      if (response.success) {
        const data = response.data as any;
        showAlert('Seed Complete', `Created: ${data.created}, Skipped: ${data.skipped}`);
        loadAchievements(1);
        loadStats();
      } else {
        showAlert('Error', response.message || 'Failed to seed');
      }
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to seed achievements');
    } finally {
      setIsSeeding(false);
    }
  };

  const handleCreate = () => {
    setEditingAchievement(null);
    setForm(DEFAULT_FORM);
    setShowFormModal(true);
  };

  const handleEdit = (achievement: AdminAchievement) => {
    setEditingAchievement(achievement);
    const a = achievement as any;
    setForm({
      type: achievement.type,
      title: achievement.title,
      description: achievement.description,
      icon: achievement.icon,
      color: achievement.color || '#10B981',
      category: achievement.category || '',
      target: achievement.target,
      coinReward: achievement.coinReward,
      badge: achievement.badge || '',
      isActive: achievement.isActive,
      sortOrder: achievement.sortOrder || 0,
      conditionType: a.conditions?.type || 'simple',
      conditionCombinator: a.conditions?.combinator || 'AND',
      conditionRules: a.conditions?.rules?.length > 0
        ? a.conditions.rules.map((r: any) => ({ metric: r.metric, operator: r.operator, target: r.target, weight: r.weight || 1 }))
        : [{ metric: 'totalOrders', operator: 'gte', target: achievement.target || 1, weight: 1 }],
      visibility: a.visibility || 'visible',
      repeatability: a.repeatability || 'one_time',
      tier: a.tier || 'bronze',
      cashbackReward: a.reward?.cashback || 0,
      multiplierReward: a.reward?.multiplier || 0,
    });
    setShowFormModal(true);
  };

  const handleSave = async () => {
    if (!form.type || !form.title || !form.description || !form.icon) {
      showAlert('Validation Error', 'Type, title, description, and icon are required');
      return;
    }

    // Build payload with new condition/reward fields
    const payload: any = {
      ...form,
      conditions: {
        type: form.conditionType,
        combinator: form.conditionCombinator,
        rules: form.conditionRules,
      },
      reward: {
        coins: form.coinReward,
        cashback: form.cashbackReward || 0,
        multiplier: form.multiplierReward || 0,
        badge: form.badge || undefined,
      },
    };

    setIsSaving(true);
    try {
      let response;
      if (editingAchievement) {
        response = await achievementsService.update(editingAchievement._id, payload);
      } else {
        response = await achievementsService.create(payload);
      }

      if (response.success) {
        showAlert('Success', editingAchievement ? 'Achievement updated' : 'Achievement created');
        setShowFormModal(false);
        loadAchievements(1);
        loadStats();
      } else {
        showAlert('Error', response.message || 'Failed to save');
      }
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to save achievement');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggle = async (achievement: AdminAchievement) => {
    try {
      const response = await achievementsService.toggle(achievement._id);
      if (response.success) {
        setAchievements(prev =>
          prev.map(a => a._id === achievement._id ? { ...a, isActive: !a.isActive } : a)
        );
        loadStats();
      } else {
        showAlert('Error', response.message || 'Failed to toggle');
      }
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to toggle');
    }
  };

  const handleDelete = async (achievement: AdminAchievement) => {
    const confirmed = await showConfirm(
      'Delete Achievement',
      `Are you sure you want to delete "${achievement.title}"? This cannot be undone.`
    );
    if (!confirmed) return;

    try {
      const response = await achievementsService.delete(achievement._id);
      if (response.success) {
        showAlert('Success', 'Achievement deleted');
        loadAchievements(1);
        loadStats();
      } else {
        showAlert('Error', response.message || 'Failed to delete');
      }
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to delete');
    }
  };

  // Render functions
  const renderStatsBar = () => {
    if (!stats) return null;
    return (
      <View style={[styles.statsBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.text }]}>{stats.totalAchievements}</Text>
          <Text style={[styles.statLabel, { color: colors.icon }]}>Total</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#10B981' }]}>{stats.activeCount}</Text>
          <Text style={[styles.statLabel, { color: colors.icon }]}>Active</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#F59E0B' }]}>{stats.totalUnlocks}</Text>
          <Text style={[styles.statLabel, { color: colors.icon }]}>Unlocks</Text>
        </View>
      </View>
    );
  };

  const renderFilters = () => (
    <View style={styles.filtersRow}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
        {FILTER_OPTIONS.map(opt => (
          <TouchableOpacity
            key={opt.value}
            style={[
              styles.filterChip,
              {
                backgroundColor: activeFilter === opt.value ? '#F59E0B' : colors.card,
                borderColor: activeFilter === opt.value ? '#F59E0B' : colors.border,
              }
            ]}
            onPress={() => setActiveFilter(opt.value)}
          >
            <Text style={[
              styles.filterChipText,
              { color: activeFilter === opt.value ? '#fff' : colors.text }
            ]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderAchievementCard = ({ item }: { item: AdminAchievement }) => (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.cardHeader}>
        <View style={styles.cardLeft}>
          <Text style={styles.cardIcon}>{item.icon}</Text>
          <View style={styles.cardTitleArea}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>{item.title}</Text>
            <View style={[styles.typeBadge, { backgroundColor: (item.color || '#10B981') + '20' }]}>
              <Text style={[styles.typeBadgeText, { color: item.color || '#10B981' }]}>
                {item.type}
              </Text>
            </View>
          </View>
        </View>
        <Switch
          value={item.isActive}
          onValueChange={() => handleToggle(item)}
          trackColor={{ false: '#ccc', true: '#10B981' }}
          thumbColor="#fff"
        />
      </View>

      <Text style={[styles.cardDescription, { color: colors.icon }]} numberOfLines={2}>
        {item.description}
      </Text>

      <View style={styles.cardMetrics}>
        <View style={styles.metricItem}>
          <Ionicons name="flag" size={14} color="#F59E0B" />
          <Text style={[styles.metricText, { color: colors.text }]}>Target: {item.target}</Text>
        </View>
        <View style={styles.metricItem}>
          <Ionicons name="wallet" size={14} color="#10B981" />
          <Text style={[styles.metricText, { color: colors.text }]}>{item.coinReward} coins</Text>
        </View>
        <View style={styles.metricItem}>
          <Ionicons name="people" size={14} color="#3B82F6" />
          <Text style={[styles.metricText, { color: colors.text }]}>{item.unlockCount || 0} unlocks</Text>
        </View>
        {item.category && (
          <View style={styles.metricItem}>
            <Ionicons name="pricetag" size={14} color="#8B5CF6" />
            <Text style={[styles.metricText, { color: colors.text }]}>{item.category}</Text>
          </View>
        )}
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: '#3B82F620' }]}
          onPress={() => handleEdit(item)}
        >
          <Ionicons name="pencil" size={16} color="#3B82F6" />
          <Text style={[styles.actionBtnText, { color: '#3B82F6' }]}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: '#EF444420' }]}
          onPress={() => handleDelete(item)}
        >
          <Ionicons name="trash" size={16} color="#EF4444" />
          <Text style={[styles.actionBtnText, { color: '#EF4444' }]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderFormModal = () => (
    <Modal
      visible={showFormModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowFormModal(false)}
    >
      <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => setShowFormModal(false)}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: colors.text }]}>
            {editingAchievement ? 'Edit Achievement' : 'Create Achievement'}
          </Text>
          <TouchableOpacity onPress={handleSave} disabled={isSaving}>
            {isSaving ? (
              <ActivityIndicator size="small" color="#F59E0B" />
            ) : (
              <Text style={styles.saveBtn}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.formScroll} contentContainerStyle={styles.formContent}>
          {/* Type */}
          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.text }]}>Type *</Text>
            <TextInput
              style={[styles.formInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
              value={form.type}
              onChangeText={(v) => setForm(prev => ({ ...prev, type: v }))}
              placeholder="e.g. first_order"
              placeholderTextColor={colors.icon}
              editable={!editingAchievement}
            />
          </View>

          {/* Title */}
          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.text }]}>Title *</Text>
            <TextInput
              style={[styles.formInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
              value={form.title}
              onChangeText={(v) => setForm(prev => ({ ...prev, title: v }))}
              placeholder="Achievement title"
              placeholderTextColor={colors.icon}
            />
          </View>

          {/* Description */}
          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.text }]}>Description *</Text>
            <TextInput
              style={[styles.formInput, styles.textArea, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
              value={form.description}
              onChangeText={(v) => setForm(prev => ({ ...prev, description: v }))}
              placeholder="What the user needs to do"
              placeholderTextColor={colors.icon}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Icon */}
          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.text }]}>Icon * (emoji or icon name)</Text>
            <TextInput
              style={[styles.formInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
              value={form.icon}
              onChangeText={(v) => setForm(prev => ({ ...prev, icon: v }))}
              placeholder="e.g. cart or an emoji"
              placeholderTextColor={colors.icon}
            />
          </View>

          {/* Color */}
          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.text }]}>Color (hex)</Text>
            <View style={styles.colorRow}>
              <View style={[styles.colorPreview, { backgroundColor: form.color }]} />
              <TextInput
                style={[styles.formInput, { flex: 1, backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                value={form.color}
                onChangeText={(v) => setForm(prev => ({ ...prev, color: v }))}
                placeholder="#10B981"
                placeholderTextColor={colors.icon}
              />
            </View>
          </View>

          {/* Category */}
          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.text }]}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {CATEGORY_OPTIONS.map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryChip,
                    {
                      backgroundColor: form.category === cat ? '#F59E0B' : colors.card,
                      borderColor: form.category === cat ? '#F59E0B' : colors.border,
                    }
                  ]}
                  onPress={() => setForm(prev => ({ ...prev, category: cat }))}
                >
                  <Text style={[
                    styles.categoryChipText,
                    { color: form.category === cat ? '#fff' : colors.text }
                  ]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Target */}
          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.text }]}>Target *</Text>
            <TextInput
              style={[styles.formInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
              value={String(form.target)}
              onChangeText={(v) => setForm(prev => ({ ...prev, target: parseInt(v) || 0 }))}
              placeholder="1"
              placeholderTextColor={colors.icon}
              keyboardType="numeric"
            />
          </View>

          {/* Coin Reward */}
          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.text }]}>Coin Reward *</Text>
            <TextInput
              style={[styles.formInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
              value={String(form.coinReward)}
              onChangeText={(v) => setForm(prev => ({ ...prev, coinReward: parseInt(v) || 0 }))}
              placeholder="100"
              placeholderTextColor={colors.icon}
              keyboardType="numeric"
            />
          </View>

          {/* Badge */}
          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.text }]}>Badge (optional)</Text>
            <TextInput
              style={[styles.formInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
              value={form.badge}
              onChangeText={(v) => setForm(prev => ({ ...prev, badge: v }))}
              placeholder="Badge name"
              placeholderTextColor={colors.icon}
            />
          </View>

          {/* Sort Order */}
          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.text }]}>Sort Order</Text>
            <TextInput
              style={[styles.formInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
              value={String(form.sortOrder)}
              onChangeText={(v) => setForm(prev => ({ ...prev, sortOrder: parseInt(v) || 0 }))}
              placeholder="0"
              placeholderTextColor={colors.icon}
              keyboardType="numeric"
            />
          </View>

          {/* === NEW: Condition Builder === */}
          <View style={[styles.formGroup, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 16, marginTop: 8 }]}>
            <Text style={[styles.formLabel, { color: '#F59E0B', fontWeight: '700', fontSize: 15 }]}>Condition Builder</Text>
          </View>

          {/* Condition Type */}
          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.text }]}>Condition Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {CONDITION_TYPE_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt}
                  style={[styles.categoryChip, { backgroundColor: form.conditionType === opt ? '#8B5CF6' : colors.card, borderColor: form.conditionType === opt ? '#8B5CF6' : colors.border }]}
                  onPress={() => setForm(prev => ({ ...prev, conditionType: opt }))}
                >
                  <Text style={[styles.categoryChipText, { color: form.conditionType === opt ? '#fff' : colors.text }]}>{opt}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Combinator (for compound) */}
          {form.conditionType === 'compound' && (
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Combinator</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {['AND', 'OR'].map(c => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.categoryChip, { backgroundColor: form.conditionCombinator === c ? '#3B82F6' : colors.card, borderColor: form.conditionCombinator === c ? '#3B82F6' : colors.border }]}
                    onPress={() => setForm(prev => ({ ...prev, conditionCombinator: c }))}
                  >
                    <Text style={[styles.categoryChipText, { color: form.conditionCombinator === c ? '#fff' : colors.text }]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Condition Rules */}
          {form.conditionRules.map((rule, idx) => (
            <View key={idx} style={[styles.formGroup, { backgroundColor: `${colors.card}`, borderRadius: 8, padding: 12, borderWidth: 1, borderColor: colors.border }]}>
              <Text style={[styles.formLabel, { color: colors.text, fontSize: 12 }]}>Rule {idx + 1}</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                <View style={{ flex: 2, minWidth: 120 }}>
                  <Text style={{ color: colors.icon, fontSize: 10, marginBottom: 2 }}>Metric</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 32 }}>
                    {METRIC_OPTIONS.map(m => (
                      <TouchableOpacity
                        key={m}
                        style={[styles.categoryChip, { paddingHorizontal: 6, paddingVertical: 3, backgroundColor: rule.metric === m ? '#8B5CF6' : colors.background, borderColor: rule.metric === m ? '#8B5CF6' : colors.border }]}
                        onPress={() => {
                          const rules = [...form.conditionRules];
                          rules[idx] = { ...rules[idx], metric: m };
                          setForm(prev => ({ ...prev, conditionRules: rules }));
                        }}
                      >
                        <Text style={{ fontSize: 10, color: rule.metric === m ? '#fff' : colors.text }}>{m}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.icon, fontSize: 10, marginBottom: 2 }}>Operator</Text>
                  <View style={{ flexDirection: 'row', gap: 4 }}>
                    {OPERATOR_OPTIONS.map(op => (
                      <TouchableOpacity
                        key={op}
                        style={[styles.categoryChip, { paddingHorizontal: 6, paddingVertical: 3, backgroundColor: rule.operator === op ? '#3B82F6' : colors.background, borderColor: rule.operator === op ? '#3B82F6' : colors.border }]}
                        onPress={() => {
                          const rules = [...form.conditionRules];
                          rules[idx] = { ...rules[idx], operator: op };
                          setForm(prev => ({ ...prev, conditionRules: rules }));
                        }}
                      >
                        <Text style={{ fontSize: 10, color: rule.operator === op ? '#fff' : colors.text }}>{op}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.icon, fontSize: 10, marginBottom: 2 }}>Target</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border, height: 32, fontSize: 12 }]}
                    value={String(rule.target)}
                    onChangeText={(v) => {
                      const rules = [...form.conditionRules];
                      rules[idx] = { ...rules[idx], target: parseInt(v) || 0 };
                      setForm(prev => ({ ...prev, conditionRules: rules }));
                    }}
                    keyboardType="numeric"
                  />
                </View>
              </View>
              {form.conditionRules.length > 1 && (
                <TouchableOpacity
                  style={{ alignSelf: 'flex-end', marginTop: 4 }}
                  onPress={() => {
                    const rules = form.conditionRules.filter((_, i) => i !== idx);
                    setForm(prev => ({ ...prev, conditionRules: rules }));
                  }}
                >
                  <Ionicons name="trash-outline" size={16} color="#EF4444" />
                </TouchableOpacity>
              )}
            </View>
          ))}
          <TouchableOpacity
            style={{ alignSelf: 'flex-start', marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 4 }}
            onPress={() => setForm(prev => ({ ...prev, conditionRules: [...prev.conditionRules, { metric: 'totalOrders', operator: 'gte', target: 1, weight: 1 }] }))}
          >
            <Ionicons name="add-circle-outline" size={18} color="#8B5CF6" />
            <Text style={{ color: '#8B5CF6', fontSize: 13, fontWeight: '600' }}>Add Rule</Text>
          </TouchableOpacity>

          {/* === NEW: Achievement Properties === */}
          <View style={[styles.formGroup, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 16, marginTop: 8 }]}>
            <Text style={[styles.formLabel, { color: '#F59E0B', fontWeight: '700', fontSize: 15 }]}>Properties</Text>
          </View>

          {/* Tier */}
          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.text }]}>Tier</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {TIER_OPTIONS.map(t => (
                <TouchableOpacity
                  key={t}
                  style={[styles.categoryChip, { backgroundColor: form.tier === t ? '#F59E0B' : colors.card, borderColor: form.tier === t ? '#F59E0B' : colors.border }]}
                  onPress={() => setForm(prev => ({ ...prev, tier: t }))}
                >
                  <Text style={[styles.categoryChipText, { color: form.tier === t ? '#fff' : colors.text }]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Visibility */}
          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.text }]}>Visibility</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {VISIBILITY_OPTIONS.map(v => (
                <TouchableOpacity
                  key={v}
                  style={[styles.categoryChip, { backgroundColor: form.visibility === v ? '#3B82F6' : colors.card, borderColor: form.visibility === v ? '#3B82F6' : colors.border }]}
                  onPress={() => setForm(prev => ({ ...prev, visibility: v }))}
                >
                  <Text style={[styles.categoryChipText, { color: form.visibility === v ? '#fff' : colors.text }]}>{v.replace(/_/g, ' ')}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Repeatability */}
          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.text }]}>Repeatability</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {REPEATABILITY_OPTIONS.map(r => (
                <TouchableOpacity
                  key={r}
                  style={[styles.categoryChip, { backgroundColor: form.repeatability === r ? '#10B981' : colors.card, borderColor: form.repeatability === r ? '#10B981' : colors.border }]}
                  onPress={() => setForm(prev => ({ ...prev, repeatability: r }))}
                >
                  <Text style={[styles.categoryChipText, { color: form.repeatability === r ? '#fff' : colors.text }]}>{r.replace(/_/g, ' ')}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Active Toggle */}
          <View style={styles.formGroup}>
            <View style={styles.switchRow}>
              <Text style={[styles.formLabel, { color: colors.text, marginBottom: 0 }]}>Active</Text>
              <Switch
                value={form.isActive}
                onValueChange={(v) => setForm(prev => ({ ...prev, isActive: v }))}
                trackColor={{ false: '#ccc', true: '#10B981' }}
                thumbColor="#fff"
              />
            </View>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  if (loading && achievements.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color="#F59E0B" />
        <Text style={[styles.loadingText, { color: colors.icon }]}>Loading achievements...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Achievement Management</Text>
          <Text style={[styles.headerSubtitle, { color: colors.icon }]}>Manage user achievements & badges</Text>
        </View>
        <TouchableOpacity onPress={handleCreate} style={styles.addBtn}>
          <Ionicons name="add-circle" size={28} color="#F59E0B" />
        </TouchableOpacity>
      </View>

      {/* Stats Bar */}
      {renderStatsBar()}

      {/* Action Buttons */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.seedBtn, { backgroundColor: '#8B5CF620', borderColor: '#8B5CF6' }]}
          onPress={handleSeed}
          disabled={isSeeding}
        >
          {isSeeding ? (
            <ActivityIndicator size="small" color="#8B5CF6" />
          ) : (
            <Ionicons name="download" size={18} color="#8B5CF6" />
          )}
          <Text style={[styles.seedBtnText, { color: '#8B5CF6' }]}>
            {isSeeding ? 'Seeding...' : 'Seed from Config'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.seedBtn, { backgroundColor: '#F59E0B20', borderColor: '#F59E0B' }]}
          onPress={handleCreate}
        >
          <Ionicons name="add" size={18} color="#F59E0B" />
          <Text style={[styles.seedBtnText, { color: '#F59E0B' }]}>Create Achievement</Text>
        </TouchableOpacity>
      </View>

      {/* Filters */}
      {renderFilters()}

      {/* Achievement List */}
      <FlatList
        data={achievements}
        renderItem={renderAchievementCard}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F59E0B" />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="medal-outline" size={48} color={colors.icon} />
            <Text style={[styles.emptyText, { color: colors.icon }]}>No achievements found</Text>
            <Text style={[styles.emptySubtext, { color: colors.icon }]}>
              Tap "Seed from Config" to import or "Create Achievement" to add one
            </Text>
          </View>
        }
      />

      {/* Form Modal */}
      {renderFormModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: 4,
  },
  headerCenter: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  addBtn: {
    padding: 4,
  },
  statsBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
  },
  actionRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 12,
    gap: 8,
  },
  seedBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  seedBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  filtersRow: {
    marginTop: 12,
    marginBottom: 4,
    paddingHorizontal: 16,
  },
  filterScroll: {
    flexDirection: 'row',
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cardIcon: {
    fontSize: 28,
    marginRight: 10,
  },
  cardTitleArea: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  typeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 4,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  cardDescription: {
    fontSize: 13,
    marginTop: 8,
    lineHeight: 18,
  },
  cardMetrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
    gap: 12,
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metricText: {
    fontSize: 12,
    fontWeight: '500',
  },
  cardActions: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
    marginTop: 6,
    textAlign: 'center',
    paddingHorizontal: 40,
  },

  // Modal styles
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
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  saveBtn: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F59E0B',
  },
  formScroll: {
    flex: 1,
  },
  formContent: {
    padding: 16,
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
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  colorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  colorPreview: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    marginRight: 6,
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
