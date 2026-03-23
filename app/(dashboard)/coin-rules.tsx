import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  ActivityIndicator,
  RefreshControl,
  useColorScheme,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { showAlert, showConfirm } from '../../utils/alert';
import {
  coinRulesService,
  CoinExpiryConfig,
  MultiplierRule,
  DailyCaps,
} from '../../services/api/coinRules';

// ── Types ──

type TabKey = 'expiry' | 'multipliers' | 'caps';

interface CoinRulesState {
  expiryConfig: CoinExpiryConfig;
  multiplierRules: MultiplierRule[];
  dailyCaps: DailyCaps;
}

const DEFAULT_STATE: CoinRulesState = {
  expiryConfig: {
    rez: { expiryDays: 0, maxUsagePct: 100 },
    prive: { expiryDays: 365, maxUsagePct: 100 },
    promo: { expiryDays: 90, maxUsagePct: 20 },
    branded: { expiryDays: 0, maxUsagePct: 100 },
  },
  multiplierRules: [],
  dailyCaps: { perUserPerDay: 10000, globalDailyIssuance: 5000000, perTransactionMax: 2000 },
};

const COIN_TYPES = [
  { key: 'rez' as const, label: 'REZ Coins', color: '#3B82F6', hint: '0 = never expires. Main reward coins.' },
  { key: 'branded' as const, label: 'Branded Coins', color: '#10B981', hint: 'Merchant-specific coins.' },
  { key: 'promo' as const, label: 'Promo Coins', color: '#F59E0B', hint: 'Campaign-based promotional coins.' },
  { key: 'prive' as const, label: 'Prive Coins', color: '#8B5CF6', hint: 'Premium tier coins for Prive members.' },
] as const;

const RULE_TYPE_OPTIONS: { value: MultiplierRule['type']; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'category', label: 'Category', icon: 'grid-outline' },
  { value: 'time_based', label: 'Time Based', icon: 'time-outline' },
  { value: 'event', label: 'Event', icon: 'calendar-outline' },
  { value: 'subscription', label: 'Subscription', icon: 'diamond-outline' },
];

const TABS: { key: TabKey; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'expiry', label: 'Expiry Rules', icon: 'hourglass-outline' },
  { key: 'multipliers', label: 'Multipliers', icon: 'flash-outline' },
  { key: 'caps', label: 'Daily Caps', icon: 'speedometer-outline' },
];

const EMPTY_RULE: MultiplierRule = {
  name: '',
  coinType: 'rez',
  multiplier: 1.5,
  type: 'category',
  isActive: false,
  startDate: undefined,
  endDate: undefined,
  conditions: '',
  categories: [],
};

// ── Component ──

