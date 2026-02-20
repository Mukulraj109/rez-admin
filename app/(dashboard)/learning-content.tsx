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
import { learningContentService, LearningContentAdmin } from '../../services/api/learningContent';
import { Colors } from '../../constants/Colors';
import { showAlert, showConfirm } from '../../utils/alert';

const CATEGORY_OPTIONS = [
  { value: 'coin-system', label: 'Coin System', color: '#3B82F6' },
  { value: 'earning-tips', label: 'Earning Tips', color: '#10B981' },
  { value: 'platform-guide', label: 'Platform Guide', color: '#8B5CF6' },
  { value: 'coin-types', label: 'Coin Types', color: '#F59E0B' },
] as const;

const CONTENT_TYPE_OPTIONS = [
  { value: 'article', label: 'Article', icon: 'document-text-outline' },
  { value: 'video', label: 'Video', icon: 'videocam-outline' },
] as const;

interface FormData {
  slug: string;
  title: string;
  category: string;
  contentType: string;
  body: string;
  videoUrl: string;
  thumbnailUrl: string;
  coinReward: number;
  estimatedMinutes: number;
  sortOrder: number;
  isPublished: boolean;
}

const INITIAL_FORM: FormData = {
  slug: '',
  title: '',
  category: 'coin-system',
  contentType: 'article',
  body: '',
  videoUrl: '',
  thumbnailUrl: '',
  coinReward: 10,
  estimatedMinutes: 2,
  sortOrder: 0,
  isPublished: false,
};

