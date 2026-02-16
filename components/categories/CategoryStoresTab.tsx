import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, TextInput, FlatList, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { storesService, AdminStore, Pagination } from '../../services/api/stores';
import { showAlert, showConfirm } from '../../utils/alert';
import StoreRow from './StoreRow';

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
      setStores((prev) =>
        prev.map((s) =>
          s._id === storeId
            ? { ...s, category: categories.find((c) => c._id === categoryId) || s.category }
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
      colors={colors}
    />
  ), [categories, selectedStoreIds, handleToggleSelect, handleReassignCategory, handleToggleFeatured, colors]);

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
              selectedCategory === 'all' && { color: '#FFF' },
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
                selectedCategory === cat._id && { color: '#FFF' },
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
          { label: 'Total', value: stats.total, color: '#3B82F6' },
          { label: 'Active (page)', value: stats.pageActive, color: '#10B981' },
          { label: 'Suspended (page)', value: stats.pageSuspended, color: '#EF4444' },
          { label: 'Featured (page)', value: stats.pageFeatured, color: '#F59E0B' },
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
          <TouchableOpacity style={styles.selectAllBtn} onPress={handleSelectAll}>
            <Ionicons
              name={isAllSelected ? 'checkbox' : 'square-outline'}
              size={18}
              color={colors.tint}
            />
            <Text style={[styles.selectAllText, { color: colors.text }]}>
              {isAllSelected ? 'Deselect All' : 'Select All'}
            </Text>
          </TouchableOpacity>

          <Text style={[styles.selectedCount, { color: colors.icon }]}>
            {selectedStoreIds.size} selected
          </Text>

          <View style={[styles.bulkPickerContainer, Platform.OS === 'web' ? { zIndex: 20 } : {}]}>
            <TouchableOpacity
              style={[styles.bulkCategoryBtn, { borderColor: colors.border }]}
              onPress={() => setShowBulkCategoryPicker(!showBulkCategoryPicker)}
            >
              <Text style={[styles.bulkCategoryText, { color: bulkCategoryId ? colors.text : colors.icon }]} numberOfLines={1}>
                {bulkCategoryId
                  ? categories.find((c) => c._id === bulkCategoryId)?.name || 'Select...'
                  : 'Move to...'}
              </Text>
              <Ionicons name="chevron-down" size={14} color={colors.icon} />
            </TouchableOpacity>

            {showBulkCategoryPicker && (
              <View style={[styles.bulkDropdown, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <ScrollView style={styles.bulkDropdownScroll} nestedScrollEnabled>
                  {categories.map((cat) => (
                    <TouchableOpacity
                      key={cat._id}
                      style={[
                        styles.bulkDropdownItem,
                        cat._id === bulkCategoryId && { backgroundColor: `${colors.tint}12` },
                      ]}
                      onPress={() => {
                        setBulkCategoryId(cat._id);
                        setShowBulkCategoryPicker(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.bulkDropdownText,
                          { color: colors.text },
                          cat._id === bulkCategoryId && { color: colors.tint, fontWeight: '700' },
                        ]}
                        numberOfLines={1}
                      >
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={[styles.applyBtn, { backgroundColor: colors.tint, opacity: isBulkProcessing ? 0.6 : 1 }]}
            onPress={handleBulkReassign}
            disabled={isBulkProcessing}
          >
            {isBulkProcessing ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={styles.applyBtnText}>Apply</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

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
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
    gap: 8,
    flexWrap: 'wrap',
  },
  selectAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  selectAllText: {
    fontSize: 12,
    fontWeight: '600',
  },
  selectedCount: {
    fontSize: 11,
    fontWeight: '500',
  },
  bulkPickerContainer: {
    position: 'relative',
    flex: 1,
    minWidth: 120,
  },
  bulkCategoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  bulkCategoryText: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  bulkDropdown: {
    position: 'absolute',
    top: 34,
    left: 0,
    right: 0,
    maxHeight: 180,
    borderRadius: 10,
    borderWidth: 1,
    ...(Platform.OS === 'web'
      ? { zIndex: 100, boxShadow: '0px 4px 12px rgba(0,0,0,0.15)' }
      : { elevation: 8 }),
  },
  bulkDropdownScroll: {
    maxHeight: 176,
  },
  bulkDropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  bulkDropdownText: {
    fontSize: 12,
    fontWeight: '500',
  },
  applyBtn: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 8,
  },
  applyBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
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
