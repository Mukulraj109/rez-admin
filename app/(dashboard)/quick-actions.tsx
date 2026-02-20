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
import { quickActionsService, QuickActionAdmin } from '../../services/api/quickActions';
import { Colors } from '../../constants/Colors';
import { showAlert, showConfirm } from '../../utils/alert';

// ============================================
// TYPES & CONSTANTS
// ============================================

type ActiveFilter = 'all' | 'active' | 'inactive';

interface QuickActionFormData {
  slug: string;
  title: string;
  subtitle: string;
  icon: string;
  iconColor: string;
  deepLinkPath: string;
  targetAchievementTypes: string[];
  priority: number;
  isActive: boolean;
}

const DEFAULT_FORM: QuickActionFormData = {
  slug: '',
  title: '',
  subtitle: '',
  icon: 'flash',
  iconColor: '#3B82F6',
  deepLinkPath: '',
  targetAchievementTypes: [],
  priority: 0,
  isActive: true,
};

const COMMON_ICONS = [
  'flash', 'star', 'heart', 'gift', 'trophy', 'ribbon',
  'rocket', 'flame', 'sparkles', 'diamond', 'medal',
  'cash', 'wallet', 'cart', 'bag-handle', 'storefront',
  'camera', 'videocam', 'share-social', 'people', 'person-add',
  'compass', 'navigate', 'map', 'location', 'search',
  'checkmark-circle', 'shield-checkmark', 'flag', 'bookmark',
];

// ============================================
// MAIN COMPONENT
// ============================================

