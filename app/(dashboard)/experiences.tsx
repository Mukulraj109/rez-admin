import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  useColorScheme,
  ActivityIndicator,
  Modal,
  TextInput,
  ScrollView,
  Switch,
  SafeAreaView,
  Dimensions,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  experiencesService,
  StoreExperience,
  ExperienceStats,
  ExperienceRequest,
  ExperienceType,
  FilterCriteria,
  CategoryOption,
  TagOption,
  PreviewStore,
  RegionId,
  EXPERIENCE_TYPES,
  BACKGROUND_COLORS,
  COMMON_EMOJIS,
  REGIONS,
} from '../../services/api/experiences';
import { Colors } from '../../constants/Colors';
import { showAlert, showConfirm } from '../../utils/alert';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type TabType = 'all' | 'active' | 'inactive' | 'featured';

const TABS: { key: TabType; label: string; icon: string }[] = [
  { key: 'all', label: 'All', icon: 'albums' },
  { key: 'active', label: 'Active', icon: 'checkmark-circle' },
  { key: 'inactive', label: 'Inactive', icon: 'pause-circle' },
  { key: 'featured', label: 'Featured', icon: 'star' },
];

const DEFAULT_FILTER_CRITERIA: FilterCriteria = {
  tags: [],
  minRating: 0,
  isPremium: false,
  isOrganic: false,
  isPartner: false,
  isMall: false,
  isFastDelivery: false,
  isBudgetFriendly: false,
  isVerified: false,
  categories: [],
};

const DEFAULT_FORM_DATA: Partial<ExperienceRequest> = {
  title: '',
  subtitle: '',
  description: '',
  slug: '',
  icon: '🛍️',
  iconType: 'emoji',
  type: 'custom',
  badge: '',
  badgeBg: '#22C55E',
  badgeColor: '#FFFFFF',
  backgroundColor: '#FEF3C7',
  benefits: [],
  filterCriteria: DEFAULT_FILTER_CRITERIA,
  regions: [], // Empty = available in all regions
  sortOrder: 0,
  isActive: true,
  isFeatured: false,
};

// Store filter toggle options
const FILTER_TOGGLES = [
  { key: 'isFastDelivery', label: 'Fast Delivery', icon: 'flash', color: '#F59E0B' },
  { key: 'isPremium', label: 'Premium', icon: 'diamond', color: '#8B5CF6' },
  { key: 'isOrganic', label: 'Organic', icon: 'leaf', color: '#22C55E' },
  { key: 'isPartner', label: 'Partner', icon: 'handshake', color: '#3B82F6' },
  { key: 'isMall', label: 'Mall', icon: 'business', color: '#EC4899' },
  { key: 'isBudgetFriendly', label: 'Budget', icon: 'pricetag', color: '#10B981' },
  { key: 'isVerified', label: 'Verified', icon: 'checkmark-circle', color: '#6366F1' },
];

