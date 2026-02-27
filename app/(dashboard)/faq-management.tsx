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
import { faqAdminService, FAQItem } from '../../services/api/faq';

// ============================================
// TYPES & CONSTANTS
// ============================================
interface FAQFormData {
  question: string;
  answer: string;
  category: string;
  subcategory: string;
  tags: string;
  order: string;
  imageUrl: string;
  isActive: boolean;
}

const FAQ_CATEGORIES = [
  'All', 'Account', 'Orders', 'Payments', 'Delivery', 'Returns',
  'Coins & Rewards', 'Wallet', 'Promotions', 'Technical', 'General',
];

const CAT_COLORS: Record<string, string> = {
  Account: '#3B82F6',
  Orders: '#F97316',
  Payments: '#10B981',
  Delivery: '#8B5CF6',
  Returns: '#EF4444',
  'Coins & Rewards': '#F59E0B',
  Wallet: '#06B6D4',
  Promotions: '#EC4899',
  Technical: '#6366F1',
  General: '#6B7280',
};

const ACTIVE_FILTERS = [
  { label: 'All', value: undefined as boolean | undefined },
  { label: 'Active', value: true as boolean | undefined },
  { label: 'Inactive', value: false as boolean | undefined },
];

const DEFAULT_FORM: FAQFormData = {
  question: '',
  answer: '',
  category: 'General',
  subcategory: '',
  tags: '',
  order: '0',
  imageUrl: '',
  isActive: true,
};

const PAGE_LIMIT = 15;

