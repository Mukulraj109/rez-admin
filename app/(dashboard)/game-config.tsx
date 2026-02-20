import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useColorScheme,
  ActivityIndicator,
  Modal,
  TextInput,
  Switch,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { gameConfigService, GameConfigItem } from '../../services/api/gameConfig';
import { Colors } from '../../constants/Colors';
import { showAlert, showConfirm } from '../../utils/alert';

type GameType = 'spin_wheel' | 'memory_match' | 'coin_hunt' | 'guess_price' | 'quiz' | 'scratch_card';

const GAME_TYPE_DISPLAY: Record<GameType, { label: string; emoji: string; color: string }> = {
  spin_wheel: { label: 'Spin Wheel', emoji: '\uD83C\uDFB0', color: '#EF4444' },
  memory_match: { label: 'Memory Match', emoji: '\uD83E\uDDE0', color: '#8B5CF6' },
  coin_hunt: { label: 'Coin Hunt', emoji: '\uD83E\uDE99', color: '#F59E0B' },
  guess_price: { label: 'Guess the Price', emoji: '\uD83D\uDCB0', color: '#10B981' },
  quiz: { label: 'Quiz', emoji: '\uD83D\uDCDD', color: '#3B82F6' },
  scratch_card: { label: 'Scratch Card', emoji: '\uD83C\uDFAB', color: '#EC4899' },
};

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

type FormTab = 'basic' | 'rewards' | 'difficulty' | 'schedule' | 'advanced';

interface FormData {
  gameType: GameType;
  displayName: string;
  description: string;
  icon: string;
  isEnabled: boolean;
  dailyLimit: number;
  cooldownMinutes: number;
  rewards: {
    minCoins: number;
    maxCoins: number;
    bonusMultiplier: number;
  };
  difficulty: {
    easy: { timeLimit: number; gridSize?: number; lives?: number };
    medium: { timeLimit: number; gridSize?: number; lives?: number };
    hard: { timeLimit: number; gridSize?: number; lives?: number };
  };
  config: string; // JSON string for editing
  schedule: {
    availableDays: number[];
    availableHoursStart?: number;
    availableHoursEnd?: number;
  };
  sortOrder: number;
  featured: boolean;
}

const DEFAULT_FORM: FormData = {
  gameType: 'spin_wheel',
  displayName: '',
  description: '',
  icon: 'game-controller',
  isEnabled: true,
  dailyLimit: 3,
  cooldownMinutes: 0,
  rewards: { minCoins: 0, maxCoins: 100, bonusMultiplier: 1 },
  difficulty: {
    easy: { timeLimit: 60 },
    medium: { timeLimit: 45 },
    hard: { timeLimit: 30 },
  },
  config: '{}',
  schedule: { availableDays: [] },
  sortOrder: 0,
  featured: false,
};

