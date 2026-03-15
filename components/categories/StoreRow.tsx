import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Image, ScrollView, Platform,
  Modal, Pressable, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AdminStore } from '../../services/api/stores';
import { Colors } from '../../constants/Colors';

interface StoreRowProps {
  store: AdminStore;
  categories: Array<{ _id: string; name: string; slug: string }>;
  isSelected: boolean;
  onToggleSelect: () => void;
  onReassignCategory: (storeId: string, categoryId: string) => void;
  onToggleFeatured: (storeId: string, featured: boolean) => void;
  onToggleCapability: (storeId: string, capability: string, enabled: boolean) => void;
  colors: typeof Colors.light;
}

// All service capability definitions
const ALL_SERVICE_CAPS: Record<string, { label: string; fullLabel: string; color: string }> = {
  homeDelivery: { label: 'HD', fullLabel: 'Home Delivery', color: Colors.light.info },
  driveThru:    { label: 'DT', fullLabel: 'Drive Thru', color: Colors.light.purple },
  tableBooking: { label: 'TB', fullLabel: 'Table Booking', color: Colors.light.pink },
  dineIn:       { label: 'DI', fullLabel: 'Dine In', color: Colors.light.warning },
  storePickup:  { label: 'SP', fullLabel: 'Store Pickup', color: Colors.light.success },
};

// Service capabilities per parent category
const PARENT_CAPABILITIES: Record<string, string[]> = {
  'food-dining':        ['homeDelivery', 'driveThru', 'tableBooking', 'dineIn', 'storePickup'],
  'grocery-essentials': ['homeDelivery', 'storePickup'],
  'beauty-wellness':    ['tableBooking', 'storePickup'],
  'healthcare':         ['homeDelivery', 'storePickup'],
  'fashion':            ['homeDelivery', 'storePickup'],
  'electronics':        ['homeDelivery', 'storePickup'],
  'fitness-sports':     ['tableBooking', 'storePickup'],
  'education-learning': ['tableBooking'],
  'home-services':      ['homeDelivery'],
  'travel-experiences': ['tableBooking'],
  'entertainment':      ['tableBooking'],
  'financial-lifestyle': [],
};

// Map every subcategory slug back to its parent slug
const SUBCATEGORY_TO_PARENT: Record<string, string> = {
  // Food & Dining
  'cafes': 'food-dining', 'qsr-fast-food': 'food-dining', 'family-restaurants': 'food-dining',
  'fine-dining': 'food-dining', 'ice-cream-dessert': 'food-dining', 'bakery-confectionery': 'food-dining',
  'cloud-kitchens': 'food-dining', 'street-food': 'food-dining',
  // Grocery & Essentials
  'supermarkets': 'grocery-essentials', 'kirana-stores': 'grocery-essentials', 'fresh-vegetables': 'grocery-essentials',
  'meat-fish': 'grocery-essentials', 'dairy': 'grocery-essentials', 'packaged-goods': 'grocery-essentials',
  'water-cans': 'grocery-essentials',
  // Beauty & Wellness
  'salons': 'beauty-wellness', 'spa-massage': 'beauty-wellness', 'beauty-services': 'beauty-wellness',
  'cosmetology': 'beauty-wellness', 'dermatology': 'beauty-wellness', 'skincare-cosmetics': 'beauty-wellness',
  'nail-studios': 'beauty-wellness', 'grooming-men': 'beauty-wellness',
  // Healthcare
  'pharmacy': 'healthcare', 'clinics': 'healthcare', 'diagnostics': 'healthcare', 'dental': 'healthcare',
  'physiotherapy': 'healthcare', 'home-nursing': 'healthcare', 'vision-eyewear': 'healthcare',
  // Fashion
  'footwear': 'fashion', 'bags-accessories': 'fashion', 'mobile-accessories': 'fashion',
  'watches': 'fashion', 'jewelry': 'fashion', 'local-brands': 'fashion',
  // Fitness & Sports
  'gyms': 'fitness-sports', 'crossfit': 'fitness-sports', 'yoga': 'fitness-sports', 'zumba': 'fitness-sports',
  'martial-arts': 'fitness-sports', 'sports-academies': 'fitness-sports', 'sportswear': 'fitness-sports',
  // Education & Learning
  'coaching-centers': 'education-learning', 'skill-development': 'education-learning',
  'music-dance-classes': 'education-learning', 'art-craft': 'education-learning',
  'vocational': 'education-learning', 'language-training': 'education-learning',
  // Home Services
  'ac-repair': 'home-services', 'plumbing': 'home-services', 'electrical': 'home-services',
  'cleaning': 'home-services', 'pest-control': 'home-services', 'house-shifting': 'home-services',
  'laundry-dry-cleaning': 'home-services', 'home-tutors': 'home-services',
  // Travel & Experiences
  'hotels': 'travel-experiences', 'intercity-travel': 'travel-experiences', 'taxis': 'travel-experiences',
  'bike-rentals': 'travel-experiences', 'weekend-getaways': 'travel-experiences',
  'tours': 'travel-experiences', 'activities': 'travel-experiences',
  // Entertainment
  'movies': 'entertainment', 'live-events': 'entertainment', 'festivals': 'entertainment',
  'workshops': 'entertainment', 'amusement-parks': 'entertainment', 'gaming-cafes': 'entertainment',
  'vr-ar-experiences': 'entertainment',
  // Financial Lifestyle
  'bill-payments': 'financial-lifestyle', 'mobile-recharge': 'financial-lifestyle',
  'broadband': 'financial-lifestyle', 'cable-ott': 'financial-lifestyle',
  'insurance': 'financial-lifestyle', 'gold-savings': 'financial-lifestyle', 'donations': 'financial-lifestyle',
  // Electronics
  'mobile-phones': 'electronics', 'laptops': 'electronics', 'televisions': 'electronics',
  'cameras': 'electronics', 'audio-headphones': 'electronics', 'gaming': 'electronics',
  'accessories': 'electronics', 'smartwatches': 'electronics',
};

