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
import { hotspotAreasService, HotspotArea } from '../../services/api/hotspotAreas';
import { Colors } from '../../constants/Colors';
import { showAlert, showConfirm } from '../../utils/alert';

type FilterTab = 'all' | 'active' | 'inactive';

interface AreaFormData {
  name: string;
  slug: string;
  city: string;
  state: string;
  country: string;
  lat: string;
  lng: string;
  radius: string;
  image: string;
  priority: string;
  isActive: boolean;
}

const DEFAULT_FORM: AreaFormData = {
  name: '',
  slug: '',
  city: '',
  state: '',
  country: '',
  lat: '',
  lng: '',
  radius: '',
  image: '',
  priority: '0',
  isActive: true,
};

export default function HotspotAreasScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  // Data states
  const [areas, setAreas] = useState<HotspotArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filter & search states
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingArea, setEditingArea] = useState<HotspotArea | null>(null);
  const [formData, setFormData] = useState<AreaFormData>(DEFAULT_FORM);
  const [isSaving, setIsSaving] = useState(false);

  // ==========================================
  // DATA LOADING
  // ==========================================

  useEffect(() => {
    fetchAreas();
  }, []);

  const fetchAreas = async () => {
    try {
      setLoading(true);
      const response = await hotspotAreasService.getAreas({ limit: 100 });
      const data = response.data?.areas || [];
      setAreas(data);
    } catch (error: any) {
      console.error('Failed to load hotspot areas:', error);
      showAlert('Error', error.message || 'Failed to load hotspot areas');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAreas();
    setRefreshing(false);
  }, []);

  // ==========================================
  // COMPUTED VALUES
  // ==========================================

  const activeCount = areas.filter(a => a.isActive).length;
  const inactiveCount = areas.filter(a => !a.isActive).length;

  const filteredAreas = areas.filter(area => {
    // Tab filter
    if (activeTab === 'active' && !area.isActive) return false;
    if (activeTab === 'inactive' && area.isActive) return false;

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        area.name.toLowerCase().includes(q) ||
        area.city?.toLowerCase().includes(q) ||
        area.slug?.toLowerCase().includes(q)
      );
    }

    return true;
  });

  // ==========================================
  // HELPERS
  // ==========================================

  const generateSlug = (name: string): string => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  // ==========================================
  // ACTIONS
  // ==========================================

  const handleCreateNew = () => {
    setEditingArea(null);
    setFormData({ ...DEFAULT_FORM });
    setShowModal(true);
  };

  const handleEdit = (area: HotspotArea) => {
    setEditingArea(area);
    setFormData({
      name: area.name || '',
      slug: area.slug || '',
      city: area.city || '',
      state: area.state || '',
      country: area.country || '',
      lat: area.coordinates?.lat != null ? String(area.coordinates.lat) : '',
      lng: area.coordinates?.lng != null ? String(area.coordinates.lng) : '',
      radius: area.radius != null ? String(area.radius) : '',
      image: area.image || '',
      priority: area.priority != null ? String(area.priority) : '0',
      isActive: area.isActive,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      showAlert('Error', 'Area name is required');
      return;
    }
    if (!formData.city.trim()) {
      showAlert('Error', 'City is required');
      return;
    }
    if (!formData.country.trim()) {
      showAlert('Error', 'Country is required');
      return;
    }
    if (!formData.lat.trim() || !formData.lng.trim()) {
      showAlert('Error', 'Coordinates (lat/lng) are required');
      return;
    }
    if (isNaN(parseFloat(formData.lat)) || isNaN(parseFloat(formData.lng))) {
      showAlert('Error', 'Coordinates must be valid numbers');
      return;
    }
    if (!formData.radius.trim() || isNaN(parseFloat(formData.radius))) {
      showAlert('Error', 'Radius must be a valid number');
      return;
    }

    const slug = formData.slug.trim() || generateSlug(formData.name);

    const payload: Partial<HotspotArea> = {
      name: formData.name.trim(),
      slug,
      city: formData.city.trim(),
      state: formData.state.trim() || undefined,
      country: formData.country.trim(),
      coordinates: {
        lat: parseFloat(formData.lat),
        lng: parseFloat(formData.lng),
      },
      radius: parseFloat(formData.radius),
      image: formData.image.trim() || undefined,
      priority: parseInt(formData.priority) || 0,
      isActive: formData.isActive,
    };

    setIsSaving(true);
    try {
      if (editingArea) {
        await hotspotAreasService.updateArea(editingArea._id, payload);
        showAlert('Success', 'Hotspot area updated successfully');
      } else {
        await hotspotAreasService.createArea(payload);
        showAlert('Success', 'Hotspot area created successfully');
      }
      setShowModal(false);
      await fetchAreas();
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to save hotspot area');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (area: HotspotArea) => {
    try {
      await hotspotAreasService.toggleArea(area._id);
      await fetchAreas();
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to toggle area status');
    }
  };

  const handleDelete = (area: HotspotArea) => {
    showConfirm(
      'Delete Hotspot Area',
      `Are you sure you want to delete "${area.name}"? This action cannot be undone.`,
      async () => {
        try {
          await hotspotAreasService.deleteArea(area._id);
          showAlert('Success', 'Hotspot area deleted');
          await fetchAreas();
        } catch (error: any) {
          showAlert('Error', error.message || 'Failed to delete area');
        }
      },
      'Delete'
    );
  };

  // ==========================================
  // RENDER: HEADER
  // ==========================================

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={[styles.headerTitle, { color: colors.text }]}>Hotspot Areas</Text>
      <TouchableOpacity
        style={[styles.createBtn, { backgroundColor: colors.tint }]}
        onPress={handleCreateNew}
      >
        <Ionicons name="add" size={22} color="#FFF" />
      </TouchableOpacity>
    </View>
  );

  // ==========================================
  // RENDER: STATS ROW
  // ==========================================

  const renderStatsRow = () => (
    <View style={styles.statsRow}>
      <View style={[styles.statCard, { backgroundColor: colors.card }]}>
        <View style={[styles.statIcon, { backgroundColor: '#3B82F615' }]}>
          <Ionicons name="location" size={18} color="#3B82F6" />
        </View>
        <Text style={[styles.statValue, { color: colors.text }]}>{areas.length}</Text>
        <Text style={[styles.statLabel, { color: colors.secondaryText }]}>Total</Text>
      </View>
      <View style={[styles.statCard, { backgroundColor: colors.card }]}>
        <View style={[styles.statIcon, { backgroundColor: '#10B98115' }]}>
          <Ionicons name="checkmark-circle" size={18} color="#10B981" />
        </View>
        <Text style={[styles.statValue, { color: colors.text }]}>{activeCount}</Text>
        <Text style={[styles.statLabel, { color: colors.secondaryText }]}>Active</Text>
      </View>
      <View style={[styles.statCard, { backgroundColor: colors.card }]}>
        <View style={[styles.statIcon, { backgroundColor: '#EF444415' }]}>
          <Ionicons name="close-circle" size={18} color="#EF4444" />
        </View>
        <Text style={[styles.statValue, { color: colors.text }]}>{inactiveCount}</Text>
        <Text style={[styles.statLabel, { color: colors.secondaryText }]}>Inactive</Text>
      </View>
    </View>
  );

  // ==========================================
  // RENDER: FILTER TABS
  // ==========================================

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Active' },
    { key: 'inactive', label: 'Inactive' },
  ];

  const renderFilterTabs = () => (
    <View style={styles.tabsContainer}>
      {tabs.map(tab => {
        const isSelected = activeTab === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tab,
              {
                backgroundColor: isSelected ? colors.tint : colors.card,
                borderColor: isSelected ? colors.tint : colors.border,
              },
            ]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text
              style={[
                styles.tabText,
                { color: isSelected ? '#FFF' : colors.secondaryText },
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  // ==========================================
  // RENDER: SEARCH BAR
  // ==========================================

  const renderSearchBar = () => (
    <View style={styles.searchContainer}>
      <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Ionicons name="search" size={18} color={colors.secondaryText} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search by name..."
          placeholderTextColor={colors.secondaryText}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color={colors.secondaryText} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  // ==========================================
  // RENDER: AREA CARD
  // ==========================================

  const renderAreaCard = (area: HotspotArea) => (
    <View key={area._id} style={[styles.card, { backgroundColor: colors.card }]}>
      {/* Top section: name, slug, status toggle */}
      <View style={styles.cardTopRow}>
        <View style={styles.cardTitleSection}>
          <Text style={[styles.cardName, { color: colors.text }]} numberOfLines={1}>
            {area.name}
          </Text>
          <Text style={[styles.cardSlug, { color: colors.secondaryText }]} numberOfLines={1}>
            {area.slug}
          </Text>
        </View>
        <Switch
          value={area.isActive}
          onValueChange={() => handleToggleActive(area)}
          trackColor={{ false: '#D1D5DB', true: `${colors.success}90` }}
          thumbColor={area.isActive ? colors.success : '#9CA3AF'}
        />
      </View>

      {/* Location info */}
      <View style={styles.cardInfoSection}>
        <View style={styles.infoRow}>
          <Ionicons name="location-outline" size={14} color={colors.secondaryText} />
          <Text style={[styles.infoText, { color: colors.secondaryText }]}>
            {[area.city, area.state, area.country].filter(Boolean).join(', ')}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="navigate-outline" size={14} color={colors.secondaryText} />
          <Text style={[styles.infoText, { color: colors.secondaryText }]}>
            {area.coordinates?.lat?.toFixed(4)}, {area.coordinates?.lng?.toFixed(4)}
          </Text>
        </View>
      </View>

      {/* Metrics row */}
      <View style={styles.metricsRow}>
        <View style={[styles.metricChip, { backgroundColor: '#3B82F610' }]}>
          <Ionicons name="resize-outline" size={13} color="#3B82F6" />
          <Text style={[styles.metricText, { color: '#3B82F6' }]}>
            {area.radius != null ? `${area.radius} km` : '--'}
          </Text>
        </View>
        <View style={[styles.metricChip, { backgroundColor: '#F59E0B10' }]}>
          <Ionicons name="arrow-up-outline" size={13} color="#F59E0B" />
          <Text style={[styles.metricText, { color: '#F59E0B' }]}>
            Priority: {area.priority ?? 0}
          </Text>
        </View>
        <View style={[styles.metricChip, { backgroundColor: '#10B98110' }]}>
          <Ionicons name="pricetag-outline" size={13} color="#10B981" />
          <Text style={[styles.metricText, { color: '#10B981' }]}>
            {area.totalDeals ?? 0} deals
          </Text>
        </View>
      </View>

      {/* Action buttons */}
      <View style={[styles.actionRow, { borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: '#3B82F610' }]}
          onPress={() => handleEdit(area)}
        >
          <Ionicons name="pencil" size={16} color="#3B82F6" />
          <Text style={[styles.actionBtnText, { color: '#3B82F6' }]}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: '#EF444410' }]}
          onPress={() => handleDelete(area)}
        >
          <Ionicons name="trash" size={16} color="#EF4444" />
          <Text style={[styles.actionBtnText, { color: '#EF4444' }]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ==========================================
  // RENDER: EMPTY STATE
  // ==========================================

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="location-outline" size={48} color={colors.secondaryText} />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>No Hotspot Areas</Text>
      <Text style={[styles.emptyText, { color: colors.secondaryText }]}>
        {searchQuery.trim()
          ? 'No areas match your search. Try a different query.'
          : 'Create your first hotspot area to get started.'}
      </Text>
      {!searchQuery.trim() && (
        <TouchableOpacity
          style={[styles.emptyBtn, { backgroundColor: colors.tint }]}
          onPress={handleCreateNew}
        >
          <Ionicons name="add" size={18} color="#FFF" />
          <Text style={styles.emptyBtnText}>Create Area</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // ==========================================
  // RENDER: CREATE/EDIT MODAL
  // ==========================================

  const renderFormModal = () => (
    <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        {/* Modal Header */}
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => setShowModal(false)} style={styles.modalCloseBtn}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: colors.text }]}>
            {editingArea ? 'Edit Hotspot Area' : 'Create Hotspot Area'}
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

        {/* Modal Body */}
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
              value={formData.name}
              onChangeText={text => {
                setFormData(p => ({
                  ...p,
                  name: text,
                  slug: editingArea ? p.slug : generateSlug(text),
                }));
              }}
              placeholder="e.g. Downtown Dubai"
              placeholderTextColor={colors.secondaryText}
            />
          </View>

          {/* Slug */}
          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.text }]}>Slug</Text>
            <TextInput
              style={[styles.formInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
              value={formData.slug}
              onChangeText={text => setFormData(p => ({ ...p, slug: text }))}
              placeholder="auto-generated-from-name"
              placeholderTextColor={colors.secondaryText}
            />
          </View>

          {/* City */}
          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.text }]}>City *</Text>
            <TextInput
              style={[styles.formInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
              value={formData.city}
              onChangeText={text => setFormData(p => ({ ...p, city: text }))}
              placeholder="e.g. Dubai"
              placeholderTextColor={colors.secondaryText}
            />
          </View>

          {/* State */}
          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.text }]}>State</Text>
            <TextInput
              style={[styles.formInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
              value={formData.state}
              onChangeText={text => setFormData(p => ({ ...p, state: text }))}
              placeholder="e.g. Dubai (optional)"
              placeholderTextColor={colors.secondaryText}
            />
          </View>

          {/* Country */}
          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.text }]}>Country *</Text>
            <TextInput
              style={[styles.formInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
              value={formData.country}
              onChangeText={text => setFormData(p => ({ ...p, country: text }))}
              placeholder="e.g. UAE"
              placeholderTextColor={colors.secondaryText}
            />
          </View>

          {/* Coordinates */}
          <View style={styles.formRow}>
            <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Latitude *</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                value={formData.lat}
                onChangeText={text => setFormData(p => ({ ...p, lat: text }))}
                placeholder="25.2048"
                placeholderTextColor={colors.secondaryText}
                keyboardType="numeric"
              />
            </View>
            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Longitude *</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                value={formData.lng}
                onChangeText={text => setFormData(p => ({ ...p, lng: text }))}
                placeholder="55.2708"
                placeholderTextColor={colors.secondaryText}
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* Radius */}
          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.text }]}>Radius (km) *</Text>
            <TextInput
              style={[styles.formInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
              value={formData.radius}
              onChangeText={text => setFormData(p => ({ ...p, radius: text }))}
              placeholder="e.g. 5"
              placeholderTextColor={colors.secondaryText}
              keyboardType="numeric"
            />
          </View>

          {/* Image URL */}
          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.text }]}>Image URL</Text>
            <TextInput
              style={[styles.formInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
              value={formData.image}
              onChangeText={text => setFormData(p => ({ ...p, image: text }))}
              placeholder="https://example.com/image.jpg"
              placeholderTextColor={colors.secondaryText}
              autoCapitalize="none"
              keyboardType="url"
            />
          </View>

          {/* Priority */}
          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.text }]}>Priority</Text>
            <TextInput
              style={[styles.formInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
              value={formData.priority}
              onChangeText={text => setFormData(p => ({ ...p, priority: text }))}
              placeholder="0"
              placeholderTextColor={colors.secondaryText}
              keyboardType="numeric"
            />
          </View>

          {/* Active Toggle */}
          <View style={styles.formGroup}>
            <Text style={[styles.formLabel, { color: colors.text }]}>Active</Text>
            <View style={[styles.switchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.switchLabel, { color: colors.secondaryText }]}>
                {formData.isActive ? 'Yes' : 'No'}
              </Text>
              <Switch
                value={formData.isActive}
                onValueChange={val => setFormData(p => ({ ...p, isActive: val }))}
                trackColor={{ false: '#D1D5DB', true: `${colors.success}90` }}
                thumbColor={formData.isActive ? colors.success : '#9CA3AF'}
              />
            </View>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </Modal>
  );

  // ==========================================
  // MAIN RENDER
  // ==========================================

  if (loading && areas.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
          <Text style={[styles.loadingText, { color: colors.secondaryText }]}>
            Loading hotspot areas...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {renderHeader()}
        {renderStatsRow()}
        {renderFilterTabs()}
        {renderSearchBar()}

        {filteredAreas.length === 0 ? (
          renderEmptyState()
        ) : (
          filteredAreas.map(area => renderAreaCard(area))
        )}

        <View style={{ height: 20 }} />
      </ScrollView>

      {renderFormModal()}
    </View>
  );
}

// ==========================================
// STYLES
// ==========================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  createBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  statIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
  },

  // Filter Tabs
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 12,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Search Bar
  searchContainer: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },

  // Area Card
  card: {
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 12,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  cardTitleSection: {
    flex: 1,
    marginRight: 12,
  },
  cardName: {
    fontSize: 16,
    fontWeight: '600',
  },
  cardSlug: {
    fontSize: 12,
    marginTop: 2,
  },
  cardInfoSection: {
    marginBottom: 10,
    gap: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    fontSize: 13,
  },

  // Metrics
  metricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  metricChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  metricText: {
    fontSize: 12,
    fontWeight: '500',
  },

  // Actions
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Empty State
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
    borderRadius: 12,
    gap: 6,
    marginTop: 8,
  },
  emptyBtnText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 14,
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
});