export default function GameConfigScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [gameConfigs, setGameConfigs] = useState<GameConfigItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [seeding, setSeeding] = useState(false);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingConfig, setEditingConfig] = useState<GameConfigItem | null>(null);
  const [form, setForm] = useState<FormData>({ ...DEFAULT_FORM });
  const [activeFormTab, setActiveFormTab] = useState<FormTab>('basic');

  // Create modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState<FormData>({ ...DEFAULT_FORM });

  // Page-level tab (configs vs analytics vs user management)
  const [pageTab, setPageTab] = useState<'configs' | 'analytics' | 'users'>('configs');

  // Analytics state
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsDays, setAnalyticsDays] = useState(30);

  // User management state
  const [userIdInput, setUserIdInput] = useState('');
  const [userData, setUserData] = useState<any>(null);
  const [userLoading, setUserLoading] = useState(false);
  const [coinAmount, setCoinAmount] = useState('');
  const [coinReason, setCoinReason] = useState('');

  // ==========================================
  // Data Loading
  // ==========================================

  const loadConfigs = useCallback(async () => {
    try {
      setLoading(true);
      const response = await gameConfigService.list();
      if (response.success && response.data?.gameConfigs) {
        setGameConfigs(response.data.gameConfigs);
      } else {
        setGameConfigs([]);
      }
    } catch (error: any) {
      console.error('Failed to load game configs:', error);
      showAlert('Error', error.message || 'Failed to load game configs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfigs();
  }, [loadConfigs]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadConfigs();
    setRefreshing(false);
  }, [loadConfigs]);

  // ==========================================
  // Handlers
  // ==========================================

  const handleSeed = useCallback(async () => {
    setSeeding(true);
    try {
      const response = await gameConfigService.seed();
      if (response.success) {
        showAlert('Success', response.message || 'Default configs seeded');
        await loadConfigs();
      } else {
        showAlert('Error', response.message || 'Failed to seed configs');
      }
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to seed configs');
    } finally {
      setSeeding(false);
    }
  }, [loadConfigs]);

  const handleToggle = useCallback(async (config: GameConfigItem) => {
    // Optimistic update
    const prev = [...gameConfigs];
    setGameConfigs(list =>
      list.map(c => c._id === config._id ? { ...c, isEnabled: !c.isEnabled } : c)
    );
    try {
      const response = await gameConfigService.toggle(config._id);
      if (!response.success) {
        setGameConfigs(prev);
        showAlert('Error', response.message || 'Failed to toggle');
      }
    } catch (error: any) {
      setGameConfigs(prev);
      showAlert('Error', error.message || 'Failed to toggle');
    }
  }, [gameConfigs]);

  const handleToggleFeatured = useCallback(async (config: GameConfigItem) => {
    const prev = [...gameConfigs];
    setGameConfigs(list =>
      list.map(c => c._id === config._id ? { ...c, featured: !c.featured } : c)
    );
    try {
      const response = await gameConfigService.toggleFeatured(config._id);
      if (!response.success) {
        setGameConfigs(prev);
        showAlert('Error', response.message || 'Failed to toggle featured');
      }
    } catch (error: any) {
      setGameConfigs(prev);
      showAlert('Error', error.message || 'Failed to toggle featured');
    }
  }, [gameConfigs]);

  const handleDelete = useCallback((config: GameConfigItem) => {
    showConfirm(
      'Delete Game Config',
      `Are you sure you want to delete "${config.displayName}"? This cannot be undone.`,
      async () => {
        try {
          const response = await gameConfigService.delete(config._id);
          if (response.success) {
            showAlert('Success', 'Game config deleted');
            await loadConfigs();
          } else {
            showAlert('Error', response.message || 'Failed to delete');
          }
        } catch (error: any) {
          showAlert('Error', error.message || 'Failed to delete');
        }
      },
      'Delete'
    );
  }, [loadConfigs]);

  const handleEdit = useCallback((config: GameConfigItem) => {
    setEditingConfig(config);
    setForm({
      gameType: config.gameType,
      displayName: config.displayName,
      description: config.description,
      icon: config.icon,
      isEnabled: config.isEnabled,
      dailyLimit: config.dailyLimit,
      cooldownMinutes: config.cooldownMinutes,
      rewards: { ...config.rewards },
      difficulty: {
        easy: { ...config.difficulty.easy },
        medium: { ...config.difficulty.medium },
        hard: { ...config.difficulty.hard },
      },
      config: JSON.stringify(config.config || {}, null, 2),
      schedule: {
        availableDays: config.schedule?.availableDays || [],
        availableHoursStart: config.schedule?.availableHours?.start,
        availableHoursEnd: config.schedule?.availableHours?.end,
      },
      sortOrder: config.sortOrder,
      featured: config.featured,
    });
    setActiveFormTab('basic');
    setShowModal(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!editingConfig) return;

    // Validate JSON config
    let parsedConfig: Record<string, any> = {};
    try {
      parsedConfig = JSON.parse(form.config);
    } catch {
      showAlert('Error', 'Invalid JSON in Advanced Config field');
      return;
    }

    setIsSaving(true);
    try {
      const payload: any = {
        displayName: form.displayName,
        description: form.description,
        icon: form.icon,
        isEnabled: form.isEnabled,
        dailyLimit: form.dailyLimit,
        cooldownMinutes: form.cooldownMinutes,
        rewards: form.rewards,
        difficulty: form.difficulty,
        config: parsedConfig,
        schedule: {
          availableDays: form.schedule.availableDays,
          availableHours: (form.schedule.availableHoursStart !== undefined && form.schedule.availableHoursEnd !== undefined)
            ? { start: form.schedule.availableHoursStart, end: form.schedule.availableHoursEnd }
            : undefined,
        },
        sortOrder: form.sortOrder,
        featured: form.featured,
      };

      const response = await gameConfigService.update(editingConfig._id, payload);
      if (response.success) {
        showAlert('Success', 'Game config updated');
        setShowModal(false);
        await loadConfigs();
      } else {
        showAlert('Error', response.message || 'Failed to update');
      }
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to update');
    } finally {
      setIsSaving(false);
    }
  }, [editingConfig, form, loadConfigs]);

  const handleCreate = useCallback(async () => {
    if (!createForm.displayName || !createForm.description) {
      showAlert('Error', 'Display name and description are required');
      return;
    }

    let parsedConfig: Record<string, any> = {};
    try {
      parsedConfig = JSON.parse(createForm.config);
    } catch {
      showAlert('Error', 'Invalid JSON in config field');
      return;
    }

    setIsSaving(true);
    try {
      const payload: any = {
        gameType: createForm.gameType,
        displayName: createForm.displayName,
        description: createForm.description,
        icon: createForm.icon,
        isEnabled: createForm.isEnabled,
        dailyLimit: createForm.dailyLimit,
        cooldownMinutes: createForm.cooldownMinutes,
        rewards: createForm.rewards,
        difficulty: createForm.difficulty,
        config: parsedConfig,
        schedule: {
          availableDays: createForm.schedule.availableDays,
          availableHours: (createForm.schedule.availableHoursStart !== undefined && createForm.schedule.availableHoursEnd !== undefined)
            ? { start: createForm.schedule.availableHoursStart, end: createForm.schedule.availableHoursEnd }
            : undefined,
        },
        sortOrder: createForm.sortOrder,
        featured: createForm.featured,
      };

      const response = await gameConfigService.create(payload);
      if (response.success) {
        showAlert('Success', 'Game config created');
        setShowCreateModal(false);
        setCreateForm({ ...DEFAULT_FORM });
        await loadConfigs();
      } else {
        showAlert('Error', response.message || 'Failed to create');
      }
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to create');
    } finally {
      setIsSaving(false);
    }
  }, [createForm, loadConfigs]);

  // ==========================================
  // Analytics & User Management Handlers
  // ==========================================

  const loadAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    try {
      const response = await gameConfigService.getAnalytics(undefined, analyticsDays);
      if (response.success && response.data) {
        setAnalyticsData(response.data);
      }
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to load analytics');
    } finally {
      setAnalyticsLoading(false);
    }
  }, [analyticsDays]);

  useEffect(() => {
    if (pageTab === 'analytics' && !analyticsData) {
      loadAnalytics();
    }
  }, [pageTab, loadAnalytics, analyticsData]);

  const handleLookupUser = async () => {
    if (!userIdInput.trim()) return;
    setUserLoading(true);
    try {
      const response = await gameConfigService.getUserGameHistory(userIdInput.trim());
      if (response.success && response.data) {
        setUserData(response.data);
      } else {
        showAlert('Not Found', 'User not found or no game history');
      }
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to lookup user');
    } finally {
      setUserLoading(false);
    }
  };

  const handleBanUser = async () => {
    if (!userData?.user?._id) return;
    showConfirm('Ban User', `Ban ${userData.user.fullName || userData.user._id} from all games?`, async () => {
      try {
        await gameConfigService.banUser(userData.user._id, 'Banned via admin panel');
        showAlert('Success', 'User banned from games');
        handleLookupUser(); // Refresh
      } catch (error: any) {
        showAlert('Error', error.message);
      }
    });
  };

  const handleUnbanUser = async () => {
    if (!userData?.user?._id) return;
    try {
      await gameConfigService.unbanUser(userData.user._id);
      showAlert('Success', 'User unbanned');
      handleLookupUser();
    } catch (error: any) {
      showAlert('Error', error.message);
    }
  };

  const handleCreditCoins = async () => {
    if (!userData?.user?._id || !coinAmount || !coinReason) {
      showAlert('Error', 'Enter amount and reason');
      return;
    }
    try {
      const response = await gameConfigService.creditCoins(userData.user._id, parseInt(coinAmount), coinReason);
      if (response.success) {
        showAlert('Success', `Credited ${coinAmount} coins`);
        setCoinAmount('');
        setCoinReason('');
      }
    } catch (error: any) {
      showAlert('Error', error.message);
    }
  };

  const handleRevokeCoins = async () => {
    if (!userData?.user?._id || !coinAmount || !coinReason) {
      showAlert('Error', 'Enter amount and reason');
      return;
    }
    showConfirm('Revoke Coins', `Revoke ${coinAmount} coins from this user?`, async () => {
      try {
        const response = await gameConfigService.revokeCoins(userData.user._id, parseInt(coinAmount), coinReason);
        if (response.success) {
          showAlert('Success', `Revoked ${coinAmount} coins`);
          setCoinAmount('');
          setCoinReason('');
        }
      } catch (error: any) {
        showAlert('Error', error.message);
      }
    });
  };

  // ==========================================
  // Render: Header
  // ==========================================

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Game Configuration</Text>
        <Text style={[styles.headerSubtitle, { color: colors.icon }]}>
          Configure mini-games, rewards & schedules
        </Text>
      </View>
      <TouchableOpacity
        style={[styles.seedBtn, { backgroundColor: '#F59E0B' }]}
        onPress={handleSeed}
        disabled={seeding}
      >
        {seeding ? (
          <ActivityIndicator size="small" color="#FFF" />
        ) : (
          <>
            <Ionicons name="flash" size={16} color="#FFF" />
            <Text style={styles.seedBtnText}>Seed Defaults</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );

  // ==========================================
  // Render: Stats
  // ==========================================

  const renderStats = () => {
    const total = gameConfigs.length;
    const enabled = gameConfigs.filter(c => c.isEnabled).length;
    const featured = gameConfigs.filter(c => c.featured).length;

    return (
      <View style={styles.statsRow}>
        {[
          { label: 'Total', value: total, color: colors.text },
          { label: 'Enabled', value: enabled, color: '#10B981' },
          { label: 'Featured', value: featured, color: '#F59E0B' },
        ].map((item, index) => (
          <View key={index} style={[styles.statItem, { backgroundColor: colors.card }]}>
            <Text style={[styles.statValue, { color: item.color }]}>{item.value}</Text>
            <Text style={[styles.statLabel, { color: colors.icon }]}>{item.label}</Text>
          </View>
        ))}
      </View>
    );
  };

  // ==========================================
  // Render: Game Config Card
  // ==========================================

  const renderGameCard = (config: GameConfigItem) => {
    const gameInfo = GAME_TYPE_DISPLAY[config.gameType] || { label: config.gameType, emoji: '\uD83C\uDFAE', color: '#6B7280' };

    return (
      <View
        key={config._id}
        style={[
          styles.card,
          { backgroundColor: colors.card },
          { borderLeftWidth: 4, borderLeftColor: config.isEnabled ? '#10B981' : '#94A3B8' },
        ]}
      >
        {/* Card Header */}
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardEmoji}>{gameInfo.emoji}</Text>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
                {config.displayName}
              </Text>
              <View style={[styles.gameTypeBadge, { backgroundColor: `${gameInfo.color}15` }]}>
                <Text style={[styles.gameTypeText, { color: gameInfo.color }]}>
                  {config.gameType}
                </Text>
              </View>
            </View>
          </View>

          {/* Featured star */}
          <TouchableOpacity onPress={() => handleToggleFeatured(config)} style={styles.featuredBtn}>
            <Ionicons
              name={config.featured ? 'star' : 'star-outline'}
              size={22}
              color={config.featured ? '#F59E0B' : colors.icon}
            />
          </TouchableOpacity>
        </View>

        {/* Description */}
        <Text style={[styles.cardDescription, { color: colors.icon }]} numberOfLines={2}>
          {config.description}
        </Text>

        {/* Info chips */}
        <View style={styles.infoRow}>
          <View style={[styles.infoChip, { backgroundColor: colors.background }]}>
            <Ionicons name="repeat" size={12} color={colors.icon} />
            <Text style={[styles.infoChipText, { color: colors.icon }]}>
              {config.dailyLimit}/day
            </Text>
          </View>
          {config.cooldownMinutes > 0 && (
            <View style={[styles.infoChip, { backgroundColor: colors.background }]}>
              <Ionicons name="time" size={12} color={colors.icon} />
              <Text style={[styles.infoChipText, { color: colors.icon }]}>
                {config.cooldownMinutes}min cooldown
              </Text>
            </View>
          )}
          <View style={[styles.infoChip, { backgroundColor: '#10B98115' }]}>
            <Ionicons name="cash" size={12} color="#10B981" />
            <Text style={[styles.infoChipText, { color: '#10B981' }]}>
              {config.rewards.minCoins}-{config.rewards.maxCoins} coins
            </Text>
          </View>
          {config.rewards.bonusMultiplier > 1 && (
            <View style={[styles.infoChip, { backgroundColor: '#F59E0B15' }]}>
              <Text style={[styles.infoChipText, { color: '#F59E0B', fontWeight: '700' }]}>
                {config.rewards.bonusMultiplier}x bonus
              </Text>
            </View>
          )}
        </View>

        {/* Toggle + Actions Row */}
        <View style={[styles.actionsRow, { borderTopColor: colors.border }]}>
          <View style={styles.toggleRow}>
            <Text style={[styles.toggleLabel, { color: colors.icon }]}>
              {config.isEnabled ? 'Enabled' : 'Disabled'}
            </Text>
            <Switch
              value={config.isEnabled}
              onValueChange={() => handleToggle(config)}
              trackColor={{ false: '#E2E8F0', true: '#10B981' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.actionBtns}>
            <TouchableOpacity
              style={[styles.actionIconBtn, { backgroundColor: '#3B82F610' }]}
              onPress={() => handleEdit(config)}
            >
              <Ionicons name="pencil" size={16} color="#3B82F6" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionIconBtn, { backgroundColor: '#EF444410' }]}
              onPress={() => handleDelete(config)}
            >
              <Ionicons name="trash" size={16} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  // ==========================================
  // Render: Form Tabs
  // ==========================================

  const renderFormTabs = () => {
    const tabs: { key: FormTab; label: string; icon: string }[] = [
      { key: 'basic', label: 'Basic', icon: 'information-circle' },
      { key: 'rewards', label: 'Rewards', icon: 'cash' },
      { key: 'difficulty', label: 'Difficulty', icon: 'speedometer' },
      { key: 'schedule', label: 'Schedule', icon: 'calendar' },
      { key: 'advanced', label: 'Advanced', icon: 'code-slash' },
    ];

    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.formTabsScroll}>
        <View style={styles.formTabsRow}>
          {tabs.map(tab => {
            const isActive = activeFormTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.formTab,
                  { backgroundColor: isActive ? colors.tint : colors.background, borderColor: isActive ? colors.tint : colors.border },
                ]}
                onPress={() => setActiveFormTab(tab.key)}
              >
                <Ionicons
                  name={tab.icon as any}
                  size={14}
                  color={isActive ? '#FFF' : colors.icon}
                />
                <Text style={[styles.formTabLabel, { color: isActive ? '#FFF' : colors.icon }]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    );
  };

  // ==========================================
  // Render: Edit Form Content
  // ==========================================

  const renderFormContent = () => {
    switch (activeFormTab) {
      case 'basic':
        return renderBasicForm();
      case 'rewards':
        return renderRewardsForm();
      case 'difficulty':
        return renderDifficultyForm();
      case 'schedule':
        return renderScheduleForm();
      case 'advanced':
        return renderAdvancedForm();
      default:
        return null;
    }
  };

  const renderBasicForm = () => (
    <View>
      <View style={styles.formGroup}>
        <Text style={[styles.formLabel, { color: colors.text }]}>Display Name *</Text>
        <TextInput
          style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
          value={form.displayName}
          onChangeText={text => setForm(p => ({ ...p, displayName: text }))}
          placeholder="e.g., Spin Wheel"
          placeholderTextColor={colors.icon}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={[styles.formLabel, { color: colors.text }]}>Description *</Text>
        <TextInput
          style={[styles.formInput, styles.textArea, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
          value={form.description}
          onChangeText={text => setForm(p => ({ ...p, description: text }))}
          placeholder="Describe the game..."
          placeholderTextColor={colors.icon}
          multiline
          numberOfLines={3}
        />
      </View>

      <View style={styles.formRow}>
        <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
          <Text style={[styles.formLabel, { color: colors.text }]}>Icon (Ionicons name)</Text>
          <TextInput
            style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
            value={form.icon}
            onChangeText={text => setForm(p => ({ ...p, icon: text }))}
            placeholder="game-controller"
            placeholderTextColor={colors.icon}
          />
        </View>
        <View style={[styles.formGroup, { flex: 1 }]}>
          <Text style={[styles.formLabel, { color: colors.text }]}>Sort Order</Text>
          <TextInput
            style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
            value={String(form.sortOrder)}
            onChangeText={text => setForm(p => ({ ...p, sortOrder: parseInt(text) || 0 }))}
            placeholder="0"
            placeholderTextColor={colors.icon}
            keyboardType="numeric"
          />
        </View>
      </View>

      <View style={styles.formRow}>
        <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
          <Text style={[styles.formLabel, { color: colors.text }]}>Daily Limit</Text>
          <TextInput
            style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
            value={String(form.dailyLimit)}
            onChangeText={text => setForm(p => ({ ...p, dailyLimit: parseInt(text) || 0 }))}
            placeholder="3"
            placeholderTextColor={colors.icon}
            keyboardType="numeric"
          />
        </View>
        <View style={[styles.formGroup, { flex: 1 }]}>
          <Text style={[styles.formLabel, { color: colors.text }]}>Cooldown (min)</Text>
          <TextInput
            style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
            value={String(form.cooldownMinutes)}
            onChangeText={text => setForm(p => ({ ...p, cooldownMinutes: parseInt(text) || 0 }))}
            placeholder="0"
            placeholderTextColor={colors.icon}
            keyboardType="numeric"
          />
        </View>
      </View>
    </View>
  );

  const renderRewardsForm = () => (
    <View>
      <View style={styles.formRow}>
        <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
          <Text style={[styles.formLabel, { color: colors.text }]}>Min Coins</Text>
          <TextInput
            style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
            value={String(form.rewards.minCoins)}
            onChangeText={text => setForm(p => ({
              ...p,
              rewards: { ...p.rewards, minCoins: parseInt(text) || 0 },
            }))}
            placeholder="0"
            placeholderTextColor={colors.icon}
            keyboardType="numeric"
          />
        </View>
        <View style={[styles.formGroup, { flex: 1 }]}>
          <Text style={[styles.formLabel, { color: colors.text }]}>Max Coins</Text>
          <TextInput
            style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
            value={String(form.rewards.maxCoins)}
            onChangeText={text => setForm(p => ({
              ...p,
              rewards: { ...p.rewards, maxCoins: parseInt(text) || 0 },
            }))}
            placeholder="100"
            placeholderTextColor={colors.icon}
            keyboardType="numeric"
          />
        </View>
      </View>

      <View style={styles.formGroup}>
        <Text style={[styles.formLabel, { color: colors.text }]}>Bonus Multiplier</Text>
        <TextInput
          style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
          value={String(form.rewards.bonusMultiplier)}
          onChangeText={text => setForm(p => ({
            ...p,
            rewards: { ...p.rewards, bonusMultiplier: parseFloat(text) || 1 },
          }))}
          placeholder="1"
          placeholderTextColor={colors.icon}
          keyboardType="numeric"
        />
      </View>

      {/* Preview */}
      <View style={[styles.rewardPreview, { backgroundColor: '#10B98115' }]}>
        <Ionicons name="cash" size={20} color="#10B981" />
        <Text style={styles.rewardPreviewText}>
          Reward range: {form.rewards.minCoins} - {form.rewards.maxCoins} coins
          {form.rewards.bonusMultiplier > 1 ? ` (${form.rewards.bonusMultiplier}x multiplier)` : ''}
        </Text>
      </View>
    </View>
  );

  const renderDifficultyLevel = (level: 'easy' | 'medium' | 'hard', labelColor: string) => {
    const levelData = form.difficulty[level];
    const levelLabel = level.charAt(0).toUpperCase() + level.slice(1);

    return (
      <View style={[styles.difficultySection, { borderColor: colors.border }]}>
        <Text style={[styles.difficultyLabel, { color: labelColor }]}>{levelLabel}</Text>

        <View style={styles.formRow}>
          <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
            <Text style={[styles.formLabelSmall, { color: colors.text }]}>Time Limit (sec)</Text>
            <TextInput
              style={[styles.formInputSmall, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              value={String(levelData.timeLimit)}
              onChangeText={text => setForm(p => ({
                ...p,
                difficulty: {
                  ...p.difficulty,
                  [level]: { ...p.difficulty[level], timeLimit: parseInt(text) || 0 },
                },
              }))}
              keyboardType="numeric"
              placeholder="60"
              placeholderTextColor={colors.icon}
            />
          </View>
          <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
            <Text style={[styles.formLabelSmall, { color: colors.text }]}>Grid Size</Text>
            <TextInput
              style={[styles.formInputSmall, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              value={levelData.gridSize !== undefined ? String(levelData.gridSize) : ''}
              onChangeText={text => setForm(p => ({
                ...p,
                difficulty: {
                  ...p.difficulty,
                  [level]: { ...p.difficulty[level], gridSize: text ? parseInt(text) : undefined },
                },
              }))}
              keyboardType="numeric"
              placeholder="-"
              placeholderTextColor={colors.icon}
            />
          </View>
          <View style={[styles.formGroup, { flex: 1 }]}>
            <Text style={[styles.formLabelSmall, { color: colors.text }]}>Lives</Text>
            <TextInput
              style={[styles.formInputSmall, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              value={levelData.lives !== undefined ? String(levelData.lives) : ''}
              onChangeText={text => setForm(p => ({
                ...p,
                difficulty: {
                  ...p.difficulty,
                  [level]: { ...p.difficulty[level], lives: text ? parseInt(text) : undefined },
                },
              }))}
              keyboardType="numeric"
              placeholder="-"
              placeholderTextColor={colors.icon}
            />
          </View>
        </View>
      </View>
    );
  };

  const renderDifficultyForm = () => (
    <View>
      {renderDifficultyLevel('easy', '#10B981')}
      {renderDifficultyLevel('medium', '#F59E0B')}
      {renderDifficultyLevel('hard', '#EF4444')}
    </View>
  );

  const renderScheduleForm = () => (
    <View>
      <View style={styles.formGroup}>
        <Text style={[styles.formLabel, { color: colors.text }]}>Available Days</Text>
        <Text style={[styles.formHint, { color: colors.icon }]}>
          Select which days this game is available. Leave all unchecked for every day.
        </Text>
        <View style={styles.daysRow}>
          {DAY_NAMES.map((day, index) => {
            const isSelected = form.schedule.availableDays.includes(index);
            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.dayChip,
                  {
                    backgroundColor: isSelected ? colors.tint : colors.background,
                    borderColor: isSelected ? colors.tint : colors.border,
                  },
                ]}
                onPress={() => {
                  setForm(p => {
                    const days = [...p.schedule.availableDays];
                    if (isSelected) {
                      return { ...p, schedule: { ...p.schedule, availableDays: days.filter(d => d !== index) } };
                    } else {
                      days.push(index);
                      days.sort();
                      return { ...p, schedule: { ...p.schedule, availableDays: days } };
                    }
                  });
                }}
              >
                <Text style={[styles.dayChipText, { color: isSelected ? '#FFF' : colors.icon }]}>
                  {day}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.formRow}>
        <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
          <Text style={[styles.formLabel, { color: colors.text }]}>Available From (hour)</Text>
          <TextInput
            style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
            value={form.schedule.availableHoursStart !== undefined ? String(form.schedule.availableHoursStart) : ''}
            onChangeText={text => setForm(p => ({
              ...p,
              schedule: { ...p.schedule, availableHoursStart: text ? parseInt(text) : undefined },
            }))}
            placeholder="e.g., 9"
            placeholderTextColor={colors.icon}
            keyboardType="numeric"
          />
        </View>
        <View style={[styles.formGroup, { flex: 1 }]}>
          <Text style={[styles.formLabel, { color: colors.text }]}>Available Until (hour)</Text>
          <TextInput
            style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
            value={form.schedule.availableHoursEnd !== undefined ? String(form.schedule.availableHoursEnd) : ''}
            onChangeText={text => setForm(p => ({
              ...p,
              schedule: { ...p.schedule, availableHoursEnd: text ? parseInt(text) : undefined },
            }))}
            placeholder="e.g., 21"
            placeholderTextColor={colors.icon}
            keyboardType="numeric"
          />
        </View>
      </View>

      {form.schedule.availableHoursStart !== undefined && form.schedule.availableHoursEnd !== undefined && (
        <View style={[styles.schedulePreview, { backgroundColor: `${colors.tint}15` }]}>
          <Ionicons name="time" size={16} color={colors.tint} />
          <Text style={[styles.schedulePreviewText, { color: colors.tint }]}>
            Available {form.schedule.availableHoursStart}:00 - {form.schedule.availableHoursEnd}:00
          </Text>
        </View>
      )}
    </View>
  );

  const renderAdvancedForm = () => (
    <View>
      <View style={styles.formGroup}>
        <Text style={[styles.formLabel, { color: colors.text }]}>Game-Specific Config (JSON)</Text>
        <Text style={[styles.formHint, { color: colors.icon }]}>
          Spin wheel segments, quiz categories, scratch card prizes, etc.
        </Text>
        <TextInput
          style={[styles.formInput, styles.jsonTextArea, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border, fontFamily: 'monospace' }]}
          value={form.config}
          onChangeText={text => setForm(p => ({ ...p, config: text }))}
          placeholder="{}"
          placeholderTextColor={colors.icon}
          multiline
          numberOfLines={12}
          textAlignVertical="top"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>
    </View>
  );

  // ==========================================
  // Render: Edit Modal
  // ==========================================

  const renderEditModal = () => (
    <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => setShowModal(false)} style={styles.modalCloseBtn}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: colors.text }]}>
            Edit {editingConfig?.displayName || 'Game Config'}
          </Text>
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

        {renderFormTabs()}

        <ScrollView style={styles.formScroll} contentContainerStyle={styles.formContent}>
          {renderFormContent()}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  // ==========================================
  // Render: Create Modal
  // ==========================================

  const existingTypes = new Set(gameConfigs.map(c => c.gameType));
  const availableTypes = (['spin_wheel', 'memory_match', 'coin_hunt', 'guess_price', 'quiz', 'scratch_card'] as GameType[])
    .filter(t => !existingTypes.has(t));

  const renderCreateModal = () => (
    <Modal visible={showCreateModal} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => setShowCreateModal(false)} style={styles.modalCloseBtn}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: colors.text }]}>New Game Config</Text>
          <TouchableOpacity
            onPress={handleCreate}
            disabled={isSaving}
            style={[styles.modalSaveBtn, { backgroundColor: colors.tint }]}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={styles.modalSaveBtnText}>Create</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.formScroll} contentContainerStyle={styles.formContent}>
          {/* Game Type Selection */}
          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.text }]}>Game Type *</Text>
            <View style={styles.gameTypeGrid}>
              {availableTypes.map(type => {
                const info = GAME_TYPE_DISPLAY[type];
                const isSelected = createForm.gameType === type;
                return (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.gameTypeOption,
                      {
                        backgroundColor: isSelected ? `${info.color}20` : colors.background,
                        borderColor: isSelected ? info.color : colors.border,
                      },
                    ]}
                    onPress={() => setCreateForm(p => ({
                      ...p,
                      gameType: type,
                      displayName: info.label,
                      icon: type === 'spin_wheel' ? 'color-filter' :
                            type === 'memory_match' ? 'grid' :
                            type === 'coin_hunt' ? 'search' :
                            type === 'guess_price' ? 'cash' :
                            type === 'quiz' ? 'help-circle' : 'card',
                    }))}
                  >
                    <Text style={styles.gameTypeOptionEmoji}>{info.emoji}</Text>
                    <Text style={[styles.gameTypeOptionLabel, { color: isSelected ? info.color : colors.text }]}>
                      {info.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.text }]}>Display Name *</Text>
            <TextInput
              style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              value={createForm.displayName}
              onChangeText={text => setCreateForm(p => ({ ...p, displayName: text }))}
              placeholder="Game name"
              placeholderTextColor={colors.icon}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.text }]}>Description *</Text>
            <TextInput
              style={[styles.formInput, styles.textArea, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              value={createForm.description}
              onChangeText={text => setCreateForm(p => ({ ...p, description: text }))}
              placeholder="Describe the game..."
              placeholderTextColor={colors.icon}
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.formRow}>
            <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Icon</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                value={createForm.icon}
                onChangeText={text => setCreateForm(p => ({ ...p, icon: text }))}
                placeholder="game-controller"
                placeholderTextColor={colors.icon}
              />
            </View>
            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Daily Limit</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                value={String(createForm.dailyLimit)}
                onChangeText={text => setCreateForm(p => ({ ...p, dailyLimit: parseInt(text) || 0 }))}
                placeholder="3"
                placeholderTextColor={colors.icon}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.formRow}>
            <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Min Coins</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                value={String(createForm.rewards.minCoins)}
                onChangeText={text => setCreateForm(p => ({
                  ...p,
                  rewards: { ...p.rewards, minCoins: parseInt(text) || 0 },
                }))}
                placeholder="0"
                placeholderTextColor={colors.icon}
                keyboardType="numeric"
              />
            </View>
            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Max Coins</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                value={String(createForm.rewards.maxCoins)}
                onChangeText={text => setCreateForm(p => ({
                  ...p,
                  rewards: { ...p.rewards, maxCoins: parseInt(text) || 0 },
                }))}
                placeholder="100"
                placeholderTextColor={colors.icon}
                keyboardType="numeric"
              />
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  // ==========================================
  // Render: Page Tabs
  // ==========================================

  const renderPageTabs = () => (
    <View style={[styles.pageTabsRow, { borderBottomColor: colors.border }]}>
      {([
        { key: 'configs' as const, label: 'Configuration', icon: 'settings' },
        { key: 'analytics' as const, label: 'Analytics', icon: 'bar-chart' },
        { key: 'users' as const, label: 'User Mgmt', icon: 'people' },
      ]).map(tab => {
        const active = pageTab === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            style={[styles.pageTab, active && { borderBottomColor: colors.tint, borderBottomWidth: 2 }]}
            onPress={() => setPageTab(tab.key)}
          >
            <Ionicons name={tab.icon as any} size={16} color={active ? colors.tint : colors.icon} />
            <Text style={[styles.pageTabLabel, { color: active ? colors.tint : colors.icon }]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  // ==========================================
  // Render: Analytics Tab
  // ==========================================

  const renderAnalyticsTab = () => {
    if (analyticsLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
          <Text style={[{ color: colors.icon, marginTop: 12 }]}>Loading analytics...</Text>
        </View>
      );
    }

    if (!analyticsData) {
      return (
        <View style={styles.emptyContainer}>
          <TouchableOpacity
            style={[styles.seedBtn, { backgroundColor: colors.tint }]}
            onPress={loadAnalytics}
          >
            <Ionicons name="refresh" size={16} color="#FFF" />
            <Text style={styles.seedBtnText}>Load Analytics</Text>
          </TouchableOpacity>
        </View>
      );
    }

    const { stats, topPlayers } = analyticsData;

    return (
      <ScrollView contentContainerStyle={styles.listContent}>
        {/* Period selector */}
        <View style={[styles.statsRow, { marginBottom: 8 }]}>
          {[7, 30, 90].map(d => (
            <TouchableOpacity
              key={d}
              style={[styles.statItem, {
                backgroundColor: analyticsDays === d ? colors.tint : colors.card,
              }]}
              onPress={() => { setAnalyticsDays(d); setAnalyticsData(null); }}
            >
              <Text style={[styles.statValue, { color: analyticsDays === d ? '#FFF' : colors.text, fontSize: 16 }]}>
                {d}d
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Per-game stats */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Game Performance</Text>
        {(stats || []).map((stat: any) => {
          const info = GAME_TYPE_DISPLAY[stat._id as GameType] || { label: stat._id, emoji: '🎮', color: '#6B7280' };
          return (
            <View key={stat._id} style={[styles.card, { backgroundColor: colors.card, borderLeftWidth: 4, borderLeftColor: info.color }]}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardEmoji}>{info.emoji}</Text>
                <Text style={[styles.cardTitle, { color: colors.text, marginLeft: 8 }]}>{info.label}</Text>
              </View>
              <View style={[styles.infoRow, { marginTop: 8 }]}>
                <View style={[styles.infoChip, { backgroundColor: colors.background }]}>
                  <Text style={[styles.infoChipText, { color: colors.text }]}>{stat.totalPlayed} played</Text>
                </View>
                <View style={[styles.infoChip, { backgroundColor: '#10B98115' }]}>
                  <Text style={[styles.infoChipText, { color: '#10B981' }]}>{stat.totalCoins} coins</Text>
                </View>
                <View style={[styles.infoChip, { backgroundColor: colors.background }]}>
                  <Text style={[styles.infoChipText, { color: colors.text }]}>{stat.uniquePlayers} players</Text>
                </View>
                <View style={[styles.infoChip, { backgroundColor: colors.background }]}>
                  <Text style={[styles.infoChipText, { color: colors.text }]}>{Math.round(stat.winRate)}% win</Text>
                </View>
              </View>
            </View>
          );
        })}

        {/* Top players */}
        <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 16 }]}>Top Players (by coins)</Text>
        {(topPlayers || []).slice(0, 10).map((p: any, i: number) => (
          <View key={i} style={[styles.card, { backgroundColor: colors.card, paddingVertical: 10, paddingHorizontal: 14 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text style={[{ fontSize: 16, fontWeight: '700', color: i < 3 ? '#F59E0B' : colors.icon, width: 24 }]}>
                  #{i + 1}
                </Text>
                <View>
                  <Text style={[{ fontSize: 14, fontWeight: '600', color: colors.text }]}>
                    {p.user?.fullName || p.user?.username || 'Unknown'}
                  </Text>
                  <Text style={[{ fontSize: 11, color: colors.icon }]}>{p.gamesPlayed} games</Text>
                </View>
              </View>
              <Text style={[{ fontSize: 16, fontWeight: '700', color: '#10B981' }]}>{p.totalCoins} coins</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    );
  };

  // ==========================================
  // Render: User Management Tab
  // ==========================================

  const renderUserManagementTab = () => (
    <ScrollView contentContainerStyle={styles.listContent}>
      {/* User lookup */}
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <Text style={[styles.cardTitle, { color: colors.text, marginBottom: 12 }]}>User Lookup</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TextInput
            style={[styles.formInput, { flex: 1, backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
            value={userIdInput}
            onChangeText={setUserIdInput}
            placeholder="Enter User ID"
            placeholderTextColor={colors.icon}
            autoCapitalize="none"
          />
          <TouchableOpacity
            style={[styles.seedBtn, { backgroundColor: colors.tint }]}
            onPress={handleLookupUser}
            disabled={userLoading}
          >
            {userLoading ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <>
                <Ionicons name="search" size={16} color="#FFF" />
                <Text style={styles.seedBtnText}>Search</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* User details */}
      {userData?.user && (
        <>
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={[{ fontSize: 18, fontWeight: '700', color: colors.text }]}>
                  {userData.user.fullName || 'No Name'}
                </Text>
                <Text style={[{ fontSize: 13, color: colors.icon }]}>
                  {userData.user.phoneNumber || userData.user.username || userData.user._id}
                </Text>
              </View>
              {userData.user.gameBanned ? (
                <TouchableOpacity
                  style={[styles.seedBtn, { backgroundColor: '#10B981' }]}
                  onPress={handleUnbanUser}
                >
                  <Ionicons name="lock-open" size={14} color="#FFF" />
                  <Text style={styles.seedBtnText}>Unban</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.seedBtn, { backgroundColor: '#EF4444' }]}
                  onPress={handleBanUser}
                >
                  <Ionicons name="ban" size={14} color="#FFF" />
                  <Text style={styles.seedBtnText}>Ban</Text>
                </TouchableOpacity>
              )}
            </View>
            {userData.user.gameBanned && (
              <View style={[{ backgroundColor: '#FEF2F2', padding: 10, borderRadius: 8, marginTop: 10 }]}>
                <Text style={[{ color: '#EF4444', fontWeight: '600', fontSize: 13 }]}>
                  Banned: {userData.user.gameBanReason || 'No reason given'}
                </Text>
              </View>
            )}
          </View>

          {/* Manual coin operations */}
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <Text style={[styles.cardTitle, { color: colors.text, marginBottom: 12 }]}>Coin Operations</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
              <TextInput
                style={[styles.formInput, { flex: 1, backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                value={coinAmount}
                onChangeText={setCoinAmount}
                placeholder="Amount"
                placeholderTextColor={colors.icon}
                keyboardType="numeric"
              />
              <TextInput
                style={[styles.formInput, { flex: 2, backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                value={coinReason}
                onChangeText={setCoinReason}
                placeholder="Reason"
                placeholderTextColor={colors.icon}
              />
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                style={[styles.seedBtn, { backgroundColor: '#10B981', flex: 1, justifyContent: 'center' }]}
                onPress={handleCreditCoins}
              >
                <Ionicons name="add-circle" size={14} color="#FFF" />
                <Text style={styles.seedBtnText}>Credit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.seedBtn, { backgroundColor: '#EF4444', flex: 1, justifyContent: 'center' }]}
                onPress={handleRevokeCoins}
              >
                <Ionicons name="remove-circle" size={14} color="#FFF" />
                <Text style={styles.seedBtnText}>Revoke</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Game history */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Recent Games ({userData.total || 0})
          </Text>
          {(userData.sessions || []).slice(0, 20).map((s: any, i: number) => {
            const info = GAME_TYPE_DISPLAY[s.gameType as GameType] || { label: s.gameType, emoji: '🎮', color: '#6B7280' };
            return (
              <View key={i} style={[styles.card, { backgroundColor: colors.card, paddingVertical: 10, paddingHorizontal: 14 }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontSize: 18 }}>{info.emoji}</Text>
                    <View>
                      <Text style={[{ fontSize: 13, fontWeight: '600', color: colors.text }]}>{info.label}</Text>
                      <Text style={[{ fontSize: 11, color: colors.icon }]}>
                        {new Date(s.createdAt).toLocaleDateString()} · {s.status}
                      </Text>
                    </View>
                  </View>
                  {s.result?.prize?.type === 'coins' && (
                    <Text style={[{ fontSize: 14, fontWeight: '700', color: '#10B981' }]}>
                      +{s.result.prize.value}
                    </Text>
                  )}
                </View>
              </View>
            );
          })}
        </>
      )}
    </ScrollView>
  );

  // ==========================================
  // Main Return
  // ==========================================

  if (loading && gameConfigs.length === 0) {
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
      {renderPageTabs()}

      {pageTab === 'configs' && (
        <>
          {renderStats()}
          <ScrollView
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.tint}
              />
            }
          >
            {gameConfigs.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="game-controller-outline" size={56} color={colors.icon} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No game configs</Text>
                <Text style={[styles.emptyText, { color: colors.icon }]}>
                  Tap "Seed Defaults" to create configs for all 6 game types
                </Text>
              </View>
            ) : (
              gameConfigs.map(renderGameCard)
            )}

            {/* Create new button (if fewer than 6 exist) */}
            {availableTypes.length > 0 && (
              <TouchableOpacity
                style={[styles.createNewBtn, { borderColor: colors.tint }]}
                onPress={() => {
                  setCreateForm({ ...DEFAULT_FORM, gameType: availableTypes[0] });
                  setShowCreateModal(true);
                }}
              >
                <Ionicons name="add-circle" size={20} color={colors.tint} />
                <Text style={[styles.createNewBtnText, { color: colors.tint }]}>
                  Add New Game Config ({availableTypes.length} available)
                </Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </>
      )}

      {pageTab === 'analytics' && renderAnalyticsTab()}
      {pageTab === 'users' && renderUserManagementTab()}

      {renderEditModal()}
      {renderCreateModal()}
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
  seedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  seedBtnText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 13,
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

  // List
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },

  // Card
  card: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cardEmoji: {
    fontSize: 28,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  gameTypeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 3,
  },
  gameTypeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  featuredBtn: {
    padding: 4,
  },
  cardDescription: {
    fontSize: 13,
    marginBottom: 10,
    lineHeight: 18,
  },

  // Info chips
  infoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  infoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  infoChipText: {
    fontSize: 11,
    fontWeight: '500',
  },

  // Actions
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 10,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toggleLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  actionBtns: {
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

  // Empty state
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
    textAlign: 'center',
    paddingHorizontal: 32,
  },

  // Create new button
  createNewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 14,
    gap: 8,
    marginTop: 4,
  },
  createNewBtnText: {
    fontSize: 14,
    fontWeight: '600',
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

  // Form Tabs
  formTabsScroll: {
    maxHeight: 48,
    borderBottomWidth: 0,
  },
  formTabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  formTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    gap: 4,
  },
  formTabLabel: {
    fontSize: 12,
    fontWeight: '600',
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
  formLabelSmall: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  formHint: {
    fontSize: 12,
    marginBottom: 8,
  },
  formInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
  },
  formInputSmall: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  jsonTextArea: {
    minHeight: 200,
    textAlignVertical: 'top',
    fontSize: 12,
    lineHeight: 18,
  },
  formRow: {
    flexDirection: 'row',
    marginBottom: 0,
  },

  // Difficulty
  difficultySection: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  difficultyLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },

  // Schedule
  daysRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  dayChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  dayChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  schedulePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    gap: 8,
  },
  schedulePreviewText: {
    fontSize: 13,
    fontWeight: '500',
  },

  // Reward Preview
  rewardPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    gap: 8,
  },
  rewardPreviewText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },

  // Game Type Grid (Create modal)
  gameTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  gameTypeOption: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    gap: 8,
  },
  gameTypeOptionEmoji: {
    fontSize: 22,
  },
  gameTypeOptionLabel: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },

  // Page-level tabs
  pageTabsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: 16,
  },
  pageTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginRight: 4,
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  pageTabLabel: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Section title
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
});
