import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, TextInput, FlatList, Platform,
  Modal, Pressable, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { storesService, AdminStore, Pagination } from '../../services/api/stores';
import { showAlert, showConfirm } from '../../utils/alert';
import StoreRow from './StoreRow';
import { Colors } from '../../constants/Colors';

interface CategoryStoresTabProps {
  categories: Array<{ _id: string; name: string; slug: string }>;
  colors: {
    text: string;
    icon: string;
    border: string;
    tint: string;
    card: string;
    background: string;
    success: string;
  };
}

const PAGE_LIMIT = 20;

const CategoryStoresTab = React.memo(({ categories, colors }: CategoryStoresTabProps) => {
  // Filter & search state
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');

  // Data state
  const [stores, setStores] = useState<AdminStore[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: PAGE_LIMIT, total: 0, pages: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Selection state
  const [selectedStoreIds, setSelectedStoreIds] = useState<Set<string>>(new Set());

  // Bulk action state
  const [bulkCategoryId, setBulkCategoryId] = useState<string>('');
  const [showBulkCategoryPicker, setShowBulkCategoryPicker] = useState(false);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchDebounced(searchQuery);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Stats (page-scoped counts; total is from backend pagination)
  const stats = useMemo(() => {
    const total = pagination.total;
    const pageActive = stores.filter((s) => s.isActive && !s.isSuspended).length;
    const pageSuspended = stores.filter((s) => s.isSuspended).length;
    const pageFeatured = stores.filter((s) => s.isFeatured).length;
    return { total, pageActive, pageSuspended, pageFeatured };
  }, [stores, pagination.total]);

  // ==================== LOAD STORES ====================

  const loadStores = useCallback(async (page: number = 1) => {
    try {
      setIsLoading(true);
      let result;

      if (selectedCategory === 'all') {
        result = await storesService.getStores({
          search: searchDebounced || undefined,
          page,
          limit: PAGE_LIMIT,
        });
      } else {
        result = await storesService.getStoresByCategory(selectedCategory, {
          search: searchDebounced || undefined,
          page,
          limit: PAGE_LIMIT,
        });
      }

      setStores(result.stores);
      setPagination(result.pagination);
      setSelectedStoreIds(new Set());
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to load stores');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedCategory, searchDebounced]);

  // Reload on filter/search change
  useEffect(() => {
    loadStores(1);
  }, [loadStores]);

  // ==================== ACTIONS ====================

  const handleReassignCategory = useCallback(async (storeId: string, categoryId: string) => {
    try {
      // Optimistic update
      const targetCat = categories.find((c) => c._id === categoryId);
      setStores((prev) =>
        prev.map((s) =>
          s._id === storeId
            ? {
                ...s,
                category: categoryId,
                categoryInfo: targetCat ? { _id: targetCat._id, name: targetCat.name, slug: targetCat.slug } : s.categoryInfo,
              }
            : s
        )
      );
      await storesService.reassignCategory(storeId, categoryId);
    } catch (error: any) {
      // Revert by reloading
      loadStores(pagination.page);
      showAlert('Error', error.message || 'Failed to reassign category');
    }
  }, [categories, loadStores, pagination.page]);

  const handleToggleFeatured = useCallback(async (storeId: string, featured: boolean) => {
    try {
      // Optimistic update
      setStores((prev) =>
        prev.map((s) => (s._id === storeId ? { ...s, isFeatured: featured } : s))
      );
      await storesService.updateAdminActions(storeId, { isFeatured: featured });
    } catch (error: any) {
      // Revert by reloading
      loadStores(pagination.page);
      showAlert('Error', error.message || 'Failed to update featured status');
    }
  }, [loadStores, pagination.page]);

  const handleToggleCapability = useCallback(async (storeId: string, capability: string, enabled: boolean) => {
    try {
      // Optimistic update
      setStores((prev) =>
        prev.map((s) =>
          s._id === storeId
            ? {
                ...s,
                serviceCapabilities: {
                  ...s.serviceCapabilities,
                  [capability]: { ...(s.serviceCapabilities as any)?.[capability], enabled },
                },
              }
            : s
        )
      );
      await storesService.toggleServiceCapability(storeId, capability, enabled);
    } catch (error: any) {
      // Revert by reloading
      loadStores(pagination.page);
      showAlert('Error', error.message || 'Failed to toggle capability');
    }
  }, [loadStores, pagination.page]);

  const handleToggleSelect = useCallback((storeId: string) => {
    setSelectedStoreIds((prev) => {
      const next = new Set(prev);
      if (next.has(storeId)) {
        next.delete(storeId);
      } else {
        next.add(storeId);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedStoreIds.size === stores.length) {
      setSelectedStoreIds(new Set());
    } else {
      setSelectedStoreIds(new Set(stores.map((s) => s._id)));
    }
  }, [stores, selectedStoreIds.size]);

  const handleBulkReassign = useCallback(() => {
    if (!bulkCategoryId) {
      showAlert('Select Category', 'Please select a target category first.');
      return;
    }
    if (selectedStoreIds.size === 0) {
      showAlert('No Selection', 'Please select stores to move.');
      return;
    }

    const targetCat = categories.find((c) => c._id === bulkCategoryId);
    showConfirm(
      'Bulk Move Stores',
      `Move ${selectedStoreIds.size} store(s) to "${targetCat?.name || 'selected category'}"?`,
      async () => {
        try {
          setIsBulkProcessing(true);
          await storesService.bulkReassignCategory(Array.from(selectedStoreIds), bulkCategoryId);
          showAlert('Success', `${selectedStoreIds.size} store(s) moved successfully`);
          setSelectedStoreIds(new Set());
          setBulkCategoryId('');
          setShowBulkCategoryPicker(false);
          await loadStores(pagination.page);
        } catch (error: any) {
          showAlert('Error', error.message || 'Failed to bulk reassign');
        } finally {
          setIsBulkProcessing(false);
        }
      },
      'Move',
      'warning'
    );
  }, [bulkCategoryId, selectedStoreIds, categories, loadStores, pagination.page]);

  // ==================== PAGINATION ====================

  const goToPage = useCallback((page: number) => {
    if (page >= 1 && page <= pagination.pages) {
      loadStores(page);
    }
  }, [loadStores, pagination.pages]);

  // ==================== RENDER HELPERS ====================

  const renderStoreItem = useCallback(({ item }: { item: AdminStore }) => (
    <StoreRow
      store={item}
      categories={categories}
      isSelected={selectedStoreIds.has(item._id)}
      onToggleSelect={() => handleToggleSelect(item._id)}
      onReassignCategory={handleReassignCategory}
      onToggleFeatured={handleToggleFeatured}
      onToggleCapability={handleToggleCapability}
      colors={colors}
    />
  ), [categories, selectedStoreIds, handleToggleSelect, handleReassignCategory, handleToggleFeatured, handleToggleCapability, colors]);

  const keyExtractor = useCallback((item: AdminStore) => item._id, []);

  const isAllSelected = stores.length > 0 && selectedStoreIds.size === stores.length;

  return (
    <View style={styles.container}>
      {/* Category Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipScroll}
        contentContainerStyle={styles.chipContent}
      >
        <TouchableOpacity
          style={[
            styles.chip,
            { borderColor: colors.border },
            selectedCategory === 'all' && { backgroundColor: colors.tint, borderColor: colors.tint },
          ]}
          onPress={() => setSelectedCategory('all')}
        >
          <Text
            style={[
              styles.chipText,
              { color: colors.icon },
              selectedCategory === 'all' && { color: colors.card },
            ]}
          >
            All
          </Text>
        </TouchableOpacity>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat._id}
            style={[
              styles.chip,
              { borderColor: colors.border },
              selectedCategory === cat._id && { backgroundColor: colors.tint, borderColor: colors.tint },
            ]}
            onPress={() => setSelectedCategory(cat._id)}
          >
            <Text
              style={[
                styles.chipText,
                { color: colors.icon },
                selectedCategory === cat._id && { color: colors.card },
              ]}
              numberOfLines={1}
            >
              {cat.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Search Bar */}
      <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Ionicons name="search-outline" size={18} color={colors.icon} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search stores..."
          placeholderTextColor={colors.icon}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color={colors.icon} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Stats Bar */}
      <View style={styles.statsRow}>
        {[
          { label: 'Total', value: stats.total, color: Colors.light.info },
          { label: 'Active (page)', value: stats.pageActive, color: Colors.light.success },
          { label: 'Suspended (page)', value: stats.pageSuspended, color: Colors.light.error },
          { label: 'Featured (page)', value: stats.pageFeatured, color: Colors.light.warning },
        ].map((stat, i) => (
          <View key={i} style={[styles.statCard, { backgroundColor: colors.card }]}>
            <View style={[styles.statDot, { backgroundColor: stat.color }]} />
            <Text style={[styles.statValue, { color: colors.text }]}>{stat.value}</Text>
            <Text style={[styles.statLabel, { color: colors.icon }]}>{stat.label}</Text>
          </View>
        ))}
      </View>

      {/* Bulk Actions Bar */}
      {selectedStoreIds.size > 0 && (
        <View style={[styles.bulkBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Top row: Select all + count */}
          <View style={styles.bulkTopRow}>
            <TouchableOpacity style={styles.selectAllBtn} onPress={handleSelectAll}>
              <Ionicons
                name={isAllSelected ? 'checkbox' : 'square-outline'}
                size={20}
                color={colors.tint}
              />
              <Text style={[styles.selectAllText, { color: colors.text }]}>
                Select All
              </Text>
            </TouchableOpacity>

            <View style={[styles.selectedCountBadge, { backgroundColor: `${colors.tint}15` }]}>
              <Text style={[styles.selectedCountText, { color: colors.tint }]}>
                {selectedStoreIds.size} selected
              </Text>
            </View>
          </View>

          {/* Bottom row: Move to picker + Apply */}
          <View style={styles.bulkBottomRow}>
            <TouchableOpacity
              style={[
                styles.bulkCategoryBtn,
                { borderColor: colors.border, backgroundColor: colors.background },
                bulkCategoryId ? { borderColor: colors.tint } : {},
              ]}
              onPress={() => setShowBulkCategoryPicker(true)}
            >
              <Ionicons name="folder-open-outline" size={15} color={bulkCategoryId ? colors.tint : colors.icon} />
              <Text style={[styles.bulkCategoryText, { color: bulkCategoryId ? colors.text : colors.icon }]} numberOfLines={1}>
                {bulkCategoryId
                  ? categories.find((c) => c._id === bulkCategoryId)?.name || 'Select...'
                  : 'Move to...'}
              </Text>
              <Ionicons name="chevron-down" size={14} color={colors.icon} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.applyBtn, { backgroundColor: colors.tint, opacity: isBulkProcessing || !bulkCategoryId ? 0.5 : 1 }]}
              onPress={handleBulkReassign}
              disabled={isBulkProcessing || !bulkCategoryId}
            >
              {isBulkProcessing ? (
                <ActivityIndicator size="small" color={colors.card} />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={16} color={colors.card} />
                  <Text style={styles.applyBtnText}>Apply</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Bulk Category Picker Modal */}
      <Modal
        visible={showBulkCategoryPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowBulkCategoryPicker(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowBulkCategoryPicker(false)}
        >
          <Pressable style={[styles.modalContent, { backgroundColor: colors.card }]} onPress={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <View style={styles.modalHeaderLeft}>
                <Ionicons name="folder-open-outline" size={20} color={colors.tint} />
                <Text style={[styles.modalTitle, { color: colors.text }]}>Move to Category</Text>
              </View>
              <TouchableOpacity
                style={[styles.modalCloseBtn, { backgroundColor: `${colors.icon}12` }]}
                onPress={() => setShowBulkCategoryPicker(false)}
              >
                <Ionicons name="close" size={18} color={colors.icon} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalSubtitle, { color: colors.icon }]}>
              Select a category for {selectedStoreIds.size} store{selectedStoreIds.size > 1 ? 's' : ''}
            </Text>

            {/* Category List */}
            <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
              {categories.map((cat, index) => {
                const isActive = cat._id === bulkCategoryId;
                return (
                  <TouchableOpacity
                    key={cat._id}
                    style={[
                      styles.modalItem,
                      { borderBottomColor: index < categories.length - 1 ? `${colors.border}80` : 'transparent' },
                      isActive && { backgroundColor: `${colors.tint}10` },
                    ]}
                    onPress={() => {
                      setBulkCategoryId(cat._id);
                      setShowBulkCategoryPicker(false);
                    }}
                    activeOpacity={0.6}
                  >
                    <View style={[
                      styles.modalItemRadio,
                      { borderColor: isActive ? colors.tint : colors.border },
                      isActive && { backgroundColor: colors.tint, borderColor: colors.tint },
                    ]}>
                      {isActive && <Ionicons name="checkmark" size={12} color={colors.card} />}
                    </View>
                    <Text
                      style={[
                        styles.modalItemText,
                        { color: colors.text },
                        isActive && { color: colors.tint, fontWeight: '700' },
                      ]}
                      numberOfLines={1}
                    >
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Store List */}
      {isLoading && stores.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.tint} />
          <Text style={[styles.centerText, { color: colors.icon }]}>Loading stores...</Text>
        </View>
      ) : stores.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="storefront-outline" size={48} color={colors.icon} />
          <Text style={[styles.centerText, { color: colors.icon }]}>
            {searchDebounced ? 'No stores match your search' : 'No stores found'}
          </Text>
          {searchDebounced && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={[styles.clearSearch, { color: colors.tint }]}>Clear search</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <>
          {/* List header with count */}
          <View style={styles.listHeader}>
            <Text style={[styles.listHeaderText, { color: colors.text }]}>
              Stores ({pagination.total})
            </Text>
            {isLoading && <ActivityIndicator size="small" color={colors.tint} />}
          </View>

          <FlatList
            data={stores}
            renderItem={renderStoreItem}
            keyExtractor={keyExtractor}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />

          {/* Pagination */}
          {pagination.pages > 1 && (
            <View style={[styles.paginationBar, { borderTopColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.pageBtn, { borderColor: colors.border }]}
                onPress={() => goToPage(pagination.page - 1)}
                disabled={pagination.page <= 1}
              >
                <Ionicons
                  name="chevron-back"
                  size={16}
                  color={pagination.page <= 1 ? colors.border : colors.tint}
                />
              </TouchableOpacity>

              <View style={styles.pageInfo}>
                <Text style={[styles.pageText, { color: colors.text }]}>
                  Page {pagination.page} of {pagination.pages}
                </Text>
                <Text style={[styles.pageSub, { color: colors.icon }]}>
                  ({pagination.total} total)
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.pageBtn, { borderColor: colors.border }]}
                onPress={() => goToPage(pagination.page + 1)}
                disabled={pagination.page >= pagination.pages}
              >
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={pagination.page >= pagination.pages ? colors.border : colors.tint}
                />
              </TouchableOpacity>
            </View>
          )}
        </>
      )}
    </View>
  );
});

CategoryStoresTab.displayName = 'CategoryStoresTab';
export default CategoryStoresTab;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Category filter chips
  chipScroll: {
    maxHeight: 44,
    marginBottom: 10,
  },
  chipContent: {
    gap: 6,
    paddingHorizontal: 2,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Search bar
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 2,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  statCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    gap: 6,
  },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '500',
  },

  // Bulk bar
  bulkBar: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
    gap: 10,
  },
  bulkTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  selectAllText: {
    fontSize: 13,
    fontWeight: '600',
  },
  selectedCountBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  selectedCountText: {
    fontSize: 12,
    fontWeight: '700',
  },
  bulkBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bulkCategoryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1.5,
    gap: 8,
  },
  bulkCategoryText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  applyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 10,
    gap: 6,
  },
  applyBtnText: {
    color: Colors.light.card,
    fontSize: 13,
    fontWeight: '700',
  },

  // Bulk category picker modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: Dimensions.get('window').height * 0.6,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  modalList: {
    paddingHorizontal: 12,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
    borderRadius: 8,
    marginVertical: 1,
  },
  modalItemRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalItemText: {
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
  },

  // List
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  listHeaderText: {
    fontSize: 15,
    fontWeight: '700',
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 16,
  },

  // Center / empty
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  centerText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  clearSearch: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
  },

  // Pagination
  paginationBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    gap: 16,
  },
  pageBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageInfo: {
    alignItems: 'center',
  },
  pageText: {
    fontSize: 13,
    fontWeight: '600',
  },
  pageSub: {
    fontSize: 10,
    marginTop: 1,
  },
});
