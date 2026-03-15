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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { valueCardsService, ValueCardAdmin } from '../../services/api/valueCards';
import { Colors } from '../../constants/Colors';
import { showAlert, showConfirm } from '../../utils/alert';

// ============================================
// TYPES & CONSTANTS
// ============================================

type ActiveFilter = 'all' | 'active' | 'inactive';

interface ValueCardFormData {
  title: string;
  subtitle: string;
  emoji: string;
  deepLinkPath: string;
  sortOrder: number;
  isActive: boolean;
}

const DEFAULT_FORM: ValueCardFormData = {
  title: '',
  subtitle: '',
  emoji: '',
  deepLinkPath: '',
  sortOrder: 0,
  isActive: true,
};

// ============================================
// MAIN COMPONENT
// ============================================

export default function ValueCardsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  // List state
  const [cards, setCards] = useState<ValueCardAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Form modal
  const [showFormModal, setShowFormModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingCard, setEditingCard] = useState<ValueCardAdmin | null>(null);
  const [formData, setFormData] = useState<ValueCardFormData>(DEFAULT_FORM);

  // ==========================================
  // DATA LOADING
  // ==========================================

  const loadCards = useCallback(async (pageNum: number = 1) => {
    try {
      if (pageNum === 1) setLoading(true);
      const query: any = { page: pageNum, limit: 20 };
      if (activeFilter === 'active') query.isActive = true;
      if (activeFilter === 'inactive') query.isActive = false;
      if (searchQuery.trim()) query.search = searchQuery.trim();

      const data = await valueCardsService.getAll(query);
      setCards(data.valueCards);
      setTotalPages(data.pagination.pages);
      setPage(pageNum);
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to load value cards');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeFilter, searchQuery]);

  useEffect(() => {
    loadCards(1);
  }, [activeFilter]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadCards(1);
  }, [loadCards]);

  // ==========================================
  // ACTIONS
  // ==========================================

  const handleCreate = () => {
    setEditingCard(null);
    setFormData({ ...DEFAULT_FORM });
    setShowFormModal(true);
  };

  const handleEdit = (card: ValueCardAdmin) => {
    setEditingCard(card);
    setFormData({
      title: card.title,
      subtitle: card.subtitle || '',
      emoji: card.emoji || '',
      deepLinkPath: card.deepLinkPath || '',
      sortOrder: card.sortOrder || 0,
      isActive: card.isActive,
    });
    setShowFormModal(true);
  };

  const handleSave = async () => {
    if (!formData.title) {
      showAlert('Error', 'Title is required');
      return;
    }

    try {
      setIsSaving(true);
      if (editingCard) {
        await valueCardsService.update(editingCard._id, formData);
        showAlert('Success', 'Value card updated successfully');
      } else {
        await valueCardsService.create(formData);
        showAlert('Success', 'Value card created successfully');
      }
      setShowFormModal(false);
      loadCards(1);
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to save value card');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (card: ValueCardAdmin) => {
    showConfirm(
      'Delete Value Card',
      `Are you sure you want to delete "${card.title}"?`,
      async () => {
        try {
          await valueCardsService.remove(card._id);
          showAlert('Success', 'Value card deleted');
          loadCards(page);
        } catch (error: any) {
          showAlert('Error', error.message || 'Failed to delete');
        }
      }
    );
  };

  const handleToggleActive = async (card: ValueCardAdmin) => {
    try {
      await valueCardsService.toggleActive(card._id);
      loadCards(page);
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to toggle status');
    }
  };

  // ==========================================
  // RENDERERS
  // ==========================================

  const renderCardItem = ({ item }: { item: ValueCardAdmin }) => (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <Text style={styles.cardEmoji}>{item.emoji || '?'}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
              {item.title}
            </Text>
            {item.subtitle ? (
              <Text style={styles.cardSubtitle} numberOfLines={1}>{item.subtitle}</Text>
            ) : null}
          </View>
        </View>
        <Switch
          value={item.isActive}
          onValueChange={() => handleToggleActive(item)}
          trackColor={{ false: colors.border, true: colors.info }}
          thumbColor={colors.card}
        />
      </View>

      {/* Info Row */}
      <View style={styles.cardInfoRow}>
        {item.deepLinkPath ? (
          <View style={styles.infoChip}>
            <Ionicons name="link-outline" size={10} color={colors.gray700} />
            <Text style={[styles.infoChipText, { marginLeft: 3 }]} numberOfLines={1}>{item.deepLinkPath}</Text>
          </View>
        ) : null}
        <View style={styles.infoChip}>
          <Text style={styles.infoChipText}>Order: {item.sortOrder}</Text>
        </View>
        <View style={[styles.infoChip, { backgroundColor: item.isActive ? colors.successLight : colors.errorLight }]}>
          <Text style={[styles.infoChipText, { color: item.isActive ? colors.successDeep : colors.errorDeep }]}>
            {item.isActive ? 'Active' : 'Inactive'}
          </Text>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => handleEdit(item)}>
          <Ionicons name="create-outline" size={18} color={colors.info} />
          <Text style={[styles.actionText, { color: colors.info }]}>Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(item)}>
          <Ionicons name="trash-outline" size={18} color={colors.error} />
          <Text style={[styles.actionText, { color: colors.error }]}>Delete</Text>
        </TouchableOpacity>
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
            {editingCard ? 'Edit Value Card' : 'Create Value Card'}
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
          <Text style={styles.formSectionTitle}>Card Content</Text>

          <Text style={styles.formLabel}>Title</Text>
          <TextInput
            style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
            value={formData.title}
            onChangeText={(v) => setFormData(prev => ({ ...prev, title: v }))}
            placeholder="Save on Groceries"
            placeholderTextColor={colors.muted}
          />

          <Text style={styles.formLabel}>Subtitle</Text>
          <TextInput
            style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
            value={formData.subtitle}
            onChangeText={(v) => setFormData(prev => ({ ...prev, subtitle: v }))}
            placeholder="Up to 30% cashback on daily essentials"
            placeholderTextColor={colors.muted}
          />

          <Text style={styles.formLabel}>Emoji</Text>
          <TextInput
            style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
            value={formData.emoji}
            onChangeText={(v) => setFormData(prev => ({ ...prev, emoji: v }))}
            placeholder="e.g. a single emoji like a cart or bag"
            placeholderTextColor={colors.muted}
          />
          {formData.emoji ? (
            <Text style={styles.emojiPreview}>{formData.emoji}</Text>
          ) : null}

          {/* Navigation */}
          <Text style={styles.formSectionTitle}>Navigation</Text>

          <Text style={styles.formLabel}>Deep Link Path</Text>
          <TextInput
            style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
            value={formData.deepLinkPath}
            onChangeText={(v) => setFormData(prev => ({ ...prev, deepLinkPath: v }))}
            placeholder="/explore/category/grocery"
            placeholderTextColor={colors.muted}
          />

          {/* Settings */}
          <Text style={styles.formSectionTitle}>Settings</Text>

          <Text style={styles.formLabel}>Sort Order (lower = shown first)</Text>
          <TextInput
            style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
            value={String(formData.sortOrder || '')}
            onChangeText={(v) => setFormData(prev => ({ ...prev, sortOrder: Number(v) || 0 }))}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor={colors.muted}
          />

          <View style={styles.switchRow}>
            <Text style={styles.formLabel}>Active</Text>
            <Switch
              value={formData.isActive}
              onValueChange={(v) => setFormData(prev => ({ ...prev, isActive: v }))}
            />
          </View>

          {/* Preview */}
          <Text style={styles.formSectionTitle}>Preview</Text>
          <View style={styles.previewCard}>
            <Text style={styles.previewEmoji}>{formData.emoji || '?'}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.previewTitle} numberOfLines={1}>
                {formData.title || 'Card Title'}
              </Text>
              <Text style={styles.previewSubtitle} numberOfLines={2}>
                {formData.subtitle || 'Card subtitle will appear here'}
              </Text>
            </View>
          </View>
          <Text style={styles.previewLabel}>This is how the value card will appear to users</Text>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  // ==========================================
  // MAIN RENDER
  // ==========================================

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Value Cards</Text>
        <TouchableOpacity style={styles.createBtn} onPress={handleCreate}>
          <Ionicons name="add" size={20} color={colors.card} />
          <Text style={styles.createBtnText}>Create</Text>
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <View style={[styles.filtersBar, { backgroundColor: colors.card }]}>
        <TextInput
          style={[styles.searchInput, { color: colors.text, borderColor: colors.border }]}
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={() => loadCards(1)}
          placeholder="Search value cards..."
          placeholderTextColor={colors.muted}
          returnKeyType="search"
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChips}>
          {(['all', 'active', 'inactive'] as ActiveFilter[]).map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterChip, activeFilter === f && styles.filterChipActive]}
              onPress={() => setActiveFilter(f)}
            >
              <Text style={[styles.filterChipText, activeFilter === f && styles.filterChipTextActive]}>
                {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Content */}
      <FlatList
        data={cards}
        renderItem={renderCardItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator size="large" color={colors.info} style={{ paddingVertical: 40 }} />
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="card-outline" size={48} color={colors.gray300} />
              <Text style={styles.emptyText}>No value cards found</Text>
            </View>
          )
        }
        ListFooterComponent={
          totalPages > 1 ? (
            <View style={styles.pagination}>
              <TouchableOpacity
                style={[styles.pageBtn, page <= 1 && styles.pageBtnDisabled]}
                onPress={() => page > 1 && loadCards(page - 1)}
                disabled={page <= 1}
              >
                <Text style={styles.pageBtnText}>Previous</Text>
              </TouchableOpacity>
              <Text style={styles.pageInfo}>Page {page} of {totalPages}</Text>
              <TouchableOpacity
                style={[styles.pageBtn, page >= totalPages && styles.pageBtnDisabled]}
                onPress={() => page < totalPages && loadCards(page + 1)}
                disabled={page >= totalPages}
              >
                <Text style={styles.pageBtnText}>Next</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
      />

      {/* Modals */}
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

  // Card
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.light.gray200,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 },
  cardEmoji: { fontSize: 28 },
  cardTitle: { fontSize: 15, fontWeight: '600' },
  cardSubtitle: { fontSize: 12, color: Colors.light.mutedDark, marginTop: 1 },
  cardInfoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  infoChip: { backgroundColor: Colors.light.backgroundSecondary, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, flexDirection: 'row', alignItems: 'center' },
  infoChipText: { fontSize: 11, fontWeight: '500', color: Colors.light.gray700 },
  cardActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, borderTopWidth: 1, borderTopColor: Colors.light.backgroundSecondary, paddingTop: 10 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingVertical: 4, paddingHorizontal: 6 },
  actionText: { fontSize: 12, fontWeight: '500' },

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
  formInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },

  // Emoji preview
  emojiPreview: { fontSize: 36, marginTop: 8, textAlign: 'center' },

  // Card Preview
  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.light.gray200,
    backgroundColor: Colors.light.backgroundTertiary,
  },
  previewEmoji: { fontSize: 32 },
  previewTitle: { fontSize: 16, fontWeight: '700', color: Colors.light.navy },
  previewSubtitle: { fontSize: 13, color: Colors.light.gray600, marginTop: 2 },
  previewLabel: {
    fontSize: 11,
    color: Colors.light.muted,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
  },

  // Empty & Pagination
  emptyContainer: { paddingVertical: 40, alignItems: 'center' },
  emptyText: { fontSize: 14, color: Colors.light.muted, marginTop: 10 },
  pagination: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16 },
  pageBtn: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: Colors.light.info, borderRadius: 8 },
  pageBtnDisabled: { opacity: 0.4 },
  pageBtnText: { color: Colors.light.card, fontWeight: '500', fontSize: 13 },
  pageInfo: { fontSize: 13, color: Colors.light.mutedDark },
});
