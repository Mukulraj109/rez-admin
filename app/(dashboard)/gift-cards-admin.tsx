import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, SafeAreaView, RefreshControl, useColorScheme,
  Modal, Switch, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { showAlert, showConfirm } from '../../utils/alert';
import { apiClient } from '../../services/api/apiClient';

// ============================================
// TYPES & CONSTANTS
// ============================================
interface GiftCard {
  _id: string; name: string; description?: string; category: string;
  color: string; logo?: string; denominations: number[];
  cashbackPercentage: number; validityDays: number;
  termsAndConditions?: string; storeId?: string; isActive: boolean;
}
interface GiftCardFormData {
  name: string; description: string; category: string; color: string;
  logo: string; denominations: string; cashbackPercentage: string;
  validityDays: string; termsAndConditions: string; storeId: string; isActive: boolean;
}
const CATEGORIES = ['All', 'Food', 'Shopping', 'Entertainment', 'Travel', 'Beauty', 'Other'];
const CAT_COLORS: Record<string, string> = {
  Food: '#F97316', Shopping: '#8B5CF6', Entertainment: '#EC4899',
  Travel: '#06B6D4', Beauty: '#F43F5E', Other: '#6B7280',
};
const DEFAULT_FORM: GiftCardFormData = {
  name: '', description: '', category: 'Other', color: '#3B82F6', logo: '',
  denominations: '', cashbackPercentage: '', validityDays: '365',
  termsAndConditions: '', storeId: '', isActive: true,
};

