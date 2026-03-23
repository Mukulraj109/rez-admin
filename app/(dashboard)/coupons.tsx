import React, { useState, useEffect, useCallback, useRef } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '../../services/api/apiClient';
import { Colors } from '../../constants/Colors';
import { showAlert, showConfirm } from '../../utils/alert';

// ============================================
// TYPES
// ============================================

interface Coupon {
  _id: string;
  couponCode: string;
  title: string;
  description: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  minOrderValue: number;
  maxDiscountCap: number;
  validFrom: string;
  validTo: string;
  usageLimit: {
    totalUsage: number;
    perUser: number;
    usedCount: number;
  };
  status: 'active' | 'inactive' | 'expired';
  autoApply: boolean;
  isFeatured: boolean;
  isNewlyAdded: boolean;
  tags: string[];
  imageUrl?: string;
  viewCount: number;
  claimCount: number;
  usageCount: number;
  createdAt: string;
}

interface CouponForm {
  couponCode: string;
  title: string;
  description: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: string;
  minOrderValue: string;
  maxDiscountCap: string;
  validFrom: string;
  validTo: string;
  totalUsage: string;
  perUser: string;
  autoApply: boolean;
  isFeatured: boolean;
  tags: string;
  status: 'active' | 'inactive';
}

type StatusFilter = 'all' | 'active' | 'inactive' | 'expired';

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ============================================
// CONSTANTS
// ============================================

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  active: { bg: '#D1FAE5', text: '#065F46' },
  inactive: { bg: '#FEE2E2', text: '#991B1B' },
  expired: { bg: '#F3F4F6', text: '#6B7280' },
};

const EMPTY_FORM: CouponForm = {
  couponCode: '',
  title: '',
  description: '',
  discountType: 'PERCENTAGE',
  discountValue: '',
  minOrderValue: '',
  maxDiscountCap: '',
  validFrom: '',
  validTo: '',
  totalUsage: '100',
  perUser: '1',
  autoApply: false,
  isFeatured: false,
  tags: '',
  status: 'active',
};

// ============================================
// HELPERS
// ============================================

