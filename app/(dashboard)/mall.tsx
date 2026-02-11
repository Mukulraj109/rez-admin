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
  TextInput,
  Modal,
  ScrollView,
  Image,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { mallService, MallBrand, MallCategory, MallOffer, MallStats } from '../../services/api/mall';
import { showAlert, showConfirm } from '../../utils/alert';

type TabType = 'dashboard' | 'brands' | 'categories' | 'offers';
type BrandFilter = 'all' | 'active' | 'inactive' | 'featured' | 'luxury';

export default function MallScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  // Dashboard state
  const [stats, setStats] = useState<MallStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Brands state
  const [brands, setBrands] = useState<MallBrand[]>([]);
  const [brandFilter, setBrandFilter] = useState<BrandFilter>('all');
  const [brandSearch, setBrandSearch] = useState('');
  const [brandsLoading, setBrandsLoading] = useState(false);
  const [brandsRefreshing, setBrandsRefreshing] = useState(false);
  const [processingBrand, setProcessingBrand] = useState<string | null>(null);

  // Categories state
  const [categories, setCategories] = useState<MallCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [processingCategory, setProcessingCategory] = useState<string | null>(null);

  // Offers state
  const [offers, setOffers] = useState<MallOffer[]>([]);
  const [offersLoading, setOffersLoading] = useState(false);
  const [processingOffer, setProcessingOffer] = useState<string | null>(null);

  // Modals
  const [showBrandModal, setShowBrandModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [editingBrand, setEditingBrand] = useState<MallBrand | null>(null);
  const [editingCategory, setEditingCategory] = useState<MallCategory | null>(null);
  const [editingOffer, setEditingOffer] = useState<MallOffer | null>(null);

  // Brand form
  const [brandForm, setBrandForm] = useState({
    name: '',
    slug: '',
    description: '',
    logo: '',
    externalUrl: '',
    tier: 'standard' as string,
    cashbackPercentage: '',
    isActive: true,
    isFeatured: false,
    isLuxury: false,
    badges: '',
  });

  // Category form
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    slug: '',
    icon: '',
    color: '#1a3a52',
    maxCashback: '',
    sortOrder: '',
    isActive: true,
    isFeatured: false,
  });

  // Offer form
  const [offerForm, setOfferForm] = useState({
    title: '',
    subtitle: '',
    image: '',
    offerType: 'cashback' as string,
    value: '',
    valueType: 'percentage' as string,
    validFrom: '',
    validUntil: '',
    badge: '',
    isActive: true,
    isMallExclusive: false,
  });

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    if (activeTab === 'brands') loadBrands();
    else if (activeTab === 'categories') loadCategories();
    else if (activeTab === 'offers') loadOffers();
  }, [activeTab, brandFilter]);

  // ==================== LOADERS ====================

  const loadStats = async () => {
    try {
      setStatsLoading(true);
      const data = await mallService.getStats();
      setStats(data);
    } catch (error: any) {
      console.error('Failed to load mall stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  const loadBrands = async () => {
    try {
      setBrandsLoading(true);
      const params: any = { limit: 50 };
      if (brandFilter === 'active') params.isActive = true;
      if (brandFilter === 'inactive') params.isActive = false;
      if (brandSearch) params.search = brandSearch;
      if (brandFilter === 'featured' || brandFilter === 'luxury') {
        params.tier = brandFilter === 'luxury' ? 'luxury' : undefined;
      }
      const result = await mallService.getBrands(params);
      let filtered = result.brands;
      if (brandFilter === 'featured') {
        filtered = filtered.filter(b => b.isFeatured);
      } else if (brandFilter === 'luxury') {
        filtered = filtered.filter(b => b.isLuxury || b.tier === 'luxury');
      }
      setBrands(filtered);
    } catch (error: any) {
      console.error('Failed to load brands:', error);
      showAlert('Error', 'Failed to load brands');
    } finally {
      setBrandsLoading(false);
      setBrandsRefreshing(false);
    }
  };

  const loadCategories = async () => {
    try {
      setCategoriesLoading(true);
      const data = await mallService.getCategories();
      setCategories(data);
    } catch (error: any) {
      console.error('Failed to load categories:', error);
      showAlert('Error', 'Failed to load categories');
    } finally {
      setCategoriesLoading(false);
    }
  };

  const loadOffers = async () => {
    try {
      setOffersLoading(true);
      const result = await mallService.getOffers({ limit: 50 });
      setOffers(result.offers);
    } catch (error: any) {
      console.error('Failed to load offers:', error);
      showAlert('Error', 'Failed to load offers');
    } finally {
      setOffersLoading(false);
    }
  };

  // ==================== BRAND CRUD ====================

  const openBrandForm = (brand?: MallBrand) => {
    if (brand) {
      setEditingBrand(brand);
      setBrandForm({
        name: brand.name,
        slug: brand.slug,
        description: brand.description || '',
        logo: brand.logo || '',
        externalUrl: brand.externalUrl || '',
        tier: brand.tier,
        cashbackPercentage: brand.cashback?.percentage?.toString() || '0',
        isActive: brand.isActive,
        isFeatured: brand.isFeatured,
        isLuxury: brand.isLuxury,
        badges: brand.badges?.join(', ') || '',
      });
    } else {
      setEditingBrand(null);
      setBrandForm({
        name: '', slug: '', description: '', logo: '', externalUrl: '',
        tier: 'standard', cashbackPercentage: '0', isActive: true,
        isFeatured: false, isLuxury: false, badges: '',
      });
    }
    setShowBrandModal(true);
  };

  const saveBrand = async () => {
    if (!brandForm.name.trim()) {
      showAlert('Error', 'Brand name is required');
      return;
    }
    try {
      const data: any = {
        name: brandForm.name.trim(),
        slug: brandForm.slug.trim() || brandForm.name.toLowerCase().replace(/\s+/g, '-'),
        description: brandForm.description.trim(),
        logo: brandForm.logo.trim(),
        externalUrl: brandForm.externalUrl.trim(),
        tier: brandForm.tier,
        cashback: { percentage: parseFloat(brandForm.cashbackPercentage) || 0 },
        isActive: brandForm.isActive,
        isFeatured: brandForm.isFeatured,
        isLuxury: brandForm.isLuxury,
        badges: brandForm.badges.split(',').map(b => b.trim()).filter(Boolean),
      };

      if (editingBrand) {
        await mallService.updateBrand(editingBrand._id, data);
        showAlert('Success', 'Brand updated successfully');
      } else {
        await mallService.createBrand(data);
        showAlert('Success', 'Brand created successfully');
      }
      setShowBrandModal(false);
      loadBrands();
      loadStats();
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to save brand');
    }
  };

  const deleteBrand = (brand: MallBrand) => {
    showConfirm(
      'Delete Brand',
      `Are you sure you want to delete "${brand.name}"?`,
      async () => {
        try {
          setProcessingBrand(brand._id);
          await mallService.deleteBrand(brand._id);
          showAlert('Success', 'Brand deleted');
          loadBrands();
          loadStats();
        } catch (error: any) {
          showAlert('Error', error.message || 'Failed to delete brand');
        } finally {
          setProcessingBrand(null);
        }
      },
      'Delete'
    );
  };

  const toggleBrandActive = async (brand: MallBrand) => {
    try {
      setProcessingBrand(brand._id);
      await mallService.updateBrand(brand._id, { isActive: !brand.isActive } as any);
      loadBrands();
    } catch (error: any) {
      showAlert('Error', 'Failed to update brand');
    } finally {
      setProcessingBrand(null);
    }
  };

  const toggleBrandFeatured = async (brand: MallBrand) => {
    try {
      setProcessingBrand(brand._id);
      await mallService.updateBrand(brand._id, { isFeatured: !brand.isFeatured } as any);
      loadBrands();
    } catch (error: any) {
      showAlert('Error', 'Failed to update brand');
    } finally {
      setProcessingBrand(null);
    }
  };

  // ==================== CATEGORY CRUD ====================

  const openCategoryForm = (category?: MallCategory) => {
    if (category) {
      setEditingCategory(category);
      setCategoryForm({
        name: category.name,
        slug: category.slug,
        icon: category.icon || '',
        color: category.color || '#1a3a52',
        maxCashback: category.maxCashback?.toString() || '0',
        sortOrder: category.sortOrder?.toString() || '0',
        isActive: category.isActive,
        isFeatured: category.isFeatured || false,
      });
    } else {
      setEditingCategory(null);
      setCategoryForm({
        name: '', slug: '', icon: '', color: '#1a3a52',
        maxCashback: '0', sortOrder: '0', isActive: true, isFeatured: false,
      });
    }
    setShowCategoryModal(true);
  };

  const saveCategory = async () => {
    if (!categoryForm.name.trim()) {
      showAlert('Error', 'Category name is required');
      return;
    }
    try {
      const data: any = {
        name: categoryForm.name.trim(),
        slug: categoryForm.slug.trim() || categoryForm.name.toLowerCase().replace(/\s+/g, '-'),
        icon: categoryForm.icon.trim(),
        color: categoryForm.color.trim(),
        maxCashback: parseFloat(categoryForm.maxCashback) || 0,
        sortOrder: parseInt(categoryForm.sortOrder) || 0,
        isActive: categoryForm.isActive,
        isFeatured: categoryForm.isFeatured,
      };

      if (editingCategory) {
        await mallService.updateCategory(editingCategory._id, data);
        showAlert('Success', 'Category updated successfully');
      } else {
        await mallService.createCategory(data);
        showAlert('Success', 'Category created successfully');
      }
      setShowCategoryModal(false);
      loadCategories();
      loadStats();
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to save category');
    }
  };

  const deleteCategory = (category: MallCategory) => {
    showConfirm(
      'Delete Category',
      `Are you sure you want to delete "${category.name}"?`,
      async () => {
        try {
          setProcessingCategory(category._id);
          await mallService.deleteCategory(category._id);
          showAlert('Success', 'Category deleted');
          loadCategories();
          loadStats();
        } catch (error: any) {
          showAlert('Error', error.message || 'Failed to delete category');
        } finally {
          setProcessingCategory(null);
        }
      },
      'Delete'
    );
  };

  // ==================== OFFER CRUD ====================

  const openOfferForm = (offer?: MallOffer) => {
    if (offer) {
      setEditingOffer(offer);
      setOfferForm({
        title: offer.title,
        subtitle: offer.subtitle || '',
        image: offer.image || '',
        offerType: offer.offerType,
        value: offer.value?.toString() || '0',
        valueType: offer.valueType,
        validFrom: offer.validFrom?.split('T')[0] || '',
        validUntil: offer.validUntil?.split('T')[0] || '',
        badge: offer.badge || '',
        isActive: offer.isActive,
        isMallExclusive: offer.isMallExclusive,
      });
    } else {
      setEditingOffer(null);
      setOfferForm({
        title: '', subtitle: '', image: '', offerType: 'cashback',
        value: '0', valueType: 'percentage', validFrom: '', validUntil: '',
        badge: '', isActive: true, isMallExclusive: false,
      });
    }
    setShowOfferModal(true);
  };

  const saveOffer = async () => {
    if (!offerForm.title.trim()) {
      showAlert('Error', 'Offer title is required');
      return;
    }
    try {
      const data: any = {
        title: offerForm.title.trim(),
        subtitle: offerForm.subtitle.trim(),
        image: offerForm.image.trim(),
        offerType: offerForm.offerType,
        value: parseFloat(offerForm.value) || 0,
        valueType: offerForm.valueType,
        validFrom: offerForm.validFrom || new Date().toISOString(),
        validUntil: offerForm.validUntil || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        badge: offerForm.badge || undefined,
        isActive: offerForm.isActive,
        isMallExclusive: offerForm.isMallExclusive,
      };

      if (editingOffer) {
        await mallService.updateOffer(editingOffer._id, data);
        showAlert('Success', 'Offer updated successfully');
      } else {
        await mallService.createOffer(data);
        showAlert('Success', 'Offer created successfully');
      }
      setShowOfferModal(false);
      loadOffers();
      loadStats();
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to save offer');
    }
  };

  const deleteOffer = (offer: MallOffer) => {
    showConfirm(
      'Delete Offer',
      `Are you sure you want to delete "${offer.title}"?`,
      async () => {
        try {
          setProcessingOffer(offer._id);
          await mallService.deleteOffer(offer._id);
          showAlert('Success', 'Offer deleted');
          loadOffers();
          loadStats();
        } catch (error: any) {
          showAlert('Error', error.message || 'Failed to delete offer');
        } finally {
          setProcessingOffer(null);
        }
      },
      'Delete'
    );
  };

  const toggleOfferActive = async (offer: MallOffer) => {
    try {
      setProcessingOffer(offer._id);
      await mallService.updateOffer(offer._id, { isActive: !offer.isActive } as any);
      loadOffers();
    } catch (error: any) {
      showAlert('Error', 'Failed to update offer');
    } finally {
      setProcessingOffer(null);
    }
  };

  // ==================== RENDERS ====================

  const renderTabs = () => (
    <View style={styles.tabBar}>
      {([
        { key: 'dashboard', label: 'Dashboard', icon: 'grid' as const },
        { key: 'brands', label: 'Brands', icon: 'storefront' as const },
        { key: 'categories', label: 'Categories', icon: 'apps' as const },
        { key: 'offers', label: 'Offers', icon: 'pricetag' as const },
      ] as const).map((tab) => (
        <TouchableOpacity
          key={tab.key}
          style={[styles.tab, activeTab === tab.key && { backgroundColor: colors.tint }]}
          onPress={() => setActiveTab(tab.key)}
        >
          <Ionicons
            name={tab.icon}
            size={18}
            color={activeTab === tab.key ? '#FFF' : colors.icon}
          />
          <Text
            style={[
              styles.tabText,
              { color: activeTab === tab.key ? '#FFF' : colors.icon },
            ]}
          >
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  // Dashboard Tab
  const renderDashboard = () => {
    if (statsLoading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
          <Text style={[styles.loadingText, { color: colors.icon }]}>Loading stats...</Text>
        </View>
      );
    }

    const statCards = [
      { label: 'Total Brands', value: stats?.totalBrands || 0, icon: 'storefront' as const, color: '#3B82F6' },
      { label: 'Active Brands', value: stats?.activeBrands || 0, icon: 'checkmark-circle' as const, color: '#10B981' },
      { label: 'Categories', value: stats?.totalCategories || 0, icon: 'apps' as const, color: '#8B5CF6' },
      { label: 'Active Categories', value: stats?.activeCategories || 0, icon: 'checkmark' as const, color: '#06B6D4' },
      { label: 'Active Offers', value: stats?.activeOffers || 0, icon: 'pricetag' as const, color: '#F59E0B' },
      { label: 'Total Offers', value: stats?.totalOffers || 0, icon: 'pricetags' as const, color: '#EF4444' },
      { label: 'Mall Stores', value: stats?.totalMallStores || 0, icon: 'business' as const, color: '#1a3a52' },
      { label: 'Active Banners', value: stats?.activeBanners || 0, icon: 'image' as const, color: '#EC4899' },
    ];

    return (
      <ScrollView
        style={styles.dashboardContainer}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={loadStats} tintColor={colors.tint} />
        }
      >
        <Text style={[styles.sectionHeader, { color: colors.text }]}>Mall Overview</Text>
        <View style={styles.statsGrid}>
          {statCards.map((card, i) => (
            <View key={i} style={[styles.statCard, { backgroundColor: colors.card }]}>
              <View style={[styles.statIconBg, { backgroundColor: `${card.color}15` }]}>
                <Ionicons name={card.icon} size={22} color={card.color} />
              </View>
              <Text style={[styles.statValue, { color: colors.text }]}>{card.value}</Text>
              <Text style={[styles.statLabel, { color: colors.icon }]}>{card.label}</Text>
            </View>
          ))}
        </View>

        <Text style={[styles.sectionHeader, { color: colors.text, marginTop: 24 }]}>Quick Actions</Text>
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={[styles.quickActionBtn, { backgroundColor: '#3B82F620' }]}
            onPress={() => { setActiveTab('brands'); setTimeout(() => openBrandForm(), 100); }}
          >
            <Ionicons name="add-circle" size={20} color="#3B82F6" />
            <Text style={[styles.quickActionText, { color: '#3B82F6' }]}>Add Brand</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickActionBtn, { backgroundColor: '#8B5CF620' }]}
            onPress={() => { setActiveTab('categories'); setTimeout(() => openCategoryForm(), 100); }}
          >
            <Ionicons name="add-circle" size={20} color="#8B5CF6" />
            <Text style={[styles.quickActionText, { color: '#8B5CF6' }]}>Add Category</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickActionBtn, { backgroundColor: '#F59E0B20' }]}
            onPress={() => { setActiveTab('offers'); setTimeout(() => openOfferForm(), 100); }}
          >
            <Ionicons name="add-circle" size={20} color="#F59E0B" />
            <Text style={[styles.quickActionText, { color: '#F59E0B' }]}>Add Offer</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  };

  // Brands Tab
  const renderBrandItem = ({ item }: { item: MallBrand }) => {
    const isProcessing = processingBrand === item._id;
    return (
      <View style={[styles.listItem, { backgroundColor: colors.card }]}>
        <View style={styles.listItemRow}>
          {item.logo ? (
            <Image source={{ uri: item.logo }} style={styles.listItemImage} />
          ) : (
            <View style={[styles.listItemImageFallback, { backgroundColor: '#1a3a52' }]}>
              <Text style={styles.listItemInitials}>
                {item.name.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.listItemInfo}>
            <View style={styles.listItemNameRow}>
              <Text style={[styles.listItemName, { color: colors.text }]} numberOfLines={1}>
                {item.name}
              </Text>
              {item.isFeatured && (
                <View style={[styles.smallBadge, { backgroundColor: '#F59E0B20' }]}>
                  <Text style={[styles.smallBadgeText, { color: '#F59E0B' }]}>Featured</Text>
                </View>
              )}
            </View>
            <Text style={[styles.listItemSub, { color: colors.icon }]}>
              {item.tier} | {item.cashback?.percentage || 0}% cashback | {item.ratings?.average?.toFixed(1) || '0'} rating
            </Text>
            <View style={styles.listItemTags}>
              <View style={[styles.statusDot, { backgroundColor: item.isActive ? '#10B981' : '#EF4444' }]} />
              <Text style={[styles.listItemSubSmall, { color: colors.icon }]}>
                {item.isActive ? 'Active' : 'Inactive'}
              </Text>
              {item.badges?.map((badge, i) => (
                <View key={i} style={[styles.tagBadge, { backgroundColor: `${colors.tint}15` }]}>
                  <Text style={[styles.tagText, { color: colors.tint }]}>{badge}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
        <View style={styles.listItemActions}>
          {isProcessing ? (
            <ActivityIndicator size="small" color={colors.tint} />
          ) : (
            <>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => toggleBrandFeatured(item)}
              >
                <Ionicons
                  name={item.isFeatured ? 'star' : 'star-outline'}
                  size={18}
                  color="#F59E0B"
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => toggleBrandActive(item)}
              >
                <Ionicons
                  name={item.isActive ? 'eye' : 'eye-off'}
                  size={18}
                  color={item.isActive ? '#10B981' : '#EF4444'}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => openBrandForm(item)}
              >
                <Ionicons name="create-outline" size={18} color={colors.tint} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => deleteBrand(item)}
              >
                <Ionicons name="trash-outline" size={18} color="#EF4444" />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  };

  const renderBrands = () => (
    <View style={{ flex: 1 }}>
      {/* Search + Filter */}
      <View style={styles.searchRow}>
        <View style={[styles.searchInput, { backgroundColor: colors.card }]}>
          <Ionicons name="search" size={18} color={colors.icon} />
          <TextInput
            style={[styles.searchText, { color: colors.text }]}
            placeholder="Search brands..."
            placeholderTextColor={colors.icon}
            value={brandSearch}
            onChangeText={setBrandSearch}
            onSubmitEditing={loadBrands}
          />
        </View>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.tint }]}
          onPress={() => openBrandForm()}
        >
          <Ionicons name="add" size={22} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Filter Chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
        {(['all', 'active', 'inactive', 'featured', 'luxury'] as BrandFilter[]).map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[
              styles.filterChip,
              brandFilter === filter
                ? { backgroundColor: colors.tint }
                : { backgroundColor: colors.card },
            ]}
            onPress={() => setBrandFilter(filter)}
          >
            <Text
              style={[
                styles.filterChipText,
                { color: brandFilter === filter ? '#FFF' : colors.icon },
              ]}
            >
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={brands}
        renderItem={renderBrandItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={brandsRefreshing}
            onRefresh={() => { setBrandsRefreshing(true); loadBrands(); }}
            tintColor={colors.tint}
          />
        }
        ListEmptyComponent={
          brandsLoading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color={colors.tint} />
            </View>
          ) : (
            <View style={styles.centerContainer}>
              <Ionicons name="storefront-outline" size={48} color={colors.icon} />
              <Text style={[styles.emptyText, { color: colors.icon }]}>No brands found</Text>
            </View>
          )
        }
      />
    </View>
  );

  // Categories Tab
  const renderCategoryItem = ({ item }: { item: MallCategory }) => {
    const isProcessing = processingCategory === item._id;
    return (
      <View style={[styles.listItem, { backgroundColor: colors.card }]}>
        <View style={styles.listItemRow}>
          <View style={[styles.categoryIcon, { backgroundColor: `${item.color}20` }]}>
            <Text style={styles.categoryEmoji}>{item.icon || '?'}</Text>
          </View>
          <View style={styles.listItemInfo}>
            <Text style={[styles.listItemName, { color: colors.text }]}>{item.name}</Text>
            <Text style={[styles.listItemSub, { color: colors.icon }]}>
              {item.slug} | Order: {item.sortOrder} | Max: {item.maxCashback}%
            </Text>
            <View style={styles.listItemTags}>
              <View style={[styles.statusDot, { backgroundColor: item.isActive ? '#10B981' : '#EF4444' }]} />
              <Text style={[styles.listItemSubSmall, { color: colors.icon }]}>
                {item.isActive ? 'Active' : 'Inactive'}
              </Text>
              {item.brandCount > 0 && (
                <Text style={[styles.listItemSubSmall, { color: colors.icon }]}>
                  | {item.brandCount} brands
                </Text>
              )}
            </View>
          </View>
        </View>
        <View style={styles.listItemActions}>
          {isProcessing ? (
            <ActivityIndicator size="small" color={colors.tint} />
          ) : (
            <>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => openCategoryForm(item)}
              >
                <Ionicons name="create-outline" size={18} color={colors.tint} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => deleteCategory(item)}
              >
                <Ionicons name="trash-outline" size={18} color="#EF4444" />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  };

  const renderCategories = () => (
    <View style={{ flex: 1 }}>
      <View style={styles.searchRow}>
        <Text style={[styles.sectionCount, { color: colors.icon }]}>
          {categories.length} categories
        </Text>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.tint }]}
          onPress={() => openCategoryForm()}
        >
          <Ionicons name="add" size={22} color="#FFF" />
        </TouchableOpacity>
      </View>
      <FlatList
        data={categories}
        renderItem={renderCategoryItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={loadCategories} tintColor={colors.tint} />
        }
        ListEmptyComponent={
          categoriesLoading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color={colors.tint} />
            </View>
          ) : (
            <View style={styles.centerContainer}>
              <Ionicons name="apps-outline" size={48} color={colors.icon} />
              <Text style={[styles.emptyText, { color: colors.icon }]}>No categories</Text>
            </View>
          )
        }
      />
    </View>
  );

  // Offers Tab
  const renderOfferItem = ({ item }: { item: MallOffer }) => {
    const isProcessing = processingOffer === item._id;
    const isExpired = new Date(item.validUntil) < new Date();
    return (
      <View style={[styles.listItem, { backgroundColor: colors.card }]}>
        <View style={styles.listItemRow}>
          {item.image ? (
            <Image source={{ uri: item.image }} style={styles.listItemImage} />
          ) : (
            <View style={[styles.listItemImageFallback, { backgroundColor: '#F59E0B' }]}>
              <Ionicons name="pricetag" size={20} color="#FFF" />
            </View>
          )}
          <View style={styles.listItemInfo}>
            <Text style={[styles.listItemName, { color: colors.text }]} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={[styles.listItemSub, { color: colors.icon }]}>
              {item.offerType} | {item.value}{item.valueType === 'percentage' ? '%' : ''} off
            </Text>
            <View style={styles.listItemTags}>
              <View style={[styles.statusDot, {
                backgroundColor: isExpired ? '#9CA3AF' : item.isActive ? '#10B981' : '#EF4444'
              }]} />
              <Text style={[styles.listItemSubSmall, { color: colors.icon }]}>
                {isExpired ? 'Expired' : item.isActive ? 'Active' : 'Inactive'}
              </Text>
              {item.badge && (
                <View style={[styles.tagBadge, { backgroundColor: '#F59E0B20' }]}>
                  <Text style={[styles.tagText, { color: '#F59E0B' }]}>{item.badge}</Text>
                </View>
              )}
              {item.isMallExclusive && (
                <View style={[styles.tagBadge, { backgroundColor: '#8B5CF620' }]}>
                  <Text style={[styles.tagText, { color: '#8B5CF6' }]}>Exclusive</Text>
                </View>
              )}
            </View>
          </View>
        </View>
        <View style={styles.listItemActions}>
          {isProcessing ? (
            <ActivityIndicator size="small" color={colors.tint} />
          ) : (
            <>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => toggleOfferActive(item)}
              >
                <Ionicons
                  name={item.isActive ? 'eye' : 'eye-off'}
                  size={18}
                  color={item.isActive ? '#10B981' : '#EF4444'}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => openOfferForm(item)}
              >
                <Ionicons name="create-outline" size={18} color={colors.tint} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => deleteOffer(item)}
              >
                <Ionicons name="trash-outline" size={18} color="#EF4444" />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  };

  const renderOffers = () => (
    <View style={{ flex: 1 }}>
      <View style={styles.searchRow}>
        <Text style={[styles.sectionCount, { color: colors.icon }]}>
          {offers.length} offers
        </Text>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.tint }]}
          onPress={() => openOfferForm()}
        >
          <Ionicons name="add" size={22} color="#FFF" />
        </TouchableOpacity>
      </View>
      <FlatList
        data={offers}
        renderItem={renderOfferItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={loadOffers} tintColor={colors.tint} />
        }
        ListEmptyComponent={
          offersLoading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color={colors.tint} />
            </View>
          ) : (
            <View style={styles.centerContainer}>
              <Ionicons name="pricetag-outline" size={48} color={colors.icon} />
              <Text style={[styles.emptyText, { color: colors.icon }]}>No offers</Text>
            </View>
          )
        }
      />
    </View>
  );

  // ==================== MODALS ====================

  const renderFormField = (
    label: string,
    value: string,
    onChangeText: (text: string) => void,
    options?: { placeholder?: string; multiline?: boolean; keyboardType?: string }
  ) => (
    <View style={styles.formField}>
      <Text style={[styles.formLabel, { color: colors.text }]}>{label}</Text>
      <TextInput
        style={[
          styles.formInput,
          { color: colors.text, backgroundColor: colors.background, borderColor: colors.border },
          options?.multiline && { height: 80, textAlignVertical: 'top' },
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={options?.placeholder || ''}
        placeholderTextColor={colors.icon}
        multiline={options?.multiline}
      />
    </View>
  );

  const renderSwitchField = (label: string, value: boolean, onValueChange: (v: boolean) => void) => (
    <View style={styles.switchField}>
      <Text style={[styles.formLabel, { color: colors.text }]}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#E2E8F0', true: colors.tint }}
        thumbColor="#FFF"
      />
    </View>
  );

  const renderBrandModal = () => (
    <Modal visible={showBrandModal} animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { backgroundColor: colors.card }]}>
          <TouchableOpacity onPress={() => setShowBrandModal(false)}>
            <Text style={[styles.modalCancel, { color: colors.tint }]}>Cancel</Text>
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: colors.text }]}>
            {editingBrand ? 'Edit Brand' : 'New Brand'}
          </Text>
          <TouchableOpacity onPress={saveBrand}>
            <Text style={[styles.modalSave, { color: colors.tint }]}>Save</Text>
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={styles.modalContent}>
          {renderFormField('Name *', brandForm.name, (v) => setBrandForm(p => ({ ...p, name: v })))}
          {renderFormField('Slug', brandForm.slug, (v) => setBrandForm(p => ({ ...p, slug: v })), { placeholder: 'auto-generated from name' })}
          {renderFormField('Description', brandForm.description, (v) => setBrandForm(p => ({ ...p, description: v })), { multiline: true })}
          {renderFormField('Logo URL', brandForm.logo, (v) => setBrandForm(p => ({ ...p, logo: v })))}
          {renderFormField('External URL', brandForm.externalUrl, (v) => setBrandForm(p => ({ ...p, externalUrl: v })))}

          <View style={styles.formField}>
            <Text style={[styles.formLabel, { color: colors.text }]}>Tier</Text>
            <View style={styles.tierRow}>
              {['standard', 'premium', 'exclusive', 'luxury'].map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[
                    styles.tierBtn,
                    brandForm.tier === t
                      ? { backgroundColor: colors.tint }
                      : { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
                  ]}
                  onPress={() => setBrandForm(p => ({ ...p, tier: t }))}
                >
                  <Text style={{ color: brandForm.tier === t ? '#FFF' : colors.icon, fontSize: 12, fontWeight: '600' }}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {renderFormField('Cashback %', brandForm.cashbackPercentage, (v) => setBrandForm(p => ({ ...p, cashbackPercentage: v })))}
          {renderFormField('Badges (comma separated)', brandForm.badges, (v) => setBrandForm(p => ({ ...p, badges: v })), { placeholder: 'exclusive, trending, new' })}
          {renderSwitchField('Active', brandForm.isActive, (v) => setBrandForm(p => ({ ...p, isActive: v })))}
          {renderSwitchField('Featured', brandForm.isFeatured, (v) => setBrandForm(p => ({ ...p, isFeatured: v })))}
          {renderSwitchField('Luxury', brandForm.isLuxury, (v) => setBrandForm(p => ({ ...p, isLuxury: v })))}
        </ScrollView>
      </View>
    </Modal>
  );

  const renderCategoryModal = () => (
    <Modal visible={showCategoryModal} animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { backgroundColor: colors.card }]}>
          <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
            <Text style={[styles.modalCancel, { color: colors.tint }]}>Cancel</Text>
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: colors.text }]}>
            {editingCategory ? 'Edit Category' : 'New Category'}
          </Text>
          <TouchableOpacity onPress={saveCategory}>
            <Text style={[styles.modalSave, { color: colors.tint }]}>Save</Text>
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={styles.modalContent}>
          {renderFormField('Name *', categoryForm.name, (v) => setCategoryForm(p => ({ ...p, name: v })))}
          {renderFormField('Slug', categoryForm.slug, (v) => setCategoryForm(p => ({ ...p, slug: v })), { placeholder: 'auto-generated from name' })}
          {renderFormField('Icon (emoji)', categoryForm.icon, (v) => setCategoryForm(p => ({ ...p, icon: v })))}
          {renderFormField('Color', categoryForm.color, (v) => setCategoryForm(p => ({ ...p, color: v })), { placeholder: '#1a3a52' })}
          {renderFormField('Max Cashback %', categoryForm.maxCashback, (v) => setCategoryForm(p => ({ ...p, maxCashback: v })))}
          {renderFormField('Sort Order', categoryForm.sortOrder, (v) => setCategoryForm(p => ({ ...p, sortOrder: v })))}
          {renderSwitchField('Active', categoryForm.isActive, (v) => setCategoryForm(p => ({ ...p, isActive: v })))}
          {renderSwitchField('Featured', categoryForm.isFeatured, (v) => setCategoryForm(p => ({ ...p, isFeatured: v })))}
        </ScrollView>
      </View>
    </Modal>
  );

  const renderOfferModal = () => (
    <Modal visible={showOfferModal} animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { backgroundColor: colors.card }]}>
          <TouchableOpacity onPress={() => setShowOfferModal(false)}>
            <Text style={[styles.modalCancel, { color: colors.tint }]}>Cancel</Text>
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: colors.text }]}>
            {editingOffer ? 'Edit Offer' : 'New Offer'}
          </Text>
          <TouchableOpacity onPress={saveOffer}>
            <Text style={[styles.modalSave, { color: colors.tint }]}>Save</Text>
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={styles.modalContent}>
          {renderFormField('Title *', offerForm.title, (v) => setOfferForm(p => ({ ...p, title: v })))}
          {renderFormField('Subtitle', offerForm.subtitle, (v) => setOfferForm(p => ({ ...p, subtitle: v })))}
          {renderFormField('Image URL', offerForm.image, (v) => setOfferForm(p => ({ ...p, image: v })))}

          <View style={styles.formField}>
            <Text style={[styles.formLabel, { color: colors.text }]}>Offer Type</Text>
            <View style={styles.tierRow}>
              {['cashback', 'discount', 'coins', 'combo'].map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[
                    styles.tierBtn,
                    offerForm.offerType === t
                      ? { backgroundColor: colors.tint }
                      : { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
                  ]}
                  onPress={() => setOfferForm(p => ({ ...p, offerType: t }))}
                >
                  <Text style={{ color: offerForm.offerType === t ? '#FFF' : colors.icon, fontSize: 12, fontWeight: '600' }}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {renderFormField('Value', offerForm.value, (v) => setOfferForm(p => ({ ...p, value: v })))}

          <View style={styles.formField}>
            <Text style={[styles.formLabel, { color: colors.text }]}>Value Type</Text>
            <View style={styles.tierRow}>
              {['percentage', 'fixed'].map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[
                    styles.tierBtn,
                    offerForm.valueType === t
                      ? { backgroundColor: colors.tint }
                      : { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
                  ]}
                  onPress={() => setOfferForm(p => ({ ...p, valueType: t }))}
                >
                  <Text style={{ color: offerForm.valueType === t ? '#FFF' : colors.icon, fontSize: 12, fontWeight: '600' }}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {renderFormField('Valid From (YYYY-MM-DD)', offerForm.validFrom, (v) => setOfferForm(p => ({ ...p, validFrom: v })))}
          {renderFormField('Valid Until (YYYY-MM-DD)', offerForm.validUntil, (v) => setOfferForm(p => ({ ...p, validUntil: v })))}

          <View style={styles.formField}>
            <Text style={[styles.formLabel, { color: colors.text }]}>Badge</Text>
            <View style={styles.tierRow}>
              {['', 'flash-sale', 'limited-time', 'best-deal', 'mall-exclusive'].map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[
                    styles.tierBtn,
                    offerForm.badge === t
                      ? { backgroundColor: colors.tint }
                      : { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
                  ]}
                  onPress={() => setOfferForm(p => ({ ...p, badge: t }))}
                >
                  <Text style={{ color: offerForm.badge === t ? '#FFF' : colors.icon, fontSize: 10, fontWeight: '600' }}>
                    {t || 'None'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {renderSwitchField('Active', offerForm.isActive, (v) => setOfferForm(p => ({ ...p, isActive: v })))}
          {renderSwitchField('Mall Exclusive', offerForm.isMallExclusive, (v) => setOfferForm(p => ({ ...p, isMallExclusive: v })))}
        </ScrollView>
      </View>
    </Modal>
  );

  // ==================== MAIN RENDER ====================

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <View style={styles.headerRow}>
          <Ionicons name="bag-handle" size={24} color={colors.tint} />
          <Text style={[styles.headerTitle, { color: colors.text }]}>Mall Management</Text>
        </View>
        <Text style={[styles.headerSubtitle, { color: colors.icon }]}>
          Manage brands, categories, and offers
        </Text>
      </View>

      {/* Tabs */}
      {renderTabs()}

      {/* Content */}
      <View style={{ flex: 1 }}>
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'brands' && renderBrands()}
        {activeTab === 'categories' && renderCategories()}
        {activeTab === 'offers' && renderOffers()}
      </View>

      {/* Modals */}
      {renderBrandModal()}
      {renderCategoryModal()}
      {renderOfferModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 14,
    marginLeft: 34,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '500',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
  },

  // Dashboard
  dashboardContainer: {
    flex: 1,
    padding: 16,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 14,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    width: '47%',
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    gap: 8,
  },
  statIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 32,
  },
  quickActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  quickActionText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // List Items
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
  },
  searchText: {
    flex: 1,
    fontSize: 14,
  },
  sectionCount: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterRow: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  listItem: {
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
  },
  listItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  listItemImage: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
  },
  listItemImageFallback: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listItemInitials: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
  listItemInfo: {
    flex: 1,
  },
  listItemNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  listItemName: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  listItemSub: {
    fontSize: 12,
    marginTop: 2,
  },
  listItemSubSmall: {
    fontSize: 11,
  },
  listItemTags: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  smallBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  smallBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  tagBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '600',
  },
  listItemActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 8,
  },
  actionBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryEmoji: {
    fontSize: 22,
  },

  // Modal
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  modalCancel: {
    fontSize: 16,
  },
  modalSave: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalContent: {
    padding: 20,
    paddingBottom: 60,
  },
  formField: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  formInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  switchField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingVertical: 4,
  },
  tierRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tierBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
});
