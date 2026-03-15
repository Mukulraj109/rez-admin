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
import { featureFlagsService, FeatureFlagItem, EarningConfigData } from '../../services/api/featureFlags';
import { Colors } from '../../constants/Colors';
import { showAlert, showConfirm } from '../../utils/alert';

type ActiveTab = 'flags' | 'earning';

const GROUP_OPTIONS = ['All', 'playandearn', 'games', 'earning'];

// Default earning config for form initialization
const DEFAULT_EARNING_CONFIG: EarningConfigData = {
  streaks: {
    login: { milestones: [{ day: 3, coins: 50 }, { day: 7, coins: 200 }, { day: 14, coins: 500 }, { day: 30, coins: 1500 }] },
    order: { milestones: [{ day: 3, coins: 100 }, { day: 7, coins: 300 }, { day: 14, coins: 700 }] },
    review: { milestones: [{ day: 3, coins: 75 }, { day: 5, coins: 200 }, { day: 10, coins: 500 }] },
  },
  referral: {
    referrerAmount: 50,
    refereeDiscount: 50,
    milestoneBonus: 20,
    minOrders: 1,
    minSpend: 500,
    timeframeDays: 30,
    expiryDays: 90,
  },
  dailyCheckin: {
    baseCoins: 10,
    bonuses: [{ streak: 3, coins: 20 }, { streak: 7, coins: 50 }, { streak: 14, coins: 100 }, { streak: 30, coins: 300 }],
  },
  billUpload: {
    minAmount: 100,
    maxCashbackPercent: 10,
    maxCashbackAmount: 500,
  },
};

