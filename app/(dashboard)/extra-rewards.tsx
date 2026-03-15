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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { extraRewardsService, DoubleCashbackCampaign, CoinDrop, StoreOption } from '../../services/api/extraRewards';
import { Colors } from '../../constants/Colors';
import { format } from 'date-fns';
import { showAlert, showConfirm } from '../../utils/alert';

type TabType = 'campaigns' | 'coinDrops';
type StatusType = 'running' | 'upcoming' | 'expired' | 'inactive';

const STATUS_COLORS: Record<StatusType, string> = {
  running: Colors.light.success,
  upcoming: Colors.light.info,
  expired: Colors.light.error,
  inactive: Colors.light.slateMedium,
};

const STATUS_ICONS: Record<StatusType, string> = {
  running: 'radio-button-on',
  upcoming: 'time',
  expired: 'close-circle',
  inactive: 'pause-circle',
};

function getStatus(item: { isActive: boolean; startTime: string; endTime: string }): StatusType {
  const now = new Date();
  const start = new Date(item.startTime);
  const end = new Date(item.endTime);
  if (!item.isActive) return 'inactive';
  if (now < start) return 'upcoming';
  if (now > end) return 'expired';
  return 'running';
}

function formatDate(dateString: string): string {
  try {
    return format(new Date(dateString), 'MMM dd, yyyy HH:mm');
  } catch {
    return dateString;
  }
}

function formatDateShort(dateString: string): string {
  try {
    return format(new Date(dateString), 'MMM dd, HH:mm');
  } catch {
    return dateString;
  }
}

// Default form values
const DEFAULT_CAMPAIGN_FORM: Partial<DoubleCashbackCampaign> = {
  title: '',
  subtitle: '',
  description: '',
  multiplier: 2,
  startTime: new Date().toISOString(),
  endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  eligibleStoreNames: [],
  eligibleCategories: [],
  terms: [],
  minOrderValue: undefined,
  maxCashback: undefined,
  backgroundColor: Colors.light.warningLight,
  icon: 'flash',
  priority: 0,
  isActive: true,
};

interface CoinDropFormData {
  storeId: string;
  multiplier: number;
  normalCashback: number;
  category: string;
  startTime: string;
  endTime: string;
  minOrderValue?: number;
  maxCashback?: number;
  priority: number;
  isActive: boolean;
}

const DEFAULT_COINDROP_FORM: CoinDropFormData = {
  storeId: '',
  multiplier: 2,
  normalCashback: 0,
  category: '',
  startTime: new Date().toISOString(),
  endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  minOrderValue: undefined,
  maxCashback: undefined,
  priority: 0,
  isActive: true,
};

