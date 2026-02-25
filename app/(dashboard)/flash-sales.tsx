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
import { flashSalesService, FlashSale } from '../../services/api/flashSales';
import { Colors } from '../../constants/Colors';
import { showAlert, showConfirm } from '../../utils/alert';

// ============================================
// TYPES & CONSTANTS
// ============================================

type StatusFilter = 'all' | 'active' | 'scheduled' | 'ended' | 'sold_out';

const STATUS_COLORS: Record<string, string> = {
  active: '#10B981',
  scheduled: '#3B82F6',
  ended: '#EF4444',
  sold_out: '#6B7280',
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  scheduled: 'Scheduled',
  ended: 'Ended',
  sold_out: 'Sold Out',
};

const FILTER_TABS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'scheduled', label: 'Scheduled' },
  { key: 'ended', label: 'Ended' },
  { key: 'sold_out', label: 'Sold Out' },
];

// ============================================
// HELPERS
// ============================================

function formatDate(dateString: string): string {
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[d.getMonth()];
    const day = String(d.getDate()).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${month} ${day}, ${year} ${hours}:${mins}`;
  } catch {
    return dateString;
  }
}

function truncateText(text: string, maxLen: number): string {
  if (!text) return '';
  return text.length > maxLen ? text.substring(0, maxLen) + '...' : text;
}

function toLocalDatetimeString(iso: string): string {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
  } catch {
    return '';
  }
}

function fromLocalDatetimeString(localStr: string): string {
  try {
    const d = new Date(localStr);
    if (isNaN(d.getTime())) return '';
    return d.toISOString();
  } catch {
    return '';
  }
}

// ============================================
// COMPONENT
// ============================================

export default function FlashSalesScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  // Data state
  const [sales, setSales] = useState<FlashSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filter state
  const [activeFilter, setActiveFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingSale, setEditingSale] = useState<FlashSale | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formImage, setFormImage] = useState('');
  const [formDiscountPercentage, setFormDiscountPercentage] = useState('');
  const [formStartTime, setFormStartTime] = useState('');
  const [formEndTime, setFormEndTime] = useState('');
  const [formMaxQuantity, setFormMaxQuantity] = useState('');
  const [formLimitPerUser, setFormLimitPerUser] = useState('');
  const [formOriginalPrice, setFormOriginalPrice] = useState('');
  const [formFlashSalePrice, setFormFlashSalePrice] = useState('');
  const [formPromoCode, setFormPromoCode] = useState('');
  const [formPriority, setFormPriority] = useState('');
  const [formEnabled, setFormEnabled] = useState(true);

  // ============================================
  // DATA FETCHING
  // ============================================

  const fetchSales = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const params: { status?: string; search?: string; limit?: number } = { limit: 100 };
      if (activeFilter !== 'all') {
        params.status = activeFilter;
      }
      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }

      const result = await flashSalesService.getSales(params);
      const salesData = result?.data?.sales || result?.sales || [];
      setSales(Array.isArray(salesData) ? salesData : []);
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to load flash sales');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeFilter, searchQuery]);

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  const onRefresh = () => {
    fetchSales(true);
  };

  // ============================================
  // STATS COMPUTATION
  // ============================================

  const totalCount = sales.length;
  const activeCount = sales.filter(s => s.status === 'active').length;
  const scheduledCount = sales.filter(s => s.status === 'scheduled').length;
  const endedCount = sales.filter(s => s.status === 'ended').length;

  // ============================================
  // FORM HELPERS
  // ============================================

  const resetForm = () => {
    setFormTitle('');
    setFormDescription('');
    setFormImage('');
    setFormDiscountPercentage('');
    setFormStartTime('');
    setFormEndTime('');
    setFormMaxQuantity('');
    setFormLimitPerUser('');
    setFormOriginalPrice('');
    setFormFlashSalePrice('');
    setFormPromoCode('');
    setFormPriority('0');
    setFormEnabled(true);
  };

  const populateForm = (sale: FlashSale) => {
    setFormTitle(sale.title || '');
    setFormDescription(sale.description || '');
    setFormImage(sale.image || '');
    setFormDiscountPercentage(String(sale.discountPercentage ?? ''));
    setFormStartTime(sale.startTime ? toLocalDatetimeString(sale.startTime) : '');
    setFormEndTime(sale.endTime ? toLocalDatetimeString(sale.endTime) : '');
    setFormMaxQuantity(String(sale.maxQuantity ?? ''));
    setFormLimitPerUser(String(sale.limitPerUser ?? ''));
    setFormOriginalPrice(String(sale.originalPrice ?? ''));
    setFormFlashSalePrice(String(sale.flashSalePrice ?? ''));
    setFormPromoCode(sale.promoCode || '');
    setFormPriority(String(sale.priority ?? 0));
    setFormEnabled(sale.enabled ?? true);
  };

  // ============================================
  // HANDLERS
  // ============================================

  const handleCreate = () => {
    setEditingSale(null);
    resetForm();
    setShowModal(true);
  };

  const handleEdit = (sale: FlashSale) => {
    setEditingSale(sale);
    populateForm(sale);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formTitle.trim()) {
      showAlert('Error', 'Title is required');
      return;
    }
    if (!formStartTime.trim()) {
      showAlert('Error', 'Start time is required');
      return;
    }
    if (!formEndTime.trim()) {
      showAlert('Error', 'End time is required');
      return;
    }

    const discount = parseFloat(formDiscountPercentage);
    if (isNaN(discount) || discount < 0 || discount > 100) {
      showAlert('Error', 'Discount percentage must be between 0 and 100');
      return;
    }

    setSaving(true);
    try {
      const payload: Partial<FlashSale> = {
        title: formTitle.trim(),
        description: formDescription.trim(),
        image: formImage.trim(),
        discountPercentage: discount,
        startTime: fromLocalDatetimeString(formStartTime) || formStartTime,
        endTime: fromLocalDatetimeString(formEndTime) || formEndTime,
        maxQuantity: parseInt(formMaxQuantity) || 0,
        limitPerUser: parseInt(formLimitPerUser) || 1,
        originalPrice: parseFloat(formOriginalPrice) || undefined,
        flashSalePrice: parseFloat(formFlashSalePrice) || undefined,
        promoCode: formPromoCode.trim() || undefined,
        priority: parseInt(formPriority) || 0,
        enabled: formEnabled,
      };

      if (editingSale) {
        await flashSalesService.updateSale(editingSale._id, payload);
        showAlert('Success', 'Flash sale updated successfully');
      } else {
        await flashSalesService.createSale(payload);
        showAlert('Success', 'Flash sale created successfully');
      }

      setShowModal(false);
      setEditingSale(null);
      resetForm();
      fetchSales();
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to save flash sale');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (sale: FlashSale) => {
    try {
      await flashSalesService.toggleSale(sale._id);
      fetchSales();
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to toggle flash sale');
    }
  };

  const handleDelete = async (sale: FlashSale) => {
    const confirmed = await showConfirm(
      'Delete Flash Sale',
      `Are you sure you want to delete "${sale.title}"? This action cannot be undone.`
    );

    if (confirmed) {
      try {
        await flashSalesService.deleteSale(sale._id);
        showAlert('Success', 'Flash sale deleted');
        fetchSales();
      } catch (error: any) {
        showAlert('Error', error.message || 'Failed to delete flash sale');
      }
    }
  };

  const handleSearch = () => {
    fetchSales();
  };

  // ============================================
  // RENDER HELPERS
  // ============================================

  const renderStatCard = (label: string, value: number, icon: string, color: string) => (
    <View style={[styles.statCard, { backgroundColor: colors.card }]} key={label}>
      <View style={[styles.statIconContainer, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon as any} size={20} color={color} />
      </View>
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.secondaryText }]}>{label}</Text>
    </View>
  );

  const renderStatusBadge = (status: string) => {
    const color = STATUS_COLORS[status] || '#6B7280';
    const label = STATUS_LABELS[status] || status;
    return (
      <View style={[styles.statusBadge, { backgroundColor: color + '20' }]}>
        <View style={[styles.statusDot, { backgroundColor: color }]} />
        <Text style={[styles.statusBadgeText, { color }]}>{label}</Text>
      </View>
    );
  };

  const renderSaleCard = (sale: FlashSale) => (
    <View style={[styles.saleCard, { backgroundColor: colors.card }]} key={sale._id}>
      {/* Top row: image placeholder + info + discount badge */}
      <View style={styles.saleCardHeader}>
        <View style={[styles.imagePlaceholder, { backgroundColor: colors.border }]}>
          <Ionicons name="image-outline" size={28} color={colors.secondaryText} />
        </View>
        <View style={styles.saleCardInfo}>
          <View style={styles.saleCardTitleRow}>
            <Text style={[styles.saleCardTitle, { color: colors.text }]} numberOfLines={1}>
              {sale.title}
            </Text>
            {sale.discountPercentage > 0 && (
              <View style={styles.discountBadge}>
                <Text style={styles.discountBadgeText}>{sale.discountPercentage}% OFF</Text>
              </View>
            )}
          </View>
          {sale.description ? (
            <Text style={[styles.saleCardDescription, { color: colors.secondaryText }]} numberOfLines={2}>
              {truncateText(sale.description, 100)}
            </Text>
          ) : null}
        </View>
      </View>

      {/* Time and status row */}
      <View style={styles.saleCardMeta}>
        <View style={styles.timeRow}>
          <Ionicons name="time-outline" size={14} color={colors.secondaryText} />
          <Text style={[styles.timeText, { color: colors.secondaryText }]}>
            {formatDate(sale.startTime)} - {formatDate(sale.endTime)}
          </Text>
        </View>
        {renderStatusBadge(sale.status)}
      </View>

      {/* Pricing row */}
      {(sale.originalPrice != null || sale.flashSalePrice != null) && (
        <View style={styles.pricingRow}>
          {sale.originalPrice != null && (
            <Text style={[styles.originalPrice, { color: colors.secondaryText }]}>
              Original: {sale.originalPrice.toFixed(2)}
            </Text>
          )}
          {sale.flashSalePrice != null && (
            <Text style={[styles.flashPrice, { color: '#10B981' }]}>
              Sale: {sale.flashSalePrice.toFixed(2)}
            </Text>
          )}
          {sale.promoCode ? (
            <View style={[styles.promoCodeBadge, { backgroundColor: colors.border }]}>
              <Ionicons name="pricetag-outline" size={12} color={colors.secondaryText} />
              <Text style={[styles.promoCodeText, { color: colors.text }]}>{sale.promoCode}</Text>
            </View>
          ) : null}
        </View>
      )}

      {/* Stats row */}
      <View style={[styles.statsRow, { borderTopColor: colors.border }]}>
        <View style={styles.statItem}>
          <Ionicons name="eye-outline" size={14} color={colors.secondaryText} />
          <Text style={[styles.statItemText, { color: colors.secondaryText }]}>
            {sale.viewCount ?? 0}
          </Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="hand-left-outline" size={14} color={colors.secondaryText} />
          <Text style={[styles.statItemText, { color: colors.secondaryText }]}>
            {sale.clickCount ?? 0}
          </Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="cart-outline" size={14} color={colors.secondaryText} />
          <Text style={[styles.statItemText, { color: colors.secondaryText }]}>
            {sale.purchaseCount ?? 0}
          </Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="cube-outline" size={14} color={colors.secondaryText} />
          <Text style={[styles.statItemText, { color: colors.secondaryText }]}>
            {sale.soldQuantity ?? 0}/{sale.maxQuantity ?? 0}
          </Text>
        </View>
      </View>

      {/* Actions row */}
      <View style={[styles.actionsRow, { borderTopColor: colors.border }]}>
        <View style={styles.toggleRow}>
          <Text style={[styles.toggleLabel, { color: colors.secondaryText }]}>Enabled</Text>
          <Switch
            value={sale.enabled}
            onValueChange={() => handleToggle(sale)}
            trackColor={{ false: '#ccc', true: '#4CAF50' }}
            thumbColor="#fff"
            style={styles.toggleSwitch}
          />
        </View>
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => handleEdit(sale)}>
            <Ionicons name="create-outline" size={20} color={colors.info} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(sale)}>
            <Ionicons name="trash-outline" size={20} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderFormField = (label: string, value: string, onChangeText: (t: string) => void, options?: {
    placeholder?: string;
    keyboardType?: 'default' | 'numeric' | 'decimal-pad';
    multiline?: boolean;
  }) => (
    <View style={styles.formField}>
      <Text style={[styles.inputLabel, { color: colors.secondaryText }]}>{label}</Text>
      <TextInput
        style={[
          styles.input,
          { backgroundColor: colors.border + '40', color: colors.text, borderColor: colors.border },
          options?.multiline && styles.inputMultiline,
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={options?.placeholder || ''}
        placeholderTextColor={colors.secondaryText}
        keyboardType={options?.keyboardType || 'default'}
        multiline={options?.multiline}
        numberOfLines={options?.multiline ? 3 : 1}
      />
    </View>
  );

  // ============================================
  // LOADING STATE
  // ============================================

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
          <Text style={[styles.loadingText, { color: colors.secondaryText }]}>Loading flash sales...</Text>
        </View>
      </View>
    );
  }

  // ============================================
  // MAIN RENDER
  // ============================================

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Flash Sales</Text>
          <Text style={[styles.headerSubtitle, { color: colors.secondaryText }]}>
            Manage time-limited flash sale campaigns
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.createBtn, { backgroundColor: colors.tint }]}
          onPress={handleCreate}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />
        }
        contentContainerStyle={styles.scrollContentContainer}
      >
        {/* Stats Row */}
        <View style={styles.statsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsScrollContent}>
            {renderStatCard('Total', totalCount, 'flash-outline', '#3B82F6')}
            {renderStatCard('Active', activeCount, 'checkmark-circle-outline', '#10B981')}
            {renderStatCard('Scheduled', scheduledCount, 'calendar-outline', '#F59E0B')}
            {renderStatCard('Ended', endedCount, 'close-circle-outline', '#EF4444')}
          </ScrollView>
        </View>

        {/* Filter Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterTabsContainer}
        >
          {FILTER_TABS.map(tab => {
            const isActive = activeFilter === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.filterTab,
                  isActive && { backgroundColor: colors.tint },
                  !isActive && { backgroundColor: colors.card },
                ]}
                onPress={() => setActiveFilter(tab.key)}
              >
                <Text
                  style={[
                    styles.filterTabText,
                    { color: isActive ? '#fff' : colors.secondaryText },
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="search-outline" size={18} color={colors.secondaryText} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search by title..."
              placeholderTextColor={colors.secondaryText}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setSearchQuery('');
                  // Trigger fresh fetch after clearing
                  setTimeout(() => fetchSales(), 0);
                }}
              >
                <Ionicons name="close-circle" size={18} color={colors.secondaryText} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Sale Cards */}
        {sales.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="flash-outline" size={48} color={colors.secondaryText} />
            <Text style={[styles.emptyText, { color: colors.secondaryText }]}>
              No flash sales found
            </Text>
            <TouchableOpacity
              style={[styles.emptyBtn, { backgroundColor: colors.tint }]}
              onPress={handleCreate}
            >
              <Text style={styles.emptyBtnText}>Create Flash Sale</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.salesList}>
            {sales.map(sale => renderSaleCard(sale))}
          </View>
        )}
      </ScrollView>

      {/* Create/Edit Modal */}
      <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => setShowModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            {/* Modal Header */}
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {editingSale ? 'Edit Flash Sale' : 'Create Flash Sale'}
              </Text>
              <TouchableOpacity onPress={() => { setShowModal(false); setEditingSale(null); }}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Modal Body */}
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {renderFormField('Title *', formTitle, setFormTitle, {
                placeholder: 'Enter sale title',
              })}

              {renderFormField('Description', formDescription, setFormDescription, {
                placeholder: 'Enter sale description',
                multiline: true,
              })}

              {renderFormField('Image URL', formImage, setFormImage, {
                placeholder: 'https://example.com/image.jpg',
              })}

              <View style={styles.formRow}>
                <View style={styles.formRowHalf}>
                  {renderFormField('Discount %', formDiscountPercentage, setFormDiscountPercentage, {
                    placeholder: '0',
                    keyboardType: 'decimal-pad',
                  })}
                </View>
                <View style={styles.formRowHalf}>
                  {renderFormField('Priority', formPriority, setFormPriority, {
                    placeholder: '0',
                    keyboardType: 'numeric',
                  })}
                </View>
              </View>

              {renderFormField('Start Time *', formStartTime, setFormStartTime, {
                placeholder: 'YYYY-MM-DDTHH:MM',
              })}

              {renderFormField('End Time *', formEndTime, setFormEndTime, {
                placeholder: 'YYYY-MM-DDTHH:MM',
              })}

              <View style={styles.formRow}>
                <View style={styles.formRowHalf}>
                  {renderFormField('Max Quantity', formMaxQuantity, setFormMaxQuantity, {
                    placeholder: '0',
                    keyboardType: 'numeric',
                  })}
                </View>
                <View style={styles.formRowHalf}>
                  {renderFormField('Limit/User', formLimitPerUser, setFormLimitPerUser, {
                    placeholder: '1',
                    keyboardType: 'numeric',
                  })}
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={styles.formRowHalf}>
                  {renderFormField('Original Price', formOriginalPrice, setFormOriginalPrice, {
                    placeholder: '0.00',
                    keyboardType: 'decimal-pad',
                  })}
                </View>
                <View style={styles.formRowHalf}>
                  {renderFormField('Flash Sale Price', formFlashSalePrice, setFormFlashSalePrice, {
                    placeholder: '0.00',
                    keyboardType: 'decimal-pad',
                  })}
                </View>
              </View>

              {renderFormField('Promo Code', formPromoCode, setFormPromoCode, {
                placeholder: 'e.g. FLASH50',
              })}

              <View style={[styles.switchRow, { marginTop: 16, marginBottom: 16 }]}>
                <Text style={[styles.inputLabel, { color: colors.secondaryText, marginBottom: 0, marginTop: 0 }]}>
                  Enabled
                </Text>
                <Switch
                  value={formEnabled}
                  onValueChange={setFormEnabled}
                  trackColor={{ false: '#ccc', true: '#4CAF50' }}
                  thumbColor="#fff"
                />
              </View>
            </ScrollView>

            {/* Modal Footer */}
            <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => { setShowModal(false); setEditingSale(null); }}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.saveBtn, { backgroundColor: colors.tint }]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>{editingSale ? 'Update' : 'Create'}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  createBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Scroll
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingBottom: 100,
  },

  // Stats
  statsContainer: {
    paddingVertical: 12,
  },
  statsScrollContent: {
    paddingHorizontal: 12,
  },
  statCard: {
    width: 100,
    padding: 12,
    borderRadius: 12,
    marginHorizontal: 4,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
  },

  // Filter Tabs
  filterTabsContainer: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Search
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    marginLeft: 8,
    marginRight: 8,
    padding: 0,
  },

  // Empty
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 14,
    marginTop: 12,
  },
  emptyBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 16,
  },
  emptyBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },

  // Sales List
  salesList: {
    paddingHorizontal: 16,
  },

  // Sale Card
  saleCard: {
    borderRadius: 12,
    marginBottom: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  saleCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  imagePlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saleCardInfo: {
    flex: 1,
    marginLeft: 12,
  },
  saleCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  saleCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  discountBadge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  discountBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  saleCardDescription: {
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },

  // Meta row
  saleCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  timeText: {
    fontSize: 12,
    marginLeft: 4,
    flex: 1,
  },

  // Status badge
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Pricing row
  pricingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    flexWrap: 'wrap',
    gap: 8,
  },
  originalPrice: {
    fontSize: 13,
    textDecorationLine: 'line-through',
  },
  flashPrice: {
    fontSize: 14,
    fontWeight: '700',
  },
  promoCodeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  promoCodeText: {
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },

  // Stats row
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItemText: {
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '500',
  },

  // Actions row
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toggleLabel: {
    fontSize: 13,
    marginRight: 8,
  },
  toggleSwitch: {
    transform: [{ scale: 0.85 }],
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionBtn: {
    padding: 8,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalBody: {
    padding: 16,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelBtn: {
    marginRight: 8,
    backgroundColor: '#f0f0f0',
  },
  cancelBtnText: {
    fontWeight: '600',
    color: '#666',
  },
  saveBtn: {
    marginLeft: 8,
  },
  saveBtnText: {
    fontWeight: '600',
    color: '#fff',
  },

  // Form
  formField: {
    marginBottom: 4,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
  },
  formRowHalf: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    borderWidth: 1,
  },
  inputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
