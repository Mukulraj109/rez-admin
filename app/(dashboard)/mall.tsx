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
import { mallService, MallCategory, MallOffer, MallStats, AllianceStore, ManagedMallStore, MallBanner, MallCollection } from '../../services/api/mall';
import { showAlert, showConfirm } from '../../utils/alert';
import { MallDashboard, MallBrandsList } from '../../components/mall';

type TabType = 'dashboard' | 'stores' | 'brands' | 'categories' | 'offers' | 'banners' | 'collections' | 'alliance';
export default function MallScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  // Dashboard state
  const [stats, setStats] = useState<MallStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Categories state
  const [categories, setCategories] = useState<MallCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [processingCategory, setProcessingCategory] = useState<string | null>(null);

  // Offers state
  const [offers, setOffers] = useState<MallOffer[]>([]);
  const [offersLoading, setOffersLoading] = useState(false);
  const [processingOffer, setProcessingOffer] = useState<string | null>(null);

  // Alliance state
  const [allianceStores, setAllianceStores] = useState<AllianceStore[]>([]);
  const [allianceSearch, setAllianceSearch] = useState('');
  const [allianceLoading, setAllianceLoading] = useState(false);
  const [processingAlliance, setProcessingAlliance] = useState<string | null>(null);

  // Mall Stores management state
  const [managedStores, setManagedStores] = useState<ManagedMallStore[]>([]);
  const [managedStoresSearch, setManagedStoresSearch] = useState('');
  const [managedStoresFilter, setManagedStoresFilter] = useState<'all' | 'mall' | 'non-mall'>('all');
  const [managedStoresLoading, setManagedStoresLoading] = useState(false);
  const [processingManagedStore, setProcessingManagedStore] = useState<string | null>(null);

  // Banners state
  const [banners, setBanners] = useState<MallBanner[]>([]);
  const [bannersLoading, setBannersLoading] = useState(false);
  const [processingBanner, setProcessingBanner] = useState<string | null>(null);

  // Collections state
  const [collections, setCollections] = useState<MallCollection[]>([]);
  const [collectionsLoading, setCollectionsLoading] = useState(false);
  const [processingCollection, setProcessingCollection] = useState<string | null>(null);

  // Modals
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [showBannerModal, setShowBannerModal] = useState(false);
  const [showCollectionModal, setShowCollectionModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<MallCategory | null>(null);
  const [editingOffer, setEditingOffer] = useState<MallOffer | null>(null);
  const [editingBanner, setEditingBanner] = useState<MallBanner | null>(null);
  const [editingCollection, setEditingCollection] = useState<MallCollection | null>(null);

  // Category form
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    slug: '',
    description: '',
    icon: '',
    image: '',
    color: colors.navy,
    backgroundColor: '',
    maxCashback: '',
    sortOrder: '',
    isActive: true,
    isFeatured: false,
  });

  // Offer form
  const [offerForm, setOfferForm] = useState({
    title: '',
    subtitle: '',
    description: '',
    image: '',
    store: '',
    brand: '',
    offerType: 'cashback' as string,
    value: '',
    valueType: 'percentage' as string,
    minPurchase: '',
    maxDiscount: '',
    validFrom: '',
    validUntil: '',
    badge: '',
    isActive: true,
    isMallExclusive: false,
  });

  // Banner form
  const [bannerForm, setBannerForm] = useState({
    title: '',
    subtitle: '',
    image: '',
    backgroundColor: colors.emerald,
    textColor: colors.card,
    ctaText: 'Shop Now',
    ctaAction: 'navigate' as string,
    ctaUrl: '',
    ctaBrand: '',
    ctaCategory: '',
    ctaCollection: '',
    position: 'hero' as string,
    priority: '0',
    validFrom: '',
    validUntil: '',
    isActive: true,
    badge: '',
  });

  // Collection form
  const [collectionForm, setCollectionForm] = useState({
    name: '',
    slug: '',
    description: '',
    image: '',
    type: 'curated' as string,
    sortOrder: '0',
    validFrom: '',
    validUntil: '',
    isActive: true,
  });

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    if (activeTab === 'categories') loadCategories();
    else if (activeTab === 'offers') loadOffers();
    else if (activeTab === 'alliance') loadAllianceStores();
    else if (activeTab === 'stores') loadManagedStores();
    else if (activeTab === 'banners') loadBanners();
    else if (activeTab === 'collections') loadCollections();
  }, [activeTab, managedStoresFilter]);

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

  const loadAllianceStores = async (search?: string) => {
    try {
      setAllianceLoading(true);
      const data = await mallService.getAllianceStores(search || allianceSearch || undefined);
      setAllianceStores(data);
    } catch (error: any) {
      console.error('Failed to load alliance stores:', error);
      showAlert('Error', 'Failed to load alliance stores');
    } finally {
      setAllianceLoading(false);
    }
  };

  const toggleAlliance = async (store: AllianceStore) => {
    try {
      setProcessingAlliance(store._id);
      const isAlliance = !!store.deliveryCategories?.alliance;
      await mallService.toggleStoreAlliance(store._id, !isAlliance);
      loadAllianceStores();
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to toggle alliance');
    } finally {
      setProcessingAlliance(null);
    }
  };

  // ==================== BANNERS ====================

  const loadBanners = async () => {
    try {
      setBannersLoading(true);
      const data = await mallService.getBanners();
      setBanners(data);
    } catch (error: any) {
      console.error('Failed to load banners:', error);
      showAlert('Error', 'Failed to load banners');
    } finally {
      setBannersLoading(false);
    }
  };

  const openBannerForm = (banner?: MallBanner) => {
    if (banner) {
      setEditingBanner(banner);
      setBannerForm({
        title: banner.title,
        subtitle: banner.subtitle || '',
        image: banner.image || '',
        backgroundColor: banner.backgroundColor || colors.emerald,
        textColor: banner.textColor || colors.card,
        ctaText: banner.ctaText || 'Shop Now',
        ctaAction: banner.ctaAction || 'navigate',
        ctaUrl: banner.ctaUrl || '',
        ctaBrand: (typeof banner.ctaBrand === 'object' ? banner.ctaBrand?._id : banner.ctaBrand) || '',
        ctaCategory: (typeof banner.ctaCategory === 'object' ? banner.ctaCategory?._id : banner.ctaCategory) || '',
        ctaCollection: (typeof banner.ctaCollection === 'object' ? banner.ctaCollection?._id : banner.ctaCollection) || '',
        position: banner.position || 'hero',
        priority: banner.priority?.toString() || '0',
        validFrom: banner.validFrom?.split('T')[0] || '',
        validUntil: banner.validUntil?.split('T')[0] || '',
        isActive: banner.isActive,
        badge: banner.badge || '',
      });
    } else {
      setEditingBanner(null);
      const today = new Date().toISOString().split('T')[0];
      const sixMonths = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      setBannerForm({
        title: '', subtitle: '', image: '', backgroundColor: colors.emerald,
        textColor: colors.card, ctaText: 'Shop Now', ctaAction: 'navigate',
        ctaUrl: '', ctaBrand: '', ctaCategory: '', ctaCollection: '',
        position: 'hero', priority: '0',
        validFrom: today, validUntil: sixMonths, isActive: true, badge: '',
      });
    }
    setShowBannerModal(true);
  };

  const saveBanner = async () => {
    if (!bannerForm.title.trim()) {
      showAlert('Error', 'Banner title is required');
      return;
    }
    if (!bannerForm.image.trim()) {
      showAlert('Error', 'Banner image URL is required');
      return;
    }
    try {
      const data: any = {
        title: bannerForm.title.trim(),
        subtitle: bannerForm.subtitle.trim() || undefined,
        image: bannerForm.image.trim(),
        backgroundColor: bannerForm.backgroundColor.trim(),
        textColor: bannerForm.textColor.trim(),
        ctaText: bannerForm.ctaText.trim(),
        ctaAction: bannerForm.ctaAction,
        ctaUrl: bannerForm.ctaUrl.trim() || undefined,
        ctaBrand: bannerForm.ctaBrand.trim() || undefined,
        ctaCategory: bannerForm.ctaCategory.trim() || undefined,
        ctaCollection: bannerForm.ctaCollection.trim() || undefined,
        position: bannerForm.position,
        priority: parseInt(bannerForm.priority) || 0,
        validFrom: bannerForm.validFrom || new Date().toISOString(),
        validUntil: bannerForm.validUntil || new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
        isActive: bannerForm.isActive,
        badge: bannerForm.badge.trim() || undefined,
      };

      if (editingBanner) {
        await mallService.updateBanner(editingBanner._id, data);
        showAlert('Success', 'Banner updated successfully');
      } else {
        await mallService.createBanner(data);
        showAlert('Success', 'Banner created successfully');
      }
      setShowBannerModal(false);
      loadBanners();
      loadStats();
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to save banner');
    }
  };

  const deleteBanner = (banner: MallBanner) => {
    showConfirm(
      'Delete Banner',
      `Are you sure you want to delete "${banner.title}"?`,
      async () => {
        try {
          setProcessingBanner(banner._id);
          await mallService.deleteBanner(banner._id);
          showAlert('Success', 'Banner deleted');
          loadBanners();
          loadStats();
        } catch (error: any) {
          showAlert('Error', error.message || 'Failed to delete banner');
        } finally {
          setProcessingBanner(null);
        }
      },
      'Delete'
    );
  };

  const toggleBannerActive = async (banner: MallBanner) => {
    try {
      setProcessingBanner(banner._id);
      await mallService.updateBanner(banner._id, { isActive: !banner.isActive } as any);
      loadBanners();
    } catch (error: any) {
      showAlert('Error', 'Failed to update banner');
    } finally {
      setProcessingBanner(null);
    }
  };

  // ==================== COLLECTIONS ====================

  const loadCollections = async () => {
    try {
      setCollectionsLoading(true);
      const data = await mallService.getCollections();
      setCollections(data);
    } catch (error: any) {
      console.error('Failed to load collections:', error);
      showAlert('Error', 'Failed to load collections');
    } finally {
      setCollectionsLoading(false);
    }
  };

  const openCollectionForm = (collection?: MallCollection) => {
    if (collection) {
      setEditingCollection(collection);
      setCollectionForm({
        name: collection.name,
        slug: collection.slug || '',
        description: collection.description || '',
        image: collection.image || '',
        type: collection.type || 'curated',
        sortOrder: collection.sortOrder?.toString() || '0',
        validFrom: collection.validFrom?.split('T')[0] || '',
        validUntil: collection.validUntil?.split('T')[0] || '',
        isActive: collection.isActive,
      });
    } else {
      setEditingCollection(null);
      setCollectionForm({
        name: '', slug: '', description: '', image: '',
        type: 'curated', sortOrder: '0', validFrom: '', validUntil: '',
        isActive: true,
      });
    }
    setShowCollectionModal(true);
  };

  const saveCollection = async () => {
    if (!collectionForm.name.trim()) {
      showAlert('Error', 'Collection name is required');
      return;
    }
    if (!collectionForm.image.trim()) {
      showAlert('Error', 'Collection image URL is required');
      return;
    }
    try {
      const data: any = {
        name: collectionForm.name.trim(),
        slug: collectionForm.slug.trim() || collectionForm.name.toLowerCase().replace(/\s+/g, '-'),
        description: collectionForm.description.trim() || undefined,
        image: collectionForm.image.trim(),
        type: collectionForm.type,
        sortOrder: parseInt(collectionForm.sortOrder) || 0,
        validFrom: collectionForm.validFrom || undefined,
        validUntil: collectionForm.validUntil || undefined,
        isActive: collectionForm.isActive,
      };

      if (editingCollection) {
        await mallService.updateCollection(editingCollection._id, data);
        showAlert('Success', 'Collection updated successfully');
      } else {
        await mallService.createCollection(data);
        showAlert('Success', 'Collection created successfully');
      }
      setShowCollectionModal(false);
      loadCollections();
      loadStats();
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to save collection');
    }
  };

  const deleteCollection = (collection: MallCollection) => {
    showConfirm(
      'Delete Collection',
      `Are you sure you want to delete "${collection.name}"?`,
      async () => {
        try {
          setProcessingCollection(collection._id);
          await mallService.deleteCollection(collection._id);
          showAlert('Success', 'Collection deleted');
          loadCollections();
          loadStats();
        } catch (error: any) {
          showAlert('Error', error.message || 'Failed to delete collection');
        } finally {
          setProcessingCollection(null);
        }
      },
      'Delete'
    );
  };

  const toggleCollectionActive = async (collection: MallCollection) => {
    try {
      setProcessingCollection(collection._id);
      await mallService.updateCollection(collection._id, { isActive: !collection.isActive } as any);
      loadCollections();
    } catch (error: any) {
      showAlert('Error', 'Failed to update collection');
    } finally {
      setProcessingCollection(null);
    }
  };

  // ==================== MALL STORES MANAGEMENT ====================

  const loadManagedStores = async (search?: string) => {
    try {
      setManagedStoresLoading(true);
      const data = await mallService.getManagedMallStores({
        search: search || managedStoresSearch || undefined,
        filter: managedStoresFilter !== 'all' ? managedStoresFilter : undefined,
      });
      setManagedStores(data);
    } catch (error: any) {
      console.error('Failed to load managed stores:', error);
      showAlert('Error', 'Failed to load stores');
    } finally {
      setManagedStoresLoading(false);
    }
  };

  const toggleStoreMall = async (store: ManagedMallStore) => {
    try {
      setProcessingManagedStore(store._id);
      const isMall = !!store.deliveryCategories?.mall;
      await mallService.toggleStoreMall(store._id, !isMall);
      loadManagedStores();
      loadStats();
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to toggle mall status');
    } finally {
      setProcessingManagedStore(null);
    }
  };

  const toggleStoreFeatured = async (store: ManagedMallStore) => {
    if (!store.deliveryCategories?.mall) {
      showAlert('Info', 'Store must be added to mall first');
      return;
    }
    try {
      setProcessingManagedStore(store._id);
      await mallService.updateStoreMallProperties(store._id, {
        isFeatured: !store.isFeatured,
      });
      loadManagedStores();
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to update store');
    } finally {
      setProcessingManagedStore(null);
    }
  };

  const toggleStorePremium = async (store: ManagedMallStore) => {
    if (!store.deliveryCategories?.mall) {
      showAlert('Info', 'Store must be added to mall first');
      return;
    }
    try {
      setProcessingManagedStore(store._id);
      await mallService.updateStoreMallProperties(store._id, {
        premium: !store.deliveryCategories?.premium,
      });
      loadManagedStores();
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to update store');
    } finally {
      setProcessingManagedStore(null);
    }
  };

  // ==================== CATEGORY CRUD ====================

  const openCategoryForm = (category?: MallCategory) => {
    if (category) {
      setEditingCategory(category);
      setCategoryForm({
        name: category.name,
        slug: category.slug,
        description: (category as any).description || '',
        icon: category.icon || '',
        image: (category as any).image || '',
        color: category.color || colors.navy,
        backgroundColor: (category as any).backgroundColor || '',
        maxCashback: category.maxCashback?.toString() || '0',
        sortOrder: category.sortOrder?.toString() || '0',
        isActive: category.isActive,
        isFeatured: category.isFeatured || false,
      });
    } else {
      setEditingCategory(null);
      setCategoryForm({
        name: '', slug: '', description: '', icon: '', image: '',
        color: colors.navy, backgroundColor: '',
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
        description: categoryForm.description.trim() || undefined,
        icon: categoryForm.icon.trim(),
        image: categoryForm.image.trim() || undefined,
        color: categoryForm.color.trim(),
        backgroundColor: categoryForm.backgroundColor.trim() || undefined,
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
      const brandId = typeof offer.brand === 'object' ? offer.brand?._id : offer.brand;
      setOfferForm({
        title: offer.title,
        subtitle: offer.subtitle || '',
        description: (offer as any).description || '',
        image: offer.image || '',
        store: offer.store || '',
        brand: brandId || '',
        offerType: offer.offerType,
        value: offer.value?.toString() || '0',
        valueType: offer.valueType,
        minPurchase: (offer as any).minPurchase?.toString() || '',
        maxDiscount: (offer as any).maxDiscount?.toString() || '',
        validFrom: offer.validFrom?.split('T')[0] || '',
        validUntil: offer.validUntil?.split('T')[0] || '',
        badge: offer.badge || '',
        isActive: offer.isActive,
        isMallExclusive: offer.isMallExclusive,
      });
    } else {
      setEditingOffer(null);
      const today = new Date().toISOString().split('T')[0];
      const oneMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      setOfferForm({
        title: '', subtitle: '', description: '', image: '',
        store: '', brand: '', offerType: 'cashback',
        value: '0', valueType: 'percentage', minPurchase: '', maxDiscount: '',
        validFrom: today, validUntil: oneMonth,
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
    if (!offerForm.store.trim() && !offerForm.brand.trim()) {
      showAlert('Error', 'Either Store ID or Brand ID is required');
      return;
    }
    if (offerForm.store.trim() && offerForm.brand.trim()) {
      showAlert('Error', 'Offer must be linked to either a Store OR a Brand, not both');
      return;
    }
    try {
      const data: any = {
        title: offerForm.title.trim(),
        subtitle: offerForm.subtitle.trim() || undefined,
        description: offerForm.description.trim() || undefined,
        image: offerForm.image.trim() || undefined,
        store: offerForm.store.trim() || undefined,
        brand: offerForm.brand.trim() || undefined,
        offerType: offerForm.offerType,
        value: parseFloat(offerForm.value) || 0,
        valueType: offerForm.valueType,
        minPurchase: offerForm.minPurchase ? parseFloat(offerForm.minPurchase) : undefined,
        maxDiscount: offerForm.maxDiscount ? parseFloat(offerForm.maxDiscount) : undefined,
        validFrom: offerForm.validFrom || new Date().toISOString(),
        validUntil: offerForm.validUntil || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
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
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar} contentContainerStyle={styles.tabBarContent}>
      {([
        { key: 'dashboard', label: 'Dashboard', icon: 'grid' as const },
        { key: 'stores', label: 'Stores', icon: 'business' as const },
        { key: 'brands', label: 'Brands', icon: 'storefront' as const },
        { key: 'categories', label: 'Categories', icon: 'apps' as const },
        { key: 'offers', label: 'Offers', icon: 'pricetag' as const },
        { key: 'banners', label: 'Banners', icon: 'image' as const },
        { key: 'collections', label: 'Collections', icon: 'albums' as const },
        { key: 'alliance', label: 'Alliance', icon: 'people' as const },
      ] as const).map((tab) => (
        <TouchableOpacity
          key={tab.key}
          style={[styles.tab, activeTab === tab.key && { backgroundColor: colors.tint }]}
          onPress={() => setActiveTab(tab.key)}
        >
          <Ionicons
            name={tab.icon}
            size={18}
            color={activeTab === tab.key ? colors.card : colors.icon}
          />
          <Text
            style={[
              styles.tabText,
              { color: activeTab === tab.key ? colors.card : colors.icon },
            ]}
          >
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
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
              <View style={[styles.statusDot, { backgroundColor: item.isActive ? colors.success : colors.error }]} />
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
                <Ionicons name="trash-outline" size={18} color={colors.error} />
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
          <Ionicons name="add" size={22} color={colors.card} />
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
            <View style={[styles.listItemImageFallback, { backgroundColor: colors.warning }]}>
              <Ionicons name="pricetag" size={20} color={colors.card} />
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
                backgroundColor: isExpired ? colors.icon : item.isActive ? colors.success : colors.error
              }]} />
              <Text style={[styles.listItemSubSmall, { color: colors.icon }]}>
                {isExpired ? 'Expired' : item.isActive ? 'Active' : 'Inactive'}
              </Text>
              {item.badge && (
                <View style={[styles.tagBadge, { backgroundColor: `${colors.warning}20` }]}>
                  <Text style={[styles.tagText, { color: colors.warning }]}>{item.badge}</Text>
                </View>
              )}
              {item.isMallExclusive && (
                <View style={[styles.tagBadge, { backgroundColor: `${colors.purple}20` }]}>
                  <Text style={[styles.tagText, { color: colors.purple }]}>Exclusive</Text>
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
                  color={item.isActive ? colors.success : colors.error}
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
                <Ionicons name="trash-outline" size={18} color={colors.error} />
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
          <Ionicons name="add" size={22} color={colors.card} />
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

  // Mall Stores Management Tab
  const renderManagedStoreItem = ({ item }: { item: ManagedMallStore }) => {
    const isMall = !!item.deliveryCategories?.mall;
    const isPremium = !!item.deliveryCategories?.premium;
    const isProcessing = processingManagedStore === item._id;
    const cashback = item.offers?.cashback || item.rewardRules?.baseCashbackPercent || 0;

    return (
      <View style={[styles.listItem, { backgroundColor: colors.card }]}>
        <View style={styles.listItemRow}>
          {item.logo ? (
            <Image source={{ uri: item.logo }} style={styles.listItemImage} />
          ) : (
            <View style={[styles.listItemImageFallback, { backgroundColor: colors.navy }]}>
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
              {item.isVerified && (
                <View style={[styles.smallBadge, { backgroundColor: `${colors.success}20` }]}>
                  <Text style={[styles.smallBadgeText, { color: colors.success }]}>Verified</Text>
                </View>
              )}
            </View>
            <Text style={[styles.listItemSub, { color: colors.icon }]}>
              {item.category?.name || 'Uncategorized'} | {item.ratings?.average?.toFixed(1) || '0'} rating | {cashback}% cashback
            </Text>
            <View style={styles.listItemTags}>
              <View style={[styles.statusDot, { backgroundColor: isMall ? colors.success : colors.icon }]} />
              <Text style={[styles.listItemSubSmall, { color: colors.icon }]}>
                {isMall ? 'In Mall' : 'Not in Mall'}
              </Text>
              {item.isFeatured && (
                <View style={[styles.tagBadge, { backgroundColor: `${colors.warning}20` }]}>
                  <Text style={[styles.tagText, { color: colors.warning }]}>Featured</Text>
                </View>
              )}
              {isPremium && (
                <View style={[styles.tagBadge, { backgroundColor: `${colors.purple}20` }]}>
                  <Text style={[styles.tagText, { color: colors.purple }]}>Premium</Text>
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
                onPress={() => toggleStoreFeatured(item)}
              >
                <Ionicons
                  name={item.isFeatured ? 'star' : 'star-outline'}
                  size={18}
                  color={item.isFeatured ? colors.warning : colors.icon}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => toggleStorePremium(item)}
              >
                <Ionicons
                  name={isPremium ? 'diamond' : 'diamond-outline'}
                  size={18}
                  color={isPremium ? colors.purple : colors.muted}
                />
              </TouchableOpacity>
              <Switch
                value={isMall}
                onValueChange={() => toggleStoreMall(item)}
                trackColor={{ false: colors.border, true: colors.success }}
                thumbColor={colors.card}
              />
            </>
          )}
        </View>
      </View>
    );
  };

  const renderManagedStores = () => (
    <View style={{ flex: 1 }}>
      <View style={styles.searchRow}>
        <View style={[styles.searchInput, { backgroundColor: colors.card, flex: 1 }]}>
          <Ionicons name="search" size={18} color={colors.icon} />
          <TextInput
            style={[styles.searchText, { color: colors.text }]}
            placeholder="Search stores..."
            placeholderTextColor={colors.icon}
            value={managedStoresSearch}
            onChangeText={setManagedStoresSearch}
            onSubmitEditing={() => loadManagedStores(managedStoresSearch)}
          />
        </View>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.tint }]}
          onPress={() => loadManagedStores(managedStoresSearch)}
        >
          <Ionicons name="search" size={22} color={colors.card} />
        </TouchableOpacity>
      </View>

      {/* Filter Chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
        {(['all', 'mall', 'non-mall'] as const).map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[
              styles.filterChip,
              managedStoresFilter === filter
                ? { backgroundColor: colors.tint }
                : { backgroundColor: colors.card },
            ]}
            onPress={() => setManagedStoresFilter(filter)}
          >
            <Text
              style={[
                styles.filterChipText,
                { color: managedStoresFilter === filter ? colors.card : colors.icon },
              ]}
            >
              {filter === 'all' ? 'All Stores' : filter === 'mall' ? 'In Mall' : 'Not in Mall'}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={[styles.sectionCount, { color: colors.icon, paddingHorizontal: 16, paddingBottom: 8 }]}>
        {managedStores.filter(s => s.deliveryCategories?.mall).length} mall stores of {managedStores.length} total
      </Text>

      <FlatList
        data={managedStores}
        renderItem={renderManagedStoreItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={() => loadManagedStores()} tintColor={colors.tint} />
        }
        ListEmptyComponent={
          managedStoresLoading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color={colors.tint} />
            </View>
          ) : (
            <View style={styles.centerContainer}>
              <Ionicons name="business-outline" size={48} color={colors.icon} />
              <Text style={[styles.emptyText, { color: colors.icon }]}>No stores found</Text>
              <Text style={[styles.emptyText, { color: colors.icon, fontSize: 13 }]}>
                Toggle stores into the mall to show them on the Mall tab
              </Text>
            </View>
          )
        }
      />
    </View>
  );

  // Banners Tab
  const renderBannerItem = ({ item }: { item: MallBanner }) => {
    const isProcessing = processingBanner === item._id;
    const isExpired = new Date(item.validUntil) < new Date();
    const daysLeft = Math.ceil((new Date(item.validUntil).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

    return (
      <View style={[styles.listItem, { backgroundColor: colors.card }]}>
        <View style={styles.listItemRow}>
          {item.image ? (
            <Image source={{ uri: item.image }} style={[styles.listItemImage, { width: 60, height: 36, borderRadius: 6 }]} />
          ) : (
            <View style={[styles.listItemImageFallback, { backgroundColor: item.backgroundColor || colors.pink, width: 60, height: 36, borderRadius: 6 }]}>
              <Ionicons name="image" size={18} color={colors.card} />
            </View>
          )}
          <View style={styles.listItemInfo}>
            <Text style={[styles.listItemName, { color: colors.text }]} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={[styles.listItemSub, { color: colors.icon }]}>
              {item.position} | Priority: {item.priority} | {item.ctaAction}
            </Text>
            <View style={styles.listItemTags}>
              <View style={[styles.statusDot, {
                backgroundColor: isExpired ? colors.icon : item.isActive ? colors.success : colors.error
              }]} />
              <Text style={[styles.listItemSubSmall, { color: colors.icon }]}>
                {isExpired ? 'Expired' : item.isActive ? 'Active' : 'Inactive'}
              </Text>
              {!isExpired && daysLeft <= 30 && (
                <View style={[styles.tagBadge, { backgroundColor: `${colors.warning}20` }]}>
                  <Text style={[styles.tagText, { color: colors.warning }]}>{daysLeft}d left</Text>
                </View>
              )}
              {isExpired && (
                <View style={[styles.tagBadge, { backgroundColor: `${colors.error}20` }]}>
                  <Text style={[styles.tagText, { color: colors.error }]}>Expired</Text>
                </View>
              )}
              {item.badge && (
                <View style={[styles.tagBadge, { backgroundColor: `${colors.tint}15` }]}>
                  <Text style={[styles.tagText, { color: colors.tint }]}>{item.badge}</Text>
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
                onPress={() => toggleBannerActive(item)}
              >
                <Ionicons
                  name={item.isActive ? 'eye' : 'eye-off'}
                  size={18}
                  color={item.isActive ? colors.success : colors.error}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => openBannerForm(item)}
              >
                <Ionicons name="create-outline" size={18} color={colors.tint} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => deleteBanner(item)}
              >
                <Ionicons name="trash-outline" size={18} color={colors.error} />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  };

  const renderBanners = () => {
    const activeBanners = banners.filter(b => b.isActive && new Date(b.validUntil) >= new Date());
    const expiredBanners = banners.filter(b => new Date(b.validUntil) < new Date());

    return (
      <View style={{ flex: 1 }}>
        <View style={styles.searchRow}>
          <Text style={[styles.sectionCount, { color: colors.icon }]}>
            {banners.length} banners ({activeBanners.length} active, {expiredBanners.length} expired)
          </Text>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: colors.tint }]}
            onPress={() => openBannerForm()}
          >
            <Ionicons name="add" size={22} color={colors.card} />
          </TouchableOpacity>
        </View>
        <FlatList
          data={banners}
          renderItem={renderBannerItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={false} onRefresh={loadBanners} tintColor={colors.tint} />
          }
          ListEmptyComponent={
            bannersLoading ? (
              <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={colors.tint} />
              </View>
            ) : (
              <View style={styles.centerContainer}>
                <Ionicons name="image-outline" size={48} color={colors.icon} />
                <Text style={[styles.emptyText, { color: colors.icon }]}>No banners</Text>
                <Text style={[styles.emptyText, { color: colors.icon, fontSize: 13 }]}>
                  Create banners to show on the Mall homepage
                </Text>
              </View>
            )
          }
        />
      </View>
    );
  };

  // Collections Tab
  const renderCollectionItem = ({ item }: { item: MallCollection }) => {
    const isProcessing = processingCollection === item._id;
    return (
      <View style={[styles.listItem, { backgroundColor: colors.card }]}>
        <View style={styles.listItemRow}>
          {item.image ? (
            <Image source={{ uri: item.image }} style={styles.listItemImage} />
          ) : (
            <View style={[styles.listItemImageFallback, { backgroundColor: colors.cyan }]}>
              <Ionicons name="albums" size={20} color={colors.card} />
            </View>
          )}
          <View style={styles.listItemInfo}>
            <Text style={[styles.listItemName, { color: colors.text }]} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={[styles.listItemSub, { color: colors.icon }]}>
              {item.slug} | {item.type} | Order: {item.sortOrder}
            </Text>
            <View style={styles.listItemTags}>
              <View style={[styles.statusDot, { backgroundColor: item.isActive ? colors.success : colors.error }]} />
              <Text style={[styles.listItemSubSmall, { color: colors.icon }]}>
                {item.isActive ? 'Active' : 'Inactive'}
              </Text>
              <View style={[styles.tagBadge, { backgroundColor: `${colors.cyan}20` }]}>
                <Text style={[styles.tagText, { color: colors.cyan }]}>{item.type}</Text>
              </View>
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
                onPress={() => toggleCollectionActive(item)}
              >
                <Ionicons
                  name={item.isActive ? 'eye' : 'eye-off'}
                  size={18}
                  color={item.isActive ? colors.success : colors.error}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => openCollectionForm(item)}
              >
                <Ionicons name="create-outline" size={18} color={colors.tint} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => deleteCollection(item)}
              >
                <Ionicons name="trash-outline" size={18} color={colors.error} />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  };

  const renderCollections = () => (
    <View style={{ flex: 1 }}>
      <View style={styles.searchRow}>
        <Text style={[styles.sectionCount, { color: colors.icon }]}>
          {collections.length} collections
        </Text>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.tint }]}
          onPress={() => openCollectionForm()}
        >
          <Ionicons name="add" size={22} color={colors.card} />
        </TouchableOpacity>
      </View>
      <FlatList
        data={collections}
        renderItem={renderCollectionItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={loadCollections} tintColor={colors.tint} />
        }
        ListEmptyComponent={
          collectionsLoading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color={colors.tint} />
            </View>
          ) : (
            <View style={styles.centerContainer}>
              <Ionicons name="albums-outline" size={48} color={colors.icon} />
              <Text style={[styles.emptyText, { color: colors.icon }]}>No collections</Text>
              <Text style={[styles.emptyText, { color: colors.icon, fontSize: 13 }]}>
                Create curated collections to display on the Mall tab
              </Text>
            </View>
          )
        }
      />
    </View>
  );

  // Alliance Tab
  const renderAllianceItem = ({ item }: { item: AllianceStore }) => {
    const isAlliance = !!item.deliveryCategories?.alliance;
    const isProcessing = processingAlliance === item._id;
    return (
      <View style={[styles.listItem, { backgroundColor: colors.card }]}>
        <View style={styles.listItemRow}>
          {item.logo ? (
            <Image source={{ uri: item.logo }} style={styles.listItemImage} />
          ) : (
            <View style={[styles.listItemImageFallback, { backgroundColor: colors.navy }]}>
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
              {item.isVerified && (
                <View style={[styles.smallBadge, { backgroundColor: `${colors.success}20` }]}>
                  <Text style={[styles.smallBadgeText, { color: colors.success }]}>Verified</Text>
                </View>
              )}
            </View>
            <Text style={[styles.listItemSub, { color: colors.icon }]}>
              {item.category?.name || 'Uncategorized'} | {item.ratings?.average?.toFixed(1) || '0'} rating
            </Text>
            <View style={styles.listItemTags}>
              <View style={[styles.statusDot, { backgroundColor: isAlliance ? colors.success : colors.icon }]} />
              <Text style={[styles.listItemSubSmall, { color: colors.icon }]}>
                {isAlliance ? 'Alliance' : 'Not Alliance'}
              </Text>
              {item.tags?.slice(0, 2).map((tag, i) => (
                <View key={i} style={[styles.tagBadge, { backgroundColor: `${colors.tint}15` }]}>
                  <Text style={[styles.tagText, { color: colors.tint }]}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
        <View style={styles.listItemActions}>
          {isProcessing ? (
            <ActivityIndicator size="small" color={colors.tint} />
          ) : (
            <Switch
              value={isAlliance}
              onValueChange={() => toggleAlliance(item)}
              trackColor={{ false: colors.border, true: colors.success }}
              thumbColor={colors.card}
            />
          )}
        </View>
      </View>
    );
  };

  const renderAlliance = () => (
    <View style={{ flex: 1 }}>
      <View style={styles.searchRow}>
        <View style={[styles.searchInput, { backgroundColor: colors.card, flex: 1 }]}>
          <Ionicons name="search" size={18} color={colors.icon} />
          <TextInput
            style={[styles.searchText, { color: colors.text }]}
            placeholder="Search mall stores..."
            placeholderTextColor={colors.icon}
            value={allianceSearch}
            onChangeText={setAllianceSearch}
            onSubmitEditing={() => loadAllianceStores(allianceSearch)}
          />
        </View>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.tint }]}
          onPress={() => loadAllianceStores(allianceSearch)}
        >
          <Ionicons name="search" size={22} color={colors.card} />
        </TouchableOpacity>
      </View>
      <Text style={[styles.sectionCount, { color: colors.icon, paddingHorizontal: 16, paddingBottom: 8 }]}>
        {allianceStores.filter(s => s.deliveryCategories?.alliance).length} alliance stores of {allianceStores.length} mall stores
      </Text>
      <FlatList
        data={allianceStores}
        renderItem={renderAllianceItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={() => loadAllianceStores()} tintColor={colors.tint} />
        }
        ListEmptyComponent={
          allianceLoading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color={colors.tint} />
            </View>
          ) : (
            <View style={styles.centerContainer}>
              <Ionicons name="people-outline" size={48} color={colors.icon} />
              <Text style={[styles.emptyText, { color: colors.icon }]}>No mall stores found</Text>
              <Text style={[styles.emptyText, { color: colors.icon, fontSize: 13 }]}>Search for stores to add to alliance</Text>
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
        trackColor={{ false: colors.border, true: colors.tint }}
        thumbColor={colors.card}
      />
    </View>
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
          {renderFormField('Description', categoryForm.description, (v) => setCategoryForm(p => ({ ...p, description: v })), { multiline: true })}
          {renderFormField('Icon (emoji)', categoryForm.icon, (v) => setCategoryForm(p => ({ ...p, icon: v })))}
          {renderFormField('Image URL', categoryForm.image, (v) => setCategoryForm(p => ({ ...p, image: v })), { placeholder: 'Category image URL' })}
          {renderFormField('Color', categoryForm.color, (v) => setCategoryForm(p => ({ ...p, color: v })), { placeholder: colors.navy })}
          {renderFormField('Background Color', categoryForm.backgroundColor, (v) => setCategoryForm(p => ({ ...p, backgroundColor: v })), { placeholder: 'Optional background color' })}
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
          {renderFormField('Description', offerForm.description, (v) => setOfferForm(p => ({ ...p, description: v })), { multiline: true })}
          {renderFormField('Image URL', offerForm.image, (v) => setOfferForm(p => ({ ...p, image: v })))}

          <Text style={[styles.formLabel, { color: colors.text, marginTop: 8, marginBottom: 4, fontSize: 13, fontWeight: '700' }]}>Link to Store OR Brand (one required)</Text>
          {renderFormField('Store ID', offerForm.store, (v) => setOfferForm(p => ({ ...p, store: v, brand: v ? '' : p.brand })), { placeholder: 'MongoDB ObjectId of store' })}
          {renderFormField('Brand ID', offerForm.brand, (v) => setOfferForm(p => ({ ...p, brand: v, store: v ? '' : p.store })), { placeholder: 'MongoDB ObjectId of brand (if no store)' })}

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
                  <Text style={{ color: offerForm.offerType === t ? colors.card : colors.icon, fontSize: 12, fontWeight: '600' }}>
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
                  <Text style={{ color: offerForm.valueType === t ? colors.card : colors.icon, fontSize: 12, fontWeight: '600' }}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {renderFormField('Min Purchase Amount', offerForm.minPurchase, (v) => setOfferForm(p => ({ ...p, minPurchase: v })), { placeholder: 'e.g. 100' })}
          {renderFormField('Max Discount Amount', offerForm.maxDiscount, (v) => setOfferForm(p => ({ ...p, maxDiscount: v })), { placeholder: 'e.g. 500' })}

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
                  <Text style={{ color: offerForm.badge === t ? colors.card : colors.icon, fontSize: 10, fontWeight: '600' }}>
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

  const renderBannerModal = () => (
    <Modal visible={showBannerModal} animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { backgroundColor: colors.card }]}>
          <TouchableOpacity onPress={() => setShowBannerModal(false)}>
            <Text style={[styles.modalCancel, { color: colors.tint }]}>Cancel</Text>
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: colors.text }]}>
            {editingBanner ? 'Edit Banner' : 'New Banner'}
          </Text>
          <TouchableOpacity onPress={saveBanner}>
            <Text style={[styles.modalSave, { color: colors.tint }]}>Save</Text>
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={styles.modalContent}>
          {renderFormField('Title *', bannerForm.title, (v) => setBannerForm(p => ({ ...p, title: v })))}
          {renderFormField('Subtitle', bannerForm.subtitle, (v) => setBannerForm(p => ({ ...p, subtitle: v })))}
          {renderFormField('Image URL *', bannerForm.image, (v) => setBannerForm(p => ({ ...p, image: v })))}
          {renderFormField('Background Color', bannerForm.backgroundColor, (v) => setBannerForm(p => ({ ...p, backgroundColor: v })), { placeholder: colors.emerald })}
          {renderFormField('Text Color', bannerForm.textColor, (v) => setBannerForm(p => ({ ...p, textColor: v })), { placeholder: colors.card })}
          {renderFormField('CTA Text', bannerForm.ctaText, (v) => setBannerForm(p => ({ ...p, ctaText: v })), { placeholder: 'Shop Now' })}

          <View style={styles.formField}>
            <Text style={[styles.formLabel, { color: colors.text }]}>CTA Action</Text>
            <View style={styles.tierRow}>
              {['navigate', 'external', 'brand', 'category', 'collection'].map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[
                    styles.tierBtn,
                    bannerForm.ctaAction === t
                      ? { backgroundColor: colors.tint }
                      : { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
                  ]}
                  onPress={() => setBannerForm(p => ({ ...p, ctaAction: t }))}
                >
                  <Text style={{ color: bannerForm.ctaAction === t ? colors.card : colors.icon, fontSize: 10, fontWeight: '600' }}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {(bannerForm.ctaAction === 'navigate' || bannerForm.ctaAction === 'external') &&
            renderFormField('CTA URL', bannerForm.ctaUrl, (v) => setBannerForm(p => ({ ...p, ctaUrl: v })), { placeholder: 'URL or deep link route' })}
          {bannerForm.ctaAction === 'brand' &&
            renderFormField('Target Brand/Store ID *', bannerForm.ctaBrand, (v) => setBannerForm(p => ({ ...p, ctaBrand: v })), { placeholder: 'MongoDB ObjectId of the brand or store' })}
          {bannerForm.ctaAction === 'category' &&
            renderFormField('Target Category ID *', bannerForm.ctaCategory, (v) => setBannerForm(p => ({ ...p, ctaCategory: v })), { placeholder: 'MongoDB ObjectId of the category' })}
          {bannerForm.ctaAction === 'collection' &&
            renderFormField('Target Collection ID *', bannerForm.ctaCollection, (v) => setBannerForm(p => ({ ...p, ctaCollection: v })), { placeholder: 'MongoDB ObjectId of the collection' })}

          <View style={styles.formField}>
            <Text style={[styles.formLabel, { color: colors.text }]}>Position</Text>
            <View style={styles.tierRow}>
              {['hero', 'inline', 'footer'].map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[
                    styles.tierBtn,
                    bannerForm.position === t
                      ? { backgroundColor: colors.tint }
                      : { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
                  ]}
                  onPress={() => setBannerForm(p => ({ ...p, position: t }))}
                >
                  <Text style={{ color: bannerForm.position === t ? colors.card : colors.icon, fontSize: 12, fontWeight: '600' }}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {renderFormField('Priority', bannerForm.priority, (v) => setBannerForm(p => ({ ...p, priority: v })), { placeholder: '0' })}
          {renderFormField('Valid From (YYYY-MM-DD)', bannerForm.validFrom, (v) => setBannerForm(p => ({ ...p, validFrom: v })))}
          {renderFormField('Valid Until (YYYY-MM-DD)', bannerForm.validUntil, (v) => setBannerForm(p => ({ ...p, validUntil: v })))}
          {renderFormField('Badge', bannerForm.badge, (v) => setBannerForm(p => ({ ...p, badge: v })), { placeholder: 'e.g. NEW, SALE' })}
          {renderSwitchField('Active', bannerForm.isActive, (v) => setBannerForm(p => ({ ...p, isActive: v })))}
        </ScrollView>
      </View>
    </Modal>
  );

  const renderCollectionModal = () => (
    <Modal visible={showCollectionModal} animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { backgroundColor: colors.card }]}>
          <TouchableOpacity onPress={() => setShowCollectionModal(false)}>
            <Text style={[styles.modalCancel, { color: colors.tint }]}>Cancel</Text>
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: colors.text }]}>
            {editingCollection ? 'Edit Collection' : 'New Collection'}
          </Text>
          <TouchableOpacity onPress={saveCollection}>
            <Text style={[styles.modalSave, { color: colors.tint }]}>Save</Text>
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={styles.modalContent}>
          {renderFormField('Name *', collectionForm.name, (v) => setCollectionForm(p => ({ ...p, name: v })))}
          {renderFormField('Slug', collectionForm.slug, (v) => setCollectionForm(p => ({ ...p, slug: v })), { placeholder: 'auto-generated from name' })}
          {renderFormField('Description', collectionForm.description, (v) => setCollectionForm(p => ({ ...p, description: v })), { multiline: true })}
          {renderFormField('Image URL *', collectionForm.image, (v) => setCollectionForm(p => ({ ...p, image: v })))}

          <View style={styles.formField}>
            <Text style={[styles.formLabel, { color: colors.text }]}>Type</Text>
            <View style={styles.tierRow}>
              {['curated', 'seasonal', 'trending', 'personalized'].map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[
                    styles.tierBtn,
                    collectionForm.type === t
                      ? { backgroundColor: colors.tint }
                      : { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
                  ]}
                  onPress={() => setCollectionForm(p => ({ ...p, type: t }))}
                >
                  <Text style={{ color: collectionForm.type === t ? colors.card : colors.icon, fontSize: 11, fontWeight: '600' }}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {renderFormField('Sort Order', collectionForm.sortOrder, (v) => setCollectionForm(p => ({ ...p, sortOrder: v })))}
          {renderFormField('Valid From (YYYY-MM-DD)', collectionForm.validFrom, (v) => setCollectionForm(p => ({ ...p, validFrom: v })), { placeholder: 'Optional - leave empty for always valid' })}
          {renderFormField('Valid Until (YYYY-MM-DD)', collectionForm.validUntil, (v) => setCollectionForm(p => ({ ...p, validUntil: v })), { placeholder: 'Optional - leave empty for always valid' })}
          {renderSwitchField('Active', collectionForm.isActive, (v) => setCollectionForm(p => ({ ...p, isActive: v })))}
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
          Manage stores, brands, offers, banners & collections
        </Text>
      </View>

      {/* Tabs */}
      {renderTabs()}

      {/* Content */}
      <View style={{ flex: 1 }}>
        {activeTab === 'dashboard' && <MallDashboard colors={colors} onNavigate={(tab) => setActiveTab(tab as TabType)} />}
        {activeTab === 'stores' && renderManagedStores()}
        {activeTab === 'brands' && <MallBrandsList colors={colors} />}
        {activeTab === 'categories' && renderCategories()}
        {activeTab === 'offers' && renderOffers()}
        {activeTab === 'banners' && renderBanners()}
        {activeTab === 'collections' && renderCollections()}
        {activeTab === 'alliance' && renderAlliance()}
      </View>

      {/* Modals */}
      {renderCategoryModal()}
      {renderOfferModal()}
      {renderBannerModal()}
      {renderCollectionModal()}
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
    borderBottomColor: Colors.light.border,
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
    paddingVertical: 10,
    maxHeight: 54,
  },
  tabBarContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
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
    backgroundColor: Colors.light.background,
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
    color: Colors.light.card,
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
    borderBottomColor: Colors.light.border,
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
