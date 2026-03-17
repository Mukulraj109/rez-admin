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
import { bonusZoneService, BonusCampaignAdmin, BonusCampaignClaim, BonusFraudAlert } from '../../services/api/bonusZone';
import { Colors } from '../../constants/Colors';
import { format } from 'date-fns';
import { showAlert, showConfirm } from '../../utils/alert';

// ============================================
// TYPES
// ============================================

type TabType = 'campaigns' | 'analytics' | 'claims';
type CampaignStatusFilter = 'all' | 'draft' | 'scheduled' | 'active' | 'paused' | 'exhausted' | 'expired' | 'cancelled';
type CampaignTypeFilter = 'all' | 'cashback_boost' | 'bank_offer' | 'bill_upload_bonus' | 'category_multiplier' | 'first_transaction_bonus' | 'festival_offer';

const STATUS_COLORS: Record<string, string> = {
  draft: Colors.light.slateMedium,
  scheduled: Colors.light.info,
  active: Colors.light.success,
  paused: Colors.light.warning,
  exhausted: Colors.light.error,
  expired: Colors.light.secondaryText,
  cancelled: Colors.light.errorDark,
};

const CAMPAIGN_TYPE_LABELS: Record<string, string> = {
  cashback_boost: 'Cashback Boost',
  bank_offer: 'Bank Offer',
  bill_upload_bonus: 'Bill Upload',
  category_multiplier: 'Category Multiplier',
  first_transaction_bonus: 'First Transaction',
  festival_offer: 'Festival Offer',
};

const REWARD_TYPE_LABELS: Record<string, string> = {
  percentage: 'Percentage',
  flat: 'Flat Coins',
  multiplier: 'Multiplier',
};

const PAYMENT_METHOD_OPTIONS = [
  { key: 'credit_card', label: 'Credit Card' },
  { key: 'debit_card', label: 'Debit Card' },
  { key: 'upi', label: 'UPI' },
  { key: 'wallet', label: 'Wallet' },
  { key: 'net_banking', label: 'Net Banking' },
  { key: 'cod', label: 'COD' },
];

const MERCHANT_CATEGORY_OPTIONS = [
  { key: 'food-dining', label: 'Food & Dining' },
  { key: 'beauty-wellness', label: 'Beauty & Wellness' },
  { key: 'grocery-essentials', label: 'Grocery' },
  { key: 'fitness-sports', label: 'Fitness & Sports' },
  { key: 'healthcare', label: 'Healthcare' },
  { key: 'fashion', label: 'Fashion' },
  { key: 'education-learning', label: 'Education' },
  { key: 'home-services', label: 'Home Services' },
  { key: 'travel-experiences', label: 'Travel' },
  { key: 'entertainment', label: 'Entertainment' },
  { key: 'financial-lifestyle', label: 'Financial' },
  { key: 'electronics', label: 'Electronics' },
];

const USER_SEGMENT_OPTIONS = [
  { key: 'new_user', label: 'New User' },
  { key: 'student', label: 'Student' },
  { key: 'corporate', label: 'Corporate' },
  { key: 'prive', label: 'Prive' },
];

const FUNDING_SOURCE_OPTIONS = [
  { key: 'platform', label: 'Platform' },
  { key: 'branded', label: 'Branded' },
  { key: 'partner', label: 'Partner' },
];

const COIN_TYPE_OPTIONS = [
  { key: 'rez', label: 'Rez Coins' },
  { key: 'branded', label: 'Branded Coins' },
];

// ============================================
// HELPERS
// ============================================

function formatDate(dateString: string): string {
  try {
    return format(new Date(dateString), 'MMM dd, yyyy HH:mm');
  } catch {
    return dateString;
  }
}

function formatBudget(consumed: number, total: number): string {
  const percent = total > 0 ? Math.round((consumed / total) * 100) : 0;
  return `${consumed.toLocaleString()} / ${total.toLocaleString()} (${percent}%)`;
}

// Date/time split helpers
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TIME_REGEX = /^\d{2}:\d{2}$/;

function splitIsoToDateAndTime(iso: string): { date: string; time: string } {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return { date: '', time: '' };
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return { date: `${yyyy}-${mm}-${dd}`, time: `${hh}:${min}` };
  } catch {
    return { date: '', time: '' };
  }
}