// ============================================
// MAIN COMPONENT
// ============================================
export default function FAQManagementScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  // Data state
  const [faqs, setFaqs] = useState<FAQItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  // Filter state
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [activeFilter, setActiveFilter] = useState<boolean | undefined>(undefined);
  const [searchText, setSearchText] = useState('');
  const [searchDebounce, setSearchDebounce] = useState('');

  // Modal state
  const [showFormModal, setShowFormModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FAQItem | null>(null);
  const [formData, setFormData] = useState<FAQFormData>(DEFAULT_FORM);

  // Toggling state (track which ID is being toggled)
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // ============================================
  // SEARCH DEBOUNCE
  // ============================================
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchDebounce(searchText);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchText]);

  // ============================================
  // DATA LOADING
  // ============================================
  const loadFaqs = useCallback(async () => {
    try {
      setLoading(true);
      const filters: {
        page?: number;
        limit?: number;
        category?: string;
        isActive?: boolean;
        search?: string;
      } = {
        page: currentPage,
        limit: PAGE_LIMIT,
      };
      if (selectedCategory !== 'All') filters.category = selectedCategory;
      if (activeFilter !== undefined) filters.isActive = activeFilter;
      if (searchDebounce.trim()) filters.search = searchDebounce.trim();

      const response = await faqAdminService.list(filters);
      setFaqs(response.faqs || []);
      setTotalItems(response.total || 0);
      setTotalPages(response.pages || 0);
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to load FAQs');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedCategory, activeFilter, searchDebounce, currentPage]);

  useEffect(() => { loadFaqs(); }, [loadFaqs]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadFaqs();
  }, [loadFaqs]);

  // ============================================
  // ACTIONS
  // ============================================
  const handleCreate = () => {
    setEditingFaq(null);
    setFormData({ ...DEFAULT_FORM });
    setShowFormModal(true);
  };

  const handleEdit = (faq: FAQItem) => {
    setEditingFaq(faq);
    setFormData({
      question: faq.question,
      answer: faq.answer,
      category: faq.category || 'General',
      subcategory: faq.subcategory || '',
      tags: (faq.tags || []).join(', '),
      order: String(faq.order || 0),
      imageUrl: faq.imageUrl || '',
      isActive: faq.isActive,
    });
    setShowFormModal(true);
  };

  const handleSave = async () => {
    if (!formData.question.trim()) { showAlert('Error', 'Question is required'); return; }
    if (!formData.answer.trim()) { showAlert('Error', 'Answer is required'); return; }
    if (!formData.category.trim()) { showAlert('Error', 'Category is required'); return; }
    try {
      setIsSaving(true);
      const tagsArray = formData.tags
        .split(',')
        .map(t => t.trim().toLowerCase())
        .filter(t => t.length > 0);
      const payload = {
        question: formData.question.trim(),
        answer: formData.answer.trim(),
        category: formData.category,
        subcategory: formData.subcategory.trim() || undefined,
        tags: tagsArray.length > 0 ? tagsArray : undefined,
        order: Number(formData.order) || 0,
        isActive: formData.isActive,
        imageUrl: formData.imageUrl.trim() || undefined,
      };
      if (editingFaq) {
        const result = await faqAdminService.update(editingFaq._id, payload);
        if (!result) throw new Error('Failed to update FAQ');
        showAlert('Success', 'FAQ updated successfully');
      } else {
        const result = await faqAdminService.create(payload);
        if (!result) throw new Error('Failed to create FAQ');
        showAlert('Success', 'FAQ created successfully');
      }
      setShowFormModal(false);
      loadFaqs();
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to save FAQ');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (faq: FAQItem) => {
    showConfirm(
      'Delete FAQ',
      `Are you sure you want to delete "${faq.question.substring(0, 60)}..."?`,
      async () => {
        try {
          const success = await faqAdminService.delete(faq._id);
          if (!success) throw new Error('Failed to delete FAQ');
          showAlert('Success', 'FAQ deleted');
          loadFaqs();
        } catch (error: any) {
          showAlert('Error', error.message || 'Failed to delete FAQ');
        }
      },
    );
  };

  const handleToggleActive = async (faq: FAQItem) => {
    try {
      setTogglingId(faq._id);
      const success = await faqAdminService.toggleActive(faq._id);
      if (!success) throw new Error('Failed to toggle status');
      // Optimistic update
      setFaqs(prev => prev.map(f =>
        f._id === faq._id ? { ...f, isActive: !f.isActive } : f
      ));
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to toggle active status');
      loadFaqs(); // Revert on failure
    } finally {
      setTogglingId(null);
    }
  };

  // ============================================
  // HELPERS
  // ============================================
  const getHelpfulPercent = (faq: FAQItem): string => {
    const helpful = faq.helpfulCount || 0;
    const notHelpful = faq.notHelpfulCount || 0;
    const total = helpful + notHelpful;
    if (total === 0) return '-';
    return `${Math.round((helpful / total) * 100)}%`;
  };

  const truncateText = (text: string, maxLen: number): string => {
    if (text.length <= maxLen) return text;
    return text.substring(0, maxLen) + '...';
  };

  // ============================================
  // PAGINATION
  // ============================================
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      setCurrentPage(page);
    }
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    const end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }
    for (let i = start; i <= end; i++) pages.push(i);

    return (
      <View style={styles.paginationBar}>
        <Text style={[styles.paginationInfo, { color: colors.secondaryText }]}>
          {totalItems} items | Page {currentPage} of {totalPages}
        </Text>
        <View style={styles.paginationButtons}>
          <TouchableOpacity
            style={[styles.pageBtn, currentPage === 1 && styles.pageBtnDisabled]}
            onPress={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <Ionicons name="chevron-back" size={16} color={currentPage === 1 ? '#D1D5DB' : '#3B82F6'} />
          </TouchableOpacity>
          {pages.map(p => (
            <TouchableOpacity
              key={p}
              style={[styles.pageBtn, p === currentPage && styles.pageBtnActive]}
              onPress={() => handlePageChange(p)}
            >
              <Text style={[styles.pageBtnText, p === currentPage && styles.pageBtnTextActive]}>
                {p}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[styles.pageBtn, currentPage === totalPages && styles.pageBtnDisabled]}
            onPress={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            <Ionicons name="chevron-forward" size={16} color={currentPage === totalPages ? '#D1D5DB' : '#3B82F6'} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ============================================
  // RENDER FAQ ROW
  // ============================================
  const renderFaqItem = ({ item }: { item: FAQItem }) => {
    const catColor = CAT_COLORS[item.category] || '#6B7280';
    const helpfulPct = getHelpfulPercent(item);
    const isToggling = togglingId === item._id;

    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.colorStrip, { backgroundColor: catColor }]} />
        <View style={styles.cardBody}>
          {/* Top: Question + Category Badge */}
          <View style={styles.cardTopRow}>
            <Text style={[styles.cardQuestion, { color: colors.text }]} numberOfLines={2}>
              {truncateText(item.question, 80)}
            </Text>
            <View style={[styles.catBadge, { backgroundColor: `${catColor}18` }]}>
              <Text style={[styles.catBadgeText, { color: catColor }]}>{item.category}</Text>
            </View>
          </View>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="eye-outline" size={13} color="#6B7280" />
              <Text style={styles.statText}>{item.views ?? 0} views</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="thumbs-up-outline" size={13} color="#10B981" />
              <Text style={styles.statText}>{helpfulPct} helpful</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="swap-vertical-outline" size={13} color="#6B7280" />
              <Text style={styles.statText}>Order: {item.order ?? 0}</Text>
            </View>
          </View>

          {/* Tags row */}
          {item.tags && item.tags.length > 0 && (
            <View style={styles.tagsRow}>
              {item.tags.slice(0, 4).map((tag, i) => (
                <View key={i} style={[styles.tagPill, { backgroundColor: colors.background }]}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
              {item.tags.length > 4 && (
                <Text style={styles.moreText}>+{item.tags.length - 4}</Text>
              )}
            </View>
          )}

          {/* Bottom: Active Toggle + Actions */}
          <View style={styles.cardBottomRow}>
            <View style={styles.toggleRow}>
              {isToggling ? (
                <ActivityIndicator size="small" color="#3B82F6" />
              ) : (
                <Switch
                  value={item.isActive}
                  onValueChange={() => handleToggleActive(item)}
                  trackColor={{ false: '#E2E8F0', true: '#10B981' }}
                  thumbColor="#FFFFFF"
                />
              )}
              <View style={[styles.statusBadge, item.isActive ? styles.activeBg : styles.inactiveBg]}>
                <Text style={{ fontSize: 11, fontWeight: '600', color: item.isActive ? '#059669' : '#6B7280' }}>
                  {item.isActive ? 'Active' : 'Inactive'}
                </Text>
              </View>
            </View>
            <View style={styles.cardActions}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => handleEdit(item)}>
                <Ionicons name="create-outline" size={18} color="#3B82F6" />
                <Text style={[styles.actionText, { color: '#3B82F6' }]}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(item)}>
                <Ionicons name="trash-outline" size={18} color="#EF4444" />
                <Text style={[styles.actionText, { color: '#EF4444' }]}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  };

  // ============================================
  // FORM HELPERS
  // ============================================
  const inp = (key: keyof FAQFormData, ph: string, opts?: { multi?: boolean; num?: boolean }) => (
    <TextInput
      style={[styles.formInput, opts?.multi && styles.multiline, { color: colors.text, borderColor: colors.border }]}
      value={String(formData[key])}
      onChangeText={(v) => setFormData(p => ({ ...p, [key]: v }))}
      placeholder={ph} placeholderTextColor="#9CA3AF"
      multiline={opts?.multi} keyboardType={opts?.num ? 'numeric' : 'default'}
    />
  );

  // ============================================
  // FORM MODAL
  // ============================================
  const renderFormModal = () => (
    <Modal visible={showFormModal} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowFormModal(false)}>
            <Ionicons name="close" size={28} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: colors.text }]}>
            {editingFaq ? 'Edit FAQ' : 'New FAQ'}
          </Text>
          <TouchableOpacity onPress={handleSave} disabled={isSaving}>
            {isSaving ? <ActivityIndicator size="small" color="#3B82F6" /> : <Text style={styles.saveBtn}>Save</Text>}
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.formScroll} contentContainerStyle={{ paddingBottom: 40 }}>
          <Text style={styles.formLabel}>Question *</Text>
          {inp('question', 'e.g. How do I reset my password?')}

          <Text style={styles.formLabel}>Answer *</Text>
          {inp('answer', 'Enter the detailed answer...', { multi: true })}

          <Text style={styles.formLabel}>Category *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 6 }}>
            {FAQ_CATEGORIES.filter(c => c !== 'All').map(cat => (
              <TouchableOpacity
                key={cat}
                style={[styles.filterChip, formData.category === cat && styles.filterChipActive]}
                onPress={() => setFormData(p => ({ ...p, category: cat }))}
              >
                <Text style={[styles.chipText, formData.category === cat && styles.chipTextActive]}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.formLabel}>Subcategory</Text>
          {inp('subcategory', 'e.g. Password Issues')}

          <Text style={styles.formLabel}>Tags (comma-separated)</Text>
          {inp('tags', 'e.g. password, login, reset')}

          <Text style={styles.formLabel}>Order</Text>
          {inp('order', '0', { num: true })}

          <Text style={styles.formLabel}>Image URL</Text>
          {inp('imageUrl', 'https://...')}

          <View style={styles.switchRow}>
            <Text style={styles.formLabel}>Active</Text>
            <Switch
              value={formData.isActive}
              onValueChange={(v) => setFormData(p => ({ ...p, isActive: v }))}
              trackColor={{ false: '#E2E8F0', true: '#3B82F6' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  // ============================================
  // MAIN RENDER
  // ============================================
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>FAQ Management</Text>
        <TouchableOpacity style={styles.createBtn} onPress={handleCreate}>
          <Ionicons name="add" size={20} color="#FFFFFF" />
          <Text style={styles.createBtnText}>Add FAQ</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={[styles.searchBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={[styles.searchInput, { borderColor: colors.border, backgroundColor: colors.background }]}>
          <Ionicons name="search-outline" size={18} color="#9CA3AF" />
          <TextInput
            style={[styles.searchTextInput, { color: colors.text }]}
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Search questions, answers, tags..."
            placeholderTextColor="#9CA3AF"
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')}>
              <Ionicons name="close-circle" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Category Filters */}
      <View style={[styles.filtersBar, { backgroundColor: colors.card }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          {FAQ_CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat}
              style={[styles.filterChip, selectedCategory === cat && styles.filterChipActive]}
              onPress={() => { setSelectedCategory(cat); setCurrentPage(1); }}
            >
              <Text style={[styles.chipText, selectedCategory === cat && styles.chipTextActive]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <View style={styles.activeFilterRow}>
          <Text style={{ fontSize: 12, color: '#6B7280', marginRight: 6 }}>Status:</Text>
          {ACTIVE_FILTERS.map(af => (
            <TouchableOpacity
              key={af.label}
              style={[styles.activeChip, activeFilter === af.value && styles.activeChipSelected]}
              onPress={() => { setActiveFilter(af.value); setCurrentPage(1); }}
            >
              <Text style={[
                styles.activeChipText,
                activeFilter === af.value && styles.activeChipTextSelected,
              ]}>
                {af.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* FAQ List */}
      <FlatList
        data={faqs}
        renderItem={renderFaqItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          loading
            ? <ActivityIndicator size="large" color="#3B82F6" style={{ paddingVertical: 40 }} />
            : (
              <View style={styles.emptyBox}>
                <Ionicons name="help-circle-outline" size={48} color="#D1D5DB" />
                <Text style={styles.emptyText}>No FAQs found</Text>
                <Text style={styles.emptySubtext}>Try adjusting your filters or create a new FAQ</Text>
              </View>
            )
        }
        ListFooterComponent={renderPagination}
      />

      {renderFormModal()}
    </View>
  );
}

// ============================================
// STYLES
// ============================================
const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 22, fontWeight: '700' },
  createBtn: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#3B82F6',
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, gap: 4,
  },
  createBtnText: { color: '#FFF', fontWeight: '600', fontSize: 14 },

  // Search
  searchBar: {
    paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1,
  },
  searchInput: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1,
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, gap: 8,
  },
  searchTextInput: { flex: 1, fontSize: 14, padding: 0 },

  // Filters
  filtersBar: {
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
  },
  filterRow: { flexDirection: 'row', marginBottom: 6 },
  filterChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
    backgroundColor: '#F3F4F6', marginRight: 8,
  },
  filterChipActive: { backgroundColor: '#3B82F6' },
  chipText: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
  chipTextActive: { color: '#FFF', fontWeight: '600' },
  activeFilterRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  activeChip: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
    backgroundColor: '#F3F4F6', marginRight: 6,
  },
  activeChipSelected: { backgroundColor: '#3B82F6' },
  activeChipText: { fontSize: 11, color: '#6B7280', fontWeight: '500' },
  activeChipTextSelected: { color: '#FFF', fontWeight: '600' },

  // Card
  card: {
    borderRadius: 12, marginBottom: 10, borderWidth: 1,
    flexDirection: 'row', overflow: 'hidden',
  },
  colorStrip: { width: 5 },
  cardBody: { flex: 1, padding: 14 },
  cardTopRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    justifyContent: 'space-between', marginBottom: 8,
  },
  cardQuestion: { fontSize: 14, fontWeight: '600', flex: 1, marginRight: 8, lineHeight: 20 },
  catBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  catBadgeText: { fontSize: 11, fontWeight: '600' },

  // Stats
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 8 },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: { fontSize: 12, color: '#6B7280', fontWeight: '500' },

  // Tags
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  tagPill: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  tagText: { fontSize: 11, fontWeight: '600', color: '#374151' },
  moreText: { fontSize: 11, color: '#9CA3AF', alignSelf: 'center' },

  // Bottom row
  cardBottomRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 10,
  },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  activeBg: { backgroundColor: '#D1FAE5' },
  inactiveBg: { backgroundColor: '#F3F4F6' },
  cardActions: { flexDirection: 'row', gap: 12 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingVertical: 4, paddingHorizontal: 6,
  },
  actionText: { fontSize: 12, fontWeight: '500' },

  // Pagination
  paginationBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 16, paddingHorizontal: 4,
  },
  paginationInfo: { fontSize: 12 },
  paginationButtons: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  pageBtn: {
    width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  pageBtnActive: { backgroundColor: '#3B82F6' },
  pageBtnDisabled: { opacity: 0.4 },
  pageBtnText: { fontSize: 13, fontWeight: '500', color: '#374151' },
  pageBtnTextActive: { color: '#FFFFFF', fontWeight: '600' },

  // Empty
  emptyBox: { paddingVertical: 40, alignItems: 'center' },
  emptyText: { fontSize: 14, color: '#9CA3AF', marginTop: 10 },
  emptySubtext: { fontSize: 12, color: '#D1D5DB', marginTop: 4 },

  // Modal / Form
  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
  },
  modalTitle: { fontSize: 17, fontWeight: '600' },
  saveBtn: { fontSize: 16, fontWeight: '600', color: '#3B82F6' },
  formScroll: { paddingHorizontal: 20 },
  formLabel: { fontSize: 13, fontWeight: '500', color: '#6B7280', marginTop: 10, marginBottom: 4 },
  formInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  multiline: { minHeight: 100, textAlignVertical: 'top' },
  switchRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10,
  },
});
