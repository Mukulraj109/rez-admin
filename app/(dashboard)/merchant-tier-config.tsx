import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  Switch, ActivityIndicator, RefreshControl, useColorScheme,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { showAlert, showConfirm } from '../../utils/alert';
import {
  merchantTierConfigService,
  TierDetails,
  MerchantTierConfigData,
  MerchantSearchResult,
} from '../../services/api/merchantTierConfig';

// ── Types ──

type TierKey = 'free' | 'pro' | 'enterprise';

const TIER_SECTIONS: { key: TierKey; title: string; icon: keyof typeof Ionicons.glyphMap; color: string }[] = [
  { key: 'free', title: 'Free Tier', icon: 'gift-outline', color: Colors.light.success },
  { key: 'pro', title: 'Pro Tier', icon: 'rocket-outline', color: Colors.light.info },
  { key: 'enterprise', title: 'Enterprise Tier', icon: 'business-outline', color: Colors.light.purple },
];

const ALL_FEATURES = [
  'basic_dashboard', 'order_management', 'analytics', 'offers',
  'appointments', 'pos', 'api_access', 'custom_branding', 'white_label',
];

const FEATURE_LABELS: Record<string, string> = {
  basic_dashboard: 'Basic Dashboard',
  order_management: 'Order Management',
  analytics: 'Analytics',
  offers: 'Offers & Deals',
  appointments: 'Appointments',
  pos: 'POS Integration',
  api_access: 'API Access',
  custom_branding: 'Custom Branding',
  white_label: 'White Label',
};

// ── Component ──