function combineDateAndTime(date: string, time: string): string | null {
  if (!DATE_REGEX.test(date)) return null;
  const t = TIME_REGEX.test(time) ? time : '00:00';
  const d = new Date(`${date}T${t}:00`);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

function isValidDate(date: string): boolean {
  if (!date) return true; // empty is ok (not yet filled)
  return DATE_REGEX.test(date) && !isNaN(new Date(date).getTime());
}

function isValidTime(time: string): boolean {
  if (!time) return true;
  if (!TIME_REGEX.test(time)) return false;
  const [h, m] = time.split(':').map(Number);
  return h >= 0 && h <= 23 && m >= 0 && m <= 59;
}

function formatDatePreview(date: string, time: string): string | null {
  if (!DATE_REGEX.test(date)) return null;
  const t = TIME_REGEX.test(time) ? time : '00:00';
  try {
    const d = new Date(`${date}T${t}:00`);
    if (isNaN(d.getTime())) return null;
    return format(d, "MMM dd, yyyy 'at' h:mm a");
  } catch {
    return null;
  }
}

// ============================================
// DEFAULT FORM
// ============================================

const DEFAULT_FORM: Partial<BonusCampaignAdmin> = {
  slug: '',
  title: '',
  subtitle: '',
  description: '',
  campaignType: 'cashback_boost',
  fundingSource: { type: 'platform', partnerName: '' },
  eligibility: {
    regions: ['all'],
    paymentMethods: [],
    bankCodes: [],
    binPrefixes: [],
    merchantCategories: [],
    userSegments: [],
    minSpend: 0,
    firstTransactionOnly: false,
  },
  reward: {
    type: 'percentage',
    value: 10,
    capPerUser: 100,
    capPerTransaction: 50,
    totalBudget: 10000,
    consumedBudget: 0,
    coinType: 'rez',
  },
  limits: {
    maxClaimsPerUser: 1,
    maxClaimsPerUserPerDay: 0,
    totalGlobalClaims: 0,
    currentGlobalClaims: 0,
  },
  startTime: new Date().toISOString(),
  endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  display: {
    icon: '🎁',
    featured: false,
    priority: 50,
    backgroundColor: Colors.light.warningLight,
  },
  deepLink: { screen: '/cash-store' },
  terms: [],
  status: 'draft',
};

// ============================================
// MAIN COMPONENT
// ============================================

export default function BonusZoneScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [activeTab, setActiveTab] = useState<TabType>('campaigns');

  // Campaign list state
  const [campaigns, setCampaigns] = useState<BonusCampaignAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<CampaignStatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState<CampaignTypeFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Dashboard stats
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);

  // Form modal state
  const [showFormModal, setShowFormModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<BonusCampaignAdmin | null>(null);
  const [formData, setFormData] = useState<Partial<BonusCampaignAdmin>>(DEFAULT_FORM);
  const [newTerm, setNewTerm] = useState('');

  // Split date/time state for schedule inputs
  const [startDate, setStartDate] = useState('');
  const [startTimeInput, setStartTimeInput] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTimeInput, setEndTimeInput] = useState('');

  // Analytics state
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // Claims tab state
  const [claimsCampaignId, setClaimsCampaignId] = useState<string | null>(null);
  const [claims, setClaims] = useState<BonusCampaignClaim[]>([]);
  const [claimsLoading, setClaimsLoading] = useState(false);
  const [claimsPage, setClaimsPage] = useState(1);
  const [claimsTotalPages, setClaimsTotalPages] = useState(1);
  const [claimsStatusFilter, setClaimsStatusFilter] = useState<string>('all');
  const [rejectingClaimId, setRejectingClaimId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);

  // Fund modal state
  const [showFundModal, setShowFundModal] = useState(false);
  const [fundCampaignId, setFundCampaignId] = useState<string | null>(null);
  const [fundAmount, setFundAmount] = useState('5000');

  // Fraud alerts state
  const [fraudAlerts, setFraudAlerts] = useState<BonusFraudAlert[]>([]);
  const [fraudAlertsLoading, setFraudAlertsLoading] = useState(false);

  // ==========================================
  // DATA LOADING
  // ==========================================

  const loadCampaigns = useCallback(async (pageNum: number = 1) => {
    try {
      if (pageNum === 1) setLoading(true);
      const query: any = { page: pageNum, limit: 20 };
      if (statusFilter !== 'all') query.status = statusFilter;
      if (typeFilter !== 'all') query.campaignType = typeFilter;
      if (searchQuery.trim()) query.search = searchQuery.trim();

      const data = await bonusZoneService.getCampaigns(query);
      setCampaigns(data.campaigns);
      setTotalPages(data.pagination.pages);
      setPage(pageNum);
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to load campaigns');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter, typeFilter, searchQuery]);

  const loadDashboard = useCallback(async () => {
    try {
      setDashboardLoading(true);
      const data = await bonusZoneService.getDashboard();
      setDashboardStats(data);
    } catch (error: any) {
      if (__DEV__) console.error('Dashboard error:', error);
    } finally {
      setDashboardLoading(false);
    }
  }, []);

  const loadAnalytics = useCallback(async (campaignId: string) => {
    try {
      setAnalyticsLoading(true);
      setSelectedCampaignId(campaignId);
      const data = await bonusZoneService.getCampaignAnalytics(campaignId);
      setAnalytics(data);
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to load analytics');
    } finally {
      setAnalyticsLoading(false);
    }
  }, []);

  const loadClaimsForCampaign = useCallback(async (campaignId: string, pageNum: number = 1) => {
    try {
      setClaimsLoading(true);
      const query: any = { page: pageNum, limit: 20 };
      if (claimsStatusFilter !== 'all') query.status = claimsStatusFilter;

      const data = await bonusZoneService.getCampaignClaims(campaignId, query);
      setClaims(data.claims);
      setClaimsTotalPages(data.pagination.pages);
      setClaimsPage(pageNum);
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to load claims');
    } finally {
      setClaimsLoading(false);
    }
  }, [claimsStatusFilter]);

  const loadFraudAlerts = useCallback(async () => {
    try {
      setFraudAlertsLoading(true);
      const alerts = await bonusZoneService.getFraudAlerts(50);
      setFraudAlerts(alerts);
    } catch (error: any) {
      if (__DEV__) console.error('Fraud alerts error:', error);
    } finally {
      setFraudAlertsLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps -- search triggers on submit, not keystroke
  useEffect(() => {
    if (activeTab === 'campaigns') {
      loadCampaigns(1);
    } else if (activeTab === 'analytics') {
      loadDashboard();
    } else if (activeTab === 'claims') {
      // Load campaigns list for claim selection, and fraud alerts
      loadCampaigns(1);
      loadFraudAlerts();
    }
  }, [activeTab, statusFilter, typeFilter]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    if (activeTab === 'campaigns') {
      loadCampaigns(1);
    } else if (activeTab === 'analytics') {
      loadDashboard();
    } else if (activeTab === 'claims') {
      if (claimsCampaignId) loadClaimsForCampaign(claimsCampaignId, 1);
      loadFraudAlerts();
      setRefreshing(false);
    }
  }, [activeTab, loadCampaigns, loadDashboard, claimsCampaignId, loadClaimsForCampaign, loadFraudAlerts]);

  // ==========================================
  // CAMPAIGN ACTIONS
  // ==========================================

  const handleCreate = () => {
    setEditingCampaign(null);
    const form = { ...DEFAULT_FORM };
    setFormData(form);
    const s = splitIsoToDateAndTime(form.startTime || '');
    const e = splitIsoToDateAndTime(form.endTime || '');
    setStartDate(s.date);
    setStartTimeInput(s.time);
    setEndDate(e.date);
    setEndTimeInput(e.time);
    setShowFormModal(true);
  };

  const handleEdit = (campaign: BonusCampaignAdmin) => {
    setEditingCampaign(campaign);
    setFormData({
      ...campaign,
      fundingSource: {
        type: 'platform',
        partnerName: '',
        ...campaign.fundingSource,
      },
      eligibility: {
        regions: ['all'],
        paymentMethods: [],
        bankCodes: [],
        binPrefixes: [],
        merchantCategories: [],
        userSegments: [],
        minSpend: 0,
        firstTransactionOnly: false,
        ...campaign.eligibility,
      },
      reward: {
        ...DEFAULT_FORM.reward!,
        ...campaign.reward,
      },
    });
    const s = splitIsoToDateAndTime(campaign.startTime || '');
    const e = splitIsoToDateAndTime(campaign.endTime || '');
    setStartDate(s.date);
    setStartTimeInput(s.time);
    setEndDate(e.date);
    setEndTimeInput(e.time);
    setShowFormModal(true);
  };

  const handleSave = async () => {
    if (!formData.slug || !formData.title || !formData.subtitle) {
      showAlert('Error', 'Slug, title, and subtitle are required');
      return;
    }
    if (!formData.reward?.totalBudget || formData.reward.totalBudget <= 0) {
      showAlert('Error', 'Total budget must be greater than zero');
      return;
    }
    if (!formData.reward?.value || formData.reward.value <= 0) {
      showAlert('Error', 'Reward value must be greater than zero');
      return;
    }

    try {
      setIsSaving(true);
      if (editingCampaign) {
        await bonusZoneService.updateCampaign(editingCampaign._id, formData);
        showAlert('Success', 'Campaign updated successfully');
      } else {
        await bonusZoneService.createCampaign(formData);
        showAlert('Success', 'Campaign created successfully');
      }
      setShowFormModal(false);
      loadCampaigns(1);
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to save campaign');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (campaign: BonusCampaignAdmin) => {
    if (!['draft', 'cancelled'].includes(campaign.status)) {
      showAlert('Error', 'Only draft or cancelled campaigns can be deleted');
      return;
    }

    showConfirm(
      'Delete Campaign',
      `Are you sure you want to delete "${campaign.title}"?`,
      async () => {
        try {
          await bonusZoneService.deleteCampaign(campaign._id);
          showAlert('Success', 'Campaign deleted');
          loadCampaigns(page);
        } catch (error: any) {
          showAlert('Error', error.message || 'Failed to delete');
        }
      }
    );
  };

  const handleStatusChange = async (campaign: BonusCampaignAdmin, newStatus: string) => {
    try {
      await bonusZoneService.updateStatus(campaign._id, newStatus);
      showAlert('Success', `Campaign status changed to ${newStatus}`);
      loadCampaigns(page);
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to update status');
    }
  };

  const handleDuplicate = async (campaign: BonusCampaignAdmin) => {
    try {
      await bonusZoneService.duplicateCampaign(campaign._id);
      showAlert('Success', 'Campaign duplicated');
      loadCampaigns(1);
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to duplicate');
    }
  };

  const handleRejectClaim = async () => {
    if (!rejectingClaimId) return;
    try {
      await bonusZoneService.rejectClaim(rejectingClaimId, rejectReason || 'Rejected by admin');
      showAlert('Success', 'Claim rejected successfully');
      setShowRejectModal(false);
      setRejectingClaimId(null);
      setRejectReason('');
      if (claimsCampaignId) loadClaimsForCampaign(claimsCampaignId, claimsPage);
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to reject claim');
    }
  };

  const openRejectModal = (claimId: string) => {
    setRejectingClaimId(claimId);
    setRejectReason('');
    setShowRejectModal(true);
  };

  const handleFund = (campaign: BonusCampaignAdmin) => {
    setFundCampaignId(campaign._id);
    setFundAmount('5000');
    setShowFundModal(true);
  };

  const handleFundConfirm = async () => {
    if (!fundCampaignId) return;
    const amount = parseInt(fundAmount, 10);
    if (!amount || amount <= 0) {
      showAlert('Error', 'Please enter a valid positive amount');
      return;
    }
    try {
      await bonusZoneService.fundCampaign(fundCampaignId, amount);
      showAlert('Success', `Added ${amount.toLocaleString()} coins to campaign budget`);
      setShowFundModal(false);
      setFundCampaignId(null);
      loadCampaigns(page);
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to fund');
    }
  };

  // ==========================================
  // RENDERERS
  // ==========================================

  const renderStatusBadge = (status: string) => (
    <View style={[styles.statusBadge, { backgroundColor: `${STATUS_COLORS[status] || colors.slateMedium}20` }]}>
      <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[status] || colors.slateMedium }]} />
      <Text style={[styles.statusText, { color: STATUS_COLORS[status] || colors.slateMedium }]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Text>
    </View>
  );

  const renderCampaignCard = ({ item }: { item: BonusCampaignAdmin }) => (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <Text style={styles.cardIcon}>{item.display?.icon || '🎁'}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.cardSlug}>{item.slug}</Text>
          </View>
        </View>
        {renderStatusBadge(item.status)}
      </View>

      {/* Info Row */}
      <View style={styles.cardInfoRow}>
        <View style={styles.infoChip}>
          <Text style={styles.infoChipText}>
            {CAMPAIGN_TYPE_LABELS[item.campaignType] || item.campaignType}
          </Text>
        </View>
        <View style={styles.infoChip}>
          <Text style={styles.infoChipText}>
            {REWARD_TYPE_LABELS[item.reward?.type] || item.reward?.type}: {item.reward?.value}
          </Text>
        </View>
        {item.display?.featured && (
          <View style={[styles.infoChip, { backgroundColor: colors.warningLight }]}>
            <Text style={[styles.infoChipText, { color: colors.warningDark }]}>Featured</Text>
          </View>
        )}
      </View>

      {/* Budget */}
      <View style={styles.budgetRow}>
        <Text style={styles.budgetLabel}>Budget:</Text>
        <Text style={styles.budgetValue}>
          {formatBudget(item.reward?.consumedBudget || 0, item.reward?.totalBudget || 0)}
        </Text>
      </View>

      {/* Budget Progress Bar */}
      <View style={styles.progressBarBg}>
        <View
          style={[
            styles.progressBarFill,
            {
              width: `${item.reward?.totalBudget > 0 ? Math.min(100, Math.round(((item.reward?.consumedBudget || 0) / item.reward.totalBudget) * 100)) : 0}%`,
              backgroundColor: (item.reward?.consumedBudget || 0) >= (item.reward?.totalBudget || 1) ? colors.error : colors.success,
            },
          ]}
        />
      </View>

      {/* Schedule */}
      <View style={styles.scheduleRow}>
        <Ionicons name="calendar-outline" size={14} color={colors.mutedDark} />
        <Text style={styles.scheduleText}>
          {formatDate(item.startTime)} → {formatDate(item.endTime)}
        </Text>
      </View>

      {/* Claims & Priority */}
      <View style={styles.statsRow}>
        <Text style={styles.statsText}>
          Claims: {item.limits?.currentGlobalClaims || 0}
          {item.limits?.totalGlobalClaims ? ` / ${item.limits.totalGlobalClaims}` : ''}
        </Text>
        <Text style={styles.statsText}>Priority: {item.display?.priority || 0}</Text>
      </View>

      {/* Actions */}
      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => handleEdit(item)}>
          <Ionicons name="create-outline" size={18} color={colors.info} />
          <Text style={[styles.actionText, { color: colors.info }]}>Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={() => loadAnalytics(item._id)}>
          <Ionicons name="bar-chart-outline" size={18} color={colors.purple} />
          <Text style={[styles.actionText, { color: colors.purple }]}>Analytics</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={() => handleDuplicate(item)}>
          <Ionicons name="copy-outline" size={18} color={colors.mutedDark} />
          <Text style={[styles.actionText, { color: colors.secondaryText }]}>Dup</Text>
        </TouchableOpacity>

        {item.status === 'active' && (
          <TouchableOpacity style={styles.actionBtn} onPress={() => handleStatusChange(item, 'paused')}>
            <Ionicons name="pause-circle-outline" size={18} color={colors.warning} />
            <Text style={[styles.actionText, { color: colors.warning }]}>Pause</Text>
          </TouchableOpacity>
        )}

        {item.status === 'paused' && (
          <TouchableOpacity style={styles.actionBtn} onPress={() => handleStatusChange(item, 'active')}>
            <Ionicons name="play-circle-outline" size={18} color={colors.success} />
            <Text style={[styles.actionText, { color: colors.success }]}>Resume</Text>
          </TouchableOpacity>
        )}

        {item.status === 'draft' && (
          <TouchableOpacity style={styles.actionBtn} onPress={() => handleStatusChange(item, 'scheduled')}>
            <Ionicons name="rocket-outline" size={18} color={colors.success} />
            <Text style={[styles.actionText, { color: colors.success }]}>Publish</Text>
          </TouchableOpacity>
        )}

        {['active', 'exhausted'].includes(item.status) && (
          <TouchableOpacity style={styles.actionBtn} onPress={() => handleFund(item)}>
            <Ionicons name="add-circle-outline" size={18} color={colors.success} />
            <Text style={[styles.actionText, { color: colors.success }]}>+Fund</Text>
          </TouchableOpacity>
        )}

        {['draft', 'cancelled'].includes(item.status) && (
          <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(item)}>
            <Ionicons name="trash-outline" size={18} color={colors.error} />
            <Text style={[styles.actionText, { color: colors.error }]}>Del</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  // ==========================================
  // FORM MODAL
  // ==========================================

  const renderFormModal = () => (
    <Modal visible={showFormModal} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowFormModal(false)}>
            <Ionicons name="close" size={28} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: colors.text }]}>
            {editingCampaign ? 'Edit Campaign' : 'Create Campaign'}
          </Text>
          <TouchableOpacity onPress={handleSave} disabled={isSaving}>
            {isSaving ? (
              <ActivityIndicator size="small" color={colors.info} />
            ) : (
              <Text style={styles.saveBtn}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.formScroll} contentContainerStyle={{ paddingBottom: 40 }}>
          {/* Basic Info */}
          <Text style={styles.formSectionTitle}>Basic Info</Text>

          <Text style={styles.formLabel}>Slug (unique identifier)</Text>
          <TextInput
            style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
            value={formData.slug || ''}
            onChangeText={(v) => setFormData(prev => ({ ...prev, slug: v.toLowerCase().replace(/[^a-z0-9-]/g, '-') }))}
            placeholder="super-cashback-feb26"
            placeholderTextColor={colors.muted}
            editable={!editingCampaign}
          />

          <Text style={styles.formLabel}>Title</Text>
          <TextInput
            style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
            value={formData.title || ''}
            onChangeText={(v) => setFormData(prev => ({ ...prev, title: v }))}
            placeholder="Super Cashback Weekend"
            placeholderTextColor={colors.muted}
          />

          <Text style={styles.formLabel}>Subtitle</Text>
          <TextInput
            style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
            value={formData.subtitle || ''}
            onChangeText={(v) => setFormData(prev => ({ ...prev, subtitle: v }))}
            placeholder="Up to 50% cashback on all stores"
            placeholderTextColor={colors.muted}
          />

          <Text style={styles.formLabel}>Description</Text>
          <TextInput
            style={[styles.formInput, styles.formTextArea, { color: colors.text, borderColor: colors.border }]}
            value={formData.description || ''}
            onChangeText={(v) => setFormData(prev => ({ ...prev, description: v }))}
            multiline
            numberOfLines={3}
            placeholder="Detailed campaign description..."
            placeholderTextColor={colors.muted}
          />

          <Text style={styles.formLabel}>Campaign Type</Text>
          <View style={styles.chipRow}>
            {Object.entries(CAMPAIGN_TYPE_LABELS).map(([key, label]) => (
              <TouchableOpacity
                key={key}
                style={[styles.chip, formData.campaignType === key && styles.chipSelected]}
                onPress={() => setFormData(prev => ({ ...prev, campaignType: key as any }))}
              >
                <Text style={[styles.chipText, formData.campaignType === key && styles.chipTextSelected]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.formLabel}>Status</Text>
          <View style={styles.chipRow}>
            {['draft', 'scheduled', 'active'].map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.chip, formData.status === s && styles.chipSelected]}
                onPress={() => setFormData(prev => ({ ...prev, status: s as any }))}
              >
                <Text style={[styles.chipText, formData.status === s && styles.chipTextSelected]}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Reward */}
          <Text style={styles.formSectionTitle}>Reward</Text>

          <Text style={styles.formLabel}>Reward Type</Text>
          <View style={styles.chipRow}>
            {Object.entries(REWARD_TYPE_LABELS).map(([key, label]) => (
              <TouchableOpacity
                key={key}
                style={[styles.chip, formData.reward?.type === key && styles.chipSelected]}
                onPress={() => setFormData(prev => ({
                  ...prev,
                  reward: { ...prev.reward!, type: key as any },
                }))}
              >
                <Text style={[styles.chipText, formData.reward?.type === key && styles.chipTextSelected]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.formRow}>
            <View style={styles.formRowItem}>
              <Text style={styles.formLabel}>Value</Text>
              <TextInput
                style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
                value={String(formData.reward?.value || '')}
                onChangeText={(v) => setFormData(prev => ({
                  ...prev,
                  reward: { ...prev.reward!, value: Number(v) || 0 },
                }))}
                keyboardType="numeric"
                placeholder="10"
                placeholderTextColor={colors.muted}
              />
            </View>
            <View style={styles.formRowItem}>
              <Text style={styles.formLabel}>Total Budget</Text>
              <TextInput
                style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
                value={String(formData.reward?.totalBudget || '')}
                onChangeText={(v) => setFormData(prev => ({
                  ...prev,
                  reward: { ...prev.reward!, totalBudget: Number(v) || 0 },
                }))}
                keyboardType="numeric"
                placeholder="10000"
                placeholderTextColor={colors.muted}
              />
            </View>
          </View>

          <View style={styles.formRow}>
            <View style={styles.formRowItem}>
              <Text style={styles.formLabel}>Cap/User</Text>
              <TextInput
                style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
                value={String(formData.reward?.capPerUser || '')}
                onChangeText={(v) => setFormData(prev => ({
                  ...prev,
                  reward: { ...prev.reward!, capPerUser: Number(v) || 0 },
                }))}
                keyboardType="numeric"
                placeholder="100"
                placeholderTextColor={colors.muted}
              />
            </View>
            <View style={styles.formRowItem}>
              <Text style={styles.formLabel}>Cap/Transaction</Text>
              <TextInput
                style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
                value={String(formData.reward?.capPerTransaction || '')}
                onChangeText={(v) => setFormData(prev => ({
                  ...prev,
                  reward: { ...prev.reward!, capPerTransaction: Number(v) || 0 },
                }))}
                keyboardType="numeric"
                placeholder="50"
                placeholderTextColor={colors.muted}
              />
            </View>
          </View>

          {/* Limits */}
          <Text style={styles.formSectionTitle}>Usage Limits</Text>

          <View style={styles.formRow}>
            <View style={styles.formRowItem}>
              <Text style={styles.formLabel}>Max Claims/User</Text>
              <TextInput
                style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
                value={String(formData.limits?.maxClaimsPerUser || '')}
                onChangeText={(v) => setFormData(prev => ({
                  ...prev,
                  limits: { ...prev.limits!, maxClaimsPerUser: Number(v) || 1 },
                }))}
                keyboardType="numeric"
                placeholder="1"
                placeholderTextColor={colors.muted}
              />
            </View>
            <View style={styles.formRowItem}>
              <Text style={styles.formLabel}>Max Claims/User/Day</Text>
              <TextInput
                style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
                value={String(formData.limits?.maxClaimsPerUserPerDay || '')}
                onChangeText={(v) => setFormData(prev => ({
                  ...prev,
                  limits: { ...prev.limits!, maxClaimsPerUserPerDay: Number(v) || 0 },
                }))}
                keyboardType="numeric"
                placeholder="0 = unlimited"
                placeholderTextColor={colors.muted}
              />
            </View>
          </View>

          {/* Schedule */}
          <Text style={styles.formSectionTitle}>Schedule</Text>

          <Text style={styles.formLabel}>Start Date & Time</Text>
          <View style={styles.formRow}>
            <View style={styles.formRowItem}>
              <TextInput
                style={[
                  styles.formInput,
                  { color: colors.text, borderColor: colors.border },
                  startDate !== '' && !isValidDate(startDate) && styles.formInputError,
                ]}
                value={startDate}
                onChangeText={(v) => {
                  setStartDate(v);
                  const iso = combineDateAndTime(v, startTimeInput);
                  if (iso) setFormData(prev => ({ ...prev, startTime: iso }));
                }}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.muted}
                maxLength={10}
              />
              <Text style={styles.formInputHint}>Date</Text>
            </View>
            <View style={styles.formRowItem}>
              <TextInput
                style={[
                  styles.formInput,
                  { color: colors.text, borderColor: colors.border },
                  startTimeInput !== '' && !isValidTime(startTimeInput) && styles.formInputError,
                ]}
                value={startTimeInput}
                onChangeText={(v) => {
                  setStartTimeInput(v);
                  const iso = combineDateAndTime(startDate, v);
                  if (iso) setFormData(prev => ({ ...prev, startTime: iso }));
                }}
                placeholder="HH:MM"
                placeholderTextColor={colors.muted}
                maxLength={5}
              />
              <Text style={styles.formInputHint}>Time (24h)</Text>
            </View>
          </View>
          {formatDatePreview(startDate, startTimeInput) && (
            <Text style={styles.datePreview}>{formatDatePreview(startDate, startTimeInput)}</Text>
          )}

          <Text style={[styles.formLabel, { marginTop: 14 }]}>End Date & Time</Text>
          <View style={styles.formRow}>
            <View style={styles.formRowItem}>
              <TextInput
                style={[
                  styles.formInput,
                  { color: colors.text, borderColor: colors.border },
                  endDate !== '' && !isValidDate(endDate) && styles.formInputError,
                ]}
                value={endDate}
                onChangeText={(v) => {
                  setEndDate(v);
                  const iso = combineDateAndTime(v, endTimeInput);
                  if (iso) setFormData(prev => ({ ...prev, endTime: iso }));
                }}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.muted}
                maxLength={10}
              />
              <Text style={styles.formInputHint}>Date</Text>
            </View>
            <View style={styles.formRowItem}>
              <TextInput
                style={[
                  styles.formInput,
                  { color: colors.text, borderColor: colors.border },
                  endTimeInput !== '' && !isValidTime(endTimeInput) && styles.formInputError,
                ]}
                value={endTimeInput}
                onChangeText={(v) => {
                  setEndTimeInput(v);
                  const iso = combineDateAndTime(endDate, v);
                  if (iso) setFormData(prev => ({ ...prev, endTime: iso }));
                }}
                placeholder="HH:MM"
                placeholderTextColor={colors.muted}
                maxLength={5}
              />
              <Text style={styles.formInputHint}>Time (24h)</Text>
            </View>
          </View>
          {formatDatePreview(endDate, endTimeInput) && (
            <Text style={styles.datePreview}>{formatDatePreview(endDate, endTimeInput)}</Text>
          )}

          {/* Funding Source & Coin Type */}
          <Text style={styles.formSectionTitle}>Funding & Coin Type</Text>

          <Text style={styles.formLabel}>Funding Source</Text>
          <View style={styles.chipRow}>
            {FUNDING_SOURCE_OPTIONS.map(({ key, label }) => (
              <TouchableOpacity
                key={key}
                style={[styles.chip, formData.fundingSource?.type === key && styles.chipSelected]}
                onPress={() => setFormData(prev => ({
                  ...prev,
                  fundingSource: {
                    ...prev.fundingSource!,
                    type: key as any,
                    ...(key === 'platform' ? { partnerName: '' } : {}),
                  },
                }))}
              >
                <Text style={[styles.chipText, formData.fundingSource?.type === key && styles.chipTextSelected]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {formData.fundingSource?.type && formData.fundingSource.type !== 'platform' && (
            <>
              <Text style={styles.formLabel}>Partner Name</Text>
              <TextInput
                style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
                value={formData.fundingSource?.partnerName || ''}
                onChangeText={(v) => setFormData(prev => ({
                  ...prev,
                  fundingSource: { ...prev.fundingSource!, partnerName: v },
                }))}
                placeholder="e.g. HDFC Bank, Swiggy"
                placeholderTextColor={colors.muted}
              />
            </>
          )}

          <Text style={styles.formLabel}>Coin Type</Text>
          <View style={styles.chipRow}>
            {COIN_TYPE_OPTIONS.map(({ key, label }) => (
              <TouchableOpacity
                key={key}
                style={[styles.chip, formData.reward?.coinType === key && styles.chipSelected]}
                onPress={() => setFormData(prev => ({
                  ...prev,
                  reward: { ...prev.reward!, coinType: key as any },
                }))}
              >
                <Text style={[styles.chipText, formData.reward?.coinType === key && styles.chipTextSelected]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Eligibility Rules */}
          <Text style={styles.formSectionTitle}>Eligibility Rules</Text>
          <Text style={styles.formHint}>Leave fields empty to apply no restriction (all allowed).</Text>

          <Text style={styles.formLabel}>Regions (comma-separated)</Text>
          <TextInput
            style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
            value={(formData.eligibility?.regions || []).join(',')}
            onChangeText={(v) => setFormData(prev => ({
              ...prev,
              eligibility: {
                ...prev.eligibility!,
                regions: v ? v.split(',').map(s => s.trim()).filter(Boolean) : [],
              },
            }))}
            placeholder="all"
            placeholderTextColor={colors.muted}
          />

          <Text style={styles.formLabel}>Payment Methods</Text>
          <View style={styles.chipRow}>
            {PAYMENT_METHOD_OPTIONS.map(({ key, label }) => {
              const selected = (formData.eligibility?.paymentMethods || []).includes(key);
              return (
                <TouchableOpacity
                  key={key}
                  style={[styles.chip, selected && styles.chipSelected]}
                  onPress={() => setFormData(prev => {
                    const current = prev.eligibility?.paymentMethods || [];
                    const updated = selected
                      ? current.filter(m => m !== key)
                      : [...current, key];
                    return { ...prev, eligibility: { ...prev.eligibility!, paymentMethods: updated } };
                  })}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.formLabel}>Bank Codes (comma-separated)</Text>
          <TextInput
            style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
            value={(formData.eligibility?.bankCodes || []).join(',')}
            onChangeText={(v) => setFormData(prev => ({
              ...prev,
              eligibility: {
                ...prev.eligibility!,
                bankCodes: v ? v.split(',').map(s => s.trim().toUpperCase()).filter(Boolean) : [],
              },
            }))}
            placeholder="HDFC,ICICI,SBI"
            placeholderTextColor={colors.muted}
            autoCapitalize="characters"
          />

          <Text style={styles.formLabel}>BIN Prefixes (comma-separated)</Text>
          <TextInput
            style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
            value={(formData.eligibility?.binPrefixes || []).join(',')}
            onChangeText={(v) => setFormData(prev => ({
              ...prev,
              eligibility: {
                ...prev.eligibility!,
                binPrefixes: v ? v.split(',').map(s => s.trim()).filter(Boolean) : [],
              },
            }))}
            placeholder="411111,523456"
            placeholderTextColor={colors.muted}
            keyboardType="numeric"
          />

          <Text style={styles.formLabel}>Merchant Categories</Text>
          <View style={styles.chipRow}>
            {MERCHANT_CATEGORY_OPTIONS.map(({ key, label }) => {
              const selected = (formData.eligibility?.merchantCategories || []).includes(key);
              return (
                <TouchableOpacity
                  key={key}
                  style={[styles.chip, selected && styles.chipSelected]}
                  onPress={() => setFormData(prev => {
                    const current = prev.eligibility?.merchantCategories || [];
                    const updated = selected
                      ? current.filter(m => m !== key)
                      : [...current, key];
                    return { ...prev, eligibility: { ...prev.eligibility!, merchantCategories: updated } };
                  })}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.formLabel}>User Segments</Text>
          <View style={styles.chipRow}>
            {USER_SEGMENT_OPTIONS.map(({ key, label }) => {
              const selected = (formData.eligibility?.userSegments || []).includes(key);
              return (
                <TouchableOpacity
                  key={key}
                  style={[styles.chip, selected && styles.chipSelected]}
                  onPress={() => setFormData(prev => {
                    const current = prev.eligibility?.userSegments || [];
                    const updated = selected
                      ? current.filter(m => m !== key)
                      : [...current, key];
                    return { ...prev, eligibility: { ...prev.eligibility!, userSegments: updated } };
                  })}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.formLabel}>Minimum Spend</Text>
          <TextInput
            style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
            value={String(formData.eligibility?.minSpend || '')}
            onChangeText={(v) => setFormData(prev => ({
              ...prev,
              eligibility: { ...prev.eligibility!, minSpend: Number(v) || 0 },
            }))}
            keyboardType="numeric"
            placeholder="0 = no minimum"
            placeholderTextColor={colors.muted}
          />

          <View style={styles.switchRow}>
            <Text style={styles.formLabel}>First Transaction Only</Text>
            <Switch
              value={formData.eligibility?.firstTransactionOnly || false}
              onValueChange={(v) => setFormData(prev => ({
                ...prev,
                eligibility: { ...prev.eligibility!, firstTransactionOnly: v },
              }))}
            />
          </View>

          {/* Display */}
          <Text style={styles.formSectionTitle}>Display</Text>

          <View style={styles.formRow}>
            <View style={styles.formRowItem}>
              <Text style={styles.formLabel}>Icon (emoji)</Text>
              <TextInput
                style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
                value={formData.display?.icon || ''}
                onChangeText={(v) => setFormData(prev => ({
                  ...prev,
                  display: { ...prev.display!, icon: v },
                }))}
                placeholder="🎁"
                placeholderTextColor={colors.muted}
              />
            </View>
            <View style={styles.formRowItem}>
              <Text style={styles.formLabel}>Priority (0-100)</Text>
              <TextInput
                style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
                value={String(formData.display?.priority || '')}
                onChangeText={(v) => setFormData(prev => ({
                  ...prev,
                  display: { ...prev.display!, priority: Number(v) || 0 },
                }))}
                keyboardType="numeric"
                placeholder="50"
                placeholderTextColor={colors.muted}
              />
            </View>
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.formLabel}>Featured</Text>
            <Switch
              value={formData.display?.featured || false}
              onValueChange={(v) => setFormData(prev => ({
                ...prev,
                display: { ...prev.display!, featured: v },
              }))}
            />
          </View>

          <Text style={styles.formLabel}>Badge Text</Text>
          <TextInput
            style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
            value={formData.display?.badgeText || ''}
            onChangeText={(v) => setFormData(prev => ({
              ...prev,
              display: { ...prev.display!, badgeText: v },
            }))}
            placeholder="50% OFF"
            placeholderTextColor={colors.muted}
          />

          <Text style={styles.formLabel}>Banner Image URL</Text>
          <TextInput
            style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
            value={(formData.display as any)?.bannerImage || ''}
            onChangeText={(v) => setFormData(prev => ({
              ...prev,
              display: { ...prev.display!, bannerImage: v } as any,
            }))}
            placeholder="https://example.com/banner.jpg"
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {!!(formData.display as any)?.bannerImage && (
            <Image
              source={{ uri: (formData.display as any).bannerImage }}
              style={styles.imagePreview}
              resizeMode="cover"
            />
          )}

          <Text style={styles.formLabel}>Partner Logo URL</Text>
          <TextInput
            style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
            value={(formData.display as any)?.partnerLogo || ''}
            onChangeText={(v) => setFormData(prev => ({
              ...prev,
              display: { ...prev.display!, partnerLogo: v } as any,
            }))}
            placeholder="https://example.com/logo.png"
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {!!(formData.display as any)?.partnerLogo && (
            <Image
              source={{ uri: (formData.display as any).partnerLogo }}
              style={styles.imagePreviewSmall}
              resizeMode="contain"
            />
          )}

          {/* Deep Link */}
          <Text style={styles.formSectionTitle}>Deep Link</Text>

          <Text style={styles.formLabel}>Screen Path</Text>
          <TextInput
            style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
            value={formData.deepLink?.screen || ''}
            onChangeText={(v) => setFormData(prev => ({
              ...prev,
              deepLink: { ...prev.deepLink!, screen: v },
            }))}
            placeholder="/cash-store"
            placeholderTextColor={colors.muted}
          />

          {/* Terms */}
          <Text style={styles.formSectionTitle}>Terms & Conditions</Text>
          {(formData.terms || []).map((term, i) => (
            <View key={i} style={styles.termRow}>
              <Text style={styles.termText} numberOfLines={2}>{term}</Text>
              <TouchableOpacity onPress={() => {
                setFormData(prev => ({
                  ...prev,
                  terms: (prev.terms || []).filter((_, idx) => idx !== i),
                }));
              }}>
                <Ionicons name="close-circle" size={20} color={colors.error} />
              </TouchableOpacity>
            </View>
          ))}
          <View style={styles.addTermRow}>
            <TextInput
              style={[styles.formInput, { flex: 1, color: colors.text, borderColor: colors.border }]}
              value={newTerm}
              onChangeText={setNewTerm}
              placeholder="Add a term..."
              placeholderTextColor={colors.muted}
            />
            <TouchableOpacity
              style={styles.addTermBtn}
              onPress={() => {
                if (newTerm.trim()) {
                  setFormData(prev => ({
                    ...prev,
                    terms: [...(prev.terms || []), newTerm.trim()],
                  }));
                  setNewTerm('');
                }
              }}
            >
              <Ionicons name="add-circle" size={28} color={colors.info} />
            </TouchableOpacity>
          </View>

          {/* Card Preview */}
          <Text style={styles.formSectionTitle}>Card Preview</Text>
          <View style={styles.previewContainer}>
            <View style={[styles.previewCard, { backgroundColor: formData.display?.backgroundColor || colors.warningLight }]}>
              {/* Preview header row */}
              <View style={styles.previewHeader}>
                <Text style={styles.previewIcon}>{formData.display?.icon || '🎁'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.previewTitle} numberOfLines={1}>
                    {formData.title || 'Campaign Title'}
                  </Text>
                  <Text style={styles.previewSubtitle} numberOfLines={2}>
                    {formData.subtitle || 'Campaign subtitle will appear here'}
                  </Text>
                </View>
              </View>

              {/* Reward badge */}
              <View style={styles.previewRewardRow}>
                <View style={styles.previewRewardBadge}>
                  <Text style={styles.previewRewardText}>
                    {formData.reward?.type === 'percentage'
                      ? `${formData.reward?.value || 0}% Cashback`
                      : formData.reward?.type === 'multiplier'
                        ? `${formData.reward?.value || 0}x Multiplier`
                        : `${formData.reward?.value || 0} Coins`}
                  </Text>
                </View>
                <View style={styles.previewTypeBadge}>
                  <Text style={styles.previewTypeText}>
                    {CAMPAIGN_TYPE_LABELS[formData.campaignType || ''] || formData.campaignType || 'Type'}
                  </Text>
                </View>
              </View>

              {/* Featured badge */}
              {formData.display?.featured && (
                <View style={styles.previewFeaturedBadge}>
                  <Ionicons name="star" size={10} color={colors.warningDark} />
                  <Text style={styles.previewFeaturedText}>Featured</Text>
                </View>
              )}

              {/* Schedule preview */}
              {formatDatePreview(startDate, startTimeInput) && (
                <View style={styles.previewScheduleRow}>
                  <Ionicons name="calendar-outline" size={12} color={colors.mutedDark} />
                  <Text style={styles.previewScheduleText} numberOfLines={1}>
                    {formatDatePreview(startDate, startTimeInput)}
                    {formatDatePreview(endDate, endTimeInput) ? ` - ${formatDatePreview(endDate, endTimeInput)}` : ''}
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.previewLabel}>This is how the campaign card will appear to users</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  // ==========================================
  // ANALYTICS MODAL
  // ==========================================

  const renderAnalyticsModal = () => (
    <Modal visible={!!selectedCampaignId} animationType="slide" transparent>
      <View style={styles.analyticsOverlay}>
        <View style={[styles.analyticsContainer, { backgroundColor: colors.card }]}>
          <View style={styles.analyticsHeader}>
            <Text style={[styles.analyticsTitle, { color: colors.text }]}>Campaign Analytics</Text>
            <TouchableOpacity onPress={() => { setSelectedCampaignId(null); setAnalytics(null); }}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {analyticsLoading ? (
            <ActivityIndicator size="large" color={colors.info} style={{ paddingVertical: 40 }} />
          ) : analytics ? (
            <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
              <View style={styles.analyticsGrid}>
                <View style={styles.analyticsCard}>
                  <Text style={styles.analyticsCardValue}>{analytics.totalClaims}</Text>
                  <Text style={styles.analyticsCardLabel}>Total Claims</Text>
                </View>
                <View style={styles.analyticsCard}>
                  <Text style={styles.analyticsCardValue}>{analytics.creditedClaims}</Text>
                  <Text style={styles.analyticsCardLabel}>Credited</Text>
                </View>
                <View style={styles.analyticsCard}>
                  <Text style={styles.analyticsCardValue}>{analytics.pendingClaims}</Text>
                  <Text style={styles.analyticsCardLabel}>Pending</Text>
                </View>
                <View style={styles.analyticsCard}>
                  <Text style={styles.analyticsCardValue}>{analytics.rejectedClaims}</Text>
                  <Text style={styles.analyticsCardLabel}>Rejected</Text>
                </View>
                <View style={styles.analyticsCard}>
                  <Text style={styles.analyticsCardValue}>{analytics.uniqueUsers}</Text>
                  <Text style={styles.analyticsCardLabel}>Unique Users</Text>
                </View>
                <View style={styles.analyticsCard}>
                  <Text style={styles.analyticsCardValue}>{analytics.totalCoinsDistributed?.toLocaleString()}</Text>
                  <Text style={styles.analyticsCardLabel}>Coins Distributed</Text>
                </View>
                <View style={styles.analyticsCard}>
                  <Text style={styles.analyticsCardValue}>{analytics.budgetUsedPercent}%</Text>
                  <Text style={styles.analyticsCardLabel}>Budget Used</Text>
                </View>
                <View style={styles.analyticsCard}>
                  <Text style={styles.analyticsCardValue}>{analytics.avgRewardPerUser}</Text>
                  <Text style={styles.analyticsCardLabel}>Avg/User</Text>
                </View>
              </View>
            </ScrollView>
          ) : null}
        </View>
      </View>
    </Modal>
  );

  // ==========================================
  // DASHBOARD TAB
  // ==========================================

  const renderDashboard = () => (
    <ScrollView
      contentContainerStyle={{ padding: 16 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {dashboardLoading ? (
        <ActivityIndicator size="large" color={colors.info} style={{ paddingVertical: 40 }} />
      ) : dashboardStats ? (
        <>
          <View style={styles.dashboardGrid}>
            <View style={[styles.dashboardCard, { backgroundColor: colors.infoLight }]}>
              <Text style={[styles.dashboardValue, { color: '#1D4ED8' }]}>{dashboardStats.activeCampaigns}</Text>
              <Text style={styles.dashboardLabel}>Active Campaigns</Text>
            </View>
            <View style={[styles.dashboardCard, { backgroundColor: colors.successLighter }]}>
              <Text style={[styles.dashboardValue, { color: colors.greenDark }]}>{dashboardStats.totalBudgetAllocated?.toLocaleString()}</Text>
              <Text style={styles.dashboardLabel}>Total Budget</Text>
            </View>
            <View style={[styles.dashboardCard, { backgroundColor: colors.warningLight }]}>
              <Text style={[styles.dashboardValue, { color: colors.warningDark }]}>{dashboardStats.totalBudgetConsumed?.toLocaleString()}</Text>
              <Text style={styles.dashboardLabel}>Budget Consumed</Text>
            </View>
            <View style={[styles.dashboardCard, { backgroundColor: '#FDF2F8' }]}>
              <Text style={[styles.dashboardValue, { color: '#DB2777' }]}>{dashboardStats.totalClaimsLast30d}</Text>
              <Text style={styles.dashboardLabel}>Claims (30d)</Text>
            </View>
          </View>

          {dashboardStats.campaignsByStatus && (
            <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.sectionCardTitle, { color: colors.text }]}>Campaigns by Status</Text>
              {Object.entries(dashboardStats.campaignsByStatus).map(([status, count]) => (
                <View key={status} style={styles.statusRow}>
                  <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[status] || colors.slateMedium }]} />
                  <Text style={[styles.statusRowLabel, { color: colors.text }]}>{status}</Text>
                  <Text style={styles.statusRowCount}>{count as number}</Text>
                </View>
              ))}
            </View>
          )}
        </>
      ) : (
        <Text style={styles.emptyText}>No data available</Text>
      )}
    </ScrollView>
  );

  // ==========================================
  // CLAIMS TAB
  // ==========================================

  const CLAIM_STATUS_COLORS: Record<string, string> = {
    pending: colors.warning,
    verified: colors.info,
    credited: colors.success,
    rejected: colors.error,
    expired: colors.secondaryText,
    failed: colors.errorDark,
  };

  const renderClaimRow = (claim: BonusCampaignClaim) => (
    <View key={claim._id} style={[styles.claimRow, { backgroundColor: colors.card }]}>
      <View style={styles.claimInfo}>
        <Text style={[styles.claimUser, { color: colors.text }]} numberOfLines={1}>
          {claim.userName || claim.userPhone || claim.userId}
        </Text>
        <Text style={styles.claimAmount}>{claim.rewardAmount} coins</Text>
        <View style={[styles.statusBadge, { backgroundColor: `${CLAIM_STATUS_COLORS[claim.status] || colors.slateMedium}20` }]}>
          <View style={[styles.statusDot, { backgroundColor: CLAIM_STATUS_COLORS[claim.status] || colors.slateMedium }]} />
          <Text style={[styles.statusText, { color: CLAIM_STATUS_COLORS[claim.status] || colors.slateMedium }]}>
            {claim.status.charAt(0).toUpperCase() + claim.status.slice(1)}
          </Text>
        </View>
        <Text style={styles.claimDate}>{formatDate(claim.claimedAt)}</Text>
      </View>
      {claim.status !== 'rejected' && claim.status !== 'expired' && (
        <TouchableOpacity
          style={styles.rejectBtn}
          onPress={() => openRejectModal(claim._id)}
        >
          <Ionicons name="close-circle-outline" size={18} color={colors.error} />
          <Text style={styles.rejectBtnText}>Reject</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderFraudAlertRow = (alert: BonusFraudAlert) => {
    const severityColors: Record<string, string> = {
      low: colors.secondaryText,
      medium: colors.warning,
      high: colors.error,
      critical: colors.errorDark,
    };
    return (
      <View key={alert._id} style={[styles.fraudAlertRow, { backgroundColor: colors.card, borderLeftColor: severityColors[alert.severity] || colors.secondaryText }]}>
        <View style={styles.fraudAlertHeader}>
          <View style={[styles.severityBadge, { backgroundColor: `${severityColors[alert.severity] || colors.secondaryText}20` }]}>
            <Text style={[styles.severityText, { color: severityColors[alert.severity] || colors.secondaryText }]}>
              {alert.severity.toUpperCase()}
            </Text>
          </View>
          <Text style={styles.fraudAlertDate}>{formatDate(alert.detectedAt)}</Text>
        </View>
        <Text style={[styles.fraudAlertType, { color: colors.text }]}>{alert.alertType}</Text>
        <Text style={styles.fraudAlertDesc} numberOfLines={2}>{alert.description}</Text>
        {alert.userName && <Text style={styles.fraudAlertUser}>User: {alert.userName}</Text>}
        {alert.campaignTitle && <Text style={styles.fraudAlertCampaign}>Campaign: {alert.campaignTitle}</Text>}
      </View>
    );
  };

  const renderClaimsTab = () => (
    <ScrollView
      contentContainerStyle={{ padding: 16 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Campaign Selector */}
      <Text style={[styles.sectionCardTitle, { color: colors.text, marginBottom: 8 }]}>Select Campaign</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
        {campaigns.map((c) => (
          <TouchableOpacity
            key={c._id}
            style={[
              styles.filterChip,
              claimsCampaignId === c._id && styles.filterChipActive,
              { marginRight: 8 },
            ]}
            onPress={() => {
              setClaimsCampaignId(c._id);
              loadClaimsForCampaign(c._id, 1);
            }}
          >
            <Text
              style={[
                styles.filterChipText,
                claimsCampaignId === c._id && styles.filterChipTextActive,
              ]}
              numberOfLines={1}
            >
              {c.display?.icon || ''} {c.title}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Status filter */}
      {claimsCampaignId && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
          {['all', 'pending', 'verified', 'credited', 'rejected', 'expired'].map((s) => (
            <TouchableOpacity
              key={s}
              style={[
                styles.filterChip,
                claimsStatusFilter === s && styles.filterChipActive,
                { marginRight: 8 },
              ]}
              onPress={() => {
                setClaimsStatusFilter(s);
                if (claimsCampaignId) {
                  // Trigger reload with new filter
                  setTimeout(() => loadClaimsForCampaign(claimsCampaignId, 1), 0);
                }
              }}
            >
              <Text style={[styles.filterChipText, claimsStatusFilter === s && styles.filterChipTextActive]}>
                {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Claims List */}
      {claimsCampaignId ? (
        claimsLoading ? (
          <ActivityIndicator size="large" color={colors.info} style={{ paddingVertical: 40 }} />
        ) : claims.length > 0 ? (
          <>
            {claims.map(renderClaimRow)}
            {claimsTotalPages > 1 && (
              <View style={styles.pagination}>
                <TouchableOpacity
                  style={[styles.pageBtn, claimsPage <= 1 && styles.pageBtnDisabled]}
                  onPress={() => claimsPage > 1 && loadClaimsForCampaign(claimsCampaignId, claimsPage - 1)}
                  disabled={claimsPage <= 1}
                >
                  <Text style={styles.pageBtnText}>Previous</Text>
                </TouchableOpacity>
                <Text style={styles.pageInfo}>Page {claimsPage} of {claimsTotalPages}</Text>
                <TouchableOpacity
                  style={[styles.pageBtn, claimsPage >= claimsTotalPages && styles.pageBtnDisabled]}
                  onPress={() => claimsPage < claimsTotalPages && loadClaimsForCampaign(claimsCampaignId, claimsPage + 1)}
                  disabled={claimsPage >= claimsTotalPages}
                >
                  <Text style={styles.pageBtnText}>Next</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={48} color={colors.gray300} />
            <Text style={styles.emptyText}>No claims found for this campaign</Text>
          </View>
        )
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="arrow-up-outline" size={48} color={colors.gray300} />
          <Text style={styles.emptyText}>Select a campaign above to view claims</Text>
        </View>
      )}

      {/* Fraud Alerts Section */}
      <View style={{ marginTop: 24 }}>
        <View style={styles.fraudAlertsHeader}>
          <Ionicons name="warning-outline" size={20} color={colors.error} />
          <Text style={[styles.sectionCardTitle, { color: colors.text, marginBottom: 0, marginLeft: 6 }]}>
            Fraud Alerts
          </Text>
          <TouchableOpacity onPress={loadFraudAlerts} style={{ marginLeft: 'auto' }}>
            <Ionicons name="refresh-outline" size={18} color={colors.mutedDark} />
          </TouchableOpacity>
        </View>
        {fraudAlertsLoading ? (
          <ActivityIndicator size="small" color={colors.error} style={{ paddingVertical: 20 }} />
        ) : fraudAlerts.length > 0 ? (
          fraudAlerts.map(renderFraudAlertRow)
        ) : (
          <View style={[styles.emptyContainer, { paddingVertical: 20 }]}>
            <Ionicons name="shield-checkmark-outline" size={36} color={colors.success} />
            <Text style={[styles.emptyText, { color: colors.success }]}>No fraud alerts detected</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );

  // ==========================================
  // REJECT CLAIM MODAL
  // ==========================================

  const renderRejectModal = () => (
    <Modal visible={showRejectModal} animationType="fade" transparent>
      <View style={styles.analyticsOverlay}>
        <View style={[styles.rejectModalContainer, { backgroundColor: colors.card }]}>
          <Text style={[styles.analyticsTitle, { color: colors.text, marginBottom: 12 }]}>Reject Claim</Text>
          <Text style={[styles.formLabel, { marginTop: 0 }]}>Reason for rejection</Text>
          <TextInput
            style={[styles.formInput, styles.formTextArea, { color: colors.text, borderColor: colors.border, marginBottom: 16 }]}
            value={rejectReason}
            onChangeText={setRejectReason}
            placeholder="Enter reason for rejection..."
            placeholderTextColor={colors.muted}
            multiline
            numberOfLines={3}
          />
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity
              style={[styles.pageBtn, { flex: 1, backgroundColor: colors.mutedDark, alignItems: 'center' }]}
              onPress={() => { setShowRejectModal(false); setRejectingClaimId(null); }}
            >
              <Text style={styles.pageBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.pageBtn, { flex: 1, backgroundColor: colors.error, alignItems: 'center' }]}
              onPress={handleRejectClaim}
            >
              <Text style={styles.pageBtnText}>Reject</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // ==========================================
  // FUND MODAL
  // ==========================================

  const renderFundModal = () => (
    <Modal visible={showFundModal} animationType="fade" transparent>
      <View style={styles.analyticsOverlay}>
        <View style={[styles.rejectModalContainer, { backgroundColor: colors.card }]}>
          <Text style={[styles.analyticsTitle, { color: colors.text, marginBottom: 12 }]}>Fund Campaign</Text>
          <Text style={[styles.formLabel, { marginTop: 0 }]}>Amount (coins)</Text>
          <TextInput
            style={[styles.formInput, { color: colors.text, borderColor: colors.border, marginBottom: 16 }]}
            value={fundAmount}
            onChangeText={setFundAmount}
            placeholder="Enter amount"
            placeholderTextColor={colors.muted}
            keyboardType="numeric"
            autoFocus
          />
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity
              style={[styles.pageBtn, { flex: 1, backgroundColor: colors.mutedDark, alignItems: 'center' }]}
              onPress={() => { setShowFundModal(false); setFundCampaignId(null); }}
            >
              <Text style={styles.pageBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.pageBtn, { flex: 1, backgroundColor: colors.success, alignItems: 'center' }]}
              onPress={handleFundConfirm}
            >
              <Text style={styles.pageBtnText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // ==========================================
  // MAIN RENDER
  // ==========================================

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Bonus Zone</Text>
        {activeTab === 'campaigns' && (
          <TouchableOpacity style={styles.createBtn} onPress={handleCreate}>
            <Ionicons name="add" size={20} color={colors.card} />
            <Text style={styles.createBtnText}>Create</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs */}
      <View style={[styles.tabs, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {(['campaigns', 'analytics', 'claims'] as TabType[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Filters (campaigns tab only) */}
      {activeTab === 'campaigns' && (
        <View style={[styles.filtersBar, { backgroundColor: colors.card }]}>
          <TextInput
            style={[styles.searchInput, { color: colors.text, borderColor: colors.border }]}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={() => loadCampaigns(1)}
            placeholder="Search campaigns..."
            placeholderTextColor={colors.muted}
            returnKeyType="search"
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChips}>
            {(['all', 'active', 'draft', 'scheduled', 'paused', 'exhausted', 'expired'] as CampaignStatusFilter[]).map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.filterChip, statusFilter === s && styles.filterChipActive]}
                onPress={() => setStatusFilter(s)}
              >
                <Text style={[styles.filterChipText, statusFilter === s && styles.filterChipTextActive]}>
                  {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Content */}
      {activeTab === 'campaigns' ? (
        <FlatList
          data={campaigns}
          renderItem={renderCampaignCard}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            loading ? (
              <ActivityIndicator size="large" color={colors.info} style={{ paddingVertical: 40 }} />
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="gift-outline" size={48} color={colors.gray300} />
                <Text style={styles.emptyText}>No campaigns found</Text>
              </View>
            )
          }
          ListFooterComponent={
            totalPages > 1 ? (
              <View style={styles.pagination}>
                <TouchableOpacity
                  style={[styles.pageBtn, page <= 1 && styles.pageBtnDisabled]}
                  onPress={() => page > 1 && loadCampaigns(page - 1)}
                  disabled={page <= 1}
                >
                  <Text style={styles.pageBtnText}>Previous</Text>
                </TouchableOpacity>
                <Text style={styles.pageInfo}>Page {page} of {totalPages}</Text>
                <TouchableOpacity
                  style={[styles.pageBtn, page >= totalPages && styles.pageBtnDisabled]}
                  onPress={() => page < totalPages && loadCampaigns(page + 1)}
                  disabled={page >= totalPages}
                >
                  <Text style={styles.pageBtnText}>Next</Text>
                </TouchableOpacity>
              </View>
            ) : null
          }
        />
      ) : activeTab === 'claims' ? (
        renderClaimsTab()
      ) : (
        renderDashboard()
      )}

      {/* Modals */}
      {renderFormModal()}
      {renderAnalyticsModal()}
      {renderRejectModal()}
      {renderFundModal()}
    </View>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 22, fontWeight: '700' },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.info,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  createBtnText: { color: Colors.light.card, fontWeight: '600', fontSize: 14 },

  // Tabs
  tabs: { flexDirection: 'row', borderBottomWidth: 1 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: Colors.light.info },
  tabText: { fontSize: 14, color: Colors.light.mutedDark, fontWeight: '500' },
  tabTextActive: { color: Colors.light.info, fontWeight: '600' },

  // Filters
  filtersBar: { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.light.gray200 },
  searchInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    marginBottom: 8,
  },
  filterChips: { flexDirection: 'row' },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.light.backgroundSecondary,
    marginRight: 8,
  },
  filterChipActive: { backgroundColor: Colors.light.info },
  filterChipText: { fontSize: 12, color: Colors.light.mutedDark, fontWeight: '500' },
  filterChipTextActive: { color: Colors.light.card, fontWeight: '600' },

  // Campaign Card
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.light.gray200,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 },
  cardIcon: { fontSize: 28 },
  cardTitle: { fontSize: 15, fontWeight: '600' },
  cardSlug: { fontSize: 11, color: Colors.light.muted, marginTop: 1 },
  cardInfoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  infoChip: { backgroundColor: Colors.light.backgroundSecondary, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  infoChipText: { fontSize: 11, fontWeight: '500', color: Colors.light.gray700 },
  budgetRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 6 },
  budgetLabel: { fontSize: 12, color: Colors.light.mutedDark, fontWeight: '500' },
  budgetValue: { fontSize: 12, color: Colors.light.gray700, fontWeight: '600' },
  progressBarBg: { height: 4, backgroundColor: Colors.light.gray200, borderRadius: 2, marginBottom: 8 },
  progressBarFill: { height: 4, borderRadius: 2 },
  scheduleRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  scheduleText: { fontSize: 11, color: Colors.light.mutedDark },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  statsText: { fontSize: 11, color: Colors.light.muted },
  cardActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, borderTopWidth: 1, borderTopColor: Colors.light.backgroundSecondary, paddingTop: 10 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingVertical: 4, paddingHorizontal: 6 },
  actionText: { fontSize: 12, fontWeight: '500' },

  // Status Badge
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, gap: 4 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: '600' },

  // Form Modal
  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.gray200,
  },
  modalTitle: { fontSize: 17, fontWeight: '600' },
  saveBtn: { fontSize: 16, fontWeight: '600', color: Colors.light.info },
  formScroll: { paddingHorizontal: 20 },
  formSectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.light.navy, marginTop: 20, marginBottom: 10, borderBottomWidth: 1, borderBottomColor: Colors.light.backgroundSecondary, paddingBottom: 6 },
  formLabel: { fontSize: 13, fontWeight: '500', color: Colors.light.mutedDark, marginTop: 10, marginBottom: 4 },
  formHint: { fontSize: 12, color: Colors.light.muted, fontStyle: 'italic', marginBottom: 4 },
  formInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  formTextArea: { minHeight: 80, textAlignVertical: 'top' },
  formRow: { flexDirection: 'row', gap: 12 },
  formRowItem: { flex: 1 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: Colors.light.backgroundSecondary },
  chipSelected: { backgroundColor: Colors.light.info },
  chipText: { fontSize: 12, color: Colors.light.mutedDark, fontWeight: '500' },
  chipTextSelected: { color: Colors.light.card, fontWeight: '600' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  termRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 10, backgroundColor: Colors.light.backgroundTertiary, borderRadius: 8, marginBottom: 4, gap: 8 },
  termText: { flex: 1, fontSize: 13, color: Colors.light.gray700 },
  addTermRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  addTermBtn: { paddingTop: 4 },

  // Analytics Modal
  analyticsOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  analyticsContainer: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '70%' },
  analyticsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  analyticsTitle: { fontSize: 18, fontWeight: '700' },
  analyticsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  analyticsCard: { width: '47%', backgroundColor: Colors.light.backgroundTertiary, borderRadius: 10, padding: 14, alignItems: 'center' },
  analyticsCardValue: { fontSize: 22, fontWeight: '700', color: Colors.light.navy },
  analyticsCardLabel: { fontSize: 11, color: Colors.light.mutedDark, marginTop: 4, fontWeight: '500' },

  // Dashboard
  dashboardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  dashboardCard: { width: '47%', borderRadius: 12, padding: 16, alignItems: 'center' },
  dashboardValue: { fontSize: 24, fontWeight: '700' },
  dashboardLabel: { fontSize: 12, color: Colors.light.mutedDark, marginTop: 4, fontWeight: '500' },
  sectionCard: { borderRadius: 12, padding: 16, borderWidth: 1, borderColor: Colors.light.gray200 },
  sectionCardTitle: { fontSize: 15, fontWeight: '600', marginBottom: 12 },
  statusRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, gap: 8 },
  statusRowLabel: { flex: 1, fontSize: 13, textTransform: 'capitalize' },
  statusRowCount: { fontSize: 14, fontWeight: '600', color: Colors.light.gray700 },

  // Empty & Pagination
  emptyContainer: { paddingVertical: 40, alignItems: 'center' },
  emptyText: { fontSize: 14, color: Colors.light.muted, marginTop: 10 },
  pagination: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16 },
  pageBtn: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: Colors.light.info, borderRadius: 8 },
  pageBtnDisabled: { opacity: 0.4 },
  pageBtnText: { color: Colors.light.card, fontWeight: '500', fontSize: 13 },
  pageInfo: { fontSize: 13, color: Colors.light.mutedDark },

  // Claims Tab
  claimRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.light.gray200,
    marginBottom: 8,
  },
  claimInfo: { flex: 1, gap: 4 },
  claimUser: { fontSize: 14, fontWeight: '600' },
  claimAmount: { fontSize: 13, fontWeight: '600', color: Colors.light.success },
  claimDate: { fontSize: 11, color: Colors.light.muted },
  rejectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: Colors.light.errorLight,
    borderRadius: 8,
    marginLeft: 8,
  },
  rejectBtnText: { fontSize: 12, fontWeight: '600', color: Colors.light.error },

  // Reject Modal
  rejectModalContainer: {
    width: '90%',
    maxWidth: 400,
    alignSelf: 'center',
    borderRadius: 16,
    padding: 20,
  },

  // Fraud Alerts
  fraudAlertsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.gray200,
  },
  fraudAlertRow: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.light.gray200,
    borderLeftWidth: 4,
    marginBottom: 8,
  },
  fraudAlertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  severityText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  fraudAlertDate: { fontSize: 11, color: Colors.light.muted },
  fraudAlertType: { fontSize: 13, fontWeight: '600', marginBottom: 2 },
  fraudAlertDesc: { fontSize: 12, color: Colors.light.mutedDark, marginBottom: 4 },
  fraudAlertUser: { fontSize: 11, color: Colors.light.muted },
  fraudAlertCampaign: { fontSize: 11, color: Colors.light.muted },

  // Date/time input helpers
  formInputError: { borderColor: Colors.light.error, borderWidth: 2 },
  formInputHint: { fontSize: 11, color: Colors.light.muted, marginTop: 2 },
  datePreview: {
    fontSize: 13,
    color: Colors.light.success,
    fontWeight: '500',
    marginTop: 4,
    marginBottom: 2,
    paddingLeft: 2,
  },

  // Image URL previews
  imagePreview: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    marginTop: 8,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  imagePreviewSmall: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginTop: 8,
    backgroundColor: Colors.light.backgroundSecondary,
  },

  // Campaign preview card
  previewContainer: {
    marginTop: 4,
    marginBottom: 20,
  },
  previewCard: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.light.gray200,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 10,
  },
  previewIcon: {
    fontSize: 32,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.navy,
  },
  previewSubtitle: {
    fontSize: 13,
    color: Colors.light.gray600,
    marginTop: 2,
  },
  previewRewardRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  previewRewardBadge: {
    backgroundColor: Colors.light.success,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  previewRewardText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.light.card,
  },
  previewTypeBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  previewTypeText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.light.info,
  },
  previewFeaturedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.light.warningLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  previewFeaturedText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.light.warningDark,
  },
  previewScheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  previewScheduleText: {
    fontSize: 11,
    color: Colors.light.mutedDark,
  },
  previewLabel: {
    fontSize: 11,
    color: Colors.light.muted,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
  },
});
