'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, SafeAreaView, RefreshControl, useColorScheme,
  Modal, Switch, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { showAlert, showConfirm } from '../../utils/alert';
import { voucherAdminService, VoucherBrand } from '../../services/api/vouchers';
import { format } from 'date-fns';

interface VoucherFormData {
  name: string; logo: string; backgroundColor: string; logoColor: string;
  description: string; cashbackRate: string; category: string;
  denominations: string; termsAndConditions: string;
  isFeatured: boolean; isNewlyAdded: boolean; store: string;
}

const CATEGORIES = [
  'All', 'Food & Dining', 'Shopping', 'Entertainment', 'Travel',
  'Electronics', 'Fashion', 'Health & Beauty', 'Groceries', 'Other',
];
const STATUS_FILTERS = [
  { label: 'All', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
];
const FEATURED_FILTERS = [
  { label: 'All', value: undefined as boolean | undefined },
  { label: 'Featured', value: true as boolean | undefined },
  { label: 'Regular', value: false as boolean | undefined },
];
const DEFAULT_FORM: VoucherFormData = {
  name: '', logo: '', backgroundColor: Colors.light.card, logoColor: '#000000',
  description: '', cashbackRate: '0', category: 'Other', denominations: '',
  termsAndConditions: '', isFeatured: false, isNewlyAdded: false, store: '',
};
const PAGE_LIMIT = 15;

export default function VoucherManagementScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [vouchers, setVouchers] = useState<VoucherBrand[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [statusFilter, setStatusFilter] = useState('all');
  const [featuredFilter, setFeaturedFilter] = useState<boolean | undefined>(undefined);
  const [searchText, setSearchText] = useState('');
  const [searchDebounce, setSearchDebounce] = useState('');
  const [showFormModal, setShowFormModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState<VoucherBrand | null>(null);
  const [formData, setFormData] = useState<VoucherFormData>(DEFAULT_FORM);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => { setSearchDebounce(searchText); setCurrentPage(1); }, 400);
    return () => clearTimeout(timer);
  }, [searchText]);

  const loadVouchers = useCallback(async () => {
    try {
      setLoading(true);
      const filters: { page?: number; limit?: number; search?: string; status?: string; category?: string; featured?: boolean } = {
        page: currentPage, limit: PAGE_LIMIT,
      };
      if (statusFilter !== 'all') filters.status = statusFilter;
      if (selectedCategory !== 'All') filters.category = selectedCategory;
      if (featuredFilter !== undefined) filters.featured = featuredFilter;
      if (searchDebounce.trim()) filters.search = searchDebounce.trim();
      const response = await voucherAdminService.list(filters);
      setVouchers(response.vouchers || []);
      setTotalItems(response.pagination?.total || 0);
      setTotalPages(response.pagination?.totalPages || 0);
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to load vouchers');
    } finally { setLoading(false); setRefreshing(false); }
  }, [selectedCategory, statusFilter, featuredFilter, searchDebounce, currentPage]);

  useEffect(() => { loadVouchers(); }, [loadVouchers]);

  const onRefresh = useCallback(() => { setRefreshing(true); loadVouchers(); }, [loadVouchers]);

  const handleCreate = () => { setEditingVoucher(null); setFormData({ ...DEFAULT_FORM }); setShowFormModal(true); };

  const handleEdit = (v: VoucherBrand) => {
    setEditingVoucher(v);
    setFormData({
      name: v.name, logo: v.logo, backgroundColor: v.backgroundColor || colors.card,
      logoColor: v.logoColor || '#000000', description: v.description || '',
      cashbackRate: String(v.cashbackRate || 0), category: v.category || 'Other',
      denominations: (v.denominations || []).join(', '),
      termsAndConditions: (v.termsAndConditions || []).join('\n'),
      isFeatured: v.isFeatured || false, isNewlyAdded: v.isNewlyAdded || false,
      store: v.store?._id || '',
    });
    setShowFormModal(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) { showAlert('Error', 'Name is required'); return; }
    if (!formData.logo.trim()) { showAlert('Error', 'Logo URL is required'); return; }
    const cashbackNum = Number(formData.cashbackRate);
    if (isNaN(cashbackNum) || cashbackNum < 0 || cashbackNum > 100) {
      showAlert('Error', 'Cashback rate must be 0-100'); return;
    }
    const denomsArray = formData.denominations.split(',').map(d => Number(d.trim())).filter(d => !isNaN(d) && d > 0);
    if (denomsArray.length === 0) { showAlert('Error', 'At least one valid denomination is required'); return; }
    const termsArray = formData.termsAndConditions.split('\n').map(t => t.trim()).filter(t => t.length > 0);
    try {
      setIsSaving(true);
      const payload = {
        name: formData.name.trim(), logo: formData.logo.trim(),
        backgroundColor: formData.backgroundColor.trim(), logoColor: formData.logoColor.trim(),
        description: formData.description.trim(), cashbackRate: cashbackNum,
        category: formData.category, denominations: denomsArray,
        termsAndConditions: termsArray, isFeatured: formData.isFeatured,
        isNewlyAdded: formData.isNewlyAdded, store: formData.store.trim() || undefined,
      };
      if (editingVoucher) {
        const result = await voucherAdminService.update(editingVoucher._id, payload);
        if (!result) throw new Error('Failed to update voucher');
        showAlert('Success', 'Voucher updated');
      } else {
        const result = await voucherAdminService.create(payload);
        if (!result) throw new Error('Failed to create voucher');
        showAlert('Success', 'Voucher created');
      }
      setShowFormModal(false);
      loadVouchers();
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to save voucher');
    } finally { setIsSaving(false); }
  };

  const handleDelete = (v: VoucherBrand) => {
    showConfirm('Delete Voucher', `Delete "${v.name}"?`, async () => {
      try {
        const ok = await voucherAdminService.delete(v._id);
        if (!ok) throw new Error('Failed to delete');
        showAlert('Success', 'Voucher deleted');
        loadVouchers();
      } catch (error: any) { showAlert('Error', error.message || 'Failed to delete voucher'); }
    });
  };

  const handleToggleActive = async (v: VoucherBrand) => {
    try {
      setTogglingId(v._id);
      const ok = await voucherAdminService.toggleActive(v._id);
      if (!ok) throw new Error('Failed to toggle');
      setVouchers(prev => prev.map(x => x._id === v._id ? { ...x, isActive: !x.isActive } : x));
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to toggle status');
      loadVouchers();
    } finally { setTogglingId(null); }
  };

  const trunc = (t: string, n: number) => t.length <= n ? t : t.substring(0, n) + '...';

  const handlePageChange = (p: number) => {
    if (p >= 1 && p <= totalPages && p !== currentPage) setCurrentPage(p);
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;
    const pages: number[] = [];
    const max = 5;
    let start = Math.max(1, currentPage - Math.floor(max / 2));
    const end = Math.min(totalPages, start + max - 1);
    if (end - start + 1 < max) start = Math.max(1, end - max + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    return (
      <View style={s.paginationBar}>
        <Text style={[s.paginationInfo, { color: colors.secondaryText }]}>
          {totalItems} items | Page {currentPage}/{totalPages}
        </Text>
        <View style={s.paginationButtons}>
          <TouchableOpacity style={[s.pageBtn, currentPage === 1 && s.pageBtnDisabled]}
            onPress={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}>
            <Ionicons name="chevron-back" size={16} color={currentPage === 1 ? colors.gray300 : colors.info} />
          </TouchableOpacity>
          {pages.map(p => (
            <TouchableOpacity key={p} style={[s.pageBtn, p === currentPage && s.pageBtnActive]}
              onPress={() => handlePageChange(p)}>
              <Text style={[s.pageBtnText, p === currentPage && s.pageBtnTextActive]}>{p}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={[s.pageBtn, currentPage === totalPages && s.pageBtnDisabled]}
            onPress={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages}>
            <Ionicons name="chevron-forward" size={16} color={currentPage === totalPages ? colors.gray300 : colors.info} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderVoucherItem = ({ item }: { item: VoucherBrand }) => {
    const isToggling = togglingId === item._id;
    return (
      <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[s.colorStrip, { backgroundColor: item.backgroundColor || colors.info }]} />
        <View style={s.cardBody}>
          <View style={s.cardTopRow}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={[s.cardName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
              <Text style={[s.cardLogo, { color: colors.secondaryText }]} numberOfLines={1}>{trunc(item.logo, 40)}</Text>
            </View>
            <View style={s.badgeRow}>
              {item.isFeatured && (
                <View style={[s.badge, { backgroundColor: colors.warningLight }]}>
                  <Ionicons name="star" size={10} color={colors.warning} />
                  <Text style={[s.badgeText, { color: '#B45309' }]}>Featured</Text>
                </View>
              )}
              {item.isNewlyAdded && (
                <View style={[s.badge, { backgroundColor: colors.infoLighter }]}>
                  <Text style={[s.badgeText, { color: '#2563EB' }]}>New</Text>
                </View>
              )}
            </View>
          </View>
          <View style={s.statsRow}>
            <View style={[s.catBadge, { backgroundColor: colors.backgroundSecondary }]}>
              <Text style={s.catBadgeText}>{item.category}</Text>
            </View>
            <View style={s.statItem}>
              <Ionicons name="cash-outline" size={13} color={colors.success} />
              <Text style={s.statText}>{item.cashbackRate}%</Text>
            </View>
            <View style={s.statItem}>
              <Ionicons name="cart-outline" size={13} color={colors.mutedDark} />
              <Text style={s.statText}>{item.purchaseCount ?? 0}</Text>
            </View>
            <View style={s.statItem}>
              <Ionicons name="eye-outline" size={13} color={colors.mutedDark} />
              <Text style={s.statText}>{item.viewCount ?? 0}</Text>
            </View>
          </View>
          {item.denominations?.length > 0 && (
            <View style={s.denomRow}>
              {item.denominations.slice(0, 5).map((d, i) => (
                <View key={i} style={[s.denomPill, { backgroundColor: colors.background }]}>
                  <Text style={s.denomText}>{d}</Text>
                </View>
              ))}
              {item.denominations.length > 5 && <Text style={s.moreText}>+{item.denominations.length - 5}</Text>}
            </View>
          )}
          <View style={s.metaRow}>
            {item.store && (
              <View style={s.statItem}>
                <Ionicons name="storefront-outline" size={12} color={colors.mutedDark} />
                <Text style={s.metaText}>{item.store.name}</Text>
              </View>
            )}
            <Text style={s.metaText}>{format(new Date(item.createdAt), 'MMM d, yyyy')}</Text>
          </View>
          <View style={s.cardBottomRow}>
            <View style={s.toggleRow}>
              {isToggling ? <ActivityIndicator size="small" color={colors.info} /> : (
                <Switch value={item.isActive} onValueChange={() => handleToggleActive(item)}
                  trackColor={{ false: colors.border, true: colors.success }} thumbColor={colors.card} />
              )}
              <View style={[s.statusBadge, item.isActive ? s.activeBg : s.inactiveBg]}>
                <Text style={{ fontSize: 11, fontWeight: '600', color: item.isActive ? colors.successDark : colors.mutedDark }}>
                  {item.isActive ? 'Active' : 'Inactive'}
                </Text>
              </View>
            </View>
            <View style={s.cardActions}>
              <TouchableOpacity style={s.actionBtn} onPress={() => handleEdit(item)}>
                <Ionicons name="create-outline" size={18} color={colors.info} />
                <Text style={[s.actionText, { color: colors.info }]}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.actionBtn} onPress={() => handleDelete(item)}>
                <Ionicons name="trash-outline" size={18} color={colors.error} />
                <Text style={[s.actionText, { color: colors.error }]}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const inp = (key: keyof VoucherFormData, ph: string, opts?: { multi?: boolean; num?: boolean }) => (
    <TextInput
      style={[s.formInput, opts?.multi && s.multiline, { color: colors.text, borderColor: colors.border }]}
      value={String(formData[key])} onChangeText={(v) => setFormData(p => ({ ...p, [key]: v }))}
      placeholder={ph} placeholderTextColor={colors.muted}
      multiline={opts?.multi} keyboardType={opts?.num ? 'numeric' : 'default'}
    />
  );

  const renderFormModal = () => (
    <Modal visible={showFormModal} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={[s.modalContainer, { backgroundColor: colors.background }]}>
        <View style={s.modalHeader}>
          <TouchableOpacity onPress={() => setShowFormModal(false)}>
            <Ionicons name="close" size={28} color={colors.text} />
          </TouchableOpacity>
          <Text style={[s.modalTitle, { color: colors.text }]}>
            {editingVoucher ? 'Edit Voucher' : 'New Voucher'}
          </Text>
          <TouchableOpacity onPress={handleSave} disabled={isSaving}>
            {isSaving ? <ActivityIndicator size="small" color={colors.info} /> : <Text style={s.saveBtn}>Save</Text>}
          </TouchableOpacity>
        </View>
        <ScrollView style={s.formScroll} contentContainerStyle={{ paddingBottom: 40 }}>
          <Text style={s.formLabel}>Name *</Text>
          {inp('name', 'e.g. Starbucks Gift Card')}
          <Text style={s.formLabel}>Logo URL *</Text>
          {inp('logo', 'https://example.com/logo.png')}
          <View style={s.colorRow}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={s.formLabel}>Background Color</Text>
              {inp('backgroundColor', colors.card)}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.formLabel}>Logo Color</Text>
              {inp('logoColor', '#000000')}
            </View>
          </View>
          <Text style={s.formLabel}>Description</Text>
          {inp('description', 'Brief description...', { multi: true })}
          <Text style={s.formLabel}>Cashback Rate (0-100) *</Text>
          {inp('cashbackRate', '0', { num: true })}
          <Text style={s.formLabel}>Category *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 6 }}>
            {CATEGORIES.filter(c => c !== 'All').map(cat => (
              <TouchableOpacity key={cat}
                style={[s.filterChip, formData.category === cat && s.filterChipActive]}
                onPress={() => setFormData(p => ({ ...p, category: cat }))}>
                <Text style={[s.chipText, formData.category === cat && s.chipTextActive]}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <Text style={s.formLabel}>Denominations (comma-separated) *</Text>
          {inp('denominations', 'e.g. 25, 50, 100, 200, 500')}
          <Text style={s.formLabel}>Terms & Conditions (one per line)</Text>
          {inp('termsAndConditions', 'Each line becomes a separate term...', { multi: true })}
          <Text style={s.formLabel}>Store ID (optional)</Text>
          {inp('store', 'MongoDB ObjectId of linked store')}
          <View style={s.switchRow}>
            <Text style={s.formLabel}>Featured</Text>
            <Switch value={formData.isFeatured}
              onValueChange={(v) => setFormData(p => ({ ...p, isFeatured: v }))}
              trackColor={{ false: colors.border, true: colors.warning }} thumbColor={colors.card} />
          </View>
          <View style={s.switchRow}>
            <Text style={s.formLabel}>Newly Added</Text>
            <Switch value={formData.isNewlyAdded}
              onValueChange={(v) => setFormData(p => ({ ...p, isNewlyAdded: v }))}
              trackColor={{ false: colors.border, true: colors.info }} thumbColor={colors.card} />
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <View style={[s.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[s.headerTitle, { color: colors.text }]}>Voucher Management</Text>
        <TouchableOpacity style={s.createBtn} onPress={handleCreate}>
          <Ionicons name="add" size={20} color={colors.card} />
          <Text style={s.createBtnText}>Add Voucher</Text>
        </TouchableOpacity>
      </View>
      <View style={[s.searchBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={[s.searchInput, { borderColor: colors.border, backgroundColor: colors.background }]}>
          <Ionicons name="search-outline" size={18} color={colors.muted} />
          <TextInput style={[s.searchTextInput, { color: colors.text }]} value={searchText}
            onChangeText={setSearchText} placeholder="Search voucher brands..." placeholderTextColor={colors.muted} />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')}>
              <Ionicons name="close-circle" size={18} color={colors.muted} />
            </TouchableOpacity>
          )}
        </View>
      </View>
      <View style={[s.filtersBar, { backgroundColor: colors.card }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterRow}>
          {CATEGORIES.map(cat => (
            <TouchableOpacity key={cat}
              style={[s.filterChip, selectedCategory === cat && s.filterChipActive]}
              onPress={() => { setSelectedCategory(cat); setCurrentPage(1); }}>
              <Text style={[s.chipText, selectedCategory === cat && s.chipTextActive]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <View style={s.filterSubRow}>
          <Text style={{ fontSize: 12, color: colors.mutedDark, marginRight: 6 }}>Status:</Text>
          {STATUS_FILTERS.map(sf => (
            <TouchableOpacity key={sf.label}
              style={[s.activeChip, statusFilter === sf.value && s.activeChipSelected]}
              onPress={() => { setStatusFilter(sf.value); setCurrentPage(1); }}>
              <Text style={[s.activeChipText, statusFilter === sf.value && s.activeChipTextSelected]}>{sf.label}</Text>
            </TouchableOpacity>
          ))}
          <View style={{ width: 12 }} />
          <Text style={{ fontSize: 12, color: colors.mutedDark, marginRight: 6 }}>Type:</Text>
          {FEATURED_FILTERS.map(ff => (
            <TouchableOpacity key={ff.label}
              style={[s.activeChip, featuredFilter === ff.value && s.activeChipSelected]}
              onPress={() => { setFeaturedFilter(ff.value); setCurrentPage(1); }}>
              <Text style={[s.activeChipText, featuredFilter === ff.value && s.activeChipTextSelected]}>{ff.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <FlatList data={vouchers} renderItem={renderVoucherItem} keyExtractor={(item) => item._id}
        contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={loading
          ? <ActivityIndicator size="large" color={colors.info} style={{ paddingVertical: 40 }} />
          : (<View style={s.emptyBox}>
              <Ionicons name="gift-outline" size={48} color={colors.gray300} />
              <Text style={s.emptyText}>No vouchers found</Text>
              <Text style={s.emptySubtext}>Try adjusting your filters or create a new voucher</Text>
            </View>)}
        ListFooterComponent={renderPagination}
      />
      {renderFormModal()}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  headerTitle: { fontSize: 22, fontWeight: '700' },
  createBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.light.info, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, gap: 4 },
  createBtnText: { color: Colors.light.card, fontWeight: '600', fontSize: 14 },
  searchBar: { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1 },
  searchInput: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  searchTextInput: { flex: 1, fontSize: 14, padding: 0 },
  filtersBar: { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.light.gray200 },
  filterRow: { flexDirection: 'row', marginBottom: 6 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: Colors.light.backgroundSecondary, marginRight: 8 },
  filterChipActive: { backgroundColor: Colors.light.info },
  chipText: { fontSize: 12, color: Colors.light.mutedDark, fontWeight: '500' },
  chipTextActive: { color: Colors.light.card, fontWeight: '600' },
  filterSubRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, flexWrap: 'wrap' },
  activeChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: Colors.light.backgroundSecondary, marginRight: 6 },
  activeChipSelected: { backgroundColor: Colors.light.info },
  activeChipText: { fontSize: 11, color: Colors.light.mutedDark, fontWeight: '500' },
  activeChipTextSelected: { color: Colors.light.card, fontWeight: '600' },
  card: { borderRadius: 12, marginBottom: 10, borderWidth: 1, flexDirection: 'row', overflow: 'hidden' },
  colorStrip: { width: 5 },
  cardBody: { flex: 1, padding: 14 },
  cardTopRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 },
  cardName: { fontSize: 15, fontWeight: '600', lineHeight: 20 },
  cardLogo: { fontSize: 11, marginTop: 2 },
  badgeRow: { flexDirection: 'row', gap: 4, flexShrink: 0 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  badgeText: { fontSize: 10, fontWeight: '600' },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: { fontSize: 12, color: Colors.light.mutedDark, fontWeight: '500' },
  catBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  catBadgeText: { fontSize: 11, fontWeight: '600', color: Colors.light.gray700 },
  denomRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  denomPill: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  denomText: { fontSize: 11, fontWeight: '600', color: Colors.light.gray700 },
  moreText: { fontSize: 11, color: Colors.light.muted, alignSelf: 'center' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  metaText: { fontSize: 11, color: Colors.light.muted },
  cardBottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: Colors.light.backgroundSecondary, paddingTop: 10 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  activeBg: { backgroundColor: Colors.light.successLight },
  inactiveBg: { backgroundColor: Colors.light.backgroundSecondary },
  cardActions: { flexDirection: 'row', gap: 12 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingVertical: 4, paddingHorizontal: 6 },
  actionText: { fontSize: 12, fontWeight: '500' },
  paginationBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 4 },
  paginationInfo: { fontSize: 12 },
  paginationButtons: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  pageBtn: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.light.backgroundSecondary },
  pageBtnActive: { backgroundColor: Colors.light.info },
  pageBtnDisabled: { opacity: 0.4 },
  pageBtnText: { fontSize: 13, fontWeight: '500', color: Colors.light.gray700 },
  pageBtnTextActive: { color: Colors.light.card, fontWeight: '600' },
  emptyBox: { paddingVertical: 40, alignItems: 'center' },
  emptyText: { fontSize: 14, color: Colors.light.muted, marginTop: 10 },
  emptySubtext: { fontSize: 12, color: Colors.light.gray300, marginTop: 4 },
  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.light.gray200 },
  modalTitle: { fontSize: 17, fontWeight: '600' },
  saveBtn: { fontSize: 16, fontWeight: '600', color: Colors.light.info },
  formScroll: { paddingHorizontal: 20 },
  formLabel: { fontSize: 13, fontWeight: '500', color: Colors.light.mutedDark, marginTop: 10, marginBottom: 4 },
  formInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  multiline: { minHeight: 100, textAlignVertical: 'top' },
  colorRow: { flexDirection: 'row' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
});