export default function MerchantTierConfigScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  // Config state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<MerchantTierConfigData | null>(null);
  const [collapsed, setCollapsed] = useState<Record<TierKey, boolean>>({
    free: false, pro: true, enterprise: true,
  });

  // Merchant search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MerchantSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [selectedTier, setSelectedTier] = useState<Record<string, TierKey>>({});
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Load config ──

  const loadConfig = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true); else setLoading(true);
      setError(null);
      const data = await merchantTierConfigService.getConfig();
      setConfig(data);
      setDirty(false);
    } catch (err: any) {
      setError(err.message || 'Failed to load config');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadConfig(); }, [loadConfig]);

  // ── Save config ──

  const handleSave = async () => {
    if (!config) return;
    try {
      setSaving(true);
      await merchantTierConfigService.updateConfig({ tiers: config.tiers });
      showAlert('Success', 'Merchant tier configuration saved successfully');
      setDirty(false);
    } catch (err: any) {
      showAlert('Error', err.message || 'Failed to save config');
    } finally {
      setSaving(false);
    }
  };

  // ── Update helpers ──

  const updateTierField = (tierKey: TierKey, field: keyof TierDetails, value: any) => {
    if (!config) return;
    setConfig(prev => {
      if (!prev) return prev;
      const updated = JSON.parse(JSON.stringify(prev)) as MerchantTierConfigData;
      (updated.tiers[tierKey] as any)[field] = value;
      return updated;
    });
    setDirty(true);
  };

  const toggleFeature = (tierKey: TierKey, feature: string) => {
    if (!config) return;
    setConfig(prev => {
      if (!prev) return prev;
      const updated = JSON.parse(JSON.stringify(prev)) as MerchantTierConfigData;
      const features = updated.tiers[tierKey].features;
      const idx = features.indexOf(feature);
      if (idx >= 0) features.splice(idx, 1); else features.push(feature);
      return updated;
    });
    setDirty(true);
  };

  const toggleSection = (key: TierKey) => {
    setCollapsed(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // ── Merchant search ──

  const handleSearch = useCallback(async (query: string) => {
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      setSearching(true);
      const data = await merchantTierConfigService.searchMerchants(query);
      setSearchResults(data.merchants);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const onSearchChange = (text: string) => {
    setSearchQuery(text);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => handleSearch(text), 400);
  };

  const handleAssignTier = async (merchant: MerchantSearchResult) => {
    const tier = selectedTier[merchant._id];
    if (!tier) {
      showAlert('Error', 'Please select a tier first');
      return;
    }

    showConfirm(
      'Assign Tier',
      `Assign "${tier}" tier to ${merchant.businessName}?`,
      async () => {
        try {
          setAssigning(merchant._id);
          const updated = await merchantTierConfigService.assignTier(merchant._id, tier);
          showAlert('Success', `Tier "${tier}" assigned to ${updated.businessName}`);
          // Update the search result in place
          setSearchResults(prev => prev.map(m =>
            m._id === merchant._id ? { ...m, tier } : m
          ));
        } catch (err: any) {
          showAlert('Error', err.message || 'Failed to assign tier');
        } finally {
          setAssigning(null);
        }
      }
    );
  };

  // ── Render helpers ──

  const renderNumberInput = (label: string, tierKey: TierKey, field: keyof TierDetails, value: number, suffix?: string) => (
    <View style={styles.fieldRow} key={`${tierKey}-${field}`}>
      <Text style={[styles.fieldLabel, { color: colors.text }]}>{label}{suffix ? ` (${suffix})` : ''}</Text>
      <TextInput
        style={[styles.fieldInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
        value={String(value)}
        onChangeText={t => updateTierField(tierKey, field, parseFloat(t) || 0)}
        keyboardType="numeric"
        selectTextOnFocus
      />
    </View>
  );

  const renderBoolToggle = (label: string, tierKey: TierKey, field: keyof TierDetails, value: boolean) => (
    <View style={styles.fieldRow} key={`${tierKey}-${field}`}>
      <Text style={[styles.fieldLabel, { color: colors.text }]}>{label}</Text>
      <Switch
        value={value}
        onValueChange={v => updateTierField(tierKey, field, v)}
        trackColor={{ false: colors.border, true: `${colors.tint}60` }}
        thumbColor={value ? colors.tint : '#f4f3f4'}
      />
    </View>
  );

  const renderTierCard = (tierKey: TierKey) => {
    if (!config) return null;
    const section = TIER_SECTIONS.find(s => s.key === tierKey)!;
    const tier = config.tiers[tierKey];
    const isCollapsed = collapsed[tierKey];

    return (
      <View key={tierKey} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TouchableOpacity style={styles.cardHeader} onPress={() => toggleSection(tierKey)} activeOpacity={0.7}>
          <Ionicons name={section.icon as any} size={18} color={section.color} />
          <Text style={[styles.cardTitle, { color: colors.text }]}>{section.title}</Text>
          <View style={[styles.tierBadge, { backgroundColor: `${section.color}20` }]}>
            <Text style={[styles.tierBadgeText, { color: section.color }]}>{tier.commissionRate}% comm.</Text>
          </View>
          <Ionicons name={isCollapsed ? 'chevron-down' : 'chevron-up'} size={18} color={colors.text} />
        </TouchableOpacity>

        {!isCollapsed && (
          <View style={[styles.cardBody, { borderTopColor: colors.border }]}>
            {renderNumberInput('Commission Rate', tierKey, 'commissionRate', tier.commissionRate, '%')}
            {renderNumberInput('Monthly Fee', tierKey, 'monthlyFee', tier.monthlyFee)}
            {renderNumberInput('Max Products', tierKey, 'maxProducts', tier.maxProducts, '-1 = unlimited')}
            {renderNumberInput('Max Stores', tierKey, 'maxStores', tier.maxStores, '-1 = unlimited')}

            <Text style={[styles.subHeading, { color: colors.text }]}>Access Controls</Text>
            {renderBoolToggle('Analytics Access', tierKey, 'analyticsAccess', tier.analyticsAccess)}
            {renderBoolToggle('Priority Support', tierKey, 'prioritySupport', tier.prioritySupport)}
            {renderBoolToggle('Custom Branding', tierKey, 'customBranding', tier.customBranding)}
            {renderBoolToggle('API Access', tierKey, 'apiAccess', tier.apiAccess)}

            <Text style={[styles.subHeading, { color: colors.text }]}>Features</Text>
            <View style={styles.featureGrid}>
              {ALL_FEATURES.map(feature => {
                const isEnabled = tier.features.includes(feature);
                return (
                  <TouchableOpacity
                    key={feature}
                    style={[
                      styles.featureChip,
                      {
                        backgroundColor: isEnabled ? `${section.color}15` : colors.background,
                        borderColor: isEnabled ? section.color : colors.border,
                      },
                    ]}
                    onPress={() => toggleFeature(tierKey, feature)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={isEnabled ? 'checkmark-circle' : 'ellipse-outline'}
                      size={14}
                      color={isEnabled ? section.color : colors.muted}
                    />
                    <Text style={[
                      styles.featureChipText,
                      { color: isEnabled ? section.color : colors.mutedDark },
                    ]}>
                      {FEATURE_LABELS[feature] || feature}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}
      </View>
    );
  };

  const getTierColor = (tier?: string) => {
    switch (tier) {
      case 'pro': return Colors.light.info;
      case 'enterprise': return Colors.light.purple;
      default: return Colors.light.success;
    }
  };

  // ── Loading / Error ──

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
        <Text style={[styles.loadingText, { color: colors.text }]}>Loading tier config...</Text>
      </View>
    );
  }

  if (error || !config) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <Ionicons name="alert-circle" size={48} color={colors.error} />
        <Text style={[styles.errorText, { color: colors.text }]}>{error || 'Unknown error'}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => loadConfig()}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Main render ──

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <Ionicons name="layers-outline" size={22} color={colors.tint} />
          <Text style={[styles.headerTitle, { color: colors.text }]}>Merchant Tier Config</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => loadConfig(true)} style={styles.iconBtn}>
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadConfig(true)} colors={[colors.tint]} />}
      >
        {/* Tier Config Sections */}
        {TIER_SECTIONS.map(s => renderTierCard(s.key))}

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

        {/* ── Merchant Tier Assignment ── */}
        <View style={[styles.assignSection, { borderColor: colors.border }]}>
          <View style={styles.assignHeader}>
            <Ionicons name="people-outline" size={20} color={colors.tint} />
            <Text style={[styles.assignTitle, { color: colors.text }]}>Assign Tier to Merchant</Text>
          </View>

          {/* Search Input */}
          <View style={[styles.searchBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Ionicons name="search" size={18} color={colors.muted} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search by name, phone, or email..."
              placeholderTextColor={colors.muted}
              value={searchQuery}
              onChangeText={onSearchChange}
            />
            {searching && <ActivityIndicator size="small" color={colors.tint} />}
          </View>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <View style={[styles.resultsContainer, { borderColor: colors.border }]}>
              {searchResults.map(merchant => (
                <View key={merchant._id} style={[styles.merchantRow, { borderBottomColor: colors.border }]}>
                  <View style={styles.merchantInfo}>
                    <Text style={[styles.merchantName, { color: colors.text }]}>{merchant.businessName}</Text>
                    <Text style={[styles.merchantSub, { color: colors.mutedDark }]}>
                      {merchant.ownerName} | {merchant.phone}
                    </Text>
                    <View style={styles.merchantMeta}>
                      <View style={[styles.statusBadge, {
                        backgroundColor: merchant.isActive ? Colors.light.successLight : Colors.light.errorLight,
                      }]}>
                        <Text style={{
                          fontSize: 10, fontWeight: '600',
                          color: merchant.isActive ? Colors.light.successDark : Colors.light.errorDark,
                        }}>
                          {merchant.isActive ? 'Active' : 'Inactive'}
                        </Text>
                      </View>
                      <View style={[styles.statusBadge, {
                        backgroundColor: `${getTierColor(merchant.tier)}20`,
                      }]}>
                        <Text style={{
                          fontSize: 10, fontWeight: '600',
                          color: getTierColor(merchant.tier),
                        }}>
                          {merchant.tier || 'free'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.assignActions}>
                    {/* Tier selector */}
                    <View style={styles.tierSelector}>
                      {(['free', 'pro', 'enterprise'] as TierKey[]).map(t => {
                        const isSelected = (selectedTier[merchant._id] || merchant.tier || 'free') === t;
                        const tColor = getTierColor(t);
                        return (
                          <TouchableOpacity
                            key={t}
                            style={[
                              styles.tierOption,
                              {
                                backgroundColor: isSelected ? `${tColor}20` : 'transparent',
                                borderColor: isSelected ? tColor : colors.border,
                              },
                            ]}
                            onPress={() => setSelectedTier(prev => ({ ...prev, [merchant._id]: t }))}
                          >
                            <Text style={[
                              styles.tierOptionText,
                              { color: isSelected ? tColor : colors.mutedDark },
                            ]}>
                              {t.charAt(0).toUpperCase() + t.slice(1)}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    {/* Assign Button */}
                    <TouchableOpacity
                      style={[styles.assignBtn, {
                        backgroundColor: selectedTier[merchant._id] && selectedTier[merchant._id] !== (merchant.tier || 'free')
                          ? colors.tint : colors.muted,
                      }]}
                      onPress={() => handleAssignTier(merchant)}
                      disabled={
                        assigning === merchant._id ||
                        !selectedTier[merchant._id] ||
                        selectedTier[merchant._id] === (merchant.tier || 'free')
                      }
                    >
                      {assigning === merchant._id ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={styles.assignBtnText}>Assign</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}

          {searchQuery.length >= 2 && !searching && searchResults.length === 0 && (
            <View style={styles.emptySearch}>
              <Ionicons name="search-outline" size={32} color={colors.muted} />
              <Text style={[styles.emptySearchText, { color: colors.mutedDark }]}>No merchants found</Text>
            </View>
          )}
        </View>
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
  retryButton: { marginTop: 16, backgroundColor: Colors.light.navy, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12 },
  retryButtonText: { color: Colors.light.card, fontWeight: '600', fontSize: 14 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: { padding: 8 },
  saveButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: Colors.light.navy },
  saveButtonDisabled: { backgroundColor: Colors.light.muted },
  saveButtonText: { fontWeight: '600', color: Colors.light.card, fontSize: 14 },
  scrollContent: { padding: 16, paddingBottom: 120 },
  card: { borderRadius: 12, marginBottom: 12, borderWidth: 1, overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 8 },
  cardTitle: { flex: 1, fontSize: 16, fontWeight: '700' },
  cardBody: { paddingHorizontal: 16, paddingBottom: 16, borderTopWidth: 1 },
  fieldRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  fieldLabel: { fontSize: 13, fontWeight: '600', flex: 1 },
  fieldInput: { borderRadius: 8, padding: 10, borderWidth: 1, minWidth: 120, textAlign: 'right', fontSize: 14 },
  subHeading: { fontSize: 14, fontWeight: '700', marginTop: 16, marginBottom: 4 },
  tierBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  tierBadgeText: { fontSize: 11, fontWeight: '600' },
  featureGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  featureChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
  featureChipText: { fontSize: 12, fontWeight: '500' },
  bottomSave: { backgroundColor: Colors.light.navy, borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 8, marginBottom: 24 },
  bottomSaveText: { color: Colors.light.card, fontSize: 16, fontWeight: '700' },

  // Merchant assignment
  assignSection: { borderRadius: 12, borderWidth: 1, padding: 16, marginTop: 8 },
  assignHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  assignTitle: { fontSize: 16, fontWeight: '700' },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  searchInput: { flex: 1, fontSize: 14 },
  resultsContainer: { marginTop: 12, borderRadius: 10, borderWidth: 1, overflow: 'hidden' },
  merchantRow: { padding: 12, borderBottomWidth: 1 },
  merchantInfo: { marginBottom: 8 },
  merchantName: { fontSize: 14, fontWeight: '700' },
  merchantSub: { fontSize: 12, marginTop: 2 },
  merchantMeta: { flexDirection: 'row', gap: 6, marginTop: 6 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  assignActions: { gap: 8 },
  tierSelector: { flexDirection: 'row', gap: 6 },
  tierOption: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  tierOptionText: { fontSize: 12, fontWeight: '600' },
  assignBtn: { alignItems: 'center', paddingVertical: 8, borderRadius: 8, marginTop: 4 },
  assignBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  emptySearch: { alignItems: 'center', paddingVertical: 24 },
  emptySearchText: { marginTop: 8, fontSize: 13 },
});
