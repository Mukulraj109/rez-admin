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
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  homepageDealsService,
  HomepageDealsConfig,
  HomepageDealsItem,
  HomepageDealsStats,
  TabType,
  ItemType,
  VerificationType,
  CreateItemRequest,
  RegionId,
} from '../../services/api/homepageDeals';
import { Colors } from '../../constants/Colors';
import { showAlert, showConfirm } from '../../utils/alert';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Tab filter options
type FilterTab = 'all' | 'offers' | 'cashback' | 'exclusive';

const FILTER_TABS: { key: FilterTab; label: string; icon: string }[] = [
  { key: 'all', label: 'All', icon: 'albums' },
  { key: 'offers', label: 'Offers', icon: 'pricetag' },
  { key: 'cashback', label: 'Cashback', icon: 'cash' },
  { key: 'exclusive', label: 'Exclusive', icon: 'lock-closed' },
];

const ITEM_TYPES: { value: ItemType; label: string }[] = [
  { value: 'category', label: 'Category' },
  { value: 'campaign', label: 'Campaign' },
  { value: 'zone', label: 'Zone' },
  { value: 'custom', label: 'Custom' },
];

const VERIFICATION_TYPES: { value: VerificationType; label: string }[] = [
  { value: 'none', label: 'No Verification' },
  { value: 'student', label: 'Student' },
  { value: 'corporate', label: 'Corporate' },
  { value: 'defence', label: 'Defence' },
  { value: 'senior', label: 'Senior' },
  { value: 'birthday', label: 'Birthday' },
  { value: 'women', label: 'Women' },
];

const COMMON_EMOJIS = ['💳', '📍', '🔥', '🎁', '⚡', '💰', '🪙', '🎉', '📄', '🎓', '💼', '👩', '🎂', '👴', '🎖️', '🛍️', '✨', '🏷️'];

const GRADIENT_PRESETS = [
  [Colors.light.goldBright, '#FFA500'],
  ['#4CAF50', '#2E7D32'],
  ['#FF5722', '#D84315'],
  ['#9C27B0', '#6A1B9A'],
  ['#E91E63', '#AD1457'],
  ['#2196F3', '#1565C0'],
  ['#FF9800', '#EF6C00'],
  ['#673AB7', '#4527A0'],
  ['#00BCD4', '#00838F'],
  ['#3F51B5', '#1A237E'],
  ['#607D8B', '#37474F'],
  ['#795548', '#4E342E'],
];

const DEFAULT_ITEM: Partial<CreateItemRequest> = {
  tabType: 'offers',
  itemType: 'category',
  title: '',
  subtitle: '',
  icon: '🛍️',
  iconType: 'emoji',
  gradientColors: [Colors.light.goldBright, '#FFA500'],
  navigationPath: '/offers',
  showCount: true,
  countLabel: 'offers',
  cachedCount: 0,
  requiresVerification: false,
  verificationType: 'none',
  isActive: true,
  regions: ['all'],
};

