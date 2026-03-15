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
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { showAlert, showConfirm } from '../../utils/alert';
import {
  adminEventsService,
  AdminEvent,
  EventCategory,
  EventStats,
  EventStatus,
  EventRequest,
  EventsQuery,
  EventBooking,
  EventAnalytics,
} from '../../services/api/events';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type TabType = 'all' | 'published' | 'draft' | 'cancelled' | 'completed';
type FilterType = 'featured' | 'free' | 'paid' | 'online' | 'venue';

const TABS: { key: TabType; label: string; icon: string }[] = [
  { key: 'all', label: 'All', icon: 'albums' },
  { key: 'published', label: 'Published', icon: 'checkmark-circle' },
  { key: 'draft', label: 'Draft', icon: 'document-text' },
  { key: 'cancelled', label: 'Cancelled', icon: 'close-circle' },
  { key: 'completed', label: 'Completed', icon: 'flag' },
];

const FILTER_CHIPS: { key: FilterType; label: string; icon: string }[] = [
  { key: 'featured', label: 'Featured', icon: 'star' },
  { key: 'free', label: 'Free', icon: 'gift' },
  { key: 'paid', label: 'Paid', icon: 'card' },
  { key: 'online', label: 'Online', icon: 'globe' },
  { key: 'venue', label: 'Venue', icon: 'location' },
];

const STATUS_OPTIONS: { value: EventStatus; label: string; color: string }[] = [
  { value: 'draft', label: 'Draft', color: Colors.light.mutedDark },
  { value: 'published', label: 'Published', color: Colors.light.success },
  { value: 'cancelled', label: 'Cancelled', color: Colors.light.error },
  { value: 'completed', label: 'Completed', color: Colors.light.info },
];

const DEFAULT_FORM_DATA: Partial<EventRequest> = {
  title: '',
  description: '',
  shortDescription: '',
  categoryId: '',
  image: '',
  date: new Date().toISOString(),
  endDate: '',
  time: '',
  endTime: '',
  location: { name: '', address: '', city: '' },
  isOnline: false,
  onlineLink: '',
  price: 0,
  isFree: true,
  slots: { total: 100 },
  status: 'draft',
  isFeatured: false,
  featuredPriority: 0,
  tags: [],
};

