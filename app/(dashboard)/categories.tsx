import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  useColorScheme, ActivityIndicator, TextInput, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import {
  categoriesService, MainCategory, PageConfig,
} from '../../services/api/categories';
import { showAlert, showConfirm } from '../../utils/alert';

// Sub-components
import CategoryStatsBar from '../../components/categories/CategoryStatsBar';
import CategoryListItem from '../../components/categories/CategoryListItem';
import CategoryReorderItem from '../../components/categories/CategoryReorderItem';
import BuilderCategorySelector from '../../components/categories/BuilderCategorySelector';
import BuilderCategoryInfo from '../../components/categories/BuilderCategoryInfo';
import CollapsibleSection from '../../components/categories/CollapsibleSection';
import ThemeEditor from '../../components/categories/ThemeEditor';
import BannerEditor from '../../components/categories/BannerEditor';
import TabsManager from '../../components/categories/TabsManager';
import QuickActionsManager from '../../components/categories/QuickActionsManager';
import SectionsManager from '../../components/categories/SectionsManager';
import ServiceTypesManager from '../../components/categories/ServiceTypesManager';
import SaveButton from '../../components/categories/SaveButton';
import DietaryOptionsManager from '../../components/categories/DietaryOptionsManager';
import CuratedCollectionsManager from '../../components/categories/CuratedCollectionsManager';
import SearchPlaceholdersEditor from '../../components/categories/SearchPlaceholdersEditor';
import ValuePropManager from '../../components/categories/ValuePropManager';
import CategoryStoresTab from '../../components/categories/CategoryStoresTab';
import SubcategoryManager from '../../components/categories/SubcategoryManager';
import SortFilterManager from '../../components/categories/SortFilterManager';

type TabType = 'list' | 'builder' | 'stores';

const DEFAULT_PAGE_CONFIG: PageConfig = {
  isMainCategory: true,
  theme: { primaryColor: '#1a3a52', gradientColors: ['#1a3a52', '#2d5a7b', '#3d7aab'], icon: 'grid' },
  banner: { title: '', subtitle: '', discount: '', tag: '', image: '', ctaText: '', ctaRoute: '' },
  tabs: [],
  quickActions: [],
  sections: [],
  serviceTypes: [],
  dietaryOptions: [],
  curatedCollections: [],
  searchPlaceholders: {},
  valuePropItems: [],
};

