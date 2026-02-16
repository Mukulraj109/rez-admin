import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Image, ScrollView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AdminStore } from '../../services/api/stores';

interface StoreRowProps {
  store: AdminStore;
  categories: Array<{ _id: string; name: string }>;
  isSelected: boolean;
  onToggleSelect: () => void;
  onReassignCategory: (storeId: string, categoryId: string) => void;
  onToggleFeatured: (storeId: string, featured: boolean) => void;
  colors: { text: string; icon: string; border: string; tint: string; card: string; success: string };
}

// Service capability abbreviations
const SERVICE_CAPS: { key: string; label: string; color: string }[] = [
  { key: 'homeDelivery', label: 'HD', color: '#3B82F6' },
  { key: 'driveThru', label: 'DT', color: '#8B5CF6' },
  { key: 'tableBooking', label: 'TB', color: '#EC4899' },
  { key: 'dineIn', label: 'DI', color: '#F59E0B' },
  { key: 'storePickup', label: 'SP', color: '#10B981' },
];

const StoreRow = React.memo(({
  store,
  categories,
  isSelected,
  onToggleSelect,
  onReassignCategory,
  onToggleFeatured,
  colors,
}: StoreRowProps) => {
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  // Status determination
  const getStatus = () => {
    if (store.isSuspended) return { label: 'Suspended', color: '#EF4444', bg: '#FEE2E2' };
    if (store.adminApproved === false) return { label: 'Pending', color: '#F59E0B', bg: '#FEF3C7' };
    if (store.isActive) return { label: 'Active', color: '#10B981', bg: '#D1FAE5' };
    return { label: 'Inactive', color: '#6B7280', bg: '#F3F4F6' };
  };

  const status = getStatus();
  const enabledServices = SERVICE_CAPS.filter((cap) => {
    const capabilities = store.serviceCapabilities as any;
    return capabilities?.[cap.key]?.enabled;
  });

  const handleCategorySelect = (categoryId: string) => {
    setShowCategoryPicker(false);
    if (categoryId !== store.category?._id) {
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
          {store.category && (
            <View style={[styles.categoryChip, { backgroundColor: `${colors.tint}12` }]}>
              <Text style={[styles.categoryText, { color: colors.tint }]} numberOfLines={1}>
                {store.category.name}
              </Text>
            </View>
          )}

          {/* Rating */}
          {store.ratings && store.ratings.count > 0 && (
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={11} color="#F59E0B" />
              <Text style={[styles.ratingText, { color: colors.text }]}>
                {store.ratings.average.toFixed(1)}
              </Text>
              <Text style={[styles.ratingCount, { color: colors.icon }]}>
                ({store.ratings.count})
              </Text>
            </View>
          )}

          {/* Service capabilities */}
          {enabledServices.length > 0 && (
            <View style={styles.servicesRow}>
              {enabledServices.map((svc) => (
                <View key={svc.key} style={[styles.serviceBadge, { backgroundColor: `${svc.color}18` }]}>
                  <View style={[styles.serviceDot, { backgroundColor: svc.color }]} />
                  <Text style={[styles.serviceLabel, { color: svc.color }]}>{svc.label}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        {/* Category reassign */}
        <View style={styles.reassignContainer}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: `${colors.tint}12`, borderColor: colors.border }]}
            onPress={() => setShowCategoryPicker(!showCategoryPicker)}
          >
            <Ionicons name="swap-horizontal-outline" size={14} color={colors.tint} />
          </TouchableOpacity>

          {showCategoryPicker && (
            <View style={[styles.pickerDropdown, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <ScrollView style={styles.pickerScroll} nestedScrollEnabled>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat._id}
                    style={[
                      styles.pickerItem,
                      cat._id === store.category?._id && { backgroundColor: `${colors.tint}12` },
                    ]}
                    onPress={() => handleCategorySelect(cat._id)}
                  >
                    <Text
                      style={[
                        styles.pickerItemText,
                        { color: colors.text },
                        cat._id === store.category?._id && { color: colors.tint, fontWeight: '700' },
                      ]}
                      numberOfLines={1}
                    >
                      {cat.name}
                    </Text>
                    {cat._id === store.category?._id && (
                      <Ionicons name="checkmark" size={14} color={colors.tint} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {/* Featured toggle */}
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: store.isFeatured ? '#FEF3C7' : `${colors.icon}12` }]}
          onPress={() => onToggleFeatured(store._id, !store.isFeatured)}
        >
          <Ionicons
            name={store.isFeatured ? 'star' : 'star-outline'}
            size={16}
            color={store.isFeatured ? '#F59E0B' : colors.icon}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}, (prev, next) =>
  prev.store._id === next.store._id &&
  prev.store.isActive === next.store.isActive &&
  prev.store.isSuspended === next.store.isSuspended &&
  prev.store.adminApproved === next.store.adminApproved &&
  prev.store.isFeatured === next.store.isFeatured &&
  prev.store.category?._id === next.store.category?._id &&
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
  reassignContainer: {
    position: 'relative',
    ...(Platform.OS === 'web' ? { zIndex: 10 } : {}),
  },
  actionBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerDropdown: {
    position: 'absolute',
    top: 34,
    right: 0,
    width: 180,
    maxHeight: 200,
    borderRadius: 10,
    borderWidth: 1,
    ...(Platform.OS === 'web'
      ? { zIndex: 100, boxShadow: '0px 4px 12px rgba(0,0,0,0.15)' }
      : { elevation: 8 }),
  },
  pickerScroll: {
    maxHeight: 196,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  pickerItemText: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
});
