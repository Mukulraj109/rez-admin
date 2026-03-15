import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity,
  useColorScheme, ActivityIndicator, Switch, TextInput, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { uploadBillStoresService, UploadBillStore } from '../../services/api/uploadBillStores';
import { Colors } from '../../constants/Colors';
import { showAlert, showConfirm } from '../../utils/alert';

export default function UploadBillStoresScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';

  const [stores, setStores] = useState<UploadBillStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingStore, setEditingStore] = useState<UploadBillStore | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formLogo, setFormLogo] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formCoinsPerRupee, setFormCoinsPerRupee] = useState('1');
  const [formMaxCoins, setFormMaxCoins] = useState('500');
  const [formMinBill, setFormMinBill] = useState('100');
  const [formVerificationRequired, setFormVerificationRequired] = useState(true);
  const [formVerificationTime, setFormVerificationTime] = useState('24-48 hours');
  const [formPriority, setFormPriority] = useState('0');
  const [formIsActive, setFormIsActive] = useState(true);

  const fetchStores = useCallback(async () => {
    try {
      const params: any = {};
      if (filter !== 'all') params.status = filter;
      if (search) params.search = search;
      const response = await uploadBillStoresService.getStores(params);
      if (response.success && response.data) {
        setStores(response.data.stores || []);
      }
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to load stores');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter, search]);

  useEffect(() => { fetchStores(); }, [fetchStores]);

  const resetForm = () => {
    setFormName(''); setFormLogo(''); setFormCategory(''); setFormCoinsPerRupee('1');
    setFormMaxCoins('500'); setFormMinBill('100'); setFormVerificationRequired(true);
    setFormVerificationTime('24-48 hours'); setFormPriority('0'); setFormIsActive(true);
    setEditingStore(null);
  };

  const openCreate = () => { resetForm(); setShowModal(true); };

  const openEdit = (store: UploadBillStore) => {
    setEditingStore(store);
    setFormName(store.name); setFormLogo(store.logo || ''); setFormCategory(store.category);
    setFormCoinsPerRupee(String(store.coinsPerRupee)); setFormMaxCoins(String(store.maxCoinsPerBill));
    setFormMinBill(String(store.minBillAmount)); setFormVerificationRequired(store.verificationRequired);
    setFormVerificationTime(store.verificationTime); setFormPriority(String(store.priority));
    setFormIsActive(store.isActive);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formName || !formCategory) { showAlert('Error', 'Name and category are required'); return; }
    setSaving(true);
    try {
      const data: any = {
        name: formName, logo: formLogo || undefined, category: formCategory,
        coinsPerRupee: parseFloat(formCoinsPerRupee) || 1, maxCoinsPerBill: parseInt(formMaxCoins) || 500,
        minBillAmount: parseInt(formMinBill) || 100, verificationRequired: formVerificationRequired,
        verificationTime: formVerificationTime, priority: parseInt(formPriority) || 0, isActive: formIsActive,
      };
      if (editingStore) {
        await uploadBillStoresService.updateStore(editingStore._id, data);
      } else {
        await uploadBillStoresService.createStore(data);
      }
      setShowModal(false); resetForm(); fetchStores();
      showAlert('Success', editingStore ? 'Store updated' : 'Store created');
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to save');
    } finally { setSaving(false); }
  };

  const handleToggle = async (store: UploadBillStore) => {
    try {
      await uploadBillStoresService.toggleStore(store._id);
      fetchStores();
    } catch (error: any) { showAlert('Error', error.message); }
  };

  const handleDelete = async (store: UploadBillStore) => {
    const confirmed = await showConfirm('Delete Store', `Delete "${store.name}"?`);
    if (!confirmed) return;
    try {
      await uploadBillStoresService.deleteStore(store._id);
      fetchStores(); showAlert('Success', 'Store deleted');
    } catch (error: any) { showAlert('Error', error.message); }
  };

  const stats = {
    total: stores.length,
    active: stores.filter(s => s.isActive).length,
    inactive: stores.filter(s => !s.isActive).length,
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchStores(); }} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.text }]}>Upload Bill Stores</Text>
          <Text style={[styles.subtitle, { color: colors.icon }]}>Manage bill upload cashback stores</Text>
        </View>
        <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.tint }]} onPress={openCreate}>
          <Ionicons name="add" size={20} color={colors.card} />
          <Text style={styles.addBtnText}>Add Store</Text>
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        {[
          { label: 'Total', value: stats.total, color: colors.info },
          { label: 'Active', value: stats.active, color: colors.success },
          { label: 'Inactive', value: stats.inactive, color: colors.error },
        ].map((stat) => (
          <View key={stat.label} style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
            <Text style={[styles.statLabel, { color: colors.icon }]}>{stat.label}</Text>
          </View>
        ))}
      </View>

      {/* Filters */}
      <View style={styles.filtersRow}>
        {(['all', 'active', 'inactive'] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, filter === f && { backgroundColor: colors.tint }]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && { color: colors.card }]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Search */}
      <View style={[styles.searchBar, { backgroundColor: colors.background, borderColor: colors.border }]}>
        <Ionicons name="search" size={18} color={colors.icon} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search stores..." placeholderTextColor={colors.icon}
          value={search} onChangeText={setSearch}
        />
      </View>

      {/* Store Cards */}
      {stores.map((store) => (
        <View key={store._id} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.cardHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>{store.name}</Text>
              <Text style={[styles.cardMeta, { color: colors.icon }]}>{store.category}</Text>
            </View>
            <Switch value={store.isActive} onValueChange={() => handleToggle(store)} />
          </View>
          <View style={styles.cardDetails}>
            <View style={styles.detailItem}>
              <Text style={[styles.detailLabel, { color: colors.icon }]}>Coins/Rupee</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>{store.coinsPerRupee}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={[styles.detailLabel, { color: colors.icon }]}>Max Coins</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>{store.maxCoinsPerBill}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={[styles.detailLabel, { color: colors.icon }]}>Min Bill</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>{store.minBillAmount}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={[styles.detailLabel, { color: colors.icon }]}>Uploads</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>{store.totalUploads}</Text>
            </View>
          </View>
          <View style={styles.cardActions}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => openEdit(store)}>
              <Ionicons name="pencil" size={16} color={colors.info} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(store)}>
              <Ionicons name="trash" size={16} color={colors.error} />
            </TouchableOpacity>
          </View>
        </View>
      ))}

      {stores.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="document-text-outline" size={48} color={colors.icon} />
          <Text style={[styles.emptyText, { color: colors.icon }]}>No upload bill stores found</Text>
        </View>
      )}

      {/* Create/Edit Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <ScrollView>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {editingStore ? 'Edit Store' : 'Create Store'}
              </Text>
              {[
                { label: 'Store Name *', value: formName, setter: setFormName, placeholder: 'Store name' },
                { label: 'Logo URL', value: formLogo, setter: setFormLogo, placeholder: 'https://...' },
                { label: 'Category *', value: formCategory, setter: setFormCategory, placeholder: 'e.g. restaurants' },
                { label: 'Coins Per Rupee', value: formCoinsPerRupee, setter: setFormCoinsPerRupee, placeholder: '1', keyboard: 'decimal-pad' as const },
                { label: 'Max Coins Per Bill', value: formMaxCoins, setter: setFormMaxCoins, placeholder: '500', keyboard: 'number-pad' as const },
                { label: 'Min Bill Amount', value: formMinBill, setter: setFormMinBill, placeholder: '100', keyboard: 'number-pad' as const },
                { label: 'Verification Time', value: formVerificationTime, setter: setFormVerificationTime, placeholder: '24-48 hours' },
                { label: 'Priority', value: formPriority, setter: setFormPriority, placeholder: '0', keyboard: 'number-pad' as const },
              ].map((field) => (
                <View key={field.label} style={styles.formField}>
                  <Text style={[styles.formLabel, { color: colors.text }]}>{field.label}</Text>
                  <TextInput
                    style={[styles.formInput, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
                    value={field.value} onChangeText={field.setter}
                    placeholder={field.placeholder} placeholderTextColor={colors.icon}
                    keyboardType={field.keyboard}
                  />
                </View>
              ))}
              <View style={styles.formField}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Verification Required</Text>
                <Switch value={formVerificationRequired} onValueChange={setFormVerificationRequired} />
              </View>
              <View style={styles.formField}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Active</Text>
                <Switch value={formIsActive} onValueChange={setFormIsActive} />
              </View>
              <View style={styles.modalActions}>
                <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.secondaryText }]} onPress={() => { setShowModal(false); resetForm(); }}>
                  <Text style={styles.modalBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.tint }]} onPress={handleSave} disabled={saving}>
                  {saving ? <ActivityIndicator color={colors.card} size="small" /> : <Text style={styles.modalBtnText}>{editingStore ? 'Update' : 'Create'}</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  title: { fontSize: 24, fontWeight: '700' },
  subtitle: { fontSize: 14, marginTop: 2 },
  addBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, gap: 4 },
  addBtnText: { color: Colors.light.card, fontWeight: '600', fontSize: 14 },
  statsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 12 },
  statCard: { flex: 1, padding: 12, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '700' },
  statLabel: { fontSize: 12, marginTop: 2 },
  filtersRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 12 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, backgroundColor: Colors.light.border },
  filterText: { fontSize: 13, fontWeight: '500', color: Colors.light.secondaryText },
  searchBar: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, padding: 10, borderRadius: 10, borderWidth: 1, marginBottom: 12, gap: 8 },
  searchInput: { flex: 1, fontSize: 14 },
  card: { marginHorizontal: 16, marginBottom: 12, borderRadius: 12, borderWidth: 1, padding: 14 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  cardTitle: { fontSize: 16, fontWeight: '600' },
  cardMeta: { fontSize: 12, marginTop: 2 },
  cardDetails: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 10 },
  detailItem: {},
  detailLabel: { fontSize: 11 },
  detailValue: { fontSize: 14, fontWeight: '600' },
  cardActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  actionBtn: { padding: 6 },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 15, marginTop: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { borderRadius: 16, padding: 20, maxHeight: '85%' },
  modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 16 },
  formField: { marginBottom: 14 },
  formLabel: { fontSize: 13, fontWeight: '500', marginBottom: 6 },
  formInput: { borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 14 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  modalBtnText: { color: Colors.light.card, fontWeight: '600', fontSize: 15 },
});