export default function HomepageDealsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  // State
  const [config, setConfig] = useState<HomepageDealsConfig | null>(null);
  const [items, setItems] = useState<HomepageDealsItem[]>([]);
  const [stats, setStats] = useState<HomepageDealsStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilterTab, setActiveFilterTab] = useState<FilterTab>('all');

  // Modal states
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<HomepageDealsItem | null>(null);
  const [itemFormData, setItemFormData] = useState<Partial<CreateItemRequest>>(DEFAULT_ITEM);
  const [isSaving, setIsSaving] = useState(false);

  // Config form state
  const [configForm, setConfigForm] = useState({
    title: '',
    subtitle: '',
    icon: 'flash',
    isActive: true,
  });

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [configData, statsData, itemsData] = await Promise.all([
        homepageDealsService.getConfig(),
        homepageDealsService.getStats(),
        homepageDealsService.getItems({
          tabType: activeFilterTab === 'all' ? undefined : activeFilterTab as TabType,
          limit: 50,
        }),
      ]);

      setConfig(configData);
      setStats(statsData);
      setItems(itemsData.items);

      // Update config form
      setConfigForm({
        title: configData.title,
        subtitle: configData.subtitle,
        icon: configData.icon,
        isActive: configData.isActive,
      });
    } catch (error: any) {
      console.error('Fetch error:', error);
      showAlert('Error', error.message || 'Failed to fetch data');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [activeFilterTab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // Save config
  const handleSaveConfig = async () => {
    try {
      setIsSaving(true);
      await homepageDealsService.updateConfig(configForm);
      showAlert('Success', 'Configuration saved');
      setShowConfigModal(false);
      fetchData();
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to save config');
    } finally {
      setIsSaving(false);
    }
  };

  // Create/Update item
  const handleSaveItem = async () => {
    if (!itemFormData.title?.trim()) {
      showAlert('Error', 'Title is required');
      return;
    }
    if (!itemFormData.navigationPath?.trim()) {
      showAlert('Error', 'Navigation path is required');
      return;
    }

    try {
      setIsSaving(true);

      if (editingItem) {
        await homepageDealsService.updateItem(editingItem._id, itemFormData);
        showAlert('Success', 'Item updated');
      } else {
        await homepageDealsService.createItem(itemFormData as CreateItemRequest);
        showAlert('Success', 'Item created');
      }

      setShowItemModal(false);
      setEditingItem(null);
      setItemFormData(DEFAULT_ITEM);
      fetchData();
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to save item');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete item
  const handleDeleteItem = async (item: HomepageDealsItem) => {
    const confirmed = await showConfirm(
      'Delete Item',
      `Are you sure you want to delete "${item.title}"?`
    );

    if (confirmed) {
      try {
        await homepageDealsService.deleteItem(item._id);
        showAlert('Success', 'Item deleted');
        fetchData();
      } catch (error: any) {
        showAlert('Error', error.message || 'Failed to delete item');
      }
    }
  };

  // Toggle item
  const handleToggleItem = async (item: HomepageDealsItem) => {
    try {
      await homepageDealsService.toggleItem(item._id);
      fetchData();
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to toggle item');
    }
  };

  // Move item up/down
  const handleMoveItem = async (item: HomepageDealsItem, direction: 'up' | 'down') => {
    try {
      if (direction === 'up') {
        await homepageDealsService.moveItemUp(item._id);
      } else {
        await homepageDealsService.moveItemDown(item._id);
      }
      fetchData();
    } catch (error: any) {
      // Silently ignore if already at top/bottom
      if (!error.message?.includes('already at')) {
        showAlert('Error', error.message || 'Failed to move item');
      }
    }
  };

  // Open edit modal
  const handleEditItem = (item: HomepageDealsItem) => {
    setEditingItem(item);
    setItemFormData({
      tabType: item.tabType,
      itemType: item.itemType,
      title: item.title,
      subtitle: item.subtitle,
      icon: item.icon,
      iconType: item.iconType,
      gradientColors: item.gradientColors,
      badgeText: item.badgeText,
      navigationPath: item.navigationPath,
      showCount: item.showCount,
      countLabel: item.countLabel,
      cachedCount: item.cachedCount,
      requiresVerification: item.requiresVerification,
      verificationType: item.verificationType,
      isActive: item.isActive,
      regions: item.regions,
    });
    setShowItemModal(true);
  };

  // Open create modal
  const handleCreateItem = () => {
    setEditingItem(null);
    setItemFormData({
      ...DEFAULT_ITEM,
      tabType: activeFilterTab === 'all' ? 'offers' : activeFilterTab as TabType,
    });
    setShowItemModal(true);
  };

  // Render stat card
  const renderStatCard = (label: string, value: number | string, icon: string, color: string) => (
    <View style={[styles.statCard, { backgroundColor: colors.card }]}>
      <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon as any} size={20} color={color} />
      </View>
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );

  // Render item card
  const renderItemCard = ({ item, index }: { item: HomepageDealsItem; index: number }) => {
    const filteredItems = items.filter(i =>
      activeFilterTab === 'all' || i.tabType === activeFilterTab
    );
    const isFirst = index === 0 || filteredItems[0]?._id === item._id;
    const isLast = index === filteredItems.length - 1 || filteredItems[filteredItems.length - 1]?._id === item._id;

    return (
      <View style={[styles.itemCard, { backgroundColor: colors.card }]}>
        {/* Preview */}
        <View style={[styles.itemPreview, { backgroundColor: item.gradientColors?.[0] || colors.goldBright }]}>
          <Text style={styles.itemEmoji}>{item.icon}</Text>
        </View>

        {/* Info */}
        <View style={styles.itemInfo}>
          <Text style={[styles.itemTitle, { color: colors.text }]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={[styles.itemSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
            {item.tabType} | {item.showCount ? `${item.cachedCount} ${item.countLabel}` : item.subtitle}
          </Text>
        </View>

        {/* Actions */}
        <View style={styles.itemActions}>
          {/* Move buttons */}
          <TouchableOpacity
            style={[styles.moveBtn, isFirst && styles.moveBtnDisabled]}
            onPress={() => handleMoveItem(item, 'up')}
            disabled={isFirst}
          >
            <Ionicons name="chevron-up" size={18} color={isFirst ? colors.gray300 : colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.moveBtn, isLast && styles.moveBtnDisabled]}
            onPress={() => handleMoveItem(item, 'down')}
            disabled={isLast}
          >
            <Ionicons name="chevron-down" size={18} color={isLast ? colors.gray300 : colors.text} />
          </TouchableOpacity>

          {/* Toggle */}
          <Switch
            value={item.isActive}
            onValueChange={() => handleToggleItem(item)}
            trackColor={{ false: colors.gray300, true: colors.success }}
            thumbColor={colors.card}
            style={styles.itemSwitch}
          />

          {/* Edit */}
          <TouchableOpacity style={styles.actionBtn} onPress={() => handleEditItem(item)}>
            <Ionicons name="create-outline" size={20} color={colors.primary} />
          </TouchableOpacity>

          {/* Delete */}
          <TouchableOpacity style={styles.actionBtn} onPress={() => handleDeleteItem(item)}>
            <Ionicons name="trash-outline" size={20} color={colors.error} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Filter items by tab
  const filteredItems = items.filter(item =>
    activeFilterTab === 'all' || item.tabType === activeFilterTab
  );

  if (isLoading && !refreshing) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Homepage Deals</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            Manage "Deals that save you money" section
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.configBtn, { backgroundColor: colors.primary }]}
          onPress={() => setShowConfigModal(true)}
        >
          <Ionicons name="settings-outline" size={20} color={colors.card} />
        </TouchableOpacity>
      </View>

      {/* Stats */}
      {stats && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsContainer}>
          {renderStatCard('Total Items', stats.total, 'layers', colors.info)}
          {renderStatCard('Active', stats.active, 'checkmark-circle', colors.success)}
          {renderStatCard('Impressions', stats.totalImpressions.toLocaleString(), 'eye', colors.purple)}
          {renderStatCard('Clicks', stats.totalClicks.toLocaleString(), 'hand-left', colors.warning)}
          {renderStatCard('CTR', `${stats.ctr}%`, 'trending-up', colors.pink)}
        </ScrollView>
      )}

      {/* Filter Tabs */}
      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {FILTER_TABS.map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tab,
                activeFilterTab === tab.key && { backgroundColor: colors.primary },
              ]}
              onPress={() => setActiveFilterTab(tab.key)}
            >
              <Ionicons
                name={tab.icon as any}
                size={16}
                color={activeFilterTab === tab.key ? colors.card : colors.textSecondary}
              />
              <Text
                style={[
                  styles.tabText,
                  { color: activeFilterTab === tab.key ? colors.card : colors.textSecondary },
                ]}
              >
                {tab.label}
                {stats?.byTab?.[tab.key] ? ` (${stats.byTab[tab.key]})` : ''}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Add Button */}
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
          onPress={handleCreateItem}
        >
          <Ionicons name="add" size={24} color={colors.card} />
        </TouchableOpacity>
      </View>

      {/* Items List */}
      <FlatList
        data={filteredItems}
        keyExtractor={item => item._id}
        renderItem={renderItemCard}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="folder-open-outline" size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No items in this tab
            </Text>
            <TouchableOpacity
              style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
              onPress={handleCreateItem}
            >
              <Text style={styles.emptyBtnText}>Add Item</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Config Modal */}
      <Modal visible={showConfigModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Section Settings</Text>
              <TouchableOpacity onPress={() => setShowConfigModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Title</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.text }]}
                value={configForm.title}
                onChangeText={text => setConfigForm(f => ({ ...f, title: text }))}
                placeholder="Section title"
                placeholderTextColor={colors.textSecondary}
              />

              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Subtitle</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.text }]}
                value={configForm.subtitle}
                onChangeText={text => setConfigForm(f => ({ ...f, subtitle: text }))}
                placeholder="Section subtitle"
                placeholderTextColor={colors.textSecondary}
              />

              <View style={styles.switchRow}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary, marginBottom: 0 }]}>
                  Section Active
                </Text>
                <Switch
                  value={configForm.isActive}
                  onValueChange={val => setConfigForm(f => ({ ...f, isActive: val }))}
                  trackColor={{ false: colors.gray300, true: colors.success }}
                />
              </View>
            </ScrollView>

            <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => setShowConfigModal(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.saveBtn, { backgroundColor: colors.primary }]}
                onPress={handleSaveConfig}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color={colors.card} />
                ) : (
                  <Text style={styles.saveBtnText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Item Modal */}
      <Modal visible={showItemModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.itemModalContent, { backgroundColor: colors.card }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {editingItem ? 'Edit Item' : 'Add Item'}
              </Text>
              <TouchableOpacity onPress={() => { setShowItemModal(false); setEditingItem(null); }}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Tab Type */}
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Tab</Text>
              <View style={styles.segmentedControl}>
                {(['offers', 'cashback', 'exclusive'] as TabType[]).map(tab => (
                  <TouchableOpacity
                    key={tab}
                    style={[
                      styles.segment,
                      itemFormData.tabType === tab && { backgroundColor: colors.primary },
                    ]}
                    onPress={() => setItemFormData(f => ({ ...f, tabType: tab }))}
                  >
                    <Text
                      style={[
                        styles.segmentText,
                        { color: itemFormData.tabType === tab ? colors.card : colors.text },
                      ]}
                    >
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Icon */}
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Icon</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.emojiRow}>
                {COMMON_EMOJIS.map(emoji => (
                  <TouchableOpacity
                    key={emoji}
                    style={[
                      styles.emojiBtn,
                      itemFormData.icon === emoji && { backgroundColor: colors.primary + '30' },
                    ]}
                    onPress={() => setItemFormData(f => ({ ...f, icon: emoji }))}
                  >
                    <Text style={styles.emojiBtnText}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Title */}
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Title *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.text }]}
                value={itemFormData.title}
                onChangeText={text => setItemFormData(f => ({ ...f, title: text }))}
                placeholder="Item title"
                placeholderTextColor={colors.textSecondary}
              />

              {/* Subtitle */}
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Subtitle</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.text }]}
                value={itemFormData.subtitle}
                onChangeText={text => setItemFormData(f => ({ ...f, subtitle: text }))}
                placeholder="Optional subtitle"
                placeholderTextColor={colors.textSecondary}
              />

              {/* Navigation Path */}
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Navigation Path *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.text }]}
                value={itemFormData.navigationPath}
                onChangeText={text => setItemFormData(f => ({ ...f, navigationPath: text }))}
                placeholder="/offers?type=example"
                placeholderTextColor={colors.textSecondary}
              />

              {/* Gradient Colors */}
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Color</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.gradientRow}>
                {GRADIENT_PRESETS.map((gradient, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      styles.gradientBtn,
                      { backgroundColor: gradient[0] },
                      JSON.stringify(itemFormData.gradientColors) === JSON.stringify(gradient) && styles.gradientBtnSelected,
                    ]}
                    onPress={() => setItemFormData(f => ({ ...f, gradientColors: gradient }))}
                  />
                ))}
              </ScrollView>

              {/* Count Display */}
              <View style={styles.switchRow}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary, marginBottom: 0 }]}>
                  Show Count
                </Text>
                <Switch
                  value={itemFormData.showCount}
                  onValueChange={val => setItemFormData(f => ({ ...f, showCount: val }))}
                  trackColor={{ false: colors.gray300, true: colors.success }}
                />
              </View>

              {itemFormData.showCount && (
                <View style={styles.countRow}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Count</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.background, color: colors.text }]}
                      value={String(itemFormData.cachedCount || 0)}
                      onChangeText={text => setItemFormData(f => ({ ...f, cachedCount: parseInt(text) || 0 }))}
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Label</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.background, color: colors.text }]}
                      value={itemFormData.countLabel}
                      onChangeText={text => setItemFormData(f => ({ ...f, countLabel: text }))}
                      placeholder="offers"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>
                </View>
              )}

              {/* Verification (for exclusive tab) */}
              {itemFormData.tabType === 'exclusive' && (
                <>
                  <View style={styles.switchRow}>
                    <Text style={[styles.inputLabel, { color: colors.textSecondary, marginBottom: 0 }]}>
                      Requires Verification
                    </Text>
                    <Switch
                      value={itemFormData.requiresVerification}
                      onValueChange={val => setItemFormData(f => ({ ...f, requiresVerification: val }))}
                      trackColor={{ false: colors.gray300, true: colors.success }}
                    />
                  </View>

                  {itemFormData.requiresVerification && (
                    <>
                      <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Verification Type</Text>
                      <View style={styles.verificationTypes}>
                        {VERIFICATION_TYPES.filter(v => v.value !== 'none').map(vt => (
                          <TouchableOpacity
                            key={vt.value}
                            style={[
                              styles.verificationBtn,
                              itemFormData.verificationType === vt.value && { backgroundColor: colors.primary },
                            ]}
                            onPress={() => setItemFormData(f => ({ ...f, verificationType: vt.value }))}
                          >
                            <Text
                              style={[
                                styles.verificationBtnText,
                                { color: itemFormData.verificationType === vt.value ? colors.card : colors.text },
                              ]}
                            >
                              {vt.label}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </>
                  )}
                </>
              )}

              {/* Active */}
              <View style={styles.switchRow}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary, marginBottom: 0 }]}>
                  Active
                </Text>
                <Switch
                  value={itemFormData.isActive}
                  onValueChange={val => setItemFormData(f => ({ ...f, isActive: val }))}
                  trackColor={{ false: colors.gray300, true: colors.success }}
                />
              </View>
            </ScrollView>

            <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => { setShowItemModal(false); setEditingItem(null); }}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.saveBtn, { backgroundColor: colors.primary }]}
                onPress={handleSaveItem}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color={colors.card} />
                ) : (
                  <Text style={styles.saveBtnText}>{editingItem ? 'Update' : 'Create'}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  configBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  statCard: {
    width: 100,
    padding: 12,
    borderRadius: 12,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  tabsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 6,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 'auto',
  },
  listContent: {
    padding: 12,
    paddingBottom: 100,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  itemPreview: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemEmoji: {
    fontSize: 24,
  },
  itemInfo: {
    flex: 1,
    marginLeft: 12,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  itemSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  moveBtn: {
    padding: 4,
  },
  moveBtnDisabled: {
    opacity: 0.3,
  },
  itemSwitch: {
    marginHorizontal: 8,
    transform: [{ scale: 0.8 }],
  },
  actionBtn: {
    padding: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 14,
    marginTop: 12,
  },
  emptyBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 16,
  },
  emptyBtnText: {
    color: Colors.light.card,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  itemModalContent: {
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalBody: {
    padding: 16,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelBtn: {
    marginRight: 8,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  cancelBtnText: {
    fontWeight: '600',
    color: '#666',
  },
  saveBtn: {
    marginLeft: 8,
  },
  saveBtnText: {
    fontWeight: '600',
    color: Colors.light.card,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 10,
    padding: 4,
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
  },
  emojiRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  emojiBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  emojiBtnText: {
    fontSize: 22,
  },
  gradientRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  gradientBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  gradientBtnSelected: {
    borderColor: '#000',
  },
  countRow: {
    flexDirection: 'row',
  },
  verificationTypes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  verificationBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  verificationBtnText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
