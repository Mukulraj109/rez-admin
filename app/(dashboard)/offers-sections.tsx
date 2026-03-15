import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  useColorScheme,
  ActivityIndicator,
  Switch,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  offersSectionsService,
  OffersSectionConfig,
} from '../../services/api/offersSections';
import { Colors } from '../../constants/Colors';
import { showAlert, showConfirm } from '../../utils/alert';

type TabFilter = 'all' | 'offers' | 'cashback' | 'exclusive';

const TAB_FILTERS: { key: TabFilter; label: string; icon: string; color: string }[] = [
  { key: 'all', label: 'All', icon: 'albums', color: Colors.light.indigo },
  { key: 'offers', label: 'Offers', icon: 'pricetag', color: Colors.light.success },
  { key: 'cashback', label: 'Cashback', icon: 'cash', color: Colors.light.warning },
  { key: 'exclusive', label: 'Exclusive', icon: 'lock-closed', color: Colors.light.purple },
];

const SECTION_ICONS: Record<string, string> = {
  lightningDeals: 'flash',
  discountBuckets: 'pricetags',
  nearbyOffers: 'location',
  saleOffers: 'cart',
  bogoOffers: 'gift',
  freeDeliveryOffers: 'car',
  todaysOffers: 'today',
  trendingOffers: 'trending-up',
  aiRecommendedOffers: 'sparkles',
  friendsRedeemed: 'people',
  hotspots: 'flame',
  lastChanceOffers: 'alarm',
  newTodayOffers: 'star',
  doubleCashback: 'cash',
  coinDrops: 'logo-bitcoin',
  superCashbackStores: 'storefront',
  uploadBillStores: 'document-text',
  bankOffers: 'card',
  exclusiveZones: 'shield-checkmark',
  specialProfiles: 'ribbon',
  loyaltyMilestones: 'trophy',
};

