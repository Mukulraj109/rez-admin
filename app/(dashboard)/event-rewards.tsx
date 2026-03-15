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
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { showAlert, showConfirm } from '../../utils/alert';
import {
  adminEventsService,
  EventRewardConfig,
  EventRewardConfigRequest,
  RewardAction,
  REWARD_ACTIONS,
  AdminEvent,
} from '../../services/api/events';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface RewardItem {
  action: RewardAction;
  coins: number;
  dailyLimit?: number;
  requiresVerification: boolean;
}

const DEFAULT_REWARD_ITEM: RewardItem = {
  action: 'entry_reward',
  coins: 10,
  dailyLimit: undefined,
  requiresVerification: false,
};

const DEFAULT_FORM: Partial<EventRewardConfigRequest> = {
  eventId: undefined,
  rewards: [{ ...DEFAULT_REWARD_ITEM }],
  isActive: true,
  validFrom: '',
  validUntil: '',
};

export default function EventRewardsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  // Data states
  const [configs, setConfigs] = useState<EventRewardConfig[]>([]);
  const [globalConfig, setGlobalConfig] = useState<EventRewardConfig | null>(null);
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal states
  const [showFormModal, setShowFormModal] = useState(false);
  const [showEventPicker, setShowEventPicker] = useState(false);
  const [editingConfig, setEditingConfig] = useState<EventRewardConfig | null>(null);
  const [formData, setFormData] = useState<Partial<EventRewardConfigRequest>>(DEFAULT_FORM);
  const [isSaving, setIsSaving] = useState(false);

  // Event search for picker
  const [eventSearch, setEventSearch] = useState('');

  // ==========================================
  // DATA LOADING
  // ==========================================

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [configsData, globalData, eventsData] = await Promise.all([
        adminEventsService.getRewardConfigs(),
        adminEventsService.getGlobalRewardConfig(),
        adminEventsService.getEvents({ limit: 100 }),
      ]);
      setConfigs(configsData.filter(c => !c.isGlobal));
      setGlobalConfig(globalData);
      setEvents(eventsData.events || []);
    } catch (error: any) {
      console.error('Failed to load data:', error);
      showAlert('Error', error.message || 'Failed to load reward configs');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  // ==========================================
  // ACTIONS
  // ==========================================

  const handleCreateNew = () => {
    setEditingConfig(null);
    setFormData({
      ...DEFAULT_FORM,
      rewards: [{ ...DEFAULT_REWARD_ITEM }],
    });
    setShowFormModal(true);
  };

  const handleEdit = (config: EventRewardConfig) => {
    setEditingConfig(config);
    setFormData({
      eventId: config.isGlobal ? undefined : (typeof config.eventId === 'object' ? (config.eventId as AdminEvent)?._id : config.eventId) || undefined,
      rewards: config.rewards.map(r => ({
        action: r.action,
        coins: r.coins,
        dailyLimit: r.dailyLimit,
        requiresVerification: r.requiresVerification,
      })),
      isActive: config.isActive,
      validFrom: config.validFrom || '',
      validUntil: config.validUntil || '',
    });
    setShowFormModal(true);
  };

  const handleSave = async () => {
    if (!formData.rewards || formData.rewards.length === 0) {
      showAlert('Error', 'At least one reward is required');
      return;
    }

    // Validate rewards
    for (const reward of formData.rewards) {
      if (!reward.action) {
        showAlert('Error', 'All rewards must have an action type');
        return;
      }
      if (!reward.coins || reward.coins <= 0) {
        showAlert('Error', 'All rewards must have a positive coin amount');
        return;
      }
    }

    setIsSaving(true);
    try {
      if (editingConfig) {
        await adminEventsService.updateRewardConfig(editingConfig._id, formData);
        showAlert('Success', 'Reward config updated successfully');
      } else {
        await adminEventsService.createRewardConfig(formData as EventRewardConfigRequest);
        showAlert('Success', 'Reward config created successfully');
      }
      setShowFormModal(false);
      await loadData();
    } catch (error: any) {
      showAlert('Error', error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (config: EventRewardConfig) => {
    const name = config.isGlobal ? 'Global Default Config' : config.eventName || 'this reward config';
    showConfirm(
      'Delete Reward Config',
      `Are you sure you want to delete "${name}"?`,
      async () => {
        try {
          await adminEventsService.deleteRewardConfig(config._id);
          showAlert('Success', 'Reward config deleted');
          await loadData();
        } catch (error: any) {
          showAlert('Error', error.message);
        }
      },
      'Delete'
    );
  };

  // ==========================================
  // REWARD ITEMS MANAGEMENT
  // ==========================================

  const addRewardItem = () => {
    setFormData(p => ({
      ...p,
      rewards: [...(p.rewards || []), { ...DEFAULT_REWARD_ITEM }],
    }));
  };

  const removeRewardItem = (index: number) => {
    setFormData(p => ({
      ...p,
      rewards: (p.rewards || []).filter((_, i) => i !== index),
    }));
  };

  const updateRewardItem = (index: number, field: keyof RewardItem, value: any) => {
    setFormData(p => ({
      ...p,
      rewards: (p.rewards || []).map((r, i) => (i === index ? { ...r, [field]: value } : r)),
    }));
  };

  // ==========================================
  // HELPERS
  // ==========================================

  const getActionLabel = (action: RewardAction): string => {
    const found = REWARD_ACTIONS.find(a => a.value === action);
    return found?.label || action;
  };

  const getActionIcon = (action: RewardAction): string => {
    const found = REWARD_ACTIONS.find(a => a.value === action);
    return found?.icon || 'gift-outline';
  };

  const getEventName = (config: EventRewardConfig): string => {
    if (config.isGlobal) return 'Global Default';
    if (config.eventName) return config.eventName;
    if (typeof config.eventId === 'object' && (config.eventId as AdminEvent)?.title) {
      return (config.eventId as AdminEvent).title;
    }
    const event = events.find(e => e._id === config.eventId);
    return event?.title || 'Unknown Event';
  };

  const getTotalCoins = (rewards: EventRewardConfig['rewards']): number => {
    return rewards.reduce((sum, r) => sum + r.coins, 0);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const filteredEvents = events.filter(e =>
    !eventSearch || e.title.toLowerCase().includes(eventSearch.toLowerCase())
  );

  // ==========================================
  // RENDER SECTIONS
  // ==========================================

  const renderHeader = () => (
    <View style={styles.header}>
      <View>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Event Rewards</Text>
        <Text style={[styles.headerSubtitle, { color: colors.icon }]}>
          Manage coin rewards for event actions
        </Text>
      </View>
      <TouchableOpacity
        style={[styles.createBtn, { backgroundColor: colors.tint }]}
        onPress={handleCreateNew}
      >
        <Ionicons name="add" size={20} color={colors.card} />
        <Text style={styles.createBtnText}>Add Config</Text>
      </TouchableOpacity>
    </View>
  );

  const renderGlobalConfig = () => {
    if (!globalConfig) {
      return (
        <TouchableOpacity
          style={[styles.globalCard, styles.globalCardEmpty, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={handleCreateNew}
        >
          <Ionicons name="globe-outline" size={32} color={colors.icon} />
          <Text style={[styles.globalEmptyTitle, { color: colors.text }]}>No Global Default Config</Text>
          <Text style={[styles.globalEmptyText, { color: colors.icon }]}>
            Create a global config to set default rewards for all events
          </Text>
        </TouchableOpacity>
      );
    }

    return (
      <View style={[styles.globalCard, { backgroundColor: colors.card }]}>
        <View style={styles.globalCardHeader}>
          <View style={styles.globalCardTitleRow}>
            <View style={[styles.globalIconBox, { backgroundColor: `${colors.info}20` }]}>
              <Ionicons name="globe" size={24} color={colors.info} />
            </View>
            <View>
              <Text style={[styles.globalTitle, { color: colors.text }]}>Global Default Config</Text>
              <Text style={[styles.globalSubtitle, { color: colors.icon }]}>
                Applies to all events without specific config
              </Text>
            </View>
          </View>
          <View style={[
            styles.activeChip,
            { backgroundColor: globalConfig.isActive ? `${colors.success}15` : `${colors.mutedDark}15` },
          ]}>
            <View style={[
              styles.activeDot,
              { backgroundColor: globalConfig.isActive ? colors.success : colors.mutedDark },
            ]} />
            <Text style={{ color: globalConfig.isActive ? colors.success : colors.mutedDark, fontSize: 11, fontWeight: '600' }}>
              {globalConfig.isActive ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>

        {/* Rewards Preview */}
        <View style={styles.rewardsPreview}>
          {globalConfig.rewards.map((reward, idx) => (
            <View key={idx} style={[styles.rewardPreviewItem, { backgroundColor: colors.background }]}>
              <Ionicons name={getActionIcon(reward.action) as any} size={14} color={colors.tint} />
              <Text style={[styles.rewardPreviewText, { color: colors.text }]}>
                {getActionLabel(reward.action)}
              </Text>
              <Text style={[styles.rewardPreviewCoins, { color: colors.warning }]}>
                {reward.coins} coins
              </Text>
            </View>
          ))}
        </View>

        {/* Summary */}
        <View style={[styles.globalSummary, { borderTopColor: colors.border }]}>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: colors.text }]}>{globalConfig.rewards.length}</Text>
            <Text style={[styles.summaryLabel, { color: colors.icon }]}>Rewards</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: colors.warning }]}>
              {getTotalCoins(globalConfig.rewards)}
            </Text>
            <Text style={[styles.summaryLabel, { color: colors.icon }]}>Total Coins</Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.globalActions}>
          <TouchableOpacity
            style={[styles.globalActionBtn, { backgroundColor: `${colors.info}10` }]}
            onPress={() => handleEdit(globalConfig)}
          >
            <Ionicons name="pencil" size={16} color={colors.info} />
            <Text style={[styles.globalActionText, { color: colors.info }]}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.globalActionBtn, { backgroundColor: `${colors.error}10` }]}
            onPress={() => handleDelete(globalConfig)}
          >
            <Ionicons name="trash" size={16} color={colors.error} />
            <Text style={[styles.globalActionText, { color: colors.error }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderConfigItem = ({ item }: { item: EventRewardConfig }) => (
    <View style={[styles.configCard, { backgroundColor: colors.card }]}>
      {/* Header */}
      <View style={styles.configHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.configEventName, { color: colors.text }]} numberOfLines={1}>
            {getEventName(item)}
          </Text>
          <View style={styles.configMeta}>
            <View style={styles.metaChip}>
              <Ionicons name="gift-outline" size={11} color={colors.icon} />
              <Text style={[styles.metaText, { color: colors.icon }]}>
                {item.rewards.length} reward{item.rewards.length !== 1 ? 's' : ''}
              </Text>
            </View>
            <View style={styles.metaChip}>
              <Ionicons name="logo-bitcoin" size={11} color={colors.warning} />
              <Text style={[styles.metaText, { color: colors.warning }]}>
                {getTotalCoins(item.rewards)} coins
              </Text>
            </View>
          </View>
        </View>
        <View style={[
          styles.activeChip,
          { backgroundColor: item.isActive ? `${colors.success}15` : `${colors.mutedDark}15` },
        ]}>
          <View style={[
            styles.activeDot,
            { backgroundColor: item.isActive ? colors.success : colors.mutedDark },
          ]} />
          <Text style={{ color: item.isActive ? colors.success : colors.mutedDark, fontSize: 11, fontWeight: '600' }}>
            {item.isActive ? 'Active' : 'Inactive'}
          </Text>
        </View>
      </View>

      {/* Rewards list */}
      <View style={[styles.rewardsList, { borderTopColor: colors.border }]}>
        {item.rewards.slice(0, 4).map((reward, idx) => (
          <View key={idx} style={styles.rewardListItem}>
            <Ionicons name={getActionIcon(reward.action) as any} size={14} color={colors.tint} />
            <Text style={[styles.rewardItemAction, { color: colors.text }]} numberOfLines={1}>
              {getActionLabel(reward.action)}
            </Text>
            <Text style={[styles.rewardItemCoins, { color: colors.warning }]}>
              {reward.coins}c
            </Text>
            {reward.dailyLimit && (
              <Text style={[styles.rewardItemLimit, { color: colors.icon }]}>
                ({reward.dailyLimit}/day)
              </Text>
            )}
            {reward.requiresVerification && (
              <Ionicons name="shield-checkmark" size={12} color={colors.purple} />
            )}
          </View>
        ))}
        {item.rewards.length > 4 && (
          <Text style={[styles.moreRewards, { color: colors.icon }]}>
            +{item.rewards.length - 4} more
          </Text>
        )}
      </View>

      {/* Validity */}
      {(item.validFrom || item.validUntil) && (
        <View style={[styles.validityRow, { borderTopColor: colors.border }]}>
          <Ionicons name="time-outline" size={12} color={colors.icon} />
          <Text style={[styles.validityText, { color: colors.icon }]}>
            {item.validFrom ? formatDate(item.validFrom) : 'Start'} - {item.validUntil ? formatDate(item.validUntil) : 'No end'}
          </Text>
        </View>
      )}

      {/* Actions */}
      <View style={[styles.actionRow, { borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.actionIconBtn, { backgroundColor: `${colors.info}10` }]}
          onPress={() => handleEdit(item)}
        >
          <Ionicons name="pencil" size={16} color={colors.info} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionIconBtn, { backgroundColor: `${colors.error}10` }]}
          onPress={() => handleDelete(item)}
        >
          <Ionicons name="trash" size={16} color={colors.error} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="gift-outline" size={48} color={colors.icon} />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>No Event-Specific Configs</Text>
      <Text style={[styles.emptyText, { color: colors.icon }]}>
        Event-specific reward configurations will appear here.
        The global default applies to all events without a specific config.
      </Text>
    </View>
  );

  const renderSectionHeader = () => (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        Event-Specific Configs ({configs.length})
      </Text>
    </View>
  );

  // ==========================================
  // FORM MODAL
  // ==========================================

  const renderFormModal = () => (
    <Modal visible={showFormModal} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => setShowFormModal(false)} style={styles.modalCloseBtn}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: colors.text }]}>
            {editingConfig ? 'Edit Reward Config' : 'Add Reward Config'}
          </Text>
          <TouchableOpacity
            style={[styles.modalSaveBtn, { backgroundColor: colors.tint }]}
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={colors.card} />
            ) : (
              <Text style={styles.modalSaveBtnText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.modalBody}
          contentContainerStyle={styles.modalBodyContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Event Selection */}
          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.text }]}>Event (leave empty for Global Default)</Text>
            <TouchableOpacity
              style={[styles.eventSelectBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => setShowEventPicker(true)}
            >
              {formData.eventId ? (
                <View style={styles.selectedEventRow}>
                  <Ionicons name="calendar" size={16} color={colors.tint} />
                  <Text style={[styles.selectedEventName, { color: colors.text }]} numberOfLines={1}>
                    {events.find(e => e._id === formData.eventId)?.title || 'Selected Event'}
                  </Text>
                  <TouchableOpacity onPress={() => setFormData(p => ({ ...p, eventId: undefined }))}>
                    <Ionicons name="close-circle" size={18} color={colors.icon} />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.eventSelectPlaceholder}>
                  <Ionicons name="globe-outline" size={16} color={colors.icon} />
                  <Text style={[styles.eventSelectPlaceholderText, { color: colors.icon }]}>
                    Global Default (no specific event)
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Rewards Array */}
          <View style={[styles.formSection, { borderColor: colors.border }]}>
            <View style={styles.formSectionHeader}>
              <Ionicons name="gift" size={18} color={colors.tint} />
              <Text style={[styles.formSectionTitle, { color: colors.text }]}>
                Rewards ({(formData.rewards || []).length})
              </Text>
              <View style={{ flex: 1 }} />
              <TouchableOpacity
                style={[styles.addRewardBtn, { backgroundColor: colors.tint }]}
                onPress={addRewardItem}
              >
                <Ionicons name="add" size={16} color={colors.card} />
                <Text style={styles.addRewardBtnText}>Add</Text>
              </TouchableOpacity>
            </View>

            {(formData.rewards || []).map((reward, index) => (
              <View
                key={index}
                style={[styles.rewardFormItem, { backgroundColor: colors.background, borderColor: colors.border }]}
              >
                <View style={styles.rewardFormHeader}>
                  <Text style={[styles.rewardFormIndex, { color: colors.icon }]}>#{index + 1}</Text>
                  <TouchableOpacity onPress={() => removeRewardItem(index)}>
                    <Ionicons name="close-circle" size={20} color={colors.error} />
                  </TouchableOpacity>
                </View>

                {/* Action Type */}
                <View style={styles.formGroup}>
                  <Text style={[styles.formSubLabel, { color: colors.text }]}>Action</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {REWARD_ACTIONS.map(action => (
                      <TouchableOpacity
                        key={action.value}
                        style={[
                          styles.actionChip,
                          { borderColor: colors.border },
                          reward.action === action.value && { backgroundColor: colors.tint, borderColor: colors.tint },
                        ]}
                        onPress={() => updateRewardItem(index, 'action', action.value)}
                      >
                        <Ionicons
                          name={action.icon as any}
                          size={12}
                          color={reward.action === action.value ? colors.card : colors.icon}
                        />
                        <Text
                          style={[
                            styles.actionChipText,
                            { color: reward.action === action.value ? colors.card : colors.text },
                          ]}
                          numberOfLines={1}
                        >
                          {action.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                {/* Coins & Limit */}
                <View style={styles.formRow}>
                  <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                    <Text style={[styles.formSubLabel, { color: colors.text }]}>Coins *</Text>
                    <TextInput
                      style={[styles.formInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                      value={reward.coins ? String(reward.coins) : ''}
                      onChangeText={text => updateRewardItem(index, 'coins', parseInt(text) || 0)}
                      keyboardType="numeric"
                      placeholder="10"
                      placeholderTextColor={colors.icon}
                    />
                  </View>
                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <Text style={[styles.formSubLabel, { color: colors.text }]}>Daily Limit</Text>
                    <TextInput
                      style={[styles.formInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                      value={reward.dailyLimit ? String(reward.dailyLimit) : ''}
                      onChangeText={text => updateRewardItem(index, 'dailyLimit', text ? parseInt(text) : undefined)}
                      keyboardType="numeric"
                      placeholder="No limit"
                      placeholderTextColor={colors.icon}
                    />
                  </View>
                </View>

                {/* Requires Verification */}
                <View style={[styles.switchRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.switchRowLabel, { color: colors.text }]}>Requires Verification</Text>
                    <Text style={[styles.switchRowHint, { color: colors.icon }]}>
                      Admin must verify before coins are awarded
                    </Text>
                  </View>
                  <Switch
                    value={reward.requiresVerification}
                    onValueChange={val => updateRewardItem(index, 'requiresVerification', val)}
                    trackColor={{ true: colors.tint }}
                  />
                </View>
              </View>
            ))}

            {(formData.rewards || []).length === 0 && (
              <View style={styles.noRewardsBox}>
                <Ionicons name="gift-outline" size={24} color={colors.icon} />
                <Text style={[styles.noRewardsText, { color: colors.icon }]}>
                  No rewards added. Tap "Add" to create one.
                </Text>
              </View>
            )}
          </View>

          {/* Validity Dates */}
          <View style={[styles.formSection, { borderColor: colors.border }]}>
            <View style={styles.formSectionHeader}>
              <Ionicons name="time" size={18} color={colors.tint} />
              <Text style={[styles.formSectionTitle, { color: colors.text }]}>Validity Period</Text>
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={[styles.formSubLabel, { color: colors.text }]}>Valid From</Text>
                {Platform.OS === 'web' ? (
                  <View>
                    <input
                      type="date"
                      value={formData.validFrom ? new Date(formData.validFrom).toISOString().split('T')[0] : ''}
                      onChange={(e: any) => {
                        setFormData(p => ({ ...p, validFrom: e.target.value ? new Date(e.target.value).toISOString() : '' }));
                      }}
                      style={{
                        padding: 12,
                        fontSize: 14,
                        borderRadius: 10,
                        border: `1px solid ${colors.border}`,
                        backgroundColor: colors.card,
                        color: colors.text,
                        width: '100%',
                        outline: 'none',
                        fontFamily: 'inherit',
                        cursor: 'pointer',
                      }}
                    />
                  </View>
                ) : (
                  <TextInput
                    style={[styles.formInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                    value={formData.validFrom ? formatDate(formData.validFrom) : ''}
                    onChangeText={text => setFormData(p => ({ ...p, validFrom: text }))}
                    placeholder="Optional start date"
                    placeholderTextColor={colors.icon}
                  />
                )}
              </View>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={[styles.formSubLabel, { color: colors.text }]}>Valid Until</Text>
                {Platform.OS === 'web' ? (
                  <View>
                    <input
                      type="date"
                      value={formData.validUntil ? new Date(formData.validUntil).toISOString().split('T')[0] : ''}
                      onChange={(e: any) => {
                        setFormData(p => ({ ...p, validUntil: e.target.value ? new Date(e.target.value).toISOString() : '' }));
                      }}
                      style={{
                        padding: 12,
                        fontSize: 14,
                        borderRadius: 10,
                        border: `1px solid ${colors.border}`,
                        backgroundColor: colors.card,
                        color: colors.text,
                        width: '100%',
                        outline: 'none',
                        fontFamily: 'inherit',
                        cursor: 'pointer',
                      }}
                    />
                  </View>
                ) : (
                  <TextInput
                    style={[styles.formInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                    value={formData.validUntil ? formatDate(formData.validUntil) : ''}
                    onChangeText={text => setFormData(p => ({ ...p, validUntil: text }))}
                    placeholder="Optional end date"
                    placeholderTextColor={colors.icon}
                  />
                )}
              </View>
            </View>
          </View>

          {/* Active Toggle */}
          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.text }]}>Status</Text>
            <View style={[styles.switchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.switchLabel, { color: colors.icon }]}>
                {formData.isActive !== false ? 'Active' : 'Inactive'}
              </Text>
              <Switch
                value={formData.isActive !== false}
                onValueChange={val => setFormData(p => ({ ...p, isActive: val }))}
                trackColor={{ true: colors.tint }}
              />
            </View>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  // ==========================================
  // EVENT PICKER MODAL
  // ==========================================

  const renderEventPickerModal = () => (
    <Modal visible={showEventPicker} animationType="fade" transparent>
      <View style={styles.pickerOverlay}>
        <View style={[styles.pickerContent, { backgroundColor: colors.card }]}>
          <View style={[styles.pickerHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.pickerTitle, { color: colors.text }]}>Select Event</Text>
            <TouchableOpacity onPress={() => setShowEventPicker(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <View style={[styles.pickerSearchBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Ionicons name="search" size={16} color={colors.icon} />
            <TextInput
              style={[styles.pickerSearchInput, { color: colors.text }]}
              value={eventSearch}
              onChangeText={setEventSearch}
              placeholder="Search events..."
              placeholderTextColor={colors.icon}
            />
          </View>

          <FlatList
            data={filteredEvents}
            keyExtractor={item => item._id}
            style={{ maxHeight: 400 }}
            contentContainerStyle={{ padding: 8 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.pickerItem,
                  { borderColor: colors.border },
                  formData.eventId === item._id && { backgroundColor: `${colors.tint}10`, borderColor: colors.tint },
                ]}
                onPress={() => {
                  setFormData(p => ({ ...p, eventId: item._id }));
                  setShowEventPicker(false);
                  setEventSearch('');
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.pickerItemName, { color: colors.text }]} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={[styles.pickerItemMeta, { color: colors.icon }]}>
                    {formatDate(item.date)} | {item.status}
                  </Text>
                </View>
                {formData.eventId === item._id && (
                  <Ionicons name="checkmark-circle" size={20} color={colors.tint} />
                )}
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.pickerEmpty}>
                <Text style={[styles.pickerEmptyText, { color: colors.icon }]}>No events found</Text>
              </View>
            }
          />
        </View>
      </View>
    </Modal>
  );

  // ==========================================
  // MAIN RENDER
  // ==========================================

  const ListHeader = () => (
    <>
      {renderHeader()}
      {renderGlobalConfig()}
      {renderSectionHeader()}
    </>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
          <Text style={[styles.loadingText, { color: colors.icon }]}>Loading reward configs...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={configs}
        keyExtractor={item => item._id}
        renderItem={renderConfigItem}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {renderFormModal()}
      {renderEventPickerModal()}
    </SafeAreaView>
  );
}

// ==========================================
// STYLES
// ==========================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 20,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  createBtnText: {
    color: Colors.light.card,
    fontWeight: '600',
    fontSize: 14,
  },

  // Global Config Card
  globalCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  globalCardEmpty: {
    alignItems: 'center',
    paddingVertical: 32,
    borderWidth: 2,
    borderStyle: 'dashed',
    gap: 8,
  },
  globalEmptyTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  globalEmptyText: {
    fontSize: 13,
    textAlign: 'center',
  },
  globalCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  globalCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  globalIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  globalTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  globalSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  activeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  rewardsPreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  rewardPreviewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  rewardPreviewText: {
    fontSize: 12,
    fontWeight: '500',
  },
  rewardPreviewCoins: {
    fontSize: 12,
    fontWeight: '700',
  },
  globalSummary: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 12,
    marginBottom: 12,
    gap: 24,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  summaryLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  globalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  globalActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  globalActionText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Section
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },

  // Config Card
  configCard: {
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 14,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  configHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  configEventName: {
    fontSize: 15,
    fontWeight: '600',
  },
  configMeta: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaText: {
    fontSize: 11,
  },
  rewardsList: {
    borderTopWidth: 1,
    paddingTop: 10,
    gap: 6,
  },
  rewardListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rewardItemAction: {
    flex: 1,
    fontSize: 13,
  },
  rewardItemCoins: {
    fontSize: 13,
    fontWeight: '700',
  },
  rewardItemLimit: {
    fontSize: 11,
  },
  moreRewards: {
    fontSize: 11,
    marginTop: 4,
  },
  validityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderTopWidth: 1,
    paddingTop: 8,
    marginTop: 8,
  },
  validityText: {
    fontSize: 11,
  },

  // Actions
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 10,
    marginTop: 10,
    borderTopWidth: 1,
  },
  actionIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },

  // Modal
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalSaveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  modalSaveBtnText: {
    color: Colors.light.card,
    fontWeight: '600',
    fontSize: 14,
  },
  modalBody: {
    flex: 1,
  },
  modalBodyContent: {
    padding: 16,
  },

  // Form
  formGroup: {
    marginBottom: 14,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  formSubLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  formInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
  },
  formRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  formSection: {
    marginBottom: 16,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  formSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  formSectionTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  switchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  switchLabel: {
    fontSize: 14,
  },

  // Event Select
  eventSelectBtn: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
  },
  selectedEventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectedEventName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  eventSelectPlaceholder: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eventSelectPlaceholderText: {
    fontSize: 14,
  },

  // Reward Form Items
  addRewardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  addRewardBtnText: {
    color: Colors.light.card,
    fontSize: 12,
    fontWeight: '600',
  },
  rewardFormItem: {
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
  },
  rewardFormHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  rewardFormIndex: {
    fontSize: 12,
    fontWeight: '700',
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
    marginRight: 6,
  },
  actionChipText: {
    fontSize: 11,
    fontWeight: '500',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    gap: 12,
  },
  switchRowLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  switchRowHint: {
    fontSize: 11,
    marginTop: 2,
  },
  noRewardsBox: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  noRewardsText: {
    fontSize: 13,
    textAlign: 'center',
  },

  // Event Picker Modal
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  pickerContent: {
    borderRadius: 16,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  pickerSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  pickerSearchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 6,
    gap: 10,
  },
  pickerItemName: {
    fontSize: 14,
    fontWeight: '500',
  },
  pickerItemMeta: {
    fontSize: 11,
    marginTop: 2,
  },
  pickerEmpty: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  pickerEmptyText: {
    fontSize: 14,
  },
});