// Fallback: show all capabilities if category slug not recognized
const ALL_CAPABILITY_KEYS = Object.keys(ALL_SERVICE_CAPS);

function getRelevantCaps(categorySlug?: string): { key: string; label: string; fullLabel: string; color: string }[] {
  if (!categorySlug) {
    return ALL_CAPABILITY_KEYS.map((k) => ({ key: k, ...ALL_SERVICE_CAPS[k] }));
  }
  // Resolve to parent slug (if it's a subcategory) or use directly (if it's a parent)
  const parentSlug = PARENT_CAPABILITIES[categorySlug] ? categorySlug : SUBCATEGORY_TO_PARENT[categorySlug];
  const keys = parentSlug && PARENT_CAPABILITIES[parentSlug]
    ? PARENT_CAPABILITIES[parentSlug]
    : ALL_CAPABILITY_KEYS;
  return keys.map((k) => ({ key: k, ...ALL_SERVICE_CAPS[k] })).filter(Boolean);
}

const StoreRow = React.memo(({
  store,
  categories,
  isSelected,
  onToggleSelect,
  onReassignCategory,
  onToggleFeatured,
  onToggleCapability,
  colors,
}: StoreRowProps) => {
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  // Status determination
  const getStatus = () => {
    if (store.isSuspended) return { label: 'Suspended', color: Colors.light.error, bg: colors.errorLight };
    if (store.adminApproved === false) return { label: 'Pending', color: Colors.light.warning, bg: colors.warningLight };
    if (store.isActive) return { label: 'Active', color: Colors.light.success, bg: colors.successLight };
    return { label: 'Inactive', color: Colors.light.secondaryText, bg: colors.backgroundSecondary };
  };

  const status = getStatus();

  // Resolve category info: backend returns categoryInfo from $lookup
  const catInfo = store.categoryInfo || (typeof store.category === 'object' ? store.category : undefined);
  const catSlug = catInfo?.slug;
  const catId = catInfo?._id || (typeof store.category === 'string' ? store.category : undefined);

  // Get all relevant capabilities for this category and check which are enabled
  const relevantCaps = getRelevantCaps(catSlug);

  const handleCategorySelect = (categoryId: string) => {
    setShowCategoryPicker(false);
    if (categoryId !== catId) {
      onReassignCategory(store._id, categoryId);
    }
  };

  return (
    <View style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Checkbox */}
      <TouchableOpacity style={styles.checkbox} onPress={onToggleSelect}>
        <Ionicons
          name={isSelected ? 'checkbox' : 'square-outline'}
          size={20}
          color={isSelected ? colors.tint : colors.icon}
        />
      </TouchableOpacity>

      {/* Logo */}
      <View style={styles.logoContainer}>
        {store.logo ? (
          <Image source={{ uri: store.logo }} style={styles.logo} />
        ) : (
          <View style={[styles.logoFallback, { backgroundColor: `${colors.tint}15` }]}>
            <Ionicons name="storefront-outline" size={18} color={colors.tint} />
          </View>
        )}
      </View>

      {/* Store Info */}
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>{store.name}</Text>
          {/* Status badge */}
          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
            <View style={[styles.statusDot, { backgroundColor: status.color }]} />
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>

        <Text style={[styles.slug, { color: colors.icon }]} numberOfLines={1}>{store.slug}</Text>

        {/* Second row: category, rating, services */}
        <View style={styles.metaRow}>
          {/* Category chip */}
          {catInfo && (
            <View style={[styles.categoryChip, { backgroundColor: `${colors.tint}12` }]}>
              <Text style={[styles.categoryText, { color: colors.tint }]} numberOfLines={1}>
                {catInfo.name}
              </Text>
            </View>
          )}

          {/* Rating */}
          {store.ratings && store.ratings.count > 0 && (
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={11} color={Colors.light.warning} />
              <Text style={[styles.ratingText, { color: colors.text }]}>
                {store.ratings.average.toFixed(1)}
              </Text>
              <Text style={[styles.ratingCount, { color: colors.icon }]}>
                ({store.ratings.count})
              </Text>
            </View>
          )}

          {/* Service capabilities (tappable toggles) */}
          {relevantCaps.length > 0 && (
            <View style={styles.servicesRow}>
              {relevantCaps.map((svc) => {
                const isEnabled = !!(store.serviceCapabilities as any)?.[svc.key]?.enabled;
                return (
                  <TouchableOpacity
                    key={svc.key}
                    style={[
                      styles.serviceBadge,
                      isEnabled
                        ? { backgroundColor: `${svc.color}20`, borderColor: svc.color, borderWidth: 1 }
                        : { backgroundColor: `${colors.icon}08`, borderColor: `${colors.icon}30`, borderWidth: 1 },
                    ]}
                    onPress={() => onToggleCapability(store._id, svc.key, !isEnabled)}
                    activeOpacity={0.6}
                  >
                    <View style={[
                      styles.serviceDot,
                      { backgroundColor: isEnabled ? svc.color : `${colors.icon}40` },
                    ]} />
                    <Text style={[
                      styles.serviceLabel,
                      { color: isEnabled ? svc.color : `${colors.icon}60` },
                      !isEnabled && { textDecorationLine: 'line-through' },
                    ]}>
                      {svc.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        {/* Category reassign */}
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: `${colors.tint}12` }]}
          onPress={() => setShowCategoryPicker(true)}
        >
          <Ionicons name="swap-horizontal-outline" size={14} color={colors.tint} />
        </TouchableOpacity>

        {/* Featured toggle */}
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: store.isFeatured ? colors.warningLight : `${colors.icon}12` }]}
          onPress={() => onToggleFeatured(store._id, !store.isFeatured)}
        >
          <Ionicons
            name={store.isFeatured ? 'star' : 'star-outline'}
            size={16}
            color={store.isFeatured ? Colors.light.warning : colors.icon}
          />
        </TouchableOpacity>
      </View>

      {/* Category Picker Modal */}
      <Modal
        visible={showCategoryPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCategoryPicker(false)}
      >
        <Pressable
          style={styles.pickerOverlay}
          onPress={() => setShowCategoryPicker(false)}
        >
          <Pressable style={[styles.pickerModal, { backgroundColor: colors.card }]} onPress={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <View style={[styles.pickerModalHeader, { borderBottomColor: colors.border }]}>
              <View style={styles.pickerModalHeaderLeft}>
                <Ionicons name="swap-horizontal-outline" size={20} color={colors.tint} />
                <Text style={[styles.pickerModalTitle, { color: colors.text }]}>Reassign Category</Text>
              </View>
              <TouchableOpacity
                style={[styles.pickerModalCloseBtn, { backgroundColor: `${colors.icon}12` }]}
                onPress={() => setShowCategoryPicker(false)}
              >
                <Ionicons name="close" size={18} color={colors.icon} />
              </TouchableOpacity>
            </View>

            {/* Store info */}
            <View style={[styles.pickerStoreInfo, { borderBottomColor: colors.border }]}>
              {store.logo ? (
                <Image source={{ uri: store.logo }} style={styles.pickerStoreLogo} />
              ) : (
                <View style={[styles.pickerStoreLogoFallback, { backgroundColor: `${colors.tint}15` }]}>
                  <Ionicons name="storefront-outline" size={16} color={colors.tint} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={[styles.pickerStoreName, { color: colors.text }]} numberOfLines={1}>{store.name}</Text>
                {catInfo && (
                  <Text style={[styles.pickerStoreCategory, { color: colors.icon }]} numberOfLines={1}>
                    Current: {catInfo.name}
                  </Text>
                )}
              </View>
            </View>

            {/* Category List */}
            <ScrollView style={styles.pickerList} showsVerticalScrollIndicator={false}>
              {categories.map((cat, index) => {
                const isCurrent = cat._id === catId;
                return (
                  <TouchableOpacity
                    key={cat._id}
                    style={[
                      styles.pickerListItem,
                      { borderBottomColor: index < categories.length - 1 ? `${colors.border}80` : 'transparent' },
                      isCurrent && { backgroundColor: `${colors.tint}10` },
                    ]}
                    onPress={() => handleCategorySelect(cat._id)}
                    activeOpacity={0.6}
                  >
                    <View style={[
                      styles.pickerListRadio,
                      { borderColor: isCurrent ? colors.tint : colors.border },
                      isCurrent && { backgroundColor: colors.tint, borderColor: colors.tint },
                    ]}>
                      {isCurrent && <Ionicons name="checkmark" size={12} color={colors.card} />}
                    </View>
                    <Text
                      style={[
                        styles.pickerListItemText,
                        { color: colors.text },
                        isCurrent && { color: colors.tint, fontWeight: '700' },
                      ]}
                      numberOfLines={1}
                    >
                      {cat.name}
                    </Text>
                    {isCurrent && (
                      <View style={[styles.currentBadge, { backgroundColor: `${colors.tint}15` }]}>
                        <Text style={[styles.currentBadgeText, { color: colors.tint }]}>Current</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}, (prev, next) =>
  prev.store._id === next.store._id &&
  prev.store.isActive === next.store.isActive &&
  prev.store.isSuspended === next.store.isSuspended &&
  prev.store.adminApproved === next.store.adminApproved &&
  prev.store.isFeatured === next.store.isFeatured &&
  prev.store.categoryInfo?._id === next.store.categoryInfo?._id &&
  prev.store.serviceCapabilities === next.store.serviceCapabilities &&
  prev.isSelected === next.isSelected
);

StoreRow.displayName = 'StoreRow';
export default StoreRow;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    marginBottom: 6,
    borderWidth: 1,
    gap: 8,
  },
  checkbox: {
    padding: 2,
  },
  logoContainer: {
    width: 32,
    height: 32,
  },
  logo: {
    width: 32,
    height: 32,
    borderRadius: 8,
  },
  logoFallback: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  name: {
    fontSize: 13,
    fontWeight: '700',
    flexShrink: 1,
  },
  slug: {
    fontSize: 10,
    marginTop: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
    gap: 3,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 3,
  },
  categoryChip: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    maxWidth: 100,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '600',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingText: {
    fontSize: 10,
    fontWeight: '700',
  },
  ratingCount: {
    fontSize: 9,
  },
  servicesRow: {
    flexDirection: 'row',
    gap: 3,
  },
  serviceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 3,
    paddingVertical: 1,
    borderRadius: 3,
    gap: 2,
  },
  serviceDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  serviceLabel: {
    fontSize: 8,
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Category picker modal
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  pickerModal: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: Dimensions.get('window').height * 0.65,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  pickerModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  pickerModalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pickerModalTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  pickerModalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerStoreInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 10,
  },
  pickerStoreLogo: {
    width: 36,
    height: 36,
    borderRadius: 10,
  },
  pickerStoreLogoFallback: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerStoreName: {
    fontSize: 14,
    fontWeight: '700',
  },
  pickerStoreCategory: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  pickerList: {
    paddingHorizontal: 12,
    paddingTop: 4,
  },
  pickerListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
    borderRadius: 8,
    marginVertical: 1,
  },
  pickerListRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerListItemText: {
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
  },
  currentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  currentBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
});