export default function OffersSectionsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';

  const [sections, setSections] = useState<OffersSectionConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabFilter>('all');
  const [editingMaxItems, setEditingMaxItems] = useState<string | null>(null);
  const [tempMaxItems, setTempMaxItems] = useState('');
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);

  const fetchSections = useCallback(async () => {
    try {
      const data = await offersSectionsService.getSections();
      setSections(data);
    } catch (error: any) {
      console.error('Failed to fetch sections:', error);
      showAlert('Error', error.message || 'Failed to load section configs');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchSections();
  }, [fetchSections]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchSections();
  };

  const handleSeed = async () => {
    showConfirm(
      'Seed Defaults',
      'This will create default configurations for any missing sections. Existing configs will not be modified.',
      async () => {
        try {
          setLoading(true);
          const results = await offersSectionsService.seedDefaults();
          const created = results.filter(r => r.action === 'created').length;
          const existed = results.filter(r => r.action === 'exists').length;
          showAlert('Seeded', `Created: ${created}, Already existed: ${existed}`);
          fetchSections();
        } catch (error: any) {
          showAlert('Error', error.message || 'Failed to seed');
          setLoading(false);
        }
      }
    );
  };

  const handleToggle = async (section: OffersSectionConfig) => {
    try {
      setUpdatingKey(section.sectionKey);
      const updated = await offersSectionsService.toggleSection(
        section.sectionKey,
        !section.isEnabled
      );
      setSections(prev =>
        prev.map(s => (s.sectionKey === section.sectionKey ? updated : s))
      );
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to toggle section');
    } finally {
      setUpdatingKey(null);
    }
  };

  const handleMoveUp = async (section: OffersSectionConfig) => {
    const tabSections = sections
      .filter(s => s.tab === section.tab)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    const idx = tabSections.findIndex(s => s.sectionKey === section.sectionKey);
    if (idx <= 0) return;

    const prev = tabSections[idx - 1];
    try {
      setUpdatingKey(section.sectionKey);
      await Promise.all([
        offersSectionsService.updateSortOrder(section.sectionKey, prev.sortOrder),
        offersSectionsService.updateSortOrder(prev.sectionKey, section.sortOrder),
      ]);
      fetchSections();
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to reorder');
    } finally {
      setUpdatingKey(null);
    }
  };

  const handleMoveDown = async (section: OffersSectionConfig) => {
    const tabSections = sections
      .filter(s => s.tab === section.tab)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    const idx = tabSections.findIndex(s => s.sectionKey === section.sectionKey);
    if (idx >= tabSections.length - 1) return;

    const next = tabSections[idx + 1];
    try {
      setUpdatingKey(section.sectionKey);
      await Promise.all([
        offersSectionsService.updateSortOrder(section.sectionKey, next.sortOrder),
        offersSectionsService.updateSortOrder(next.sectionKey, section.sortOrder),
      ]);
      fetchSections();
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to reorder');
    } finally {
      setUpdatingKey(null);
    }
  };

  const handleMaxItemsSave = async (sectionKey: string) => {
    const val = parseInt(tempMaxItems);
    if (isNaN(val) || val < 1 || val > 100) {
      showAlert('Invalid', 'Max items must be between 1 and 100');
      return;
    }
    try {
      setUpdatingKey(sectionKey);
      const updated = await offersSectionsService.updateMaxItems(sectionKey, val);
      setSections(prev =>
        prev.map(s => (s.sectionKey === sectionKey ? updated : s))
      );
      setEditingMaxItems(null);
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to update');
    } finally {
      setUpdatingKey(null);
    }
  };

  const filteredSections = sections
    .filter(s => activeTab === 'all' || s.tab === activeTab)
    .sort((a, b) => {
      if (a.tab !== b.tab) return a.tab.localeCompare(b.tab);
      return a.sortOrder - b.sortOrder;
    });

  const enabledCount = sections.filter(s => s.isEnabled).length;
  const disabledCount = sections.filter(s => !s.isEnabled).length;

  if (loading && sections.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
        <Text style={[styles.loadingText, { color: colors.icon }]}>Loading section configs...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.text }]}>Offers Page Sections</Text>
          <Text style={[styles.subtitle, { color: colors.icon }]}>
            Manage visibility, ordering & limits for all 21 sections
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.seedButton, { backgroundColor: colors.tint }]}
          onPress={handleSeed}
        >
          <Ionicons name="sparkles" size={16} color={colors.card} />
          <Text style={styles.seedButtonText}>Seed Defaults</Text>
        </TouchableOpacity>
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: isDark ? colors.slateDark : colors.successLighter }]}>
          <Text style={[styles.statValue, { color: colors.success }]}>{enabledCount}</Text>
          <Text style={[styles.statLabel, { color: colors.icon }]}>Enabled</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: isDark ? colors.slateDark : colors.errorLight }]}>
          <Text style={[styles.statValue, { color: colors.error }]}>{disabledCount}</Text>
          <Text style={[styles.statLabel, { color: colors.icon }]}>Disabled</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: isDark ? colors.slateDark : colors.infoLight }]}>
          <Text style={[styles.statValue, { color: colors.info }]}>{sections.length}</Text>
          <Text style={[styles.statLabel, { color: colors.icon }]}>Total</Text>
        </View>
      </View>

      {/* Tab Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabRow}>
        {TAB_FILTERS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tabChip,
              {
                backgroundColor: activeTab === tab.key ? tab.color : isDark ? colors.slateDark : colors.slate,
              },
            ]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Ionicons
              name={tab.icon as any}
              size={14}
              color={activeTab === tab.key ? colors.card : colors.icon}
            />
            <Text
              style={[
                styles.tabChipText,
                { color: activeTab === tab.key ? colors.card : colors.text },
              ]}
            >
              {tab.label} ({activeTab === 'all'
                ? (tab.key === 'all' ? sections.length : sections.filter(s => s.tab === tab.key).length)
                : sections.filter(s => s.tab === tab.key).length})
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Section List */}
      {filteredSections.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="layers-outline" size={48} color={colors.icon} />
          <Text style={[styles.emptyText, { color: colors.icon }]}>
            No section configs found. Tap "Seed Defaults" to create them.
          </Text>
        </View>
      ) : (
        filteredSections.map((section, index) => {
          const isUpdating = updatingKey === section.sectionKey;
          const tabSections = filteredSections.filter(s => s.tab === section.tab);
          const tabIndex = tabSections.findIndex(s => s.sectionKey === section.sectionKey);
          const isFirst = tabIndex === 0;
          const isLast = tabIndex === tabSections.length - 1;
          const showTabHeader =
            activeTab === 'all' &&
            (index === 0 || filteredSections[index - 1].tab !== section.tab);

          return (
            <React.Fragment key={section.sectionKey}>
              {showTabHeader && (
                <View style={styles.tabDivider}>
                  <Text style={[styles.tabDividerText, { color: colors.tint }]}>
                    {section.tab.toUpperCase()} TAB
                  </Text>
                </View>
              )}
              <View
                style={[
                  styles.sectionCard,
                  {
                    backgroundColor: isDark ? colors.slateDark : colors.card,
                    borderColor: isDark ? Colors.dark.border : colors.border,
                    opacity: section.isEnabled ? 1 : 0.6,
                  },
                ]}
              >
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionInfo}>
                    <View style={[styles.iconCircle, { backgroundColor: section.isEnabled ? colors.infoLighter : colors.slate }]}>
                      <Ionicons
                        name={(SECTION_ICONS[section.sectionKey] || 'list') as any}
                        size={18}
                        color={section.isEnabled ? colors.info : colors.slateMedium}
                      />
                    </View>
                    <View style={styles.sectionText}>
                      <Text style={[styles.sectionName, { color: colors.text }]}>
                        {section.displayName}
                      </Text>
                      <Text style={[styles.sectionKey, { color: colors.icon }]}>
                        {section.sectionKey} | Order: {section.sortOrder}
                      </Text>
                    </View>
                  </View>
                  <Switch
                    value={section.isEnabled}
                    onValueChange={() => handleToggle(section)}
                    disabled={isUpdating}
                    trackColor={{ false: colors.slateLight, true: '#86EFAC' }}
                    thumbColor={section.isEnabled ? colors.success : colors.slateMedium}
                  />
                </View>

                <View style={styles.sectionActions}>
                  {/* Max Items */}
                  <View style={styles.maxItemsRow}>
                    <Text style={[styles.actionLabel, { color: colors.icon }]}>Max Items:</Text>
                    {editingMaxItems === section.sectionKey ? (
                      <View style={styles.maxItemsEdit}>
                        <TextInput
                          style={[
                            styles.maxItemsInput,
                            { color: colors.text, borderColor: colors.tint },
                          ]}
                          value={tempMaxItems}
                          onChangeText={setTempMaxItems}
                          keyboardType="number-pad"
                          autoFocus
                        />
                        <TouchableOpacity
                          onPress={() => handleMaxItemsSave(section.sectionKey)}
                          disabled={isUpdating}
                        >
                          <Ionicons name="checkmark-circle" size={22} color={colors.success} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setEditingMaxItems(null)}>
                          <Ionicons name="close-circle" size={22} color={colors.error} />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.maxItemsDisplay}
                        onPress={() => {
                          setEditingMaxItems(section.sectionKey);
                          setTempMaxItems(String(section.maxItems));
                        }}
                      >
                        <Text style={[styles.maxItemsValue, { color: colors.text }]}>
                          {section.maxItems}
                        </Text>
                        <Ionicons name="pencil" size={12} color={colors.icon} />
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Reorder Buttons */}
                  <View style={styles.reorderButtons}>
                    <TouchableOpacity
                      style={[styles.reorderBtn, isFirst && styles.reorderBtnDisabled]}
                      onPress={() => handleMoveUp(section)}
                      disabled={isFirst || isUpdating}
                    >
                      <Ionicons
                        name="chevron-up"
                        size={18}
                        color={isFirst ? colors.slateLight : colors.tint}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.reorderBtn, isLast && styles.reorderBtnDisabled]}
                      onPress={() => handleMoveDown(section)}
                      disabled={isLast || isUpdating}
                    >
                      <Ionicons
                        name="chevron-down"
                        size={18}
                        color={isLast ? colors.slateLight : colors.tint}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {isUpdating && (
                  <View style={styles.updatingOverlay}>
                    <ActivityIndicator size="small" color={colors.tint} />
                  </View>
                )}
              </View>
            </React.Fragment>
          );
        })
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  title: { fontSize: 22, fontWeight: '700' },
  subtitle: { fontSize: 13, marginTop: 2 },
  seedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  seedButtonText: { color: Colors.light.card, fontSize: 13, fontWeight: '600' },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  statValue: { fontSize: 22, fontWeight: '700' },
  statLabel: { fontSize: 11, marginTop: 2 },
  tabRow: { marginBottom: 16 },
  tabChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    gap: 6,
  },
  tabChipText: { fontSize: 13, fontWeight: '500' },
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 14, textAlign: 'center', maxWidth: 260 },
  tabDivider: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginTop: 8,
  },
  tabDividerText: { fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  sectionCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    position: 'relative',
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionInfo: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionText: { flex: 1 },
  sectionName: { fontSize: 15, fontWeight: '600' },
  sectionKey: { fontSize: 11, marginTop: 2 },
  sectionActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  maxItemsRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionLabel: { fontSize: 12 },
  maxItemsDisplay: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  maxItemsValue: { fontSize: 14, fontWeight: '600' },
  maxItemsEdit: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  maxItemsInput: {
    width: 50,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 14,
    textAlign: 'center',
  },
  reorderButtons: { flexDirection: 'row', gap: 4 },
  reorderBtn: {
    width: 30,
    height: 30,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.light.slate,
  },
  reorderBtnDisabled: { opacity: 0.3 },
  updatingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
