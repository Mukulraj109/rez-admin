'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  useColorScheme,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { showAlert } from '../../utils/alert';
import { apiClient } from '../../services/api/apiClient';

// --- Types ---

interface GlobalCashbackSettings {
  defaultCashbackRate: number;
  maxCashbackPerTransaction: number;
  minOrderForCashback: number;
}

interface CategoryMultiplier {
  id: string;
  categoryName: string;
  multiplier: number;
}

interface CashbackCampaign {
  _id: string;
  name: string;
  multiplier: number;
  status: string;
  startDate: string;
  endDate: string;
}

type SectionKey = 'global' | 'categories' | 'campaigns';

const SECTIONS: { key: SectionKey; title: string; icon: keyof typeof Ionicons.glyphMap; color: string }[] = [
  { key: 'global', title: 'Global Cashback Settings', icon: 'cash', color: Colors.light.success },
  { key: 'categories', title: 'Category Multipliers', icon: 'grid', color: Colors.light.warning },
  { key: 'campaigns', title: 'Active Cashback Campaigns', icon: 'megaphone', color: Colors.light.purple },
];

// --- Default data ---

const DEFAULT_GLOBAL: GlobalCashbackSettings = {
  defaultCashbackRate: 5,
  maxCashbackPerTransaction: 100,
  minOrderForCashback: 10,
};

const DEFAULT_CATEGORIES: CategoryMultiplier[] = [
  { id: '1', categoryName: 'Food & Dining', multiplier: 2 },
  { id: '2', categoryName: 'Shopping', multiplier: 1.5 },
  { id: '3', categoryName: 'Travel', multiplier: 1.5 },
  { id: '4', categoryName: 'Entertainment', multiplier: 1.2 },
  { id: '5', categoryName: 'Health & Wellness', multiplier: 1.3 },
];

let nextCategoryId = 6;