export default function CategoriesScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [activeTab, setActiveTab] = useState<TabType>('list');

  // List state
  const [categories, setCategories] = useState<MainCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [reorderMode, setReorderMode] = useState(false);
  const [reorderList, setReorderList] = useState<MainCategory[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', type: 'going_out', icon: '', description: '' });
  const [creating, setCreating] = useState(false);

  // Builder state
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<MainCategory | null>(null);
  const [builderLoading, setBuilderLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pageConfig, setPageConfig] = useState<PageConfig>(DEFAULT_PAGE_CONFIG);
  const [savedConfig, setSavedConfig] = useState<string>('');
  const [expandedSection, setExpandedSection] = useState<string | null>('theme');

  // Dirty state
  const isDirty = useMemo(() => {
    if (!savedConfig) return false;
    return JSON.stringify(pageConfig) !== savedConfig;
  }, [pageConfig, savedConfig]);

  // Stats
  const totalCategories = categories.length;
  const activeCategories = categories.filter((c) => c.isActive).length;
  const inactiveCategories = totalCategories - activeCategories;

  // Filtered categories for search
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories;
    const q = searchQuery.toLowerCase();
    return categories.filter((c) => c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q));
  }, [categories, searchQuery]);

  // ==================== LOADERS ====================

  const loadCategories = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await categoriesService.getMainCategories();
      setCategories(data.categories);
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to load categories');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadCategories(); }, [loadCategories]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadCategories();
    setRefreshing(false);
  }, [loadCategories]);

  const loadCategoryForBuilder = useCallback(async (id: string) => {
    try {
      setBuilderLoading(true);
      const data = await categoriesService.getCategory(id);
      setSelectedCategory(data.category);
      const config = data.category.pageConfig || { ...DEFAULT_PAGE_CONFIG };
      setPageConfig(config);
      setSavedConfig(JSON.stringify(config));
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to load category');
    } finally {
      setBuilderLoading(false);
    }
  }, []);

  // ==================== TAB SWITCHING WITH DIRTY GUARD ====================

  const switchTab = useCallback((tab: TabType) => {
    if (tab === activeTab) return;
    if (activeTab === 'builder' && isDirty) {
      showConfirm(
        'Unsaved Changes',
        'You have unsaved changes in the page builder. Discard them?',
        () => {
          setActiveTab(tab);
          setSavedConfig('');
        },
        'Discard',
        'warning'
      );
    } else {
      setActiveTab(tab);
    }
  }, [activeTab, isDirty]);

  // ==================== LIST ACTIONS ====================

  const handleToggle = useCallback((category: MainCategory) => {
    const action = category.isActive ? 'deactivate' : 'activate';
    const warning = category.isActive
      ? `This will hide "${category.name}" from ALL users platform-wide.`
      : `This will make "${category.name}" visible to all users.`;

    showConfirm(
      `${action.charAt(0).toUpperCase() + action.slice(1)} Category`,
      warning,
      async () => {
        try {
          setProcessingId(category._id);
          // Optimistic update
          setCategories((prev) =>
            prev.map((c) => c._id === category._id ? { ...c, isActive: !c.isActive } : c)
          );
          await categoriesService.toggleCategory(category._id);
        } catch (error: any) {
          // Revert on error
          setCategories((prev) =>
            prev.map((c) => c._id === category._id ? { ...c, isActive: category.isActive } : c)
          );
          showAlert('Error', error.message || 'Failed to toggle category');
        } finally {
          setProcessingId(null);
        }
      },
      action.charAt(0).toUpperCase() + action.slice(1),
      category.isActive ? 'warning' : 'success'
    );
  }, []);

  const handleToggleFeatured = useCallback(async (category: MainCategory) => {
    const newFeatured = !category.metadata?.featured;
    try {
      setProcessingId(category._id);
      // Optimistic update
      setCategories((prev) =>
        prev.map((c) => c._id === category._id
          ? { ...c, metadata: { ...c.metadata, featured: newFeatured } }
          : c
        )
      );
      await categoriesService.updateCategory(category._id, {
        metadata: { ...category.metadata, featured: newFeatured },
      });
    } catch (error: any) {
      // Revert
      setCategories((prev) =>
        prev.map((c) => c._id === category._id ? { ...c, metadata: category.metadata } : c)
      );
      showAlert('Error', error.message || 'Failed to update featured status');
    } finally {
      setProcessingId(null);
    }
  }, []);

  const handleEditInBuilder = useCallback((category: MainCategory) => {
    if (isDirty) {
      showConfirm(
        'Unsaved Changes',
        'You have unsaved changes. Discard them and load a new category?',
        () => {
          setSelectedCategoryId(category._id);
          loadCategoryForBuilder(category._id);
          setActiveTab('builder');
        },
        'Discard',
        'warning'
      );
    } else {
      setSelectedCategoryId(category._id);
      loadCategoryForBuilder(category._id);
      setActiveTab('builder');
    }
  }, [isDirty, loadCategoryForBuilder]);

  // Reorder
  const enterReorderMode = useCallback(() => {
    setReorderList([...categories]);
    setReorderMode(true);
  }, [categories]);

  const moveItem = useCallback((index: number, direction: 'up' | 'down') => {
    setReorderList((prev) => {
      const newList = [...prev];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= newList.length) return prev;
      [newList[index], newList[targetIndex]] = [newList[targetIndex], newList[index]];
      return newList;
    });
  }, []);

  const saveReorder = useCallback(async () => {
    try {
      setProcessingId('reorder');
      const orderedIds = reorderList.map((c) => c._id);
      // Optimistic: apply new order to categories
      setCategories(reorderList.map((c, i) => ({ ...c, sortOrder: i })));
      setReorderMode(false);
      await categoriesService.reorderCategories(orderedIds);
      showAlert('Success', 'Categories reordered successfully');
    } catch (error: any) {
      // Revert on error
      await loadCategories();
      showAlert('Error', error.message || 'Failed to reorder categories');
    } finally {
      setProcessingId(null);
    }
  }, [reorderList, loadCategories]);

  const cancelReorder = useCallback(() => {
    setReorderMode(false);
    setReorderList([]);
  }, []);

  // ==================== BUILDER ACTIONS ====================

  const handleSelectCategory = useCallback((id: string) => {
    if (id === selectedCategoryId) return;
    if (isDirty) {
      showConfirm(
        'Unsaved Changes',
        'You have unsaved changes. Discard them?',
        () => {
          setSelectedCategoryId(id);
          loadCategoryForBuilder(id);
        },
        'Discard',
        'warning'
      );
    } else {
      setSelectedCategoryId(id);
      loadCategoryForBuilder(id);
    }
  }, [selectedCategoryId, isDirty, loadCategoryForBuilder]);

  const savePageConfig = useCallback(async () => {
    if (!selectedCategoryId) return;
    try {
      setSaving(true);
      await categoriesService.updatePageConfig(selectedCategoryId, pageConfig);
      setSavedConfig(JSON.stringify(pageConfig));
      showAlert('Success', 'Page config saved successfully');
      // Refresh the list to reflect any changes
      loadCategories();
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to save page config');
    } finally {
      setSaving(false);
    }
  }, [selectedCategoryId, pageConfig, loadCategories]);

  const resetPageConfig = useCallback(() => {
    showConfirm(
      'Reset to Default',
      'This will reset all page config fields to their default values. You must still press Save to persist.',
      () => setPageConfig({ ...DEFAULT_PAGE_CONFIG }),
      'Reset',
      'warning'
    );
  }, []);

  // ==================== CREATE / DELETE CATEGORY ====================

  const handleCreateCategory = useCallback(async () => {
    if (!createForm.name.trim()) {
      showAlert('Error', 'Category name is required');
      return;
    }
    try {
      setCreating(true);
      await categoriesService.createCategory({
        name: createForm.name.trim(),
        type: createForm.type,
        icon: createForm.icon || undefined,
        description: createForm.description || undefined,
      });
      showAlert('Success', `Category "${createForm.name}" created`);
      setShowCreateModal(false);
      setCreateForm({ name: '', type: 'going_out', icon: '', description: '' });
      await loadCategories();
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to create category');
    } finally {
      setCreating(false);
    }
  }, [createForm, loadCategories]);

  const handleDeleteCategory = useCallback((category: MainCategory) => {
    showConfirm(
      'Delete Category',
      `Are you sure you want to delete "${category.name}"? This cannot be undone.`,
      async () => {
        try {
          setProcessingId(category._id);
          await categoriesService.deleteCategory(category._id);
          showAlert('Success', `Category "${category.name}" deleted`);
          await loadCategories();
        } catch (error: any) {
          showAlert('Error', error.message || 'Failed to delete category');
        } finally {
          setProcessingId(null);
        }
      },
      'Delete',
      'warning'
    );
  }, [loadCategories]);

  // ==================== RENDER ====================

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Tab Bar */}
      <View style={styles.tabBar}>
        {([
          { key: 'list' as TabType, label: 'Categories List', icon: 'list' as const },
          { key: 'builder' as TabType, label: 'Page Builder', icon: 'construct' as const },
          { key: 'stores' as TabType, label: 'Stores', icon: 'storefront' as const },
        ]).map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && { backgroundColor: colors.tint }]}
            onPress={() => switchTab(tab.key)}
          >
            <Ionicons name={tab.icon} size={18} color={activeTab === tab.key ? '#FFF' : colors.icon} />
            <Text style={[styles.tabText, { color: activeTab === tab.key ? '#FFF' : colors.icon }]}>
              {tab.label}
            </Text>
            {tab.key === 'builder' && isDirty && (
              <View style={styles.dirtyIndicator} />
            )}
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'stores' ? (
        /* ==================== STORES TAB ==================== */
        <View style={{ flex: 1, padding: 16 }}>
          <CategoryStoresTab categories={categories} colors={colors} />
        </View>
      ) : activeTab === 'list' ? (
        /* ==================== LIST TAB ==================== */
        isLoading && categories.length === 0 ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.tint} />
            <Text style={[styles.centerText, { color: colors.icon }]}>Loading categories...</Text>
          </View>
        ) : (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.listContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />}
          >
            <CategoryStatsBar total={totalCategories} active={activeCategories} inactive={inactiveCategories} colors={colors} />

            {/* Search */}
            <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="search-outline" size={18} color={colors.icon} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search categories..."
                placeholderTextColor={colors.icon}
              />
              {searchQuery ? (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={18} color={colors.icon} />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Create Category Inline Form */}
            {showCreateModal && (
              <View style={[styles.createForm, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.createFormTitle, { color: colors.text }]}>New Category</Text>
                <TextInput
                  style={[styles.createInput, { color: colors.text, borderColor: colors.border }]}
                  value={createForm.name}
                  onChangeText={(t) => setCreateForm(prev => ({ ...prev, name: t }))}
                  placeholder="Category Name *"
                  placeholderTextColor={colors.icon}
                />
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TextInput
                    style={[styles.createInput, { flex: 1, color: colors.text, borderColor: colors.border }]}
                    value={createForm.icon}
                    onChangeText={(t) => setCreateForm(prev => ({ ...prev, icon: t }))}
                    placeholder="Icon (emoji)"
                    placeholderTextColor={colors.icon}
                  />
                  <View style={[styles.createInput, { flex: 2, borderColor: colors.border, paddingVertical: 0, justifyContent: 'center' }]}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row' }}>
                      {['going_out', 'home_delivery', 'earn', 'play', 'general'].map(t => (
                        <TouchableOpacity
                          key={t}
                          style={[styles.typeChip, createForm.type === t && { backgroundColor: colors.tint }]}
                          onPress={() => setCreateForm(prev => ({ ...prev, type: t }))}
                        >
                          <Text style={[styles.typeChipText, { color: createForm.type === t ? '#FFF' : colors.icon }]}>
                            {t.replace('_', ' ')}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </View>
                <TextInput
                  style={[styles.createInput, { color: colors.text, borderColor: colors.border }]}
                  value={createForm.description}
                  onChangeText={(t) => setCreateForm(prev => ({ ...prev, description: t }))}
                  placeholder="Description (optional)"
                  placeholderTextColor={colors.icon}
                />
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                  <TouchableOpacity
                    style={[styles.reorderBtn, { backgroundColor: colors.success, flex: 1, alignItems: 'center' }]}
                    onPress={handleCreateCategory}
                    disabled={creating}
                  >
                    {creating ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <Text style={styles.reorderBtnText}>Create</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.reorderBtn, { backgroundColor: '#6B7280', flex: 1, alignItems: 'center' }]}
                    onPress={() => { setShowCreateModal(false); setCreateForm({ name: '', type: 'going_out', icon: '', description: '' }); }}
                  >
                    <Text style={styles.reorderBtnText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* List Header */}
            <View style={styles.listHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                All Categories ({filteredCategories.length})
              </Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {!showCreateModal && (
                  <TouchableOpacity
                    style={[styles.reorderToggle, { backgroundColor: `${colors.success}15` }]}
                    onPress={() => setShowCreateModal(true)}
                  >
                    <Ionicons name="add-circle" size={16} color={colors.success} />
                    <Text style={[styles.reorderToggleText, { color: colors.success }]}>Create</Text>
                  </TouchableOpacity>
                )}
              {!reorderMode ? (
                <TouchableOpacity style={[styles.reorderToggle, { backgroundColor: `${colors.info}15` }]} onPress={enterReorderMode}>
                  <Ionicons name="swap-vertical" size={16} color={colors.info} />
                  <Text style={[styles.reorderToggleText, { color: colors.info }]}>Reorder</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.reorderActions}>
                  <TouchableOpacity
                    style={[styles.reorderBtn, { backgroundColor: colors.success }]}
                    onPress={saveReorder}
                    disabled={processingId === 'reorder'}
                  >
                    {processingId === 'reorder' ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <Text style={styles.reorderBtnText}>Save Order</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.reorderBtn, { backgroundColor: '#6B7280' }]} onPress={cancelReorder}>
                    <Text style={styles.reorderBtnText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              )}
              </View>
            </View>

            {reorderMode
              ? reorderList.map((cat, i) => (
                  <CategoryReorderItem
                    key={cat._id}
                    category={cat}
                    index={i}
                    total={reorderList.length}
                    onMoveUp={() => moveItem(i, 'up')}
                    onMoveDown={() => moveItem(i, 'down')}
                    colors={colors}
                  />
                ))
              : filteredCategories.map((cat) => (
                  <CategoryListItem
                    key={cat._id}
                    category={cat}
                    isProcessing={processingId === cat._id}
                    onToggle={() => handleToggle(cat)}
                    onEditConfig={() => handleEditInBuilder(cat)}
                    onToggleFeatured={() => handleToggleFeatured(cat)}
                    onDelete={() => handleDeleteCategory(cat)}
                    colors={colors}
                  />
                ))}

            {filteredCategories.length === 0 && !isLoading && (
              <View style={styles.center}>
                <Ionicons name="apps-outline" size={48} color={colors.icon} />
                <Text style={[styles.centerText, { color: colors.icon }]}>
                  {searchQuery ? 'No categories match your search' : 'No categories found'}
                </Text>
              </View>
            )}
          </ScrollView>
        )
      ) : (
        /* ==================== BUILDER TAB ==================== */
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.builderContent}
          refreshControl={
            <RefreshControl
              refreshing={false}
              onRefresh={() => selectedCategoryId && loadCategoryForBuilder(selectedCategoryId)}
              tintColor={colors.tint}
            />
          }
        >
          <BuilderCategorySelector
            categories={categories}
            selectedId={selectedCategoryId}
            onSelect={handleSelectCategory}
            colors={colors}
          />

          {!selectedCategoryId && (
            <View style={styles.center}>
              <Ionicons name="construct-outline" size={48} color={colors.icon} />
              <Text style={[styles.centerText, { color: colors.icon }]}>
                Select a category to edit its page config
              </Text>
            </View>
          )}

          {builderLoading && (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={colors.tint} />
              <Text style={[styles.centerText, { color: colors.icon }]}>Loading category config...</Text>
            </View>
          )}

          {selectedCategory && !builderLoading && (
            <>
              <BuilderCategoryInfo category={selectedCategory} colors={colors} />

              <CollapsibleSection title="Theme" sectionKey="theme" iconName="color-palette" iconColor="#8B5CF6" expandedSection={expandedSection} setExpandedSection={setExpandedSection} colors={colors}>
                <ThemeEditor pageConfig={pageConfig} setPageConfig={setPageConfig} colors={colors} />
              </CollapsibleSection>

              <CollapsibleSection title="Banner" sectionKey="banner" iconName="image" iconColor="#EC4899" expandedSection={expandedSection} setExpandedSection={setExpandedSection} colors={colors}>
                <BannerEditor pageConfig={pageConfig} setPageConfig={setPageConfig} colors={colors} />
              </CollapsibleSection>

              <CollapsibleSection title={`Tabs (${pageConfig.tabs.length})`} sectionKey="tabs" iconName="tab-portrait" iconColor="#3B82F6" expandedSection={expandedSection} setExpandedSection={setExpandedSection} colors={colors}>
                <TabsManager pageConfig={pageConfig} setPageConfig={setPageConfig} colors={colors} />
              </CollapsibleSection>

              <CollapsibleSection title={`Quick Actions (${pageConfig.quickActions.length})`} sectionKey="quickActions" iconName="flash" iconColor="#F59E0B" expandedSection={expandedSection} setExpandedSection={setExpandedSection} colors={colors}>
                <QuickActionsManager pageConfig={pageConfig} setPageConfig={setPageConfig} colors={colors} />
              </CollapsibleSection>

              <CollapsibleSection title={`Sections (${pageConfig.sections.length})`} sectionKey="sections" iconName="layers" iconColor="#10B981" expandedSection={expandedSection} setExpandedSection={setExpandedSection} colors={colors}>
                <SectionsManager pageConfig={pageConfig} setPageConfig={setPageConfig} colors={colors} />
              </CollapsibleSection>

              <CollapsibleSection title={`Service Types (${pageConfig.serviceTypes.length})`} sectionKey="serviceTypes" iconName="bicycle" iconColor="#06B6D4" expandedSection={expandedSection} setExpandedSection={setExpandedSection} colors={colors}>
                <ServiceTypesManager pageConfig={pageConfig} setPageConfig={setPageConfig} colors={colors} />
              </CollapsibleSection>

              <CollapsibleSection title={`Dietary Options (${pageConfig.dietaryOptions?.length || 0})`} sectionKey="dietaryOptions" iconName="nutrition" iconColor="#22C55E" expandedSection={expandedSection} setExpandedSection={setExpandedSection} colors={colors}>
                <DietaryOptionsManager pageConfig={pageConfig} setPageConfig={setPageConfig} colors={colors} />
              </CollapsibleSection>

              <CollapsibleSection title={`Curated Collections (${pageConfig.curatedCollections?.length || 0})`} sectionKey="curatedCollections" iconName="sparkles" iconColor="#8B5CF6" expandedSection={expandedSection} setExpandedSection={setExpandedSection} colors={colors}>
                <CuratedCollectionsManager pageConfig={pageConfig} setPageConfig={setPageConfig} colors={colors} />
              </CollapsibleSection>

              <CollapsibleSection title="Search Placeholders" sectionKey="searchPlaceholders" iconName="search" iconColor="#F59E0B" expandedSection={expandedSection} setExpandedSection={setExpandedSection} colors={colors}>
                <SearchPlaceholdersEditor pageConfig={pageConfig} setPageConfig={setPageConfig} colors={colors} />
              </CollapsibleSection>

              <CollapsibleSection title={`Value Props (${pageConfig.valuePropItems?.length || 0})`} sectionKey="valuePropItems" iconName="ribbon" iconColor="#EC4899" expandedSection={expandedSection} setExpandedSection={setExpandedSection} colors={colors}>
                <ValuePropManager pageConfig={pageConfig} setPageConfig={setPageConfig} colors={colors} />
              </CollapsibleSection>

              <CollapsibleSection title="Subcategories" sectionKey="subcategories" iconName="git-branch" iconColor="#6366F1" expandedSection={expandedSection} setExpandedSection={setExpandedSection} colors={colors}>
                <SubcategoryManager categoryId={selectedCategoryId!} colors={colors} />
              </CollapsibleSection>

              <CollapsibleSection title="Sort / Filter / Display" sectionKey="sortFilter" iconName="options" iconColor="#F97316" expandedSection={expandedSection} setExpandedSection={setExpandedSection} colors={colors}>
                <SortFilterManager pageConfig={pageConfig} setPageConfig={setPageConfig} colors={colors} />
              </CollapsibleSection>

              <SaveButton onSave={savePageConfig} onReset={resetPageConfig} saving={saving} isDirty={isDirty} colors={colors} />
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabBar: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  tab: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, gap: 6 },
  tabText: { fontSize: 14, fontWeight: '600' },
  dirtyIndicator: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FCD34D' },
  listContent: { padding: 16, paddingBottom: 100 },
  builderContent: { padding: 16, paddingBottom: 100 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60, gap: 12 },
  centerText: { fontSize: 14, fontWeight: '500', textAlign: 'center', paddingHorizontal: 20 },

  // Search
  searchBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, marginBottom: 12, gap: 8 },
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 2 },

  // List header
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  reorderToggle: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, gap: 6 },
  reorderToggleText: { fontSize: 13, fontWeight: '600' },
  reorderActions: { flexDirection: 'row', gap: 8 },
  reorderBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },

  // Create form
  createForm: { padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 12, gap: 8 },
  createFormTitle: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  createInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14 },
  typeChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, marginRight: 4 },
  typeChipText: { fontSize: 12, fontWeight: '600' },
  reorderBtnText: { color: '#FFF', fontSize: 13, fontWeight: '600' },
});
