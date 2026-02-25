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
import { storeCollectionsService, StoreCollectionConfig } from '../../services/api/storeCollections';
import { Colors } from '../../constants/Colors';
import { showAlert, showConfirm } from '../../utils/alert';

interface EditFormData {
  displayName: string;
  description: string;
  icon: string;
  color: string;
  badgeText: string;
  imageUrl: string;
  sortOrder: string;
  regions: string;
  tags: string;
}

const DEFAULT_FORM: EditFormData = {
  displayName: '',
  description: '',
  icon: '',
  color: '#7B61FF',
  badgeText: '',
  imageUrl: '',
  sortOrder: '0',
  regions: '',
  tags: '',
};

export default function StoreCollectionsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [configs, setConfigs] = useState<StoreCollectionConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Edit modal state
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingConfig, setEditingConfig] = useState<StoreCollectionConfig | null>(null);
  const [formData, setFormData] = useState<EditFormData>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);

  const fetchConfigs = useCallback(async () => {
    try {
      const response = await storeCollectionsService.getAll();
      if (response.success && response.data) {
        setConfigs(Array.isArray(response.data) ? response.data : []);
      }
    } catch (error) {
      showAlert('Error', 'Failed to load store collections');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchConfigs();
  }, [fetchConfigs]);

  const handleSeed = useCallback(async () => {
    const confirmed = await showConfirm(
      'Seed Defaults',
      'This will create default category configurations if they don\'t exist. Continue?'
    );
    if (!confirmed) return;

    try {
      setLoading(true);
      await storeCollectionsService.seed();
      showAlert('Success', 'Default configurations seeded');
      await fetchConfigs();
    } catch {
      showAlert('Error', 'Failed to seed configurations');
    } finally {
      setLoading(false);
    }
  }, [fetchConfigs]);

  const handleToggleEnabled = useCallback(async (config: StoreCollectionConfig) => {
    try {
      await storeCollectionsService.update(config.categoryKey, {
        isEnabled: !config.isEnabled,
      });
      setConfigs(prev =>
        prev.map(c =>
          c.categoryKey === config.categoryKey ? { ...c, isEnabled: !c.isEnabled } : c
        )
      );
    } catch {
      showAlert('Error', 'Failed to toggle category');
    }
  }, []);

  const handleEdit = useCallback((config: StoreCollectionConfig) => {
    setEditingConfig(config);
    setFormData({
      displayName: config.displayName,
      description: config.description,
      icon: config.icon,
      color: config.color,
      badgeText: config.badgeText || '',
      imageUrl: config.imageUrl || '',
      sortOrder: String(config.sortOrder),
      regions: (config.regions || []).join(', '),
      tags: (config.tags || []).join(', '),
    });
    setEditModalVisible(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!editingConfig) return;

    setSaving(true);
    try {
      await storeCollectionsService.update(editingConfig.categoryKey, {
        displayName: formData.displayName,
        description: formData.description,
        icon: formData.icon,
        color: formData.color,
        badgeText: formData.badgeText,
        imageUrl: formData.imageUrl,
        sortOrder: parseInt(formData.sortOrder, 10) || 0,
        regions: formData.regions ? formData.regions.split(',').map(s => s.trim()).filter(Boolean) : [],
        tags: formData.tags ? formData.tags.split(',').map(s => s.trim()).filter(Boolean) : [],
      });
      showAlert('Success', 'Category updated');
      setEditModalVisible(false);
      await fetchConfigs();
    } catch {
      showAlert('Error', 'Failed to update category');
    } finally {
      setSaving(false);
    }
  }, [editingConfig, formData, fetchConfigs]);

  if (loading && configs.length === 0) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
        <Text style={[styles.loadingText, { color: colors.text }]}>Loading store collections...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Store Collections</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            Manage delivery category display on the Store page
          </Text>
        </View>
        <TouchableOpacity style={styles.seedButton} onPress={handleSeed}>
          <Ionicons name="flash" size={16} color="#FFFFFF" />
          <Text style={styles.seedButtonText}>Seed Defaults</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.tint} />
        }
      >
        {configs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="grid-outline" size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No store collections configured. Tap "Seed Defaults" to create them.
            </Text>
          </View>
        ) : (
          configs.map((config) => (
            <View
              key={config.categoryKey}
              style={[styles.configCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={styles.cardHeader}>
                <View style={[styles.colorDot, { backgroundColor: config.color }]} />
                <View style={styles.cardInfo}>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>{config.displayName}</Text>
                  <Text style={[styles.cardKey, { color: colors.textSecondary }]}>{config.categoryKey}</Text>
                </View>
                <View style={styles.cardActions}>
                  <Text style={[styles.sortOrderText, { color: colors.textSecondary }]}>#{config.sortOrder}</Text>
                  <Switch
                    value={config.isEnabled}
                    onValueChange={() => handleToggleEnabled(config)}
                    trackColor={{ false: '#D1D5DB', true: '#86EFAC' }}
                    thumbColor={config.isEnabled ? '#10B981' : '#9CA3AF'}
                  />
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => handleEdit(config)}
                  >
                    <Ionicons name="create-outline" size={18} color={colors.tint} />
                  </TouchableOpacity>
                </View>
              </View>
              <Text style={[styles.cardDescription, { color: colors.textSecondary }]} numberOfLines={2}>
                {config.description}
              </Text>
              <View style={styles.cardMeta}>
                <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                  Icon: {config.icon || 'none'}
                </Text>
                {config.badgeText ? (
                  <View style={[styles.badgeChip, { backgroundColor: config.color + '20' }]}>
                    <Text style={[styles.badgeChipText, { color: config.color }]}>{config.badgeText}</Text>
                  </View>
                ) : null}
                {config.regions && config.regions.length > 0 && (
                  <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                    Regions: {config.regions.join(', ')}
                  </Text>
                )}
              </View>
            </View>
          ))
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Edit Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setEditModalVisible(false)}>
              <Text style={[styles.modalCancel, { color: colors.tint }]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Edit {editingConfig?.categoryKey}
            </Text>
            <TouchableOpacity onPress={handleSave} disabled={saving}>
              {saving ? (
                <ActivityIndicator size="small" color={colors.tint} />
              ) : (
                <Text style={[styles.modalSave, { color: colors.tint }]}>Save</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formContainer}>
            {([
              { key: 'displayName', label: 'Display Name', placeholder: 'e.g. 30 min delivery' },
              { key: 'description', label: 'Description', placeholder: 'Category description', multiline: true },
              { key: 'icon', label: 'Icon (emoji)', placeholder: 'e.g. \ud83d\ude80' },
              { key: 'color', label: 'Color (hex)', placeholder: '#7B61FF' },
              { key: 'badgeText', label: 'Badge Text', placeholder: 'e.g. 30 min' },
              { key: 'imageUrl', label: 'Image URL (optional CDN)', placeholder: 'https://...' },
              { key: 'sortOrder', label: 'Sort Order', placeholder: '1', keyboardType: 'numeric' },
              { key: 'regions', label: 'Regions (comma-separated)', placeholder: 'dubai, india' },
              { key: 'tags', label: 'Tags (comma-separated)', placeholder: 'fast, popular' },
            ] as const).map((field) => (
              <View key={field.key} style={styles.formField}>
                <Text style={[styles.fieldLabel, { color: colors.text }]}>{field.label}</Text>
                <TextInput
                  style={[
                    styles.fieldInput,
                    { color: colors.text, borderColor: colors.border, backgroundColor: colors.card },
                    (field as any).multiline && styles.multilineInput,
                  ]}
                  value={formData[field.key as keyof EditFormData]}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, [field.key]: text }))}
                  placeholder={field.placeholder}
                  placeholderTextColor={colors.textSecondary}
                  multiline={(field as any).multiline}
                  keyboardType={(field as any).keyboardType || 'default'}
                />
              </View>
            ))}
            <View style={{ height: 50 }} />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14 },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 22, fontWeight: '700' },
  headerSubtitle: { fontSize: 13, marginTop: 2 },
  seedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  seedButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  scrollView: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  emptyContainer: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 14, textAlign: 'center', maxWidth: 280 },
  configCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  colorDot: { width: 12, height: 12, borderRadius: 6, marginRight: 10 },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  cardKey: { fontSize: 12 },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sortOrderText: { fontSize: 12, fontWeight: '500' },
  editButton: { padding: 4 },
  cardDescription: { fontSize: 13, marginBottom: 8 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  metaText: { fontSize: 11 },
  badgeChip: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  badgeChipText: { fontSize: 11, fontWeight: '600' },
  // Modal
  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalCancel: { fontSize: 16 },
  modalTitle: { fontSize: 17, fontWeight: '600' },
  modalSave: { fontSize: 16, fontWeight: '600' },
  formContainer: { paddingHorizontal: 20, paddingTop: 16 },
  formField: { marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  fieldInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  multilineInput: { minHeight: 80, textAlignVertical: 'top' },
});