export default function ExtraRewardsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [activeTab, setActiveTab] = useState<TabType>('campaigns');

  // Campaign state
  const [campaigns, setCampaigns] = useState<DoubleCashbackCampaign[]>([]);
  const [campaignsLoading, setCampaignsLoading] = useState(true);
  const [campaignsRefreshing, setCampaignsRefreshing] = useState(false);
  const [campaignsPage, setCampaignsPage] = useState(1);
  const [campaignsHasMore, setCampaignsHasMore] = useState(true);

  // Coin Drops state
  const [coinDrops, setCoinDrops] = useState<CoinDrop[]>([]);
  const [coinDropsLoading, setCoinDropsLoading] = useState(true);
  const [coinDropsRefreshing, setCoinDropsRefreshing] = useState(false);
  const [coinDropsPage, setCoinDropsPage] = useState(1);
  const [coinDropsHasMore, setCoinDropsHasMore] = useState(true);

  // Modal state
  const [showFormModal, setShowFormModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Campaign form
  const [editingCampaign, setEditingCampaign] = useState<DoubleCashbackCampaign | null>(null);
  const [campaignForm, setCampaignForm] = useState<Partial<DoubleCashbackCampaign>>(DEFAULT_CAMPAIGN_FORM);

  // CoinDrop form
  const [editingCoinDrop, setEditingCoinDrop] = useState<CoinDrop | null>(null);
  const [coinDropForm, setCoinDropForm] = useState<CoinDropFormData>(DEFAULT_COINDROP_FORM);

  // Store search for coin drops
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [storesLoading, setStoresLoading] = useState(false);
  const [storeSearchQuery, setStoreSearchQuery] = useState('');
  const [showStoreDropdown, setShowStoreDropdown] = useState(false);
  const [selectedStore, setSelectedStore] = useState<StoreOption | null>(null);

  // ==========================================
  // Data Loading
  // ==========================================

  useEffect(() => {
    if (activeTab === 'campaigns') {
      loadCampaigns();
    } else {
      loadCoinDrops();
    }
  }, [activeTab]);

  const loadCampaigns = useCallback(async (pageNum: number = 1, append: boolean = false) => {
    try {
      if (!append) setCampaignsLoading(true);
      const data = await extraRewardsService.getCampaigns({ page: pageNum, limit: 20 });

      if (append) {
        setCampaigns(prev => [...prev, ...data.campaigns]);
      } else {
        setCampaigns(data.campaigns);
      }

      setCampaignsHasMore(data.pagination.hasNext);
      setCampaignsPage(pageNum);
    } catch (error: any) {
      console.error('Failed to load campaigns:', error);
      showAlert('Error', error.message || 'Failed to load campaigns');
    } finally {
      setCampaignsLoading(false);
    }
  }, []);

  const loadCoinDrops = useCallback(async (pageNum: number = 1, append: boolean = false) => {
    try {
      if (!append) setCoinDropsLoading(true);
      const data = await extraRewardsService.getCoinDrops({ page: pageNum, limit: 20 });

      if (append) {
        setCoinDrops(prev => [...prev, ...data.coinDrops]);
      } else {
        setCoinDrops(data.coinDrops);
      }

      setCoinDropsHasMore(data.pagination.hasNext);
      setCoinDropsPage(pageNum);
    } catch (error: any) {
      console.error('Failed to load coin drops:', error);
      showAlert('Error', error.message || 'Failed to load coin drops');
    } finally {
      setCoinDropsLoading(false);
    }
  }, []);

  const loadStores = useCallback(async (search?: string) => {
    setStoresLoading(true);
    try {
      const data = await extraRewardsService.getCoinDropStores(search);
      setStores(data);
    } catch (error) {
      console.error('Failed to load stores:', error);
    } finally {
      setStoresLoading(false);
    }
  }, []);

  const onRefreshCampaigns = useCallback(async () => {
    setCampaignsRefreshing(true);
    await loadCampaigns(1);
    setCampaignsRefreshing(false);
  }, [loadCampaigns]);

  const onRefreshCoinDrops = useCallback(async () => {
    setCoinDropsRefreshing(true);
    await loadCoinDrops(1);
    setCoinDropsRefreshing(false);
  }, [loadCoinDrops]);

  const loadMoreCampaigns = useCallback(() => {
    if (!campaignsLoading && campaignsHasMore) {
      loadCampaigns(campaignsPage + 1, true);
    }
  }, [campaignsLoading, campaignsHasMore, campaignsPage, loadCampaigns]);

  const loadMoreCoinDrops = useCallback(() => {
    if (!coinDropsLoading && coinDropsHasMore) {
      loadCoinDrops(coinDropsPage + 1, true);
    }
  }, [coinDropsLoading, coinDropsHasMore, coinDropsPage, loadCoinDrops]);

  // ==========================================
  // Stats computation
  // ==========================================

  const campaignStats = {
    total: campaigns.length,
    active: campaigns.filter(c => c.isActive).length,
    running: campaigns.filter(c => getStatus(c) === 'running').length,
  };

  const coinDropStats = {
    total: coinDrops.length,
    active: coinDrops.filter(c => c.isActive).length,
    running: coinDrops.filter(c => getStatus(c) === 'running').length,
  };

  const stats = activeTab === 'campaigns' ? campaignStats : coinDropStats;

  // ==========================================
  // Campaign Handlers
  // ==========================================

  const handleCreateNew = useCallback(() => {
    if (activeTab === 'campaigns') {
      setEditingCampaign(null);
      setCampaignForm({ ...DEFAULT_CAMPAIGN_FORM });
    } else {
      setEditingCoinDrop(null);
      setCoinDropForm({ ...DEFAULT_COINDROP_FORM });
      setSelectedStore(null);
      loadStores();
    }
    setShowFormModal(true);
  }, [activeTab, loadStores]);

  const handleEditCampaign = useCallback((campaign: DoubleCashbackCampaign) => {
    setEditingCampaign(campaign);
    setCampaignForm({ ...campaign });
    setShowFormModal(true);
  }, []);

  const handleEditCoinDrop = useCallback((coinDrop: CoinDrop) => {
    setEditingCoinDrop(coinDrop);
    const storeId = typeof coinDrop.storeId === 'string' ? coinDrop.storeId : coinDrop.storeId?._id || '';
    setCoinDropForm({
      storeId,
      multiplier: coinDrop.multiplier,
      normalCashback: coinDrop.normalCashback,
      category: coinDrop.category,
      startTime: coinDrop.startTime,
      endTime: coinDrop.endTime,
      minOrderValue: coinDrop.minOrderValue,
      maxCashback: coinDrop.maxCashback,
      priority: coinDrop.priority,
      isActive: coinDrop.isActive,
    });
    setSelectedStore({
      _id: storeId,
      name: coinDrop.storeName,
      logo: coinDrop.storeLogo,
    });
    loadStores();
    setShowFormModal(true);
  }, [loadStores]);

  const handleSaveCampaign = useCallback(async () => {
    if (!campaignForm.title || !campaignForm.subtitle) {
      showAlert('Error', 'Please fill in title and subtitle');
      return;
    }
    if (!campaignForm.multiplier || campaignForm.multiplier < 1) {
      showAlert('Error', 'Multiplier must be at least 1');
      return;
    }
    if (!campaignForm.startTime || !campaignForm.endTime) {
      showAlert('Error', 'Please set both start and end dates');
      return;
    }
    const startDate = new Date(campaignForm.startTime);
    const endDate = new Date(campaignForm.endTime);
    if (endDate <= startDate) {
      showAlert('Error', 'End date must be after start date');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        title: campaignForm.title!,
        subtitle: campaignForm.subtitle!,
        multiplier: campaignForm.multiplier!,
        startTime: campaignForm.startTime!,
        endTime: campaignForm.endTime!,
        description: campaignForm.description,
        eligibleStoreNames: campaignForm.eligibleStoreNames,
        eligibleCategories: campaignForm.eligibleCategories,
        terms: campaignForm.terms,
        minOrderValue: campaignForm.minOrderValue,
        maxCashback: campaignForm.maxCashback,
        backgroundColor: campaignForm.backgroundColor,
        icon: campaignForm.icon,
        priority: campaignForm.priority,
      };

      if (editingCampaign) {
        await extraRewardsService.updateCampaign(editingCampaign._id, payload);
        showAlert('Success', 'Campaign updated successfully');
      } else {
        await extraRewardsService.createCampaign(payload);
        showAlert('Success', 'Campaign created successfully');
      }

      setShowFormModal(false);
      await loadCampaigns(1);
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to save campaign');
    } finally {
      setIsSaving(false);
    }
  }, [campaignForm, editingCampaign, loadCampaigns]);

  const handleSaveCoinDrop = useCallback(async () => {
    if (!coinDropForm.storeId) {
      showAlert('Error', 'Please select a store');
      return;
    }
    if (!coinDropForm.multiplier || coinDropForm.multiplier < 1) {
      showAlert('Error', 'Multiplier must be at least 1');
      return;
    }
    if (coinDropForm.normalCashback === undefined || coinDropForm.normalCashback < 0) {
      showAlert('Error', 'Please enter normal cashback amount');
      return;
    }
    if (!coinDropForm.category) {
      showAlert('Error', 'Please enter a category');
      return;
    }
    if (!coinDropForm.startTime || !coinDropForm.endTime) {
      showAlert('Error', 'Please set both start and end dates');
      return;
    }
    const startDate = new Date(coinDropForm.startTime);
    const endDate = new Date(coinDropForm.endTime);
    if (endDate <= startDate) {
      showAlert('Error', 'End date must be after start date');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        storeId: coinDropForm.storeId,
        multiplier: coinDropForm.multiplier,
        normalCashback: coinDropForm.normalCashback,
        category: coinDropForm.category,
        startTime: coinDropForm.startTime,
        endTime: coinDropForm.endTime,
        minOrderValue: coinDropForm.minOrderValue,
        maxCashback: coinDropForm.maxCashback,
        priority: coinDropForm.priority,
      };

      if (editingCoinDrop) {
        await extraRewardsService.updateCoinDrop(editingCoinDrop._id, payload);
        showAlert('Success', 'Coin drop updated successfully');
      } else {
        await extraRewardsService.createCoinDrop(payload);
        showAlert('Success', 'Coin drop created successfully');
      }

      setShowFormModal(false);
      await loadCoinDrops(1);
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to save coin drop');
    } finally {
      setIsSaving(false);
    }
  }, [coinDropForm, editingCoinDrop, loadCoinDrops]);

  const handleToggleCampaign = useCallback(async (campaign: DoubleCashbackCampaign) => {
    // Optimistic update
    const prevCampaigns = [...campaigns];
    setCampaigns(prev =>
      prev.map(c => c._id === campaign._id ? { ...c, isActive: !c.isActive } : c)
    );
    try {
      await extraRewardsService.toggleCampaign(campaign._id);
    } catch (error: any) {
      setCampaigns(prevCampaigns);
      showAlert('Error', error.message || 'Failed to toggle campaign');
    }
  }, [campaigns]);

  const handleToggleCoinDrop = useCallback(async (coinDrop: CoinDrop) => {
    // Optimistic update
    const prevDrops = [...coinDrops];
    setCoinDrops(prev =>
      prev.map(c => c._id === coinDrop._id ? { ...c, isActive: !c.isActive } : c)
    );
    try {
      await extraRewardsService.toggleCoinDrop(coinDrop._id);
    } catch (error: any) {
      setCoinDrops(prevDrops);
      showAlert('Error', error.message || 'Failed to toggle coin drop');
    }
  }, [coinDrops]);

  const handleDeleteCampaign = useCallback((campaign: DoubleCashbackCampaign) => {
    showConfirm(
      'Delete Campaign',
      `Are you sure you want to delete "${campaign.title}"?`,
      async () => {
        try {
          await extraRewardsService.deleteCampaign(campaign._id);
          showAlert('Success', 'Campaign deleted');
          await loadCampaigns(1);
        } catch (error: any) {
          showAlert('Error', error.message || 'Failed to delete campaign');
        }
      },
      'Delete'
    );
  }, [loadCampaigns]);

  const handleDeleteCoinDrop = useCallback((coinDrop: CoinDrop) => {
    showConfirm(
      'Delete Coin Drop',
      `Are you sure you want to delete this coin drop for "${coinDrop.storeName}"?`,
      async () => {
        try {
          await extraRewardsService.deleteCoinDrop(coinDrop._id);
          showAlert('Success', 'Coin drop deleted');
          await loadCoinDrops(1);
        } catch (error: any) {
          showAlert('Error', error.message || 'Failed to delete coin drop');
        }
      },
      'Delete'
    );
  }, [loadCoinDrops]);

  // ==========================================
  // Store search for Coin Drop form
  // ==========================================

  useEffect(() => {
    if (showFormModal && activeTab === 'coinDrops' && storeSearchQuery.length > 0) {
      const timeout = setTimeout(() => {
        loadStores(storeSearchQuery);
      }, 300);
      return () => clearTimeout(timeout);
    }
  }, [storeSearchQuery, showFormModal, activeTab, loadStores]);

  // ==========================================
  // Render Helpers
  // ==========================================

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Extra Rewards</Text>
        <Text style={[styles.headerSubtitle, { color: colors.icon }]}>
          Manage double cashback campaigns & coin drops
        </Text>
      </View>
      <TouchableOpacity
        style={[styles.createBtn, { backgroundColor: colors.tint }]}
        onPress={handleCreateNew}
      >
        <Ionicons name="add" size={20} color={colors.card} />
        <Text style={styles.createBtnText}>Create</Text>
      </TouchableOpacity>
    </View>
  );

  const renderStatsRow = () => (
    <View style={styles.statsRow}>
      {[
        { label: 'Total', value: stats.total, color: colors.text },
        { label: 'Active', value: stats.active, color: STATUS_COLORS.upcoming },
        { label: 'Running', value: stats.running, color: STATUS_COLORS.running },
      ].map((item, index) => (
        <View key={index} style={[styles.statItem, { backgroundColor: colors.card }]}>
          <Text style={[styles.statValue, { color: item.color }]}>{item.value}</Text>
          <Text style={[styles.statLabel, { color: colors.icon }]}>{item.label}</Text>
        </View>
      ))}
    </View>
  );

  const renderTabs = () => (
    <View style={styles.tabsContainer}>
      {([
        { key: 'campaigns' as TabType, label: 'Double Campaigns', icon: 'flash' },
        { key: 'coinDrops' as TabType, label: 'Coin Drops', icon: 'gift' },
      ]).map(tab => {
        const isActive = activeTab === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tabItem,
              { borderBottomColor: isActive ? colors.tint : 'transparent' },
            ]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Ionicons
              name={tab.icon as any}
              size={16}
              color={isActive ? colors.tint : colors.icon}
            />
            <Text
              style={[
                styles.tabLabel,
                { color: isActive ? colors.tint : colors.icon },
                isActive && styles.tabLabelActive,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const renderStatusBadge = (status: StatusType) => (
    <View style={[styles.statusChip, { backgroundColor: `${STATUS_COLORS[status]}15` }]}>
      <Ionicons name={STATUS_ICONS[status] as any} size={12} color={STATUS_COLORS[status]} />
      <Text style={[styles.statusLabel, { color: STATUS_COLORS[status] }]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Text>
    </View>
  );

  const renderMultiplierBadge = (multiplier: number) => (
    <View style={styles.multiplierBadge}>
      <Text style={styles.multiplierText}>{multiplier}X</Text>
    </View>
  );

  // ==========================================
  // Campaign Card
  // ==========================================

  const renderCampaignItem = useCallback(({ item }: { item: DoubleCashbackCampaign }) => {
    const status = getStatus(item);

    return (
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        {/* Card Header */}
        <View style={styles.cardHeader}>
          {renderMultiplierBadge(item.multiplier)}
          {renderStatusBadge(status)}
        </View>

        {/* Title & Subtitle */}
        <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={[styles.cardSubtitle, { color: colors.icon }]} numberOfLines={1}>
          {item.subtitle}
        </Text>

        {/* Meta Row */}
        <View style={styles.metaRow}>
          {item.eligibleStoreNames && item.eligibleStoreNames.length > 0 && (
            <View style={styles.metaChip}>
              <Ionicons name="storefront-outline" size={12} color={colors.icon} />
              <Text style={[styles.metaText, { color: colors.icon }]}>
                {item.eligibleStoreNames.length} store{item.eligibleStoreNames.length !== 1 ? 's' : ''}
              </Text>
            </View>
          )}
          {item.eligibleCategories && item.eligibleCategories.length > 0 && (
            <View style={styles.metaChip}>
              <Ionicons name="grid-outline" size={12} color={colors.icon} />
              <Text style={[styles.metaText, { color: colors.icon }]}>
                {item.eligibleCategories.join(', ')}
              </Text>
            </View>
          )}
          <View style={styles.metaChip}>
            <Ionicons name="people-outline" size={12} color={colors.icon} />
            <Text style={[styles.metaText, { color: colors.icon }]}>
              {item.usageCount || 0} uses
            </Text>
          </View>
        </View>

        {/* Date Row */}
        <View style={[styles.dateRow, { borderTopColor: colors.border }]}>
          <View style={styles.dateInfo}>
            <Ionicons name="calendar-outline" size={12} color={colors.icon} />
            <Text style={[styles.dateText, { color: colors.icon }]}>
              {formatDateShort(item.startTime)} - {formatDateShort(item.endTime)}
            </Text>
          </View>
          <Text style={[styles.priorityBadge, { backgroundColor: colors.background, color: colors.icon }]}>
            P{item.priority}
          </Text>
        </View>

        {/* Action Row */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionIconBtn, { backgroundColor: `${colors.info}10` }]}
            onPress={() => handleEditCampaign(item)}
          >
            <Ionicons name="pencil" size={16} color={colors.info} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.actionIconBtn,
              { backgroundColor: item.isActive ? `${colors.warning}10` : `${colors.success}10` },
            ]}
            onPress={() => handleToggleCampaign(item)}
          >
            <Ionicons
              name={item.isActive ? 'pause' : 'play'}
              size={16}
              color={item.isActive ? colors.warning : colors.success}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionIconBtn, { backgroundColor: `${colors.error}10` }]}
            onPress={() => handleDeleteCampaign(item)}
          >
            <Ionicons name="trash" size={16} color={colors.error} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }, [colors, handleEditCampaign, handleToggleCampaign, handleDeleteCampaign]);

  // ==========================================
  // Coin Drop Card
  // ==========================================

  const renderCoinDropItem = useCallback(({ item }: { item: CoinDrop }) => {
    const status = getStatus(item);
    const boosted = item.boostedCashback || item.normalCashback * item.multiplier;

    return (
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        {/* Card Header */}
        <View style={styles.cardHeader}>
          <View style={styles.storeRow}>
            {item.storeLogo ? (
              <Image
                source={{ uri: item.storeLogo }}
                style={styles.storeLogo}
                defaultSource={require('../../assets/images/icon.png')}
              />
            ) : (
              <View style={[styles.storeLogoPlaceholder, { backgroundColor: colors.border }]}>
                <Ionicons name="storefront" size={18} color={colors.icon} />
              </View>
            )}
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[styles.cardTitle, { color: colors.text, marginBottom: 0 }]} numberOfLines={1}>
                {item.storeName}
              </Text>
            </View>
          </View>
          {renderStatusBadge(status)}
        </View>

        {/* Cashback Info */}
        <View style={styles.cashbackRow}>
          <View style={styles.cashbackInfo}>
            <Text style={[styles.cashbackNormal, { color: colors.icon }]}>
              {item.normalCashback}%
            </Text>
            <Ionicons name="arrow-forward" size={14} color={colors.icon} style={{ marginHorizontal: 6 }} />
            <Text style={styles.cashbackBoosted}>
              {boosted}%
            </Text>
          </View>
          {renderMultiplierBadge(item.multiplier)}
        </View>

        {/* Category Tag */}
        <View style={styles.metaRow}>
          <View style={[styles.categoryTag, { backgroundColor: `${colors.tint}15` }]}>
            <Ionicons name="pricetag-outline" size={12} color={colors.tint} />
            <Text style={[styles.categoryTagText, { color: colors.tint }]}>{item.category}</Text>
          </View>
          <View style={styles.metaChip}>
            <Ionicons name="people-outline" size={12} color={colors.icon} />
            <Text style={[styles.metaText, { color: colors.icon }]}>
              {item.usageCount || 0} uses
            </Text>
          </View>
        </View>

        {/* Date Row */}
        <View style={[styles.dateRow, { borderTopColor: colors.border }]}>
          <View style={styles.dateInfo}>
            <Ionicons name="calendar-outline" size={12} color={colors.icon} />
            <Text style={[styles.dateText, { color: colors.icon }]}>
              {formatDateShort(item.startTime)} - {formatDateShort(item.endTime)}
            </Text>
          </View>
          <Text style={[styles.priorityBadge, { backgroundColor: colors.background, color: colors.icon }]}>
            P{item.priority}
          </Text>
        </View>

        {/* Action Row */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionIconBtn, { backgroundColor: `${colors.info}10` }]}
            onPress={() => handleEditCoinDrop(item)}
          >
            <Ionicons name="pencil" size={16} color={colors.info} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.actionIconBtn,
              { backgroundColor: item.isActive ? `${colors.warning}10` : `${colors.success}10` },
            ]}
            onPress={() => handleToggleCoinDrop(item)}
          >
            <Ionicons
              name={item.isActive ? 'pause' : 'play'}
              size={16}
              color={item.isActive ? colors.warning : colors.success}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionIconBtn, { backgroundColor: `${colors.error}10` }]}
            onPress={() => handleDeleteCoinDrop(item)}
          >
            <Ionicons name="trash" size={16} color={colors.error} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }, [colors, handleEditCoinDrop, handleToggleCoinDrop, handleDeleteCoinDrop]);

  // ==========================================
  // Form Modals
  // ==========================================

  const renderCampaignForm = () => (
    <ScrollView style={styles.formScroll} contentContainerStyle={styles.formContent}>
      <View style={styles.formGroup}>
        <Text style={[styles.formLabel, { color: colors.text }]}>Title *</Text>
        <TextInput
          style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
          value={campaignForm.title || ''}
          onChangeText={text => setCampaignForm(p => ({ ...p, title: text }))}
          placeholder="Campaign title"
          placeholderTextColor={colors.icon}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={[styles.formLabel, { color: colors.text }]}>Subtitle *</Text>
        <TextInput
          style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
          value={campaignForm.subtitle || ''}
          onChangeText={text => setCampaignForm(p => ({ ...p, subtitle: text }))}
          placeholder="Campaign subtitle"
          placeholderTextColor={colors.icon}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={[styles.formLabel, { color: colors.text }]}>Description</Text>
        <TextInput
          style={[styles.formInput, styles.textArea, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
          value={campaignForm.description || ''}
          onChangeText={text => setCampaignForm(p => ({ ...p, description: text }))}
          placeholder="Campaign description"
          placeholderTextColor={colors.icon}
          multiline
          numberOfLines={3}
        />
      </View>

      <View style={styles.formRow}>
        <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
          <Text style={[styles.formLabel, { color: colors.text }]}>Multiplier *</Text>
          <TextInput
            style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
            value={campaignForm.multiplier ? String(campaignForm.multiplier) : ''}
            onChangeText={text => setCampaignForm(p => ({ ...p, multiplier: parseFloat(text) || 0 }))}
            placeholder="2"
            placeholderTextColor={colors.icon}
            keyboardType="numeric"
          />
        </View>
        <View style={[styles.formGroup, { flex: 1 }]}>
          <Text style={[styles.formLabel, { color: colors.text }]}>Priority</Text>
          <TextInput
            style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
            value={String(campaignForm.priority ?? 0)}
            onChangeText={text => setCampaignForm(p => ({ ...p, priority: parseInt(text) || 0 }))}
            placeholder="0"
            placeholderTextColor={colors.icon}
            keyboardType="numeric"
          />
        </View>
      </View>

      {/* Date Section */}
      <View style={[styles.dateRangeSection, { borderColor: colors.border }]}>
        <View style={styles.dateRangeTitleRow}>
          <Ionicons name="calendar" size={18} color={colors.tint} />
          <Text style={[styles.dateRangeTitle, { color: colors.text }]}>Duration</Text>
        </View>

        <View style={styles.formGroup}>
          <Text style={[styles.formLabel, { color: colors.text }]}>Start Time *</Text>
          <TextInput
            style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
            value={campaignForm.startTime ? format(new Date(campaignForm.startTime), 'yyyy-MM-dd HH:mm') : ''}
            onChangeText={text => {
              const parsed = new Date(text.replace(' ', 'T'));
              if (!isNaN(parsed.getTime())) {
                setCampaignForm(p => ({ ...p, startTime: parsed.toISOString() }));
              }
            }}
            placeholder="YYYY-MM-DD HH:mm"
            placeholderTextColor={colors.icon}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={[styles.formLabel, { color: colors.text }]}>End Time *</Text>
          <TextInput
            style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
            value={campaignForm.endTime ? format(new Date(campaignForm.endTime), 'yyyy-MM-dd HH:mm') : ''}
            onChangeText={text => {
              const parsed = new Date(text.replace(' ', 'T'));
              if (!isNaN(parsed.getTime())) {
                setCampaignForm(p => ({ ...p, endTime: parsed.toISOString() }));
              }
            }}
            placeholder="YYYY-MM-DD HH:mm"
            placeholderTextColor={colors.icon}
          />
        </View>

        {/* Duration hint */}
        {campaignForm.startTime && campaignForm.endTime && (
          <View style={[styles.durationHint, { backgroundColor: `${colors.tint}15` }]}>
            <Ionicons name="information-circle" size={16} color={colors.tint} />
            <Text style={[styles.durationHintText, { color: colors.tint }]}>
              {(() => {
                const start = new Date(campaignForm.startTime!);
                const end = new Date(campaignForm.endTime!);
                const diffMs = end.getTime() - start.getTime();
                const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
                if (diffDays < 0) return 'End date must be after start date';
                if (diffDays === 0) return 'Runs for less than a day';
                if (diffDays === 1) return 'Runs for 1 day';
                return `Runs for ${diffDays} days`;
              })()}
            </Text>
          </View>
        )}
      </View>

      {/* Eligible Stores */}
      <View style={styles.formGroup}>
        <Text style={[styles.formLabel, { color: colors.text }]}>Eligible Store Names (comma separated)</Text>
        <TextInput
          style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
          value={(campaignForm.eligibleStoreNames || []).join(', ')}
          onChangeText={text => setCampaignForm(p => ({
            ...p,
            eligibleStoreNames: text ? text.split(',').map(s => s.trim()).filter(Boolean) : [],
          }))}
          placeholder="e.g., Store A, Store B"
          placeholderTextColor={colors.icon}
        />
      </View>

      {/* Eligible Categories */}
      <View style={styles.formGroup}>
        <Text style={[styles.formLabel, { color: colors.text }]}>Eligible Categories (comma separated)</Text>
        <TextInput
          style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
          value={(campaignForm.eligibleCategories || []).join(', ')}
          onChangeText={text => setCampaignForm(p => ({
            ...p,
            eligibleCategories: text ? text.split(',').map(s => s.trim()).filter(Boolean) : [],
          }))}
          placeholder="e.g., Food, Fashion"
          placeholderTextColor={colors.icon}
        />
      </View>

      {/* Terms */}
      <View style={styles.formGroup}>
        <Text style={[styles.formLabel, { color: colors.text }]}>Terms (one per line)</Text>
        <TextInput
          style={[styles.formInput, styles.textArea, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
          value={(campaignForm.terms || []).join('\n')}
          onChangeText={text => setCampaignForm(p => ({
            ...p,
            terms: text ? text.split('\n').filter(Boolean) : [],
          }))}
          placeholder="Enter each term on a new line..."
          placeholderTextColor={colors.icon}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>

      {/* Min/Max */}
      <View style={styles.formRow}>
        <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
          <Text style={[styles.formLabel, { color: colors.text }]}>Min Order Value</Text>
          <TextInput
            style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
            value={campaignForm.minOrderValue ? String(campaignForm.minOrderValue) : ''}
            onChangeText={text => setCampaignForm(p => ({ ...p, minOrderValue: text ? parseInt(text) : undefined }))}
            placeholder="e.g., 500"
            placeholderTextColor={colors.icon}
            keyboardType="numeric"
          />
        </View>
        <View style={[styles.formGroup, { flex: 1 }]}>
          <Text style={[styles.formLabel, { color: colors.text }]}>Max Cashback</Text>
          <TextInput
            style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
            value={campaignForm.maxCashback ? String(campaignForm.maxCashback) : ''}
            onChangeText={text => setCampaignForm(p => ({ ...p, maxCashback: text ? parseInt(text) : undefined }))}
            placeholder="e.g., 200"
            placeholderTextColor={colors.icon}
            keyboardType="numeric"
          />
        </View>
      </View>

      {/* Appearance */}
      <View style={styles.formRow}>
        <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
          <Text style={[styles.formLabel, { color: colors.text }]}>Background Color</Text>
          <TextInput
            style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
            value={campaignForm.backgroundColor || colors.warningLight}
            onChangeText={text => setCampaignForm(p => ({ ...p, backgroundColor: text }))}
            placeholder={colors.warningLight}
            placeholderTextColor={colors.icon}
          />
        </View>
        <View style={[styles.formGroup, { flex: 1 }]}>
          <Text style={[styles.formLabel, { color: colors.text }]}>Icon</Text>
          <TextInput
            style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
            value={campaignForm.icon || 'flash'}
            onChangeText={text => setCampaignForm(p => ({ ...p, icon: text }))}
            placeholder="flash"
            placeholderTextColor={colors.icon}
          />
        </View>
      </View>

      {/* Active Toggle */}
      <View style={styles.formGroup}>
        <Text style={[styles.formLabel, { color: colors.text }]}>Active</Text>
        <View style={[styles.switchBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <Text style={[styles.switchLabel, { color: colors.icon }]}>
            {campaignForm.isActive !== false ? 'Yes' : 'No'}
          </Text>
          <Switch
            value={campaignForm.isActive !== false}
            onValueChange={val => setCampaignForm(p => ({ ...p, isActive: val }))}
            trackColor={{ true: colors.tint }}
          />
        </View>
      </View>
    </ScrollView>
  );

  const renderCoinDropForm = () => (
    <ScrollView style={styles.formScroll} contentContainerStyle={styles.formContent}>
      {/* Store Selection */}
      <View style={styles.formGroup}>
        <Text style={[styles.formLabel, { color: colors.text }]}>Store *</Text>
        <TextInput
          style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
          value={storeSearchQuery}
          onChangeText={text => {
            setStoreSearchQuery(text);
            setShowStoreDropdown(true);
          }}
          onFocus={() => {
            setShowStoreDropdown(true);
            if (stores.length === 0) loadStores();
          }}
          placeholder="Search for a store..."
          placeholderTextColor={colors.icon}
        />
        {selectedStore && (
          <View style={[styles.selectedStoreChip, { backgroundColor: `${colors.tint}15`, borderColor: colors.tint }]}>
            {selectedStore.logo ? (
              <Image source={{ uri: selectedStore.logo }} style={styles.selectedStoreChipLogo} />
            ) : (
              <Ionicons name="storefront" size={14} color={colors.tint} />
            )}
            <Text style={[styles.selectedStoreChipText, { color: colors.tint }]} numberOfLines={1}>
              {selectedStore.name}
            </Text>
            <TouchableOpacity onPress={() => {
              setSelectedStore(null);
              setCoinDropForm(p => ({ ...p, storeId: '' }));
              setStoreSearchQuery('');
            }}>
              <Ionicons name="close-circle" size={18} color={colors.tint} />
            </TouchableOpacity>
          </View>
        )}
        {showStoreDropdown && !selectedStore && (
          <View style={[styles.storeDropdown, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {storesLoading ? (
              <View style={styles.storeDropdownLoading}>
                <ActivityIndicator size="small" color={colors.tint} />
              </View>
            ) : stores.length === 0 ? (
              <View style={styles.storeDropdownEmpty}>
                <Text style={[styles.storeDropdownEmptyText, { color: colors.icon }]}>
                  No stores found
                </Text>
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                {stores.map(store => (
                  <TouchableOpacity
                    key={store._id}
                    style={[styles.storeDropdownItem, { borderBottomColor: colors.border }]}
                    onPress={() => {
                      setSelectedStore(store);
                      setCoinDropForm(p => ({ ...p, storeId: store._id }));
                      setStoreSearchQuery('');
                      setShowStoreDropdown(false);
                      // Auto-fill category if available
                      if (store.category && !coinDropForm.category) {
                        setCoinDropForm(p => ({ ...p, category: store.category || '' }));
                      }
                    }}
                  >
                    {store.logo ? (
                      <Image source={{ uri: store.logo }} style={styles.storeDropdownItemLogo} />
                    ) : (
                      <View style={[styles.storeDropdownItemLogoPlaceholder, { backgroundColor: colors.border }]}>
                        <Ionicons name="storefront" size={14} color={colors.icon} />
                      </View>
                    )}
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text style={[styles.storeDropdownItemName, { color: colors.text }]} numberOfLines={1}>
                        {store.name}
                      </Text>
                      {store.category && (
                        <Text style={[styles.storeDropdownItemCategory, { color: colors.icon }]}>
                          {store.category}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        )}
      </View>

      {/* Multiplier + Normal Cashback */}
      <View style={styles.formRow}>
        <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
          <Text style={[styles.formLabel, { color: colors.text }]}>Multiplier *</Text>
          <TextInput
            style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
            value={coinDropForm.multiplier ? String(coinDropForm.multiplier) : ''}
            onChangeText={text => setCoinDropForm(p => ({ ...p, multiplier: parseFloat(text) || 0 }))}
            placeholder="2"
            placeholderTextColor={colors.icon}
            keyboardType="numeric"
          />
        </View>
        <View style={[styles.formGroup, { flex: 1 }]}>
          <Text style={[styles.formLabel, { color: colors.text }]}>Normal Cashback % *</Text>
          <TextInput
            style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
            value={coinDropForm.normalCashback ? String(coinDropForm.normalCashback) : ''}
            onChangeText={text => setCoinDropForm(p => ({ ...p, normalCashback: parseFloat(text) || 0 }))}
            placeholder="e.g., 5"
            placeholderTextColor={colors.icon}
            keyboardType="numeric"
          />
        </View>
      </View>

      {/* Boosted preview */}
      {coinDropForm.multiplier > 0 && coinDropForm.normalCashback > 0 && (
        <View style={[styles.boostPreview, { backgroundColor: colors.warningLight }]}>
          <Ionicons name="flash" size={16} color={colors.warningDark} />
          <Text style={styles.boostPreviewText}>
            Boosted cashback: {coinDropForm.normalCashback * coinDropForm.multiplier}%
          </Text>
        </View>
      )}

      {/* Category */}
      <View style={styles.formGroup}>
        <Text style={[styles.formLabel, { color: colors.text }]}>Category *</Text>
        <TextInput
          style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
          value={coinDropForm.category}
          onChangeText={text => setCoinDropForm(p => ({ ...p, category: text }))}
          placeholder="e.g., Food, Fashion"
          placeholderTextColor={colors.icon}
        />
      </View>

      {/* Date Section */}
      <View style={[styles.dateRangeSection, { borderColor: colors.border }]}>
        <View style={styles.dateRangeTitleRow}>
          <Ionicons name="calendar" size={18} color={colors.tint} />
          <Text style={[styles.dateRangeTitle, { color: colors.text }]}>Duration</Text>
        </View>

        <View style={styles.formGroup}>
          <Text style={[styles.formLabel, { color: colors.text }]}>Start Time *</Text>
          <TextInput
            style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
            value={coinDropForm.startTime ? format(new Date(coinDropForm.startTime), 'yyyy-MM-dd HH:mm') : ''}
            onChangeText={text => {
              const parsed = new Date(text.replace(' ', 'T'));
              if (!isNaN(parsed.getTime())) {
                setCoinDropForm(p => ({ ...p, startTime: parsed.toISOString() }));
              }
            }}
            placeholder="YYYY-MM-DD HH:mm"
            placeholderTextColor={colors.icon}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={[styles.formLabel, { color: colors.text }]}>End Time *</Text>
          <TextInput
            style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
            value={coinDropForm.endTime ? format(new Date(coinDropForm.endTime), 'yyyy-MM-dd HH:mm') : ''}
            onChangeText={text => {
              const parsed = new Date(text.replace(' ', 'T'));
              if (!isNaN(parsed.getTime())) {
                setCoinDropForm(p => ({ ...p, endTime: parsed.toISOString() }));
              }
            }}
            placeholder="YYYY-MM-DD HH:mm"
            placeholderTextColor={colors.icon}
          />
        </View>
      </View>

      {/* Min/Max */}
      <View style={styles.formRow}>
        <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
          <Text style={[styles.formLabel, { color: colors.text }]}>Min Order Value</Text>
          <TextInput
            style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
            value={coinDropForm.minOrderValue ? String(coinDropForm.minOrderValue) : ''}
            onChangeText={text => setCoinDropForm(p => ({ ...p, minOrderValue: text ? parseInt(text) : undefined }))}
            placeholder="e.g., 500"
            placeholderTextColor={colors.icon}
            keyboardType="numeric"
          />
        </View>
        <View style={[styles.formGroup, { flex: 1 }]}>
          <Text style={[styles.formLabel, { color: colors.text }]}>Max Cashback</Text>
          <TextInput
            style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
            value={coinDropForm.maxCashback ? String(coinDropForm.maxCashback) : ''}
            onChangeText={text => setCoinDropForm(p => ({ ...p, maxCashback: text ? parseInt(text) : undefined }))}
            placeholder="e.g., 200"
            placeholderTextColor={colors.icon}
            keyboardType="numeric"
          />
        </View>
      </View>

      {/* Priority */}
      <View style={styles.formGroup}>
        <Text style={[styles.formLabel, { color: colors.text }]}>Priority</Text>
        <TextInput
          style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
          value={String(coinDropForm.priority ?? 0)}
          onChangeText={text => setCoinDropForm(p => ({ ...p, priority: parseInt(text) || 0 }))}
          placeholder="0"
          placeholderTextColor={colors.icon}
          keyboardType="numeric"
        />
      </View>

      {/* Active Toggle */}
      <View style={styles.formGroup}>
        <Text style={[styles.formLabel, { color: colors.text }]}>Active</Text>
        <View style={[styles.switchBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <Text style={[styles.switchLabel, { color: colors.icon }]}>
            {coinDropForm.isActive ? 'Yes' : 'No'}
          </Text>
          <Switch
            value={coinDropForm.isActive}
            onValueChange={val => setCoinDropForm(p => ({ ...p, isActive: val }))}
            trackColor={{ true: colors.tint }}
          />
        </View>
      </View>
    </ScrollView>
  );

  const renderFormModal = () => {
    const isCampaignTab = activeTab === 'campaigns';
    const isEditing = isCampaignTab ? !!editingCampaign : !!editingCoinDrop;
    const modalTitle = isCampaignTab
      ? (isEditing ? 'Edit Campaign' : 'New Double Campaign')
      : (isEditing ? 'Edit Coin Drop' : 'New Coin Drop');

    return (
      <Modal visible={showFormModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity
              onPress={() => {
                setShowFormModal(false);
                setShowStoreDropdown(false);
              }}
              style={styles.modalCloseBtn}
            >
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{modalTitle}</Text>
            <TouchableOpacity
              onPress={isCampaignTab ? handleSaveCampaign : handleSaveCoinDrop}
              disabled={isSaving}
              style={[styles.modalSaveBtn, { backgroundColor: colors.tint }]}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color={colors.card} />
              ) : (
                <Text style={styles.modalSaveBtnText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>

          {isCampaignTab ? renderCampaignForm() : renderCoinDropForm()}
        </SafeAreaView>
      </Modal>
    );
  };

  // ==========================================
  // Main Return
  // ==========================================

  const isCurrentTabLoading = activeTab === 'campaigns' ? campaignsLoading : coinDropsLoading;
  const currentData = activeTab === 'campaigns' ? campaigns : coinDrops;

  if (isCurrentTabLoading && currentData.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        {renderHeader()}
        {renderTabs()}
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
      {renderTabs()}

      {activeTab === 'campaigns' ? (
        <FlatList
          data={campaigns}
          renderItem={renderCampaignItem}
          keyExtractor={item => item._id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={campaignsRefreshing}
              onRefresh={onRefreshCampaigns}
              tintColor={colors.tint}
            />
          }
          onEndReached={loadMoreCampaigns}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            campaignsHasMore ? (
              <ActivityIndicator style={{ padding: 16 }} color={colors.tint} />
            ) : (
              <View style={{ height: 20 }} />
            )
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="flash-outline" size={56} color={colors.icon} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No campaigns</Text>
              <Text style={[styles.emptyText, { color: colors.icon }]}>
                Create your first double cashback campaign
              </Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={coinDrops}
          renderItem={renderCoinDropItem}
          keyExtractor={item => item._id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={coinDropsRefreshing}
              onRefresh={onRefreshCoinDrops}
              tintColor={colors.tint}
            />
          }
          onEndReached={loadMoreCoinDrops}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            coinDropsHasMore ? (
              <ActivityIndicator style={{ padding: 16 }} color={colors.tint} />
            ) : (
              <View style={{ height: 20 }} />
            )
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="gift-outline" size={56} color={colors.icon} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No coin drops</Text>
              <Text style={[styles.emptyText, { color: colors.icon }]}>
                Create your first coin drop
              </Text>
            </View>
          }
        />
      )}

      {renderFormModal()}
    </SafeAreaView>
  );
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

  // Tabs
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 0,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderBottomWidth: 3,
    gap: 6,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  tabLabelActive: {
    fontWeight: '700',
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
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 13,
    marginBottom: 8,
  },

  // Status
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Multiplier Badge
  multiplierBadge: {
    backgroundColor: Colors.light.warning,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  multiplierText: {
    color: Colors.light.card,
    fontSize: 14,
    fontWeight: '800',
  },

  // Meta
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
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

  // Category Tag
  categoryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  categoryTagText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Date Row
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 10,
    marginTop: 4,
    marginBottom: 8,
  },
  dateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 12,
  },
  priorityBadge: {
    fontSize: 11,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },

  // Action Row
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Store in Coin Drop Card
  storeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  storeLogo: {
    width: 36,
    height: 36,
    borderRadius: 10,
  },
  storeLogoPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Cashback Row
  cashbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  cashbackInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cashbackNormal: {
    fontSize: 15,
    textDecorationLine: 'line-through',
  },
  cashbackBoosted: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.light.success,
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
    color: Colors.light.card,
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

  // Date Range
  dateRangeSection: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  dateRangeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  dateRangeTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  durationHint: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    gap: 8,
  },
  durationHintText: {
    fontSize: 13,
    fontWeight: '500',
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

  // Store Dropdown (CoinDrop form)
  selectedStoreChip: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  selectedStoreChipLogo: {
    width: 20,
    height: 20,
    borderRadius: 4,
  },
  selectedStoreChipText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  storeDropdown: {
    marginTop: 4,
    borderWidth: 1,
    borderRadius: 10,
    overflow: 'hidden',
  },
  storeDropdownLoading: {
    padding: 16,
    alignItems: 'center',
  },
  storeDropdownEmpty: {
    padding: 16,
    alignItems: 'center',
  },
  storeDropdownEmptyText: {
    fontSize: 13,
  },
  storeDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
  },
  storeDropdownItemLogo: {
    width: 28,
    height: 28,
    borderRadius: 6,
  },
  storeDropdownItemLogoPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  storeDropdownItemName: {
    fontSize: 14,
    fontWeight: '500',
  },
  storeDropdownItemCategory: {
    fontSize: 11,
    marginTop: 1,
  },

  // Boost Preview
  boostPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  boostPreviewText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.light.warningDark,
  },
});