export default function ExperiencesScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [experiences, setExperiences] = useState<StoreExperience[]>([]);
  const [stats, setStats] = useState<ExperienceStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal states
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingExperience, setEditingExperience] = useState<StoreExperience | null>(null);
  const [formData, setFormData] = useState<Partial<ExperienceRequest>>(DEFAULT_FORM_DATA);
  const [isSaving, setIsSaving] = useState(false);

  // Emoji picker
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Benefits input
  const [newBenefit, setNewBenefit] = useState('');

  // Filter criteria builder
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [tags, setTags] = useState<TagOption[]>([]);
  const [previewStores, setPreviewStores] = useState<PreviewStore[]>([]);
  const [previewTotal, setPreviewTotal] = useState(0);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [showFilterSection, setShowFilterSection] = useState(false);

  // Fetch data
  const fetchExperiences = useCallback(async (pageNum: number = 1, append: boolean = false) => {
    try {
      if (pageNum === 1) setIsLoading(true);

      const query: any = { page: pageNum, limit: 20 };

      if (activeTab === 'active') query.status = 'active';
      else if (activeTab === 'inactive') query.status = 'inactive';
      else if (activeTab === 'featured') query.featured = true;

      if (searchQuery) query.search = searchQuery;

      const response = await experiencesService.getExperiences(query);

      if (append) {
        setExperiences(prev => [...prev, ...response.experiences]);
      } else {
        setExperiences(response.experiences);
      }

      setHasMore(response.pagination.hasNext);
      setPage(pageNum);
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to fetch experiences');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [activeTab, searchQuery]);

  const fetchStats = useCallback(async () => {
    try {
      const response = await experiencesService.getStats();
      setStats(response);
    } catch (error) {
      console.log('Stats fetch failed:', error);
    }
  }, []);

  const fetchCategoriesAndTags = useCallback(async () => {
    try {
      const [categoriesRes, tagsRes] = await Promise.all([
        experiencesService.getCategories(),
        experiencesService.getTags(),
      ]);
      setCategories(categoriesRes);
      setTags(tagsRes);
    } catch (error) {
      console.log('Categories/Tags fetch failed:', error);
    }
  }, []);

  const previewMatchingStores = useCallback(async (criteria: FilterCriteria) => {
    setIsLoadingPreview(true);
    try {
      const response = await experiencesService.previewStores(criteria, 5);
      setPreviewStores(response.stores);
      setPreviewTotal(response.total);
    } catch (error) {
      console.log('Preview stores failed:', error);
    } finally {
      setIsLoadingPreview(false);
    }
  }, []);

  useEffect(() => {
    fetchExperiences(1);
    fetchStats();
    fetchCategoriesAndTags();
  }, [activeTab, searchQuery]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchExperiences(1);
    fetchStats();
  };

  const loadMore = () => {
    if (hasMore && !isLoading) {
      fetchExperiences(page + 1, true);
    }
  };

  // Form handlers
  const openCreateModal = () => {
    setEditingExperience(null);
    setFormData(DEFAULT_FORM_DATA);
    setPreviewStores([]);
    setPreviewTotal(0);
    setShowFilterSection(false);
    setShowFormModal(true);
  };

  const openEditModal = (exp: StoreExperience) => {
    setEditingExperience(exp);
    const filterCriteria = exp.filterCriteria || DEFAULT_FILTER_CRITERIA;
    setFormData({
      title: exp.title,
      subtitle: exp.subtitle || '',
      description: exp.description || '',
      slug: exp.slug,
      icon: exp.icon,
      iconType: exp.iconType,
      type: exp.type,
      badge: exp.badge || '',
      badgeBg: exp.badgeBg || '#22C55E',
      badgeColor: exp.badgeColor || '#FFFFFF',
      backgroundColor: exp.backgroundColor || '#FEF3C7',
      benefits: exp.benefits || [],
      filterCriteria: {
        tags: filterCriteria.tags || [],
        minRating: filterCriteria.minRating || 0,
        isPremium: filterCriteria.isPremium || false,
        isOrganic: filterCriteria.isOrganic || false,
        isPartner: filterCriteria.isPartner || false,
        isMall: filterCriteria.isMall || false,
        isFastDelivery: (filterCriteria as any).isFastDelivery || false,
        isBudgetFriendly: (filterCriteria as any).isBudgetFriendly || false,
        isVerified: (filterCriteria as any).isVerified || false,
        categories: filterCriteria.categories || [],
      },
      regions: exp.regions || [],
      sortOrder: exp.sortOrder,
      isActive: exp.isActive,
      isFeatured: exp.isFeatured,
    });
    setShowFilterSection(true);
    // Load preview for existing filter criteria
    if (filterCriteria && Object.keys(filterCriteria).length > 0) {
      previewMatchingStores(filterCriteria);
    }
    setShowFormModal(true);
  };

  const handleSave = async () => {
    if (!formData.title?.trim()) {
      showAlert('Validation Error', 'Title is required');
      return;
    }
    if (!formData.slug?.trim()) {
      showAlert('Validation Error', 'Slug is required');
      return;
    }
    if (!formData.icon?.trim()) {
      showAlert('Validation Error', 'Icon is required');
      return;
    }
    if (!formData.type) {
      showAlert('Validation Error', 'Type is required');
      return;
    }

    setIsSaving(true);
    try {
      if (editingExperience) {
        await experiencesService.updateExperience(editingExperience._id, formData as ExperienceRequest);
        showAlert('Success', 'Experience updated successfully');
      } else {
        await experiencesService.createExperience(formData as ExperienceRequest);
        showAlert('Success', 'Experience created successfully');
      }
      setShowFormModal(false);
      fetchExperiences(1);
      fetchStats();
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to save experience');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (exp: StoreExperience) => {
    const confirmed = await showConfirm(
      'Delete Experience',
      `Are you sure you want to delete "${exp.title}"? This action cannot be undone.`
    );

    if (confirmed) {
      try {
        await experiencesService.deleteExperience(exp._id);
        showAlert('Success', 'Experience deleted successfully');
        fetchExperiences(1);
        fetchStats();
      } catch (error: any) {
        showAlert('Error', error.message || 'Failed to delete experience');
      }
    }
  };

  const handleToggle = async (exp: StoreExperience) => {
    try {
      await experiencesService.toggleExperience(exp._id);
      fetchExperiences(page);
      fetchStats();
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to toggle experience');
    }
  };

  const handleToggleFeatured = async (exp: StoreExperience) => {
    try {
      await experiencesService.toggleFeatured(exp._id);
      fetchExperiences(page);
      fetchStats();
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to toggle featured status');
    }
  };

  const addBenefit = () => {
    if (newBenefit.trim()) {
      setFormData(prev => ({
        ...prev,
        benefits: [...(prev.benefits || []), newBenefit.trim()],
      }));
      setNewBenefit('');
    }
  };

  const removeBenefit = (index: number) => {
    setFormData(prev => ({
      ...prev,
      benefits: prev.benefits?.filter((_, i) => i !== index) || [],
    }));
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  };

  // Filter criteria helpers
  const toggleFilterOption = (key: string) => {
    const newCriteria = {
      ...formData.filterCriteria,
      [key]: !(formData.filterCriteria as any)?.[key],
    };
    setFormData(prev => ({ ...prev, filterCriteria: newCriteria }));
    previewMatchingStores(newCriteria);
  };

  const addFilterTag = () => {
    if (newTag.trim() && !formData.filterCriteria?.tags?.includes(newTag.trim())) {
      const newCriteria = {
        ...formData.filterCriteria,
        tags: [...(formData.filterCriteria?.tags || []), newTag.trim().toLowerCase()],
      };
      setFormData(prev => ({ ...prev, filterCriteria: newCriteria }));
      setNewTag('');
      previewMatchingStores(newCriteria);
    }
  };

  const removeFilterTag = (tagToRemove: string) => {
    const newCriteria = {
      ...formData.filterCriteria,
      tags: formData.filterCriteria?.tags?.filter(t => t !== tagToRemove) || [],
    };
    setFormData(prev => ({ ...prev, filterCriteria: newCriteria }));
    previewMatchingStores(newCriteria);
  };

  const toggleCategory = (categoryId: string) => {
    const currentCategories = formData.filterCriteria?.categories || [];
    const newCategories = currentCategories.includes(categoryId)
      ? currentCategories.filter(c => c !== categoryId)
      : [...currentCategories, categoryId];
    const newCriteria = {
      ...formData.filterCriteria,
      categories: newCategories,
    };
    setFormData(prev => ({ ...prev, filterCriteria: newCriteria }));
    previewMatchingStores(newCriteria);
  };

  const updateMinRating = (rating: number) => {
    const newCriteria = {
      ...formData.filterCriteria,
      minRating: rating,
    };
    setFormData(prev => ({ ...prev, filterCriteria: newCriteria }));
    previewMatchingStores(newCriteria);
  };

  // Region helpers
  const toggleRegion = (regionId: RegionId) => {
    const currentRegions = formData.regions || [];
    const newRegions = currentRegions.includes(regionId)
      ? currentRegions.filter(r => r !== regionId)
      : [...currentRegions, regionId];
    setFormData(prev => ({ ...prev, regions: newRegions }));
  };

  // Render stat card
  const renderStatCard = (label: string, value: number, icon: string, color: string) => (
    <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.statIconContainer, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon as any} size={24} color={color} />
      </View>
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.icon }]}>{label}</Text>
    </View>
  );

  // Render experience card
  const renderExperienceCard = ({ item }: { item: StoreExperience }) => (
    <View style={[styles.expCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.expCardHeader}>
        <View style={[styles.expIconBox, { backgroundColor: item.backgroundColor || '#FEF3C7' }]}>
          <Text style={styles.expIcon}>{item.icon}</Text>
        </View>
        <View style={styles.expInfo}>
          <Text style={[styles.expTitle, { color: colors.text }]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={[styles.expSubtitle, { color: colors.icon }]} numberOfLines={1}>
            {item.subtitle || item.slug}
          </Text>
          <View style={styles.expBadges}>
            <View style={[styles.typeBadge, { backgroundColor: colors.tint + '20' }]}>
              <Text style={[styles.typeBadgeText, { color: colors.tint }]}>{item.type}</Text>
            </View>
            {item.isFeatured && (
              <View style={[styles.featuredBadge, { backgroundColor: '#F59E0B20' }]}>
                <Ionicons name="star" size={10} color="#F59E0B" />
                <Text style={[styles.featuredBadgeText, { color: '#F59E0B' }]}>Featured</Text>
              </View>
            )}
          </View>
        </View>
        <Switch
          value={item.isActive}
          onValueChange={() => handleToggle(item)}
          trackColor={{ false: colors.border, true: colors.tint + '50' }}
          thumbColor={item.isActive ? colors.tint : colors.icon}
        />
      </View>

      <View style={styles.expCardActions}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.tint + '10' }]}
          onPress={() => openEditModal(item)}
        >
          <Ionicons name="pencil" size={16} color={colors.tint} />
          <Text style={[styles.actionBtnText, { color: colors.tint }]}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: '#F59E0B10' }]}
          onPress={() => handleToggleFeatured(item)}
        >
          <Ionicons name={item.isFeatured ? 'star' : 'star-outline'} size={16} color="#F59E0B" />
          <Text style={[styles.actionBtnText, { color: '#F59E0B' }]}>
            {item.isFeatured ? 'Unfeature' : 'Feature'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: '#EF444410' }]}
          onPress={() => handleDelete(item)}
        >
          <Ionicons name="trash" size={16} color="#EF4444" />
          <Text style={[styles.actionBtnText, { color: '#EF4444' }]}>Delete</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.expCardFooter, { borderTopColor: colors.border }]}>
        <Text style={[styles.expCardFooterText, { color: colors.icon }]}>
          Order: {item.sortOrder} • {item.storeCount || 0} stores • {
            item.regions && item.regions.length > 0
              ? item.regions.map(r => REGIONS.find(reg => reg.value === r)?.flag || r).join(' ')
              : '🌐 All'
          }
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Shop by Experience</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.refreshBtn, { borderColor: colors.border }]}
            onPress={async () => {
              try {
                const result = await experiencesService.refreshAllStoreCounts();
                showAlert('Success', `Updated ${result.updated} of ${result.totalExperiences} experiences`);
                fetchExperiences(1);
              } catch (error: any) {
                showAlert('Error', error.message);
              }
            }}
          >
            <Ionicons name="refresh" size={16} color={colors.icon} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.tint }]}
            onPress={openCreateModal}
          >
            <Ionicons name="add" size={20} color="#FFF" />
            <Text style={styles.addBtnText}>Add New</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats */}
      {stats && (
        <View style={styles.statsContainer}>
          {renderStatCard('Total', stats.total, 'albums', '#6366F1')}
          {renderStatCard('Active', stats.active, 'checkmark-circle', '#22C55E')}
          {renderStatCard('Featured', stats.featured, 'star', '#F59E0B')}
          {renderStatCard('Inactive', stats.inactive, 'pause-circle', '#EF4444')}
        </View>
      )}

      {/* Search */}
      <View style={[styles.searchContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Ionicons name="search" size={20} color={colors.icon} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search experiences..."
          placeholderTextColor={colors.icon}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color={colors.icon} />
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tab,
                activeTab === tab.key && { backgroundColor: colors.tint },
                activeTab !== tab.key && { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 },
              ]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Ionicons
                name={tab.icon as any}
                size={16}
                color={activeTab === tab.key ? '#FFF' : colors.icon}
              />
              <Text
                style={[
                  styles.tabText,
                  { color: activeTab === tab.key ? '#FFF' : colors.text },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Experience List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      ) : (
        <FlatList
          data={experiences}
          renderItem={renderExperienceCard}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.tint} />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="cube-outline" size={64} color={colors.icon} />
              <Text style={[styles.emptyText, { color: colors.icon }]}>No experiences found</Text>
              <TouchableOpacity style={[styles.emptyBtn, { backgroundColor: colors.tint }]} onPress={openCreateModal}>
                <Text style={styles.emptyBtnText}>Create First Experience</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* Form Modal */}
      <Modal visible={showFormModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowFormModal(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {editingExperience ? 'Edit Experience' : 'New Experience'}
            </Text>
            <TouchableOpacity onPress={handleSave} disabled={isSaving}>
              {isSaving ? (
                <ActivityIndicator size="small" color={colors.tint} />
              ) : (
                <Text style={[styles.saveBtn, { color: colors.tint }]}>Save</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Icon Selection */}
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Icon</Text>
              <View style={styles.iconSelector}>
                <TouchableOpacity
                  style={[styles.iconPreview, { backgroundColor: formData.backgroundColor || '#FEF3C7' }]}
                  onPress={() => setShowEmojiPicker(!showEmojiPicker)}
                >
                  <Text style={styles.iconPreviewText}>{formData.icon || '🛍️'}</Text>
                </TouchableOpacity>
                <Text style={[styles.iconHint, { color: colors.icon }]}>Tap to change</Text>
              </View>
              {showEmojiPicker && (
                <View style={[styles.emojiPicker, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {COMMON_EMOJIS.map((emoji, idx) => (
                      <TouchableOpacity
                        key={idx}
                        style={styles.emojiBtn}
                        onPress={() => {
                          setFormData(prev => ({ ...prev, icon: emoji }));
                          setShowEmojiPicker(false);
                        }}
                      >
                        <Text style={styles.emojiBtnText}>{emoji}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* Title */}
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Title *</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                value={formData.title}
                onChangeText={(text) => {
                  setFormData(prev => ({
                    ...prev,
                    title: text,
                    slug: prev.slug || generateSlug(text),
                  }));
                }}
                placeholder="e.g., 60-Minute Delivery"
                placeholderTextColor={colors.icon}
              />
            </View>

            {/* Slug */}
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Slug *</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                value={formData.slug}
                onChangeText={(text) => setFormData(prev => ({ ...prev, slug: text.toLowerCase().replace(/[^a-z0-9-]/g, '-') }))}
                placeholder="e.g., 60-minute-delivery"
                placeholderTextColor={colors.icon}
                autoCapitalize="none"
              />
            </View>

            {/* Subtitle */}
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Subtitle</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                value={formData.subtitle}
                onChangeText={(text) => setFormData(prev => ({ ...prev, subtitle: text }))}
                placeholder="e.g., Quick delivery to your doorstep"
                placeholderTextColor={colors.icon}
              />
            </View>

            {/* Description */}
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Description</Text>
              <TextInput
                style={[styles.formInput, styles.formTextarea, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                value={formData.description}
                onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
                placeholder="Detailed description..."
                placeholderTextColor={colors.icon}
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Type */}
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Type *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeSelector}>
                {EXPERIENCE_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type.value}
                    style={[
                      styles.typeBtn,
                      formData.type === type.value && { backgroundColor: colors.tint, borderColor: colors.tint },
                      formData.type !== type.value && { backgroundColor: colors.card, borderColor: colors.border },
                    ]}
                    onPress={() => setFormData(prev => ({ ...prev, type: type.value }))}
                  >
                    <Text
                      style={[
                        styles.typeBtnText,
                        { color: formData.type === type.value ? '#FFF' : colors.text },
                      ]}
                    >
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Region Selection */}
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Available Regions</Text>
              <Text style={[styles.formHint, { color: colors.icon }]}>
                Select regions where this experience is visible. Empty = all regions.
              </Text>
              <View style={styles.regionsContainer}>
                {REGIONS.map((region) => {
                  const isSelected = formData.regions?.includes(region.value);
                  return (
                    <TouchableOpacity
                      key={region.value}
                      style={[
                        styles.regionBtn,
                        isSelected && { backgroundColor: colors.tint + '20', borderColor: colors.tint },
                        !isSelected && { backgroundColor: colors.card, borderColor: colors.border },
                      ]}
                      onPress={() => toggleRegion(region.value)}
                    >
                      <Text style={styles.regionFlag}>{region.flag}</Text>
                      <Text
                        style={[
                          styles.regionBtnText,
                          { color: isSelected ? colors.tint : colors.text },
                        ]}
                      >
                        {region.label}
                      </Text>
                      {isSelected && (
                        <Ionicons name="checkmark-circle" size={16} color={colors.tint} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Background Color */}
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Background Color</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.colorSelector}>
                {BACKGROUND_COLORS.map((color, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      styles.colorBtn,
                      { backgroundColor: color },
                      formData.backgroundColor === color && styles.colorBtnSelected,
                    ]}
                    onPress={() => setFormData(prev => ({ ...prev, backgroundColor: color }))}
                  >
                    {formData.backgroundColor === color && (
                      <Ionicons name="checkmark" size={16} color="#0F172A" />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Badge */}
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Badge (optional)</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                value={formData.badge}
                onChangeText={(text) => setFormData(prev => ({ ...prev, badge: text }))}
                placeholder="e.g., NEW, HOT, 50% OFF"
                placeholderTextColor={colors.icon}
              />
            </View>

            {/* Sort Order */}
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Sort Order</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                value={formData.sortOrder?.toString()}
                onChangeText={(text) => setFormData(prev => ({ ...prev, sortOrder: parseInt(text) || 0 }))}
                placeholder="0"
                placeholderTextColor={colors.icon}
                keyboardType="numeric"
              />
            </View>

            {/* Benefits */}
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Benefits</Text>
              <View style={styles.benefitsInput}>
                <TextInput
                  style={[styles.formInput, { flex: 1, backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                  value={newBenefit}
                  onChangeText={setNewBenefit}
                  placeholder="Add a benefit..."
                  placeholderTextColor={colors.icon}
                  onSubmitEditing={addBenefit}
                />
                <TouchableOpacity style={[styles.addBenefitBtn, { backgroundColor: colors.tint }]} onPress={addBenefit}>
                  <Ionicons name="add" size={20} color="#FFF" />
                </TouchableOpacity>
              </View>
              {formData.benefits && formData.benefits.length > 0 && (
                <View style={styles.benefitsList}>
                  {formData.benefits.map((benefit, idx) => (
                    <View key={idx} style={[styles.benefitItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
                      <Text style={[styles.benefitText, { color: colors.text }]}>{benefit}</Text>
                      <TouchableOpacity onPress={() => removeBenefit(idx)}>
                        <Ionicons name="close-circle" size={18} color={colors.icon} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* ============================================ */}
            {/* FILTER CRITERIA BUILDER */}
            {/* ============================================ */}
            <View style={[styles.filterSection, { borderColor: colors.border }]}>
              <TouchableOpacity
                style={styles.filterSectionHeader}
                onPress={() => setShowFilterSection(!showFilterSection)}
              >
                <View style={styles.filterHeaderLeft}>
                  <Ionicons name="funnel" size={20} color={colors.tint} />
                  <Text style={[styles.filterSectionTitle, { color: colors.text }]}>
                    Store Matching Criteria
                  </Text>
                </View>
                <View style={styles.filterHeaderRight}>
                  <Text style={[styles.filterPreviewCount, { color: colors.tint }]}>
                    {previewTotal} stores
                  </Text>
                  <Ionicons
                    name={showFilterSection ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={colors.icon}
                  />
                </View>
              </TouchableOpacity>

              {showFilterSection && (
                <View style={styles.filterContent}>
                  {/* Filter Toggle Options */}
                  <View style={styles.formGroup}>
                    <Text style={[styles.formLabel, { color: colors.text }]}>Store Types</Text>
                    <View style={styles.filterToggles}>
                      {FILTER_TOGGLES.map((toggle) => {
                        const isActive = (formData.filterCriteria as any)?.[toggle.key] === true;
                        return (
                          <TouchableOpacity
                            key={toggle.key}
                            style={[
                              styles.filterToggleBtn,
                              isActive && { backgroundColor: toggle.color + '20', borderColor: toggle.color },
                              !isActive && { backgroundColor: colors.card, borderColor: colors.border },
                            ]}
                            onPress={() => toggleFilterOption(toggle.key)}
                          >
                            <Ionicons
                              name={toggle.icon as any}
                              size={14}
                              color={isActive ? toggle.color : colors.icon}
                            />
                            <Text
                              style={[
                                styles.filterToggleText,
                                { color: isActive ? toggle.color : colors.text },
                              ]}
                            >
                              {toggle.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  {/* Min Rating */}
                  <View style={styles.formGroup}>
                    <Text style={[styles.formLabel, { color: colors.text }]}>
                      Minimum Rating: {formData.filterCriteria?.minRating || 0} stars
                    </Text>
                    <View style={styles.ratingSelector}>
                      {[0, 3, 3.5, 4, 4.5].map((rating) => (
                        <TouchableOpacity
                          key={rating}
                          style={[
                            styles.ratingBtn,
                            formData.filterCriteria?.minRating === rating && {
                              backgroundColor: colors.tint,
                              borderColor: colors.tint,
                            },
                            formData.filterCriteria?.minRating !== rating && {
                              backgroundColor: colors.card,
                              borderColor: colors.border,
                            },
                          ]}
                          onPress={() => updateMinRating(rating)}
                        >
                          <Text
                            style={[
                              styles.ratingBtnText,
                              { color: formData.filterCriteria?.minRating === rating ? '#FFF' : colors.text },
                            ]}
                          >
                            {rating === 0 ? 'Any' : `${rating}+`}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Tags */}
                  <View style={styles.formGroup}>
                    <Text style={[styles.formLabel, { color: colors.text }]}>Tags (stores must have one of these)</Text>
                    <View style={styles.benefitsInput}>
                      <TextInput
                        style={[styles.formInput, { flex: 1, backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                        value={newTag}
                        onChangeText={setNewTag}
                        placeholder="Add a tag (e.g., organic, fast)"
                        placeholderTextColor={colors.icon}
                        onSubmitEditing={addFilterTag}
                        autoCapitalize="none"
                      />
                      <TouchableOpacity style={[styles.addBenefitBtn, { backgroundColor: colors.tint }]} onPress={addFilterTag}>
                        <Ionicons name="add" size={20} color="#FFF" />
                      </TouchableOpacity>
                    </View>
                    {/* Common tags suggestions */}
                    {tags.length > 0 && (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                        {tags.slice(0, 15).map((tag) => (
                          <TouchableOpacity
                            key={tag.tag}
                            style={[
                              styles.tagSuggestion,
                              { backgroundColor: colors.card, borderColor: colors.border },
                              formData.filterCriteria?.tags?.includes(tag.tag) && {
                                backgroundColor: colors.tint + '20',
                                borderColor: colors.tint,
                              },
                            ]}
                            onPress={() => {
                              if (!formData.filterCriteria?.tags?.includes(tag.tag)) {
                                const newCriteria = {
                                  ...formData.filterCriteria,
                                  tags: [...(formData.filterCriteria?.tags || []), tag.tag],
                                };
                                setFormData(prev => ({ ...prev, filterCriteria: newCriteria }));
                                previewMatchingStores(newCriteria);
                              }
                            }}
                          >
                            <Text style={[styles.tagSuggestionText, { color: colors.text }]}>
                              {tag.tag} ({tag.count})
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    )}
                    {/* Selected tags */}
                    {formData.filterCriteria?.tags && formData.filterCriteria.tags.length > 0 && (
                      <View style={[styles.benefitsList, { marginTop: 8 }]}>
                        {formData.filterCriteria.tags.map((tag, idx) => (
                          <View key={idx} style={[styles.benefitItem, { backgroundColor: colors.tint + '15', borderColor: colors.tint }]}>
                            <Text style={[styles.benefitText, { color: colors.tint }]}>{tag}</Text>
                            <TouchableOpacity onPress={() => removeFilterTag(tag)}>
                              <Ionicons name="close-circle" size={18} color={colors.tint} />
                            </TouchableOpacity>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>

                  {/* Categories */}
                  <View style={styles.formGroup}>
                    <Text style={[styles.formLabel, { color: colors.text }]}>Categories</Text>
                    <View style={styles.categoriesGrid}>
                      {categories.slice(0, 12).map((cat) => {
                        const isSelected = formData.filterCriteria?.categories?.includes(cat._id);
                        return (
                          <TouchableOpacity
                            key={cat._id}
                            style={[
                              styles.categoryChip,
                              isSelected && { backgroundColor: colors.tint + '20', borderColor: colors.tint },
                              !isSelected && { backgroundColor: colors.card, borderColor: colors.border },
                            ]}
                            onPress={() => toggleCategory(cat._id)}
                          >
                            <Text
                              style={[
                                styles.categoryChipText,
                                { color: isSelected ? colors.tint : colors.text },
                              ]}
                              numberOfLines={1}
                            >
                              {cat.name}
                            </Text>
                            {isSelected && (
                              <Ionicons name="checkmark" size={14} color={colors.tint} />
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  {/* Preview Matching Stores */}
                  <View style={[styles.previewSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.previewHeader}>
                      <Text style={[styles.previewTitle, { color: colors.text }]}>
                        Matching Stores Preview
                      </Text>
                      {isLoadingPreview ? (
                        <ActivityIndicator size="small" color={colors.tint} />
                      ) : (
                        <Text style={[styles.previewCount, { color: colors.tint }]}>
                          {previewTotal} stores found
                        </Text>
                      )}
                    </View>
                    {previewStores.length > 0 ? (
                      <View style={styles.previewStores}>
                        {previewStores.map((store) => (
                          <View key={store._id} style={[styles.previewStoreItem, { borderColor: colors.border }]}>
                            <View style={[styles.previewStoreLogo, { backgroundColor: colors.background }]}>
                              <Ionicons name="storefront" size={16} color={colors.icon} />
                            </View>
                            <View style={styles.previewStoreInfo}>
                              <Text style={[styles.previewStoreName, { color: colors.text }]} numberOfLines={1}>
                                {store.name}
                              </Text>
                              <Text style={[styles.previewStoreMeta, { color: colors.icon }]} numberOfLines={1}>
                                {store.city} • {store.rating?.toFixed(1) || 'N/A'} ⭐ • {store.category || 'N/A'}
                              </Text>
                            </View>
                          </View>
                        ))}
                      </View>
                    ) : (
                      <Text style={[styles.previewEmpty, { color: colors.icon }]}>
                        {isLoadingPreview ? 'Loading...' : 'No filter criteria set. All active stores will be shown.'}
                      </Text>
                    )}
                  </View>
                </View>
              )}
            </View>

            {/* Toggles */}
            <View style={styles.togglesContainer}>
              <View style={[styles.toggleRow, { borderColor: colors.border }]}>
                <View>
                  <Text style={[styles.toggleLabel, { color: colors.text }]}>Active</Text>
                  <Text style={[styles.toggleHint, { color: colors.icon }]}>Show on homepage</Text>
                </View>
                <Switch
                  value={formData.isActive}
                  onValueChange={(val) => setFormData(prev => ({ ...prev, isActive: val }))}
                  trackColor={{ false: colors.border, true: colors.tint + '50' }}
                  thumbColor={formData.isActive ? colors.tint : colors.icon}
                />
              </View>
              <View style={[styles.toggleRow, { borderColor: colors.border }]}>
                <View>
                  <Text style={[styles.toggleLabel, { color: colors.text }]}>Featured</Text>
                  <Text style={[styles.toggleHint, { color: colors.icon }]}>Highlight this experience</Text>
                </View>
                <Switch
                  value={formData.isFeatured}
                  onValueChange={(val) => setFormData(prev => ({ ...prev, isFeatured: val }))}
                  trackColor={{ false: colors.border, true: '#F59E0B50' }}
                  thumbColor={formData.isFeatured ? '#F59E0B' : colors.icon}
                />
              </View>
            </View>

            <View style={{ height: 50 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  addBtnText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 14,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    fontSize: 15,
  },
  tabsContainer: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    gap: 6,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  expCard: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  expCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  expIconBox: {
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expIcon: {
    fontSize: 28,
  },
  expInfo: {
    flex: 1,
  },
  expTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  expSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  expBadges: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    gap: 3,
  },
  featuredBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  expCardActions: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  expCardFooter: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  expCardFooterText: {
    fontSize: 11,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 12,
  },
  emptyBtn: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  emptyBtnText: {
    color: '#FFF',
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  saveBtn: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  formHint: {
    fontSize: 12,
    marginBottom: 10,
  },
  regionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  regionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  regionFlag: {
    fontSize: 18,
  },
  regionBtnText: {
    fontSize: 13,
    fontWeight: '500',
  },
  formInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  formTextarea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  iconSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconPreview: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPreviewText: {
    fontSize: 36,
  },
  iconHint: {
    fontSize: 13,
  },
  emojiPicker: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  emojiBtn: {
    padding: 8,
    marginRight: 4,
  },
  emojiBtnText: {
    fontSize: 24,
  },
  typeSelector: {
    flexDirection: 'row',
  },
  typeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 8,
  },
  typeBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  colorSelector: {
    flexDirection: 'row',
  },
  colorBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorBtnSelected: {
    borderWidth: 2,
    borderColor: '#0F172A',
  },
  benefitsInput: {
    flexDirection: 'row',
    gap: 8,
  },
  addBenefitBtn: {
    width: 44,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitsList: {
    marginTop: 8,
    gap: 6,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  benefitText: {
    fontSize: 14,
  },
  togglesContainer: {
    marginTop: 8,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  toggleHint: {
    fontSize: 12,
    marginTop: 2,
  },
  // Filter Criteria Builder Styles
  filterSection: {
    marginTop: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  filterSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  filterHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterSectionTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  filterPreviewCount: {
    fontSize: 13,
    fontWeight: '500',
  },
  filterContent: {
    padding: 14,
    paddingTop: 0,
  },
  filterToggles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
  },
  filterToggleText: {
    fontSize: 12,
    fontWeight: '500',
  },
  ratingSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  ratingBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  ratingBtnText: {
    fontSize: 13,
    fontWeight: '500',
  },
  tagSuggestion: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    marginRight: 6,
  },
  tagSuggestionText: {
    fontSize: 12,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  previewSection: {
    marginTop: 16,
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  previewTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  previewCount: {
    fontSize: 13,
    fontWeight: '600',
  },
  previewStores: {
    padding: 8,
    gap: 6,
  },
  previewStoreItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
  },
  previewStoreLogo: {
    width: 32,
    height: 32,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewStoreInfo: {
    flex: 1,
  },
  previewStoreName: {
    fontSize: 13,
    fontWeight: '500',
  },
  previewStoreMeta: {
    fontSize: 11,
    marginTop: 2,
  },
  previewEmpty: {
    padding: 16,
    textAlign: 'center',
    fontSize: 13,
  },
});
