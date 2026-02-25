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
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { campaignsService, uploadsService, Campaign, CampaignStats, CampaignDeal, StoreOption } from '../../services';
import { Colors } from '../../constants/Colors';
import { format } from 'date-fns';
import { showAlert, showConfirm } from '../../utils/alert';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type TabType = 'all' | 'running' | 'upcoming' | 'expired' | 'inactive';
type CampaignType = Campaign['type'];

const TABS: { key: TabType; label: string; icon: string }[] = [
  { key: 'all', label: 'All', icon: 'albums' },
  { key: 'running', label: 'Running', icon: 'play-circle' },
  { key: 'upcoming', label: 'Upcoming', icon: 'time' },
  { key: 'expired', label: 'Expired', icon: 'close-circle' },
  { key: 'inactive', label: 'Inactive', icon: 'pause-circle' },
];

const CAMPAIGN_TYPES: { value: CampaignType; label: string }[] = [
  { value: 'general', label: 'General' },
  { value: 'cashback', label: 'Cashback' },
  { value: 'coins', label: 'Coins' },
  { value: 'bank', label: 'Bank Offer' },
  { value: 'bill', label: 'Bill Upload' },
  { value: 'drop', label: 'Coin Drop' },
  { value: 'new-user', label: 'New User' },
  { value: 'flash', label: 'Flash Sale' },
];

const REGIONS: { value: Campaign['region']; label: string }[] = [
  { value: 'all', label: 'All Regions' },
  { value: 'bangalore', label: 'Bangalore' },
  { value: 'dubai', label: 'Dubai' },
  { value: 'china', label: 'China' },
];

const DEFAULT_GRADIENT_COLORS = ['#FF6B6B', '#FF8E53'];