// ============================================
// MAIN COMPONENT
// ============================================
export default function GiftCardsAdminScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [cards, setCards] = useState<GiftCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showActiveOnly, setShowActiveOnly] = useState<boolean | undefined>(undefined);
  const [showFormModal, setShowFormModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingCard, setEditingCard] = useState<GiftCard | null>(null);
  const [formData, setFormData] = useState<GiftCardFormData>(DEFAULT_FORM);

  // DATA LOADING
  const loadCards = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedCategory !== 'All') params.set('category', selectedCategory);
      if (showActiveOnly !== undefined) params.set('isActive', String(showActiveOnly));
      const q = params.toString();
      const response = await apiClient.get(`admin/gift-cards${q ? `?${q}` : ''}`);
      if (!response.success) throw new Error(response.message || 'Failed to load gift cards');
      setCards(response.data?.giftCards || response.data || []);
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to load gift cards');
    } finally { setLoading(false); setRefreshing(false); }
  }, [selectedCategory, showActiveOnly]);

  useEffect(() => { loadCards(); }, [loadCards]);
  const onRefresh = useCallback(() => { setRefreshing(true); loadCards(); }, [loadCards]);

  // ACTIONS
  const handleCreate = () => { setEditingCard(null); setFormData({ ...DEFAULT_FORM }); setShowFormModal(true); };

  const handleEdit = (card: GiftCard) => {
    setEditingCard(card);
    setFormData({
      name: card.name, description: card.description || '', category: card.category,
      color: card.color || '#3B82F6', logo: card.logo || '',
      denominations: (card.denominations || []).join(', '),
      cashbackPercentage: String(card.cashbackPercentage || ''),
      validityDays: String(card.validityDays || 365),
      termsAndConditions: card.termsAndConditions || '',
      storeId: card.storeId || '', isActive: card.isActive,
    });
    setShowFormModal(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) { showAlert('Error', 'Name is required'); return; }
    const denoms = formData.denominations.split(',').map(s => Number(s.trim())).filter(n => n > 0);
    if (denoms.length === 0) { showAlert('Error', 'At least one valid denomination is required'); return; }
    try {
      setIsSaving(true);
      const payload = {
        name: formData.name.trim(), description: formData.description.trim() || undefined,
        category: formData.category, color: formData.color,
        logo: formData.logo.trim() || undefined, denominations: denoms,
        cashbackPercentage: Number(formData.cashbackPercentage) || 0,
        validityDays: Number(formData.validityDays) || 365,
        termsAndConditions: formData.termsAndConditions.trim() || undefined,
        storeId: formData.storeId.trim() || undefined, isActive: formData.isActive,
      };
      if (editingCard) {
        const res = await apiClient.put(`admin/gift-cards/${editingCard._id}`, payload);
        if (!res.success) throw new Error(res.message || 'Failed to update');
        showAlert('Success', 'Gift card updated');
      } else {
        const res = await apiClient.post('admin/gift-cards', payload);
        if (!res.success) throw new Error(res.message || 'Failed to create');
        showAlert('Success', 'Gift card created');
      }
      setShowFormModal(false); loadCards();
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to save gift card');
    } finally { setIsSaving(false); }
  };

  const handleDeactivate = (card: GiftCard) => {
    showConfirm('Deactivate Gift Card', `Are you sure you want to deactivate "${card.name}"?`, async () => {
      try {
        const res = await apiClient.delete(`admin/gift-cards/${card._id}`);
        if (!res.success) throw new Error(res.message || 'Failed to deactivate');
        showAlert('Success', 'Gift card deactivated'); loadCards();
      } catch (error: any) { showAlert('Error', error.message || 'Failed to deactivate'); }
    });
  };

  // RENDERERS
  const renderCard = ({ item }: { item: GiftCard }) => {
    const catColor = CAT_COLORS[item.category] || '#6B7280';
    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.colorStrip, { backgroundColor: item.color || catColor }]} />
        <View style={styles.cardBody}>
          <View style={styles.cardTopRow}>
            <Text style={[styles.cardName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
            <View style={[styles.catBadge, { backgroundColor: `${catColor}18` }]}>
              <Text style={[styles.catBadgeText, { color: catColor }]}>{item.category}</Text>
            </View>
          </View>
          <View style={styles.denomRow}>
            {(item.denominations || []).slice(0, 6).map((d, i) => (
              <View key={i} style={[styles.denomPill, { backgroundColor: colors.background }]}>
                <Text style={styles.denomText}>{d}</Text>
              </View>
            ))}
            {(item.denominations || []).length > 6 && (
              <Text style={styles.moreText}>+{item.denominations.length - 6}</Text>
            )}
          </View>
          <View style={styles.metaRow}>
            {item.cashbackPercentage > 0 && (
              <View style={styles.cashbackBadge}>
                <Text style={styles.cashbackText}>{item.cashbackPercentage}% cashback</Text>
              </View>
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
            {item.isActive && (
              <TouchableOpacity style={styles.actionBtn} onPress={() => handleDeactivate(item)}>
                <Ionicons name="close-circle-outline" size={18} color="#EF4444" />
                <Text style={[styles.actionText, { color: '#EF4444' }]}>Deactivate</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  const inp = (key: keyof GiftCardFormData, ph: string, opts?: { multi?: boolean; num?: boolean }) => (
    <TextInput
      style={[styles.formInput, opts?.multi && styles.multiline, { color: colors.text, borderColor: colors.border }]}
      value={String(formData[key])}
      onChangeText={(v) => setFormData(p => ({ ...p, [key]: v }))}
      placeholder={ph} placeholderTextColor="#9CA3AF"
      multiline={opts?.multi} keyboardType={opts?.num ? 'numeric' : 'default'}
    />
  );

  // FORM MODAL
  const renderFormModal = () => (
    <Modal visible={showFormModal} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowFormModal(false)}>
            <Ionicons name="close" size={28} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: colors.text }]}>
            {editingCard ? 'Edit Gift Card' : 'New Gift Card'}
          </Text>
          <TouchableOpacity onPress={handleSave} disabled={isSaving}>
            {isSaving ? <ActivityIndicator size="small" color="#3B82F6" /> : <Text style={styles.saveBtn}>Save</Text>}
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.formScroll} contentContainerStyle={{ paddingBottom: 40 }}>
          <Text style={styles.formLabel}>Name</Text>
          {inp('name', 'e.g. Swiggy Gift Card')}
          <Text style={styles.formLabel}>Description</Text>
          {inp('description', 'Short description', { multi: true })}
          <Text style={styles.formLabel}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 6 }}>
            {CATEGORIES.filter(c => c !== 'All').map(cat => (
              <TouchableOpacity key={cat}
                style={[styles.filterChip, formData.category === cat && styles.filterChipActive]}
                onPress={() => setFormData(p => ({ ...p, category: cat }))}>
                <Text style={[styles.chipText, formData.category === cat && styles.chipTextActive]}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <Text style={styles.formLabel}>Color (hex)</Text>
          <View style={styles.colorRow}>
            <TextInput style={[styles.formInput, { flex: 1, color: colors.text, borderColor: colors.border }]}
              value={formData.color} onChangeText={(v) => setFormData(p => ({ ...p, color: v }))}
              placeholder="#3B82F6" placeholderTextColor="#9CA3AF" />
            <View style={[styles.colorBox, { backgroundColor: formData.color || '#CCC' }]} />
          </View>
          <Text style={styles.formLabel}>Logo URL</Text>
          {inp('logo', 'https://...')}
          <Text style={styles.formLabel}>Denominations (comma-separated)</Text>
          {inp('denominations', '100, 250, 500, 1000')}
          <Text style={styles.formLabel}>Cashback %</Text>
          {inp('cashbackPercentage', '5', { num: true })}
          <Text style={styles.formLabel}>Validity Days</Text>
          {inp('validityDays', '365', { num: true })}
          <Text style={styles.formLabel}>Terms & Conditions</Text>
          {inp('termsAndConditions', 'Enter terms...', { multi: true })}
          <Text style={styles.formLabel}>Store ID (optional)</Text>
          {inp('storeId', 'MongoDB ObjectId')}
          <View style={styles.switchRow}>
            <Text style={styles.formLabel}>Active</Text>
            <Switch value={formData.isActive} onValueChange={(v) => setFormData(p => ({ ...p, isActive: v }))}
              trackColor={{ false: '#E2E8F0', true: '#3B82F6' }} thumbColor="#FFFFFF" />
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  // MAIN RENDER
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Gift Cards</Text>
        <TouchableOpacity style={styles.createBtn} onPress={handleCreate}>
          <Ionicons name="add" size={20} color="#FFFFFF" />
          <Text style={styles.createBtnText}>Add Gift Card</Text>
        </TouchableOpacity>
      </View>
      <View style={[styles.filtersBar, { backgroundColor: colors.card }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          {CATEGORIES.map(cat => (
            <TouchableOpacity key={cat}
              style={[styles.filterChip, selectedCategory === cat && styles.filterChipActive]}
              onPress={() => setSelectedCategory(cat)}>
              <Text style={[styles.chipText, selectedCategory === cat && styles.chipTextActive]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <View style={styles.toggleRow}>
          <Text style={{ fontSize: 12, color: '#6B7280', marginRight: 6 }}>Active only</Text>
          <Switch value={showActiveOnly === true}
            onValueChange={(v) => setShowActiveOnly(v ? true : undefined)}
            trackColor={{ false: '#E2E8F0', true: '#10B981' }} thumbColor="#FFFFFF" />
        </View>
      </View>
      <FlatList data={cards} renderItem={renderCard} keyExtractor={(item) => item._id}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={loading
          ? <ActivityIndicator size="large" color="#3B82F6" style={{ paddingVertical: 40 }} />
          : <View style={styles.emptyBox}><Ionicons name="gift-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyText}>No gift cards found</Text></View>} />
      {renderFormModal()}
    </View>
  );
}

// ============================================
// STYLES
// ============================================
const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  headerTitle: { fontSize: 22, fontWeight: '700' },
  createBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#3B82F6', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, gap: 4 },
  createBtnText: { color: '#FFF', fontWeight: '600', fontSize: 14 },
  filtersBar: { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  filterRow: { flexDirection: 'row', marginBottom: 6 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#F3F4F6', marginRight: 8 },
  filterChipActive: { backgroundColor: '#3B82F6' },
  chipText: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
  chipTextActive: { color: '#FFF', fontWeight: '600' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  card: { borderRadius: 12, marginBottom: 10, borderWidth: 1, flexDirection: 'row', overflow: 'hidden' },
  colorStrip: { width: 5 },
  cardBody: { flex: 1, padding: 14 },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  cardName: { fontSize: 15, fontWeight: '600', flex: 1, marginRight: 8 },
  catBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  catBadgeText: { fontSize: 11, fontWeight: '600' },
  denomRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  denomPill: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  denomText: { fontSize: 11, fontWeight: '600', color: '#374151' },
  moreText: { fontSize: 11, color: '#9CA3AF', alignSelf: 'center' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  cashbackBadge: { backgroundColor: '#D1FAE5', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  cashbackText: { fontSize: 11, fontWeight: '600', color: '#059669' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  activeBg: { backgroundColor: '#D1FAE5' },
  inactiveBg: { backgroundColor: '#F3F4F6' },
  cardActions: { flexDirection: 'row', gap: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 10 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingVertical: 4, paddingHorizontal: 6 },
  actionText: { fontSize: 12, fontWeight: '500' },
  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  modalTitle: { fontSize: 17, fontWeight: '600' },
  saveBtn: { fontSize: 16, fontWeight: '600', color: '#3B82F6' },
  formScroll: { paddingHorizontal: 20 },
  formLabel: { fontSize: 13, fontWeight: '500', color: '#6B7280', marginTop: 10, marginBottom: 4 },
  formInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  multiline: { minHeight: 70, textAlignVertical: 'top' },
  colorRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  colorBox: { width: 32, height: 32, borderRadius: 6, borderWidth: 1, borderColor: '#E5E7EB' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  emptyBox: { paddingVertical: 40, alignItems: 'center' },
  emptyText: { fontSize: 14, color: '#9CA3AF', marginTop: 10 },
});
