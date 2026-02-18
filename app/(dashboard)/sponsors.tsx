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
  useColorScheme,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../constants/Colors';
import { showAlert, showConfirm } from '../../utils/alert';
import { socialImpactService, Sponsor, SponsorBudget, INDUSTRIES } from '../../services/api/socialImpact';

// ==================== CONSTANTS ====================

const INDUSTRY_COLORS: Record<string, string> = {
  technology: '#3B82F6',
  healthcare: '#10B981',
  finance: '#8B5CF6',
  retail: '#F59E0B',
  manufacturing: '#6366F1',
  fmcg: '#EC4899',
  energy: '#14B8A6',
  education: '#F97316',
  hospitality: '#06B6D4',
  other: '#6B7280',
};

const LOGO_COLORS = [
  '#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444',
  '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#06B6D4',
];

interface SponsorFormData {
  name: string;
  logo: string;
  description: string;
  brandCoinName: string;
  brandCoinLogo: string;
  contactPerson: {
    name: string;
    email: string;
    phone: string;
  };
  website: string;
  industry: string;
}

interface LedgerEntry {
  _id: string;
  type: string;
  amount: number;
  description?: string;
  createdAt: string;
}

const DEFAULT_FORM: SponsorFormData = {
  name: '',
  logo: '',
  description: '',
  brandCoinName: '',
  brandCoinLogo: '',
  contactPerson: {
    name: '',
    email: '',
    phone: '',
  },
  website: '',
  industry: '',
};

function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return String(num);
}

function formatCurrency(num: number): string {
  return num.toLocaleString('en-IN');
}

function formatDate(dateString: string): string {
  try {
    const d = new Date(dateString);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  } catch {
    return dateString;
  }
}

function formatDateShort(dateString: string): string {
  try {
    const d = new Date(dateString);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[d.getMonth()]} ${d.getDate()}, ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  } catch {
    return dateString;
  }
}

function getLogoColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return LOGO_COLORS[Math.abs(hash) % LOGO_COLORS.length];
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ==================== COMPONENT ====================

