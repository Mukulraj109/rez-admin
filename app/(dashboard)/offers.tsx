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
  Image,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  offersService,
  Offer,
  OfferStats,
  Store,
  CreateOfferRequest,
} from '../../services/api/offers';
import { Colors } from '../../constants/Colors';
import { showAlert, showConfirm } from '../../utils/alert';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const isWeb = SCREEN_WIDTH > 768;
const MAX_CONTENT_WIDTH = 900;

// Constants
const EXCLUSIVE_ZONES = [
  { value: '', label: 'No Zone (General)' },
  { value: 'student', label: 'Student' },
  { value: 'corporate', label: 'Corporate' },
  { value: 'women', label: 'Women' },
  { value: 'birthday', label: 'Birthday' },
  { value: 'senior', label: 'Senior' },
  { value: 'defence', label: 'Defence' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'teacher', label: 'Teacher' },
  { value: 'government', label: 'Government' },
  { value: 'differently-abled', label: 'Differently Abled' },
  { value: 'first-time', label: 'First-time' },
];

const CATEGORIES = [
  { value: 'general', label: 'General' },
  { value: 'food', label: 'Food' },
  { value: 'grocery', label: 'Grocery' },
  { value: 'fashion', label: 'Fashion' },
  { value: 'electronics', label: 'Electronics' },
  { value: 'beauty', label: 'Beauty' },
  { value: 'wellness', label: 'Wellness' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'mega', label: 'Mega' },
  { value: 'student', label: 'Student' },
  { value: 'new_arrival', label: 'New' },
  { value: 'trending', label: 'Trending' },
];

const OFFER_TYPES = [
  { value: 'cashback', label: 'Cashback' },
  { value: 'discount', label: 'Discount' },
  { value: 'voucher', label: 'Voucher' },
  { value: 'combo', label: 'Combo' },
  { value: 'special', label: 'Special' },
  { value: 'walk_in', label: 'Walk-in' },
];

const FILTER_ZONES = [
  { value: '', label: 'All', icon: 'apps' },
  { value: 'all-exclusive', label: 'Exclusive', icon: 'star' },
  { value: 'none', label: 'General', icon: 'grid' },
  { value: 'student', label: 'Student', icon: 'school' },
  { value: 'corporate', label: 'Corporate', icon: 'briefcase' },
  { value: 'women', label: 'Women', icon: 'female' },
  { value: 'birthday', label: 'Birthday', icon: 'gift' },
  { value: 'senior', label: 'Senior', icon: 'people' },
  { value: 'defence', label: 'Defence', icon: 'shield' },
];

const DEFAULT_FORM: Partial<CreateOfferRequest> = {
  title: '',
  subtitle: '',
  description: '',
  image: '',
  category: 'general',
  type: 'cashback',
  cashbackPercentage: 10,
  storeId: '',
  exclusiveZone: '',
  eligibilityRequirement: '',
  validity: {
    startDate: new Date(),
    endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    isActive: true,
  },
  metadata: {
    priority: 0,
    tags: [],
    isNew: false,
    isTrending: false,
    featured: false,
  },
  isFreeDelivery: false,
};

const PAGE_SIZE = 50;

