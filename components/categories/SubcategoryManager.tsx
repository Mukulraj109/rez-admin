import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '../../services/api/apiClient';
import FormField from './FormField';
import ColorInput from './ColorInput';
import { showAlert, showConfirm } from '../../utils/alert';

interface SubcategoryMetadata {
  color?: string;
  featured?: boolean;
  description?: string;
}

interface Subcategory {
  _id: string;
  name: string;
  slug: string;
  icon: string;
  image: string;
  sortOrder: number;
  isActive: boolean;
  storeCount: number;
  metadata: SubcategoryMetadata;
}

interface SubcategoryManagerProps {
  categoryId: string;
  colors: { text: string; icon: string; border: string; tint: string; card: string; success: string; error?: string };
}

const generateSlug = (name: string): string =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const SubcategoryManager = React.memo(({ categoryId, colors }: SubcategoryManagerProps) => {
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null); // tracks which sub is saving by _id, or 'new' / 'reorder'
  const [orderChanged, setOrderChanged] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // New subcategory form state
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState('');
  const [newImage, setNewImage] = useState('');

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editIcon, setEditIcon] = useState('');
  const [editImage, setEditImage] = useState('');
  const [editColor, setEditColor] = useState('');

  // Track original order for comparison
  const originalOrderRef = useRef<string[]>([]);
  // Guard against stale fetch responses when categoryId changes rapidly
  const fetchIdRef = useRef(0);

  const fetchSubcategories = useCallback(async () => {
    if (!categoryId) return;
    const fetchId = ++fetchIdRef.current;
    setLoading(true);
    try {
      const res = await apiClient.get('admin/categories/' + categoryId + '/subcategories');
      if (fetchId !== fetchIdRef.current) return; // stale response — category already changed
      if (res.success && res.data) {
        const subs = (res.data as any).subcategories || [];
        setSubcategories(subs);
        originalOrderRef.current = subs.map((s: Subcategory) => s._id);
        setOrderChanged(false);
      } else {
        showAlert('Error', res.message || 'Failed to load subcategories', 'error');
      }
    } catch (err: any) {
      if (fetchId !== fetchIdRef.current) return; // stale — ignore error too
      showAlert('Error', err.message || 'Failed to load subcategories', 'error');
    } finally {
      if (fetchId === fetchIdRef.current) setLoading(false);
    }
  }, [categoryId]);

  useEffect(() => {
    fetchSubcategories();
    // Reset local state when category changes
    setShowAddForm(false);
    setEditingId(null);
    setOrderChanged(false);
  }, [fetchSubcategories]);

  // --- Add Subcategory ---
  const handleAdd = async () => {
    if (!newName.trim()) {
      showAlert('Validation', 'Name is required', 'warning');
      return;
    }
    setSaving('new');
    try {
      const body: any = {
        name: newName.trim(),
        slug: generateSlug(newName.trim()),
      };
      if (newIcon.trim()) body.icon = newIcon.trim();
      if (newImage.trim()) body.image = newImage.trim();

      const res = await apiClient.post('admin/categories/' + categoryId + '/subcategories', body);
      if (res.success) {
        showAlert('Success', 'Subcategory created', 'success');
        setNewName('');
        setNewIcon('');
        setNewImage('');
        setShowAddForm(false);
        await fetchSubcategories();
      } else {
        showAlert('Error', res.message || 'Failed to create subcategory', 'error');
      }
    } catch (err: any) {
      showAlert('Error', err.message || 'Failed to create subcategory', 'error');
    } finally {
      setSaving(null);
    }
  };

  // --- Edit Subcategory ---
  const startEditing = (sub: Subcategory) => {
    setEditingId(sub._id);
    setEditName(sub.name);
    setEditIcon(sub.icon || '');
    setEditImage(sub.image || '');
    setEditColor(sub.metadata?.color || '');
  };

  const cancelEditing = () => {
    setEditingId(null);
  };

  const handleSaveEdit = async (subId: string) => {
    if (!editName.trim()) {
      showAlert('Validation', 'Name is required', 'warning');
      return;
    }
    setSaving(subId);
    try {
      const body: any = {
        name: editName.trim(),
        icon: editIcon.trim(),
        image: editImage.trim(),
        metadata: { color: editColor.trim() || undefined },
      };

      const res = await apiClient.put('admin/categories/' + categoryId + '/subcategories/' + subId, body);
      if (res.success) {
        showAlert('Success', 'Subcategory updated', 'success');
        setEditingId(null);
        await fetchSubcategories();
      } else {
        showAlert('Error', res.message || 'Failed to update subcategory', 'error');
      }
    } catch (err: any) {
      showAlert('Error', err.message || 'Failed to update subcategory', 'error');
    } finally {
      setSaving(null);
    }
  };

  // --- Delete Subcategory ---
  const handleDelete = (sub: Subcategory) => {
    if (sub.storeCount > 0) {
      showAlert(
        'Cannot Delete',
        `"${sub.name}" has ${sub.storeCount} store${sub.storeCount === 1 ? '' : 's'} assigned. Remove all stores first.`,
        'warning'
      );
      return;
    }
    showConfirm(
      'Delete Subcategory',
      `Remove "${sub.name}"? This action cannot be undone.`,
      async () => {
        setSaving(sub._id);
        try {
          const res = await apiClient.delete('admin/categories/' + categoryId + '/subcategories/' + sub._id);
          if (res.success) {
            showAlert('Deleted', `"${sub.name}" removed`, 'success');
            await fetchSubcategories();
          } else {
            showAlert('Error', res.message || 'Failed to delete subcategory', 'error');
          }
        } catch (err: any) {
          showAlert('Error', err.message || 'Failed to delete subcategory', 'error');
        } finally {
          setSaving(null);
        }
      },
      'Delete',
      'warning'
    );
  };

  // --- Reorder ---
  const moveItem = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= subcategories.length) return;

    const updated = [...subcategories];
    const temp = updated[index];
    updated[index] = updated[newIndex];
    updated[newIndex] = temp;
    setSubcategories(updated);

    // Check if order differs from original
    const currentOrder = updated.map((s) => s._id);
    const changed = currentOrder.some((id, i) => id !== originalOrderRef.current[i]);
    setOrderChanged(changed);
  };

  const handleSaveOrder = async () => {
    setSaving('reorder');
    try {
      const orderedIds = subcategories.map((s) => s._id);
      const res = await apiClient.post('admin/categories/' + categoryId + '/subcategories/reorder', { orderedIds });
      if (res.success) {
        showAlert('Success', 'Order saved', 'success');
        originalOrderRef.current = orderedIds;
        setOrderChanged(false);
      } else {
        showAlert('Error', res.message || 'Failed to save order', 'error');
      }
    } catch (err: any) {
      showAlert('Error', err.message || 'Failed to save order', 'error');
    } finally {
      setSaving(null);
    }
  };

  // --- Loading State ---
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={colors.tint} />
        <Text style={[styles.loadingText, { color: colors.icon }]}>Loading subcategories...</Text>
      </View>
    );
  }

  return (
    <View>
      {/* Empty State */}
      {subcategories.length === 0 && !showAddForm && (
        <View style={styles.emptyState}>
          <Ionicons name="layers-outline" size={24} color={colors.icon} />
          <Text style={[styles.emptyText, { color: colors.icon }]}>No subcategories yet.</Text>
        </View>
      )}

      {/* Subcategory List */}
      {subcategories.map((sub, index) => {
        const isEditing = editingId === sub._id;
        const isSaving = saving === sub._id;

        return (
          <View key={sub._id} style={[styles.card, { borderColor: colors.border }]}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <Text style={[styles.cardIndex, { color: colors.icon }]}>#{index + 1}</Text>
                {!isEditing && (
                  <View style={[styles.statusDot, { backgroundColor: sub.isActive ? (colors.success || '#22C55E') : '#9CA3AF' }]} />
                )}
                {sub.storeCount > 0 && !isEditing && (
                  <View style={[styles.badge, { backgroundColor: colors.tint + '20' }]}>
                    <Ionicons name="storefront-outline" size={11} color={colors.tint} />
                    <Text style={[styles.badgeText, { color: colors.tint }]}>{sub.storeCount}</Text>
                  </View>
                )}
              </View>
              <View style={styles.cardActions}>
                {!isEditing && (
                  <>
                    {/* Reorder buttons */}
                    <TouchableOpacity
                      onPress={() => moveItem(index, 'up')}
                      disabled={index === 0}
                      style={{ opacity: index === 0 ? 0.3 : 1 }}
                    >
                      <Ionicons name="chevron-up" size={18} color={colors.icon} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => moveItem(index, 'down')}
                      disabled={index === subcategories.length - 1}
                      style={{ opacity: index === subcategories.length - 1 ? 0.3 : 1 }}
                    >
                      <Ionicons name="chevron-down" size={18} color={colors.icon} />
                    </TouchableOpacity>
                    {/* Edit button */}
                    <TouchableOpacity onPress={() => startEditing(sub)}>
                      <Ionicons name="pencil-outline" size={16} color={colors.tint} />
                    </TouchableOpacity>
                    {/* Delete button */}
                    <TouchableOpacity
                      onPress={() => handleDelete(sub)}
                      disabled={isSaving}
                      style={{ opacity: sub.storeCount > 0 ? 0.4 : 1 }}
                    >
                      {isSaving ? (
                        <ActivityIndicator size="small" color="#EF4444" />
                      ) : (
                        <Ionicons name="trash-outline" size={16} color="#EF4444" />
                      )}
                    </TouchableOpacity>
                  </>
                )}
                {isEditing && (
                  <TouchableOpacity onPress={cancelEditing}>
                    <Ionicons name="close" size={18} color={colors.icon} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Display mode */}
            {!isEditing && (
              <View style={styles.displayRow}>
                {sub.icon ? <Text style={styles.emojiIcon}>{sub.icon}</Text> : null}
                <View style={{ flex: 1 }}>
                  <Text style={[styles.subName, { color: colors.text }]}>{sub.name}</Text>
                  <Text style={[styles.subSlug, { color: colors.icon }]}>/{sub.slug}</Text>
                </View>
                {sub.image ? (
                  <View style={[styles.imageBadge, { borderColor: colors.border }]}>
                    <Ionicons name="image-outline" size={12} color={colors.icon} />
                  </View>
                ) : null}
              </View>
            )}

            {/* Edit mode */}
            {isEditing && (
              <View>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <FormField
                      label="Name"
                      value={editName}
                      onChangeText={setEditName}
                      placeholder="Subcategory name"
                      colors={colors}
                      small
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <FormField
                      label="Icon (emoji)"
                      value={editIcon}
                      onChangeText={setEditIcon}
                      placeholder="🍔"
                      colors={colors}
                      small
                    />
                  </View>
                </View>

                <FormField
                  label="Image URL"
                  value={editImage}
                  onChangeText={setEditImage}
                  placeholder="https://..."
                  colors={colors}
                  small
                />

                <ColorInput
                  label="Color"
                  value={editColor}
                  onChange={setEditColor}
                  placeholder="#3B82F6"
                  colors={colors}
                  small
                />

                <View style={styles.editActions}>
                  <TouchableOpacity
                    style={[styles.editCancelBtn, { borderColor: colors.border }]}
                    onPress={cancelEditing}
                  >
                    <Text style={[styles.editCancelText, { color: colors.icon }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.editSaveBtn, { backgroundColor: colors.tint }]}
                    onPress={() => handleSaveEdit(sub._id)}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.editSaveText}>Save</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        );
      })}

      {/* Save Reorder Button */}
      {orderChanged && (
        <TouchableOpacity
          style={[styles.reorderBtn, { backgroundColor: colors.tint }]}
          onPress={handleSaveOrder}
          disabled={saving === 'reorder'}
        >
          {saving === 'reorder' ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="swap-vertical-outline" size={18} color="#fff" />
              <Text style={styles.reorderBtnText}>Save Order</Text>
            </>
          )}
        </TouchableOpacity>
      )}

      {/* Add Form */}
      {showAddForm && (
        <View style={[styles.card, { borderColor: colors.tint, borderStyle: 'dashed' }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardIndex, { color: colors.tint }]}>New Subcategory</Text>
            <TouchableOpacity onPress={() => { setShowAddForm(false); setNewName(''); setNewIcon(''); setNewImage(''); }}>
              <Ionicons name="close" size={18} color={colors.icon} />
            </TouchableOpacity>
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <FormField
                label="Name *"
                value={newName}
                onChangeText={setNewName}
                placeholder="e.g. Restaurants"
                colors={colors}
                small
              />
            </View>
            <View style={{ flex: 1 }}>
              <FormField
                label="Icon (emoji)"
                value={newIcon}
                onChangeText={setNewIcon}
                placeholder="🍽️"
                colors={colors}
                small
              />
            </View>
          </View>

          {newName.trim() ? (
            <Text style={[styles.slugPreview, { color: colors.icon }]}>
              Slug: {generateSlug(newName.trim())}
            </Text>
          ) : null}

          <FormField
            label="Image URL"
            value={newImage}
            onChangeText={setNewImage}
            placeholder="https://..."
            colors={colors}
            small
          />

          <TouchableOpacity
            style={[styles.editSaveBtn, { backgroundColor: colors.tint, alignSelf: 'flex-end' }]}
            onPress={handleAdd}
            disabled={saving === 'new'}
          >
            {saving === 'new' ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.editSaveText}>Create</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Add Button */}
      {!showAddForm && (
        <TouchableOpacity style={[styles.addBtn, { borderColor: colors.tint }]} onPress={() => setShowAddForm(true)}>
          <Ionicons name="add-circle-outline" size={20} color={colors.tint} />
          <Text style={[styles.addText, { color: colors.tint }]}>Add Subcategory</Text>
        </TouchableOpacity>
      )}
    </View>
  );
});