export default function QuickActionsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  // List state
  const [actions, setActions] = useState<QuickActionAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Form modal
  const [showFormModal, setShowFormModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingAction, setEditingAction] = useState<QuickActionAdmin | null>(null);
  const [formData, setFormData] = useState<QuickActionFormData>(DEFAULT_FORM);
  const [achievementTypesInput, setAchievementTypesInput] = useState('');

  // ==========================================
  // DATA LOADING
  // ==========================================

  const loadActions = useCallback(async (pageNum: number = 1) => {
    try {
      if (pageNum === 1) setLoading(true);
      const query: any = { page: pageNum, limit: 20 };
      if (activeFilter === 'active') query.isActive = true;
      if (activeFilter === 'inactive') query.isActive = false;
      if (searchQuery.trim()) query.search = searchQuery.trim();

      const data = await quickActionsService.getAll(query);
      setActions(data.quickActions);
      setTotalPages(data.pagination.pages);
      setPage(pageNum);
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to load quick actions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeFilter, searchQuery]);

  useEffect(() => {
    loadActions(1);
  }, [activeFilter]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadActions(1);
  }, [loadActions]);

  // ==========================================
  // ACTIONS
  // ==========================================

  const handleCreate = () => {
    setEditingAction(null);
    setFormData({ ...DEFAULT_FORM });
    setAchievementTypesInput('');
    setShowFormModal(true);
  };

  const handleEdit = (action: QuickActionAdmin) => {
    setEditingAction(action);
    setFormData({
      slug: action.slug,
      title: action.title,
      subtitle: action.subtitle || '',
      icon: action.icon,
      iconColor: action.iconColor || '#3B82F6',
      deepLinkPath: action.deepLinkPath,
      targetAchievementTypes: action.targetAchievementTypes || [],
      priority: action.priority,
      isActive: action.isActive,
    });
    setAchievementTypesInput((action.targetAchievementTypes || []).join(', '));
    setShowFormModal(true);
  };

  const handleSave = async () => {
    if (!formData.slug || !formData.title) {
      showAlert('Error', 'Slug and title are required');
      return;
    }
    if (!formData.deepLinkPath) {
      showAlert('Error', 'Deep link path is required');
      return;
    }

    try {
      setIsSaving(true);
      const payload = {
        ...formData,
        targetAchievementTypes: achievementTypesInput
          ? achievementTypesInput.split(',').map(s => s.trim()).filter(Boolean)
          : [],
      };

      if (editingAction) {
        await quickActionsService.update(editingAction._id, payload);
        showAlert('Success', 'Quick action updated successfully');
      } else {
        await quickActionsService.create(payload);
        showAlert('Success', 'Quick action created successfully');
      }
      setShowFormModal(false);
      loadActions(1);
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to save quick action');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (action: QuickActionAdmin) => {
    showConfirm(
      'Delete Quick Action',
      `Are you sure you want to delete "${action.title}"?`,
      async () => {
        try {
          await quickActionsService.remove(action._id);
          showAlert('Success', 'Quick action deleted');
          loadActions(page);
        } catch (error: any) {
          showAlert('Error', error.message || 'Failed to delete');
        }
      }
    );
  };

  const handleToggleActive = async (action: QuickActionAdmin) => {
    try {
      await quickActionsService.toggleActive(action._id);
      loadActions(page);
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to toggle status');
    }
  };

  const handleMoveUp = async (action: QuickActionAdmin) => {
    const idx = actions.findIndex(a => a._id === action._id);
    if (idx <= 0) return;

    const newOrder = [...actions];
    [newOrder[idx - 1], newOrder[idx]] = [newOrder[idx], newOrder[idx - 1]];
    const orderedIds = newOrder.map(a => a._id);

    try {
      await quickActionsService.reorder(orderedIds);
      loadActions(page);
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to reorder');
    }
  };

  const handleMoveDown = async (action: QuickActionAdmin) => {
    const idx = actions.findIndex(a => a._id === action._id);
    if (idx >= actions.length - 1) return;

    const newOrder = [...actions];
    [newOrder[idx], newOrder[idx + 1]] = [newOrder[idx + 1], newOrder[idx]];
    const orderedIds = newOrder.map(a => a._id);

    try {
      await quickActionsService.reorder(orderedIds);
      loadActions(page);
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to reorder');
    }
  };

  // ==========================================
  // RENDERERS
  // ==========================================

  const renderActionCard = ({ item, index }: { item: QuickActionAdmin; index: number }) => (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <View style={[styles.iconCircle, { backgroundColor: `${item.iconColor || '#3B82F6'}20` }]}>
            <Ionicons name={(item.icon as any) || 'flash'} size={20} color={item.iconColor || '#3B82F6'} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.cardSlug}>{item.slug}</Text>
          </View>
        </View>
        <Switch
          value={item.isActive}
          onValueChange={() => handleToggleActive(item)}
          trackColor={{ false: '#E2E8F0', true: '#3B82F6' }}
          thumbColor="#FFFFFF"
        />
      </View>

      {/* Info */}
      {item.subtitle ? (
        <Text style={styles.subtitleText} numberOfLines={1}>{item.subtitle}</Text>
      ) : null}

      <View style={styles.cardInfoRow}>
        <View style={styles.infoChip}>
          <Text style={styles.infoChipText}>Priority: {item.priority}</Text>
        </View>
        <View style={styles.infoChip}>
          <Ionicons name="link-outline" size={10} color="#374151" />
          <Text style={[styles.infoChipText, { marginLeft: 3 }]} numberOfLines={1}>{item.deepLinkPath}</Text>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => handleEdit(item)}>
          <Ionicons name="create-outline" size={18} color="#3B82F6" />
          <Text style={[styles.actionText, { color: '#3B82F6' }]}>Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, index === 0 && { opacity: 0.3 }]}
          onPress={() => handleMoveUp(item)}
          disabled={index === 0}
        >
          <Ionicons name="arrow-up-outline" size={18} color="#6B7280" />
          <Text style={[styles.actionText, { color: '#6B7280' }]}>Up</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, index === actions.length - 1 && { opacity: 0.3 }]}
          onPress={() => handleMoveDown(item)}
          disabled={index === actions.length - 1}
        >
          <Ionicons name="arrow-down-outline" size={18} color="#6B7280" />
          <Text style={[styles.actionText, { color: '#6B7280' }]}>Down</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(item)}>
          <Ionicons name="trash-outline" size={18} color="#EF4444" />
          <Text style={[styles.actionText, { color: '#EF4444' }]}>Del</Text>
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
            {editingAction ? 'Edit Quick Action' : 'Create Quick Action'}
          </Text>
          <TouchableOpacity onPress={handleSave} disabled={isSaving}>
            {isSaving ? (
              <ActivityIndicator size="small" color="#3B82F6" />
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
            value={formData.slug}
            onChangeText={(v) => setFormData(prev => ({ ...prev, slug: v.toLowerCase().replace(/[^a-z0-9-]/g, '-') }))}
            placeholder="earn-coins"
            placeholderTextColor="#9CA3AF"
            editable={!editingAction}
          />

          <Text style={styles.formLabel}>Title</Text>
          <TextInput
            style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
            value={formData.title}
            onChangeText={(v) => setFormData(prev => ({ ...prev, title: v }))}
            placeholder="Earn Coins"
            placeholderTextColor="#9CA3AF"
          />

          <Text style={styles.formLabel}>Subtitle</Text>
          <TextInput
            style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
            value={formData.subtitle}
            onChangeText={(v) => setFormData(prev => ({ ...prev, subtitle: v }))}
            placeholder="Quick ways to earn rewards"
            placeholderTextColor="#9CA3AF"
          />

          {/* Icon */}
          <Text style={styles.formSectionTitle}>Icon</Text>

          <Text style={styles.formLabel}>Icon Name (Ionicons)</Text>
          <TextInput
            style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
            value={formData.icon}
            onChangeText={(v) => setFormData(prev => ({ ...prev, icon: v }))}
            placeholder="flash"
            placeholderTextColor="#9CA3AF"
          />

          <Text style={styles.formLabel}>Common Icons</Text>
          <View style={styles.iconGrid}>
            {COMMON_ICONS.map((iconName) => (
              <TouchableOpacity
                key={iconName}
                style={[
                  styles.iconOption,
                  formData.icon === iconName && styles.iconOptionSelected,
                ]}
                onPress={() => setFormData(prev => ({ ...prev, icon: iconName }))}
              >
                <Ionicons name={iconName as any} size={20} color={formData.icon === iconName ? '#FFF' : '#6B7280'} />
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.formLabel}>Icon Color</Text>
          <TextInput
            style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
            value={formData.iconColor}
            onChangeText={(v) => setFormData(prev => ({ ...prev, iconColor: v }))}
            placeholder="#3B82F6"
            placeholderTextColor="#9CA3AF"
          />
          {formData.iconColor ? (
            <View style={styles.iconPreviewRow}>
              <View style={[styles.colorPreview, { backgroundColor: formData.iconColor }]} />
              <View style={[styles.iconPreviewCircle, { backgroundColor: `${formData.iconColor}20` }]}>
                <Ionicons name={(formData.icon as any) || 'flash'} size={24} color={formData.iconColor} />
              </View>
            </View>
          ) : null}

          {/* Navigation */}
          <Text style={styles.formSectionTitle}>Navigation</Text>

          <Text style={styles.formLabel}>Deep Link Path</Text>
          <TextInput
            style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
            value={formData.deepLinkPath}
            onChangeText={(v) => setFormData(prev => ({ ...prev, deepLinkPath: v }))}
            placeholder="/earn-coins"
            placeholderTextColor="#9CA3AF"
          />

          <Text style={styles.formLabel}>Target Achievement Types (comma-separated)</Text>
          <TextInput
            style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
            value={achievementTypesInput}
            onChangeText={setAchievementTypesInput}
            placeholder="daily_login, review_post, share_social"
            placeholderTextColor="#9CA3AF"
          />

          {/* Settings */}
          <Text style={styles.formSectionTitle}>Settings</Text>

          <Text style={styles.formLabel}>Priority (lower = shown first)</Text>
          <TextInput
            style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
            value={String(formData.priority || '')}
            onChangeText={(v) => setFormData(prev => ({ ...prev, priority: Number(v) || 0 }))}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor="#9CA3AF"
          />

          <View style={styles.switchRow}>
            <Text style={styles.formLabel}>Active</Text>
            <Switch
              value={formData.isActive}
              onValueChange={(v) => setFormData(prev => ({ ...prev, isActive: v }))}
            />
          </View>
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
        <Text style={[styles.headerTitle, { color: colors.text }]}>Quick Actions</Text>
        <TouchableOpacity style={styles.createBtn} onPress={handleCreate}>
          <Ionicons name="add" size={20} color="#FFFFFF" />
          <Text style={styles.createBtnText}>Create</Text>
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <View style={[styles.filtersBar, { backgroundColor: colors.card }]}>
        <TextInput
          style={[styles.searchInput, { color: colors.text, borderColor: colors.border }]}
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={() => loadActions(1)}
          placeholder="Search quick actions..."
          placeholderTextColor="#9CA3AF"
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
        data={actions}
        renderItem={renderActionCard}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator size="large" color="#3B82F6" style={{ paddingVertical: 40 }} />
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="flash-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyText}>No quick actions found</Text>
            </View>
          )
        }
        ListFooterComponent={
          totalPages > 1 ? (
            <View style={styles.pagination}>
              <TouchableOpacity
                style={[styles.pageBtn, page <= 1 && styles.pageBtnDisabled]}
                onPress={() => page > 1 && loadActions(page - 1)}
                disabled={page <= 1}
              >
                <Text style={styles.pageBtnText}>Previous</Text>
              </TouchableOpacity>
              <Text style={styles.pageInfo}>Page {page} of {totalPages}</Text>
              <TouchableOpacity
                style={[styles.pageBtn, page >= totalPages && styles.pageBtnDisabled]}
                onPress={() => page < totalPages && loadActions(page + 1)}
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
    backgroundColor: '#3B82F6',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  createBtnText: { color: '#FFF', fontWeight: '600', fontSize: 14 },

  // Filters
  filtersBar: { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
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
    backgroundColor: '#F3F4F6',
    marginRight: 8,
  },
  filterChipActive: { backgroundColor: '#3B82F6' },
  filterChipText: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
  filterChipTextActive: { color: '#FFF', fontWeight: '600' },

  // Card
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 },
  iconCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '600' },
  cardSlug: { fontSize: 11, color: '#9CA3AF', marginTop: 1 },
  subtitleText: { fontSize: 12, color: '#6B7280', marginBottom: 8 },
  cardInfoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  infoChip: { backgroundColor: '#F3F4F6', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, flexDirection: 'row', alignItems: 'center' },
  infoChipText: { fontSize: 11, fontWeight: '500', color: '#374151' },
  cardActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 10 },
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
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: { fontSize: 17, fontWeight: '600' },
  saveBtn: { fontSize: 16, fontWeight: '600', color: '#3B82F6' },
  formScroll: { paddingHorizontal: 20 },
  formSectionTitle: { fontSize: 15, fontWeight: '700', color: '#1a3a52', marginTop: 20, marginBottom: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', paddingBottom: 6 },
  formLabel: { fontSize: 13, fontWeight: '500', color: '#6B7280', marginTop: 10, marginBottom: 4 },
  formInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },

  // Icon Grid
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  iconOption: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  iconOptionSelected: { backgroundColor: '#3B82F6' },

  // Color/Icon Preview
  iconPreviewRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 },
  colorPreview: {
    width: 32,
    height: 32,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  iconPreviewCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Empty & Pagination
  emptyContainer: { paddingVertical: 40, alignItems: 'center' },
  emptyText: { fontSize: 14, color: '#9CA3AF', marginTop: 10 },
  pagination: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16 },
  pageBtn: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#3B82F6', borderRadius: 8 },
  pageBtnDisabled: { opacity: 0.4 },
  pageBtnText: { color: '#FFF', fontWeight: '500', fontSize: 13 },
  pageInfo: { fontSize: 13, color: '#6B7280' },
});