export default function LearningContentPage() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

  const [items, setItems] = useState<LearningContentAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [filterCategory, setFilterCategory] = useState('');
  const [filterPublished, setFilterPublished] = useState<boolean | undefined>(undefined);

  // Modal
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<LearningContentAdmin | null>(null);
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [saving, setSaving] = useState(false);

  const fetchItems = useCallback(async (pageNum = 1, isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const result = await learningContentService.getAll({
        page: pageNum,
        limit: 20,
        category: filterCategory || undefined,
        isPublished: filterPublished,
      });

      setItems(result.items || []);
      setPage(result.pagination?.page || 1);
      setTotalPages(result.pagination?.pages || 1);
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to load content');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filterCategory, filterPublished]);

  useEffect(() => {
    fetchItems(1);
  }, [fetchItems]);

  const handleRefresh = () => fetchItems(1, true);

  const openCreateModal = () => {
    setEditingItem(null);
    setForm(INITIAL_FORM);
    setModalVisible(true);
  };

  const openEditModal = async (item: LearningContentAdmin) => {
    setEditingItem(item);
    setForm({
      slug: item.slug,
      title: item.title,
      category: item.category,
      contentType: item.contentType,
      body: item.body || '',
      videoUrl: item.videoUrl || '',
      thumbnailUrl: item.thumbnailUrl || '',
      coinReward: item.coinReward,
      estimatedMinutes: item.estimatedMinutes,
      sortOrder: item.sortOrder,
      isPublished: item.isPublished,
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!form.slug.trim() || !form.title.trim()) {
      showAlert('Validation', 'Slug and title are required');
      return;
    }

    try {
      setSaving(true);
      if (editingItem) {
        await learningContentService.update(editingItem._id, form);
        showAlert('Success', 'Content updated');
      } else {
        await learningContentService.create(form);
        showAlert('Success', 'Content created');
      }
      setModalVisible(false);
      fetchItems(page);
    } catch (error: any) {
      showAlert('Error', error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublished = async (item: LearningContentAdmin) => {
    try {
      await learningContentService.togglePublished(item._id);
      fetchItems(page);
    } catch (error: any) {
      showAlert('Error', error.message);
    }
  };

  const handleDelete = async (item: LearningContentAdmin) => {
    const confirmed = await showConfirm(
      'Delete Content',
      `Delete "${item.title}"? This cannot be undone.`
    );
    if (!confirmed) return;

    try {
      await learningContentService.delete(item._id);
      showAlert('Success', 'Content deleted');
      fetchItems(page);
    } catch (error: any) {
      showAlert('Error', error.message);
    }
  };

  const getCategoryInfo = (cat: string) => {
    return CATEGORY_OPTIONS.find(c => c.value === cat) || { label: cat, color: '#6B7280' };
  };

  const renderItem = ({ item }: { item: LearningContentAdmin }) => {
    const catInfo = getCategoryInfo(item.category);

    return (
      <View style={[styles.card, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <Ionicons
              name={item.contentType === 'video' ? 'videocam' : 'document-text'}
              size={18}
              color={catInfo.color}
            />
            <Text style={[styles.cardTitle, { color: isDark ? '#F1F5F9' : '#1F2937' }]} numberOfLines={1}>
              {item.title}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => handleTogglePublished(item)}
            style={[
              styles.statusBadge,
              { backgroundColor: item.isPublished ? '#D1FAE5' : '#FEE2E2' },
            ]}
          >
            <View
              style={[
                styles.statusDot,
                { backgroundColor: item.isPublished ? '#10B981' : '#EF4444' },
              ]}
            />
            <Text
              style={[
                styles.statusText,
                { color: item.isPublished ? '#065F46' : '#991B1B' },
              ]}
            >
              {item.isPublished ? 'Published' : 'Draft'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.metaRow}>
          <View style={[styles.categoryChip, { backgroundColor: catInfo.color + '20' }]}>
            <Text style={[styles.categoryChipText, { color: catInfo.color }]}>{catInfo.label}</Text>
          </View>
          <Text style={styles.metaText}>{item.estimatedMinutes} min</Text>
          <Text style={styles.metaText}>{item.coinReward} coins</Text>
          <Text style={styles.metaText}>Order: {item.sortOrder}</Text>
        </View>

        <Text style={[styles.slugText, { color: isDark ? '#94A3B8' : '#9CA3AF' }]}>
          /{item.slug}
        </Text>

        <View style={styles.cardActions}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => openEditModal(item)}>
            <Ionicons name="create-outline" size={18} color="#3B82F6" />
            <Text style={[styles.actionText, { color: '#3B82F6' }]}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(item)}>
            <Ionicons name="trash-outline" size={18} color="#EF4444" />
            <Text style={[styles.actionText, { color: '#EF4444' }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.pageTitle, { color: isDark ? '#F1F5F9' : '#1F2937' }]}>
          Learning Content
        </Text>
        <TouchableOpacity style={styles.createButton} onPress={openCreateModal}>
          <Ionicons name="add" size={20} color="#FFFFFF" />
          <Text style={styles.createButtonText}>Create</Text>
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterChip, !filterCategory && styles.filterChipActive]}
          onPress={() => setFilterCategory('')}
        >
          <Text style={[styles.filterChipText, !filterCategory && styles.filterChipTextActive]}>
            All
          </Text>
        </TouchableOpacity>
        {CATEGORY_OPTIONS.map(cat => (
          <TouchableOpacity
            key={cat.value}
            style={[styles.filterChip, filterCategory === cat.value && styles.filterChipActive]}
            onPress={() => setFilterCategory(filterCategory === cat.value ? '' : cat.value)}
          >
            <Text
              style={[
                styles.filterChipText,
                filterCategory === cat.value && styles.filterChipTextActive,
              ]}
            >
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={[styles.filterChip, filterPublished === true && styles.filterChipActive]}
          onPress={() => setFilterPublished(filterPublished === true ? undefined : true)}
        >
          <Text
            style={[
              styles.filterChipText,
              filterPublished === true && styles.filterChipTextActive,
            ]}
          >
            Published
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterChip, filterPublished === false && styles.filterChipActive]}
          onPress={() => setFilterPublished(filterPublished === false ? undefined : false)}
        >
          <Text
            style={[
              styles.filterChipText,
              filterPublished === false && styles.filterChipTextActive,
            ]}
          >
            Drafts
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* List */}
      {loading ? (
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="book-outline" size={48} color="#9CA3AF" />
              <Text style={styles.emptyText}>No learning content found</Text>
              <TouchableOpacity style={styles.createButton} onPress={openCreateModal}>
                <Ionicons name="add" size={18} color="#FFFFFF" />
                <Text style={styles.createButtonText}>Create Content</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <View style={styles.pagination}>
          <TouchableOpacity
            disabled={page <= 1}
            onPress={() => fetchItems(page - 1)}
            style={[styles.pageBtn, page <= 1 && styles.pageBtnDisabled]}
          >
            <Ionicons name="chevron-back" size={18} color={page <= 1 ? '#9CA3AF' : '#3B82F6'} />
          </TouchableOpacity>
          <Text style={styles.pageInfo}>
            Page {page} of {totalPages}
          </Text>
          <TouchableOpacity
            disabled={page >= totalPages}
            onPress={() => fetchItems(page + 1)}
            style={[styles.pageBtn, page >= totalPages && styles.pageBtnDisabled]}
          >
            <Ionicons
              name="chevron-forward"
              size={18}
              color={page >= totalPages ? '#9CA3AF' : '#3B82F6'}
            />
          </TouchableOpacity>
        </View>
      )}

      {/* Create/Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={24} color={isDark ? '#F1F5F9' : '#1F2937'} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: isDark ? '#F1F5F9' : '#1F2937' }]}>
              {editingItem ? 'Edit Content' : 'Create Content'}
            </Text>
            <TouchableOpacity onPress={handleSave} disabled={saving}>
              {saving ? (
                <ActivityIndicator size="small" color="#3B82F6" />
              ) : (
                <Text style={styles.saveText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} contentContainerStyle={styles.modalBodyContent}>
            {/* Title */}
            <Text style={[styles.fieldLabel, { color: isDark ? '#CBD5E1' : '#374151' }]}>Title *</Text>
            <TextInput
              style={[styles.input, { color: isDark ? '#F1F5F9' : '#1F2937', backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}
              value={form.title}
              onChangeText={(v) => setForm(f => ({ ...f, title: v }))}
              placeholder="Content title"
              placeholderTextColor="#9CA3AF"
            />

            {/* Slug */}
            <Text style={[styles.fieldLabel, { color: isDark ? '#CBD5E1' : '#374151' }]}>Slug *</Text>
            <TextInput
              style={[styles.input, { color: isDark ? '#F1F5F9' : '#1F2937', backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}
              value={form.slug}
              onChangeText={(v) => setForm(f => ({ ...f, slug: v.toLowerCase().replace(/[^a-z0-9-]/g, '-') }))}
              placeholder="content-slug"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="none"
            />

            {/* Category */}
            <Text style={[styles.fieldLabel, { color: isDark ? '#CBD5E1' : '#374151' }]}>Category</Text>
            <View style={styles.chipRow}>
              {CATEGORY_OPTIONS.map(cat => (
                <TouchableOpacity
                  key={cat.value}
                  style={[
                    styles.selectChip,
                    form.category === cat.value && { backgroundColor: cat.color + '20', borderColor: cat.color },
                  ]}
                  onPress={() => setForm(f => ({ ...f, category: cat.value }))}
                >
                  <Text
                    style={[
                      styles.selectChipText,
                      form.category === cat.value && { color: cat.color },
                    ]}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Content Type */}
            <Text style={[styles.fieldLabel, { color: isDark ? '#CBD5E1' : '#374151' }]}>Content Type</Text>
            <View style={styles.chipRow}>
              {CONTENT_TYPE_OPTIONS.map(ct => (
                <TouchableOpacity
                  key={ct.value}
                  style={[
                    styles.selectChip,
                    form.contentType === ct.value && styles.selectChipActive,
                  ]}
                  onPress={() => setForm(f => ({ ...f, contentType: ct.value }))}
                >
                  <Ionicons
                    name={ct.icon as any}
                    size={16}
                    color={form.contentType === ct.value ? '#3B82F6' : '#6B7280'}
                  />
                  <Text
                    style={[
                      styles.selectChipText,
                      form.contentType === ct.value && { color: '#3B82F6' },
                    ]}
                  >
                    {ct.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Body */}
            <Text style={[styles.fieldLabel, { color: isDark ? '#CBD5E1' : '#374151' }]}>Body (Markdown)</Text>
            <TextInput
              style={[styles.textArea, { color: isDark ? '#F1F5F9' : '#1F2937', backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}
              value={form.body}
              onChangeText={(v) => setForm(f => ({ ...f, body: v }))}
              placeholder="Content body in markdown..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={8}
              textAlignVertical="top"
            />

            {/* Video URL (conditional) */}
            {form.contentType === 'video' && (
              <>
                <Text style={[styles.fieldLabel, { color: isDark ? '#CBD5E1' : '#374151' }]}>Video URL</Text>
                <TextInput
                  style={[styles.input, { color: isDark ? '#F1F5F9' : '#1F2937', backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}
                  value={form.videoUrl}
                  onChangeText={(v) => setForm(f => ({ ...f, videoUrl: v }))}
                  placeholder="https://..."
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="none"
                />
              </>
            )}

            {/* Thumbnail URL */}
            <Text style={[styles.fieldLabel, { color: isDark ? '#CBD5E1' : '#374151' }]}>Thumbnail URL</Text>
            <TextInput
              style={[styles.input, { color: isDark ? '#F1F5F9' : '#1F2937', backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}
              value={form.thumbnailUrl}
              onChangeText={(v) => setForm(f => ({ ...f, thumbnailUrl: v }))}
              placeholder="https://..."
              placeholderTextColor="#9CA3AF"
              autoCapitalize="none"
            />

            {/* Number Fields Row */}
            <View style={styles.numberRow}>
              <View style={styles.numberField}>
                <Text style={[styles.fieldLabel, { color: isDark ? '#CBD5E1' : '#374151' }]}>Coin Reward</Text>
                <TextInput
                  style={[styles.input, { color: isDark ? '#F1F5F9' : '#1F2937', backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}
                  value={String(form.coinReward)}
                  onChangeText={(v) => setForm(f => ({ ...f, coinReward: parseInt(v) || 0 }))}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.numberField}>
                <Text style={[styles.fieldLabel, { color: isDark ? '#CBD5E1' : '#374151' }]}>Est. Minutes</Text>
                <TextInput
                  style={[styles.input, { color: isDark ? '#F1F5F9' : '#1F2937', backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}
                  value={String(form.estimatedMinutes)}
                  onChangeText={(v) => setForm(f => ({ ...f, estimatedMinutes: parseInt(v) || 1 }))}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.numberField}>
                <Text style={[styles.fieldLabel, { color: isDark ? '#CBD5E1' : '#374151' }]}>Sort Order</Text>
                <TextInput
                  style={[styles.input, { color: isDark ? '#F1F5F9' : '#1F2937', backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}
                  value={String(form.sortOrder)}
                  onChangeText={(v) => setForm(f => ({ ...f, sortOrder: parseInt(v) || 0 }))}
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* Published Toggle */}
            <View style={styles.toggleRow}>
              <Text style={[styles.fieldLabel, { color: isDark ? '#CBD5E1' : '#374151', marginBottom: 0 }]}>
                Published
              </Text>
              <Switch
                value={form.isPublished}
                onValueChange={(v) => setForm(f => ({ ...f, isPublished: v }))}
                trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
                thumbColor={form.isPublished ? '#3B82F6' : '#9CA3AF'}
              />
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#3B82F6',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  filterRow: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    maxHeight: 48,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#E5E7EB',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#3B82F6',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  loadingCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    marginRight: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
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
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  categoryChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  metaText: {
    fontSize: 12,
    color: '#6B7280',
  },
  slugText: {
    fontSize: 12,
    fontFamily: 'monospace',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 8,
    marginTop: 4,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '500',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  pageBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageBtnDisabled: {
    backgroundColor: '#F3F4F6',
  },
  pageInfo: {
    fontSize: 14,
    color: '#6B7280',
  },
  // Modal
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  saveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3B82F6',
  },
  modalBody: {
    flex: 1,
  },
  modalBodyContent: {
    padding: 16,
    gap: 4,
    paddingBottom: 40,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    minHeight: 160,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  selectChipActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },
  selectChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  numberRow: {
    flexDirection: 'row',
    gap: 12,
  },
  numberField: {
    flex: 1,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 8,
  },
});
