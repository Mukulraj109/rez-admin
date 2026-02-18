import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Modal,
  ScrollView,
  TextInput,
  ActivityIndicator,
  SafeAreaView,
  Switch,
  useColorScheme,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../constants/Colors';
import { showAlert, showConfirm } from '../../utils/alert';
import {
  socialImpactService,
  SocialImpactEvent,
  Participant,
  EVENT_TYPES,
  EVENT_STATUSES,
  PARTICIPANT_STATUSES,
  getEventTypeEmoji,
  getStatusColor,
} from '../../services/api/socialImpact';

// ==========================================
// Types & Helpers
// ==========================================

interface EventFormData {
  name: string;
  description: string;
  eventType: string;
  eventStatus: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  organizerName: string;
  organizerLogo: string;
  locationAddress: string;
  locationCity: string;
  eventDate: string;
  eventTimeStart: string;
  eventTimeEnd: string;
  rewardsRezCoins: number;
  rewardsBrandCoins: number;
  capacityGoal: number;
  impactDescription: string;
  impactMetric: string;
  impactTargetValue: number;
  contactPhone: string;
  contactEmail: string;
  isCsrActivity: boolean;
  featured: boolean;
  image: string;
}

const DEFAULT_FORM: EventFormData = {
  name: '',
  description: '',
  eventType: 'blood-donation',
  eventStatus: 'upcoming',
  organizerName: '',
  organizerLogo: '',
  locationAddress: '',
  locationCity: '',
  eventDate: new Date().toISOString().split('T')[0],
  eventTimeStart: '09:00',
  eventTimeEnd: '17:00',
  rewardsRezCoins: 100,
  rewardsBrandCoins: 0,
  capacityGoal: 50,
  impactDescription: '',
  impactMetric: '',
  impactTargetValue: 0,
  contactPhone: '',
  contactEmail: '',
  isCsrActivity: false,
  featured: false,
  image: '',
};

function getEventTypeLabel(eventType: string): string {
  return EVENT_TYPES.find(t => t.value === eventType)?.label || eventType;
}

function getParticipantStatusColor(status: string): string {
  return PARTICIPANT_STATUSES.find(s => s.value === status)?.color || '#6B7280';
}

function getParticipantStatusLabel(status: string): string {
  return PARTICIPANT_STATUSES.find(s => s.value === status)?.label || status;
}

function formatDate(dateString: string): string {
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateString;
  }
}

function formatDateShort(dateString: string): string {
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return dateString;
  }
}

// ==========================================
// Main Component
// ==========================================

