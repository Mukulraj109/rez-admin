import React from 'react';
import { View, Text, TouchableOpacity, Switch, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import FormField from './FormField';
import IconInput from './IconInput';
import ColorInput from './ColorInput';
import { showConfirm } from '../../utils/alert';

interface SortFilterManagerProps {
  pageConfig: any;
  setPageConfig: (config: any) => void;
  colors: { text: string; icon: string; border: string; tint: string; card: string; success: string };
}

const DEFAULT_SORT_OPTIONS = [
  { id: 'popularity', label: 'Popularity', icon: 'flame-outline', enabled: true, sortOrder: 0 },
  { id: 'rating', label: 'Rating', icon: 'star-outline', enabled: true, sortOrder: 1 },
  { id: 'delivery_time', label: 'Delivery Time', icon: 'time-outline', enabled: true, sortOrder: 2 },
  { id: 'newest', label: 'Newest', icon: 'sparkles-outline', enabled: true, sortOrder: 3 },
];

const SortFilterManager = React.memo(({ pageConfig, setPageConfig, colors }: SortFilterManagerProps) => {
  // --- Sort Options ---
  const sortOptions = pageConfig.sortOptions || [];

  const addSortOption = () => {
    setPageConfig((prev: any) => ({
      ...prev,
      sortOptions: [...(prev.sortOptions || []), {
        id: `sort-${Date.now()}`, label: '', icon: 'swap-vertical-outline', enabled: true,
        sortOrder: (prev.sortOptions || []).length,
      }],
    }));
  };

  const removeSortOption = (index: number) => {
    const item = sortOptions[index];
    showConfirm('Delete Sort Option', `Remove "${item.label || 'this option'}"?`, () => {
      setPageConfig((prev: any) => ({
        ...prev,
        sortOptions: (prev.sortOptions || []).filter((_: any, i: number) => i !== index),
      }));
    }, 'Delete', 'warning');
  };

  const updateSortOption = (index: number, field: string, value: any) => {
    setPageConfig((prev: any) => ({
      ...prev,
      sortOptions: (prev.sortOptions || []).map((opt: any, i: number) =>
        i === index ? { ...opt, [field]: value } : opt
      ),
    }));
  };

  const moveSortOption = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= sortOptions.length) return;
    setPageConfig((prev: any) => {
      const arr = [...(prev.sortOptions || [])];
      const temp = arr[index];
      arr[index] = arr[newIndex];
      arr[newIndex] = temp;
      return { ...prev, sortOptions: arr.map((opt: any, i: number) => ({ ...opt, sortOrder: i })) };
    });
  };

  const initDefaultSortOptions = () => {
    setPageConfig((prev: any) => ({
      ...prev,
      sortOptions: DEFAULT_SORT_OPTIONS.map((opt) => ({ ...opt })),
    }));
  };

  // --- Filter Options ---
  const filterOptions = pageConfig.filterOptions || {};

  const updateFilter = (field: string, value: any) => {
    setPageConfig((prev: any) => ({
      ...prev,
      filterOptions: { ...(prev.filterOptions || {}), [field]: value },
    }));
  };

  // --- Store Display Config ---
  const storeDisplayConfig = pageConfig.storeDisplayConfig || {};

  const updateStoreDisplay = (field: string, value: any) => {
    setPageConfig((prev: any) => ({
      ...prev,
      storeDisplayConfig: { ...(prev.storeDisplayConfig || {}), [field]: value },
    }));
  };

  // --- Trust Badges ---
  const trustBadges = pageConfig.trustBadges || [];

  const addTrustBadge = () => {
    setPageConfig((prev: any) => ({
      ...prev,
      trustBadges: [...(prev.trustBadges || []), { icon: 'shield-checkmark-outline', label: '', color: '#22C55E' }],
    }));
  };

  const removeTrustBadge = (index: number) => {
    const item = trustBadges[index];
    showConfirm('Delete Badge', `Remove "${item.label || 'this badge'}"?`, () => {
      setPageConfig((prev: any) => ({
        ...prev,
        trustBadges: (prev.trustBadges || []).filter((_: any, i: number) => i !== index),
      }));
    }, 'Delete', 'warning');
  };

  const updateTrustBadge = (index: number, field: string, value: any) => {
    setPageConfig((prev: any) => ({
      ...prev,
      trustBadges: (prev.trustBadges || []).map((b: any, i: number) =>
        i === index ? { ...b, [field]: value } : b
      ),
    }));
  };

  // --- Loyalty Config ---
  const loyaltyConfig = pageConfig.loyaltyConfig || {};

  const updateLoyalty = (field: string, value: any) => {
    setPageConfig((prev: any) => ({
      ...prev,
      loyaltyConfig: { ...(prev.loyaltyConfig || {}), [field]: value },
    }));
  };

  // --- Experience Benefits ---
  const experienceBenefits = pageConfig.experienceBenefits || [];

  const addExperienceBenefit = () => {
    setPageConfig((prev: any) => ({
      ...prev,
      experienceBenefits: [...(prev.experienceBenefits || []), { icon: 'star-outline', title: '', description: '' }],
    }));
  };

  const removeExperienceBenefit = (index: number) => {
    const item = experienceBenefits[index];
    showConfirm('Delete Benefit', `Remove "${item.title || 'this benefit'}"?`, () => {
      setPageConfig((prev: any) => ({
        ...prev,
        experienceBenefits: (prev.experienceBenefits || []).filter((_: any, i: number) => i !== index),
      }));
    }, 'Delete', 'warning');
  };

  const updateExperienceBenefit = (index: number, field: string, value: any) => {
    setPageConfig((prev: any) => ({
      ...prev,
      experienceBenefits: (prev.experienceBenefits || []).map((b: any, i: number) =>
        i === index ? { ...b, [field]: value } : b
      ),
    }));
  };

  return (
    <View>
      {/* ==================== 1. Sort Options ==================== */}
      <View style={styles.sectionBlock}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Sort Options</Text>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {sortOptions.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="information-circle-outline" size={24} color={colors.icon} />
            <Text style={[styles.emptyText, { color: colors.icon }]}>No sort options configured.</Text>
            <TouchableOpacity
              style={[styles.initBtn, { backgroundColor: `${colors.tint}15`, borderColor: colors.tint }]}
              onPress={initDefaultSortOptions}
            >
              <Ionicons name="flash-outline" size={16} color={colors.tint} />
              <Text style={[styles.initBtnText, { color: colors.tint }]}>Load Defaults</Text>
            </TouchableOpacity>
          </View>
        )}

        {sortOptions.map((opt: any, index: number) => (
          <View key={opt.id || index} style={[styles.card, { borderColor: colors.border }]}>
            <View style={styles.cardHeader}>
              <Text style={[styles.cardIndex, { color: colors.icon }]}>#{index + 1}</Text>
              <View style={styles.cardActions}>
                <TouchableOpacity onPress={() => moveSortOption(index, 'up')} disabled={index === 0}>
                  <Ionicons name="chevron-up" size={18} color={index === 0 ? colors.border : colors.icon} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => moveSortOption(index, 'down')} disabled={index === sortOptions.length - 1}>
                  <Ionicons name="chevron-down" size={18} color={index === sortOptions.length - 1 ? colors.border : colors.icon} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => removeSortOption(index)}>
                  <Ionicons name="trash-outline" size={18} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <FormField label="ID" value={opt.id} onChangeText={(v) => updateSortOption(index, 'id', v)} placeholder="popularity" colors={colors} small />
              </View>
              <View style={{ flex: 1 }}>
                <FormField label="Label" value={opt.label} onChangeText={(v) => updateSortOption(index, 'label', v)} placeholder="Popularity" colors={colors} small />
              </View>
            </View>

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <IconInput label="Icon" value={opt.icon} onChange={(v) => updateSortOption(index, 'icon', v)} placeholder="flame-outline" colors={colors} small />
              </View>
              <View style={{ flex: 1 }}>
                <FormField label="Sort Order" value={opt.sortOrder?.toString() || '0'} onChangeText={(v) => updateSortOption(index, 'sortOrder', parseInt(v) || 0)} keyboardType="numeric" colors={colors} small />
              </View>
            </View>

            <View style={styles.switchRow}>
              <Text style={[styles.switchLabel, { color: colors.text }]}>Enabled</Text>
              <Switch
                value={opt.enabled}
                onValueChange={(v) => updateSortOption(index, 'enabled', v)}
                trackColor={{ false: '#D1D5DB', true: `${colors.success}80` }}
                thumbColor={opt.enabled ? colors.success : '#9CA3AF'}
              />
            </View>
          </View>
        ))}

        <TouchableOpacity style={[styles.addBtn, { borderColor: colors.tint }]} onPress={addSortOption}>
          <Ionicons name="add-circle-outline" size={20} color={colors.tint} />
          <Text style={[styles.addText, { color: colors.tint }]}>Add Sort Option</Text>
        </TouchableOpacity>
      </View>

      {/* ==================== 2. Filter Options ==================== */}
      <View style={styles.sectionBlock}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Filter Options</Text>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <FormField
              label="Price Max"
              value={filterOptions.priceMax?.toString() || ''}
              onChangeText={(v) => updateFilter('priceMax', v === '' ? undefined : parseInt(v) || 0)}
              placeholder="500"
              keyboardType="numeric"
              colors={colors}
              small
            />
          </View>
          <View style={{ flex: 1 }}>
            <FormField
              label="Price Label"
              value={filterOptions.priceLabel || ''}
              onChangeText={(v) => updateFilter('priceLabel', v)}
              placeholder={filterOptions.priceMax ? `Under \u20B9${filterOptions.priceMax}` : 'Under \u20B9500'}
              colors={colors}
              small
            />
          </View>
        </View>

        <FormField
          label="Rating Threshold"
          value={filterOptions.ratingThreshold?.toString() || ''}
          onChangeText={(v) => updateFilter('ratingThreshold', v === '' ? undefined : parseFloat(v) || 0)}
          placeholder="4.0"
          keyboardType="numeric"
          colors={colors}
          small
        />

        <View style={styles.switchRow}>
          <Text style={[styles.switchLabel, { color: colors.text }]}>Show Price Filter</Text>
          <Switch
            value={filterOptions.showPriceFilter ?? true}
            onValueChange={(v) => updateFilter('showPriceFilter', v)}
            trackColor={{ false: '#D1D5DB', true: `${colors.success}80` }}
            thumbColor={filterOptions.showPriceFilter !== false ? colors.success : '#9CA3AF'}
          />
        </View>

        <View style={styles.switchRow}>
          <Text style={[styles.switchLabel, { color: colors.text }]}>Show Rating Filter</Text>
          <Switch
            value={filterOptions.showRatingFilter ?? true}
            onValueChange={(v) => updateFilter('showRatingFilter', v)}
            trackColor={{ false: '#D1D5DB', true: `${colors.success}80` }}
            thumbColor={filterOptions.showRatingFilter !== false ? colors.success : '#9CA3AF'}
          />
        </View>

        <View style={styles.switchRow}>
          <Text style={[styles.switchLabel, { color: colors.text }]}>Show Open Now</Text>
          <Switch
            value={filterOptions.showOpenNow ?? true}
            onValueChange={(v) => updateFilter('showOpenNow', v)}
            trackColor={{ false: '#D1D5DB', true: `${colors.success}80` }}
            thumbColor={filterOptions.showOpenNow !== false ? colors.success : '#9CA3AF'}
          />
        </View>
      </View>

      {/* ==================== 3. Store Display Config ==================== */}
      <View style={styles.sectionBlock}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Store Display Config</Text>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <FormField
              label="Stores Per Page"
              value={storeDisplayConfig.storesPerPage?.toString() || '10'}
              onChangeText={(v) => updateStoreDisplay('storesPerPage', v === '' ? 10 : parseInt(v) || 10)}
              placeholder="10"
              keyboardType="numeric"
              colors={colors}
              small
            />
          </View>
          <View style={{ flex: 1 }}>
            <FormField
              label="Default Coins Multiplier"
              value={storeDisplayConfig.defaultCoinsMultiplier?.toString() || '4.5'}
              onChangeText={(v) => updateStoreDisplay('defaultCoinsMultiplier', v === '' ? 4.5 : parseFloat(v) || 4.5)}
              placeholder="4.5"
              keyboardType="numeric"
              colors={colors}
              small
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <FormField
              label="Default Review Bonus"
              value={storeDisplayConfig.defaultReviewBonus?.toString() || '20'}
              onChangeText={(v) => updateStoreDisplay('defaultReviewBonus', v === '' ? 20 : parseInt(v) || 20)}
              placeholder="20"
              keyboardType="numeric"
              colors={colors}
              small
            />
          </View>
          <View style={{ flex: 1 }}>
            <FormField
              label="Default Visit Milestone"
              value={storeDisplayConfig.defaultVisitMilestone?.toString() || '5'}
              onChangeText={(v) => updateStoreDisplay('defaultVisitMilestone', v === '' ? 5 : parseInt(v) || 5)}
              placeholder="5"
              keyboardType="numeric"
              colors={colors}
              small
            />
          </View>
        </View>

        <FormField
          label="Tag Exclusions (comma-separated)"
          value={(storeDisplayConfig.tagExclusions || []).join(', ')}
          onChangeText={(v) => updateStoreDisplay('tagExclusions', v.split(',').map((t: string) => t.trim()).filter(Boolean))}
          placeholder="halal, pure-veg, veg, non-veg, jain"
          colors={colors}
          small
        />
      </View>

      {/* ==================== 4. Trust Badges ==================== */}
      <View style={styles.sectionBlock}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Trust Badges</Text>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {trustBadges.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="information-circle-outline" size={24} color={colors.icon} />
            <Text style={[styles.emptyText, { color: colors.icon }]}>No trust badges configured.</Text>
          </View>
        )}

        {trustBadges.map((badge: any, index: number) => (
          <View key={index} style={[styles.card, { borderColor: colors.border }]}>
            <View style={styles.cardHeader}>
              <Text style={[styles.cardIndex, { color: colors.icon }]}>#{index + 1}</Text>
              <TouchableOpacity onPress={() => removeTrustBadge(index)}>
                <Ionicons name="trash-outline" size={18} color="#EF4444" />
              </TouchableOpacity>
            </View>

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <IconInput label="Icon" value={badge.icon} onChange={(v) => updateTrustBadge(index, 'icon', v)} placeholder="shield-checkmark-outline" colors={colors} small />
              </View>
              <View style={{ flex: 1 }}>
                <ColorInput label="Color" value={badge.color} onChange={(v) => updateTrustBadge(index, 'color', v)} placeholder="#22C55E" colors={colors} small />
              </View>
            </View>

            <FormField label="Label" value={badge.label} onChangeText={(v) => updateTrustBadge(index, 'label', v)} placeholder="Verified Store" colors={colors} small />
          </View>
        ))}

        <TouchableOpacity style={[styles.addBtn, { borderColor: colors.tint }]} onPress={addTrustBadge}>
          <Ionicons name="add-circle-outline" size={20} color={colors.tint} />
          <Text style={[styles.addText, { color: colors.tint }]}>Add Trust Badge</Text>
        </TouchableOpacity>
      </View>

      {/* ==================== 5. Loyalty Config ==================== */}
      <View style={styles.sectionBlock}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Loyalty Config</Text>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <FormField
          label="Empty Message"
          value={loyaltyConfig.emptyMessage || ''}
          onChangeText={(v) => updateLoyalty('emptyMessage', v)}
          placeholder="No loyalty rewards available yet"
          colors={colors}
          small
        />

        <FormField
          label="Display Limit"
          value={loyaltyConfig.displayLimit?.toString() || ''}
          onChangeText={(v) => updateLoyalty('displayLimit', v === '' ? undefined : parseInt(v) || 0)}
          placeholder="5"
          keyboardType="numeric"
          colors={colors}
          small
        />
      </View>

      {/* ==================== 6. Experience Benefits ==================== */}
      <View style={styles.sectionBlock}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Experience Benefits</Text>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {experienceBenefits.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="information-circle-outline" size={24} color={colors.icon} />
            <Text style={[styles.emptyText, { color: colors.icon }]}>No experience benefits configured.</Text>
          </View>
        )}

        {experienceBenefits.map((benefit: any, index: number) => (
          <View key={index} style={[styles.card, { borderColor: colors.border }]}>
            <View style={styles.cardHeader}>
              <Text style={[styles.cardIndex, { color: colors.icon }]}>#{index + 1}</Text>
              <TouchableOpacity onPress={() => removeExperienceBenefit(index)}>
                <Ionicons name="trash-outline" size={18} color="#EF4444" />
              </TouchableOpacity>
            </View>

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <IconInput label="Icon" value={benefit.icon} onChange={(v) => updateExperienceBenefit(index, 'icon', v)} placeholder="star-outline" colors={colors} small />
              </View>
              <View style={{ flex: 1 }}>
                <FormField label="Title" value={benefit.title} onChangeText={(v) => updateExperienceBenefit(index, 'title', v)} placeholder="Premium Experience" colors={colors} small />
              </View>
            </View>

            <FormField label="Description" value={benefit.description} onChangeText={(v) => updateExperienceBenefit(index, 'description', v)} placeholder="Enjoy exclusive perks and benefits" colors={colors} small />
          </View>
        ))}

        <TouchableOpacity style={[styles.addBtn, { borderColor: colors.tint }]} onPress={addExperienceBenefit}>
          <Ionicons name="add-circle-outline" size={20} color={colors.tint} />
          <Text style={[styles.addText, { color: colors.tint }]}>Add Experience Benefit</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

SortFilterManager.displayName = 'SortFilterManager';
export default SortFilterManager;

const styles = StyleSheet.create({
  sectionBlock: { marginBottom: 20 },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 6 },
  divider: { height: 1, marginBottom: 12 },
  card: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 10 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardIndex: { fontSize: 13, fontWeight: '700' },
  row: { flexDirection: 'row', gap: 10 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
  switchLabel: { fontSize: 13, fontWeight: '600' },
  emptyState: { alignItems: 'center', paddingVertical: 20, gap: 8 },
  emptyText: { fontSize: 13, fontWeight: '500' },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 10, borderWidth: 1.5, borderStyle: 'dashed', gap: 6, marginTop: 4 },
  addText: { fontSize: 14, fontWeight: '600' },
  initBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1, marginTop: 4 },
  initBtnText: { fontSize: 13, fontWeight: '600' },
});