SubcategoryManager.displayName = 'SubcategoryManager';
export default SubcategoryManager;

const styles = StyleSheet.create({
  loadingContainer: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  loadingText: { fontSize: 13, fontWeight: '500' },
  emptyState: { alignItems: 'center', paddingVertical: 20, gap: 8 },
  emptyText: { fontSize: 13, fontWeight: '500' },
  card: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 10 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardIndex: { fontSize: 13, fontWeight: '700' },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  displayRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  emojiIcon: { fontSize: 22 },
  subName: { fontSize: 14, fontWeight: '600' },
  subSlug: { fontSize: 12, marginTop: 1 },
  imageBadge: { borderWidth: 1, borderRadius: 6, padding: 4 },
  row: { flexDirection: 'row', gap: 10 },
  slugPreview: { fontSize: 11, fontWeight: '500', marginBottom: 8, marginTop: -4 },
  editActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 4 },
  editCancelBtn: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7 },
  editCancelText: { fontSize: 13, fontWeight: '600' },
  editSaveBtn: { borderRadius: 8, paddingHorizontal: 16, paddingVertical: 7, minWidth: 70, alignItems: 'center' },
  editSaveText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  reorderBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    padding: 10, borderRadius: 10, gap: 6, marginBottom: 10,
  },
  reorderBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    padding: 12, borderRadius: 10, borderWidth: 1.5, borderStyle: 'dashed', gap: 6, marginTop: 4,
  },
  addText: { fontSize: 14, fontWeight: '600' },
});
