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
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { showAlert, showConfirm } from '../../utils/alert';
import {
  adminEventsService,
  EventCategory,
  EventCategoryRequest,
} from '../../services/api/events';

const COMMON_ICONS = [
  '', '', '', '', '', '', '', '',
  '', '', '', '', '', '', '', '',
  '', '', '', '', '', '', '', '',
  '', '', '', '', '', '', '', '',
];

const COLOR_PRESETS = [
  '#EF4444', '#F59E0B', '#10B981', '#3B82F6',
  '#8B5CF6', '#EC4899', '#06B6D4', '#F97316',
  '#14B8A6', '#6366F1', '#D946EF', '#84CC16',
];

const DEFAULT_FORM: Partial<EventCategoryRequest> = {
  name: '',
  slug: '',
  icon: '',
  color: '#3B82F6',
  gradient: [],
  description: '',
  isActive: true,
  isFeatured: false,
  sortOrder: 0,
};

export default function EventCategoriesScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  // Data states
  const [categories, setCategories] = useState<EventCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal states
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<EventCategory | null>(null);
  const [formData, setFormData] = useState<Partial<EventCategoryRequest>>(DEFAULT_FORM);
  const [isSaving, setIsSaving] = useState(false);

  // ==========================================
  // DATA LOADING
  // ==========================================

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setIsLoading(true);
      const data = await adminEventsService.getCategories();
      // Sort by sortOrder
      setCategories(data.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)));
    } catch (error: any) {
      console.error('Failed to load categories:', error);
      showAlert('Error', error.message || 'Failed to load categories');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadCategories();
    setRefreshing(false);
  }, []);

  // ==========================================
  // ACTIONS
  // ==========================================

  const generateSlug = (name: string): string => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const handleCreateNew = () => {
    setEditingCategory(null);
    setFormData({
      ...DEFAULT_FORM,
      sortOrder: categories.length,
    });
    setShowFormModal(true);
  };

  const handleEdit = (category: EventCategory) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      slug: category.slug,
      icon: category.icon || '',
      color: category.color || '#3B82F6',
      gradient: category.gradient || [],
      description: category.description || '',
      isActive: category.isActive,
      isFeatured: category.isFeatured,
      sortOrder: category.sortOrder,
    });
    setShowFormModal(true);
  };

  const handleSave = async () => {
    if (!formData.name?.trim()) {
      showAlert('Error', 'Category name is required');
      return;
    }

    // Auto-generate slug if empty
    if (!formData.slug?.trim()) {
      formData.slug = generateSlug(formData.name);
    }

    setIsSaving(true);
    try {
      if (editingCategory) {
        await adminEventsService.updateCategory(editingCategory._id, formData);
        showAlert('Success', 'Category updated successfully');
      } else {
        await adminEventsService.createCategory(formData as EventCategoryRequest);
        showAlert('Success', 'Category created successfully');
      }
      setShowFormModal(false);
      await loadCategories();
    } catch (error: any) {
      showAlert('Error', error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (category: EventCategory) => {
    showConfirm(
      'Delete Category',
      `Are you sure you want to delete "${category.name}"? Events in this category will need to be reassigned.`,
      async () => {
        try {
          await adminEventsService.deleteCategory(category._id);
          showAlert('Success', 'Category deleted');
          await loadCategories();
        } catch (error: any) {
          showAlert('Error', error.message);
        }
      },
      'Delete'
    );
  };

  const handleToggleActive = async (category: EventCategory) => {
    try {
      await adminEventsService.updateCategory(category._id, { isActive: !category.isActive });
      await loadCategories();
    } catch (error: any) {
      showAlert('Error', error.message);
    }
  };

  const handleMoveUp = async (index: number) => {
    if (index <= 0) return;
    try {
      const newOrder = [...categories];
      const temp = newOrder[index];
      newOrder[index] = newOrder[index - 1];
      newOrder[index - 1] = temp;
      const orderedIds = newOrder.map(c => c._id);
      await adminEventsService.reorderCategories(orderedIds);
      await loadCategories();
    } catch (error: any) {
      showAlert('Error', error.message);
    }
  };

  const handleMoveDown = async (index: number) => {
    if (index >= categories.length - 1) return;
    try {
      const newOrder = [...categories];
      const temp = newOrder[index];
      newOrder[index] = newOrder[index + 1];
      newOrder[index + 1] = temp;
      const orderedIds = newOrder.map(c => c._id);
      await adminEventsService.reorderCategories(orderedIds);
      await loadCategories();
    } catch (error: any) {
      showAlert('Error', error.message);
    }
  };

  // ==========================================
  // RENDER SECTIONS
  // ==========================================

  const renderHeader = () => (
    <View style={styles.header}>
      <View>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Event Categories</Text>
        <Text style={[styles.headerSubtitle, { color: colors.icon }]}>
          {categories.length} categories | {categories.filter(c => c.isActive).length} active
        </Text>
      </View>
      <TouchableOpacity
        style={[styles.createBtn, { backgroundColor: colors.tint }]}
        onPress={handleCreateNew}
      >
        <Ionicons name="add" size={20} color="#FFF" />
        <Text style={styles.createBtnText}>Add Category</Text>
      </TouchableOpacity>
    </View>
  );

  const renderCategoryItem = ({ item, index }: { item: EventCategory; index: number }) => (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      <View style={styles.cardRow}>
        {/* Icon */}
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: item.color ? `${item.color}20` : `${colors.tint}15` },
          ]}
        >
          <Text style={styles.iconText}>{item.icon || ''}</Text>
        </View>

        {/* Info */}
        <View style={styles.cardInfo}>
          <View style={styles.cardNameRow}>
            <Text style={[styles.cardName, { color: colors.text }]}>{item.name}</Text>
            {item.isFeatured && (
              <View style={styles.featuredBadge}>
                <Ionicons name="star" size={10} color="#F59E0B" />
              </View>
            )}
          </View>
          <Text style={[styles.cardSlug, { color: colors.icon }]}>{item.slug}</Text>
          <View style={styles.cardMeta}>
            <View style={styles.metaChip}>
              <Ionicons name="calendar-outline" size={11} color={colors.icon} />
              <Text style={[styles.metaText, { color: colors.icon }]}>
                {item.eventCount || 0} events
              </Text>
            </View>
            <View style={styles.metaChip}>
              <Ionicons name="swap-vertical-outline" size={11} color={colors.icon} />
              <Text style={[styles.metaText, { color: colors.icon }]}>
                #{item.sortOrder}
              </Text>
            </View>
            {item.color && (
              <View style={styles.metaChip}>
                <View style={[styles.colorDot, { backgroundColor: item.color }]} />
                <Text style={[styles.metaText, { color: colors.icon }]}>{item.color}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Active Toggle */}
        <Switch
          value={item.isActive}
          onValueChange={() => handleToggleActive(item)}
          trackColor={{ true: colors.tint }}
          style={{ marginRight: 4 }}
        />
      </View>

      {/* Actions Row */}
      <View style={[styles.actionRow, { borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.actionIconBtn, { backgroundColor: '#3B82F610' }]}
          onPress={() => handleMoveUp(index)}
          disabled={index === 0}
        >
          <Ionicons name="chevron-up" size={16} color={index === 0 ? '#D1D5DB' : '#3B82F6'} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionIconBtn, { backgroundColor: '#3B82F610' }]}
          onPress={() => handleMoveDown(index)}
          disabled={index === categories.length - 1}
        >
          <Ionicons
            name="chevron-down"
            size={16}
            color={index === categories.length - 1 ? '#D1D5DB' : '#3B82F6'}
          />
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        <TouchableOpacity
          style={[styles.actionIconBtn, { backgroundColor: '#3B82F610' }]}
          onPress={() => handleEdit(item)}
        >
          <Ionicons name="pencil" size={16} color="#3B82F6" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionIconBtn, { backgroundColor: '#EF444410' }]}
          onPress={() => handleDelete(item)}
        >
          <Ionicons name="trash" size={16} color="#EF4444" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="folder-open-outline" size={48} color={colors.icon} />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>No Categories</Text>
      <Text style={[styles.emptyText, { color: colors.icon }]}>
        Create your first event category to organize events
      </Text>
      <TouchableOpacity
        style={[styles.emptyBtn, { backgroundColor: colors.tint }]}
        onPress={handleCreateNew}
      >
        <Ionicons name="add" size={18} color="#FFF" />
        <Text style={styles.emptyBtnText}>Add Category</Text>
      </TouchableOpacity>
    </View>
  );

  // ==========================================
  // FORM MODAL
  // ==========================================

  const renderFormModal = () => (
    <Modal visible={showFormModal} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => setShowFormModal(false)} style={styles.modalCloseBtn}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: colors.text }]}>
            {editingCategory ? 'Edit Category' : 'Add Category'}
          </Text>
          <TouchableOpacity
            style={[styles.modalSaveBtn, { backgroundColor: colors.tint }]}
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={styles.modalSaveBtnText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.modalBody}
          contentContainerStyle={styles.modalBodyContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Name */}
          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.text }]}>Name *</Text>
            <TextInput
              style={[styles.formInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
              value={formData.name || ''}
              onChangeText={text => {
                setFormData(p => ({
                  ...p,
                  name: text,
                  slug: editingCategory ? p.slug : generateSlug(text),
                }));
              }}
              placeholder="Category name"
              placeholderTextColor={colors.icon}
            />
          </View>

          {/* Slug */}
          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.text }]}>Slug</Text>
            <TextInput
              style={[styles.formInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
              value={formData.slug || ''}
              onChangeText={text => setFormData(p => ({ ...p, slug: text }))}
              placeholder="auto-generated-from-name"
              placeholderTextColor={colors.icon}
            />
          </View>

          {/* Icon */}
          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.text }]}>Icon (Emoji)</Text>
            <TextInput
              style={[styles.formInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
              value={formData.icon || ''}
              onChangeText={text => setFormData(p => ({ ...p, icon: text }))}
              placeholder="Paste an emoji..."
              placeholderTextColor={colors.icon}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
              {COMMON_ICONS.map((icon, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.emojiOption,
                    { borderColor: formData.icon === icon ? colors.tint : colors.border },
                    formData.icon === icon && { backgroundColor: `${colors.tint}15` },
                  ]}
                  onPress={() => setFormData(p => ({ ...p, icon }))}
                >
                  <Text style={styles.emojiText}>{icon}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Color */}
          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.text }]}>Color</Text>
            <TextInput
              style={[styles.formInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
              value={formData.color || ''}
              onChangeText={text => setFormData(p => ({ ...p, color: text }))}
              placeholder="#3B82F6"
              placeholderTextColor={colors.icon}
            />
            <View style={styles.colorPresetsRow}>
              {COLOR_PRESETS.map((color, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.colorPreset,
                    { backgroundColor: color },
                    formData.color === color && styles.colorPresetSelected,
                  ]}
                  onPress={() => setFormData(p => ({ ...p, color }))}
                />
              ))}
            </View>
            {formData.color && (
              <View style={styles.colorPreviewRow}>
                <View style={[styles.colorPreviewSwatch, { backgroundColor: formData.color }]} />
                <Text style={[styles.colorPreviewText, { color: colors.icon }]}>
                  Preview: {formData.color}
                </Text>
              </View>
            )}
          </View>

          {/* Gradient */}
          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.text }]}>Gradient Colors (comma separated hex)</Text>
            <TextInput
              style={[styles.formInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
              value={(formData.gradient || []).join(', ')}
              onChangeText={text =>
                setFormData(p => ({
                  ...p,
                  gradient: text ? text.split(',').map(s => s.trim()).filter(Boolean) : [],
                }))
              }
              placeholder="#FF6B6B, #FF8E53"
              placeholderTextColor={colors.icon}
            />
          </View>

          {/* Description */}
          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.text }]}>Description</Text>
            <TextInput
              style={[styles.formInput, styles.multilineInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
              value={formData.description || ''}
              onChangeText={text => setFormData(p => ({ ...p, description: text }))}
              placeholder="Brief description of this category..."
              placeholderTextColor={colors.icon}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* Sort Order */}
          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.text }]}>Sort Order</Text>
            <TextInput
              style={[styles.formInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
              value={String(formData.sortOrder || 0)}
              onChangeText={text => setFormData(p => ({ ...p, sortOrder: parseInt(text) || 0 }))}
              keyboardType="numeric"
              placeholderTextColor={colors.icon}
            />
          </View>

          {/* Toggles */}
          <View style={styles.formRow}>
            <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Active</Text>
              <View style={[styles.switchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.switchLabel, { color: colors.icon }]}>
                  {formData.isActive !== false ? 'Yes' : 'No'}
                </Text>
                <Switch
                  value={formData.isActive !== false}
                  onValueChange={val => setFormData(p => ({ ...p, isActive: val }))}
                  trackColor={{ true: colors.tint }}
                />
              </View>
            </View>
            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Featured</Text>
              <View style={[styles.switchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.switchLabel, { color: colors.icon }]}>
                  {formData.isFeatured ? 'Yes' : 'No'}
                </Text>
                <Switch
                  value={formData.isFeatured || false}
                  onValueChange={val => setFormData(p => ({ ...p, isFeatured: val }))}
                  trackColor={{ true: colors.tint }}
                />
              </View>
            </View>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  // ==========================================
  // MAIN RENDER
  // ==========================================

  if (isLoading && categories.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
          <Text style={[styles.loadingText, { color: colors.icon }]}>Loading categories...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={categories}
        keyExtractor={item => item._id}
        renderItem={renderCategoryItem}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {renderFormModal()}
    </SafeAreaView>
  );
}

// ==========================================
// STYLES
// ==========================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 20,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
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
  card: {
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 14,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 24,
  },
  cardInfo: {
    flex: 1,
  },
  cardNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardName: {
    fontSize: 16,
    fontWeight: '600',
  },
  featuredBadge: {
    backgroundColor: '#F59E0B15',
    padding: 3,
    borderRadius: 10,
  },
  cardSlug: {
    fontSize: 12,
    marginTop: 1,
  },
  cardMeta: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaText: {
    fontSize: 11,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },

  // Actions
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 10,
    marginTop: 10,
    borderTopWidth: 1,
  },
  actionIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
    marginTop: 8,
  },
  emptyBtnText: {
    color: '#FFF',
    fontWeight: '600',
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
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
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
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
  modalBody: {
    flex: 1,
  },
  modalBodyContent: {
    padding: 16,
  },

  // Form
  formGroup: {
    marginBottom: 14,
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
  multilineInput: {
    height: 80,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  formRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  switchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  switchLabel: {
    fontSize: 14,
  },

  // Emoji picker
  emojiOption: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  emojiText: {
    fontSize: 20,
  },

  // Color presets
  colorPresetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  colorPreset: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  colorPresetSelected: {
    borderWidth: 3,
    borderColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  colorPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  colorPreviewSwatch: {
    width: 20,
    height: 20,
    borderRadius: 4,
  },
  colorPreviewText: {
    fontSize: 12,
  },
});
