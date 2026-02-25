import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  useColorScheme,
  ActivityIndicator,
  Switch,
  TextInput,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { bankOffersService, BankOffer } from '../../services/api/bankOffers';
import { Colors } from '../../constants/Colors';
import { showAlert, showConfirm } from '../../utils/alert';

// ============================================
// TYPES & CONSTANTS
// ============================================
type StatusFilter = 'all' | 'active' | 'inactive';
type CardTypeFilter = 'all' | 'credit' | 'debit' | 'wallet' | 'upi';

const CARD_TYPES: CardTypeFilter[] = ['all', 'credit', 'debit', 'wallet', 'upi'];

const CARD_TYPE_COLORS: Record<string, string> = {
  credit: '#8B5CF6',
  debit: '#3B82F6',
  wallet: '#F59E0B',
  upi: '#10B981',
  all: '#6B7280',
};

const CARD_TYPE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  credit: 'card-outline',
  debit: 'card-outline',
  wallet: 'wallet-outline',
  upi: 'phone-portrait-outline',
  all: 'apps-outline',
};

interface OfferFormData {
  bankName: string;
  bankLogo: string;
  offerTitle: string;
  offerDescription: string;
  discountPercentage: string;
  maxDiscount: string;
  minTransactionAmount: string;
  cardType: string;
  validFrom: string;
  validUntil: string;
  terms: string;
  promoCode: string;
  usageLimitPerUser: string;
  totalUsageLimit: string;
  priority: string;
  isActive: boolean;
}

const DEFAULT_FORM: OfferFormData = {
  bankName: '',
  bankLogo: '',
  offerTitle: '',
  offerDescription: '',
  discountPercentage: '',
  maxDiscount: '',
  minTransactionAmount: '',
  cardType: 'all',
  validFrom: new Date().toISOString().split('T')[0],
  validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  terms: '',
  promoCode: '',
  usageLimitPerUser: '',
  totalUsageLimit: '',
  priority: '0',
  isActive: true,
};

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