export default function SocialImpactScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  // Data state
  const [events, setEvents] = useState<SocialImpactEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Form modal
  const [showFormModal, setShowFormModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingEvent, setEditingEvent] = useState<SocialImpactEvent | null>(null);
  const [form, setForm] = useState<EventFormData>({ ...DEFAULT_FORM });

  // Participants modal
  const [showParticipantsModal, setShowParticipantsModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<SocialImpactEvent | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [participantsLoading, setParticipantsLoading] = useState(false);
  const [participantFilter, setParticipantFilter] = useState<string>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [otpDisplay, setOtpDisplay] = useState<{ name: string; code: string } | null>(null);

  // ==========================================
  // Computed Stats
  // ==========================================

  const stats = {
    total: totalCount,
    active: events.filter(e => e.eventStatus === 'upcoming' || e.eventStatus === 'ongoing').length,
    totalParticipants: events.reduce((sum, e) => sum + (e.capacity?.enrolled || 0), 0),
    totalCoins: events.reduce((sum, e) => sum + (e.rewards?.rezCoins || 0) + (e.rewards?.brandCoins || 0), 0),
  };

  // ==========================================
  // Data Loading
  // ==========================================

  const loadEvents = useCallback(async (pageNum: number = 1, append: boolean = false) => {
    try {
      if (!append) setLoading(true);

      let response;
      if (filterStatus === 'pending_approval') {
        response = await socialImpactService.getPendingEvents({ page: pageNum, limit: 20 });
      } else {
        const params: any = { page: pageNum, limit: 20 };
        if (filterStatus !== 'all') params.eventStatus = filterStatus;
        response = await socialImpactService.getEvents(params);
      }

      if (response.success && response.data) {
        const data = response.data as any;
        const eventsList = data.events || data;
        const pagination = data.pagination;

        if (append) {
          setEvents(prev => [...prev, ...eventsList]);
        } else {
          setEvents(eventsList);
        }

        if (pagination) {
          setHasMore(pageNum < pagination.totalPages);
          setTotalCount(pagination.total || eventsList.length);
        } else {
          setHasMore(false);
          setTotalCount(eventsList.length);
        }
        setPage(pageNum);
      } else {
        if (!append) setEvents([]);
        showAlert('Error', response.message || 'Failed to load events');
      }
    } catch (error: any) {
      console.error('Failed to load events:', error);
      showAlert('Error', error.message || 'Failed to load events');
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => {
    loadEvents(1);
  }, [filterStatus]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadEvents(1);
    setRefreshing(false);
  }, [loadEvents]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      loadEvents(page + 1, true);
    }
  }, [loading, hasMore, page, loadEvents]);

  // ==========================================
  // Event Handlers
  // ==========================================

  const handleCreateNew = useCallback(() => {
    setEditingEvent(null);
    setForm({ ...DEFAULT_FORM });
    setShowFormModal(true);
  }, []);

  const handleEdit = useCallback((event: SocialImpactEvent) => {
    setEditingEvent(event);
    setForm({
      name: event.name || '',
      description: event.description || '',
      eventType: event.eventType || 'blood-donation',
      eventStatus: event.eventStatus || 'upcoming',
      organizerName: event.organizer?.name || '',
      organizerLogo: event.organizer?.logo || '',
      locationAddress: event.location?.address || '',
      locationCity: event.location?.city || '',
      eventDate: event.eventDate ? event.eventDate.split('T')[0] : '',
      eventTimeStart: event.eventTime?.start || '09:00',
      eventTimeEnd: event.eventTime?.end || '17:00',
      rewardsRezCoins: event.rewards?.rezCoins || 0,
      rewardsBrandCoins: event.rewards?.brandCoins || 0,
      capacityGoal: event.capacity?.goal || 50,
      impactDescription: event.impact?.description || '',
      impactMetric: event.impact?.metric || '',
      impactTargetValue: event.impact?.targetValue || 0,
      contactPhone: event.contact?.phone || '',
      contactEmail: event.contact?.email || '',
      isCsrActivity: event.isCsrActivity || false,
      featured: event.featured || false,
      image: event.image || '',
    });
    setShowFormModal(true);
  }, []);

  const handleSave = useCallback(async () => {
    // Validation
    if (!form.name.trim()) {
      showAlert('Error', 'Please enter an event name');
      return;
    }
    if (!form.description.trim()) {
      showAlert('Error', 'Please enter a description');
      return;
    }
    if (!form.eventDate) {
      showAlert('Error', 'Please enter an event date');
      return;
    }
    if (!form.locationCity.trim()) {
      showAlert('Error', 'Please enter a city');
      return;
    }
    if (form.capacityGoal < 1) {
      showAlert('Error', 'Capacity goal must be at least 1');
      return;
    }

    setIsSaving(true);
    try {
      const payload: any = {
        name: form.name.trim(),
        description: form.description.trim(),
        eventType: form.eventType,
        eventStatus: form.eventStatus,
        organizer: {
          name: form.organizerName.trim(),
          logo: form.organizerLogo.trim() || undefined,
        },
        location: {
          address: form.locationAddress.trim(),
          city: form.locationCity.trim(),
        },
        eventDate: form.eventDate,
        eventTime: {
          start: form.eventTimeStart,
          end: form.eventTimeEnd,
        },
        rewards: {
          rezCoins: form.rewardsRezCoins,
          brandCoins: form.rewardsBrandCoins,
        },
        capacity: {
          goal: form.capacityGoal,
        },
        impact: {
          description: form.impactDescription.trim(),
          metric: form.impactMetric.trim(),
          targetValue: form.impactTargetValue,
        },
        contact: {
          phone: form.contactPhone.trim() || undefined,
          email: form.contactEmail.trim() || undefined,
        },
        isCsrActivity: form.isCsrActivity,
        featured: form.featured,
        image: form.image.trim() || undefined,
      };

      if (editingEvent) {
        const response = await socialImpactService.updateEvent(editingEvent._id, payload);
        if (response.success) {
          showAlert('Success', 'Event updated successfully');
        } else {
          showAlert('Error', response.message || 'Failed to update event');
          setIsSaving(false);
          return;
        }
      } else {
        const response = await socialImpactService.createEvent(payload);
        if (response.success) {
          showAlert('Success', 'Event created successfully');
        } else {
          showAlert('Error', response.message || 'Failed to create event');
          setIsSaving(false);
          return;
        }
      }

      setShowFormModal(false);
      await loadEvents(1);
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to save event');
    } finally {
      setIsSaving(false);
    }
  }, [form, editingEvent, loadEvents]);

  // ==========================================
  // Participant Handlers
  // ==========================================

  const handleOpenParticipants = useCallback(async (event: SocialImpactEvent) => {
    setSelectedEvent(event);
    setParticipantFilter('all');
    setShowParticipantsModal(true);
    setParticipantsLoading(true);
    try {
      const response = await socialImpactService.getParticipants(event._id);
      if (response.success && response.data) {
        const data = response.data as any;
        setParticipants(data.participants || data || []);
      } else {
        setParticipants([]);
        showAlert('Error', response.message || 'Failed to load participants');
      }
    } catch (error: any) {
      setParticipants([]);
      showAlert('Error', error.message || 'Failed to load participants');
    } finally {
      setParticipantsLoading(false);
    }
  }, []);

  const loadFilteredParticipants = useCallback(async (status: string) => {
    if (!selectedEvent) return;
    setParticipantsLoading(true);
    try {
      const params: any = {};
      if (status !== 'all') params.status = status;
      const response = await socialImpactService.getParticipants(selectedEvent._id, params);
      if (response.success && response.data) {
        const data = response.data as any;
        setParticipants(data.participants || data || []);
      }
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to load participants');
    } finally {
      setParticipantsLoading(false);
    }
  }, [selectedEvent]);

  const handleParticipantFilterChange = useCallback((status: string) => {
    setParticipantFilter(status);
    loadFilteredParticipants(status);
  }, [loadFilteredParticipants]);

  const handleCheckIn = useCallback(async (participant: Participant) => {
    if (!selectedEvent) return;
    const userId = participant.user._id;
    setActionLoading(userId);

    // Optimistic update
    const prevParticipants = [...participants];
    setParticipants(prev =>
      prev.map(p => p.user._id === userId ? { ...p, status: 'checked_in' as const, checkedInAt: new Date().toISOString() } : p)
    );

    try {
      const response = await socialImpactService.checkInParticipant(selectedEvent._id, userId);
      if (!response.success) {
        setParticipants(prevParticipants);
        showAlert('Error', response.message || 'Failed to check in participant');
      }
    } catch (error: any) {
      setParticipants(prevParticipants);
      showAlert('Error', error.message || 'Failed to check in participant');
    } finally {
      setActionLoading(null);
    }
  }, [selectedEvent, participants]);

  const handleComplete = useCallback(async (participant: Participant) => {
    if (!selectedEvent) return;
    const userId = participant.user._id;
    setActionLoading(userId);

    // Optimistic update
    const prevParticipants = [...participants];
    setParticipants(prev =>
      prev.map(p => p.user._id === userId ? { ...p, status: 'completed' as const, completedAt: new Date().toISOString() } : p)
    );

    try {
      const response = await socialImpactService.completeParticipant(selectedEvent._id, userId);
      if (!response.success) {
        setParticipants(prevParticipants);
        showAlert('Error', response.message || 'Failed to complete participant');
      }
    } catch (error: any) {
      setParticipants(prevParticipants);
      showAlert('Error', error.message || 'Failed to complete participant');
    } finally {
      setActionLoading(null);
    }
  }, [selectedEvent, participants]);

  const handleGenerateOTP = useCallback(async (participant: Participant) => {
    if (!selectedEvent) return;
    const userId = participant.user._id;
    setActionLoading(userId);

    try {
      const response = await socialImpactService.generateOTP(selectedEvent._id, userId);
      if (response.success && response.data?.otpCode) {
        setOtpDisplay({ name: participant.user.name, code: response.data.otpCode });
      } else {
        showAlert('Error', response.message || 'Failed to generate OTP');
      }
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to generate OTP');
    } finally {
      setActionLoading(null);
    }
  }, [selectedEvent]);

  const handleBulkComplete = useCallback(() => {
    if (!selectedEvent) return;

    const eligibleParticipants = participants.filter(
      p => p.status === 'checked_in' || p.status === 'registered'
    );

    if (eligibleParticipants.length === 0) {
      showAlert('Info', 'No eligible participants to complete');
      return;
    }

    showConfirm(
      'Bulk Complete',
      `Mark ${eligibleParticipants.length} participant(s) as completed?`,
      async () => {
        setActionLoading('bulk');
        const prevParticipants = [...participants];
        const userIds = eligibleParticipants.map(p => p.user._id);

        setParticipants(prev =>
          prev.map(p =>
            userIds.includes(p.user._id)
              ? { ...p, status: 'completed' as const, completedAt: new Date().toISOString() }
              : p
          )
        );

        try {
          const response = await socialImpactService.bulkComplete(selectedEvent._id, userIds);
          if (!response.success) {
            setParticipants(prevParticipants);
            showAlert('Error', response.message || 'Failed to bulk complete');
          } else {
            showAlert('Success', `${userIds.length} participants marked as completed`);
          }
        } catch (error: any) {
          setParticipants(prevParticipants);
          showAlert('Error', error.message || 'Failed to bulk complete');
        } finally {
          setActionLoading(null);
        }
      },
      'Complete All'
    );
  }, [selectedEvent, participants]);

  // ==========================================
  // Render: Header
  // ==========================================

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Social Impact Events</Text>
        {totalCount > 0 && (
          <View style={[styles.countBadge, { backgroundColor: `${colors.tint}15` }]}>
            <Text style={[styles.countBadgeText, { color: colors.tint }]}>{totalCount}</Text>
          </View>
        )}
      </View>
    </View>
  );

  // ==========================================
  // Render: Stats Row
  // ==========================================

  const renderStatsRow = () => (
    <View style={styles.statsRow}>
      {[
        { label: 'Total Events', value: stats.total, color: colors.text, icon: 'calendar' as const },
        { label: 'Active', value: stats.active, color: '#10B981', icon: 'radio-button-on' as const },
        { label: 'Participants', value: stats.totalParticipants, color: '#3B82F6', icon: 'people' as const },
        { label: 'Total Coins', value: stats.totalCoins, color: '#F59E0B', icon: 'logo-bitcoin' as const },
      ].map((item, index) => (
        <View key={index} style={[styles.statItem, { backgroundColor: colors.card }]}>
          <Ionicons name={item.icon} size={16} color={item.color} style={{ marginBottom: 4 }} />
          <Text style={[styles.statValue, { color: item.color }]}>{item.value}</Text>
          <Text style={[styles.statLabel, { color: colors.icon }]}>{item.label}</Text>
        </View>
      ))}
    </View>
  );

  // ==========================================
  // Render: Filter Chips
  // ==========================================

  const renderFilters = () => (
    <View style={styles.filtersContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {[{ value: 'all', label: 'All', color: colors.tint }, { value: 'pending_approval', label: 'Pending Approval', color: '#F59E0B' }, ...EVENT_STATUSES].map(status => {
          const isActive = filterStatus === status.value;
          const chipColor = status.color;
          return (
            <TouchableOpacity
              key={status.value}
              style={[
                styles.filterChip,
                {
                  backgroundColor: isActive ? `${chipColor}20` : colors.card,
                  borderColor: isActive ? chipColor : colors.border,
                },
              ]}
              onPress={() => setFilterStatus(status.value)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  { color: isActive ? chipColor : colors.icon },
                ]}
              >
                {status.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  // ==========================================
  // Render: Create Button
  // ==========================================

  const renderCreateButton = () => (
    <View style={styles.buttonRow}>
      <TouchableOpacity
        style={[styles.createBtn, { backgroundColor: colors.tint }]}
        onPress={handleCreateNew}
      >
        <Ionicons name="add" size={18} color="#FFF" />
        <Text style={styles.createBtnText}>Create Event</Text>
      </TouchableOpacity>
    </View>
  );

  // ==========================================
  // Render: Event Card
  // ==========================================

  const handleApproveEvent = useCallback(async (event: SocialImpactEvent) => {
    const confirmed = await showConfirm('Approve Event', `Approve "${event.name}" and make it live?`);
    if (!confirmed) return;
    try {
      const response = await socialImpactService.approveEvent(event._id);
      if (response.success) {
        showAlert('Success', 'Event approved and is now live');
        loadEvents(1);
      } else {
        showAlert('Error', response.message || 'Failed to approve event');
      }
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to approve event');
    }
  }, [loadEvents]);

  const handleRejectEvent = useCallback(async (event: SocialImpactEvent) => {
    const confirmed = await showConfirm('Reject Event', `Reject "${event.name}"? The merchant will be notified.`);
    if (!confirmed) return;
    try {
      const response = await socialImpactService.rejectEvent(event._id);
      if (response.success) {
        showAlert('Rejected', 'Event has been rejected');
        loadEvents(1);
      } else {
        showAlert('Error', response.message || 'Failed to reject event');
      }
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to reject event');
    }
  }, [loadEvents]);

  const renderEventItem = useCallback(({ item }: { item: SocialImpactEvent }) => {
    const emoji = getEventTypeEmoji(item.eventType);
    const statusColor = getStatusColor(item.eventStatus);
    const enrolled = item.capacity?.enrolled || 0;
    const goal = item.capacity?.goal || 1;
    const progressPercent = Math.min((enrolled / goal) * 100, 100);
    const isPending = item.status === 'pending_approval';
    const isRejected = item.status === 'rejected';

    return (
      <View style={[styles.card, { backgroundColor: colors.card }, isPending && styles.pendingCard]}>
        {/* Pending Approval Banner */}
        {isPending && (
          <View style={styles.approvalBanner}>
            <Ionicons name="time-outline" size={14} color="#F59E0B" />
            <Text style={styles.approvalBannerText}>Pending Admin Approval</Text>
            {(item as any).merchant?.businessName && (
              <Text style={styles.approvalMerchantText}>by {(item as any).merchant.businessName}</Text>
            )}
          </View>
        )}
        {isRejected && (
          <View style={[styles.approvalBanner, { backgroundColor: '#FEE2E2' }]}>
            <Ionicons name="close-circle-outline" size={14} color="#EF4444" />
            <Text style={[styles.approvalBannerText, { color: '#EF4444' }]}>Rejected</Text>
          </View>
        )}

        {/* Card Header */}
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <Text style={styles.cardEmoji}>{emoji}</Text>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={[styles.cardSubtitle, { color: colors.icon }]} numberOfLines={1}>
                {getEventTypeLabel(item.eventType)}
              </Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: `${statusColor}15` }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusBadgeText, { color: statusColor }]}>
              {item.eventStatus.charAt(0).toUpperCase() + item.eventStatus.slice(1)}
            </Text>
          </View>
        </View>

        {/* Organizer & Sponsor */}
        <View style={styles.metaRow}>
          {item.organizer?.name ? (
            <View style={styles.metaChip}>
              <Ionicons name="business-outline" size={13} color={colors.icon} />
              <Text style={[styles.metaText, { color: colors.icon }]} numberOfLines={1}>
                {item.organizer.name}
              </Text>
            </View>
          ) : null}
          {item.sponsor?.name ? (
            <View style={styles.metaChip}>
              <Ionicons name="ribbon-outline" size={13} color="#8B5CF6" />
              <Text style={[styles.metaText, { color: '#8B5CF6' }]} numberOfLines={1}>
                {item.sponsor.name}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Date & City */}
        <View style={styles.metaRow}>
          {item.eventDate ? (
            <View style={styles.metaChip}>
              <Ionicons name="calendar-outline" size={13} color={colors.icon} />
              <Text style={[styles.metaText, { color: colors.icon }]}>
                {formatDateShort(item.eventDate)}
              </Text>
            </View>
          ) : null}
          {item.location?.city ? (
            <View style={styles.metaChip}>
              <Ionicons name="location-outline" size={13} color={colors.icon} />
              <Text style={[styles.metaText, { color: colors.icon }]}>
                {item.location.city}
              </Text>
            </View>
          ) : null}
          {item.eventTime?.start ? (
            <View style={styles.metaChip}>
              <Ionicons name="time-outline" size={13} color={colors.icon} />
              <Text style={[styles.metaText, { color: colors.icon }]}>
                {item.eventTime.start}{item.eventTime.end ? ` - ${item.eventTime.end}` : ''}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Capacity Progress Bar */}
        <View style={styles.capacitySection}>
          <View style={styles.capacityHeader}>
            <Text style={[styles.capacityLabel, { color: colors.icon }]}>
              Capacity
            </Text>
            <Text style={[styles.capacityValue, { color: colors.text }]}>
              {enrolled} / {goal}
            </Text>
          </View>
          <View style={[styles.progressBarBg, { backgroundColor: `${colors.border}80` }]}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${progressPercent}%`,
                  backgroundColor: progressPercent >= 90 ? '#EF4444' : progressPercent >= 70 ? '#F59E0B' : '#10B981',
                },
              ]}
            />
          </View>
        </View>

        {/* Rewards */}
        <View style={styles.metaRow}>
          {(item.rewards?.rezCoins ?? 0) > 0 && (
            <View style={styles.metaChip}>
              <Ionicons name="logo-bitcoin" size={13} color="#F59E0B" />
              <Text style={[styles.metaText, { color: '#F59E0B', fontWeight: '700' }]}>
                {item.rewards!.rezCoins} Nuqta
              </Text>
            </View>
          )}
          {(item.rewards?.brandCoins ?? 0) > 0 && (
            <View style={styles.metaChip}>
              <Ionicons name="diamond-outline" size={13} color="#8B5CF6" />
              <Text style={[styles.metaText, { color: '#8B5CF6', fontWeight: '700' }]}>
                {item.rewards!.brandCoins} Brand
              </Text>
            </View>
          )}
          {item.featured && (
            <View style={[styles.featuredBadge, { backgroundColor: '#F59E0B15' }]}>
              <Ionicons name="star" size={11} color="#F59E0B" />
              <Text style={[styles.featuredBadgeText, { color: '#F59E0B' }]}>Featured</Text>
            </View>
          )}
          {item.isCsrActivity && (
            <View style={[styles.csrBadge, { backgroundColor: '#10B98115' }]}>
              <Ionicons name="heart" size={11} color="#10B981" />
              <Text style={[styles.csrBadgeText, { color: '#10B981' }]}>CSR</Text>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={[styles.actionRow, { borderTopColor: colors.border }]}>
          {isPending ? (
            <>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#10B98115' }]}
                onPress={() => handleApproveEvent(item)}
              >
                <Ionicons name="checkmark-circle" size={15} color="#10B981" />
                <Text style={[styles.actionBtnText, { color: '#10B981' }]}>Approve</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#EF444415' }]}
                onPress={() => handleRejectEvent(item)}
              >
                <Ionicons name="close-circle" size={15} color="#EF4444" />
                <Text style={[styles.actionBtnText, { color: '#EF4444' }]}>Reject</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#3B82F610' }]}
                onPress={() => handleEdit(item)}
              >
                <Ionicons name="pencil" size={15} color="#3B82F6" />
                <Text style={[styles.actionBtnText, { color: '#3B82F6' }]}>Edit</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: `${colors.tint}10` }]}
                onPress={() => handleOpenParticipants(item)}
              >
                <Ionicons name="people" size={15} color={colors.tint} />
                <Text style={[styles.actionBtnText, { color: colors.tint }]}>Participants</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#3B82F610' }]}
                onPress={() => handleEdit(item)}
              >
                <Ionicons name="pencil" size={15} color="#3B82F6" />
                <Text style={[styles.actionBtnText, { color: '#3B82F6' }]}>Edit</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  }, [colors, handleEdit, handleOpenParticipants, handleApproveEvent, handleRejectEvent]);

  // ==========================================
  // Render: Select Options Helper
  // ==========================================

  const renderSelectOptions = (
    label: string,
    options: Array<{ value: string; label: string; emoji?: string; color?: string }>,
    selectedValue: string,
    onSelect: (value: string) => void,
  ) => (
    <View style={styles.formGroup}>
      <Text style={[styles.formLabel, { color: colors.text }]}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.selectRow}>
          {options.map(option => {
            const isSelected = selectedValue === option.value;
            const optColor = option.color || colors.tint;
            return (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.selectChip,
                  {
                    backgroundColor: isSelected ? `${optColor}20` : colors.background,
                    borderColor: isSelected ? optColor : colors.border,
                  },
                ]}
                onPress={() => onSelect(option.value)}
              >
                {option.emoji && (
                  <Text style={{ fontSize: 14, marginRight: 4 }}>{option.emoji}</Text>
                )}
                <Text
                  style={[
                    styles.selectChipText,
                    { color: isSelected ? optColor : colors.icon },
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );

  // ==========================================
  // Render: Form Modal
  // ==========================================

  const renderFormModal = () => {
    const isEditing = !!editingEvent;
    const modalTitle = isEditing ? 'Edit Event' : 'New Event';

    return (
      <Modal visible={showFormModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity
              onPress={() => setShowFormModal(false)}
              style={styles.modalCloseBtn}
            >
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{modalTitle}</Text>
            <TouchableOpacity
              onPress={handleSave}
              disabled={isSaving}
              style={[styles.modalSaveBtn, { backgroundColor: colors.tint }]}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.modalSaveBtnText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formScroll} contentContainerStyle={styles.formContent}>
            {/* Name */}
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Event Name *</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                value={form.name}
                onChangeText={text => setForm(p => ({ ...p, name: text }))}
                placeholder="Event name"
                placeholderTextColor={colors.icon}
              />
            </View>

            {/* Description */}
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Description *</Text>
              <TextInput
                style={[styles.formInput, styles.textArea, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                value={form.description}
                onChangeText={text => setForm(p => ({ ...p, description: text }))}
                placeholder="Event description"
                placeholderTextColor={colors.icon}
                multiline
                numberOfLines={4}
              />
            </View>

            {/* Event Type */}
            {renderSelectOptions(
              'Event Type *',
              EVENT_TYPES.map(t => ({ value: t.value, label: t.label, emoji: t.emoji })),
              form.eventType,
              val => setForm(p => ({ ...p, eventType: val })),
            )}

            {/* Event Status */}
            {renderSelectOptions(
              'Status *',
              EVENT_STATUSES,
              form.eventStatus,
              val => setForm(p => ({ ...p, eventStatus: val as any })),
            )}

            {/* Organizer Section */}
            <View style={[styles.formSection, { borderColor: colors.border }]}>
              <View style={styles.formSectionTitleRow}>
                <Ionicons name="business" size={18} color={colors.tint} />
                <Text style={[styles.formSectionTitle, { color: colors.text }]}>Organizer</Text>
              </View>
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Name</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  value={form.organizerName}
                  onChangeText={text => setForm(p => ({ ...p, organizerName: text }))}
                  placeholder="Organizer name"
                  placeholderTextColor={colors.icon}
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Logo URL</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  value={form.organizerLogo}
                  onChangeText={text => setForm(p => ({ ...p, organizerLogo: text }))}
                  placeholder="https://..."
                  placeholderTextColor={colors.icon}
                  autoCapitalize="none"
                />
              </View>
            </View>

            {/* Location Section */}
            <View style={[styles.formSection, { borderColor: colors.border }]}>
              <View style={styles.formSectionTitleRow}>
                <Ionicons name="location" size={18} color={colors.tint} />
                <Text style={[styles.formSectionTitle, { color: colors.text }]}>Location</Text>
              </View>
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Address</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  value={form.locationAddress}
                  onChangeText={text => setForm(p => ({ ...p, locationAddress: text }))}
                  placeholder="Street address"
                  placeholderTextColor={colors.icon}
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.text }]}>City *</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  value={form.locationCity}
                  onChangeText={text => setForm(p => ({ ...p, locationCity: text }))}
                  placeholder="City name"
                  placeholderTextColor={colors.icon}
                />
              </View>
            </View>

            {/* Date & Time Section */}
            <View style={[styles.formSection, { borderColor: colors.border }]}>
              <View style={styles.formSectionTitleRow}>
                <Ionicons name="calendar" size={18} color={colors.tint} />
                <Text style={[styles.formSectionTitle, { color: colors.text }]}>Date & Time</Text>
              </View>
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Event Date *</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  value={form.eventDate}
                  onChangeText={text => setForm(p => ({ ...p, eventDate: text }))}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.icon}
                />
              </View>
              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={[styles.formLabel, { color: colors.text }]}>Start Time</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                    value={form.eventTimeStart}
                    onChangeText={text => setForm(p => ({ ...p, eventTimeStart: text }))}
                    placeholder="HH:MM"
                    placeholderTextColor={colors.icon}
                  />
                </View>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={[styles.formLabel, { color: colors.text }]}>End Time</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                    value={form.eventTimeEnd}
                    onChangeText={text => setForm(p => ({ ...p, eventTimeEnd: text }))}
                    placeholder="HH:MM"
                    placeholderTextColor={colors.icon}
                  />
                </View>
              </View>
            </View>

            {/* Rewards Section */}
            <View style={[styles.formSection, { borderColor: colors.border }]}>
              <View style={styles.formSectionTitleRow}>
                <Ionicons name="gift" size={18} color="#F59E0B" />
                <Text style={[styles.formSectionTitle, { color: colors.text }]}>Rewards</Text>
              </View>
              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={[styles.formLabel, { color: colors.text }]}>Nuqta Coins</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                    value={form.rewardsRezCoins !== undefined ? String(form.rewardsRezCoins) : ''}
                    onChangeText={text => setForm(p => ({ ...p, rewardsRezCoins: parseInt(text) || 0 }))}
                    placeholder="0"
                    placeholderTextColor={colors.icon}
                    keyboardType="numeric"
                  />
                </View>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={[styles.formLabel, { color: colors.text }]}>Brand Coins</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                    value={form.rewardsBrandCoins !== undefined ? String(form.rewardsBrandCoins) : ''}
                    onChangeText={text => setForm(p => ({ ...p, rewardsBrandCoins: parseInt(text) || 0 }))}
                    placeholder="0"
                    placeholderTextColor={colors.icon}
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </View>

            {/* Capacity */}
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Capacity Goal *</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                value={form.capacityGoal ? String(form.capacityGoal) : ''}
                onChangeText={text => setForm(p => ({ ...p, capacityGoal: parseInt(text) || 0 }))}
                placeholder="e.g. 50"
                placeholderTextColor={colors.icon}
                keyboardType="numeric"
              />
            </View>

            {/* Impact Section */}
            <View style={[styles.formSection, { borderColor: colors.border }]}>
              <View style={styles.formSectionTitleRow}>
                <Ionicons name="trending-up" size={18} color="#10B981" />
                <Text style={[styles.formSectionTitle, { color: colors.text }]}>Impact</Text>
              </View>
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Description</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  value={form.impactDescription}
                  onChangeText={text => setForm(p => ({ ...p, impactDescription: text }))}
                  placeholder="Impact description"
                  placeholderTextColor={colors.icon}
                />
              </View>
              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={[styles.formLabel, { color: colors.text }]}>Metric</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                    value={form.impactMetric}
                    onChangeText={text => setForm(p => ({ ...p, impactMetric: text }))}
                    placeholder="e.g. trees planted"
                    placeholderTextColor={colors.icon}
                  />
                </View>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={[styles.formLabel, { color: colors.text }]}>Target Value</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                    value={form.impactTargetValue ? String(form.impactTargetValue) : ''}
                    onChangeText={text => setForm(p => ({ ...p, impactTargetValue: parseInt(text) || 0 }))}
                    placeholder="0"
                    placeholderTextColor={colors.icon}
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </View>

            {/* Contact Section */}
            <View style={[styles.formSection, { borderColor: colors.border }]}>
              <View style={styles.formSectionTitleRow}>
                <Ionicons name="call" size={18} color={colors.tint} />
                <Text style={[styles.formSectionTitle, { color: colors.text }]}>Contact</Text>
              </View>
              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={[styles.formLabel, { color: colors.text }]}>Phone</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                    value={form.contactPhone}
                    onChangeText={text => setForm(p => ({ ...p, contactPhone: text }))}
                    placeholder="+91..."
                    placeholderTextColor={colors.icon}
                    keyboardType="phone-pad"
                  />
                </View>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={[styles.formLabel, { color: colors.text }]}>Email</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                    value={form.contactEmail}
                    onChangeText={text => setForm(p => ({ ...p, contactEmail: text }))}
                    placeholder="email@example.com"
                    placeholderTextColor={colors.icon}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              </View>
            </View>

            {/* CSR Activity Toggle */}
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>CSR Activity</Text>
              <View style={[styles.switchBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Text style={[styles.switchLabel, { color: colors.icon }]}>
                  {form.isCsrActivity ? 'Yes - This is a CSR activity' : 'No'}
                </Text>
                <Switch
                  value={form.isCsrActivity}
                  onValueChange={val => setForm(p => ({ ...p, isCsrActivity: val }))}
                  trackColor={{ true: colors.tint }}
                />
              </View>
            </View>

            {/* Featured Toggle */}
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Featured</Text>
              <View style={[styles.switchBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Text style={[styles.switchLabel, { color: colors.icon }]}>
                  {form.featured ? 'Yes - Show in featured section' : 'No'}
                </Text>
                <Switch
                  value={form.featured}
                  onValueChange={val => setForm(p => ({ ...p, featured: val }))}
                  trackColor={{ true: colors.tint }}
                />
              </View>
            </View>

            {/* Image URL */}
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Image URL</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                value={form.image}
                onChangeText={text => setForm(p => ({ ...p, image: text }))}
                placeholder="https://..."
                placeholderTextColor={colors.icon}
                autoCapitalize="none"
              />
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    );
  };

  // ==========================================
  // Render: Participants Modal
  // ==========================================

  const renderParticipantsModal = () => {
    const eligibleCount = participants.filter(
      p => p.status === 'checked_in' || p.status === 'registered'
    ).length;

    return (
      <Modal visible={showParticipantsModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          {/* Header */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity
              onPress={() => setShowParticipantsModal(false)}
              style={styles.modalCloseBtn}
            >
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]} numberOfLines={1}>
              Participants
            </Text>
            <View style={{ width: 60 }} />
          </View>

          {/* Event Name Banner */}
          {selectedEvent && (
            <View style={[styles.participantsBanner, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
              <Text style={styles.participantsBannerEmoji}>
                {getEventTypeEmoji(selectedEvent.eventType)}
              </Text>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={[styles.participantsBannerTitle, { color: colors.text }]} numberOfLines={1}>
                  {selectedEvent.name}
                </Text>
                <Text style={[styles.participantsBannerSub, { color: colors.icon }]}>
                  {participants.length} participant{participants.length !== 1 ? 's' : ''}
                </Text>
              </View>
            </View>
          )}

          {/* Bulk Complete Button */}
          {eligibleCount > 0 && (
            <View style={styles.bulkActionRow}>
              <TouchableOpacity
                style={[styles.bulkCompleteBtn, { backgroundColor: '#10B981' }]}
                onPress={handleBulkComplete}
                disabled={actionLoading === 'bulk'}
              >
                {actionLoading === 'bulk' ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-done" size={16} color="#FFF" />
                    <Text style={styles.bulkCompleteBtnText}>
                      Complete All ({eligibleCount})
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Participant Status Filters */}
          <View style={styles.filtersContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
              {[{ value: 'all', label: 'All', color: colors.tint }, ...PARTICIPANT_STATUSES].map(status => {
                const isActive = participantFilter === status.value;
                const chipColor = status.color;
                return (
                  <TouchableOpacity
                    key={status.value}
                    style={[
                      styles.filterChip,
                      {
                        backgroundColor: isActive ? `${chipColor}20` : colors.card,
                        borderColor: isActive ? chipColor : colors.border,
                      },
                    ]}
                    onPress={() => handleParticipantFilterChange(status.value)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        { color: isActive ? chipColor : colors.icon },
                      ]}
                    >
                      {status.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Participants List */}
          {participantsLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.tint} />
            </View>
          ) : (
            <FlatList
              data={participants}
              keyExtractor={(item, index) => item._id || `participant-${index}`}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => {
                const pStatusColor = getParticipantStatusColor(item.status);
                const pStatusLabel = getParticipantStatusLabel(item.status);
                const isLoading = actionLoading === item.user._id;
                const canCheckIn = item.status === 'registered';
                const canComplete = item.status === 'checked_in' || item.status === 'registered';

                return (
                  <View style={[styles.participantCard, { backgroundColor: colors.card }]}>
                    <View style={styles.participantCardHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.participantName, { color: colors.text }]}>
                          {item.user.name || 'Unknown User'}
                        </Text>
                        {item.user.phoneNumber && (
                          <Text style={[styles.participantPhone, { color: colors.icon }]}>
                            {item.user.phoneNumber}
                          </Text>
                        )}
                        <Text style={[styles.participantDate, { color: colors.icon }]}>
                          Registered: {formatDate(item.registeredAt)}
                        </Text>
                        {item.checkedInAt && (
                          <Text style={[styles.participantDate, { color: '#F59E0B' }]}>
                            Checked in: {formatDate(item.checkedInAt)}
                          </Text>
                        )}
                        {item.completedAt && (
                          <Text style={[styles.participantDate, { color: '#10B981' }]}>
                            Completed: {formatDate(item.completedAt)}
                          </Text>
                        )}
                      </View>
                      <View style={[styles.participantStatusBadge, { backgroundColor: `${pStatusColor}15` }]}>
                        <View style={[styles.statusDot, { backgroundColor: pStatusColor }]} />
                        <Text style={[styles.participantStatusText, { color: pStatusColor }]}>
                          {pStatusLabel}
                        </Text>
                      </View>
                    </View>

                    {/* Participant Actions */}
                    {(canCheckIn || canComplete) && (
                      <View style={styles.participantActions}>
                        {canCheckIn && (
                          <>
                            <TouchableOpacity
                              style={[styles.participantActionBtn, { backgroundColor: '#F59E0B15' }]}
                              onPress={() => handleCheckIn(item)}
                              disabled={isLoading}
                            >
                              {isLoading ? (
                                <ActivityIndicator size="small" color="#F59E0B" />
                              ) : (
                                <>
                                  <Ionicons name="log-in-outline" size={14} color="#F59E0B" />
                                  <Text style={[styles.participantActionText, { color: '#F59E0B' }]}>
                                    Check In
                                  </Text>
                                </>
                              )}
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.participantActionBtn, { backgroundColor: '#8B5CF615' }]}
                              onPress={() => handleGenerateOTP(item)}
                              disabled={isLoading}
                            >
                              <Ionicons name="key-outline" size={14} color="#8B5CF6" />
                              <Text style={[styles.participantActionText, { color: '#8B5CF6' }]}>
                                OTP
                              </Text>
                            </TouchableOpacity>
                          </>
                        )}
                        {canComplete && (
                          <TouchableOpacity
                            style={[styles.participantActionBtn, { backgroundColor: '#10B98115' }]}
                            onPress={() => handleComplete(item)}
                            disabled={isLoading}
                          >
                            {isLoading ? (
                              <ActivityIndicator size="small" color="#10B981" />
                            ) : (
                              <>
                                <Ionicons name="checkmark-circle-outline" size={14} color="#10B981" />
                                <Text style={[styles.participantActionText, { color: '#10B981' }]}>
                                  Complete
                                </Text>
                              </>
                            )}
                          </TouchableOpacity>
                        )}
                      </View>
                    )}

                    {/* Coins Awarded */}
                    {item.coinsAwarded && (item.coinsAwarded.rez > 0 || item.coinsAwarded.brand > 0) && (
                      <View style={[styles.coinsAwardedRow, { borderTopColor: colors.border }]}>
                        <Ionicons name="gift-outline" size={13} color={colors.icon} />
                        <Text style={[styles.coinsAwardedText, { color: colors.icon }]}>
                          Awarded:
                          {item.coinsAwarded.rez > 0 ? ` ${item.coinsAwarded.rez} Nuqta` : ''}
                          {item.coinsAwarded.brand > 0 ? ` ${item.coinsAwarded.brand} Brand` : ''}
                        </Text>
                      </View>
                    )}
                  </View>
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="people-outline" size={56} color={colors.icon} />
                  <Text style={[styles.emptyTitle, { color: colors.text }]}>No participants</Text>
                  <Text style={[styles.emptyText, { color: colors.icon }]}>
                    No participants found for this event
                  </Text>
                </View>
              }
            />
          )}

          {/* OTP Display Banner */}
          {otpDisplay && (
            <View style={styles.otpBanner}>
              <View style={styles.otpBannerContent}>
                <Ionicons name="key" size={20} color="#8B5CF6" />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.otpBannerLabel}>OTP for {otpDisplay.name}</Text>
                  <Text style={styles.otpBannerCode}>{otpDisplay.code}</Text>
                  <Text style={styles.otpBannerExpiry}>Expires in 30 minutes</Text>
                </View>
                <TouchableOpacity onPress={() => setOtpDisplay(null)}>
                  <Ionicons name="close-circle" size={24} color="#9CA3AF" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </SafeAreaView>
      </Modal>
    );
  };

  // ==========================================
  // Main Return
  // ==========================================

  if (loading && events.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {renderHeader()}
      {renderStatsRow()}
      {renderFilters()}
      {renderCreateButton()}

      <FlatList
        data={events}
        renderItem={renderEventItem}
        keyExtractor={item => item._id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.tint}
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          hasMore ? (
            <ActivityIndicator style={{ padding: 16 }} color={colors.tint} />
          ) : (
            <View style={{ height: 20 }} />
          )
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="heart-outline" size={56} color={colors.icon} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No events</Text>
            <Text style={[styles.emptyText, { color: colors.icon }]}>
              Create your first social impact event
            </Text>
          </View>
        }
      />

      {renderFormModal()}
      {renderParticipantsModal()}
    </SafeAreaView>
  );
}

// ==========================================
// Styles
// ==========================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  countBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countBadgeText: {
    fontSize: 13,
    fontWeight: '700',
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
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '500',
    marginTop: 2,
    textAlign: 'center',
  },

  // Filters
  filtersContainer: {
    marginBottom: 8,
  },
  filterRow: {
    paddingHorizontal: 16,
    gap: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Buttons
  buttonRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 12,
  },
  createBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  createBtnText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 14,
  },

  // Card
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  card: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  pendingCard: {
    borderWidth: 1.5,
    borderColor: '#F59E0B',
    borderStyle: 'dashed',
  },
  approvalBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 10,
    gap: 6,
  },
  approvalBannerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D97706',
  },
  approvalMerchantText: {
    fontSize: 11,
    color: '#92400E',
    marginLeft: 'auto',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  cardEmoji: {
    fontSize: 28,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  cardSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },

  // Status Badge
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 5,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Meta
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 8,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
  },

  // Capacity Progress
  capacitySection: {
    marginBottom: 10,
  },
  capacityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  capacityLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  capacityValue: {
    fontSize: 12,
    fontWeight: '700',
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },

  // Featured & CSR badges
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 3,
  },
  featuredBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  csrBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 3,
  },
  csrBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },

  // Action Row
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    paddingTop: 10,
    marginTop: 4,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 5,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Empty State
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 12,
  },
  emptyText: {
    fontSize: 14,
    marginTop: 4,
  },

  // Modal
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
  modalCloseBtn: {
    padding: 4,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  modalSaveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  modalSaveBtnText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 14,
  },

  // Form
  formScroll: {
    flex: 1,
  },
  formContent: {
    padding: 16,
    paddingBottom: 40,
  },
  formGroup: {
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
    fontSize: 14,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  formRow: {
    flexDirection: 'row',
    marginBottom: 0,
  },
  formSection: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  formSectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  formSectionTitle: {
    fontSize: 15,
    fontWeight: '600',
  },

  // Select
  selectRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  selectChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  selectChipText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Switch Box
  switchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '500',
  },

  // Participants Banner
  participantsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  participantsBannerEmoji: {
    fontSize: 28,
  },
  participantsBannerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  participantsBannerSub: {
    fontSize: 12,
    marginTop: 2,
  },

  // Bulk Action
  bulkActionRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  bulkCompleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  bulkCompleteBtnText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 14,
  },

  // Participant Card
  participantCard: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  participantCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  participantName: {
    fontSize: 15,
    fontWeight: '600',
  },
  participantPhone: {
    fontSize: 12,
    marginTop: 2,
  },
  participantDate: {
    fontSize: 11,
    marginTop: 3,
  },
  participantStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    gap: 5,
    marginLeft: 8,
  },
  participantStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  participantActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  participantActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 8,
    gap: 5,
  },
  participantActionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  coinsAwardedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderTopWidth: 1,
    paddingTop: 8,
    marginTop: 10,
  },
  coinsAwardedText: {
    fontSize: 12,
  },
  otpBanner: {
    backgroundColor: '#F5F3FF',
    borderWidth: 1,
    borderColor: '#DDD6FE',
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
    marginHorizontal: 16,
  },
  otpBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  otpBannerLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  otpBannerCode: {
    fontSize: 28,
    fontWeight: '700',
    color: '#7C3AED',
    letterSpacing: 6,
  },
  otpBannerExpiry: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
});