export default function CoinRulesScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('expiry');
  const [data, setData] = useState<CoinRulesState>(DEFAULT_STATE);

  // Multiplier rule form
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [ruleForm, setRuleForm] = useState<MultiplierRule>({ ...EMPTY_RULE });

  // ── Data Loading ──

  const loadData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const result = await coinRulesService.getRules();
      setData({
        expiryConfig: result.expiryConfig || DEFAULT_STATE.expiryConfig,
        multiplierRules: result.multiplierRules || [],
        dailyCaps: result.dailyCaps || DEFAULT_STATE.dailyCaps,
      });
      setDirty(false);
    } catch (err: any) {
      setError(err.message || 'Failed to load coin rules');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Path-Based Update (deep set via dot path) ──

  const updateField = useCallback((path: string, value: number | boolean | string) => {
    setData(prev => {
      const updated = JSON.parse(JSON.stringify(prev));
      const keys = path.split('.');
      let obj: any = updated;
      for (let i = 0; i < keys.length - 1; i++) obj = obj[keys[i]];
      obj[keys[keys.length - 1]] = value;
      return updated;
    });
    setDirty(true);
  }, []);

  // ── Save Handler ──

  const handleSave = async () => {
    try {
      setSaving(true);
      await coinRulesService.updateRules({
        expiryConfig: data.expiryConfig,
        multiplierRules: data.multiplierRules,
        dailyCaps: data.dailyCaps,
      });
      showAlert('Success', 'Coin rules saved successfully');
      setDirty(false);
    } catch (err: any) {
      showAlert('Error', err.message || 'Failed to save coin rules');
    } finally {
      setSaving(false);
    }
  };

  // ── Multiplier Rule CRUD ──

  const resetRuleForm = () => {
    setRuleForm({ ...EMPTY_RULE });
    setEditingIndex(null);
    setShowAddForm(false);
  };

  const handleAddRule = async () => {
    if (!ruleForm.name.trim()) {
      showAlert('Validation', 'Rule name is required');
      return;
    }
    if (ruleForm.multiplier < 0.1 || ruleForm.multiplier > 10) {
      showAlert('Validation', 'Multiplier must be between 0.1 and 10.0');
      return;
    }

    try {
      setSaving(true);
      await coinRulesService.addMultiplierRule(ruleForm);
      showAlert('Success', 'Multiplier rule added');
      resetRuleForm();
      await loadData();
    } catch (err: any) {
      showAlert('Error', err.message || 'Failed to add rule');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateRule = async () => {
    if (editingIndex === null) return;
    if (!ruleForm.name.trim()) {
      showAlert('Validation', 'Rule name is required');
      return;
    }

    try {
      setSaving(true);
      await coinRulesService.updateMultiplierRule(editingIndex, ruleForm);
      showAlert('Success', 'Multiplier rule updated');
      resetRuleForm();
      await loadData();
    } catch (err: any) {
      showAlert('Error', err.message || 'Failed to update rule');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRule = (index: number) => {
    const ruleName = data.multiplierRules[index]?.name || `Rule #${index + 1}`;
    showConfirm(
      'Delete Rule',
      `Are you sure you want to delete "${ruleName}"?`,
      async () => {
        try {
          setSaving(true);
          await coinRulesService.deleteMultiplierRule(index);
          showAlert('Success', 'Multiplier rule deleted');
          await loadData();
        } catch (err: any) {
          showAlert('Error', err.message || 'Failed to delete rule');
        } finally {
          setSaving(false);
        }
      }
    );
  };

  const startEditRule = (index: number) => {
    const rule = data.multiplierRules[index];
    setRuleForm({ ...rule });
    setEditingIndex(index);
    setShowAddForm(true);
  };

  const toggleRuleActive = async (index: number) => {
    const rule = data.multiplierRules[index];
    try {
      await coinRulesService.updateMultiplierRule(index, { isActive: !rule.isActive });
      await loadData();
    } catch (err: any) {
      showAlert('Error', err.message || 'Failed to toggle rule');
    }
  };

  // ── Render Helpers ──

  const renderNumberInput = (label: string, path: string, value: number, opts?: { suffix?: string; placeholder?: string }) => (
    <View style={styles.fieldRow} key={path}>
      <Text style={[styles.fieldLabel, { color: colors.text }]}>
        {label}{opts?.suffix ? ` (${opts.suffix})` : ''}
      </Text>
      <TextInput
        style={[styles.fieldInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
        value={String(value)}
        onChangeText={t => updateField(path, parseFloat(t) || 0)}
        keyboardType="numeric"
        selectTextOnFocus
        placeholder={opts?.placeholder}
        placeholderTextColor={colors.muted}
      />
    </View>
  );

  const renderSlider = (label: string, path: string, value: number, min: number, max: number) => (
    <View style={styles.sliderRow} key={path}>
      <View style={styles.sliderHeader}>
        <Text style={[styles.fieldLabel, { color: colors.text }]}>{label}</Text>
        <Text style={[styles.sliderValue, { color: colors.purple }]}>{value}%</Text>
      </View>
      <View style={[styles.sliderTrack, { backgroundColor: colors.gray200 }]}>
        <View style={[styles.sliderFill, { width: `${((value - min) / (max - min)) * 100}%`, backgroundColor: colors.purple }]} />
      </View>
      <View style={styles.sliderActions}>
        <TouchableOpacity
          style={[styles.sliderBtn, { borderColor: colors.border }]}
          onPress={() => updateField(path, Math.max(min, value - 5))}
        >
          <Ionicons name="remove" size={14} color={colors.text} />
        </TouchableOpacity>
        <TextInput
          style={[styles.sliderInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
          value={String(value)}
          onChangeText={t => {
            const v = parseInt(t, 10);
            if (!isNaN(v) && v >= min && v <= max) updateField(path, v);
          }}
          keyboardType="numeric"
          selectTextOnFocus
        />
        <TouchableOpacity
          style={[styles.sliderBtn, { borderColor: colors.border }]}
          onPress={() => updateField(path, Math.min(max, value + 5))}
        >
          <Ionicons name="add" size={14} color={colors.text} />
        </TouchableOpacity>
      </View>
    </View>
  );

  // ── Tab: Expiry Rules ──

  const renderExpiryTab = () => (
    <View>
      <View style={[styles.infoBanner, { backgroundColor: colors.infoLight }]}>
        <Ionicons name="information-circle" size={16} color={colors.info} />
        <Text style={[styles.infoText, { color: colors.info }]}>
          expiryDays = 0 means never expires. maxUsagePct is the max % of any bill payable with this coin type. Changes affect new issuances only.
        </Text>
      </View>

      {COIN_TYPES.map(({ key: coinType, label, color, hint }) => {
        const cfg = data.expiryConfig[coinType] || { expiryDays: 0, maxUsagePct: 100 };
        const neverExpires = cfg.expiryDays === 0;

        return (
          <View key={coinType} style={[styles.coinCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.coinCardHeader}>
              <View style={[styles.coinDot, { backgroundColor: color }]} />
              <Text style={[styles.coinCardTitle, { color: colors.text }]}>{label}</Text>
              {neverExpires && (
                <View style={[styles.badge, { backgroundColor: colors.successLight }]}>
                  <Text style={[styles.badgeText, { color: colors.successDark }]}>NEVER EXPIRES</Text>
                </View>
              )}
            </View>
            <Text style={[styles.coinHint, { color: colors.muted }]}>{hint}</Text>

            {renderNumberInput('Expiry Days', `expiryConfig.${coinType}.expiryDays`, cfg.expiryDays, { placeholder: '0' })}
            {renderSlider('Max Usage % per Bill', `expiryConfig.${coinType}.maxUsagePct`, cfg.maxUsagePct, 0, 100)}
          </View>
        );
      })}

      <View style={[styles.warningBanner, { backgroundColor: colors.warningLight }]}>
        <Ionicons name="warning" size={14} color={colors.warningDark} />
        <Text style={[styles.warningText, { color: colors.warningDeep }]}>
          Expiry changes affect coins issued from this point onward. Existing wallet coins keep their original expiry. maxUsagePct changes are immediate.
        </Text>
      </View>
    </View>
  );

  // ── Tab: Multiplier Rules ──

  const renderMultipliersTab = () => (
    <View>
      {/* Add button */}
      <TouchableOpacity
        style={[styles.addButton, { backgroundColor: colors.purple }]}
        onPress={() => { resetRuleForm(); setShowAddForm(true); }}
      >
        <Ionicons name="add-circle" size={18} color="#fff" />
        <Text style={styles.addButtonText}>Add Multiplier Rule</Text>
      </TouchableOpacity>

      {/* Add / Edit Form */}
      {showAddForm && (
        <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.purple }]}>
          <Text style={[styles.formTitle, { color: colors.text }]}>
            {editingIndex !== null ? 'Edit Rule' : 'New Multiplier Rule'}
          </Text>

          {/* Name */}
          <View style={styles.formField}>
            <Text style={[styles.formLabel, { color: colors.text }]}>Rule Name *</Text>
            <TextInput
              style={[styles.formInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
              value={ruleForm.name}
              onChangeText={t => setRuleForm(prev => ({ ...prev, name: t }))}
              placeholder="e.g. Weekend 2x Bonus"
              placeholderTextColor={colors.muted}
            />
          </View>

          {/* Coin Type */}
          <View style={styles.formField}>
            <Text style={[styles.formLabel, { color: colors.text }]}>Coin Type</Text>
            <View style={styles.chipRow}>
              {COIN_TYPES.map(ct => (
                <TouchableOpacity
                  key={ct.key}
                  style={[styles.chip, { borderColor: ct.color }, ruleForm.coinType === ct.key && { backgroundColor: ct.color }]}
                  onPress={() => setRuleForm(prev => ({ ...prev, coinType: ct.key }))}
                >
                  <Text style={[styles.chipText, { color: ct.color }, ruleForm.coinType === ct.key && { color: '#fff' }]}>
                    {ct.label.replace(' Coins', '')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Multiplier */}
          <View style={styles.formField}>
            <Text style={[styles.formLabel, { color: colors.text }]}>Multiplier (0.1 - 10.0)</Text>
            <TextInput
              style={[styles.formInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
              value={String(ruleForm.multiplier)}
              onChangeText={t => setRuleForm(prev => ({ ...prev, multiplier: parseFloat(t) || 0 }))}
              keyboardType="numeric"
              selectTextOnFocus
            />
          </View>

          {/* Rule Type */}
          <View style={styles.formField}>
            <Text style={[styles.formLabel, { color: colors.text }]}>Rule Type</Text>
            <View style={styles.chipRow}>
              {RULE_TYPE_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.chip,
                    { borderColor: colors.border },
                    ruleForm.type === opt.value && { backgroundColor: colors.navy, borderColor: colors.navy },
                  ]}
                  onPress={() => setRuleForm(prev => ({ ...prev, type: opt.value }))}
                >
                  <Ionicons
                    name={opt.icon}
                    size={12}
                    color={ruleForm.type === opt.value ? '#fff' : colors.text}
                    style={{ marginRight: 4 }}
                  />
                  <Text style={[styles.chipText, { color: colors.text }, ruleForm.type === opt.value && { color: '#fff' }]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Categories */}
          <View style={styles.formField}>
            <Text style={[styles.formLabel, { color: colors.text }]}>Categories (comma-separated)</Text>
            <TextInput
              style={[styles.formInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
              value={(ruleForm.categories || []).join(', ')}
              onChangeText={t => setRuleForm(prev => ({ ...prev, categories: t.split(',').map(s => s.trim()).filter(Boolean) }))}
              placeholder="e.g. food-dining, electronics"
              placeholderTextColor={colors.muted}
            />
          </View>

          {/* Date Range */}
          <View style={styles.formField}>
            <Text style={[styles.formLabel, { color: colors.text }]}>Start Date (YYYY-MM-DD)</Text>
            <TextInput
              style={[styles.formInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
              value={ruleForm.startDate ? String(ruleForm.startDate).substring(0, 10) : ''}
              onChangeText={t => setRuleForm(prev => ({ ...prev, startDate: t || undefined }))}
              placeholder="Leave empty for no start limit"
              placeholderTextColor={colors.muted}
            />
          </View>
          <View style={styles.formField}>
            <Text style={[styles.formLabel, { color: colors.text }]}>End Date (YYYY-MM-DD)</Text>
            <TextInput
              style={[styles.formInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
              value={ruleForm.endDate ? String(ruleForm.endDate).substring(0, 10) : ''}
              onChangeText={t => setRuleForm(prev => ({ ...prev, endDate: t || undefined }))}
              placeholder="Leave empty for no end limit"
              placeholderTextColor={colors.muted}
            />
          </View>

          {/* Active toggle */}
          <View style={[styles.fieldRow, { marginTop: 8 }]}>
            <Text style={[styles.formLabel, { color: colors.text }]}>Active</Text>
            <Switch
              value={ruleForm.isActive}
              onValueChange={v => setRuleForm(prev => ({ ...prev, isActive: v }))}
              trackColor={{ false: colors.border, true: `${colors.purple}60` }}
              thumbColor={ruleForm.isActive ? colors.purple : '#f4f3f4'}
            />
          </View>

          {/* Form actions */}
          <View style={styles.formActions}>
            <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.border }]} onPress={resetRuleForm}>
              <Text style={[styles.cancelBtnText, { color: colors.text }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: colors.purple }]}
              onPress={editingIndex !== null ? handleUpdateRule : handleAddRule}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>
                  {editingIndex !== null ? 'Update Rule' : 'Add Rule'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Rules list */}
      {data.multiplierRules.length === 0 ? (
        <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.backgroundSecondary }]}>
            <Ionicons name="flash-outline" size={32} color={colors.muted} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No Multiplier Rules</Text>
          <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
            Add rules to boost coin earnings for specific categories, events, or subscription tiers.
          </Text>
        </View>
      ) : (
        data.multiplierRules.map((rule, index) => {
          const coinInfo = COIN_TYPES.find(c => c.key === rule.coinType);
          const typeInfo = RULE_TYPE_OPTIONS.find(r => r.value === rule.type);
          return (
            <View key={index} style={[styles.ruleCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.ruleHeader}>
                <View style={styles.ruleHeaderLeft}>
                  <View style={[styles.coinDot, { backgroundColor: coinInfo?.color || colors.muted }]} />
                  <Text style={[styles.ruleName, { color: colors.text }]}>{rule.name || `Rule #${index + 1}`}</Text>
                </View>
                <Switch
                  value={rule.isActive}
                  onValueChange={() => toggleRuleActive(index)}
                  trackColor={{ false: colors.border, true: `${colors.success}60` }}
                  thumbColor={rule.isActive ? colors.success : '#f4f3f4'}
                />
              </View>

              <View style={styles.ruleDetails}>
                <View style={[styles.ruleTag, { backgroundColor: `${coinInfo?.color || colors.muted}15` }]}>
                  <Text style={[styles.ruleTagText, { color: coinInfo?.color }]}>{coinInfo?.label || rule.coinType}</Text>
                </View>
                <View style={[styles.ruleTag, { backgroundColor: `${colors.info}15` }]}>
                  <Text style={[styles.ruleTagText, { color: colors.info }]}>{rule.multiplier}x</Text>
                </View>
                {typeInfo && (
                  <View style={[styles.ruleTag, { backgroundColor: `${colors.purple}15` }]}>
                    <Ionicons name={typeInfo.icon} size={11} color={colors.purple} style={{ marginRight: 3 }} />
                    <Text style={[styles.ruleTagText, { color: colors.purple }]}>{typeInfo.label}</Text>
                  </View>
                )}
                {rule.isActive ? (
                  <View style={[styles.ruleTag, { backgroundColor: colors.successLight }]}>
                    <Text style={[styles.ruleTagText, { color: colors.successDark }]}>ACTIVE</Text>
                  </View>
                ) : (
                  <View style={[styles.ruleTag, { backgroundColor: colors.gray100 }]}>
                    <Text style={[styles.ruleTagText, { color: colors.muted }]}>INACTIVE</Text>
                  </View>
                )}
              </View>

              {(rule.categories || []).length > 0 && (
                <Text style={[styles.ruleMeta, { color: colors.muted }]}>
                  Categories: {(rule.categories || []).join(', ')}
                </Text>
              )}

              {(rule.startDate || rule.endDate) && (
                <Text style={[styles.ruleMeta, { color: colors.muted }]}>
                  {rule.startDate ? `From: ${String(rule.startDate).substring(0, 10)}` : ''}
                  {rule.startDate && rule.endDate ? '  |  ' : ''}
                  {rule.endDate ? `To: ${String(rule.endDate).substring(0, 10)}` : ''}
                </Text>
              )}

              <View style={[styles.ruleActions, { borderTopColor: colors.borderLight }]}>
                <TouchableOpacity style={styles.ruleActionBtn} onPress={() => startEditRule(index)}>
                  <Ionicons name="create-outline" size={16} color={colors.info} />
                  <Text style={[styles.ruleActionText, { color: colors.info }]}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.ruleActionBtn} onPress={() => handleDeleteRule(index)}>
                  <Ionicons name="trash-outline" size={16} color={colors.error} />
                  <Text style={[styles.ruleActionText, { color: colors.error }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })
      )}
    </View>
  );

  // ── Tab: Daily Caps ──

  const renderCapsTab = () => (
    <View>
      <View style={[styles.infoBanner, { backgroundColor: colors.infoLight }]}>
        <Ionicons name="information-circle" size={16} color={colors.info} />
        <Text style={[styles.infoText, { color: colors.info }]}>
          Daily caps limit how many coins can be issued. Set to 0 for no limit (not recommended for production).
        </Text>
      </View>

      <View style={[styles.capsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.capsHeader}>
          <Ionicons name="person" size={18} color={colors.info} />
          <Text style={[styles.capsTitle, { color: colors.text }]}>Per-User Limits</Text>
        </View>
        {renderNumberInput('Per User Per Day', 'dailyCaps.perUserPerDay', data.dailyCaps.perUserPerDay, { suffix: 'coins' })}
        {renderNumberInput('Per Transaction Max', 'dailyCaps.perTransactionMax', data.dailyCaps.perTransactionMax, { suffix: 'coins' })}
      </View>

      <View style={[styles.capsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.capsHeader}>
          <Ionicons name="globe" size={18} color={colors.purple} />
          <Text style={[styles.capsTitle, { color: colors.text }]}>Platform Limits</Text>
        </View>
        {renderNumberInput('Global Daily Issuance', 'dailyCaps.globalDailyIssuance', data.dailyCaps.globalDailyIssuance, { suffix: 'coins' })}
      </View>

      {/* Summary card */}
      <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.summaryTitle, { color: colors.text }]}>Current Limits Summary</Text>
        <View style={[styles.summaryRow, { borderBottomColor: colors.borderLight }]}>
          <Text style={[styles.summaryLabel, { color: colors.muted }]}>User daily max</Text>
          <Text style={[styles.summaryValue, { color: colors.text }]}>{data.dailyCaps.perUserPerDay.toLocaleString()} coins</Text>
        </View>
        <View style={[styles.summaryRow, { borderBottomColor: colors.borderLight }]}>
          <Text style={[styles.summaryLabel, { color: colors.muted }]}>Per transaction max</Text>
          <Text style={[styles.summaryValue, { color: colors.text }]}>{data.dailyCaps.perTransactionMax.toLocaleString()} coins</Text>
        </View>
        <View style={[styles.summaryRow, { borderBottomColor: colors.borderLight }]}>
          <Text style={[styles.summaryLabel, { color: colors.muted }]}>Platform daily limit</Text>
          <Text style={[styles.summaryValue, { color: colors.text }]}>{data.dailyCaps.globalDailyIssuance.toLocaleString()} coins</Text>
        </View>
      </View>
    </View>
  );

  // ── Loading State ──

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
        <Text style={[styles.loadingText, { color: colors.muted }]}>Loading coin rules...</Text>
      </View>
    );
  }

  // ── Error State ──

  if (error) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <Ionicons name="alert-circle" size={48} color={colors.error} />
        <Text style={[styles.errorText, { color: colors.text }]}>{error}</Text>
        <TouchableOpacity style={[styles.retryButton, { backgroundColor: colors.navy }]} onPress={() => loadData()}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Main Render ──

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <Ionicons name="settings-outline" size={22} color={colors.purple} />
          <Text style={[styles.headerTitle, { color: colors.text }]}>Coin Rules Engine</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => loadData(true)} style={styles.iconBtn}>
            <Ionicons name="refresh" size={20} color={colors.tint} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.saveButton,
              { backgroundColor: dirty ? colors.navy : colors.muted },
            ]}
            onPress={handleSave}
            disabled={!dirty || saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="save" size={16} color="#fff" />
                <Text style={styles.saveButtonText}>Save</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Tab Bar */}
      <View style={[styles.tabBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {TABS.map(tab => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, isActive && { borderBottomColor: colors.purple, borderBottomWidth: 2 }]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Ionicons name={tab.icon} size={16} color={isActive ? colors.purple : colors.muted} />
              <Text style={[styles.tabText, { color: isActive ? colors.purple : colors.muted }]}>{tab.label}</Text>
              {tab.key === 'multipliers' && data.multiplierRules.length > 0 && (
                <View style={[styles.tabBadge, { backgroundColor: colors.purple }]}>
                  <Text style={styles.tabBadgeText}>{data.multiplierRules.length}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Content */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} colors={[colors.tint]} />}
        keyboardShouldPersistTaps="handled"
      >
        {activeTab === 'expiry' && renderExpiryTab()}
        {activeTab === 'multipliers' && renderMultipliersTab()}
        {activeTab === 'caps' && renderCapsTab()}

        {/* Bottom save bar (always visible) */}
        <TouchableOpacity
          style={[styles.bottomSave, { backgroundColor: dirty ? colors.navy : colors.muted }]}
          onPress={handleSave}
          disabled={!dirty || saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.bottomSaveText}>{dirty ? 'Save All Changes' : 'No Changes'}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

// ── Styles ──

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { marginTop: 12, fontSize: 14 },
  errorText: { marginTop: 12, fontSize: 15, textAlign: 'center' },
  retryButton: { marginTop: 16, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12 },
  retryButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: { padding: 8 },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveButtonText: { fontWeight: '600', color: '#fff', fontSize: 14 },

  // Tabs
  tabBar: { flexDirection: 'row', borderBottomWidth: 1, paddingHorizontal: 8 },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  tabText: { fontSize: 13, fontWeight: '600' },
  tabBadge: { borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1, marginLeft: 4 },
  tabBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  // Content
  scrollContent: { padding: 16, paddingBottom: 60 },

  // Info / Warning banners
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  infoText: { fontSize: 12, lineHeight: 18, flex: 1 },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    gap: 6,
  },
  warningText: { fontSize: 12, lineHeight: 18, flex: 1 },

  // Coin expiry cards
  coinCard: { borderRadius: 12, borderWidth: 1, padding: 16, marginBottom: 12 },
  coinCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  coinDot: { width: 10, height: 10, borderRadius: 5 },
  coinCardTitle: { fontSize: 15, fontWeight: '700', flex: 1 },
  coinHint: { fontSize: 12, marginBottom: 8 },
  badge: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { fontSize: 10, fontWeight: '700' },

  // Shared fields
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  fieldLabel: { fontSize: 13, fontWeight: '600', flex: 1 },
  fieldInput: {
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    minWidth: 120,
    textAlign: 'right',
    fontSize: 14,
  },

  // Slider
  sliderRow: { marginTop: 14 },
  sliderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sliderValue: { fontSize: 16, fontWeight: '700' },
  sliderTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  sliderFill: { height: '100%', borderRadius: 3 },
  sliderActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8 },
  sliderBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sliderInput: { borderRadius: 8, padding: 6, borderWidth: 1, width: 60, textAlign: 'center', fontSize: 14 },

  // Multiplier rules
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  addButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  // Form
  formCard: { borderRadius: 12, borderWidth: 2, padding: 16, marginBottom: 16 },
  formTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  formField: { marginBottom: 12 },
  formLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  formInput: { borderRadius: 8, padding: 12, borderWidth: 1, fontSize: 14 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  chipText: { fontSize: 12, fontWeight: '600' },
  formActions: { flexDirection: 'row', gap: 8, marginTop: 16 },
  cancelBtn: { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  cancelBtnText: { fontWeight: '600', fontSize: 14 },
  submitBtn: { flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  // Rule card
  ruleCard: { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 10 },
  ruleHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ruleHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  ruleName: { fontSize: 15, fontWeight: '700' },
  ruleDetails: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  ruleTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  ruleTagText: { fontSize: 12, fontWeight: '600' },
  ruleMeta: { fontSize: 12, marginTop: 6 },
  ruleActions: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  ruleActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ruleActionText: { fontSize: 13, fontWeight: '600' },

  // Empty state
  emptyState: { borderRadius: 12, borderWidth: 1, padding: 32, alignItems: 'center' },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', marginBottom: 6 },
  emptySubtitle: { fontSize: 13, textAlign: 'center', lineHeight: 20 },

  // Caps
  capsCard: { borderRadius: 12, borderWidth: 1, padding: 16, marginBottom: 12 },
  capsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  capsTitle: { fontSize: 15, fontWeight: '700' },

  // Summary
  summaryCard: { borderRadius: 12, borderWidth: 1, padding: 16, marginTop: 8 },
  summaryTitle: { fontSize: 14, fontWeight: '700', marginBottom: 12 },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  summaryLabel: { fontSize: 13 },
  summaryValue: { fontSize: 14, fontWeight: '700' },

  // Bottom save
  bottomSave: { borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 16 },
  bottomSaveText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