// ============================================
// MAIN COMPONENT
// ============================================
export default function BankOffersScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  // Data state
  const [offers, setOffers] = useState<BankOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filter state
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [cardTypeFilter, setCardTypeFilter] = useState<CardTypeFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal state
  const [showFormModal, setShowFormModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingOffer, setEditingOffer] = useState<BankOffer | null>(null);
  const [formData, setFormData] = useState<OfferFormData>(DEFAULT_FORM);

  // ==========================================
  // Data Loading
  // ==========================================
  const fetchOffers = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (cardTypeFilter !== 'all') params.cardType = cardTypeFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const response = await bankOffersService.getOffers(params);
      if (!response.success) throw new Error(response.message || 'Failed to load offers');
      setOffers(response.data?.offers || []);
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to load bank offers');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter, cardTypeFilter, searchQuery]);

  useEffect(() => {
    fetchOffers();
  }, [fetchOffers]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOffers();
  }, [fetchOffers]);

  // ==========================================
  // Stats
  // ==========================================
  const totalCount = offers.length;
  const activeCount = offers.filter((o) => o.isActive).length;
  const inactiveCount = offers.filter((o) => !o.isActive).length;

  // ==========================================
  // Actions
  // ==========================================
  const handleCreate = () => {
    setEditingOffer(null);
    setFormData({ ...DEFAULT_FORM });
    setShowFormModal(true);
  };

  const handleEdit = (offer: BankOffer) => {
    setEditingOffer(offer);
    setFormData({
      bankName: offer.bankName || '',
      bankLogo: offer.bankLogo || '',
      offerTitle: offer.offerTitle || '',
      offerDescription: offer.offerDescription || '',
      discountPercentage: String(offer.discountPercentage ?? ''),
      maxDiscount: String(offer.maxDiscount ?? ''),
      minTransactionAmount: String(offer.minTransactionAmount ?? ''),
      cardType: offer.cardType || 'all',
      validFrom: offer.validFrom ? offer.validFrom.split('T')[0] : '',
      validUntil: offer.validUntil ? offer.validUntil.split('T')[0] : '',
      terms: offer.terms || '',
      promoCode: offer.promoCode || '',
      usageLimitPerUser: offer.usageLimitPerUser ? String(offer.usageLimitPerUser) : '',
      totalUsageLimit: offer.totalUsageLimit ? String(offer.totalUsageLimit) : '',
      priority: String(offer.priority ?? 0),
      isActive: offer.isActive,
    });
    setShowFormModal(true);
  };

  const handleSave = async () => {
    if (!formData.bankName.trim()) {
      showAlert('Error', 'Bank name is required');
      return;
    }
    if (!formData.offerTitle.trim()) {
      showAlert('Error', 'Offer title is required');
      return;
    }
    if (!formData.discountPercentage || Number(formData.discountPercentage) <= 0) {
      showAlert('Error', 'Discount percentage must be greater than 0');
      return;
    }

    try {
      setIsSaving(true);
      const payload: Partial<BankOffer> = {
        bankName: formData.bankName.trim(),
        bankLogo: formData.bankLogo.trim() || undefined,
        offerTitle: formData.offerTitle.trim(),
        offerDescription: formData.offerDescription.trim() || undefined,
        discountPercentage: Number(formData.discountPercentage) || 0,
        maxDiscount: Number(formData.maxDiscount) || 0,
        minTransactionAmount: Number(formData.minTransactionAmount) || 0,
        cardType: formData.cardType,
        validFrom: formData.validFrom ? new Date(formData.validFrom).toISOString() : undefined,
        validUntil: formData.validUntil ? new Date(formData.validUntil).toISOString() : undefined,
        terms: formData.terms.trim() || undefined,
        promoCode: formData.promoCode.trim() || undefined,
        usageLimitPerUser: formData.usageLimitPerUser ? Number(formData.usageLimitPerUser) : undefined,
        totalUsageLimit: formData.totalUsageLimit ? Number(formData.totalUsageLimit) : undefined,
        priority: Number(formData.priority) || 0,
        isActive: formData.isActive,
      };

      if (editingOffer) {
        const res = await bankOffersService.updateOffer(editingOffer._id, payload);
        if (!res.success) throw new Error(res.message || 'Failed to update offer');
        showAlert('Success', 'Bank offer updated successfully');
      } else {
        const res = await bankOffersService.createOffer(payload);
        if (!res.success) throw new Error(res.message || 'Failed to create offer');
        showAlert('Success', 'Bank offer created successfully');
      }
      setShowFormModal(false);
      fetchOffers();
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to save bank offer');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggle = async (offer: BankOffer) => {
    try {
      const res = await bankOffersService.toggleOffer(offer._id);
      if (!res.success) throw new Error(res.message || 'Failed to toggle offer');
      fetchOffers();
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to toggle offer status');
    }
  };

  const handleDelete = (offer: BankOffer) => {
    showConfirm(
      'Delete Bank Offer',
      `Are you sure you want to delete "${offer.offerTitle}"? This action cannot be undone.`,
      async () => {
        try {
          const res = await bankOffersService.deleteOffer(offer._id);
          if (!res.success) throw new Error(res.message || 'Failed to delete offer');
          showAlert('Success', 'Bank offer deleted successfully');
          fetchOffers();
        } catch (error: any) {
          showAlert('Error', error.message || 'Failed to delete offer');
        }
      }
    );
  };

  // ==========================================
  // Form Input Helper
  // ==========================================
  const renderInput = (
    key: keyof OfferFormData,
    placeholder: string,
    opts?: { multiline?: boolean; numeric?: boolean }
  ) => (
    <TextInput
      style={[
        styles.formInput,
        opts?.multiline && styles.multiline,
        { color: colors.text, borderColor: colors.border, backgroundColor: colors.card },
      ]}
      value={String(formData[key])}
      onChangeText={(v) => setFormData((p) => ({ ...p, [key]: v }))}
      placeholder={placeholder}
      placeholderTextColor="#9CA3AF"
      multiline={opts?.multiline}
      keyboardType={opts?.numeric ? 'numeric' : 'default'}
    />
  );

  // ==========================================
  // Render: Stats Row
  // ==========================================
  const renderStatsRow = () => (
    <View style={styles.statsRow}>
      <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.statIcon, { backgroundColor: '#EFF6FF' }]}>
          <Ionicons name="layers-outline" size={18} color="#3B82F6" />
        </View>
        <Text style={[styles.statValue, { color: colors.text }]}>{totalCount}</Text>
        <Text style={[styles.statLabel, { color: colors.secondaryText }]}>Total</Text>
      </View>
      <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.statIcon, { backgroundColor: '#ECFDF5' }]}>
          <Ionicons name="checkmark-circle-outline" size={18} color="#10B981" />
        </View>
        <Text style={[styles.statValue, { color: colors.text }]}>{activeCount}</Text>
        <Text style={[styles.statLabel, { color: colors.secondaryText }]}>Active</Text>
      </View>
      <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.statIcon, { backgroundColor: '#FEF2F2' }]}>
          <Ionicons name="close-circle-outline" size={18} color="#EF4444" />
        </View>
        <Text style={[styles.statValue, { color: colors.text }]}>{inactiveCount}</Text>
        <Text style={[styles.statLabel, { color: colors.secondaryText }]}>Inactive</Text>
      </View>
    </View>
  );

  // ==========================================
  // Render: Filter Tabs
  // ==========================================
  const renderFilters = () => (
    <View style={[styles.filtersContainer, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
      {/* Status filter tabs */}
      <View style={styles.filterTabRow}>
        {(['all', 'active', 'inactive'] as StatusFilter[]).map((status) => {
          const isSelected = statusFilter === status;
          return (
            <TouchableOpacity
              key={status}
              style={[styles.filterTab, isSelected && styles.filterTabActive]}
              onPress={() => setStatusFilter(status)}
            >
              <Text style={[styles.filterTabText, isSelected && styles.filterTabTextActive]}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Card type filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.cardTypeFilterRow}>
        {CARD_TYPES.map((type) => {
          const isSelected = cardTypeFilter === type;
          const typeColor = CARD_TYPE_COLORS[type];
          return (
            <TouchableOpacity
              key={type}
              style={[
                styles.cardTypeChip,
                { borderColor: isSelected ? typeColor : colors.border },
                isSelected && { backgroundColor: `${typeColor}15` },
              ]}
              onPress={() => setCardTypeFilter(type)}
            >
              <Ionicons
                name={CARD_TYPE_ICONS[type]}
                size={14}
                color={isSelected ? typeColor : colors.secondaryText}
              />
              <Text
                style={[
                  styles.cardTypeChipText,
                  { color: isSelected ? typeColor : colors.secondaryText },
                ]}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Search bar */}
      <View style={[styles.searchBar, { backgroundColor: colors.background, borderColor: colors.border }]}>
        <Ionicons name="search-outline" size={18} color={colors.secondaryText} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search by bank name or offer title..."
          placeholderTextColor="#9CA3AF"
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color={colors.secondaryText} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  // ==========================================
  // Render: Offer Card
  // ==========================================
  const renderOfferCard = (offer: BankOffer) => {
    const typeColor = CARD_TYPE_COLORS[offer.cardType] || '#6B7280';
    const usagePercent =
      offer.totalUsageLimit && offer.totalUsageLimit > 0
        ? Math.round((offer.usageCount / offer.totalUsageLimit) * 100)
        : null;

    return (
      <View
        key={offer._id}
        style={[styles.offerCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        {/* Card Header */}
        <View style={styles.offerCardHeader}>
          <View style={styles.bankInfo}>
            <View style={[styles.bankIconCircle, { backgroundColor: `${typeColor}15` }]}>
              <Ionicons name="business-outline" size={20} color={typeColor} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.bankName, { color: colors.text }]} numberOfLines={1}>
                {offer.bankName}
              </Text>
              <Text style={[styles.offerTitle, { color: colors.secondaryText }]} numberOfLines={2}>
                {offer.offerTitle}
              </Text>
            </View>
          </View>
          <View style={[styles.discountBadge, { backgroundColor: '#ECFDF5' }]}>
            <Text style={styles.discountBadgeText}>{offer.discountPercentage}%</Text>
            <Text style={styles.discountBadgeSub}>OFF</Text>
          </View>
        </View>

        {/* Offer Details */}
        <View style={styles.offerDetails}>
          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <Ionicons name="arrow-up-circle-outline" size={14} color={colors.secondaryText} />
              <Text style={[styles.detailLabel, { color: colors.secondaryText }]}>Max Discount</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>{offer.maxDiscount}</Text>
            </View>
            <View style={styles.detailItem}>
              <Ionicons name="cash-outline" size={14} color={colors.secondaryText} />
              <Text style={[styles.detailLabel, { color: colors.secondaryText }]}>Min Transaction</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>{offer.minTransactionAmount}</Text>
            </View>
          </View>

          {/* Card type badge */}
          <View style={styles.badgeRow}>
            <View style={[styles.typeBadge, { backgroundColor: `${typeColor}15`, borderColor: `${typeColor}30` }]}>
              <Ionicons name={CARD_TYPE_ICONS[offer.cardType] || 'card-outline'} size={12} color={typeColor} />
              <Text style={[styles.typeBadgeText, { color: typeColor }]}>
                {offer.cardType.charAt(0).toUpperCase() + offer.cardType.slice(1)}
              </Text>
            </View>
            {offer.promoCode ? (
              <View style={[styles.promoBadge, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="ticket-outline" size={12} color="#D97706" />
                <Text style={styles.promoText}>{offer.promoCode}</Text>
              </View>
            ) : null}
          </View>

          {/* Dates */}
          <View style={styles.dateRow}>
            <Ionicons name="calendar-outline" size={14} color={colors.secondaryText} />
            <Text style={[styles.dateText, { color: colors.secondaryText }]}>
              {formatDate(offer.validFrom)} - {formatDate(offer.validUntil)}
            </Text>
          </View>

          {/* Usage */}
          <View style={styles.usageRow}>
            <View style={{ flex: 1 }}>
              <View style={styles.usageLabelRow}>
                <Ionicons name="people-outline" size={14} color={colors.secondaryText} />
                <Text style={[styles.usageLabel, { color: colors.secondaryText }]}>
                  Usage: {offer.usageCount}{offer.totalUsageLimit ? ` / ${offer.totalUsageLimit}` : ''}
                </Text>
              </View>
              {usagePercent !== null && (
                <View style={styles.usageBarBg}>
                  <View
                    style={[
                      styles.usageBarFill,
                      {
                        width: `${Math.min(usagePercent, 100)}%`,
                        backgroundColor: usagePercent >= 90 ? '#EF4444' : usagePercent >= 70 ? '#F59E0B' : '#10B981',
                      },
                    ]}
                  />
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Card Footer: toggle + actions */}
        <View style={[styles.offerCardFooter, { borderTopColor: colors.border }]}>
          <View style={styles.toggleContainer}>
            <Text style={[styles.toggleLabel, { color: offer.isActive ? '#10B981' : '#EF4444' }]}>
              {offer.isActive ? 'Active' : 'Inactive'}
            </Text>
            <Switch
              value={offer.isActive}
              onValueChange={() => handleToggle(offer)}
              trackColor={{ false: '#E2E8F0', true: '#10B981' }}
              thumbColor="#FFFFFF"
            />
          </View>
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => handleEdit(offer)}>
              <Ionicons name="create-outline" size={18} color="#3B82F6" />
              <Text style={[styles.actionBtnText, { color: '#3B82F6' }]}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(offer)}>
              <Ionicons name="trash-outline" size={18} color="#EF4444" />
              <Text style={[styles.actionBtnText, { color: '#EF4444' }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  // ==========================================
  // Render: Form Modal
  // ==========================================
  const renderFormModal = () => (
    <Modal visible={showFormModal} animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        {/* Modal Header */}
        <View style={[styles.modalHeader, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => setShowFormModal(false)}>
            <Ionicons name="close" size={28} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: colors.text }]}>
            {editingOffer ? 'Edit Bank Offer' : 'New Bank Offer'}
          </Text>
          <TouchableOpacity onPress={handleSave} disabled={isSaving}>
            {isSaving ? (
              <ActivityIndicator size="small" color="#3B82F6" />
            ) : (
              <Text style={styles.saveBtn}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Form Body */}
        <ScrollView
          style={styles.formScroll}
          contentContainerStyle={{ paddingBottom: 60 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Bank Name */}
          <Text style={[styles.formLabel, { color: colors.secondaryText }]}>Bank Name *</Text>
          {renderInput('bankName', 'e.g. HDFC Bank')}

          {/* Bank Logo URL */}
          <Text style={[styles.formLabel, { color: colors.secondaryText }]}>Bank Logo URL</Text>
          {renderInput('bankLogo', 'https://example.com/logo.png')}

          {/* Offer Title */}
          <Text style={[styles.formLabel, { color: colors.secondaryText }]}>Offer Title *</Text>
          {renderInput('offerTitle', 'e.g. 10% Instant Discount on HDFC Cards')}

          {/* Offer Description */}
          <Text style={[styles.formLabel, { color: colors.secondaryText }]}>Offer Description</Text>
          {renderInput('offerDescription', 'Describe the offer details...', { multiline: true })}

          {/* Discount & Amounts Row */}
          <View style={styles.formRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.formLabel, { color: colors.secondaryText }]}>Discount % *</Text>
              {renderInput('discountPercentage', '10', { numeric: true })}
            </View>
            <View style={{ width: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.formLabel, { color: colors.secondaryText }]}>Max Discount</Text>
              {renderInput('maxDiscount', '500', { numeric: true })}
            </View>
          </View>

          <Text style={[styles.formLabel, { color: colors.secondaryText }]}>Min Transaction Amount</Text>
          {renderInput('minTransactionAmount', '1000', { numeric: true })}

          {/* Card Type Picker */}
          <Text style={[styles.formLabel, { color: colors.secondaryText }]}>Card Type</Text>
          <View style={styles.cardTypePicker}>
            {CARD_TYPES.map((type) => {
              const isSelected = formData.cardType === type;
              const typeColor = CARD_TYPE_COLORS[type];
              return (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.cardTypePickerItem,
                    { borderColor: isSelected ? typeColor : colors.border },
                    isSelected && { backgroundColor: `${typeColor}15` },
                  ]}
                  onPress={() => setFormData((p) => ({ ...p, cardType: type }))}
                >
                  <Ionicons
                    name={CARD_TYPE_ICONS[type]}
                    size={14}
                    color={isSelected ? typeColor : colors.secondaryText}
                  />
                  <Text
                    style={[
                      styles.cardTypePickerText,
                      { color: isSelected ? typeColor : colors.secondaryText },
                    ]}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Dates Row */}
          <View style={styles.formRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.formLabel, { color: colors.secondaryText }]}>Valid From</Text>
              {renderInput('validFrom', 'YYYY-MM-DD')}
            </View>
            <View style={{ width: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.formLabel, { color: colors.secondaryText }]}>Valid Until</Text>
              {renderInput('validUntil', 'YYYY-MM-DD')}
            </View>
          </View>

          {/* Terms */}
          <Text style={[styles.formLabel, { color: colors.secondaryText }]}>Terms & Conditions</Text>
          {renderInput('terms', 'Enter terms and conditions...', { multiline: true })}

          {/* Promo Code */}
          <Text style={[styles.formLabel, { color: colors.secondaryText }]}>Promo Code</Text>
          {renderInput('promoCode', 'e.g. HDFC10OFF')}

          {/* Usage Limits Row */}
          <View style={styles.formRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.formLabel, { color: colors.secondaryText }]}>Limit Per User</Text>
              {renderInput('usageLimitPerUser', 'e.g. 3', { numeric: true })}
            </View>
            <View style={{ width: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.formLabel, { color: colors.secondaryText }]}>Total Usage Limit</Text>
              {renderInput('totalUsageLimit', 'e.g. 1000', { numeric: true })}
            </View>
          </View>

          {/* Priority */}
          <Text style={[styles.formLabel, { color: colors.secondaryText }]}>Priority</Text>
          {renderInput('priority', '0', { numeric: true })}

          {/* Active Toggle */}
          <View style={[styles.formSwitchRow, { borderColor: colors.border }]}>
            <View>
              <Text style={[styles.formSwitchLabel, { color: colors.text }]}>Active</Text>
              <Text style={[styles.formSwitchHint, { color: colors.secondaryText }]}>
                Enable to make this offer visible to users
              </Text>
            </View>
            <Switch
              value={formData.isActive}
              onValueChange={(v) => setFormData((p) => ({ ...p, isActive: v }))}
              trackColor={{ false: '#E2E8F0', true: '#3B82F6' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </ScrollView>
      </View>
    </Modal>
  );

  // ==========================================
  // Main Render
  // ==========================================
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Bank Offers</Text>
          <Text style={[styles.headerSubtitle, { color: colors.secondaryText }]}>
            Manage bank discount offers
          </Text>
        </View>
        <TouchableOpacity style={styles.createBtn} onPress={handleCreate}>
          <Ionicons name="add" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats Row */}
        {renderStatsRow()}

        {/* Filters */}
        {renderFilters()}

        {/* Content */}
        <View style={styles.contentContainer}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#3B82F6" />
              <Text style={[styles.loadingText, { color: colors.secondaryText }]}>Loading offers...</Text>
            </View>
          ) : offers.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="card-outline" size={56} color="#D1D5DB" />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No Bank Offers Found</Text>
              <Text style={[styles.emptySubtitle, { color: colors.secondaryText }]}>
                {searchQuery
                  ? 'Try adjusting your search or filters'
                  : 'Create your first bank offer to get started'}
              </Text>
              {!searchQuery && (
                <TouchableOpacity style={styles.emptyCreateBtn} onPress={handleCreate}>
                  <Ionicons name="add" size={18} color="#FFFFFF" />
                  <Text style={styles.emptyCreateBtnText}>Create Offer</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            offers.map((offer) => renderOfferCard(offer))
          )}
        </View>
      </ScrollView>

      {/* Form Modal */}
      {renderFormModal()}
    </View>
  );
}

// ============================================
// STYLES
// ============================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  createBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 10,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    alignItems: 'center',
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
  },

  // Filters
  filtersContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    marginTop: 4,
  },
  filterTabRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  filterTabActive: {
    backgroundColor: '#3B82F6',
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  filterTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  cardTypeFilterRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  cardTypeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
    gap: 5,
  },
  cardTypeChipText: {
    fontSize: 12,
    fontWeight: '500',
  },

  // Search Bar
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },

  // Content
  contentContainer: {
    padding: 16,
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },

  // Empty State
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    marginTop: 6,
    textAlign: 'center',
  },
  emptyCreateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 20,
    gap: 6,
  },
  emptyCreateBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },

  // Offer Card
  offerCard: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  offerCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: 14,
  },
  bankInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  bankIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bankName: {
    fontSize: 15,
    fontWeight: '700',
  },
  offerTitle: {
    fontSize: 13,
    marginTop: 2,
    lineHeight: 18,
  },
  discountBadge: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center',
    marginLeft: 10,
  },
  discountBadgeText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#059669',
  },
  discountBadgeSub: {
    fontSize: 9,
    fontWeight: '700',
    color: '#059669',
    letterSpacing: 1,
  },

  // Offer Details
  offerDetails: {
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 10,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  detailLabel: {
    fontSize: 11,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  promoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  promoText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D97706',
    letterSpacing: 0.5,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  dateText: {
    fontSize: 12,
  },
  usageRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  usageLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  usageLabel: {
    fontSize: 12,
  },
  usageBarBg: {
    height: 5,
    borderRadius: 3,
    backgroundColor: '#E5E7EB',
    overflow: 'hidden',
  },
  usageBarFill: {
    height: '100%',
    borderRadius: 3,
  },

  // Card Footer
  offerCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toggleLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '500',
  },

  // Modal
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  saveBtn: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3B82F6',
  },
  formScroll: {
    paddingHorizontal: 20,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 14,
    marginBottom: 5,
  },
  formInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  multiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  formRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  cardTypePicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  cardTypePickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  cardTypePickerText: {
    fontSize: 13,
    fontWeight: '500',
  },
  formSwitchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderRadius: 12,
  },
  formSwitchLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  formSwitchHint: {
    fontSize: 12,
    marginTop: 2,
  },
});