export default function OffersScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';

  // State
  const [offers, setOffers] = useState<Offer[]>([]);
  const [stats, setStats] = useState<OfferStats | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterZone, setFilterZone] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [showPendingOnly, setShowPendingOnly] = useState(false);

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [formData, setFormData] = useState<Partial<CreateOfferRequest>>(DEFAULT_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [tagsInput, setTagsInput] = useState('');

  // Selector states
  const [showStoreSelector, setShowStoreSelector] = useState(false);
  const [showCategorySelector, setShowCategorySelector] = useState(false);
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [showZoneSelector, setShowZoneSelector] = useState(false);

  // Fetch data
  const fetchData = useCallback(async (page = 1) => {
    try {
      setIsLoading(true);

      const [offersData, statsData, storesData] = await Promise.all([
        showPendingOnly
          ? offersService.getPendingOffers(page, PAGE_SIZE)
          : offersService.getOffers({
              page,
              limit: PAGE_SIZE,
              exclusiveZone: filterZone || undefined,
              search: searchQuery || undefined,
            }),
        page === 1 ? offersService.getStats() : Promise.resolve(null),
        stores.length === 0 ? offersService.getStores() : Promise.resolve(null),
      ]);

      setOffers(offersData.offers);
      setCurrentPage(page);
      setTotalPages(offersData.pagination.totalPages);
      setTotalItems(offersData.pagination.total);

      if (statsData) setStats(statsData);
      if (storesData) setStores(storesData);
    } catch (error: any) {
      console.error('Fetch error:', error);
      showAlert('Error', error.message || 'Failed to load offers');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [filterZone, searchQuery, stores.length, showPendingOnly]);

  useEffect(() => {
    fetchData(1);
  }, [filterZone, showPendingOnly]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData(1);
  }, [fetchData]);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages && !isLoading) {
      fetchData(page);
    }
  };

  // Modal handlers
  const openCreateModal = () => {
    setEditingOffer(null);
    setFormData({ ...DEFAULT_FORM, storeId: stores[0]?._id || '' });
    setTagsInput('');
    setShowModal(true);
  };

  const openEditModal = (offer: Offer) => {
    setEditingOffer(offer);
    setFormData({
      title: offer.title,
      subtitle: offer.subtitle || '',
      description: offer.description || '',
      image: offer.image,
      category: offer.category,
      type: offer.type,
      cashbackPercentage: offer.cashbackPercentage,
      storeId: offer.store.id,
      exclusiveZone: offer.exclusiveZone || '',
      eligibilityRequirement: offer.eligibilityRequirement || '',
      validity: {
        startDate: new Date(offer.validity.startDate),
        endDate: new Date(offer.validity.endDate),
        isActive: offer.validity.isActive,
      },
      metadata: {
        priority: offer.metadata?.priority || 0,
        tags: offer.metadata?.tags || [],
        isNew: offer.metadata?.isNew || false,
        isTrending: offer.metadata?.isTrending || false,
        featured: offer.metadata?.featured || false,
      },
      isFreeDelivery: offer.isFreeDelivery || false,
    });
    setTagsInput(offer.metadata?.tags?.join(', ') || '');
    setShowModal(true);
  };

  const saveOffer = async () => {
    if (!formData.title || !formData.image || !formData.storeId) {
      showAlert('Validation Error', 'Please fill in title, image URL, and select a store');
      return;
    }

    try {
      setIsSaving(true);
      const submitData: CreateOfferRequest = {
        title: formData.title!,
        subtitle: formData.subtitle,
        description: formData.description,
        image: formData.image!,
        category: formData.category || 'general',
        type: formData.type || 'cashback',
        cashbackPercentage: formData.cashbackPercentage || 0,
        storeId: formData.storeId!,
        exclusiveZone: formData.exclusiveZone || null,
        eligibilityRequirement: formData.eligibilityRequirement,
        validity: {
          startDate: formData.validity?.startDate || new Date(),
          endDate: formData.validity?.endDate || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          isActive: formData.validity?.isActive ?? true,
        },
        metadata: {
          priority: formData.metadata?.priority || 0,
          tags: tagsInput.split(',').map(t => t.trim()).filter(Boolean),
          isNew: formData.metadata?.isNew || false,
          isTrending: formData.metadata?.isTrending || false,
          featured: formData.metadata?.featured || false,
        },
        isFreeDelivery: formData.isFreeDelivery || false,
      };

      if (editingOffer) {
        await offersService.updateOffer(editingOffer._id, submitData);
        showAlert('Success', 'Offer updated successfully');
      } else {
        await offersService.createOffer(submitData);
        showAlert('Success', 'Offer created successfully');
      }

      setShowModal(false);
      fetchData(1);
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to save offer');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleOffer = async (offer: Offer) => {
    try {
      const result = await offersService.toggleOffer(offer._id);
      setOffers(prev =>
        prev.map(o =>
          o._id === offer._id
            ? { ...o, validity: { ...o.validity, isActive: result.isActive } }
            : o
        )
      );
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to toggle offer');
    }
  };

  const deleteOffer = (offer: Offer) => {
    showConfirm(
      'Delete Offer',
      `Are you sure you want to delete "${offer.title}"?`,
      async () => {
        try {
          await offersService.deleteOffer(offer._id);
          setOffers(prev => prev.filter(o => o._id !== offer._id));
          showAlert('Success', 'Offer deleted successfully');
        } catch (error: any) {
          showAlert('Error', error.message || 'Failed to delete offer');
        }
      },
      'Delete'
    );
  };

  // Approve/Reject handlers
  const approveOffer = async (offer: Offer) => {
    try {
      const updated = await offersService.approveOffer(offer._id);
      setOffers(prev =>
        prev.map(o => (o._id === offer._id ? { ...o, adminApproved: true } : o))
      );
      showAlert('Approved', `"${offer.title}" has been approved`);
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to approve offer');
    }
  };

  const rejectOffer = (offer: Offer) => {
    showConfirm(
      'Reject Offer',
      `Are you sure you want to reject "${offer.title}"? It will not be visible to users.`,
      async () => {
        try {
          await offersService.rejectOffer(offer._id, 'Rejected by admin');
          if (showPendingOnly) {
            setOffers(prev => prev.filter(o => o._id !== offer._id));
          } else {
            setOffers(prev =>
              prev.map(o => (o._id === offer._id ? { ...o, adminApproved: false } : o))
            );
          }
          showAlert('Rejected', `"${offer.title}" has been rejected`);
        } catch (error: any) {
          showAlert('Error', error.message || 'Failed to reject offer');
        }
      },
      'Reject'
    );
  };

  // Get labels
  const getStoreLabel = () => stores.find(s => s._id === formData.storeId)?.name || 'Select store...';
  const getCategoryLabel = () => CATEGORIES.find(c => c.value === formData.category)?.label || 'Select...';
  const getTypeLabel = () => OFFER_TYPES.find(t => t.value === formData.type)?.label || 'Select...';
  const getZoneLabel = () => EXCLUSIVE_ZONES.find(z => z.value === formData.exclusiveZone)?.label || 'No Zone';

  // Render offer card
  const renderOfferCard = ({ item }: { item: Offer }) => {
    const isExpired = new Date(item.validity.endDate) < new Date();

    return (
      <View style={[styles.offerCard, { backgroundColor: colors.card, shadowColor: isDark ? '#000' : '#888' }]}>
        <View style={styles.offerCardContent}>
          <Image
            source={{ uri: item.image }}
            style={styles.offerImage}
          />
          <View style={styles.offerDetails}>
            <Text style={[styles.offerTitle, { color: colors.text }]} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={[styles.offerStore, { color: colors.textSecondary }]} numberOfLines={1}>
              {item.store.name}
            </Text>
            <View style={styles.badgeRow}>
              <View style={[styles.badge, { backgroundColor: '#10B981' }]}>
                <Text style={styles.badgeText}>{item.cashbackPercentage}%</Text>
              </View>
              {item.exclusiveZone && (
                <View style={[styles.badge, { backgroundColor: '#8B5CF6' }]}>
                  <Text style={styles.badgeText}>{item.exclusiveZone}</Text>
                </View>
              )}
              {isExpired && (
                <View style={[styles.badge, { backgroundColor: '#EF4444' }]}>
                  <Text style={styles.badgeText}>Expired</Text>
                </View>
              )}
              {item.adminApproved === false && (
                <View style={[styles.badge, { backgroundColor: '#F59E0B' }]}>
                  <Text style={styles.badgeText}>Pending</Text>
                </View>
              )}
              {item.adminApproved === true && (
                <View style={[styles.badge, { backgroundColor: '#059669' }]}>
                  <Text style={styles.badgeText}>Approved</Text>
                </View>
              )}
            </View>
          </View>
          <Switch
            value={item.validity.isActive}
            onValueChange={() => toggleOffer(item)}
            trackColor={{ false: '#D1D5DB', true: '#10B981' }}
            thumbColor="#fff"
            style={styles.switch}
          />
        </View>
        <View style={[styles.offerActions, { borderTopColor: isDark ? '#374151' : '#E5E7EB' }]}>
          {item.adminApproved !== true && (
            <>
              <TouchableOpacity style={styles.actionButton} onPress={() => approveOffer(item)}>
                <Ionicons name="checkmark-circle-outline" size={16} color="#10B981" />
                <Text style={[styles.actionText, { color: '#10B981' }]}>Approve</Text>
              </TouchableOpacity>
              <View style={[styles.actionDivider, { backgroundColor: isDark ? '#374151' : '#E5E7EB' }]} />
              <TouchableOpacity style={styles.actionButton} onPress={() => rejectOffer(item)}>
                <Ionicons name="close-circle-outline" size={16} color="#F59E0B" />
                <Text style={[styles.actionText, { color: '#F59E0B' }]}>Reject</Text>
              </TouchableOpacity>
              <View style={[styles.actionDivider, { backgroundColor: isDark ? '#374151' : '#E5E7EB' }]} />
            </>
          )}
          <TouchableOpacity style={styles.actionButton} onPress={() => openEditModal(item)}>
            <Ionicons name="pencil-outline" size={16} color="#3B82F6" />
            <Text style={[styles.actionText, { color: '#3B82F6' }]}>Edit</Text>
          </TouchableOpacity>
          <View style={[styles.actionDivider, { backgroundColor: isDark ? '#374151' : '#E5E7EB' }]} />
          <TouchableOpacity style={styles.actionButton} onPress={() => deleteOffer(item)}>
            <Ionicons name="trash-outline" size={16} color="#EF4444" />
            <Text style={[styles.actionText, { color: '#EF4444' }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Render selector modal
  const renderSelector = (
    visible: boolean,
    onClose: () => void,
    title: string,
    options: { value: string; label: string }[],
    selectedValue: string,
    onSelect: (value: string) => void
  ) => (
    <Modal visible={visible} transparent animationType="fade">
      <TouchableOpacity style={styles.selectorOverlay} activeOpacity={1} onPress={onClose}>
        <View style={[styles.selectorBox, { backgroundColor: colors.card }]}>
          <Text style={[styles.selectorTitle, { color: colors.text }]}>{title}</Text>
          <ScrollView style={styles.selectorList} showsVerticalScrollIndicator={false}>
            {options.map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.selectorOption,
                  selectedValue === opt.value && { backgroundColor: colors.primary + '15' },
                ]}
                onPress={() => { onSelect(opt.value); onClose(); }}
              >
                <Text style={[
                  styles.selectorOptionText,
                  { color: selectedValue === opt.value ? colors.primary : colors.text },
                ]}>
                  {opt.label}
                </Text>
                {selectedValue === opt.value && (
                  <Ionicons name="checkmark" size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#111827' : '#F3F4F6' }]}>
      <View style={styles.contentWrapper}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.card }]}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Offers</Text>
          <TouchableOpacity style={styles.addButton} onPress={openCreateModal}>
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.addButtonText}>Add Offer</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Row */}
        {stats && (
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.statNumber, { color: '#111827' }]}>{stats.total}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.statNumber, { color: '#10B981' }]}>{stats.active}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Active</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.statNumber, { color: '#F59E0B' }]}>{stats.inactive}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Inactive</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.statNumber, { color: '#EF4444' }]}>{stats.expired}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Expired</Text>
            </View>
          </View>
        )}

        {/* Search */}
        <View style={[styles.searchBox, { backgroundColor: colors.card, borderWidth: 1, borderColor: isDark ? '#374151' : '#E5E7EB' }]}>
          <Ionicons name="search" size={20} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search offers..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>

      {/* Filter Chips */}
      <View style={styles.filterWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContent}
        >
          <TouchableOpacity
            style={[
              styles.filterChip,
              {
                backgroundColor: showPendingOnly ? '#F59E0B' : colors.card,
                borderWidth: 1,
                borderColor: showPendingOnly ? '#F59E0B' : (isDark ? '#374151' : '#E5E7EB'),
              },
            ]}
            onPress={() => setShowPendingOnly(!showPendingOnly)}
          >
            <Ionicons
              name="time"
              size={14}
              color={showPendingOnly ? '#fff' : colors.textSecondary}
            />
            <Text style={[
              styles.filterChipText,
              { color: showPendingOnly ? '#fff' : colors.text },
            ]}>
              Pending Approval
            </Text>
          </TouchableOpacity>
          {FILTER_ZONES.map(zone => {
            const isSelected = filterZone === zone.value;
            return (
              <TouchableOpacity
                key={zone.value}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: isSelected ? '#10B981' : colors.card,
                    borderWidth: 1,
                    borderColor: isSelected ? '#10B981' : (isDark ? '#374151' : '#E5E7EB'),
                  },
                ]}
                onPress={() => setFilterZone(zone.value)}
              >
                <Ionicons
                  name={zone.icon as any}
                  size={14}
                  color={isSelected ? '#fff' : colors.textSecondary}
                />
                <Text style={[
                  styles.filterChipText,
                  { color: isSelected ? '#fff' : colors.text },
                ]}>
                  {zone.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Offers List */}
      {isLoading && offers.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading offers...</Text>
        </View>
      ) : (
        <FlatList
          data={offers}
          keyExtractor={item => item._id}
          renderItem={renderOfferCard}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="pricetag-outline" size={64} color={colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No offers found</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                {searchQuery || filterZone ? 'Try adjusting your filters' : 'Create your first offer to get started'}
              </Text>
              <TouchableOpacity style={styles.emptyButton} onPress={openCreateModal}>
                <Text style={styles.emptyButtonText}>Create Offer</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* Fixed Pagination Bar */}
      {totalPages > 0 && offers.length > 0 && (
        <View style={[styles.paginationBar, { backgroundColor: colors.card, borderTopColor: isDark ? '#374151' : '#E5E7EB' }]}>
          <TouchableOpacity
            style={[
              styles.paginationButton,
              currentPage === 1 && styles.paginationButtonDisabled,
            ]}
            onPress={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1 || isLoading}
          >
            <Ionicons name="chevron-back" size={18} color={currentPage === 1 ? '#9CA3AF' : colors.primary} />
            <Text style={[styles.paginationButtonText, { color: currentPage === 1 ? '#9CA3AF' : colors.primary }]}>
              Prev
            </Text>
          </TouchableOpacity>

          <View style={styles.paginationCenter}>
            <Text style={[styles.paginationPage, { color: colors.text }]}>
              Page {currentPage} of {totalPages}
            </Text>
            <Text style={[styles.paginationTotal, { color: colors.textSecondary }]}>
              {totalItems} offers
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.paginationButton,
              currentPage === totalPages && styles.paginationButtonDisabled,
            ]}
            onPress={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages || isLoading}
          >
            <Text style={[styles.paginationButtonText, { color: currentPage === totalPages ? '#9CA3AF' : colors.primary }]}>
              Next
            </Text>
            <Ionicons name="chevron-forward" size={18} color={currentPage === totalPages ? '#9CA3AF' : colors.primary} />
          </TouchableOpacity>
        </View>
      )}
      </View>

      {/* Create/Edit Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={[styles.modalHeader, { borderBottomColor: isDark ? '#374151' : '#E5E7EB' }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {editingOffer ? 'Edit Offer' : 'Create Offer'}
              </Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Title *</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: isDark ? '#1F2937' : '#F9FAFB', color: colors.text, borderColor: isDark ? '#374151' : '#E5E7EB' }]}
                value={formData.title}
                onChangeText={text => setFormData(p => ({ ...p, title: text }))}
                placeholder="Enter offer title"
                placeholderTextColor={colors.textSecondary}
              />

              <Text style={[styles.inputLabel, { color: colors.text }]}>Image URL *</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: isDark ? '#1F2937' : '#F9FAFB', color: colors.text, borderColor: isDark ? '#374151' : '#E5E7EB' }]}
                value={formData.image}
                onChangeText={text => setFormData(p => ({ ...p, image: text }))}
                placeholder="https://example.com/image.jpg"
                placeholderTextColor={colors.textSecondary}
              />

              <Text style={[styles.inputLabel, { color: colors.text }]}>Store *</Text>
              <TouchableOpacity
                style={[styles.selectInput, { backgroundColor: isDark ? '#1F2937' : '#F9FAFB', borderColor: isDark ? '#374151' : '#E5E7EB' }]}
                onPress={() => setShowStoreSelector(true)}
              >
                <Text style={[styles.selectText, { color: formData.storeId ? colors.text : colors.textSecondary }]}>
                  {getStoreLabel()}
                </Text>
                <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
              </TouchableOpacity>

              <View style={styles.rowInputs}>
                <View style={styles.halfInput}>
                  <Text style={[styles.inputLabel, { color: colors.text }]}>Category</Text>
                  <TouchableOpacity
                    style={[styles.selectInput, { backgroundColor: isDark ? '#1F2937' : '#F9FAFB', borderColor: isDark ? '#374151' : '#E5E7EB' }]}
                    onPress={() => setShowCategorySelector(true)}
                  >
                    <Text style={[styles.selectText, { color: colors.text }]}>{getCategoryLabel()}</Text>
                    <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
                <View style={styles.halfInput}>
                  <Text style={[styles.inputLabel, { color: colors.text }]}>Type</Text>
                  <TouchableOpacity
                    style={[styles.selectInput, { backgroundColor: isDark ? '#1F2937' : '#F9FAFB', borderColor: isDark ? '#374151' : '#E5E7EB' }]}
                    onPress={() => setShowTypeSelector(true)}
                  >
                    <Text style={[styles.selectText, { color: colors.text }]}>{getTypeLabel()}</Text>
                    <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>

              <Text style={[styles.inputLabel, { color: colors.text }]}>Discount/Cashback %</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: isDark ? '#1F2937' : '#F9FAFB', color: colors.text, borderColor: isDark ? '#374151' : '#E5E7EB' }]}
                value={String(formData.cashbackPercentage || '')}
                onChangeText={text => setFormData(p => ({ ...p, cashbackPercentage: Number(text) || 0 }))}
                placeholder="10"
                keyboardType="numeric"
                placeholderTextColor={colors.textSecondary}
              />

              <Text style={[styles.inputLabel, { color: colors.text }]}>Exclusive Zone</Text>
              <TouchableOpacity
                style={[styles.selectInput, { backgroundColor: isDark ? '#1F2937' : '#F9FAFB', borderColor: isDark ? '#374151' : '#E5E7EB' }]}
                onPress={() => setShowZoneSelector(true)}
              >
                <Text style={[styles.selectText, { color: colors.text }]}>{getZoneLabel()}</Text>
                <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
              </TouchableOpacity>

              {formData.exclusiveZone && (
                <>
                  <Text style={[styles.inputLabel, { color: colors.text }]}>Eligibility Requirement</Text>
                  <TextInput
                    style={[styles.textInput, { backgroundColor: isDark ? '#1F2937' : '#F9FAFB', color: colors.text, borderColor: isDark ? '#374151' : '#E5E7EB' }]}
                    value={formData.eligibilityRequirement}
                    onChangeText={text => setFormData(p => ({ ...p, eligibilityRequirement: text }))}
                    placeholder="e.g., Must be a verified student"
                    placeholderTextColor={colors.textSecondary}
                  />
                </>
              )}

              <Text style={[styles.inputLabel, { color: colors.text }]}>Subtitle</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: isDark ? '#1F2937' : '#F9FAFB', color: colors.text, borderColor: isDark ? '#374151' : '#E5E7EB' }]}
                value={formData.subtitle}
                onChangeText={text => setFormData(p => ({ ...p, subtitle: text }))}
                placeholder="Optional short description"
                placeholderTextColor={colors.textSecondary}
              />

              <Text style={[styles.inputLabel, { color: colors.text }]}>Tags (comma separated)</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: isDark ? '#1F2937' : '#F9FAFB', color: colors.text, borderColor: isDark ? '#374151' : '#E5E7EB' }]}
                value={tagsInput}
                onChangeText={setTagsInput}
                placeholder="food, discount, student"
                placeholderTextColor={colors.textSecondary}
              />

              <View style={styles.togglesContainer}>
                <View style={styles.toggleRow}>
                  <Text style={[styles.toggleLabel, { color: colors.text }]}>Active</Text>
                  <Switch
                    value={formData.validity?.isActive}
                    onValueChange={v => setFormData(p => ({ ...p, validity: { ...p.validity!, isActive: v } }))}
                    trackColor={{ false: '#D1D5DB', true: '#10B981' }}
                  />
                </View>
                <View style={styles.toggleRow}>
                  <Text style={[styles.toggleLabel, { color: colors.text }]}>Free Delivery</Text>
                  <Switch
                    value={formData.isFreeDelivery}
                    onValueChange={v => setFormData(p => ({ ...p, isFreeDelivery: v }))}
                    trackColor={{ false: '#D1D5DB', true: '#10B981' }}
                  />
                </View>
                <View style={styles.toggleRow}>
                  <Text style={[styles.toggleLabel, { color: colors.text }]}>Mark as New</Text>
                  <Switch
                    value={formData.metadata?.isNew}
                    onValueChange={v => setFormData(p => ({ ...p, metadata: { ...p.metadata!, isNew: v } }))}
                    trackColor={{ false: '#D1D5DB', true: '#10B981' }}
                  />
                </View>
                <View style={styles.toggleRow}>
                  <Text style={[styles.toggleLabel, { color: colors.text }]}>Trending</Text>
                  <Switch
                    value={formData.metadata?.isTrending}
                    onValueChange={v => setFormData(p => ({ ...p, metadata: { ...p.metadata!, isTrending: v } }))}
                    trackColor={{ false: '#D1D5DB', true: '#10B981' }}
                  />
                </View>
              </View>

              <View style={{ height: 24 }} />
            </ScrollView>

            <View style={[styles.modalFooter, { borderTopColor: isDark ? '#374151' : '#E5E7EB' }]}>
              <TouchableOpacity
                style={[styles.cancelButton, { borderColor: isDark ? '#374151' : '#E5E7EB' }]}
                onPress={() => setShowModal(false)}
              >
                <Text style={[styles.cancelButtonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, { opacity: isSaving ? 0.7 : 1 }]}
                onPress={saveOffer}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>{editingOffer ? 'Update' : 'Create'}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Selector Modals */}
      {renderSelector(showStoreSelector, () => setShowStoreSelector(false), 'Select Store',
        stores.map(s => ({ value: s._id, label: s.name })), formData.storeId || '',
        v => setFormData(p => ({ ...p, storeId: v })))}
      {renderSelector(showCategorySelector, () => setShowCategorySelector(false), 'Select Category',
        CATEGORIES, formData.category || 'general', v => setFormData(p => ({ ...p, category: v })))}
      {renderSelector(showTypeSelector, () => setShowTypeSelector(false), 'Select Offer Type',
        OFFER_TYPES, formData.type || 'cashback', v => setFormData(p => ({ ...p, type: v })))}
      {renderSelector(showZoneSelector, () => setShowZoneSelector(false), 'Select Exclusive Zone',
        EXCLUSIVE_ZONES, formData.exclusiveZone || '', v => setFormData(p => ({ ...p, exclusiveZone: v })))}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentWrapper: {
    flex: 1,
    ...(isWeb && {
      maxWidth: MAX_CONTENT_WIDTH,
      width: '100%',
      alignSelf: 'center',
    }),
  },
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  // Stats
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 12,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statNumber: {
    fontSize: 26,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 11,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '500',
  },
  // Search
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
    outlineStyle: 'none',
  },
  // Filters
  filterWrapper: {
    height: 60,
    marginTop: 12,
  },
  filterContent: {
    paddingHorizontal: 16,
    alignItems: 'center',
    height: 60,
    gap: 10,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 24,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  // List
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  // Offer Card
  offerCard: {
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    overflow: 'hidden',
  },
  offerCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 16,
  },
  offerImage: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
  },
  offerDetails: {
    flex: 1,
  },
  offerTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  offerStore: {
    fontSize: 14,
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  switch: {
    transform: [{ scale: 1 }],
  },
  offerActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  actionDivider: {
    width: 1,
  },
  // Empty
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  emptyButton: {
    marginTop: 20,
    backgroundColor: '#10B981',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  emptyButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  // Pagination
  paginationBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  paginationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 4,
  },
  paginationButtonDisabled: {
    opacity: 0.5,
  },
  paginationButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  paginationCenter: {
    alignItems: 'center',
  },
  paginationPage: {
    fontSize: 14,
    fontWeight: '600',
  },
  paginationTotal: {
    fontSize: 12,
    marginTop: 2,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 6,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  selectInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  selectText: {
    fontSize: 15,
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  togglesContainer: {
    marginTop: 16,
    gap: 4,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  toggleLabel: {
    fontSize: 14,
  },
  cancelButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#10B981',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  // Selector
  selectorOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  selectorBox: {
    width: '100%',
    maxHeight: '70%',
    borderRadius: 16,
    padding: 20,
  },
  selectorTitle: {
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
  },
  selectorList: {
    maxHeight: 380,
  },
  selectorOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 4,
  },
  selectorOptionText: {
    fontSize: 15,
  },
});