function formatDate(dateStr: string): string {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function getDateInputValue(dateStr: string): string {
  if (!dateStr) return '';
  return dateStr.split('T')[0];
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function CouponsPage() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  // Data
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [form, setForm] = useState<CouponForm>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);

  // Debounce
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);

  // ============================================
  // FETCH
  // ============================================

  const fetchCoupons = useCallback(async (page: number = 1, append: boolean = false) => {
    if (page === 1 && !append) setIsLoading(true);

    const params = new URLSearchParams({
      page: page.toString(),
      limit: '20',
    });
    if (statusFilter !== 'all') params.append('status', statusFilter);
    if (searchQuery) params.append('search', searchQuery);

    const res = await apiClient.get<{ coupons: Coupon[]; pagination: Pagination }>(
      `admin/coupons?${params}`
    );

    if (res.success && res.data) {
      if (append) {
        setCoupons(prev => [...prev, ...res.data!.coupons]);
      } else {
        setCoupons(res.data.coupons);
      }
      setPagination(res.data.pagination);
    }

    setIsLoading(false);
    setIsLoadingMore(false);
    setIsRefreshing(false);
  }, [statusFilter, searchQuery]);

  useEffect(() => {
    fetchCoupons(1);
    isFirstRender.current = false;
  }, [statusFilter]);

  useEffect(() => {
    if (isFirstRender.current) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchCoupons(1), 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchQuery]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchCoupons(1);
  }, [fetchCoupons]);

  const handleLoadMore = useCallback(() => {
    if (isLoadingMore || !pagination || pagination.page >= pagination.totalPages) return;
    setIsLoadingMore(true);
    fetchCoupons(pagination.page + 1, true);
  }, [isLoadingMore, pagination, fetchCoupons]);

  // ============================================
  // ACTIONS
  // ============================================

  const openCreateModal = () => {
    setEditingCoupon(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEditModal = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setForm({
      couponCode: coupon.couponCode,
      title: coupon.title,
      description: coupon.description,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue.toString(),
      minOrderValue: coupon.minOrderValue.toString(),
      maxDiscountCap: coupon.maxDiscountCap.toString(),
      validFrom: getDateInputValue(coupon.validFrom),
      validTo: getDateInputValue(coupon.validTo),
      totalUsage: coupon.usageLimit.totalUsage.toString(),
      perUser: coupon.usageLimit.perUser.toString(),
      autoApply: coupon.autoApply,
      isFeatured: coupon.isFeatured,
      tags: coupon.tags.join(', '),
      status: coupon.status === 'expired' ? 'inactive' : coupon.status,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.couponCode || !form.title || !form.description || !form.discountValue || !form.validFrom || !form.validTo) {
      showAlert('Validation Error', 'Please fill in all required fields.');
      return;
    }

    setIsSaving(true);

    const body = {
      couponCode: form.couponCode.toUpperCase().trim(),
      title: form.title,
      description: form.description,
      discountType: form.discountType,
      discountValue: parseFloat(form.discountValue),
      minOrderValue: parseFloat(form.minOrderValue) || 0,
      maxDiscountCap: parseFloat(form.maxDiscountCap) || 0,
      validFrom: form.validFrom,
      validTo: form.validTo,
      usageLimit: {
        totalUsage: parseInt(form.totalUsage) || 100,
        perUser: parseInt(form.perUser) || 1,
        usedCount: editingCoupon?.usageLimit.usedCount || 0,
      },
      autoApply: form.autoApply,
      isFeatured: form.isFeatured,
      tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      status: form.status,
    };

    let res;
    if (editingCoupon) {
      res = await apiClient.put(`admin/coupons/${editingCoupon._id}`, body);
    } else {
      res = await apiClient.post('admin/coupons', body);
    }

    setIsSaving(false);

    if (res.success) {
      showAlert('Success', editingCoupon ? 'Coupon updated.' : 'Coupon created.');
      setShowModal(false);
      fetchCoupons(1);
    } else {
      showAlert('Error', res.message || 'Failed to save coupon.');
    }
  };

  const handleToggle = async (coupon: Coupon) => {
    const res = await apiClient.patch(`admin/coupons/${coupon._id}/toggle`);
    if (res.success) {
      setCoupons(prev =>
        prev.map(c =>
          c._id === coupon._id
            ? { ...c, status: c.status === 'active' ? 'inactive' : 'active' }
            : c
        )
      );
    } else {
      showAlert('Error', res.message || 'Failed to toggle coupon.');
    }
  };

  const handleDelete = (coupon: Coupon) => {
    showConfirm(
      'Delete Coupon',
      `Are you sure you want to delete "${coupon.couponCode}"? This cannot be undone.`,
      async () => {
        const res = await apiClient.delete(`admin/coupons/${coupon._id}`);
        if (res.success) {
          showAlert('Deleted', 'Coupon has been deleted.');
          fetchCoupons(1);
        } else {
          showAlert('Error', res.message || 'Failed to delete coupon.');
        }
      }
    );
  };

  // ============================================
  // RENDER
  // ============================================

  const renderCouponCard = useCallback(({ item }: { item: Coupon }) => {
    const statusStyle = STATUS_COLORS[item.status] || STATUS_COLORS.inactive;
    const isExpired = new Date(item.validTo) < new Date();
    const effectiveStatus = isExpired ? 'expired' : item.status;
    const effectiveStatusStyle = STATUS_COLORS[effectiveStatus];

    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <View style={styles.codeContainer}>
              <Ionicons name="ticket-outline" size={16} color={colors.tint} />
              <Text style={[styles.couponCode, { color: colors.text }]}>{item.couponCode}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: effectiveStatusStyle.bg }]}>
              <Text style={[styles.statusText, { color: effectiveStatusStyle.text }]}>
                {effectiveStatus.toUpperCase()}
              </Text>
            </View>
          </View>
          <View style={styles.cardActions}>
            <TouchableOpacity onPress={() => handleToggle(item)} style={styles.actionBtn}>
              <Ionicons
                name={item.status === 'active' ? 'pause-circle-outline' : 'play-circle-outline'}
                size={22}
                color={item.status === 'active' ? colors.warning : colors.success}
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => openEditModal(item)} style={styles.actionBtn}>
              <Ionicons name="create-outline" size={20} color={colors.info} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDelete(item)} style={styles.actionBtn}>
              <Ionicons name="trash-outline" size={20} color={colors.error} />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={[styles.cardTitle, { color: colors.text }]}>{item.title}</Text>
        <Text style={[styles.cardDesc, { color: colors.secondaryText }]} numberOfLines={2}>
          {item.description}
        </Text>

        <View style={styles.cardMeta}>
          <View style={styles.metaItem}>
            <Ionicons name="pricetag-outline" size={14} color={colors.secondaryText} />
            <Text style={[styles.metaText, { color: colors.secondaryText }]}>
              {item.discountType === 'PERCENTAGE'
                ? `${item.discountValue}% off`
                : `\u20B9${item.discountValue} off`}
              {item.minOrderValue > 0 ? ` (min \u20B9${item.minOrderValue})` : ''}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={14} color={colors.secondaryText} />
            <Text style={[styles.metaText, { color: colors.secondaryText }]}>
              {formatDate(item.validFrom)} - {formatDate(item.validTo)}
            </Text>
          </View>
        </View>

        <View style={styles.cardStats}>
          <View style={styles.statChip}>
            <Ionicons name="eye-outline" size={12} color={colors.secondaryText} />
            <Text style={[styles.statChipText, { color: colors.secondaryText }]}>
              {item.viewCount} views
            </Text>
          </View>
          <View style={styles.statChip}>
            <Ionicons name="hand-left-outline" size={12} color={colors.secondaryText} />
            <Text style={[styles.statChipText, { color: colors.secondaryText }]}>
              {item.claimCount} claims
            </Text>
          </View>
          <View style={styles.statChip}>
            <Ionicons name="checkmark-circle-outline" size={12} color={colors.secondaryText} />
            <Text style={[styles.statChipText, { color: colors.secondaryText }]}>
              {item.usageCount}/{item.usageLimit.totalUsage || '\u221E'} used
            </Text>
          </View>
          {item.autoApply && (
            <View style={[styles.statChip, { backgroundColor: '#DBEAFE' }]}>
              <Ionicons name="flash-outline" size={12} color="#1D4ED8" />
              <Text style={[styles.statChipText, { color: '#1D4ED8' }]}>Auto</Text>
            </View>
          )}
          {item.isFeatured && (
            <View style={[styles.statChip, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="star" size={12} color="#B45309" />
              <Text style={[styles.statChipText, { color: '#B45309' }]}>Featured</Text>
            </View>
          )}
        </View>
      </View>
    );
  }, [colors]);

  const renderFilters = () => (
    <View style={styles.filters}>
      <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Ionicons name="search-outline" size={18} color={colors.secondaryText} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search coupons..."
          placeholderTextColor={colors.secondaryText}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color={colors.secondaryText} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChips}>
        {(['all', 'active', 'inactive', 'expired'] as StatusFilter[]).map(f => (
          <TouchableOpacity
            key={f}
            style={[
              styles.filterChip,
              { borderColor: colors.border },
              statusFilter === f && { backgroundColor: colors.tint, borderColor: colors.tint },
            ]}
            onPress={() => setStatusFilter(f)}
          >
            <Text
              style={[
                styles.filterChipText,
                { color: colors.secondaryText },
                statusFilter === f && { color: '#FFFFFF' },
              ]}
            >
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  // ============================================
  // MODAL
  // ============================================

  const renderFormField = (label: string, key: keyof CouponForm, opts?: {
    placeholder?: string;
    keyboardType?: 'default' | 'numeric';
    multiline?: boolean;
  }) => (
    <View style={styles.formGroup}>
      <Text style={[styles.formLabel, { color: colors.text }]}>{label}</Text>
      <TextInput
        style={[
          styles.formInput,
          { color: colors.text, backgroundColor: colors.backgroundSecondary, borderColor: colors.border },
          opts?.multiline && { height: 80, textAlignVertical: 'top' },
        ]}
        value={form[key] as string}
        onChangeText={(text) => setForm(prev => ({ ...prev, [key]: text }))}
        placeholder={opts?.placeholder || ''}
        placeholderTextColor={colors.secondaryText}
        keyboardType={opts?.keyboardType}
        multiline={opts?.multiline}
      />
    </View>
  );

  const renderModal = () => (
    <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        {/* Modal header */}
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => setShowModal(false)}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: colors.text }]}>
            {editingCoupon ? 'Edit Coupon' : 'Create Coupon'}
          </Text>
          <TouchableOpacity onPress={handleSave} disabled={isSaving}>
            {isSaving ? (
              <ActivityIndicator size="small" color={colors.tint} />
            ) : (
              <Text style={[styles.modalSave, { color: colors.tint }]}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalBody} contentContainerStyle={{ paddingBottom: 40 }}>
          {renderFormField('Coupon Code *', 'couponCode', { placeholder: 'e.g. SUMMER20' })}
          {renderFormField('Title *', 'title', { placeholder: 'Summer Sale 20% Off' })}
          {renderFormField('Description *', 'description', { placeholder: 'Get 20% off on all orders', multiline: true })}

          {/* Discount Type */}
          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.text }]}>Discount Type</Text>
            <View style={styles.segmentControl}>
              {(['PERCENTAGE', 'FIXED'] as const).map(type => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.segmentBtn,
                    { borderColor: colors.border },
                    form.discountType === type && { backgroundColor: colors.tint, borderColor: colors.tint },
                  ]}
                  onPress={() => setForm(prev => ({ ...prev, discountType: type }))}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      { color: colors.secondaryText },
                      form.discountType === type && { color: '#FFFFFF' },
                    ]}
                  >
                    {type === 'PERCENTAGE' ? '% Percentage' : '\u20B9 Fixed'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {renderFormField('Discount Value *', 'discountValue', { placeholder: form.discountType === 'PERCENTAGE' ? 'e.g. 20' : 'e.g. 100', keyboardType: 'numeric' })}
          {renderFormField('Min Order Value', 'minOrderValue', { placeholder: 'e.g. 500', keyboardType: 'numeric' })}
          {form.discountType === 'PERCENTAGE' && renderFormField('Max Discount Cap', 'maxDiscountCap', { placeholder: 'e.g. 200', keyboardType: 'numeric' })}

          {renderFormField('Valid From (YYYY-MM-DD) *', 'validFrom', { placeholder: '2026-01-01' })}
          {renderFormField('Valid To (YYYY-MM-DD) *', 'validTo', { placeholder: '2026-12-31' })}

          {renderFormField('Total Usage Limit', 'totalUsage', { placeholder: '100', keyboardType: 'numeric' })}
          {renderFormField('Per User Limit', 'perUser', { placeholder: '1', keyboardType: 'numeric' })}

          {renderFormField('Tags (comma separated)', 'tags', { placeholder: 'summer, sale, new' })}

          {/* Toggles */}
          <View style={styles.toggleRow}>
            <Text style={[styles.formLabel, { color: colors.text, marginBottom: 0 }]}>Auto Apply</Text>
            <Switch
              value={form.autoApply}
              onValueChange={(v) => setForm(prev => ({ ...prev, autoApply: v }))}
              trackColor={{ false: colors.border, true: colors.success }}
            />
          </View>
          <View style={styles.toggleRow}>
            <Text style={[styles.formLabel, { color: colors.text, marginBottom: 0 }]}>Featured</Text>
            <Switch
              value={form.isFeatured}
              onValueChange={(v) => setForm(prev => ({ ...prev, isFeatured: v }))}
              trackColor={{ false: colors.border, true: colors.warning }}
            />
          </View>

          {/* Status */}
          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.text }]}>Status</Text>
            <View style={styles.segmentControl}>
              {(['active', 'inactive'] as const).map(s => (
                <TouchableOpacity
                  key={s}
                  style={[
                    styles.segmentBtn,
                    { borderColor: colors.border },
                    form.status === s && {
                      backgroundColor: s === 'active' ? colors.success : colors.error,
                      borderColor: s === 'active' ? colors.success : colors.error,
                    },
                  ]}
                  onPress={() => setForm(prev => ({ ...prev, status: s }))}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      { color: colors.secondaryText },
                      form.status === s && { color: '#FFFFFF' },
                    ]}
                  >
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  // ============================================
  // MAIN
  // ============================================

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Page header */}
      <View style={[styles.pageHeader, { borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.pageTitle, { color: colors.text }]}>Coupons</Text>
          <Text style={[styles.pageSubtitle, { color: colors.secondaryText }]}>
            {pagination ? `${pagination.total} coupon${pagination.total !== 1 ? 's' : ''}` : 'Manage coupon codes'}
          </Text>
        </View>
        <TouchableOpacity style={[styles.createBtn, { backgroundColor: colors.tint }]} onPress={openCreateModal}>
          <Ionicons name="add" size={20} color="#FFFFFF" />
          <Text style={styles.createBtnText}>Create</Text>
        </TouchableOpacity>
      </View>

      {renderFilters()}

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
          <Text style={[styles.loadingText, { color: colors.secondaryText }]}>Loading coupons...</Text>
        </View>
      ) : (
        <FlatList
          data={coupons}
          keyExtractor={(item) => item._id}
          renderItem={renderCouponCard}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIcon, { backgroundColor: colors.backgroundSecondary }]}>
                <Ionicons name="ticket-outline" size={36} color={colors.tint} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No Coupons</Text>
              <Text style={[styles.emptySubtitle, { color: colors.secondaryText }]}>
                {searchQuery ? 'No coupons match your search.' : 'Create your first coupon to get started.'}
              </Text>
            </View>
          }
          ListFooterComponent={
            isLoadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={colors.tint} />
              </View>
            ) : null
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={colors.tint}
              colors={[colors.tint]}
            />
          }
          contentContainerStyle={[styles.listContent, coupons.length === 0 && { flexGrow: 1 }]}
        />
      )}

      {renderModal()}
    </SafeAreaView>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: { flex: 1 },
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  pageTitle: { fontSize: 22, fontWeight: '700' },
  pageSubtitle: { fontSize: 13, marginTop: 2 },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
  },
  createBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },

  // Filters
  filters: { paddingHorizontal: 16, paddingTop: 12 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
    marginBottom: 10,
  },
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 0 },
  filterChips: { flexDirection: 'row', marginBottom: 8 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  filterChipText: { fontSize: 13, fontWeight: '500' },

  // Card
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  codeContainer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  couponCode: { fontSize: 15, fontWeight: '700', letterSpacing: 0.5 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionBtn: { padding: 4 },
  cardTitle: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  cardDesc: { fontSize: 13, lineHeight: 18, marginBottom: 8 },
  cardMeta: { gap: 4, marginBottom: 8 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 12 },
  cardStats: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statChipText: { fontSize: 11, fontWeight: '500' },

  // List
  listContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 60 },

  // Loading / Empty
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 17, fontWeight: '700', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  footerLoader: { paddingVertical: 16, alignItems: 'center' },

  // Modal
  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 17, fontWeight: '700' },
  modalSave: { fontSize: 16, fontWeight: '600' },
  modalBody: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },

  // Form
  formGroup: { marginBottom: 16 },
  formLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  formInput: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  segmentControl: { flexDirection: 'row', gap: 8 },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  segmentText: { fontSize: 13, fontWeight: '600' },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 4,
  },
});