export default function SponsorsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  // Data state
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTimeout, setSearchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

  // Stats
  const [statsData, setStatsData] = useState({
    activeSponsors: 0,
    totalEvents: 0,
    totalCoinsDistributed: 0,
  });

  // Form modal
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingSponsor, setEditingSponsor] = useState<Sponsor | null>(null);
  const [form, setForm] = useState<SponsorFormData>({ ...DEFAULT_FORM });
  const [isSaving, setIsSaving] = useState(false);

  // Fund modal
  const [showFundModal, setShowFundModal] = useState(false);
  const [fundingSponsor, setFundingSponsor] = useState<Sponsor | null>(null);
  const [fundAmount, setFundAmount] = useState('');
  const [fundDescription, setFundDescription] = useState('');
  const [isFunding, setIsFunding] = useState(false);
  const [budget, setBudget] = useState<SponsorBudget | null>(null);
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [budgetLoading, setBudgetLoading] = useState(false);

  // Processing state for toggle actions
  const [processing, setProcessing] = useState<string | null>(null);

  // ==========================================
  // Data Loading
  // ==========================================

  const loadSponsors = useCallback(async (pageNum: number = 1, append: boolean = false) => {
    try {
      if (!append) setIsLoading(true);

      const params: any = { page: pageNum, limit: 20 };
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const response = await socialImpactService.getSponsors(params);

      if (response.success && response.data) {
        const data = response.data as any;
        const sponsorsList = data.sponsors || data || [];
        const pagination = data.pagination;

        if (append) {
          setSponsors(prev => [...prev, ...sponsorsList]);
        } else {
          setSponsors(sponsorsList);
        }

        if (pagination) {
          setTotalPages(pagination.totalPages || 1);
          setTotalCount(pagination.total || sponsorsList.length);
          setHasMore(pageNum < (pagination.totalPages || 1));
        } else {
          setHasMore(false);
          setTotalCount(sponsorsList.length);
        }
        setPage(pageNum);

        // Compute stats from loaded data
        if (!append && sponsorsList.length > 0) {
          const active = sponsorsList.filter((s: Sponsor) => s.isActive).length;
          const events = sponsorsList.reduce((sum: number, s: Sponsor) => sum + (s.totalEventsSponsored || 0), 0);
          const coins = sponsorsList.reduce((sum: number, s: Sponsor) => sum + (s.totalCoinsDistributed || 0), 0);
          setStatsData({
            activeSponsors: active,
            totalEvents: events,
            totalCoinsDistributed: coins,
          });
        }
      } else {
        if (!append) setSponsors([]);
        showAlert('Error', 'Failed to load sponsors');
      }
    } catch (error: any) {
      console.error('Failed to load sponsors:', error);
      showAlert('Error', error.message || 'Failed to load sponsors');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    loadSponsors(1);
  }, []);

  // Debounced search
  useEffect(() => {
    if (searchTimeout) clearTimeout(searchTimeout);
    const timeout = setTimeout(() => {
      loadSponsors(1);
    }, 500);
    setSearchTimeout(timeout);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadSponsors(1);
  }, [loadSponsors]);

  const loadMore = useCallback(() => {
    if (hasMore && !isLoading) {
      loadSponsors(page + 1, true);
    }
  }, [hasMore, isLoading, page, loadSponsors]);

  // ==========================================
  // Sponsor Actions
  // ==========================================

  const handleCreate = () => {
    setEditingSponsor(null);
    setForm({ ...DEFAULT_FORM });
    setShowFormModal(true);
  };

  const handleEdit = (sponsor: Sponsor) => {
    setEditingSponsor(sponsor);
    setForm({
      name: sponsor.name || '',
      logo: sponsor.logo || '',
      description: sponsor.description || '',
      brandCoinName: sponsor.brandCoinName || '',
      brandCoinLogo: sponsor.brandCoinLogo || '',
      contactPerson: {
        name: sponsor.contactPerson?.name || '',
        email: sponsor.contactPerson?.email || '',
        phone: sponsor.contactPerson?.phone || '',
      },
      website: sponsor.website || '',
      industry: sponsor.industry || '',
    });
    setShowFormModal(true);
  };

  const validateForm = (): boolean => {
    if (!form.name.trim()) {
      showAlert('Validation Error', 'Sponsor name is required');
      return false;
    }
    if (!form.logo.trim()) {
      showAlert('Validation Error', 'Logo URL is required');
      return false;
    }
    if (!form.brandCoinName.trim()) {
      showAlert('Validation Error', 'Brand coin name is required');
      return false;
    }
    if (!form.contactPerson.name.trim()) {
      showAlert('Validation Error', 'Contact person name is required');
      return false;
    }
    if (!form.contactPerson.email.trim()) {
      showAlert('Validation Error', 'Contact person email is required');
      return false;
    }
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.contactPerson.email.trim())) {
      showAlert('Validation Error', 'Please enter a valid email address');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      setIsSaving(true);

      const payload: Partial<Sponsor> = {
        name: form.name.trim(),
        logo: form.logo.trim(),
        description: form.description.trim(),
        brandCoinName: form.brandCoinName.trim(),
        contactPerson: {
          name: form.contactPerson.name.trim(),
          email: form.contactPerson.email.trim(),
          phone: form.contactPerson.phone.trim() || undefined,
        },
      };

      if (form.brandCoinLogo.trim()) payload.brandCoinLogo = form.brandCoinLogo.trim();
      if (form.website.trim()) payload.website = form.website.trim();
      if (form.industry) payload.industry = form.industry;

      if (editingSponsor) {
        await socialImpactService.updateSponsor(editingSponsor._id, payload);
        showAlert('Success', 'Sponsor updated successfully');
      } else {
        await socialImpactService.createSponsor(payload);
        showAlert('Success', 'Sponsor created successfully');
      }

      setShowFormModal(false);
      setEditingSponsor(null);
      setForm({ ...DEFAULT_FORM });
      loadSponsors(1);
    } catch (error: any) {
      console.error('Save sponsor error:', error);
      showAlert('Error', error.message || 'Failed to save sponsor');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (sponsor: Sponsor) => {
    const action = sponsor.isActive ? 'deactivate' : 'activate';
    showConfirm(
      `${capitalizeFirst(action)} Sponsor`,
      `Are you sure you want to ${action} "${sponsor.name}"?`,
      async () => {
        try {
          setProcessing(sponsor._id);
          if (sponsor.isActive) {
            await socialImpactService.deactivateSponsor(sponsor._id);
          } else {
            await socialImpactService.activateSponsor(sponsor._id);
          }
          showAlert('Success', `Sponsor ${action}d successfully`);
          loadSponsors(1);
        } catch (error: any) {
          console.error('Toggle active error:', error);
          showAlert('Error', error.message || `Failed to ${action} sponsor`);
        } finally {
          setProcessing(null);
        }
      },
      capitalizeFirst(action),
    );
  };

  const handleOpenFund = async (sponsor: Sponsor) => {
    setFundingSponsor(sponsor);
    setFundAmount('');
    setFundDescription('');
    setBudget(null);
    setLedgerEntries([]);
    setShowFundModal(true);
    loadBudgetData(sponsor._id);
  };

  const loadBudgetData = async (sponsorId: string) => {
    try {
      setBudgetLoading(true);
      const [budgetRes, ledgerRes] = await Promise.all([
        socialImpactService.getSponsorBudget(sponsorId),
        socialImpactService.getSponsorLedger(sponsorId, { limit: 5 }),
      ]);

      if (budgetRes.success && budgetRes.data) {
        const budgetData = budgetRes.data as any;
        setBudget(budgetData.budget || budgetData);
      }

      if (ledgerRes.success && ledgerRes.data) {
        const ledgerData = ledgerRes.data as any;
        setLedgerEntries(ledgerData.entries || ledgerData.ledger || (Array.isArray(ledgerData) ? ledgerData : []));
      }
    } catch (error: any) {
      console.error('Load budget error:', error);
    } finally {
      setBudgetLoading(false);
    }
  };

  const handleFund = async () => {
    if (!fundingSponsor) return;

    const amount = parseFloat(fundAmount);
    if (isNaN(amount) || amount <= 0) {
      showAlert('Validation Error', 'Please enter a valid amount greater than 0');
      return;
    }

    try {
      setIsFunding(true);
      await socialImpactService.fundSponsor(
        fundingSponsor._id,
        amount,
        fundDescription.trim() || undefined,
      );
      showAlert('Success', `Successfully funded ${formatCurrency(amount)} coins to ${fundingSponsor.name}`);
      setFundAmount('');
      setFundDescription('');
      loadBudgetData(fundingSponsor._id);
      loadSponsors(1);
    } catch (error: any) {
      console.error('Fund sponsor error:', error);
      showAlert('Error', error.message || 'Failed to fund sponsor');
    } finally {
      setIsFunding(false);
    }
  };

  const handleViewEvents = (sponsor: Sponsor) => {
    // Navigate to social impact events filtered by this sponsor
    showAlert('Sponsor Events', `${sponsor.name} has sponsored ${sponsor.totalEventsSponsored} event(s). View events on the Social Impact page.`);
  };

  // ==========================================
  // Header
  // ==========================================

  const renderHeader = () => (
    <View style={styles.header}>
      <View>
        <View style={styles.headerTitleRow}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>CSR Sponsors</Text>
          <View style={[styles.countBadge, { backgroundColor: colors.tint }]}>
            <Text style={styles.countBadgeText}>{totalCount}</Text>
          </View>
        </View>
        <Text style={[styles.headerSubtitle, { color: colors.secondaryText }]}>
          Manage corporate sponsors and budgets
        </Text>
      </View>
      <TouchableOpacity
        style={[styles.refreshBtn, { backgroundColor: `${colors.tint}15` }]}
        onPress={onRefresh}
      >
        <Ionicons name="refresh" size={20} color={colors.tint} />
      </TouchableOpacity>
    </View>
  );

  // ==========================================
  // Stats Row
  // ==========================================

  const renderStatsRow = () => (
    <View style={styles.statsRow}>
      <View style={[styles.statItem, { backgroundColor: `${colors.success}15` }]}>
        <Ionicons name="business-outline" size={18} color={colors.success} />
        <Text style={[styles.statValue, { color: colors.success }]}>{statsData.activeSponsors}</Text>
        <Text style={[styles.statLabel, { color: colors.secondaryText }]}>Active Sponsors</Text>
      </View>
      <View style={[styles.statItem, { backgroundColor: `${colors.info}15` }]}>
        <Ionicons name="calendar-outline" size={18} color={colors.info} />
        <Text style={[styles.statValue, { color: colors.info }]}>{formatNumber(statsData.totalEvents)}</Text>
        <Text style={[styles.statLabel, { color: colors.secondaryText }]}>Total Events</Text>
      </View>
      <View style={[styles.statItem, { backgroundColor: `${colors.warning}15` }]}>
        <Ionicons name="logo-bitcoin" size={18} color={colors.warning} />
        <Text style={[styles.statValue, { color: colors.warning }]}>{formatNumber(statsData.totalCoinsDistributed)}</Text>
        <Text style={[styles.statLabel, { color: colors.secondaryText }]}>Coins Distributed</Text>
      </View>
    </View>
  );

  // ==========================================
  // Search Bar
  // ==========================================

  const renderSearchBar = () => (
    <View style={styles.searchContainer}>
      <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Ionicons name="search-outline" size={18} color={colors.icon} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search sponsors by name..."
          placeholderTextColor={colors.icon}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color={colors.icon} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  // ==========================================
  // Create Button
  // ==========================================

  const renderCreateButton = () => (
    <View style={styles.createBtnContainer}>
      <TouchableOpacity
        style={[styles.createBtn, { backgroundColor: colors.tint }]}
        onPress={handleCreate}
      >
        <Ionicons name="add-circle-outline" size={18} color="#FFF" />
        <Text style={styles.createBtnText}>New Sponsor</Text>
      </TouchableOpacity>
    </View>
  );

  // ==========================================
  // Sponsor Card
  // ==========================================

  const renderSponsorItem = useCallback(({ item }: { item: Sponsor }) => {
    const logoColor = getLogoColor(item.name);
    const industryColor = INDUSTRY_COLORS[item.industry || 'other'] || '#6B7280';
    const isProcessing = processing === item._id;

    return (
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        {/* Card Header */}
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            {/* Logo Placeholder */}
            <View style={[styles.logoCircle, { backgroundColor: `${logoColor}20` }]}>
              <Text style={[styles.logoLetter, { color: logoColor }]}>
                {item.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.cardTitleContainer}>
              <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
                {item.name}
              </Text>
              <View style={styles.coinNameRow}>
                <Ionicons name="logo-bitcoin" size={12} color={colors.warning} />
                <Text style={[styles.coinName, { color: colors.secondaryText }]} numberOfLines={1}>
                  {item.brandCoinName}
                </Text>
              </View>
            </View>
          </View>
          {/* Status Badge */}
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: item.isActive ? `${colors.success}15` : `${colors.error}15` },
            ]}
          >
            <View
              style={[
                styles.statusDot,
                { backgroundColor: item.isActive ? colors.success : colors.error },
              ]}
            />
            <Text
              style={[
                styles.statusText,
                { color: item.isActive ? colors.success : colors.error },
              ]}
            >
              {item.isActive ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>

        {/* Industry Badge */}
        {item.industry && (
          <View style={styles.badgesRow}>
            <View style={[styles.industryBadge, { backgroundColor: `${industryColor}15` }]}>
              <Text style={[styles.industryBadgeText, { color: industryColor }]}>
                {capitalizeFirst(item.industry)}
              </Text>
            </View>
          </View>
        )}

        {/* Stats Row */}
        <View style={styles.metaRow}>
          <View style={styles.metaChip}>
            <Ionicons name="calendar-outline" size={13} color={colors.icon} />
            <Text style={[styles.metaText, { color: colors.icon }]}>
              {item.totalEventsSponsored || 0} events
            </Text>
          </View>
          <View style={styles.metaChip}>
            <Ionicons name="people-outline" size={13} color={colors.icon} />
            <Text style={[styles.metaText, { color: colors.icon }]}>
              {formatNumber(item.totalParticipants || 0)} participants
            </Text>
          </View>
          <View style={styles.metaChip}>
            <Ionicons name="logo-bitcoin" size={13} color="#F59E0B" />
            <Text style={[styles.metaText, { color: '#F59E0B', fontWeight: '700' }]}>
              {formatNumber(item.totalCoinsDistributed || 0)} coins
            </Text>
          </View>
        </View>

        {/* Budget Row */}
        <View style={[styles.budgetRow, { borderTopColor: colors.border }]}>
          <View style={styles.budgetItem}>
            <Text style={[styles.budgetLabel, { color: colors.secondaryText }]}>Total Funded</Text>
            <Text style={[styles.budgetValue, { color: colors.text }]}>
              {formatCurrency(item.totalBudgetFunded || 0)}
            </Text>
          </View>
          <View style={[styles.budgetDivider, { backgroundColor: colors.border }]} />
          <View style={styles.budgetItem}>
            <Text style={[styles.budgetLabel, { color: colors.secondaryText }]}>Balance</Text>
            <Text
              style={[
                styles.budgetValue,
                { color: (item.currentBalance || 0) > 0 ? colors.success : colors.error },
              ]}
            >
              {formatCurrency(item.currentBalance || 0)}
            </Text>
          </View>
        </View>

        {/* Action Row */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: `${colors.info}10` }]}
            onPress={() => handleEdit(item)}
          >
            <Ionicons name="pencil" size={14} color={colors.info} />
            <Text style={[styles.actionBtnText, { color: colors.info }]}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: `${colors.success}10` }]}
            onPress={() => handleOpenFund(item)}
          >
            <Ionicons name="wallet-outline" size={14} color={colors.success} />
            <Text style={[styles.actionBtnText, { color: colors.success }]}>Fund</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: `${colors.warning}10` }]}
            onPress={() => handleViewEvents(item)}
          >
            <Ionicons name="calendar-outline" size={14} color={colors.warning} />
            <Text style={[styles.actionBtnText, { color: colors.warning }]}>Events</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.actionIconBtn,
              {
                backgroundColor: item.isActive ? `${colors.error}10` : `${colors.success}10`,
              },
            ]}
            onPress={() => handleToggleActive(item)}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color={item.isActive ? colors.error : colors.success} />
            ) : (
              <Ionicons
                name={item.isActive ? 'pause' : 'play'}
                size={16}
                color={item.isActive ? colors.error : colors.success}
              />
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }, [colors, processing, handleEdit, handleOpenFund, handleViewEvents, handleToggleActive]);

  // ==========================================
  // Form Modal
  // ==========================================

  const renderFormModal = () => {
    const isEditing = !!editingSponsor;
    const modalTitle = isEditing ? 'Edit Sponsor' : 'New Sponsor';

    return (
      <Modal visible={showFormModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          {/* Modal Header */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity
              onPress={() => {
                setShowFormModal(false);
                setEditingSponsor(null);
                setForm({ ...DEFAULT_FORM });
              }}
              style={styles.modalCloseBtn}
            >
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{modalTitle}</Text>
            <TouchableOpacity
              onPress={handleSave}
              disabled={isSaving}
              style={[styles.modalSaveBtn, { backgroundColor: colors.tint, opacity: isSaving ? 0.6 : 1 }]}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.modalSaveBtnText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Form Content */}
          <ScrollView
            style={styles.formScroll}
            contentContainerStyle={styles.formContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Name */}
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Sponsor Name *</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                value={form.name}
                onChangeText={text => setForm(p => ({ ...p, name: text }))}
                placeholder="Enter sponsor name"
                placeholderTextColor={colors.icon}
              />
            </View>

            {/* Logo URL */}
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Logo URL *</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                value={form.logo}
                onChangeText={text => setForm(p => ({ ...p, logo: text }))}
                placeholder="https://example.com/logo.png"
                placeholderTextColor={colors.icon}
                autoCapitalize="none"
                keyboardType="url"
              />
            </View>

            {/* Description */}
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Description</Text>
              <TextInput
                style={[styles.formInput, styles.textArea, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                value={form.description}
                onChangeText={text => setForm(p => ({ ...p, description: text }))}
                placeholder="Describe the sponsor..."
                placeholderTextColor={colors.icon}
                multiline
                numberOfLines={4}
              />
            </View>

            {/* Brand Coin Name */}
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Brand Coin Name *</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                value={form.brandCoinName}
                onChangeText={text => setForm(p => ({ ...p, brandCoinName: text }))}
                placeholder="e.g. TechCoins"
                placeholderTextColor={colors.icon}
              />
            </View>

            {/* Brand Coin Logo */}
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Brand Coin Logo URL</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                value={form.brandCoinLogo}
                onChangeText={text => setForm(p => ({ ...p, brandCoinLogo: text }))}
                placeholder="https://example.com/coin-logo.png"
                placeholderTextColor={colors.icon}
                autoCapitalize="none"
                keyboardType="url"
              />
            </View>

            {/* Separator */}
            <View style={[styles.formSeparator, { backgroundColor: colors.border }]} />

            {/* Contact Person Section */}
            <Text style={[styles.formSectionTitle, { color: colors.text }]}>Contact Person</Text>

            {/* Contact Name */}
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Name *</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                value={form.contactPerson.name}
                onChangeText={text =>
                  setForm(p => ({ ...p, contactPerson: { ...p.contactPerson, name: text } }))
                }
                placeholder="Contact person name"
                placeholderTextColor={colors.icon}
              />
            </View>

            {/* Contact Email */}
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Email *</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                value={form.contactPerson.email}
                onChangeText={text =>
                  setForm(p => ({ ...p, contactPerson: { ...p.contactPerson, email: text } }))
                }
                placeholder="contact@example.com"
                placeholderTextColor={colors.icon}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            {/* Contact Phone */}
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Phone</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                value={form.contactPerson.phone}
                onChangeText={text =>
                  setForm(p => ({ ...p, contactPerson: { ...p.contactPerson, phone: text } }))
                }
                placeholder="+91 98765 43210"
                placeholderTextColor={colors.icon}
                keyboardType="phone-pad"
              />
            </View>

            {/* Separator */}
            <View style={[styles.formSeparator, { backgroundColor: colors.border }]} />

            {/* Website */}
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Website</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                value={form.website}
                onChangeText={text => setForm(p => ({ ...p, website: text }))}
                placeholder="https://www.example.com"
                placeholderTextColor={colors.icon}
                autoCapitalize="none"
                keyboardType="url"
              />
            </View>

            {/* Industry Picker */}
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Industry</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.selectRow}>
                  {INDUSTRIES.map(industry => {
                    const isSelected = form.industry === industry;
                    const indColor = INDUSTRY_COLORS[industry] || '#6B7280';
                    return (
                      <TouchableOpacity
                        key={industry}
                        style={[
                          styles.selectChip,
                          {
                            backgroundColor: isSelected ? `${indColor}20` : colors.background,
                            borderColor: isSelected ? indColor : colors.border,
                          },
                        ]}
                        onPress={() => setForm(p => ({ ...p, industry: isSelected ? '' : industry }))}
                      >
                        <Text
                          style={[
                            styles.selectChipText,
                            { color: isSelected ? indColor : colors.icon },
                          ]}
                        >
                          {capitalizeFirst(industry)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    );
  };

  // ==========================================
  // Fund Modal
  // ==========================================

  const renderFundModal = () => {
    if (!fundingSponsor) return null;

    return (
      <Modal visible={showFundModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          {/* Modal Header */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity
              onPress={() => {
                setShowFundModal(false);
                setFundingSponsor(null);
              }}
              style={styles.modalCloseBtn}
            >
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Fund Sponsor</Text>
            <View style={{ width: 60 }} />
          </View>

          <ScrollView
            style={styles.formScroll}
            contentContainerStyle={styles.formContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Sponsor Info */}
            <View style={[styles.fundSponsorInfo, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.logoCircle, { backgroundColor: `${getLogoColor(fundingSponsor.name)}20` }]}>
                <Text style={[styles.logoLetter, { color: getLogoColor(fundingSponsor.name) }]}>
                  {fundingSponsor.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.fundSponsorDetails}>
                <Text style={[styles.fundSponsorName, { color: colors.text }]}>
                  {fundingSponsor.name}
                </Text>
                <Text style={[styles.fundSponsorCoin, { color: colors.secondaryText }]}>
                  {fundingSponsor.brandCoinName}
                </Text>
              </View>
            </View>

            {/* Budget Summary */}
            {budgetLoading ? (
              <View style={styles.budgetLoadingContainer}>
                <ActivityIndicator size="small" color={colors.tint} />
                <Text style={[styles.budgetLoadingText, { color: colors.secondaryText }]}>Loading budget...</Text>
              </View>
            ) : budget ? (
              <View style={[styles.budgetSummary, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.budgetSummaryTitle, { color: colors.text }]}>Budget Summary</Text>
                <View style={styles.budgetGrid}>
                  <View style={styles.budgetGridItem}>
                    <Text style={[styles.budgetGridLabel, { color: colors.secondaryText }]}>Total Funded</Text>
                    <Text style={[styles.budgetGridValue, { color: colors.info }]}>
                      {formatCurrency(budget.totalFunded || 0)}
                    </Text>
                  </View>
                  <View style={styles.budgetGridItem}>
                    <Text style={[styles.budgetGridLabel, { color: colors.secondaryText }]}>Current Balance</Text>
                    <Text
                      style={[
                        styles.budgetGridValue,
                        { color: (budget.currentBalance || 0) > 0 ? colors.success : colors.error },
                      ]}
                    >
                      {formatCurrency(budget.currentBalance || 0)}
                    </Text>
                  </View>
                  <View style={styles.budgetGridItem}>
                    <Text style={[styles.budgetGridLabel, { color: colors.secondaryText }]}>Allocated</Text>
                    <Text style={[styles.budgetGridValue, { color: colors.warning }]}>
                      {formatCurrency(budget.totalAllocated || 0)}
                    </Text>
                  </View>
                  <View style={styles.budgetGridItem}>
                    <Text style={[styles.budgetGridLabel, { color: colors.secondaryText }]}>Disbursed</Text>
                    <Text style={[styles.budgetGridValue, { color: colors.secondaryText }]}>
                      {formatCurrency(budget.totalDisbursed || 0)}
                    </Text>
                  </View>
                </View>
              </View>
            ) : null}

            {/* Fund Form */}
            <View style={[styles.fundFormContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.fundFormTitle, { color: colors.text }]}>Add Funds</Text>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Amount *</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  value={fundAmount}
                  onChangeText={setFundAmount}
                  placeholder="Enter amount"
                  placeholderTextColor={colors.icon}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Description</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  value={fundDescription}
                  onChangeText={setFundDescription}
                  placeholder="e.g. Q1 2026 CSR budget allocation"
                  placeholderTextColor={colors.icon}
                />
              </View>

              <TouchableOpacity
                style={[styles.fundNowBtn, { backgroundColor: colors.success, opacity: isFunding ? 0.6 : 1 }]}
                onPress={handleFund}
                disabled={isFunding}
              >
                {isFunding ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Ionicons name="wallet-outline" size={18} color="#FFF" />
                    <Text style={styles.fundNowBtnText}>Fund Now</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Recent Ledger Entries */}
            {ledgerEntries.length > 0 && (
              <View style={[styles.ledgerContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.ledgerTitle, { color: colors.text }]}>Recent Transactions</Text>
                {ledgerEntries.map((entry, index) => {
                  const isCredit = entry.type === 'credit' || entry.type === 'fund' || entry.amount > 0;
                  return (
                    <View
                      key={entry._id || `ledger-${index}`}
                      style={[
                        styles.ledgerEntry,
                        index < ledgerEntries.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                      ]}
                    >
                      <View style={styles.ledgerEntryLeft}>
                        <View
                          style={[
                            styles.ledgerIcon,
                            { backgroundColor: isCredit ? `${colors.success}15` : `${colors.error}15` },
                          ]}
                        >
                          <Ionicons
                            name={isCredit ? 'arrow-down' : 'arrow-up'}
                            size={14}
                            color={isCredit ? colors.success : colors.error}
                          />
                        </View>
                        <View style={styles.ledgerEntryInfo}>
                          <Text style={[styles.ledgerEntryType, { color: colors.text }]}>
                            {capitalizeFirst(entry.type || 'transaction')}
                          </Text>
                          {entry.description && (
                            <Text style={[styles.ledgerEntryDesc, { color: colors.secondaryText }]} numberOfLines={1}>
                              {entry.description}
                            </Text>
                          )}
                          <Text style={[styles.ledgerEntryDate, { color: colors.secondaryText }]}>
                            {formatDateShort(entry.createdAt)}
                          </Text>
                        </View>
                      </View>
                      <Text
                        style={[
                          styles.ledgerEntryAmount,
                          { color: isCredit ? colors.success : colors.error },
                        ]}
                      >
                        {isCredit ? '+' : '-'}{formatCurrency(Math.abs(entry.amount))}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    );
  };

  // ==========================================
  // Empty State
  // ==========================================

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="business-outline" size={56} color={colors.icon} />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>No sponsors found</Text>
      <Text style={[styles.emptyText, { color: colors.icon }]}>
        {searchQuery ? 'Try a different search term' : 'Create your first CSR sponsor'}
      </Text>
    </View>
  );

  // ==========================================
  // Main Render
  // ==========================================

  if (isLoading && sponsors.length === 0) {
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
      {renderSearchBar()}
      {renderCreateButton()}

      <FlatList
        data={sponsors}
        renderItem={renderSponsorItem}
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
          ) : sponsors.length > 0 ? (
            <Text style={[styles.endListText, { color: colors.secondaryText }]}>
              {sponsors.length} sponsor{sponsors.length !== 1 ? 's' : ''} total
            </Text>
          ) : null
        }
        ListEmptyComponent={renderEmptyState()}
      />

      {renderFormModal()}
      {renderFundModal()}
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
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    minWidth: 28,
    alignItems: 'center',
  },
  countBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  refreshBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
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
    gap: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '500',
    textAlign: 'center',
  },

  // Search
  searchContainer: {
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },

  // Create Button
  createBtnContainer: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  createBtn: {
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
  logoCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoLetter: {
    fontSize: 20,
    fontWeight: '700',
  },
  cardTitleContainer: {
    flex: 1,
    marginLeft: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  coinNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  coinName: {
    fontSize: 12,
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
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Badges
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  industryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  industryBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },

  // Meta
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
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

  // Budget Row
  budgetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 10,
    marginBottom: 10,
  },
  budgetItem: {
    flex: 1,
    alignItems: 'center',
  },
  budgetLabel: {
    fontSize: 10,
    fontWeight: '500',
    marginBottom: 2,
  },
  budgetValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  budgetDivider: {
    width: 1,
    height: 28,
  },

  // Action Row
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
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
  endListText: {
    textAlign: 'center',
    fontSize: 12,
    paddingVertical: 16,
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
    minWidth: 60,
    alignItems: 'center',
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
  formSeparator: {
    height: 1,
    marginVertical: 16,
  },
  formSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 14,
  },

  // Select (Industry Picker)
  selectRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  selectChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  selectChipText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Fund Modal
  fundSponsorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    gap: 12,
  },
  fundSponsorDetails: {
    flex: 1,
  },
  fundSponsorName: {
    fontSize: 16,
    fontWeight: '700',
  },
  fundSponsorCoin: {
    fontSize: 12,
    marginTop: 2,
  },
  budgetLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  budgetLoadingText: {
    fontSize: 13,
  },
  budgetSummary: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },
  budgetSummaryTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  budgetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 0,
  },
  budgetGridItem: {
    width: '50%',
    paddingVertical: 6,
  },
  budgetGridLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 2,
  },
  budgetGridValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  fundFormContainer: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },
  fundFormTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 14,
  },
  fundNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
    marginTop: 4,
  },
  fundNowBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 15,
  },

  // Ledger
  ledgerContainer: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },
  ledgerTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  ledgerEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  ledgerEntryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  ledgerIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ledgerEntryInfo: {
    flex: 1,
  },
  ledgerEntryType: {
    fontSize: 13,
    fontWeight: '600',
  },
  ledgerEntryDesc: {
    fontSize: 11,
    marginTop: 1,
  },
  ledgerEntryDate: {
    fontSize: 10,
    marginTop: 2,
  },
  ledgerEntryAmount: {
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 8,
  },
});