export default function CampaignsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [stats, setStats] = useState<CampaignStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal states
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDealModal, setShowDealModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [formData, setFormData] = useState<Partial<Campaign>>({});
  const [dealFormData, setDealFormData] = useState<CampaignDeal>({ image: '' });
  const [editingDealIndex, setEditingDealIndex] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Date picker states
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  // Upload states
  const [isUploading, setIsUploading] = useState(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);

  // Store selection states
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [storesLoading, setStoresLoading] = useState(false);
  const [showStoreSelector, setShowStoreSelector] = useState(false);
  const [storeSearchQuery, setStoreSearchQuery] = useState('');

  // Request permission for image picker
  const requestPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showAlert('Permission Required', 'Please allow access to your photo library to upload images.');
      return false;
    }
    return true;
  };

  // Pick and upload image
  const pickAndUploadImage = async (
    field: 'bannerImage' | 'icon' | 'dealImage',
    imageType: 'banner' | 'icon' | 'deal'
  ) => {
    const hasPermission = await requestPermission();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: imageType === 'banner' ? [3, 1] : [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets[0]) return;

      setIsUploading(true);
      setUploadingField(field);

      const uploadedImage = await uploadsService.uploadImage(
        result.assets[0].uri,
        imageType,
        'campaigns'
      );

      if (field === 'dealImage') {
        setDealFormData(p => ({ ...p, image: uploadedImage.url }));
      } else {
        setFormData(p => ({ ...p, [field]: uploadedImage.url }));
      }

      showAlert('Success', 'Image uploaded successfully');
    } catch (error: any) {
      console.error('Upload error:', error);
      showAlert('Upload Failed', error.message || 'Failed to upload image');
    } finally {
      setIsUploading(false);
      setUploadingField(null);
    }
  };

  useEffect(() => {
    loadData();
    loadStats();
    loadStores();
  }, [activeTab, searchQuery]);

  const loadStores = async (search?: string) => {
    setStoresLoading(true);
    try {
      const storesData = await campaignsService.getStores(search, 100);
      setStores(storesData);
    } catch (error) {
      console.error('Failed to load stores:', error);
    } finally {
      setStoresLoading(false);
    }
  };

  const loadData = async (pageNum: number = 1, append: boolean = false) => {
    try {
      const query: any = { page: pageNum, limit: 20 };

      if (searchQuery) query.search = searchQuery;
      if (activeTab === 'running') query.running = true;
      if (activeTab === 'upcoming') query.upcoming = true;
      if (activeTab === 'expired') query.expired = true;
      if (activeTab === 'inactive') query.status = 'inactive';

      const data = await campaignsService.getCampaigns(query);

      if (append) {
        setCampaigns(prev => [...prev, ...data.campaigns]);
      } else {
        setCampaigns(data.campaigns);
      }

      setHasMore(data.pagination.hasNext);
      setPage(pageNum);
    } catch (error) {
      console.error('Failed to load campaigns:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const data = await campaignsService.getStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadData(1), loadStats()]);
    setRefreshing(false);
  }, [activeTab, searchQuery]);

  const loadMore = () => {
    if (!isLoading && hasMore) {
      loadData(page + 1, true);
    }
  };

  const handleCreateNew = () => {
    setEditingCampaign(null);
    setFormData({
      campaignId: '',
      title: '',
      subtitle: '',
      description: '',
      badge: '',
      badgeBg: '#FFFFFF',
      badgeColor: '#0B2240',
      gradientColors: DEFAULT_GRADIENT_COLORS,
      type: 'general',
      startTime: new Date().toISOString(),
      endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      isActive: true,
      priority: 50,
      region: 'all',
      deals: [],
    });
    setShowFormModal(true);
  };

  const handleEdit = (campaign: Campaign) => {
    setEditingCampaign(campaign);
    setFormData({ ...campaign });
    setShowFormModal(true);
  };

  const handleSave = async () => {
    if (!formData.title || !formData.subtitle || !formData.badge) {
      showAlert('Error', 'Please fill in all required fields');
      return;
    }

    if (!formData.campaignId && !editingCampaign) {
      showAlert('Error', 'Campaign ID is required');
      return;
    }

    if (!formData.startTime || !formData.endTime) {
      showAlert('Error', 'Please set both start and end dates');
      return;
    }

    const startDate = new Date(formData.startTime);
    const endDate = new Date(formData.endTime);
    if (endDate <= startDate) {
      showAlert('Error', 'End date must be after start date');
      return;
    }

    setIsSaving(true);
    try {
      if (editingCampaign) {
        await campaignsService.updateCampaign(editingCampaign._id, formData);
        showAlert('Success', 'Campaign updated successfully');
      } else {
        await campaignsService.createCampaign(formData as any);
        showAlert('Success', 'Campaign created successfully');
      }
      setShowFormModal(false);
      await loadData(1);
      await loadStats();
    } catch (error: any) {
      showAlert('Error', error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (campaign: Campaign) => {
    showConfirm(
      'Delete Campaign',
      `Are you sure you want to delete "${campaign.title}"?`,
      async () => {
        try {
          await campaignsService.deleteCampaign(campaign._id);
          showAlert('Success', 'Campaign deleted');
          await loadData(1);
          await loadStats();
        } catch (error: any) {
          showAlert('Error', error.message);
        }
      },
      'Delete'
    );
  };

  const handleToggle = async (campaign: Campaign) => {
    try {
      await campaignsService.toggleCampaign(campaign._id);
      await loadData(1);
      await loadStats();
    } catch (error: any) {
      showAlert('Error', error.message);
    }
  };

  const handleDuplicate = async (campaign: Campaign) => {
    try {
      await campaignsService.duplicateCampaign(campaign._id);
      showAlert('Success', 'Campaign duplicated');
      await loadData(1);
      await loadStats();
    } catch (error: any) {
      showAlert('Error', error.message);
    }
  };

  const handleAddDeal = () => {
    if (!editingCampaign) return;
    setEditingDealIndex(null);
    setDealFormData({ image: '', store: '', cashback: '', coins: '', discount: '', bonus: '', drop: '', endsIn: '' });
    setShowDealModal(true);
  };

  const handleEditDeal = (deal: CampaignDeal, index: number) => {
    setEditingDealIndex(index);
    setDealFormData({ ...deal });
    setShowDealModal(true);
  };

  const handleSaveDeal = async () => {
    if (!dealFormData.image) {
      showAlert('Error', 'Deal image URL is required');
      return;
    }

    if (!editingCampaign) return;

    setIsSaving(true);
    try {
      if (editingDealIndex !== null) {
        // Update existing deal - we need to update the whole deals array
        const updatedDeals = [...(formData.deals || [])];
        updatedDeals[editingDealIndex] = dealFormData;
        await campaignsService.updateCampaign(editingCampaign._id, { deals: updatedDeals });
        showAlert('Success', 'Deal updated');
      } else {
        // Add new deal
        await campaignsService.addDeal(editingCampaign._id, dealFormData);
        showAlert('Success', 'Deal added');
      }
      const updated = await campaignsService.getCampaignById(editingCampaign._id);
      setEditingCampaign(updated);
      setFormData({ ...updated });
      setShowDealModal(false);
      setEditingDealIndex(null);
    } catch (error: any) {
      showAlert('Error', error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveDeal = async (dealIndex: number) => {
    if (!editingCampaign) return;

    showConfirm('Remove Deal', 'Are you sure?', async () => {
      try {
        await campaignsService.removeDeal(editingCampaign._id, dealIndex);
        const updated = await campaignsService.getCampaignById(editingCampaign._id);
        setEditingCampaign(updated);
        setFormData({ ...updated });
      } catch (error: any) {
        showAlert('Error', error.message);
      }
    });
  };

  // Date picker handlers
  const handleStartDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowStartDatePicker(false);
    if (event.type === 'set' && selectedDate) {
      const currentDate = formData.startTime ? new Date(formData.startTime) : new Date();
      selectedDate.setHours(currentDate.getHours(), currentDate.getMinutes());
      setFormData(p => ({ ...p, startTime: selectedDate.toISOString() }));
    }
  };

  const handleStartTimeChange = (event: DateTimePickerEvent, selectedTime?: Date) => {
    setShowStartTimePicker(false);
    if (event.type === 'set' && selectedTime) {
      const currentDate = formData.startTime ? new Date(formData.startTime) : new Date();
      currentDate.setHours(selectedTime.getHours(), selectedTime.getMinutes());
      setFormData(p => ({ ...p, startTime: currentDate.toISOString() }));
    }
  };

  const handleEndDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowEndDatePicker(false);
    if (event.type === 'set' && selectedDate) {
      const currentDate = formData.endTime ? new Date(formData.endTime) : new Date();
      selectedDate.setHours(currentDate.getHours(), currentDate.getMinutes());
      setFormData(p => ({ ...p, endTime: selectedDate.toISOString() }));
    }
  };

  const handleEndTimeChange = (event: DateTimePickerEvent, selectedTime?: Date) => {
    setShowEndTimePicker(false);
    if (event.type === 'set' && selectedTime) {
      const currentDate = formData.endTime ? new Date(formData.endTime) : new Date();
      currentDate.setHours(selectedTime.getHours(), selectedTime.getMinutes());
      setFormData(p => ({ ...p, endTime: currentDate.toISOString() }));
    }
  };

  const getTypeColor = (type: CampaignType) => {
    const typeColors: Record<CampaignType, string> = {
      cashback: '#10B981',
      coins: '#F59E0B',
      bank: '#3B82F6',
      bill: '#8B5CF6',
      drop: '#EC4899',
      'new-user': '#06B6D4',
      flash: '#EF4444',
      general: '#6B7280',
    };
    return typeColors[type] || '#6B7280';
  };

  const getStatusBadge = (campaign: Campaign) => {
    if (!campaign.isActive) return { text: 'Inactive', color: '#6B7280', icon: 'pause-circle' };
    if (campaign.isExpired) return { text: 'Expired', color: '#EF4444', icon: 'close-circle' };
    if (campaign.isUpcoming) return { text: 'Upcoming', color: '#F59E0B', icon: 'time' };
    if (campaign.isRunning) return { text: 'Live', color: '#10B981', icon: 'radio-button-on' };
    return { text: 'Active', color: '#3B82F6', icon: 'checkmark-circle' };
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Campaigns</Text>
        <Text style={[styles.headerSubtitle, { color: colors.icon }]}>
          Manage promotional campaigns
        </Text>
      </View>
      <TouchableOpacity
        style={[styles.createBtn, { backgroundColor: colors.tint }]}
        onPress={handleCreateNew}
      >
        <Ionicons name="add" size={20} color="#FFF" />
        <Text style={styles.createBtnText}>New</Text>
      </TouchableOpacity>
    </View>
  );

  const renderStatsCard = () => (
    <View style={styles.statsRow}>
      {[
        { label: 'Total', value: stats?.total || 0, color: colors.text },
        { label: 'Running', value: stats?.running || 0, color: '#10B981' },
        { label: 'Upcoming', value: stats?.upcoming || 0, color: '#F59E0B' },
        { label: 'Deals', value: stats?.totalDeals || 0, color: '#3B82F6' },
      ].map((item, index) => (
        <View key={index} style={[styles.statItem, { backgroundColor: colors.card }]}>
          <Text style={[styles.statValue, { color: item.color }]}>{item.value}</Text>
          <Text style={[styles.statLabel, { color: colors.icon }]}>{item.label}</Text>
        </View>
      ))}
    </View>
  );

  const renderSearchAndFilter = () => (
    <View style={styles.searchFilterContainer}>
      <View style={[styles.searchBox, { backgroundColor: colors.card }]}>
        <Ionicons name="search" size={18} color={colors.icon} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search campaigns..."
          placeholderTextColor={colors.icon}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color={colors.icon} />
          </TouchableOpacity>
        )}
      </View>
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
                color={isActive ? '#FFF' : colors.icon}
              />
              <Text style={[styles.tabLabel, { color: isActive ? '#FFF' : colors.icon }]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  const renderCampaignItem = ({ item }: { item: Campaign }) => {
    const status = getStatusBadge(item);
    const typeColor = getTypeColor(item.type);

    return (
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        {/* Card Header */}
        <View style={styles.cardHeader}>
          <View style={[styles.typeChip, { backgroundColor: `${typeColor}15` }]}>
            <View style={[styles.typeDot, { backgroundColor: typeColor }]} />
            <Text style={[styles.typeLabel, { color: typeColor }]}>
              {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
            </Text>
          </View>
          <View style={[styles.statusChip, { backgroundColor: `${status.color}15` }]}>
            <Ionicons name={status.icon as any} size={12} color={status.color} />
            <Text style={[styles.statusLabel, { color: status.color }]}>{status.text}</Text>
          </View>
        </View>

        {/* Card Body */}
        <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={[styles.cardSubtitle, { color: colors.icon }]} numberOfLines={1}>
          {item.subtitle}
        </Text>

        {/* Meta Row */}
        <View style={styles.metaRow}>
          <View style={styles.metaChip}>
            <Ionicons name="pricetag-outline" size={12} color={colors.icon} />
            <Text style={[styles.metaText, { color: colors.icon }]}>{item.badge}</Text>
          </View>
          <View style={styles.metaChip}>
            <Ionicons name="layers-outline" size={12} color={colors.icon} />
            <Text style={[styles.metaText, { color: colors.icon }]}>{item.dealsCount || 0}</Text>
          </View>
          <View style={styles.metaChip}>
            <Ionicons name="location-outline" size={12} color={colors.icon} />
            <Text style={[styles.metaText, { color: colors.icon }]}>{item.region || 'all'}</Text>
          </View>
        </View>

        {/* Date Row */}
        <View style={[styles.dateRow, { borderTopColor: colors.border }]}>
          <View style={styles.dateInfo}>
            <Ionicons name="calendar-outline" size={12} color={colors.icon} />
            <Text style={[styles.dateText, { color: colors.icon }]}>
              {format(new Date(item.startTime), 'MMM d')} - {format(new Date(item.endTime), 'MMM d')}
            </Text>
          </View>
          <Text style={[styles.priorityBadge, { backgroundColor: colors.background, color: colors.icon }]}>
            P{item.priority}
          </Text>
        </View>

        {/* Expired Banner */}
        {item.isExpired && item.isActive && (
          <TouchableOpacity
            style={styles.expiredBanner}
            onPress={() => handleEdit(item)}
          >
            <Ionicons name="refresh" size={14} color="#F59E0B" />
            <Text style={styles.expiredBannerText}>Tap to extend campaign dates</Text>
            <Ionicons name="chevron-forward" size={14} color="#F59E0B" />
          </TouchableOpacity>
        )}

        {/* Action Row */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionIconBtn, { backgroundColor: '#3B82F610' }]}
            onPress={() => handleEdit(item)}
          >
            <Ionicons name="pencil" size={16} color="#3B82F6" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.actionIconBtn,
              { backgroundColor: item.isActive ? '#F59E0B10' : '#10B98110' },
            ]}
            onPress={() => handleToggle(item)}
          >
            <Ionicons
              name={item.isActive ? 'pause' : 'play'}
              size={16}
              color={item.isActive ? '#F59E0B' : '#10B981'}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionIconBtn, { backgroundColor: '#8B5CF610' }]}
            onPress={() => handleDuplicate(item)}
          >
            <Ionicons name="copy" size={16} color="#8B5CF6" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionIconBtn, { backgroundColor: '#EF444410' }]}
            onPress={() => handleDelete(item)}
          >
            <Ionicons name="trash" size={16} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderFormModal = () => (
    <Modal visible={showFormModal} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => setShowFormModal(false)} style={styles.modalCloseBtn}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: colors.text }]}>
            {editingCampaign ? 'Edit Campaign' : 'New Campaign'}
          </Text>
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
          {!editingCampaign && (
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Campaign ID *</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                value={formData.campaignId || ''}
                onChangeText={text => setFormData(p => ({ ...p, campaignId: text.toLowerCase().replace(/\s+/g, '-') }))}
                placeholder="e.g., summer-sale-2024"
                placeholderTextColor={colors.icon}
              />
            </View>
          )}

          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.text }]}>Title *</Text>
            <TextInput
              style={[styles.formInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
              value={formData.title || ''}
              onChangeText={text => setFormData(p => ({ ...p, title: text }))}
              placeholder="Campaign title"
              placeholderTextColor={colors.icon}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.text }]}>Subtitle *</Text>
            <TextInput
              style={[styles.formInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
              value={formData.subtitle || ''}
              onChangeText={text => setFormData(p => ({ ...p, subtitle: text }))}
              placeholder="Campaign subtitle"
              placeholderTextColor={colors.icon}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.text }]}>Badge Text *</Text>
            <TextInput
              style={[styles.formInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
              value={formData.badge || ''}
              onChangeText={text => setFormData(p => ({ ...p, badge: text }))}
              placeholder="e.g., 50% OFF"
              placeholderTextColor={colors.icon}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.text }]}>Description</Text>
            <TextInput
              style={[styles.formInput, styles.textArea, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
              value={formData.description || ''}
              onChangeText={text => setFormData(p => ({ ...p, description: text }))}
              placeholder="Campaign description"
              placeholderTextColor={colors.icon}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Date Range Section */}
          <View style={[styles.dateRangeSection, { borderColor: colors.border }]}>
            <View style={styles.dateRangeTitleRow}>
              <Ionicons name="calendar" size={18} color={colors.tint} />
              <Text style={[styles.dateRangeTitle, { color: colors.text }]}>Campaign Duration</Text>
            </View>

            {/* Start Date/Time */}
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Start Date & Time *</Text>
              <View style={styles.dateTimeRow}>
                <TouchableOpacity
                  style={[styles.datePickerBtn, { backgroundColor: colors.card, borderColor: colors.border, flex: 1.2 }]}
                  onPress={() => setShowStartDatePicker(true)}
                >
                  <Ionicons name="calendar-outline" size={18} color={colors.tint} />
                  <Text style={[styles.datePickerText, { color: colors.text }]}>
                    {formData.startTime ? format(new Date(formData.startTime), 'MMM dd, yyyy') : 'Select date'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.datePickerBtn, { backgroundColor: colors.card, borderColor: colors.border, flex: 0.8 }]}
                  onPress={() => setShowStartTimePicker(true)}
                >
                  <Ionicons name="time-outline" size={18} color={colors.tint} />
                  <Text style={[styles.datePickerText, { color: colors.text }]}>
                    {formData.startTime ? format(new Date(formData.startTime), 'hh:mm a') : 'Select time'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* End Date/Time */}
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>End Date & Time *</Text>
              <View style={styles.dateTimeRow}>
                <TouchableOpacity
                  style={[styles.datePickerBtn, { backgroundColor: colors.card, borderColor: colors.border, flex: 1.2 }]}
                  onPress={() => setShowEndDatePicker(true)}
                >
                  <Ionicons name="calendar-outline" size={18} color={colors.tint} />
                  <Text style={[styles.datePickerText, { color: colors.text }]}>
                    {formData.endTime ? format(new Date(formData.endTime), 'MMM dd, yyyy') : 'Select date'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.datePickerBtn, { backgroundColor: colors.card, borderColor: colors.border, flex: 0.8 }]}
                  onPress={() => setShowEndTimePicker(true)}
                >
                  <Ionicons name="time-outline" size={18} color={colors.tint} />
                  <Text style={[styles.datePickerText, { color: colors.text }]}>
                    {formData.endTime ? format(new Date(formData.endTime), 'hh:mm a') : 'Select time'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Duration hint */}
            {formData.startTime && formData.endTime && (
              <View style={[styles.durationHint, { backgroundColor: `${colors.tint}15` }]}>
                <Ionicons name="information-circle" size={16} color={colors.tint} />
                <Text style={[styles.durationHintText, { color: colors.tint }]}>
                  {(() => {
                    const start = new Date(formData.startTime);
                    const end = new Date(formData.endTime);
                    const diffMs = end.getTime() - start.getTime();
                    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
                    if (diffDays < 0) return 'End date must be after start date';
                    if (diffDays === 0) return 'Campaign runs for less than a day';
                    if (diffDays === 1) return 'Campaign runs for 1 day';
                    return `Campaign runs for ${diffDays} days`;
                  })()}
                </Text>
              </View>
            )}
          </View>

          {/* Date Pickers - Web compatible - Inline inputs */}
          {Platform.OS === 'web' && (showStartDatePicker || showStartTimePicker || showEndDatePicker || showEndTimePicker) && (
            <View style={[styles.webInlineDatePicker, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.webDatePickerHeader}>
                <Ionicons name="calendar" size={20} color={colors.tint} />
                <Text style={[styles.webDatePickerHeaderText, { color: colors.text }]}>
                  {showStartDatePicker ? 'Start Date' : showStartTimePicker ? 'Start Time' : showEndDatePicker ? 'End Date' : 'End Time'}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setShowStartDatePicker(false);
                    setShowStartTimePicker(false);
                    setShowEndDatePicker(false);
                    setShowEndTimePicker(false);
                  }}
                  style={styles.webDatePickerClose}
                >
                  <Ionicons name="close" size={20} color={colors.icon} />
                </TouchableOpacity>
              </View>

              {showStartDatePicker && (
                <input
                  type="date"
                  value={formData.startTime ? new Date(formData.startTime).toISOString().split('T')[0] : ''}
                  onChange={(e) => {
                    const selectedDate = new Date(e.target.value);
                    const currentDate = formData.startTime ? new Date(formData.startTime) : new Date();
                    selectedDate.setHours(currentDate.getHours(), currentDate.getMinutes());
                    setFormData(p => ({ ...p, startTime: selectedDate.toISOString() }));
                    setShowStartDatePicker(false);
                  }}
                  style={{
                    padding: 14,
                    fontSize: 16,
                    borderRadius: 10,
                    border: `2px solid ${colors.tint}`,
                    width: '100%',
                    outline: 'none',
                    fontFamily: 'inherit',
                    cursor: 'pointer'
                  }}
                />
              )}
              {showStartTimePicker && (
                <input
                  type="time"
                  value={formData.startTime ? format(new Date(formData.startTime), 'HH:mm') : ''}
                  onChange={(e) => {
                    const [hours, minutes] = e.target.value.split(':').map(Number);
                    const currentDate = formData.startTime ? new Date(formData.startTime) : new Date();
                    currentDate.setHours(hours, minutes);
                    setFormData(p => ({ ...p, startTime: currentDate.toISOString() }));
                    setShowStartTimePicker(false);
                  }}
                  style={{
                    padding: 14,
                    fontSize: 16,
                    borderRadius: 10,
                    border: `2px solid ${colors.tint}`,
                    width: '100%',
                    outline: 'none',
                    fontFamily: 'inherit',
                    cursor: 'pointer'
                  }}
                />
              )}
              {showEndDatePicker && (
                <input
                  type="date"
                  value={formData.endTime ? new Date(formData.endTime).toISOString().split('T')[0] : ''}
                  onChange={(e) => {
                    const selectedDate = new Date(e.target.value);
                    const currentDate = formData.endTime ? new Date(formData.endTime) : new Date();
                    selectedDate.setHours(currentDate.getHours(), currentDate.getMinutes());
                    setFormData(p => ({ ...p, endTime: selectedDate.toISOString() }));
                    setShowEndDatePicker(false);
                  }}
                  style={{
                    padding: 14,
                    fontSize: 16,
                    borderRadius: 10,
                    border: `2px solid ${colors.tint}`,
                    width: '100%',
                    outline: 'none',
                    fontFamily: 'inherit',
                    cursor: 'pointer'
                  }}
                />
              )}
              {showEndTimePicker && (
                <input
                  type="time"
                  value={formData.endTime ? format(new Date(formData.endTime), 'HH:mm') : ''}
                  onChange={(e) => {
                    const [hours, minutes] = e.target.value.split(':').map(Number);
                    const currentDate = formData.endTime ? new Date(formData.endTime) : new Date();
                    currentDate.setHours(hours, minutes);
                    setFormData(p => ({ ...p, endTime: currentDate.toISOString() }));
                    setShowEndTimePicker(false);
                  }}
                  style={{
                    padding: 14,
                    fontSize: 16,
                    borderRadius: 10,
                    border: `2px solid ${colors.tint}`,
                    width: '100%',
                    outline: 'none',
                    fontFamily: 'inherit',
                    cursor: 'pointer'
                  }}
                />
              )}
            </View>
          )}

          {/* Native Date Pickers for iOS/Android */}
          {Platform.OS !== 'web' && (
            <>
              {/* Native Date Pickers for iOS/Android */}
              {showStartDatePicker && (
                <DateTimePicker
                  value={formData.startTime ? new Date(formData.startTime) : new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleStartDateChange}
                />
              )}
              {showStartTimePicker && (
                <DateTimePicker
                  value={formData.startTime ? new Date(formData.startTime) : new Date()}
                  mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleStartTimeChange}
                />
              )}
              {showEndDatePicker && (
                <DateTimePicker
                  value={formData.endTime ? new Date(formData.endTime) : new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleEndDateChange}
                />
              )}
              {showEndTimePicker && (
                <DateTimePicker
                  value={formData.endTime ? new Date(formData.endTime) : new Date()}
                  mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleEndTimeChange}
                />
              )}
            </>
          )}

          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.text }]}>Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              {CAMPAIGN_TYPES.map(type => (
                <TouchableOpacity
                  key={type.value}
                  style={[
                    styles.chipOption,
                    { borderColor: colors.border },
                    formData.type === type.value && { backgroundColor: colors.tint, borderColor: colors.tint },
                  ]}
                  onPress={() => setFormData(p => ({ ...p, type: type.value }))}
                >
                  <Text
                    style={[
                      styles.chipOptionText,
                      { color: formData.type === type.value ? '#FFF' : colors.text },
                    ]}
                  >
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.text }]}>Region</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              {REGIONS.map(region => (
                <TouchableOpacity
                  key={region.value}
                  style={[
                    styles.chipOption,
                    { borderColor: colors.border },
                    formData.region === region.value && { backgroundColor: colors.tint, borderColor: colors.tint },
                  ]}
                  onPress={() => setFormData(p => ({ ...p, region: region.value }))}
                >
                  <Text
                    style={[
                      styles.chipOptionText,
                      { color: formData.region === region.value ? '#FFF' : colors.text },
                    ]}
                  >
                    {region.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.formRow}>
            <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Priority (0-100)</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                value={String(formData.priority || 50)}
                onChangeText={text => setFormData(p => ({ ...p, priority: parseInt(text) || 50 }))}
                keyboardType="numeric"
                placeholderTextColor={colors.icon}
              />
            </View>
            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Active</Text>
              <View style={[styles.switchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.switchLabel, { color: colors.icon }]}>
                  {formData.isActive !== false ? 'Yes' : 'No'}
                </Text>
                <Switch
                  value={formData.isActive !== false}
                  onValueChange={val => setFormData(p => ({ ...p, isActive: val }))}
                  trackColor={{ true: colors.tint }}
                />
              </View>
            </View>
          </View>

          <View style={styles.formRow}>
            <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Badge BG</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                value={formData.badgeBg || '#FFFFFF'}
                onChangeText={text => setFormData(p => ({ ...p, badgeBg: text }))}
                placeholder="#FFFFFF"
                placeholderTextColor={colors.icon}
              />
            </View>
            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Badge Color</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                value={formData.badgeColor || '#0B2240'}
                onChangeText={text => setFormData(p => ({ ...p, badgeColor: text }))}
                placeholder="#0B2240"
                placeholderTextColor={colors.icon}
              />
            </View>
          </View>

          {/* Campaign Images Section */}
          <View style={[styles.imagesSection, { borderColor: colors.border }]}>
            <View style={styles.imagesSectionHeader}>
              <Ionicons name="images" size={18} color={colors.tint} />
              <Text style={[styles.imagesSectionTitle, { color: colors.text }]}>Campaign Images</Text>
            </View>

            <View style={styles.formGroup}>
              <View style={styles.labelWithUpload}>
                <Text style={[styles.formLabel, { color: colors.text, marginBottom: 0 }]}>Banner Image</Text>
                <TouchableOpacity
                  style={[styles.uploadBtn, { backgroundColor: colors.tint }]}
                  onPress={() => pickAndUploadImage('bannerImage', 'banner')}
                  disabled={isUploading}
                >
                  {isUploading && uploadingField === 'bannerImage' ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <>
                      <Ionicons name="cloud-upload" size={14} color="#FFF" />
                      <Text style={styles.uploadBtnText}>Upload</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
              {formData.bannerImage ? (
                <View style={styles.campaignImagePreview}>
                  <Image
                    source={{ uri: formData.bannerImage }}
                    style={styles.bannerPreview}
                    resizeMode="cover"
                  />
                  <TouchableOpacity
                    style={styles.removeImageBtn}
                    onPress={() => setFormData(p => ({ ...p, bannerImage: '' }))}
                  >
                    <Ionicons name="close-circle" size={24} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ) : null}
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                value={formData.bannerImage || ''}
                onChangeText={text => setFormData(p => ({ ...p, bannerImage: text }))}
                placeholder="https://... or upload above"
                placeholderTextColor={colors.icon}
              />
            </View>

            <View style={styles.formGroup}>
              <View style={styles.labelWithUpload}>
                <Text style={[styles.formLabel, { color: colors.text, marginBottom: 0 }]}>Icon Image</Text>
                <TouchableOpacity
                  style={[styles.uploadBtn, { backgroundColor: colors.tint }]}
                  onPress={() => pickAndUploadImage('icon', 'icon')}
                  disabled={isUploading}
                >
                  {isUploading && uploadingField === 'icon' ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <>
                      <Ionicons name="cloud-upload" size={14} color="#FFF" />
                      <Text style={styles.uploadBtnText}>Upload</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
              {formData.icon ? (
                <View style={styles.campaignImagePreview}>
                  <Image
                    source={{ uri: formData.icon }}
                    style={styles.iconPreview}
                    resizeMode="contain"
                  />
                  <TouchableOpacity
                    style={styles.removeImageBtn}
                    onPress={() => setFormData(p => ({ ...p, icon: '' }))}
                  >
                    <Ionicons name="close-circle" size={24} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ) : null}
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                value={formData.icon || ''}
                onChangeText={text => setFormData(p => ({ ...p, icon: text }))}
                placeholder="https://... or upload above"
                placeholderTextColor={colors.icon}
              />
            </View>
          </View>

          {/* Offer Details Section */}
          <View style={[styles.offerDetailsSection, { borderColor: colors.border }]}>
            <View style={styles.offerDetailsTitleRow}>
              <Ionicons name="gift" size={18} color={colors.tint} />
              <Text style={[styles.offerDetailsTitle, { color: colors.text }]}>Offer Details</Text>
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Min Order Value</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                  value={formData.minOrderValue ? String(formData.minOrderValue) : ''}
                  onChangeText={text => setFormData(p => ({ ...p, minOrderValue: text ? parseInt(text) : undefined }))}
                  keyboardType="numeric"
                  placeholder="e.g., 500"
                  placeholderTextColor={colors.icon}
                />
              </View>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Max Benefit</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                  value={formData.maxBenefit ? String(formData.maxBenefit) : ''}
                  onChangeText={text => setFormData(p => ({ ...p, maxBenefit: text ? parseInt(text) : undefined }))}
                  keyboardType="numeric"
                  placeholder="e.g., 200"
                  placeholderTextColor={colors.icon}
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Eligible Categories (comma separated)</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                value={(formData.eligibleCategories || []).join(', ')}
                onChangeText={text => setFormData(p => ({
                  ...p,
                  eligibleCategories: text ? text.split(',').map(s => s.trim()).filter(Boolean) : []
                }))}
                placeholder="e.g., Food, Fashion, Electronics"
                placeholderTextColor={colors.icon}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Terms & Conditions (one per line)</Text>
              <TextInput
                style={[styles.formInput, styles.multilineInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                value={(formData.terms || []).join('\n')}
                onChangeText={text => setFormData(p => ({
                  ...p,
                  terms: text ? text.split('\n').filter(Boolean) : []
                }))}
                placeholder="Enter each term on a new line..."
                placeholderTextColor={colors.icon}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* Deals Section */}
          {editingCampaign && (
            <View style={[styles.dealsSection, { borderTopColor: colors.border }]}>
              <View style={styles.dealsSectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Deals ({formData.deals?.length || 0})
                </Text>
                <TouchableOpacity
                  style={[styles.addDealBtn, { backgroundColor: colors.tint }]}
                  onPress={handleAddDeal}
                >
                  <Ionicons name="add" size={18} color="#FFF" />
                  <Text style={styles.addDealBtnText}>Add</Text>
                </TouchableOpacity>
              </View>

              {formData.deals?.map((deal, index) => (
                <View key={index} style={[styles.dealItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  {/* Deal Image */}
                  {deal.image ? (
                    <Image
                      source={{ uri: deal.image }}
                      style={styles.dealItemImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.dealItemImagePlaceholder, { backgroundColor: colors.border }]}>
                      <Ionicons name="image-outline" size={20} color={colors.icon} />
                    </View>
                  )}

                  <View style={styles.dealItemInfo}>
                    <Text style={[styles.dealItemStore, { color: colors.text }]} numberOfLines={1}>
                      {deal.store || 'No store name'}
                    </Text>
                    <View style={styles.dealItemBenefits}>
                      {deal.cashback && <Text style={styles.dealItemBenefit}>CB: {deal.cashback}</Text>}
                      {deal.coins && <Text style={styles.dealItemBenefit}>Coins: {deal.coins}</Text>}
                      {deal.discount && <Text style={styles.dealItemBenefit}>Disc: {deal.discount}</Text>}
                      {deal.bonus && <Text style={styles.dealItemBenefit}>Bonus: {deal.bonus}</Text>}
                      {deal.drop && <Text style={styles.dealItemBenefit}>Drop: {deal.drop}</Text>}
                    </View>
                    {deal.endsIn && (
                      <Text style={[styles.dealEndsIn, { color: colors.icon }]}>Ends: {deal.endsIn}</Text>
                    )}
                    {/* Show linked store status */}
                    {deal.storeId ? (
                      <View style={styles.dealLinkedStore}>
                        <Ionicons name="link" size={10} color="#10B981" />
                        <Text style={styles.dealLinkedStoreText}>Store linked</Text>
                      </View>
                    ) : (
                      <View style={styles.dealUnlinkedStore}>
                        <Ionicons name="warning" size={10} color="#F59E0B" />
                        <Text style={styles.dealUnlinkedStoreText}>No store linked</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.dealItemActions}>
                    <TouchableOpacity
                      style={[styles.dealActionBtn, { backgroundColor: '#3B82F615' }]}
                      onPress={() => handleEditDeal(deal, index)}
                    >
                      <Ionicons name="pencil" size={16} color="#3B82F6" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.dealActionBtn, { backgroundColor: '#EF444415' }]}
                      onPress={() => handleRemoveDeal(index)}
                    >
                      <Ionicons name="trash" size={16} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  const renderDealModal = () => (
    <Modal visible={showDealModal} transparent animationType="fade">
      <View style={styles.dealModalOverlay}>
        <ScrollView contentContainerStyle={styles.dealModalScrollContent}>
          <View style={[styles.dealModalContent, { backgroundColor: colors.card }]}>
            <View style={styles.dealModalHeader}>
              <Text style={[styles.dealModalTitle, { color: colors.text }]}>
                {editingDealIndex !== null ? 'Edit Deal' : 'Add New Deal'}
              </Text>
              <TouchableOpacity onPress={() => { setShowDealModal(false); setEditingDealIndex(null); }}>
                <Ionicons name="close" size={24} color={colors.icon} />
              </TouchableOpacity>
            </View>

            {/* Image Upload Section */}
            <View style={styles.formGroup}>
              <View style={styles.labelWithUpload}>
                <Text style={[styles.formLabel, { color: colors.text, marginBottom: 0 }]}>Deal Image *</Text>
                <TouchableOpacity
                  style={[styles.uploadBtn, { backgroundColor: colors.tint }]}
                  onPress={() => pickAndUploadImage('dealImage', 'deal')}
                  disabled={isUploading}
                >
                  {isUploading && uploadingField === 'dealImage' ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <>
                      <Ionicons name="cloud-upload" size={14} color="#FFF" />
                      <Text style={styles.uploadBtnText}>Upload</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {/* Image Preview */}
              {dealFormData.image ? (
                <View style={styles.imagePreviewContainer}>
                  <Image
                    source={{ uri: dealFormData.image }}
                    style={styles.imagePreview}
                    resizeMode="cover"
                  />
                  <TouchableOpacity
                    style={styles.removeImageBtn}
                    onPress={() => setDealFormData(p => ({ ...p, image: '' }))}
                  >
                    <Ionicons name="close-circle" size={24} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.imagePlaceholder, { backgroundColor: colors.background, borderColor: colors.border }]}
                  onPress={() => pickAndUploadImage('dealImage', 'deal')}
                  disabled={isUploading}
                >
                  <Ionicons name="image-outline" size={40} color={colors.icon} />
                  <Text style={[styles.imagePlaceholderText, { color: colors.icon }]}>
                    Tap to upload or enter URL below
                  </Text>
                </TouchableOpacity>
              )}

              <TextInput
                style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border, marginTop: 8 }]}
                value={dealFormData.image}
                onChangeText={text => setDealFormData(p => ({ ...p, image: text }))}
                placeholder="https://... or upload above"
                placeholderTextColor={colors.icon}
              />
            </View>

            {/* Store Selection */}
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Link to Store</Text>
              <TouchableOpacity
                style={[styles.storeSelectBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
                onPress={() => setShowStoreSelector(true)}
              >
                {dealFormData.storeId ? (
                  <View style={styles.selectedStoreInfo}>
                    <Ionicons name="storefront" size={18} color={colors.tint} />
                    <Text style={[styles.selectedStoreName, { color: colors.text }]} numberOfLines={1}>
                      {stores.find(s => s._id === dealFormData.storeId)?.name || dealFormData.store || 'Store selected'}
                    </Text>
                    <TouchableOpacity
                      onPress={() => setDealFormData(p => ({ ...p, storeId: undefined }))}
                      style={styles.clearStoreBtn}
                    >
                      <Ionicons name="close-circle" size={20} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.selectStorePlaceholder}>
                    <Ionicons name="add-circle-outline" size={18} color={colors.icon} />
                    <Text style={[styles.selectStorePlaceholderText, { color: colors.icon }]}>
                      Select a store (optional)
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
              {dealFormData.storeId && (
                <View style={[styles.linkedStoreHint, { backgroundColor: `${colors.tint}15` }]}>
                  <Ionicons name="checkmark-circle" size={14} color={colors.tint} />
                  <Text style={[styles.linkedStoreHintText, { color: colors.tint }]}>
                    Store linked - users can visit this store from the deal
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Store Name (Display)</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                value={dealFormData.store || ''}
                onChangeText={text => setDealFormData(p => ({ ...p, store: text }))}
                placeholder="Store name shown on deal"
                placeholderTextColor={colors.icon}
              />
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Cashback</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  value={dealFormData.cashback || ''}
                  onChangeText={text => setDealFormData(p => ({ ...p, cashback: text }))}
                  placeholder="e.g., 20%"
                  placeholderTextColor={colors.icon}
                />
              </View>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Coins</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  value={dealFormData.coins || ''}
                  onChangeText={text => setDealFormData(p => ({ ...p, coins: text }))}
                  placeholder="e.g., 3X"
                  placeholderTextColor={colors.icon}
                />
              </View>
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Discount</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  value={dealFormData.discount || ''}
                  onChangeText={text => setDealFormData(p => ({ ...p, discount: text }))}
                  placeholder="e.g., 50% OFF"
                  placeholderTextColor={colors.icon}
                />
              </View>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Bonus</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  value={dealFormData.bonus || ''}
                  onChangeText={text => setDealFormData(p => ({ ...p, bonus: text }))}
                  placeholder="e.g., Extra 10%"
                  placeholderTextColor={colors.icon}
                />
              </View>
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Drop</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  value={dealFormData.drop || ''}
                  onChangeText={text => setDealFormData(p => ({ ...p, drop: text }))}
                  placeholder="e.g., 500 coins"
                  placeholderTextColor={colors.icon}
                />
              </View>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Ends In</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  value={dealFormData.endsIn || ''}
                  onChangeText={text => setDealFormData(p => ({ ...p, endsIn: text }))}
                  placeholder="e.g., 2 days"
                  placeholderTextColor={colors.icon}
                />
              </View>
            </View>

            {/* Deal Price - FREE or PAID */}
            <View style={[styles.formGroup, { marginTop: 12 }]}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Deal Type</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                <TouchableOpacity
                  style={[
                    styles.dealTypeBtn,
                    {
                      backgroundColor: !dealFormData.price || dealFormData.price === 0 ? colors.tint : colors.background,
                      borderColor: colors.tint,
                    }
                  ]}
                  onPress={() => setDealFormData(p => ({ ...p, price: 0 }))}
                >
                  <Ionicons
                    name="gift-outline"
                    size={16}
                    color={!dealFormData.price || dealFormData.price === 0 ? '#FFF' : colors.tint}
                  />
                  <Text style={{
                    color: !dealFormData.price || dealFormData.price === 0 ? '#FFF' : colors.tint,
                    marginLeft: 6,
                    fontWeight: '600',
                  }}>
                    FREE
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.dealTypeBtn,
                    {
                      backgroundColor: dealFormData.price && dealFormData.price > 0 ? colors.tint : colors.background,
                      borderColor: colors.tint,
                      marginLeft: 12,
                    }
                  ]}
                  onPress={() => setDealFormData(p => ({ ...p, price: p.price && p.price > 0 ? p.price : 99 }))}
                >
                  <Ionicons
                    name="pricetag-outline"
                    size={16}
                    color={dealFormData.price && dealFormData.price > 0 ? '#FFF' : colors.tint}
                  />
                  <Text style={{
                    color: dealFormData.price && dealFormData.price > 0 ? '#FFF' : colors.tint,
                    marginLeft: 6,
                    fontWeight: '600',
                  }}>
                    PAID
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Price input - only show if PAID is selected */}
            {dealFormData.price !== undefined && dealFormData.price > 0 && (
              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1, marginRight: 12 }]}>
                  <Text style={[styles.formLabel, { color: colors.text }]}>Price</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                    value={dealFormData.price?.toString() || ''}
                    onChangeText={text => setDealFormData(p => ({ ...p, price: parseInt(text) || 0 }))}
                    placeholder="e.g., 99"
                    placeholderTextColor={colors.icon}
                    keyboardType="numeric"
                  />
                </View>
                <View style={[styles.formGroup, { flex: 1.5 }]}>
                  <Text style={[styles.formLabel, { color: colors.text }]}>Currency</Text>
                  <View style={{ flexDirection: 'row', marginTop: 4, flexWrap: 'wrap', gap: 4 }}>
                    {(['INR', 'AED', 'USD'] as const).map((curr) => (
                      <TouchableOpacity
                        key={curr}
                        style={[
                          styles.currencyBtn,
                          {
                            backgroundColor: (dealFormData.currency || 'INR') === curr ? colors.tint : colors.background,
                            borderColor: colors.border,
                          }
                        ]}
                        onPress={() => setDealFormData(p => ({ ...p, currency: curr }))}
                      >
                        <Text style={{
                          color: (dealFormData.currency || 'INR') === curr ? '#FFF' : colors.text,
                          fontSize: 12,
                          fontWeight: '600',
                        }}>
                          {curr}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
            )}

            {/* Redemption Limit (optional) */}
            <View style={[styles.formGroup, { marginTop: 12 }]}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Redemption Limit (0 = unlimited)</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                value={dealFormData.purchaseLimit?.toString() || '0'}
                onChangeText={text => setDealFormData(p => ({ ...p, purchaseLimit: parseInt(text) || 0 }))}
                placeholder="0"
                placeholderTextColor={colors.icon}
                keyboardType="numeric"
              />
              {dealFormData.purchaseCount !== undefined && dealFormData.purchaseCount > 0 && (
                <Text style={{ color: colors.icon, fontSize: 12, marginTop: 4 }}>
                  {dealFormData.purchaseCount} redeemed so far
                </Text>
              )}
            </View>

            <View style={styles.dealModalButtons}>
              <TouchableOpacity
                style={[styles.dealModalBtn, styles.dealModalCancelBtn, { borderColor: colors.border }]}
                onPress={() => { setShowDealModal(false); setEditingDealIndex(null); }}
              >
                <Text style={[styles.dealModalBtnText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dealModalBtn, styles.dealModalSaveBtn, { backgroundColor: colors.tint }]}
                onPress={handleSaveDeal}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={[styles.dealModalBtnText, { color: '#FFF' }]}>
                    {editingDealIndex !== null ? 'Update Deal' : 'Add Deal'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );

  if (isLoading && campaigns.length === 0) {
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
      {renderStatsCard()}
      {renderSearchAndFilter()}
      {renderTabs()}

      <FlatList
        data={campaigns}
        renderItem={renderCampaignItem}
        keyExtractor={item => item._id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          hasMore ? <ActivityIndicator style={{ padding: 16 }} color={colors.tint} /> : <View style={{ height: 20 }} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="megaphone-outline" size={56} color={colors.icon} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No campaigns</Text>
            <Text style={[styles.emptyText, { color: colors.icon }]}>
              Create your first campaign to get started
            </Text>
          </View>
        }
      />

      {renderFormModal()}
      {renderDealModal()}
      {renderStoreSelector()}
    </SafeAreaView>
  );

  function renderStoreSelector() {
    const filteredStores = stores.filter(store =>
      store.name.toLowerCase().includes(storeSearchQuery.toLowerCase())
    );

    return (
      <Modal visible={showStoreSelector} transparent animationType="fade">
        <View style={styles.storeSelectorOverlay}>
          <View style={[styles.storeSelectorContent, { backgroundColor: colors.card }]}>
            <View style={styles.storeSelectorHeader}>
              <Text style={[styles.storeSelectorTitle, { color: colors.text }]}>Select Store</Text>
              <TouchableOpacity onPress={() => setShowStoreSelector(false)}>
                <Ionicons name="close" size={24} color={colors.icon} />
              </TouchableOpacity>
            </View>

            {/* Search */}
            <View style={[styles.storeSearchBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Ionicons name="search" size={18} color={colors.icon} />
              <TextInput
                style={[styles.storeSearchInput, { color: colors.text }]}
                value={storeSearchQuery}
                onChangeText={setStoreSearchQuery}
                placeholder="Search stores..."
                placeholderTextColor={colors.icon}
              />
              {storeSearchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setStoreSearchQuery('')}>
                  <Ionicons name="close-circle" size={18} color={colors.icon} />
                </TouchableOpacity>
              )}
            </View>

            {/* Store List */}
            <ScrollView style={styles.storeList} showsVerticalScrollIndicator={false}>
              {storesLoading ? (
                <View style={styles.storesLoadingContainer}>
                  <ActivityIndicator size="large" color={colors.tint} />
                </View>
              ) : filteredStores.length === 0 ? (
                <View style={styles.noStoresContainer}>
                  <Ionicons name="storefront-outline" size={48} color={colors.icon} />
                  <Text style={[styles.noStoresText, { color: colors.icon }]}>No stores found</Text>
                </View>
              ) : (
                filteredStores.map((store) => (
                  <TouchableOpacity
                    key={store._id}
                    style={[
                      styles.storeListItem,
                      { borderColor: colors.border },
                      dealFormData.storeId === store._id && { backgroundColor: `${colors.tint}15`, borderColor: colors.tint }
                    ]}
                    onPress={() => {
                      setDealFormData(p => ({
                        ...p,
                        storeId: store._id,
                        store: p.store || store.name, // Set store name if empty
                      }));
                      setShowStoreSelector(false);
                      setStoreSearchQuery('');
                    }}
                  >
                    {store.logo ? (
                      <Image source={{ uri: store.logo }} style={styles.storeListItemImage} />
                    ) : (
                      <View style={[styles.storeListItemImagePlaceholder, { backgroundColor: colors.border }]}>
                        <Ionicons name="storefront" size={20} color={colors.icon} />
                      </View>
                    )}
                    <View style={styles.storeListItemInfo}>
                      <Text style={[styles.storeListItemName, { color: colors.text }]} numberOfLines={1}>
                        {store.name}
                      </Text>
                      {store.category && (
                        <Text style={[styles.storeListItemCategory, { color: colors.icon }]}>
                          {store.category}
                        </Text>
                      )}
                    </View>
                    {dealFormData.storeId === store._id && (
                      <Ionicons name="checkmark-circle" size={22} color={colors.tint} />
                    )}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  }
}

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
    color: '#FFF',
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
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
  },
  // Search
  searchFilterContainer: {
    paddingHorizontal: 16,
    marginBottom: 12,
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
  // Tabs
  tabsWrapper: {
    marginBottom: 12,
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
    fontWeight: '600',
  },
  // Campaign Card
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  card: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 6,
  },
  typeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  typeLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  statusLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 3,
  },
  cardSubtitle: {
    fontSize: 13,
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    fontWeight: '500',
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    marginBottom: 10,
  },
  dateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 11,
  },
  priorityBadge: {
    fontSize: 10,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  expiredBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF3C7',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 10,
    gap: 6,
  },
  expiredBannerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#D97706',
  },
  actionIconBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Empty state
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
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
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
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
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    fontSize: 14,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  formRow: {
    flexDirection: 'row',
  },
  // Date Range Section
  dateRangeSection: {
    marginBottom: 16,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  dateRangeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  dateRangeTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  datePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  datePickerText: {
    fontSize: 14,
    fontWeight: '500',
  },
  durationHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 4,
  },
  durationHintText: {
    fontSize: 12,
    fontWeight: '500',
  },
  chipScroll: {
    marginTop: 4,
  },
  chipOption: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
  },
  chipOptionText: {
    fontSize: 13,
    fontWeight: '500',
  },
  switchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  switchLabel: {
    fontSize: 14,
  },
  // Deals Section
  dealsSection: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  dealsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  addDealBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    gap: 4,
  },
  addDealBtnText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 13,
  },
  dealItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
  },
  dealItemImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
  },
  dealItemImagePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dealItemInfo: {
    flex: 1,
  },
  dealItemStore: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  dealItemBenefits: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  dealItemBenefit: {
    fontSize: 10,
    color: '#6B7280',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  dealEndsIn: {
    fontSize: 10,
    marginTop: 4,
  },
  dealItemActions: {
    flexDirection: 'column',
    gap: 6,
  },
  dealActionBtn: {
    padding: 8,
    borderRadius: 6,
  },
  removeDealBtn: {
    padding: 4,
  },
  // Offer Details Section
  offerDetailsSection: {
    marginBottom: 16,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  offerDetailsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  offerDetailsTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  multilineInput: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: 10,
  },
  // Images Section
  imagesSection: {
    marginBottom: 16,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  imagesSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  imagesSectionTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  labelWithUpload: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  uploadBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  imagePlaceholder: {
    height: 140,
    borderRadius: 10,
    borderWidth: 2,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  imagePlaceholderText: {
    fontSize: 12,
    textAlign: 'center',
  },
  campaignImagePreview: {
    marginBottom: 10,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  bannerPreview: {
    width: '100%',
    height: 120,
    borderRadius: 10,
  },
  iconPreview: {
    width: 60,
    height: 60,
    borderRadius: 10,
  },
  removeImageBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FFF',
    borderRadius: 12,
  },
  // Deal Modal
  dealModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
  },
  dealModalScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  dealModalContent: {
    borderRadius: 16,
    padding: 20,
  },
  imagePreviewContainer: {
    marginBottom: 12,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: 140,
    borderRadius: 10,
  },
  dealModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  dealModalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  dealModalButtons: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 12,
  },
  dealModalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  dealModalCancelBtn: {
    borderWidth: 1,
  },
  dealModalSaveBtn: {},
  dealModalBtnText: {
    fontWeight: '600',
    fontSize: 14,
  },
  dealTypeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  currencyBtn: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    minWidth: 40,
  },
  // Web Date Picker styles - Inline
  webInlineDatePicker: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  webDatePickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  webDatePickerHeaderText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  webDatePickerClose: {
    padding: 4,
  },
  // Store Selection Styles
  storeSelectBtn: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
  },
  selectedStoreInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectedStoreName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  clearStoreBtn: {
    padding: 2,
  },
  selectStorePlaceholder: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectStorePlaceholderText: {
    fontSize: 14,
  },
  linkedStoreHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  linkedStoreHintText: {
    fontSize: 11,
    fontWeight: '500',
  },
  // Store Selector Modal
  storeSelectorOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  storeSelectorContent: {
    borderRadius: 16,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  storeSelectorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  storeSelectorTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  storeSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  storeSearchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  storeList: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    maxHeight: 400,
  },
  storesLoadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  noStoresContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 8,
  },
  noStoresText: {
    fontSize: 14,
  },
  storeListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
    gap: 12,
  },
  storeListItemImage: {
    width: 44,
    height: 44,
    borderRadius: 8,
  },
  storeListItemImagePlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  storeListItemInfo: {
    flex: 1,
  },
  storeListItemName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  storeListItemCategory: {
    fontSize: 12,
  },
  // Deal linked store status
  dealLinkedStore: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  dealLinkedStoreText: {
    fontSize: 9,
    color: '#10B981',
    fontWeight: '500',
  },
  dealUnlinkedStore: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  dealUnlinkedStoreText: {
    fontSize: 9,
    color: '#F59E0B',
    fontWeight: '500',
  },
});