export default function EventsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  // Data states
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [stats, setStats] = useState<EventStats | null>(null);
  const [categories, setCategories] = useState<EventCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Filter states
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<Set<FilterType>>(new Set());

  // Modal states
  const [showFormModal, setShowFormModal] = useState(false);
  const [showBookingsModal, setShowBookingsModal] = useState(false);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<AdminEvent | null>(null);
  const [formData, setFormData] = useState<Partial<EventRequest>>(DEFAULT_FORM_DATA);
  const [isSaving, setIsSaving] = useState(false);

  // Bookings/Analytics states
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [bookings, setBookings] = useState<EventBooking[]>([]);
  const [analytics, setAnalytics] = useState<EventAnalytics | null>(null);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // Date picker states
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  // ==========================================
  // DATA LOADING
  // ==========================================

  useEffect(() => {
    loadData();
  }, [activeTab, searchQuery, activeFilters]);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadData = async (pageNum: number = 1, append: boolean = false) => {
    try {
      if (!append) setIsLoading(true);

      const query: EventsQuery = { page: pageNum, limit: 20 };

      if (searchQuery) query.search = searchQuery;
      if (activeTab !== 'all') query.status = activeTab as EventStatus;
      if (activeFilters.has('featured')) query.featured = true;
      if (activeFilters.has('free')) query.isFree = true;
      if (activeFilters.has('paid')) query.isFree = false;
      if (activeFilters.has('online')) query.isOnline = true;
      if (activeFilters.has('venue')) query.isOnline = false;

      const data = await adminEventsService.getEvents(query);

      if (append) {
        setEvents(prev => [...prev, ...data.events]);
      } else {
        setEvents(data.events);
      }

      if (data.stats) {
        setStats(data.stats);
      }

      setHasMore(data.pagination.page < data.pagination.totalPages);
      setPage(pageNum);
    } catch (error: any) {
      console.error('Failed to load events:', error);
      showAlert('Error', error.message || 'Failed to load events');
    } finally {
      setIsLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const data = await adminEventsService.getCategories();
      setCategories(data);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadData(1), loadCategories()]);
    setRefreshing(false);
  }, [activeTab, searchQuery, activeFilters]);

  const loadMore = () => {
    if (!isLoading && hasMore) {
      loadData(page + 1, true);
    }
  };

  // ==========================================
  // EVENT ACTIONS
  // ==========================================

  const handleCreateNew = () => {
    setEditingEvent(null);
    setFormData({ ...DEFAULT_FORM_DATA });
    setShowFormModal(true);
  };

  const handleEdit = (event: AdminEvent) => {
    setEditingEvent(event);
    // Backend may return 'featured' or 'isFeatured', and price as nested object or flat
    const priceAmount = typeof event.price === 'object' ? (event.price as any)?.amount : event.price;
    const isFree = typeof event.price === 'object' ? (event.price as any)?.isFree : event.isFree;
    setFormData({
      title: event.title,
      description: event.description || '',
      shortDescription: event.shortDescription || '',
      categoryId: typeof event.category === 'object' ? event.category?._id : event.categoryId || '',
      image: event.image || '',
      date: event.date,
      endDate: event.endDate || '',
      time: event.time || '',
      endTime: event.endTime || '',
      location: event.location || { name: '', address: '', city: '' },
      isOnline: event.isOnline,
      onlineLink: event.onlineLink || '',
      price: priceAmount || 0,
      isFree: isFree ?? true,
      slots: event.slots ? { total: event.slots.total } : { total: 100 },
      status: event.status,
      isFeatured: event.isFeatured ?? (event as any).featured ?? false,
      featuredPriority: event.featuredPriority || (event as any).priority || 0,
      tags: event.tags || [],
    });
    setShowFormModal(true);
  };

  const handleSave = async () => {
    if (!formData.title?.trim()) {
      showAlert('Error', 'Event title is required');
      return;
    }

    if (!formData.date) {
      showAlert('Error', 'Event date is required');
      return;
    }

    setIsSaving(true);
    try {
      // Map frontend form field names to backend field names
      const payload: any = { ...formData };
      // Backend uses 'featured' and 'priority', not 'isFeatured' and 'featuredPriority'
      if (payload.isFeatured !== undefined) {
        payload.featured = payload.isFeatured;
        delete payload.isFeatured;
      }
      if (payload.featuredPriority !== undefined) {
        payload.priority = payload.featuredPriority;
        delete payload.featuredPriority;
      }
      // Backend price is nested { amount, currency, isFree }
      if (payload.price !== undefined || payload.isFree !== undefined) {
        payload.price = {
          amount: payload.price || 0,
          currency: payload.currency || 'AED',
          isFree: payload.isFree !== false,
        };
        delete payload.isFree;
        delete payload.currency;
      }
      // Map slots
      if (payload.slots) {
        payload.maxCapacity = payload.slots.total;
      }

      if (editingEvent) {
        await adminEventsService.updateEvent(editingEvent._id, payload);
        showAlert('Success', 'Event updated successfully');
      } else {
        await adminEventsService.createEvent(payload as EventRequest);
        showAlert('Success', 'Event created successfully');
      }
      setShowFormModal(false);
      await loadData(1);
    } catch (error: any) {
      showAlert('Error', error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (event: AdminEvent) => {
    showConfirm(
      'Delete Event',
      `Are you sure you want to delete "${event.title}"? This cannot be undone.`,
      async () => {
        try {
          await adminEventsService.deleteEvent(event._id);
          showAlert('Success', 'Event deleted');
          await loadData(1);
        } catch (error: any) {
          showAlert('Error', error.message);
        }
      },
      'Delete'
    );
  };

  const handleToggleStatus = async (event: AdminEvent) => {
    const nextStatus: EventStatus = event.status === 'published' ? 'draft' : 'published';
    try {
      await adminEventsService.updateEventStatus(event._id, nextStatus);
      await loadData(1);
    } catch (error: any) {
      showAlert('Error', error.message);
    }
  };

  const handleToggleFeatured = async (event: AdminEvent) => {
    try {
      const currentFeatured = event.isFeatured ?? (event as any).featured ?? false;
      await adminEventsService.toggleFeatured(event._id, !currentFeatured);
      await loadData(1);
    } catch (error: any) {
      showAlert('Error', error.message);
    }
  };

  const handleViewBookings = async (eventId: string) => {
    setSelectedEventId(eventId);
    setBookingsLoading(true);
    setShowBookingsModal(true);
    try {
      const data = await adminEventsService.getEventBookings(eventId);
      setBookings(data.bookings);
    } catch (error: any) {
      showAlert('Error', error.message);
    } finally {
      setBookingsLoading(false);
    }
  };

  const handleViewAnalytics = async (eventId: string) => {
    setSelectedEventId(eventId);
    setAnalyticsLoading(true);
    setShowAnalyticsModal(true);
    try {
      const data = await adminEventsService.getEventAnalytics(eventId);
      setAnalytics(data);
    } catch (error: any) {
      showAlert('Error', error.message);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const toggleFilter = (filter: FilterType) => {
    setActiveFilters(prev => {
      const next = new Set(prev);
      // Mutually exclusive filters
      if (filter === 'free' && next.has('paid')) next.delete('paid');
      if (filter === 'paid' && next.has('free')) next.delete('free');
      if (filter === 'online' && next.has('venue')) next.delete('venue');
      if (filter === 'venue' && next.has('online')) next.delete('online');

      if (next.has(filter)) {
        next.delete(filter);
      } else {
        next.add(filter);
      }
      return next;
    });
  };

  // ==========================================
  // HELPERS
  // ==========================================

  const getStatusBadge = (status: EventStatus) => {
    const map: Record<EventStatus, { text: string; color: string; icon: string }> = {
      draft: { text: 'Draft', color: colors.mutedDark, icon: 'document-text' },
      published: { text: 'Published', color: colors.success, icon: 'checkmark-circle' },
      cancelled: { text: 'Cancelled', color: colors.error, icon: 'close-circle' },
      completed: { text: 'Completed', color: colors.info, icon: 'flag' },
    };
    return map[status] || map.draft;
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const formatPrice = (price: any, isFree: boolean) => {
    // price can be a number or nested { amount, isFree, currency }
    if (typeof price === 'object' && price !== null) {
      if (price.isFree || price.amount === 0) return 'Free';
      return `${price.currency || '$'}${(price.amount || 0).toFixed(2)}`;
    }
    if (isFree || price === 0) return 'Free';
    return `$${(price || 0).toFixed(2)}`;
  };

  const getCategoryName = (event: AdminEvent): string => {
    if (typeof event.category === 'object' && event.category?.name) {
      return event.category.name;
    }
    const cat = categories.find(c => c._id === event.categoryId);
    return cat?.name || 'Uncategorized';
  };

  // Normalize backend event fields to what the UI expects
  const getIsFeatured = (event: AdminEvent): boolean => {
    return event.isFeatured ?? (event as any).featured ?? false;
  };

  const getBookingCount = (event: AdminEvent): number => {
    return event.bookingCount || (event as any).analytics?.bookings || 0;
  };

  const getIsFree = (event: AdminEvent): boolean => {
    if (typeof event.price === 'object' && event.price !== null) {
      return (event.price as any).isFree ?? false;
    }
    return event.isFree ?? false;
  };

  // ==========================================
  // RENDER SECTIONS
  // ==========================================

  const renderHeader = () => (
    <View style={styles.header}>
      <View>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Events Management</Text>
        <Text style={[styles.headerSubtitle, { color: colors.icon }]}>
          Manage events, bookings & analytics
        </Text>
      </View>
      <TouchableOpacity
        style={[styles.createBtn, { backgroundColor: colors.tint }]}
        onPress={handleCreateNew}
      >
        <Ionicons name="add" size={20} color={colors.card} />
        <Text style={styles.createBtnText}>Create Event</Text>
      </TouchableOpacity>
    </View>
  );

  const renderStatsCards = () => (
    <View style={styles.statsRow}>
      {[
        { label: 'Total', value: stats?.total || 0, color: colors.text, icon: 'calendar' },
        { label: 'Active', value: stats?.active || 0, color: colors.success, icon: 'checkmark-circle' },
        { label: 'Featured', value: stats?.featured || 0, color: colors.warning, icon: 'star' },
        { label: 'Bookings', value: stats?.totalBookings || 0, color: colors.info, icon: 'ticket' },
      ].map((item, index) => (
        <View key={index} style={[styles.statItem, { backgroundColor: colors.card }]}>
          <Ionicons name={item.icon as any} size={20} color={item.color} style={{ marginBottom: 4 }} />
          <Text style={[styles.statValue, { color: item.color }]}>{item.value}</Text>
          <Text style={[styles.statLabel, { color: colors.icon }]}>{item.label}</Text>
        </View>
      ))}
    </View>
  );

  const renderTabs = () => (
    <View style={styles.tabsWrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsContent}
      >
        {TABS.map(tab => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tabItem,
                { backgroundColor: isActive ? colors.tint : colors.card },
              ]}
              onPress={() => {
                setActiveTab(tab.key);
                setIsLoading(true);
              }}
            >
              <Ionicons
                name={tab.icon as any}
                size={16}
                color={isActive ? colors.card : colors.icon}
              />
              <Text style={[styles.tabLabel, { color: isActive ? colors.card : colors.icon }]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  const renderSearchAndFilters = () => (
    <View style={styles.searchFilterContainer}>
      <View style={[styles.searchBox, { backgroundColor: colors.card }]}>
        <Ionicons name="search" size={18} color={colors.icon} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search events..."
          placeholderTextColor={colors.icon}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color={colors.icon} />
          </TouchableOpacity>
        )}
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterChipsRow}
      >
        {FILTER_CHIPS.map(chip => {
          const isActive = activeFilters.has(chip.key);
          return (
            <TouchableOpacity
              key={chip.key}
              style={[
                styles.filterChip,
                { borderColor: isActive ? colors.tint : colors.border },
                isActive && { backgroundColor: `${colors.tint}15` },
              ]}
              onPress={() => toggleFilter(chip.key)}
            >
              <Ionicons
                name={chip.icon as any}
                size={14}
                color={isActive ? colors.tint : colors.icon}
              />
              <Text style={[styles.filterChipText, { color: isActive ? colors.tint : colors.icon }]}>
                {chip.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  const renderEventCard = ({ item }: { item: AdminEvent }) => {
    const statusBadge = getStatusBadge(item.status);
    const itemIsFeatured = getIsFeatured(item);
    const itemBookingCount = getBookingCount(item);
    const itemIsFree = getIsFree(item);

    return (
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        {/* Image + Status */}
        <View style={styles.cardImageRow}>
          {item.image ? (
            <Image source={{ uri: item.image }} style={styles.cardImage} resizeMode="cover" />
          ) : (
            <View style={[styles.cardImagePlaceholder, { backgroundColor: colors.border }]}>
              <Ionicons name="calendar-outline" size={28} color={colors.icon} />
            </View>
          )}
          <View style={styles.cardBadgesCol}>
            <View style={[styles.statusChip, { backgroundColor: `${statusBadge.color}15` }]}>
              <Ionicons name={statusBadge.icon as any} size={12} color={statusBadge.color} />
              <Text style={[styles.statusLabel, { color: statusBadge.color }]}>{statusBadge.text}</Text>
            </View>
            {itemIsFeatured && (
              <View style={[styles.featuredChip, { backgroundColor: `${colors.warning}15` }]}>
                <Ionicons name="star" size={12} color={colors.warning} />
                <Text style={[styles.featuredLabel, { color: colors.warning }]}>Featured</Text>
              </View>
            )}
          </View>
        </View>

        {/* Title & Category */}
        <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={[styles.cardCategory, { color: colors.tint }]} numberOfLines={1}>
          {getCategoryName(item)}
        </Text>

        {/* Meta Row */}
        <View style={styles.metaRow}>
          <View style={styles.metaChip}>
            <Ionicons name="calendar-outline" size={12} color={colors.icon} />
            <Text style={[styles.metaText, { color: colors.icon }]}>{formatDate(item.date)}</Text>
          </View>
          <View style={styles.metaChip}>
            <Ionicons name="pricetag-outline" size={12} color={colors.icon} />
            <Text style={[styles.metaText, { color: colors.icon }]}>{formatPrice(item.price, itemIsFree)}</Text>
          </View>
          <View style={styles.metaChip}>
            <Ionicons name={item.isOnline ? 'globe-outline' : 'location-outline'} size={12} color={colors.icon} />
            <Text style={[styles.metaText, { color: colors.icon }]}>{item.isOnline ? 'Online' : 'Venue'}</Text>
          </View>
        </View>

        {/* Booking & Slots Info */}
        <View style={[styles.bookingRow, { borderTopColor: colors.border }]}>
          <View style={styles.bookingInfo}>
            <Ionicons name="ticket-outline" size={12} color={colors.icon} />
            <Text style={[styles.bookingText, { color: colors.icon }]}>
              {itemBookingCount} bookings
            </Text>
          </View>
          {item.slots && (
            <Text style={[styles.slotsText, { color: colors.icon }]}>
              {item.slots.available}/{item.slots.total} slots
            </Text>
          )}
        </View>

        {/* Action Row */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionIconBtn, { backgroundColor: `${colors.info}10` }]}
            onPress={() => handleEdit(item)}
          >
            <Ionicons name="pencil" size={16} color={colors.info} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionIconBtn, { backgroundColor: `${colors.warning}10` }]}
            onPress={() => handleToggleFeatured(item)}
          >
            <Ionicons
              name={itemIsFeatured ? 'star' : 'star-outline'}
              size={16}
              color={colors.warning}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.actionIconBtn,
              { backgroundColor: item.status === 'published' ? `${colors.success}15` : `${colors.mutedDark}15` },
            ]}
            onPress={() => handleToggleStatus(item)}
          >
            <Ionicons
              name={item.status === 'published' ? 'eye-off' : 'eye'}
              size={16}
              color={item.status === 'published' ? colors.success : colors.mutedDark}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionIconBtn, { backgroundColor: `${colors.purple}10` }]}
            onPress={() => handleViewBookings(item._id)}
          >
            <Ionicons name="ticket" size={16} color={colors.purple} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionIconBtn, { backgroundColor: `${colors.cyan}10` }]}
            onPress={() => handleViewAnalytics(item._id)}
          >
            <Ionicons name="analytics" size={16} color="#06B6D4" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionIconBtn, { backgroundColor: `${colors.error}10` }]}
            onPress={() => handleDelete(item)}
          >
            <Ionicons name="trash" size={16} color={colors.error} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="calendar-outline" size={48} color={colors.icon} />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>No Events Found</Text>
      <Text style={[styles.emptyText, { color: colors.icon }]}>
        {searchQuery ? 'Try adjusting your search or filters' : 'Create your first event to get started'}
      </Text>
      {!searchQuery && (
        <TouchableOpacity
          style={[styles.emptyBtn, { backgroundColor: colors.tint }]}
          onPress={handleCreateNew}
        >
          <Ionicons name="add" size={18} color={colors.card} />
          <Text style={styles.emptyBtnText}>Create Event</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // ==========================================
  // FORM MODAL
  // ==========================================

  const renderFormModal = () => (
    <Modal visible={showFormModal} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => setShowFormModal(false)} style={styles.modalCloseBtn}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: colors.text }]}>
            {editingEvent ? 'Edit Event' : 'Create Event'}
          </Text>
          <TouchableOpacity
            style={[styles.modalSaveBtn, { backgroundColor: colors.tint }]}
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={colors.card} />
            ) : (
              <Text style={styles.modalSaveBtnText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.modalBody}
          contentContainerStyle={styles.modalBodyContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Title */}
          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.text }]}>Title *</Text>
            <TextInput
              style={[styles.formInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
              value={formData.title || ''}
              onChangeText={text => setFormData(p => ({ ...p, title: text }))}
              placeholder="Event title"
              placeholderTextColor={colors.icon}
            />
          </View>

          {/* Short Description */}
          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.text }]}>Short Description</Text>
            <TextInput
              style={[styles.formInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
              value={formData.shortDescription || ''}
              onChangeText={text => setFormData(p => ({ ...p, shortDescription: text }))}
              placeholder="Brief event summary"
              placeholderTextColor={colors.icon}
            />
          </View>

          {/* Description */}
          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.text }]}>Description</Text>
            <TextInput
              style={[styles.formInput, styles.multilineInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
              value={formData.description || ''}
              onChangeText={text => setFormData(p => ({ ...p, description: text }))}
              placeholder="Full event description..."
              placeholderTextColor={colors.icon}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* Category */}
          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.text }]}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              <TouchableOpacity
                style={[
                  styles.chipOption,
                  { borderColor: colors.border },
                  !formData.categoryId && { backgroundColor: colors.tint, borderColor: colors.tint },
                ]}
                onPress={() => setFormData(p => ({ ...p, categoryId: '' }))}
              >
                <Text style={[styles.chipOptionText, { color: !formData.categoryId ? colors.card : colors.text }]}>
                  None
                </Text>
              </TouchableOpacity>
              {categories.map(cat => (
                <TouchableOpacity
                  key={cat._id}
                  style={[
                    styles.chipOption,
                    { borderColor: colors.border },
                    formData.categoryId === cat._id && { backgroundColor: colors.tint, borderColor: colors.tint },
                  ]}
                  onPress={() => setFormData(p => ({ ...p, categoryId: cat._id }))}
                >
                  <Text
                    style={[
                      styles.chipOptionText,
                      { color: formData.categoryId === cat._id ? colors.card : colors.text },
                    ]}
                  >
                    {cat.icon ? `${cat.icon} ` : ''}{cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Date & Time */}
          <View style={[styles.formSection, { borderColor: colors.border }]}>
            <View style={styles.formSectionHeader}>
              <Ionicons name="calendar" size={18} color={colors.tint} />
              <Text style={[styles.formSectionTitle, { color: colors.text }]}>Date & Time</Text>
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Start Date *</Text>
                {Platform.OS === 'web' ? (
                  <View>
                    <input
                      type="date"
                      value={formData.date ? new Date(formData.date).toISOString().split('T')[0] : ''}
                      onChange={(e: any) => {
                        setFormData(p => ({ ...p, date: new Date(e.target.value).toISOString() }));
                      }}
                      style={{
                        padding: 12,
                        fontSize: 14,
                        borderRadius: 10,
                        border: `1px solid ${colors.border}`,
                        backgroundColor: colors.card,
                        color: colors.text,
                        width: '100%',
                        outline: 'none',
                        fontFamily: 'inherit',
                        cursor: 'pointer',
                      }}
                    />
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[styles.formInput, { backgroundColor: colors.card, borderColor: colors.border, justifyContent: 'center' }]}
                    onPress={() => setShowDatePicker(true)}
                  >
                    <Text style={{ color: formData.date ? colors.text : colors.icon }}>
                      {formData.date ? formatDate(formData.date) : 'Select date'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={[styles.formLabel, { color: colors.text }]}>End Date</Text>
                {Platform.OS === 'web' ? (
                  <View>
                    <input
                      type="date"
                      value={formData.endDate ? new Date(formData.endDate).toISOString().split('T')[0] : ''}
                      onChange={(e: any) => {
                        setFormData(p => ({ ...p, endDate: new Date(e.target.value).toISOString() }));
                      }}
                      style={{
                        padding: 12,
                        fontSize: 14,
                        borderRadius: 10,
                        border: `1px solid ${colors.border}`,
                        backgroundColor: colors.card,
                        color: colors.text,
                        width: '100%',
                        outline: 'none',
                        fontFamily: 'inherit',
                        cursor: 'pointer',
                      }}
                    />
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[styles.formInput, { backgroundColor: colors.card, borderColor: colors.border, justifyContent: 'center' }]}
                    onPress={() => setShowEndDatePicker(true)}
                  >
                    <Text style={{ color: formData.endDate ? colors.text : colors.icon }}>
                      {formData.endDate ? formatDate(formData.endDate) : 'Select date'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Start Time</Text>
                {Platform.OS === 'web' ? (
                  <View>
                    <input
                      type="time"
                      value={formData.time || ''}
                      onChange={(e: any) => {
                        setFormData(p => ({ ...p, time: e.target.value }));
                      }}
                      style={{
                        padding: 12,
                        fontSize: 14,
                        borderRadius: 10,
                        border: `1px solid ${colors.border}`,
                        backgroundColor: colors.card,
                        color: colors.text,
                        width: '100%',
                        outline: 'none',
                        fontFamily: 'inherit',
                        cursor: 'pointer',
                      }}
                    />
                  </View>
                ) : (
                  <TextInput
                    style={[styles.formInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                    value={formData.time || ''}
                    onChangeText={text => setFormData(p => ({ ...p, time: text }))}
                    placeholder="e.g. 10:00 AM"
                    placeholderTextColor={colors.icon}
                  />
                )}
              </View>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={[styles.formLabel, { color: colors.text }]}>End Time</Text>
                {Platform.OS === 'web' ? (
                  <View>
                    <input
                      type="time"
                      value={formData.endTime || ''}
                      onChange={(e: any) => {
                        setFormData(p => ({ ...p, endTime: e.target.value }));
                      }}
                      style={{
                        padding: 12,
                        fontSize: 14,
                        borderRadius: 10,
                        border: `1px solid ${colors.border}`,
                        backgroundColor: colors.card,
                        color: colors.text,
                        width: '100%',
                        outline: 'none',
                        fontFamily: 'inherit',
                        cursor: 'pointer',
                      }}
                    />
                  </View>
                ) : (
                  <TextInput
                    style={[styles.formInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                    value={formData.endTime || ''}
                    onChangeText={text => setFormData(p => ({ ...p, endTime: text }))}
                    placeholder="e.g. 5:00 PM"
                    placeholderTextColor={colors.icon}
                  />
                )}
              </View>
            </View>
          </View>

          {/* Location */}
          <View style={[styles.formSection, { borderColor: colors.border }]}>
            <View style={styles.formSectionHeader}>
              <Ionicons name="location" size={18} color={colors.tint} />
              <Text style={[styles.formSectionTitle, { color: colors.text }]}>Location</Text>
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Online Event</Text>
                <View style={[styles.switchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.switchLabel, { color: colors.icon }]}>
                    {formData.isOnline ? 'Yes' : 'No'}
                  </Text>
                  <Switch
                    value={formData.isOnline || false}
                    onValueChange={val => setFormData(p => ({ ...p, isOnline: val }))}
                    trackColor={{ true: colors.tint }}
                  />
                </View>
              </View>
            </View>

            {formData.isOnline ? (
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Online Link</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                  value={formData.onlineLink || ''}
                  onChangeText={text => setFormData(p => ({ ...p, onlineLink: text }))}
                  placeholder="https://meet.google.com/..."
                  placeholderTextColor={colors.icon}
                />
              </View>
            ) : (
              <>
                <View style={styles.formGroup}>
                  <Text style={[styles.formLabel, { color: colors.text }]}>Venue Name</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                    value={formData.location?.name || ''}
                    onChangeText={text => setFormData(p => ({ ...p, location: { ...p.location, name: text } }))}
                    placeholder="e.g. Convention Center"
                    placeholderTextColor={colors.icon}
                  />
                </View>
                <View style={styles.formGroup}>
                  <Text style={[styles.formLabel, { color: colors.text }]}>Address</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                    value={formData.location?.address || ''}
                    onChangeText={text => setFormData(p => ({ ...p, location: { ...p.location, address: text } }))}
                    placeholder="Full address"
                    placeholderTextColor={colors.icon}
                  />
                </View>
                <View style={styles.formGroup}>
                  <Text style={[styles.formLabel, { color: colors.text }]}>City</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                    value={formData.location?.city || ''}
                    onChangeText={text => setFormData(p => ({ ...p, location: { ...p.location, city: text } }))}
                    placeholder="City name"
                    placeholderTextColor={colors.icon}
                  />
                </View>
              </>
            )}
          </View>

          {/* Pricing & Slots */}
          <View style={[styles.formSection, { borderColor: colors.border }]}>
            <View style={styles.formSectionHeader}>
              <Ionicons name="pricetag" size={18} color={colors.tint} />
              <Text style={[styles.formSectionTitle, { color: colors.text }]}>Pricing & Slots</Text>
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Free Event</Text>
                <View style={[styles.switchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.switchLabel, { color: colors.icon }]}>
                    {formData.isFree ? 'Yes' : 'No'}
                  </Text>
                  <Switch
                    value={formData.isFree !== false}
                    onValueChange={val => setFormData(p => ({ ...p, isFree: val, price: val ? 0 : p.price }))}
                    trackColor={{ true: colors.tint }}
                  />
                </View>
              </View>
              {!formData.isFree && (
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={[styles.formLabel, { color: colors.text }]}>Price</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                    value={formData.price ? String(formData.price) : ''}
                    onChangeText={text => setFormData(p => ({ ...p, price: parseFloat(text) || 0 }))}
                    keyboardType="numeric"
                    placeholder="0.00"
                    placeholderTextColor={colors.icon}
                  />
                </View>
              )}
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Total Slots</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                value={formData.slots?.total ? String(formData.slots.total) : ''}
                onChangeText={text => setFormData(p => ({ ...p, slots: { total: parseInt(text) || 0 } }))}
                keyboardType="numeric"
                placeholder="e.g. 100"
                placeholderTextColor={colors.icon}
              />
            </View>
          </View>

          {/* Image & Tags */}
          <View style={[styles.formSection, { borderColor: colors.border }]}>
            <View style={styles.formSectionHeader}>
              <Ionicons name="image" size={18} color={colors.tint} />
              <Text style={[styles.formSectionTitle, { color: colors.text }]}>Media & Tags</Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Image URL</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                value={formData.image || ''}
                onChangeText={text => setFormData(p => ({ ...p, image: text }))}
                placeholder="https://..."
                placeholderTextColor={colors.icon}
              />
              {formData.image ? (
                <View style={styles.imagePreview}>
                  <Image source={{ uri: formData.image }} style={styles.previewImage} resizeMode="cover" />
                  <TouchableOpacity
                    style={styles.removeImageBtn}
                    onPress={() => setFormData(p => ({ ...p, image: '' }))}
                  >
                    <Ionicons name="close-circle" size={24} color={colors.error} />
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Tags (comma separated)</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                value={(formData.tags || []).join(', ')}
                onChangeText={text =>
                  setFormData(p => ({
                    ...p,
                    tags: text ? text.split(',').map(s => s.trim()).filter(Boolean) : [],
                  }))
                }
                placeholder="e.g. music, food, tech"
                placeholderTextColor={colors.icon}
              />
            </View>
          </View>

          {/* Status & Featured */}
          <View style={[styles.formSection, { borderColor: colors.border }]}>
            <View style={styles.formSectionHeader}>
              <Ionicons name="settings" size={18} color={colors.tint} />
              <Text style={[styles.formSectionTitle, { color: colors.text }]}>Status & Visibility</Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Status</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                {STATUS_OPTIONS.map(opt => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.chipOption,
                      { borderColor: colors.border },
                      formData.status === opt.value && { backgroundColor: opt.color, borderColor: opt.color },
                    ]}
                    onPress={() => setFormData(p => ({ ...p, status: opt.value }))}
                  >
                    <Text
                      style={[
                        styles.chipOptionText,
                        { color: formData.status === opt.value ? colors.card : colors.text },
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Featured</Text>
                <View style={[styles.switchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.switchLabel, { color: colors.icon }]}>
                    {formData.isFeatured ? 'Yes' : 'No'}
                  </Text>
                  <Switch
                    value={formData.isFeatured || false}
                    onValueChange={val => setFormData(p => ({ ...p, isFeatured: val }))}
                    trackColor={{ true: colors.tint }}
                  />
                </View>
              </View>
              {formData.isFeatured && (
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={[styles.formLabel, { color: colors.text }]}>Priority (0-100)</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                    value={String(formData.featuredPriority || 0)}
                    onChangeText={text => setFormData(p => ({ ...p, featuredPriority: parseInt(text) || 0 }))}
                    keyboardType="numeric"
                    placeholderTextColor={colors.icon}
                  />
                </View>
              )}
            </View>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  // ==========================================
  // BOOKINGS MODAL
  // ==========================================

  const renderBookingsModal = () => (
    <Modal visible={showBookingsModal} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => setShowBookingsModal(false)} style={styles.modalCloseBtn}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Event Bookings</Text>
          <View style={{ width: 60 }} />
        </View>

        {bookingsLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.tint} />
            <Text style={[styles.loadingText, { color: colors.icon }]}>Loading bookings...</Text>
          </View>
        ) : bookings.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="ticket-outline" size={48} color={colors.icon} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Bookings</Text>
            <Text style={[styles.emptyText, { color: colors.icon }]}>No bookings found for this event</Text>
          </View>
        ) : (
          <FlatList
            data={bookings}
            keyExtractor={item => item._id}
            contentContainerStyle={{ padding: 16 }}
            renderItem={({ item: booking }) => {
              const statusColors: Record<string, string> = {
                confirmed: colors.success,
                cancelled: colors.error,
                pending: colors.warning,
                checked_in: colors.info,
              };
              const statusColor = statusColors[booking.status] || colors.mutedDark;

              return (
                <View style={[styles.bookingCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={styles.bookingCardHeader}>
                    <View>
                      <Text style={[styles.bookingUserName, { color: colors.text }]}>
                        {booking.userId?.firstName
                          ? `${booking.userId.firstName} ${booking.userId.lastName || ''}`.trim()
                          : 'Unknown User'}
                      </Text>
                      <Text style={[styles.bookingUserPhone, { color: colors.icon }]}>
                        {booking.userId?.phone || booking.userId?.email || '-'}
                      </Text>
                    </View>
                    <View style={[styles.bookingStatusChip, { backgroundColor: `${statusColor}15` }]}>
                      <Text style={[styles.bookingStatusText, { color: statusColor }]}>
                        {booking.status.replace('_', ' ').toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.bookingCardMeta, { borderTopColor: colors.border }]}>
                    <View style={styles.bookingMetaItem}>
                      <Ionicons name="ticket-outline" size={14} color={colors.icon} />
                      <Text style={[styles.bookingMetaText, { color: colors.icon }]}>
                        {booking.tickets} ticket{booking.tickets !== 1 ? 's' : ''}
                      </Text>
                    </View>
                    <View style={styles.bookingMetaItem}>
                      <Ionicons name="cash-outline" size={14} color={colors.icon} />
                      <Text style={[styles.bookingMetaText, { color: colors.icon }]}>
                        ${(booking.totalAmount || booking.amount || 0).toFixed(2)}
                      </Text>
                    </View>
                    <View style={styles.bookingMetaItem}>
                      <Ionicons name="time-outline" size={14} color={colors.icon} />
                      <Text style={[styles.bookingMetaText, { color: colors.icon }]}>
                        {formatDate(booking.createdAt)}
                      </Text>
                    </View>
                  </View>
                  {(booking.bookingRef || booking.bookingReference) && (
                    <Text style={[styles.bookingRef, { color: colors.icon }]}>
                      Ref: {booking.bookingRef || booking.bookingReference}
                    </Text>
                  )}
                </View>
              );
            }}
          />
        )}
      </SafeAreaView>
    </Modal>
  );

  // ==========================================
  // ANALYTICS MODAL
  // ==========================================

  const renderAnalyticsModal = () => (
    <Modal visible={showAnalyticsModal} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => setShowAnalyticsModal(false)} style={styles.modalCloseBtn}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Event Analytics</Text>
          <View style={{ width: 60 }} />
        </View>

        {analyticsLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.tint} />
            <Text style={[styles.loadingText, { color: colors.icon }]}>Loading analytics...</Text>
          </View>
        ) : analytics ? (
          <ScrollView contentContainerStyle={{ padding: 16 }}>
            {/* Analytics Stats Grid */}
            <View style={styles.analyticsGrid}>
              {[
                { label: 'Total Bookings', value: analytics.totalBookings, icon: 'ticket', color: colors.info },
                { label: 'Total Revenue', value: `$${analytics.totalRevenue?.toFixed(2) || '0.00'}`, icon: 'cash', color: colors.success },
                { label: 'Check-ins', value: analytics.totalCheckins, icon: 'checkmark-circle', color: colors.purple },
                { label: 'Total Views', value: analytics.totalViews, icon: 'eye', color: colors.warning },
                { label: 'Favorites', value: analytics.totalFavorites, icon: 'heart', color: colors.error },
                { label: 'Check-in Rate', value: `${(analytics.checkinRate * 100).toFixed(1)}%`, icon: 'trending-up', color: colors.cyan },
                { label: 'Avg Tickets', value: analytics.averageTicketsPerBooking?.toFixed(1) || '0', icon: 'people', color: colors.pink },
              ].map((item, index) => (
                <View key={index} style={[styles.analyticsCard, { backgroundColor: colors.card }]}>
                  <Ionicons name={item.icon as any} size={24} color={item.color} />
                  <Text style={[styles.analyticsValue, { color: colors.text }]}>{item.value}</Text>
                  <Text style={[styles.analyticsLabel, { color: colors.icon }]}>{item.label}</Text>
                </View>
              ))}
            </View>

            {/* Bookings by Day */}
            {analytics.bookingsByDay && analytics.bookingsByDay.length > 0 && (
              <View style={[styles.analyticsSection, { backgroundColor: colors.card }]}>
                <Text style={[styles.analyticsSectionTitle, { color: colors.text }]}>
                  Bookings by Day
                </Text>
                {analytics.bookingsByDay.map((day, index) => (
                  <View key={index} style={[styles.dayRow, { borderBottomColor: colors.border }]}>
                    <Text style={[styles.dayDate, { color: colors.icon }]}>{formatDate(day.date)}</Text>
                    <View style={styles.dayBarContainer}>
                      <View
                        style={[
                          styles.dayBar,
                          {
                            backgroundColor: colors.tint,
                            width: `${Math.max(5, (day.count / Math.max(...analytics.bookingsByDay.map(d => d.count))) * 100)}%`,
                          },
                        ]}
                      />
                    </View>
                    <Text style={[styles.dayCount, { color: colors.text }]}>{day.count}</Text>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="analytics-outline" size={48} color={colors.icon} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Analytics Data</Text>
            <Text style={[styles.emptyText, { color: colors.icon }]}>Analytics data is not available yet</Text>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );

  // ==========================================
  // MAIN RENDER
  // ==========================================

  const ListHeader = () => (
    <>
      {renderHeader()}
      {renderStatsCards()}
      {renderTabs()}
      {renderSearchAndFilters()}
    </>
  );

  if (isLoading && events.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <ListHeader />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
          <Text style={[styles.loadingText, { color: colors.icon }]}>Loading events...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={events}
        keyExtractor={item => item._id}
        renderItem={renderEventCard}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {renderFormModal()}
      {renderBookingsModal()}
      {renderAnalyticsModal()}
    </SafeAreaView>
  );
}

// ==========================================
// STYLES
// ==========================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 20,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  createBtnText: {
    color: Colors.light.card,
    fontWeight: '600',
    fontSize: 14,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
  },

  // Tabs
  tabsWrapper: {
    marginBottom: 8,
  },
  tabsContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '500',
  },

  // Search & Filter
  searchFilterContainer: {
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 10,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  filterChipsRow: {
    gap: 8,
    paddingVertical: 2,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '500',
  },

  // Cards
  card: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 14,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardImageRow: {
    flexDirection: 'row',
    marginBottom: 10,
    gap: 10,
  },
  cardImage: {
    width: 80,
    height: 60,
    borderRadius: 8,
  },
  cardImagePlaceholder: {
    width: 80,
    height: 60,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardBadgesCol: {
    flex: 1,
    gap: 6,
    alignItems: 'flex-start',
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  featuredChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  featuredLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  cardCategory: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 8,
  },

  // Meta
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 10,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
  },

  // Booking row
  bookingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    marginBottom: 8,
    borderTopWidth: 1,
  },
  bookingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bookingText: {
    fontSize: 12,
  },
  slotsText: {
    fontSize: 12,
  },

  // Actions
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 8,
  },
  actionIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
    marginTop: 8,
  },
  emptyBtnText: {
    color: Colors.light.card,
    fontWeight: '600',
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },

  // Modal
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalSaveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  modalSaveBtnText: {
    color: Colors.light.card,
    fontWeight: '600',
    fontSize: 14,
  },
  modalBody: {
    flex: 1,
  },
  modalBodyContent: {
    padding: 16,
  },

  // Form
  formGroup: {
    marginBottom: 14,
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
    fontSize: 14,
  },
  multilineInput: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  formRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  formSection: {
    marginBottom: 16,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  formSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  formSectionTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  chipScroll: {
    marginBottom: 4,
  },
  chipOption: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  chipOptionText: {
    fontSize: 13,
    fontWeight: '500',
  },
  switchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  switchLabel: {
    fontSize: 14,
  },

  // Image Preview
  imagePreview: {
    marginTop: 10,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: 120,
    borderRadius: 10,
  },
  removeImageBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: Colors.light.card,
    borderRadius: 12,
  },

  // Bookings Card
  bookingCard: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
  },
  bookingCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  bookingUserName: {
    fontSize: 15,
    fontWeight: '600',
  },
  bookingUserPhone: {
    fontSize: 12,
    marginTop: 2,
  },
  bookingStatusChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  bookingStatusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  bookingCardMeta: {
    flexDirection: 'row',
    gap: 16,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  bookingMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bookingMetaText: {
    fontSize: 12,
  },
  bookingRef: {
    fontSize: 11,
    marginTop: 8,
  },

  // Analytics
  analyticsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  analyticsCard: {
    width: (Dimensions.get('window').width - 52) / 2,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  analyticsValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  analyticsLabel: {
    fontSize: 11,
    textAlign: 'center',
  },
  analyticsSection: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  analyticsSectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  dayDate: {
    fontSize: 12,
    width: 80,
  },
  dayBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 4,
    overflow: 'hidden',
  },
  dayBar: {
    height: '100%',
    borderRadius: 4,
  },
  dayCount: {
    fontSize: 12,
    fontWeight: '600',
    width: 30,
    textAlign: 'right',
  },
});