export default function CashbackRulesScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [campaignsLoading, setCampaignsLoading] = useState(true);
  const [campaignsError, setCampaignsError] = useState<string | null>(null);

  const [collapsed, setCollapsed] = useState<Record<SectionKey, boolean>>({
    global: false,
    categories: false,
    campaigns: false,
  });

  const [globalSettings, setGlobalSettings] = useState<GlobalCashbackSettings>({ ...DEFAULT_GLOBAL });
  const [categories, setCategories] = useState<CategoryMultiplier[]>(DEFAULT_CATEGORIES.map(c => ({ ...c })));
  const [campaigns, setCampaigns] = useState<CashbackCampaign[]>([]);

  // --- Fetch campaigns from existing endpoint ---

  const loadCampaigns = useCallback(async () => {
    try {
      setCampaignsLoading(true);
      setCampaignsError(null);
      const response = await apiClient.get<any>('admin/double-campaigns');
      if (response.success && response.data) {
        const list = Array.isArray(response.data) ? response.data : response.data.campaigns || [];
        setCampaigns(list.map((c: any) => ({
          _id: c._id || c.id || '',
          name: c.name || c.title || 'Unnamed',
          multiplier: c.multiplier || c.cashbackMultiplier || 1,
          status: c.status || (c.isActive ? 'active' : 'inactive'),
          startDate: c.startDate || c.start || '',
          endDate: c.endDate || c.end || '',
        })));
      } else {
        setCampaignsError(response.message || 'Failed to load campaigns');
      }
    } catch (err: any) {
      setCampaignsError(err.message || 'Failed to load campaigns');
    } finally {
      setCampaignsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  // --- Handlers ---

  const toggleSection = (key: SectionKey) => {
    setCollapsed(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadCampaigns();
    setRefreshing(false);
  }, [loadCampaigns]);

  const handleSave = async () => {
    // Validate
    if (globalSettings.defaultCashbackRate < 0 || globalSettings.defaultCashbackRate > 100) {
      showAlert('Validation Error', 'Cashback rate must be between 0 and 100');
      return;
    }
    if (globalSettings.maxCashbackPerTransaction <= 0) {
      showAlert('Validation Error', 'Max cashback per transaction must be positive');
      return;
    }
    if (categories.some(c => !c.categoryName.trim())) {
      showAlert('Validation Error', 'All categories must have a name');
      return;
    }
    if (categories.some(c => c.multiplier <= 0)) {
      showAlert('Validation Error', 'All multipliers must be greater than 0');
      return;
    }

    try {
      setSaving(true);
      const payload = { globalSettings, categoryMultipliers: categories };
      const response = await apiClient.post('admin/cashback-rules', payload);
      if (response.success) {
        showAlert('Success', 'Cashback rules saved successfully');
        setDirty(false);
      } else {
        showAlert('Error', response.message || 'Failed to save cashback rules');
      }
    } catch (err: any) {
      showAlert('Error', err.message || 'Failed to save. The backend endpoint may not be configured yet.');
    } finally {
      setSaving(false);
    }
  };

  // --- Global settings updaters ---

  const updateGlobal = (field: keyof GlobalCashbackSettings, value: string) => {
    setGlobalSettings(prev => ({ ...prev, [field]: parseFloat(value) || 0 }));
    setDirty(true);
  };

  // --- Category updaters ---

  const addCategory = () => {
    setCategories(prev => [...prev, { id: String(nextCategoryId++), categoryName: '', multiplier: 1 }]);
    setDirty(true);
  };

  const removeCategory = (id: string) => {
    setCategories(prev => prev.filter(c => c.id !== id));
    setDirty(true);
  };

  const updateCategory = (id: string, field: keyof CategoryMultiplier, value: any) => {
    setCategories(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
    setDirty(true);
  };

  // --- Helpers ---

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return colors.success;
      case 'scheduled': case 'upcoming': return colors.info;
      case 'expired': case 'ended': return colors.error;
      case 'paused': return colors.warning;
      default: return colors.secondaryText;
    }
  };

  // --- Render helpers ---

  const renderInput = (label: string, value: number, onChange: (val: string) => void, suffix?: string) => (
    <View style={styles.fieldRow}>
      <Text style={[styles.fieldLabel, { color: colors.text }]}>{label}{suffix ? ` (${suffix})` : ''}</Text>
      <TextInput
        style={[styles.fieldInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
        value={String(value)}
        onChangeText={onChange}
        keyboardType="numeric"
        selectTextOnFocus
      />
    </View>
  );

  const renderSectionCard = (sectionKey: SectionKey, content: React.ReactNode) => {
    const sec = SECTIONS.find(s => s.key === sectionKey)!;
    const isCollapsed = collapsed[sectionKey];
    return (
      <View key={sectionKey} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TouchableOpacity style={styles.cardHeader} onPress={() => toggleSection(sectionKey)} activeOpacity={0.7}>
          <Ionicons name={sec.icon} size={18} color={sec.color} />
          <Text style={[styles.cardTitle, { color: colors.text }]}>{sec.title}</Text>
          {sectionKey === 'campaigns' && !campaignsLoading && campaigns.length > 0 && (
            <View style={[styles.badge, { backgroundColor: `${sec.color}20` }]}>
              <Text style={[styles.badgeText, { color: sec.color }]}>{campaigns.length}</Text>
            </View>
          )}
          <Ionicons name={isCollapsed ? 'chevron-down' : 'chevron-up'} size={18} color={colors.secondaryText} />
        </TouchableOpacity>
        {!isCollapsed && <View style={[styles.cardBody, { borderTopColor: colors.border }]}>{content}</View>}
      </View>
    );
  };

  // --- Main render ---

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <Ionicons name="cash" size={22} color={colors.tint} />
          <Text style={[styles.headerTitle, { color: colors.text }]}>Cashback Rules</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleRefresh} style={styles.iconBtn}>
            <Ionicons name="refresh" size={20} color={colors.tint} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveButton, !dirty && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={!dirty || saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color={colors.card} />
            ) : (
              <>
                <Ionicons name="save" size={16} color={colors.card} />
                <Text style={styles.saveButtonText}>Save</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.tint]} />}
      >
        {/* Section 1: Global Cashback Settings */}
        {renderSectionCard('global', (
          <>
            <Text style={[styles.sectionDescription, { color: colors.secondaryText }]}>
              Default cashback parameters applied across all transactions unless overridden by category multipliers or campaigns.
            </Text>
            {renderInput('Default Cashback Rate', globalSettings.defaultCashbackRate, v => updateGlobal('defaultCashbackRate', v), '%')}
            {renderInput('Max Cashback / Transaction', globalSettings.maxCashbackPerTransaction, v => updateGlobal('maxCashbackPerTransaction', v), 'coins')}
            {renderInput('Min Order for Cashback', globalSettings.minOrderForCashback, v => updateGlobal('minOrderForCashback', v), 'order value')}
          </>
        ))}

        {/* Section 2: Category Multipliers */}
        {renderSectionCard('categories', (
          <>
            <Text style={[styles.sectionDescription, { color: colors.secondaryText }]}>
              Set cashback multipliers per category. A 2x multiplier means double the default cashback rate for that category.
            </Text>
            {categories.length === 0 && (
              <Text style={[styles.emptyText, { color: colors.secondaryText }]}>No category multipliers configured.</Text>
            )}
            {categories.map((cat) => (
              <View key={cat.id} style={[styles.categoryRow, { borderColor: colors.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.listItemLabel, { color: colors.secondaryText }]}>Category</Text>
                  <TextInput
                    style={[styles.listInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                    value={cat.categoryName}
                    onChangeText={v => updateCategory(cat.id, 'categoryName', v)}
                    placeholder="Category name"
                    placeholderTextColor={colors.icon}
                  />
                </View>
                <View style={{ width: 90 }}>
                  <Text style={[styles.listItemLabel, { color: colors.secondaryText }]}>Multiplier</Text>
                  <View style={styles.multiplierContainer}>
                    <TextInput
                      style={[styles.listInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text, textAlign: 'center', flex: 1 }]}
                      value={String(cat.multiplier)}
                      onChangeText={v => updateCategory(cat.id, 'multiplier', parseFloat(v) || 0)}
                      keyboardType="numeric"
                      selectTextOnFocus
                    />
                    <Text style={[styles.multiplierSuffix, { color: colors.secondaryText }]}>x</Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.removeBtn} onPress={() => removeCategory(cat.id)}>
                  <Ionicons name="trash-outline" size={18} color={colors.error} />
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity style={[styles.addBtn, { borderColor: colors.border }]} onPress={addCategory}>
              <Ionicons name="add-circle-outline" size={16} color={colors.tint} />
              <Text style={[styles.addBtnText, { color: colors.tint }]}>Add Category</Text>
            </TouchableOpacity>
          </>
        ))}

        {/* Section 3: Active Cashback Campaigns */}
        {renderSectionCard('campaigns', (
          <>
            <Text style={[styles.sectionDescription, { color: colors.secondaryText }]}>
              Campaigns fetched from the double-campaigns endpoint. These override default cashback for their duration.
            </Text>
            {campaignsLoading ? (
              <View style={styles.campaignLoadingContainer}>
                <ActivityIndicator size="small" color={colors.tint} />
                <Text style={[styles.campaignLoadingText, { color: colors.secondaryText }]}>Loading campaigns...</Text>
              </View>
            ) : campaignsError ? (
              <View style={styles.campaignErrorContainer}>
                <Ionicons name="alert-circle" size={24} color={colors.error} />
                <Text style={[styles.campaignErrorText, { color: colors.secondaryText }]}>{campaignsError}</Text>
                <TouchableOpacity style={[styles.retryBtn, { borderColor: colors.border }]} onPress={loadCampaigns}>
                  <Text style={[styles.retryBtnText, { color: colors.tint }]}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : campaigns.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.secondaryText }]}>No active cashback campaigns found.</Text>
            ) : (
              campaigns.map((campaign) => (
                <View key={campaign._id} style={[styles.campaignCard, { borderColor: colors.border }]}>
                  <View style={styles.campaignHeader}>
                    <Text style={[styles.campaignName, { color: colors.text }]} numberOfLines={1}>{campaign.name}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(campaign.status)}18` }]}>
                      <View style={[styles.statusDot, { backgroundColor: getStatusColor(campaign.status) }]} />
                      <Text style={[styles.statusText, { color: getStatusColor(campaign.status) }]}>
                        {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.campaignDetails}>
                    <View style={styles.campaignDetail}>
                      <Ionicons name="trending-up" size={14} color={colors.secondaryText} />
                      <Text style={[styles.campaignDetailText, { color: colors.secondaryText }]}>
                        {campaign.multiplier}x multiplier
                      </Text>
                    </View>
                    <View style={styles.campaignDetail}>
                      <Ionicons name="calendar-outline" size={14} color={colors.secondaryText} />
                      <Text style={[styles.campaignDetailText, { color: colors.secondaryText }]}>
                        {formatDate(campaign.startDate)} - {formatDate(campaign.endDate)}
                      </Text>
                    </View>
                  </View>
                </View>
              ))
            )}
          </>
        ))}

        {/* Bottom Save */}
        <TouchableOpacity
          style={[styles.bottomSave, !dirty && { backgroundColor: colors.muted }]}
          onPress={handleSave}
          disabled={!dirty || saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.card} />
          ) : (
            <Text style={styles.bottomSaveText}>{dirty ? 'Save All Changes' : 'No Changes'}</Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: { padding: 8 },
  saveButton: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: Colors.light.navy,
  },
  saveButtonDisabled: { backgroundColor: Colors.light.muted },
  saveButtonText: { fontWeight: '600', color: Colors.light.card, fontSize: 14 },
  scrollContent: { padding: 16, paddingBottom: 60 },
  card: { borderRadius: 12, marginBottom: 12, borderWidth: 1, overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 8 },
  cardTitle: { flex: 1, fontSize: 16, fontWeight: '700' },
  cardBody: { paddingHorizontal: 16, paddingBottom: 16, borderTopWidth: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  sectionDescription: { fontSize: 13, marginTop: 8, marginBottom: 12, lineHeight: 18 },
  fieldRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  fieldLabel: { fontSize: 13, fontWeight: '600', flex: 1 },
  fieldInput: { borderRadius: 8, padding: 10, borderWidth: 1, minWidth: 120, textAlign: 'right', fontSize: 14 },
  categoryRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingBottom: 12, marginTop: 12, borderBottomWidth: 1 },
  listItemLabel: { fontSize: 11, fontWeight: '600', marginBottom: 4 },
  listInput: { fontSize: 14, borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 6 },
  multiplierContainer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  multiplierSuffix: { fontSize: 14, fontWeight: '700' },
  removeBtn: { padding: 8, justifyContent: 'center' },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10, borderWidth: 1, borderStyle: 'dashed', borderRadius: 8, marginTop: 12,
  },
  addBtnText: { fontSize: 13, fontWeight: '600' },
  emptyText: { fontSize: 13, textAlign: 'center', paddingVertical: 16, fontStyle: 'italic' },
  campaignLoadingContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 20 },
  campaignLoadingText: { fontSize: 13 },
  campaignErrorContainer: { alignItems: 'center', paddingVertical: 16, gap: 8 },
  campaignErrorText: { fontSize: 13, textAlign: 'center' },
  retryBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, borderWidth: 1, marginTop: 4 },
  retryBtnText: { fontSize: 13, fontWeight: '600' },
  campaignCard: { borderWidth: 1, borderRadius: 10, padding: 12, marginTop: 10 },
  campaignHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  campaignName: { fontSize: 14, fontWeight: '700', flex: 1 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: '700' },
  campaignDetails: { marginTop: 8, gap: 4 },
  campaignDetail: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  campaignDetailText: { fontSize: 12 },
  bottomSave: { backgroundColor: Colors.light.navy, borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 8 },
  bottomSaveText: { color: Colors.light.card, fontSize: 16, fontWeight: '700' },
});