export default function FeatureFlagsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [activeTab, setActiveTab] = useState<ActiveTab>('flags');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [seeding, setSeeding] = useState(false);

  // Feature Flags state
  const [flags, setFlags] = useState<FeatureFlagItem[]>([]);
  const [groupFilter, setGroupFilter] = useState('All');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingFlag, setEditingFlag] = useState<FeatureFlagItem | null>(null);
  const [flagForm, setFlagForm] = useState({ label: '', group: '', sortOrder: 0, enabled: true, key: '' });
  const [isSaving, setIsSaving] = useState(false);

  // Earning Config state
  const [earningConfig, setEarningConfig] = useState<EarningConfigData>({ ...DEFAULT_EARNING_CONFIG });
  const [earningDirty, setEarningDirty] = useState(false);
  const [savingEarning, setSavingEarning] = useState(false);

  // ==========================================
  // Data Loading
  // ==========================================

  const loadFlags = useCallback(async () => {
    try {
      const group = groupFilter === 'All' ? undefined : groupFilter;
      const response = await featureFlagsService.listFlags(group);
      if (response.success && response.data?.flags) {
        setFlags(response.data.flags);
      } else {
        setFlags([]);
      }
    } catch (error: any) {
      console.error('Failed to load flags:', error);
      showAlert('Error', error.message || 'Failed to load feature flags');
    }
  }, [groupFilter]);

  const loadEarningConfig = useCallback(async () => {
    try {
      const response = await featureFlagsService.getEarningConfig();
      if (response.success && response.data) {
        setEarningConfig(response.data);
        setEarningDirty(false);
      }
    } catch (error: any) {
      console.error('Failed to load earning config:', error);
      showAlert('Error', error.message || 'Failed to load earning config');
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadFlags(), loadEarningConfig()]);
    setLoading(false);
  }, [loadFlags, loadEarningConfig]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    loadFlags();
  }, [groupFilter, loadFlags]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  // ==========================================
  // Feature Flag Handlers
  // ==========================================

  const handleSeedFlags = useCallback(async () => {
    setSeeding(true);
    try {
      const response = await featureFlagsService.seedFlags();
      if (response.success) {
        showAlert('Success', response.message || 'Default flags seeded');
        await loadFlags();
      } else {
        showAlert('Error', response.message || 'Failed to seed flags');
      }
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to seed flags');
    } finally {
      setSeeding(false);
    }
  }, [loadFlags]);

  const handleToggleFlag = useCallback(async (flag: FeatureFlagItem) => {
    const prev = [...flags];
    setFlags(list =>
      list.map(f => f.key === flag.key ? { ...f, enabled: !f.enabled } : f)
    );
    try {
      const response = await featureFlagsService.toggleFlag(flag.key);
      if (!response.success) {
        setFlags(prev);
        showAlert('Error', response.message || 'Failed to toggle flag');
      }
    } catch (error: any) {
      setFlags(prev);
      showAlert('Error', error.message || 'Failed to toggle flag');
    }
  }, [flags]);

  const handleEditFlag = useCallback((flag: FeatureFlagItem) => {
    setEditingFlag(flag);
    setFlagForm({
      label: flag.label,
      group: flag.group,
      sortOrder: flag.sortOrder,
      enabled: flag.enabled,
      key: flag.key,
    });
    setShowEditModal(true);
  }, []);

  const handleSaveFlag = useCallback(async () => {
    if (!editingFlag) return;

    if (!flagForm.label || !flagForm.group) {
      showAlert('Error', 'Label and group are required');
      return;
    }

    setIsSaving(true);
    try {
      const response = await featureFlagsService.updateFlag(editingFlag.key, {
        label: flagForm.label,
        group: flagForm.group,
        sortOrder: flagForm.sortOrder,
        enabled: flagForm.enabled,
      });
      if (response.success) {
        showAlert('Success', 'Feature flag updated');
        setShowEditModal(false);
        await loadFlags();
      } else {
        showAlert('Error', response.message || 'Failed to update flag');
      }
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to update flag');
    } finally {
      setIsSaving(false);
    }
  }, [editingFlag, flagForm, loadFlags]);

  const handleCreateFlag = useCallback(async () => {
    if (!flagForm.key || !flagForm.label || !flagForm.group) {
      showAlert('Error', 'Key, label, and group are required');
      return;
    }

    setIsSaving(true);
    try {
      const response = await featureFlagsService.createFlag({
        key: flagForm.key,
        label: flagForm.label,
        group: flagForm.group,
        sortOrder: flagForm.sortOrder,
        enabled: flagForm.enabled,
      });
      if (response.success) {
        showAlert('Success', 'Feature flag created');
        setShowCreateModal(false);
        setFlagForm({ label: '', group: 'playandearn', sortOrder: 0, enabled: true, key: '' });
        await loadFlags();
      } else {
        showAlert('Error', response.message || 'Failed to create flag');
      }
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to create flag');
    } finally {
      setIsSaving(false);
    }
  }, [flagForm, loadFlags]);

  const handleDeleteFlag = useCallback((flag: FeatureFlagItem) => {
    showConfirm(
      'Delete Flag',
      `Are you sure you want to delete "${flag.label}" (${flag.key})? This cannot be undone.`,
      async () => {
        try {
          const response = await featureFlagsService.deleteFlag(flag.key);
          if (response.success) {
            showAlert('Success', 'Feature flag deleted');
            await loadFlags();
          } else {
            showAlert('Error', response.message || 'Failed to delete flag');
          }
        } catch (error: any) {
          showAlert('Error', error.message || 'Failed to delete flag');
        }
      },
      'Delete'
    );
  }, [loadFlags]);

  // ==========================================
  // Earning Config Handlers
  // ==========================================

  const handleSeedEarning = useCallback(async () => {
    setSeeding(true);
    try {
      const response = await featureFlagsService.seedEarningConfig();
      if (response.success) {
        showAlert('Success', response.message || 'Earning config seeded');
        await loadEarningConfig();
      } else {
        showAlert('Error', response.message || 'Failed to seed earning config');
      }
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to seed earning config');
    } finally {
      setSeeding(false);
    }
  }, [loadEarningConfig]);

  const handleSaveEarning = useCallback(async () => {
    setSavingEarning(true);
    try {
      const response = await featureFlagsService.updateEarningConfig({
        streaks: earningConfig.streaks,
        referral: earningConfig.referral,
        dailyCheckin: earningConfig.dailyCheckin,
        billUpload: earningConfig.billUpload,
      });
      if (response.success) {
        showAlert('Success', 'Earning config saved');
        setEarningDirty(false);
        await loadEarningConfig();
      } else {
        showAlert('Error', response.message || 'Failed to save earning config');
      }
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to save earning config');
    } finally {
      setSavingEarning(false);
    }
  }, [earningConfig, loadEarningConfig]);

  // Earning config mutation helpers
  const updateEarning = (updater: (prev: EarningConfigData) => EarningConfigData) => {
    setEarningConfig(prev => {
      const next = updater(prev);
      setEarningDirty(true);
      return next;
    });
  };

  // ==========================================
  // Render: Header
  // ==========================================

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Feature Flags</Text>
        <Text style={[styles.headerSubtitle, { color: colors.icon }]}>
          Toggle sections & configure earning parameters
        </Text>
      </View>
    </View>
  );

  // ==========================================
  // Render: Tabs
  // ==========================================

  const renderTabs = () => (
    <View style={styles.tabsContainer}>
      {([
        { key: 'flags' as ActiveTab, label: 'Feature Flags', icon: 'toggle' },
        { key: 'earning' as ActiveTab, label: 'Earning Config', icon: 'cash' },
      ]).map(tab => {
        const isActive = activeTab === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tab,
              {
                backgroundColor: isActive ? colors.tint : colors.card,
                borderColor: isActive ? colors.tint : colors.border,
              },
            ]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Ionicons
              name={tab.icon as any}
              size={16}
              color={isActive ? colors.card : colors.icon}
            />
            <Text style={[styles.tabLabel, { color: isActive ? colors.card : colors.icon }]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  // ==========================================
  // Render: Feature Flags Tab
  // ==========================================

  const renderFlagsTab = () => (
    <View>
      {/* Actions Row */}
      <View style={styles.flagsActionsRow}>
        <TouchableOpacity
          style={[styles.seedBtn, { backgroundColor: colors.warning }]}
          onPress={handleSeedFlags}
          disabled={seeding}
        >
          {seeding ? (
            <ActivityIndicator size="small" color={colors.card} />
          ) : (
            <>
              <Ionicons name="flash" size={14} color={colors.card} />
              <Text style={styles.seedBtnText}>Seed Defaults</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.createBtn, { backgroundColor: colors.tint }]}
          onPress={() => {
            setFlagForm({ label: '', group: 'playandearn', sortOrder: 0, enabled: true, key: '' });
            setShowCreateModal(true);
          }}
        >
          <Ionicons name="add-circle" size={14} color={colors.card} />
          <Text style={styles.seedBtnText}>New Flag</Text>
        </TouchableOpacity>
      </View>

      {/* Group Filter */}
      <View style={styles.filterRow}>
        <Text style={[styles.filterLabel, { color: colors.icon }]}>Group:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filterChips}>
            {GROUP_OPTIONS.map(group => {
              const isActive = groupFilter === group;
              return (
                <TouchableOpacity
                  key={group}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: isActive ? colors.tint : colors.card,
                      borderColor: isActive ? colors.tint : colors.border,
                    },
                  ]}
                  onPress={() => setGroupFilter(group)}
                >
                  <Text style={[styles.filterChipText, { color: isActive ? colors.card : colors.icon }]}>
                    {group}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        {[
          { label: 'Total', value: flags.length, color: colors.text },
          { label: 'Enabled', value: flags.filter(f => f.enabled).length, color: colors.success },
          { label: 'Disabled', value: flags.filter(f => !f.enabled).length, color: colors.error },
        ].map((item, index) => (
          <View key={index} style={[styles.statItem, { backgroundColor: colors.card }]}>
            <Text style={[styles.statValue, { color: item.color }]}>{item.value}</Text>
            <Text style={[styles.statLabel, { color: colors.icon }]}>{item.label}</Text>
          </View>
        ))}
      </View>

      {/* Flags List */}
      {flags.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="toggle-outline" size={56} color={colors.icon} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No feature flags</Text>
          <Text style={[styles.emptyText, { color: colors.icon }]}>
            Tap "Seed Defaults" to create Play & Earn section flags
          </Text>
        </View>
      ) : (
        flags.map(flag => (
          <View
            key={flag.key}
            style={[
              styles.flagCard,
              { backgroundColor: colors.card },
              { borderLeftWidth: 4, borderLeftColor: flag.enabled ? colors.success : colors.slateMedium },
            ]}
          >
            <View style={styles.flagCardContent}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.flagLabel, { color: colors.text }]}>{flag.label}</Text>
                <Text style={[styles.flagKey, { color: colors.icon }]}>{flag.key}</Text>
                <View style={styles.flagMeta}>
                  <View style={[styles.flagMetaChip, { backgroundColor: `${colors.purple}15` }]}>
                    <Text style={[styles.flagMetaText, { color: colors.purple }]}>{flag.group}</Text>
                  </View>
                  <View style={[styles.flagMetaChip, { backgroundColor: colors.background }]}>
                    <Text style={[styles.flagMetaText, { color: colors.icon }]}>Order: {flag.sortOrder}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.flagActions}>
                <Switch
                  value={flag.enabled}
                  onValueChange={() => handleToggleFlag(flag)}
                  trackColor={{ false: colors.border, true: colors.success }}
                  thumbColor={colors.card}
                />
              </View>
            </View>

            <View style={[styles.flagActionsBottom, { borderTopColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.actionIconBtn, { backgroundColor: `${colors.info}10` }]}
                onPress={() => handleEditFlag(flag)}
              >
                <Ionicons name="pencil" size={14} color={colors.info} />
                <Text style={[styles.actionBtnText, { color: colors.info }]}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionIconBtn, { backgroundColor: `${colors.error}10` }]}
                onPress={() => handleDeleteFlag(flag)}
              >
                <Ionicons name="trash" size={14} color={colors.error} />
                <Text style={[styles.actionBtnText, { color: colors.error }]}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
    </View>
  );

  // ==========================================
  // Render: Earning Config Tab
  // ==========================================

  const renderMilestoneList = (
    milestones: { day: number; coins: number }[],
    onUpdate: (milestones: { day: number; coins: number }[]) => void,
    title: string,
    iconColor: string
  ) => (
    <View style={[styles.configSection, { backgroundColor: colors.card }]}>
      <View style={styles.configSectionHeader}>
        <Ionicons name="flame" size={18} color={iconColor} />
        <Text style={[styles.configSectionTitle, { color: colors.text }]}>{title}</Text>
      </View>
      {milestones.map((m, idx) => (
        <View key={idx} style={styles.milestoneRow}>
          <View style={[styles.milestoneField, { marginRight: 8 }]}>
            <Text style={[styles.milestoneFieldLabel, { color: colors.icon }]}>Day</Text>
            <TextInput
              style={[styles.milestoneInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              value={String(m.day)}
              onChangeText={text => {
                const updated = [...milestones];
                updated[idx] = { ...updated[idx], day: parseInt(text) || 0 };
                onUpdate(updated);
              }}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={colors.icon}
            />
          </View>
          <View style={[styles.milestoneField, { marginRight: 8 }]}>
            <Text style={[styles.milestoneFieldLabel, { color: colors.icon }]}>Coins</Text>
            <TextInput
              style={[styles.milestoneInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              value={String(m.coins)}
              onChangeText={text => {
                const updated = [...milestones];
                updated[idx] = { ...updated[idx], coins: parseInt(text) || 0 };
                onUpdate(updated);
              }}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={colors.icon}
            />
          </View>
          <TouchableOpacity
            style={styles.removeMilestoneBtn}
            onPress={() => {
              const updated = milestones.filter((_, i) => i !== idx);
              onUpdate(updated);
            }}
          >
            <Ionicons name="close-circle" size={22} color={colors.error} />
          </TouchableOpacity>
        </View>
      ))}
      <TouchableOpacity
        style={[styles.addMilestoneBtn, { borderColor: colors.tint }]}
        onPress={() => onUpdate([...milestones, { day: 0, coins: 0 }])}
      >
        <Ionicons name="add" size={16} color={colors.tint} />
        <Text style={[styles.addMilestoneBtnText, { color: colors.tint }]}>Add Milestone</Text>
      </TouchableOpacity>
    </View>
  );

  const renderEarningTab = () => (
    <View>
      {/* Actions Row */}
      <View style={styles.flagsActionsRow}>
        <TouchableOpacity
          style={[styles.seedBtn, { backgroundColor: colors.warning }]}
          onPress={handleSeedEarning}
          disabled={seeding}
        >
          {seeding ? (
            <ActivityIndicator size="small" color={colors.card} />
          ) : (
            <>
              <Ionicons name="flash" size={14} color={colors.card} />
              <Text style={styles.seedBtnText}>Seed Defaults</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.createBtn,
            { backgroundColor: earningDirty ? colors.tint : colors.slateMedium },
          ]}
          onPress={handleSaveEarning}
          disabled={!earningDirty || savingEarning}
        >
          {savingEarning ? (
            <ActivityIndicator size="small" color={colors.card} />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={14} color={colors.card} />
              <Text style={styles.seedBtnText}>Save Changes</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {earningDirty && (
        <View style={[styles.dirtyBanner, { backgroundColor: `${colors.warning}15` }]}>
          <Ionicons name="warning" size={16} color={colors.warning} />
          <Text style={[styles.dirtyBannerText, { color: colors.warning }]}>
            You have unsaved changes
          </Text>
        </View>
      )}

      {/* Login Streak Milestones */}
      {renderMilestoneList(
        earningConfig.streaks.login.milestones,
        (milestones) => updateEarning(prev => ({
          ...prev,
          streaks: { ...prev.streaks, login: { milestones } },
        })),
        'Login Streak Milestones',
        colors.info
      )}

      {/* Order Streak Milestones */}
      {renderMilestoneList(
        earningConfig.streaks.order.milestones,
        (milestones) => updateEarning(prev => ({
          ...prev,
          streaks: { ...prev.streaks, order: { milestones } },
        })),
        'Order Streak Milestones',
        colors.success
      )}

      {/* Review Streak Milestones */}
      {renderMilestoneList(
        earningConfig.streaks.review.milestones,
        (milestones) => updateEarning(prev => ({
          ...prev,
          streaks: { ...prev.streaks, review: { milestones } },
        })),
        'Review Streak Milestones',
        colors.purple
      )}

      {/* Referral Settings */}
      <View style={[styles.configSection, { backgroundColor: colors.card }]}>
        <View style={styles.configSectionHeader}>
          <Ionicons name="people" size={18} color="#EC4899" />
          <Text style={[styles.configSectionTitle, { color: colors.text }]}>Referral Settings</Text>
        </View>

        <View style={styles.formRow}>
          <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
            <Text style={[styles.formLabel, { color: colors.text }]}>Referrer Amount</Text>
            <TextInput
              style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              value={String(earningConfig.referral.referrerAmount)}
              onChangeText={text => updateEarning(prev => ({
                ...prev,
                referral: { ...prev.referral, referrerAmount: parseInt(text) || 0 },
              }))}
              keyboardType="numeric"
              placeholder="50"
              placeholderTextColor={colors.icon}
            />
          </View>
          <View style={[styles.formGroup, { flex: 1 }]}>
            <Text style={[styles.formLabel, { color: colors.text }]}>Referee Discount</Text>
            <TextInput
              style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              value={String(earningConfig.referral.refereeDiscount)}
              onChangeText={text => updateEarning(prev => ({
                ...prev,
                referral: { ...prev.referral, refereeDiscount: parseInt(text) || 0 },
              }))}
              keyboardType="numeric"
              placeholder="50"
              placeholderTextColor={colors.icon}
            />
          </View>
        </View>

        <View style={styles.formRow}>
          <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
            <Text style={[styles.formLabel, { color: colors.text }]}>Milestone Bonus</Text>
            <TextInput
              style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              value={String(earningConfig.referral.milestoneBonus)}
              onChangeText={text => updateEarning(prev => ({
                ...prev,
                referral: { ...prev.referral, milestoneBonus: parseInt(text) || 0 },
              }))}
              keyboardType="numeric"
              placeholder="20"
              placeholderTextColor={colors.icon}
            />
          </View>
          <View style={[styles.formGroup, { flex: 1 }]}>
            <Text style={[styles.formLabel, { color: colors.text }]}>Min Orders</Text>
            <TextInput
              style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              value={String(earningConfig.referral.minOrders)}
              onChangeText={text => updateEarning(prev => ({
                ...prev,
                referral: { ...prev.referral, minOrders: parseInt(text) || 0 },
              }))}
              keyboardType="numeric"
              placeholder="1"
              placeholderTextColor={colors.icon}
            />
          </View>
        </View>

        <View style={styles.formRow}>
          <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
            <Text style={[styles.formLabel, { color: colors.text }]}>Min Spend</Text>
            <TextInput
              style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              value={String(earningConfig.referral.minSpend)}
              onChangeText={text => updateEarning(prev => ({
                ...prev,
                referral: { ...prev.referral, minSpend: parseInt(text) || 0 },
              }))}
              keyboardType="numeric"
              placeholder="500"
              placeholderTextColor={colors.icon}
            />
          </View>
          <View style={[styles.formGroup, { flex: 1 }]}>
            <Text style={[styles.formLabel, { color: colors.text }]}>Timeframe (days)</Text>
            <TextInput
              style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              value={String(earningConfig.referral.timeframeDays)}
              onChangeText={text => updateEarning(prev => ({
                ...prev,
                referral: { ...prev.referral, timeframeDays: parseInt(text) || 0 },
              }))}
              keyboardType="numeric"
              placeholder="30"
              placeholderTextColor={colors.icon}
            />
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={[styles.formLabel, { color: colors.text }]}>Expiry (days)</Text>
          <TextInput
            style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
            value={String(earningConfig.referral.expiryDays)}
            onChangeText={text => updateEarning(prev => ({
              ...prev,
              referral: { ...prev.referral, expiryDays: parseInt(text) || 0 },
            }))}
            keyboardType="numeric"
            placeholder="90"
            placeholderTextColor={colors.icon}
          />
        </View>
      </View>

      {/* Daily Check-in */}
      <View style={[styles.configSection, { backgroundColor: colors.card }]}>
        <View style={styles.configSectionHeader}>
          <Ionicons name="calendar" size={18} color={colors.warning} />
          <Text style={[styles.configSectionTitle, { color: colors.text }]}>Daily Check-in</Text>
        </View>

        <View style={styles.formGroup}>
          <Text style={[styles.formLabel, { color: colors.text }]}>Base Coins</Text>
          <TextInput
            style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
            value={String(earningConfig.dailyCheckin.baseCoins)}
            onChangeText={text => updateEarning(prev => ({
              ...prev,
              dailyCheckin: { ...prev.dailyCheckin, baseCoins: parseInt(text) || 0 },
            }))}
            keyboardType="numeric"
            placeholder="10"
            placeholderTextColor={colors.icon}
          />
        </View>

        <Text style={[styles.subSectionTitle, { color: colors.text }]}>Streak Bonuses</Text>
        {earningConfig.dailyCheckin.bonuses.map((b, idx) => (
          <View key={idx} style={styles.milestoneRow}>
            <View style={[styles.milestoneField, { marginRight: 8 }]}>
              <Text style={[styles.milestoneFieldLabel, { color: colors.icon }]}>Streak</Text>
              <TextInput
                style={[styles.milestoneInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                value={String(b.streak)}
                onChangeText={text => {
                  const updated = [...earningConfig.dailyCheckin.bonuses];
                  updated[idx] = { ...updated[idx], streak: parseInt(text) || 0 };
                  updateEarning(prev => ({
                    ...prev,
                    dailyCheckin: { ...prev.dailyCheckin, bonuses: updated },
                  }));
                }}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={colors.icon}
              />
            </View>
            <View style={[styles.milestoneField, { marginRight: 8 }]}>
              <Text style={[styles.milestoneFieldLabel, { color: colors.icon }]}>Coins</Text>
              <TextInput
                style={[styles.milestoneInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                value={String(b.coins)}
                onChangeText={text => {
                  const updated = [...earningConfig.dailyCheckin.bonuses];
                  updated[idx] = { ...updated[idx], coins: parseInt(text) || 0 };
                  updateEarning(prev => ({
                    ...prev,
                    dailyCheckin: { ...prev.dailyCheckin, bonuses: updated },
                  }));
                }}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={colors.icon}
              />
            </View>
            <TouchableOpacity
              style={styles.removeMilestoneBtn}
              onPress={() => {
                const updated = earningConfig.dailyCheckin.bonuses.filter((_, i) => i !== idx);
                updateEarning(prev => ({
                  ...prev,
                  dailyCheckin: { ...prev.dailyCheckin, bonuses: updated },
                }));
              }}
            >
              <Ionicons name="close-circle" size={22} color={colors.error} />
            </TouchableOpacity>
          </View>
        ))}
        <TouchableOpacity
          style={[styles.addMilestoneBtn, { borderColor: colors.tint }]}
          onPress={() => {
            updateEarning(prev => ({
              ...prev,
              dailyCheckin: {
                ...prev.dailyCheckin,
                bonuses: [...prev.dailyCheckin.bonuses, { streak: 0, coins: 0 }],
              },
            }));
          }}
        >
          <Ionicons name="add" size={16} color={colors.tint} />
          <Text style={[styles.addMilestoneBtnText, { color: colors.tint }]}>Add Bonus</Text>
        </TouchableOpacity>
      </View>

      {/* Bill Upload */}
      <View style={[styles.configSection, { backgroundColor: colors.card }]}>
        <View style={styles.configSectionHeader}>
          <Ionicons name="receipt" size={18} color="#06B6D4" />
          <Text style={[styles.configSectionTitle, { color: colors.text }]}>Bill Upload</Text>
        </View>

        <View style={styles.formGroup}>
          <Text style={[styles.formLabel, { color: colors.text }]}>Min Amount</Text>
          <TextInput
            style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
            value={String(earningConfig.billUpload.minAmount)}
            onChangeText={text => updateEarning(prev => ({
              ...prev,
              billUpload: { ...prev.billUpload, minAmount: parseInt(text) || 0 },
            }))}
            keyboardType="numeric"
            placeholder="100"
            placeholderTextColor={colors.icon}
          />
        </View>

        <View style={styles.formRow}>
          <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
            <Text style={[styles.formLabel, { color: colors.text }]}>Max Cashback %</Text>
            <TextInput
              style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              value={String(earningConfig.billUpload.maxCashbackPercent)}
              onChangeText={text => updateEarning(prev => ({
                ...prev,
                billUpload: { ...prev.billUpload, maxCashbackPercent: parseInt(text) || 0 },
              }))}
              keyboardType="numeric"
              placeholder="10"
              placeholderTextColor={colors.icon}
            />
          </View>
          <View style={[styles.formGroup, { flex: 1 }]}>
            <Text style={[styles.formLabel, { color: colors.text }]}>Max Cashback Amt</Text>
            <TextInput
              style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              value={String(earningConfig.billUpload.maxCashbackAmount)}
              onChangeText={text => updateEarning(prev => ({
                ...prev,
                billUpload: { ...prev.billUpload, maxCashbackAmount: parseInt(text) || 0 },
              }))}
              keyboardType="numeric"
              placeholder="500"
              placeholderTextColor={colors.icon}
            />
          </View>
        </View>
      </View>
    </View>
  );

  // ==========================================
  // Render: Edit Flag Modal
  // ==========================================

  const renderEditFlagModal = () => (
    <Modal visible={showEditModal} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => setShowEditModal(false)} style={styles.modalCloseBtn}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: colors.text }]}>
            Edit Flag
          </Text>
          <TouchableOpacity
            onPress={handleSaveFlag}
            disabled={isSaving}
            style={[styles.modalSaveBtn, { backgroundColor: colors.tint }]}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={colors.card} />
            ) : (
              <Text style={styles.modalSaveBtnText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.formScroll} contentContainerStyle={styles.formContent}>
          <View style={[styles.keyBadge, { backgroundColor: colors.card }]}>
            <Ionicons name="key" size={14} color={colors.icon} />
            <Text style={[styles.keyBadgeText, { color: colors.icon }]}>{editingFlag?.key}</Text>
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.text }]}>Label *</Text>
            <TextInput
              style={[styles.formInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
              value={flagForm.label}
              onChangeText={text => setFlagForm(p => ({ ...p, label: text }))}
              placeholder="Display name"
              placeholderTextColor={colors.icon}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.text }]}>Group *</Text>
            <TextInput
              style={[styles.formInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
              value={flagForm.group}
              onChangeText={text => setFlagForm(p => ({ ...p, group: text }))}
              placeholder="e.g., playandearn"
              placeholderTextColor={colors.icon}
            />
          </View>

          <View style={styles.formRow}>
            <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Sort Order</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                value={String(flagForm.sortOrder)}
                onChangeText={text => setFlagForm(p => ({ ...p, sortOrder: parseInt(text) || 0 }))}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={colors.icon}
              />
            </View>
            <View style={[styles.formGroup, { flex: 1, justifyContent: 'center' }]}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Enabled</Text>
              <Switch
                value={flagForm.enabled}
                onValueChange={val => setFlagForm(p => ({ ...p, enabled: val }))}
                trackColor={{ false: colors.border, true: colors.success }}
                thumbColor={colors.card}
              />
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  // ==========================================
  // Render: Create Flag Modal
  // ==========================================

  const renderCreateFlagModal = () => (
    <Modal visible={showCreateModal} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => setShowCreateModal(false)} style={styles.modalCloseBtn}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: colors.text }]}>
            New Feature Flag
          </Text>
          <TouchableOpacity
            onPress={handleCreateFlag}
            disabled={isSaving}
            style={[styles.modalSaveBtn, { backgroundColor: colors.tint }]}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={colors.card} />
            ) : (
              <Text style={styles.modalSaveBtnText}>Create</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.formScroll} contentContainerStyle={styles.formContent}>
          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.text }]}>Key *</Text>
            <TextInput
              style={[styles.formInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
              value={flagForm.key}
              onChangeText={text => setFlagForm(p => ({ ...p, key: text }))}
              placeholder="e.g., playandearn.new_section"
              placeholderTextColor={colors.icon}
              autoCapitalize="none"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.text }]}>Label *</Text>
            <TextInput
              style={[styles.formInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
              value={flagForm.label}
              onChangeText={text => setFlagForm(p => ({ ...p, label: text }))}
              placeholder="Display name"
              placeholderTextColor={colors.icon}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.text }]}>Group *</Text>
            <TextInput
              style={[styles.formInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
              value={flagForm.group}
              onChangeText={text => setFlagForm(p => ({ ...p, group: text }))}
              placeholder="e.g., playandearn"
              placeholderTextColor={colors.icon}
            />
          </View>

          <View style={styles.formRow}>
            <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Sort Order</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                value={String(flagForm.sortOrder)}
                onChangeText={text => setFlagForm(p => ({ ...p, sortOrder: parseInt(text) || 0 }))}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={colors.icon}
              />
            </View>
            <View style={[styles.formGroup, { flex: 1, justifyContent: 'center' }]}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Enabled</Text>
              <Switch
                value={flagForm.enabled}
                onValueChange={val => setFlagForm(p => ({ ...p, enabled: val }))}
                trackColor={{ false: colors.border, true: colors.success }}
                thumbColor={colors.card}
              />
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  // ==========================================
  // Main Return
  // ==========================================

  if (loading) {
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
      {renderTabs()}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.tint}
          />
        }
      >
        {activeTab === 'flags' ? renderFlagsTab() : renderEarningTab()}
      </ScrollView>

      {renderEditFlagModal()}
      {renderCreateFlagModal()}
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
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
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

  // Tabs
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 12,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Actions
  flagsActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
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
    color: Colors.light.card,
    fontWeight: '600',
    fontSize: 13,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },

  // Filter
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  filterChips: {
    flexDirection: 'row',
    gap: 6,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  statItem: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
  },

  // Flag Card
  flagCard: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  flagCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  flagLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  flagKey: {
    fontSize: 12,
    marginTop: 2,
  },
  flagMeta: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
  flagMetaChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  flagMetaText: {
    fontSize: 11,
    fontWeight: '500',
  },
  flagActions: {
    marginLeft: 12,
  },
  flagActionsBottom: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  actionIconBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Empty
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

  // Earning Config Sections
  configSection: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
  },
  configSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  configSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  subSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
    marginTop: 4,
  },

  // Milestone Row
  milestoneRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  milestoneField: {
    flex: 1,
  },
  milestoneFieldLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 4,
  },
  milestoneInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
  },
  removeMilestoneBtn: {
    padding: 6,
    marginBottom: 2,
  },
  addMilestoneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 8,
    gap: 4,
    marginTop: 4,
  },
  addMilestoneBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Dirty banner
  dirtyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
    marginBottom: 12,
  },
  dirtyBannerText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Form
  formRow: {
    flexDirection: 'row',
    marginBottom: 0,
  },
  formGroup: {
    marginBottom: 14,
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
    color: Colors.light.card,
    fontWeight: '600',
    fontSize: 14,
  },
  formScroll: {
    flex: 1,
  },
  formContent: {
    padding: 16,
    paddingBottom: 40,
  },

  // Key badge
  keyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
    marginBottom: 16,
  },
  keyBadgeText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
