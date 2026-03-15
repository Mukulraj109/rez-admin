import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity,
  useColorScheme, ActivityIndicator, Switch, TextInput, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { exclusiveZonesService, ExclusiveZone } from '../../services/api/exclusiveZones';
import { Colors } from '../../constants/Colors';
import { showAlert, showConfirm } from '../../utils/alert';

const ELIGIBILITY_TYPES = ['corporate_email', 'gender', 'birthday_month', 'student', 'age', 'verification'];

export default function ExclusiveZonesScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';

  const [zones, setZones] = useState<ExclusiveZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingZone, setEditingZone] = useState<ExclusiveZone | null>(null);
  const [saving, setSaving] = useState(false);

  // Form
  const [formName, setFormName] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formIcon, setFormIcon] = useState('gift');
  const [formIconColor, setFormIconColor] = useState(colors.emerald);
  const [formBgColor, setFormBgColor] = useState(colors.successLight);
  const [formDescription, setFormDescription] = useState('');
  const [formEligibilityType, setFormEligibilityType] = useState('student');
  const [formEligibilityDetails, setFormEligibilityDetails] = useState('');
  const [formVerificationRequired, setFormVerificationRequired] = useState(false);
  const [formPriority, setFormPriority] = useState('0');
  const [formIsActive, setFormIsActive] = useState(true);

  const fetchZones = useCallback(async () => {
    try {
      const params: any = {};
      if (filter !== 'all') params.status = filter;
      if (search) params.search = search;
      const response = await exclusiveZonesService.getZones(params);
      if (response.success && response.data) {
        setZones(response.data.zones || []);
      }
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to load zones');
    } finally { setLoading(false); setRefreshing(false); }
  }, [filter, search]);

  useEffect(() => { fetchZones(); }, [fetchZones]);

  const resetForm = () => {
    setFormName(''); setFormSlug(''); setFormIcon('gift'); setFormIconColor(colors.emerald);
    setFormBgColor(colors.successLight); setFormDescription(''); setFormEligibilityType('student');
    setFormEligibilityDetails(''); setFormVerificationRequired(false); setFormPriority('0');
    setFormIsActive(true); setEditingZone(null);
  };

  const openCreate = () => { resetForm(); setShowModal(true); };

  const openEdit = (zone: ExclusiveZone) => {
    setEditingZone(zone);
    setFormName(zone.name); setFormSlug(zone.slug); setFormIcon(zone.icon);
    setFormIconColor(zone.iconColor); setFormBgColor(zone.backgroundColor);
    setFormDescription(zone.description || ''); setFormEligibilityType(zone.eligibilityType);
    setFormEligibilityDetails(zone.eligibilityDetails || '');
    setFormVerificationRequired(zone.verificationRequired); setFormPriority(String(zone.priority));
    setFormIsActive(zone.isActive); setShowModal(true);
  };

  const handleSave = async () => {
    if (!formName || !formSlug || !formEligibilityType) { showAlert('Error', 'Name, slug, and eligibility type are required'); return; }
    setSaving(true);
    try {
      const data: any = {
        name: formName, slug: formSlug, icon: formIcon, iconColor: formIconColor,
        backgroundColor: formBgColor, description: formDescription || undefined,
        eligibilityType: formEligibilityType, eligibilityDetails: formEligibilityDetails || undefined,
        verificationRequired: formVerificationRequired, priority: parseInt(formPriority) || 0, isActive: formIsActive,
      };
      if (editingZone) await exclusiveZonesService.updateZone(editingZone._id, data);
      else await exclusiveZonesService.createZone(data);
      setShowModal(false); resetForm(); fetchZones();
      showAlert('Success', editingZone ? 'Zone updated' : 'Zone created');
    } catch (error: any) { showAlert('Error', error.message || 'Failed to save'); }
    finally { setSaving(false); }
  };

  const handleToggle = async (zone: ExclusiveZone) => {
    try { await exclusiveZonesService.toggleZone(zone._id); fetchZones(); }
    catch (error: any) { showAlert('Error', error.message); }
  };

  const handleDelete = async (zone: ExclusiveZone) => {
    const confirmed = await showConfirm('Delete Zone', `Delete "${zone.name}"?`);
    if (!confirmed) return;
    try { await exclusiveZonesService.deleteZone(zone._id); fetchZones(); showAlert('Success', 'Zone deleted'); }
    catch (error: any) { showAlert('Error', error.message); }
  };

  const stats = {
    total: zones.length,
    active: zones.filter(z => z.isActive).length,
    inactive: zones.filter(z => !z.isActive).length,
  };

  const getEligibilityColor = (type: string) => {
    const map: Record<string, string> = {
      student: colors.info, corporate_email: colors.purple, gender: colors.pink,
      birthday_month: colors.warning, age: colors.success, verification: colors.indigo,
    };
    return map[type] || colors.mutedDark;
  };

  if (loading) {
    return <View style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator size="large" color={colors.tint} /></View>;
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchZones(); }} />}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.text }]}>Exclusive Zones</Text>
          <Text style={[styles.subtitle, { color: colors.icon }]}>Manage exclusive access zones</Text>
        </View>
        <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.tint }]} onPress={openCreate}>
          <Ionicons name="add" size={20} color={colors.card} />
          <Text style={styles.addBtnText}>Add Zone</Text>
        </TouchableOpacity>
      </View>

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

      <View style={styles.filtersRow}>
        {(['all', 'active', 'inactive'] as const).map((f) => (
          <TouchableOpacity key={f} style={[styles.filterChip, filter === f && { backgroundColor: colors.tint }]} onPress={() => setFilter(f)}>
            <Text style={[styles.filterText, filter === f && { color: colors.card }]}>{f.charAt(0).toUpperCase() + f.slice(1)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={[styles.searchBar, { backgroundColor: colors.background, borderColor: colors.border }]}>
        <Ionicons name="search" size={18} color={colors.icon} />
        <TextInput style={[styles.searchInput, { color: colors.text }]} placeholder="Search zones..." placeholderTextColor={colors.icon} value={search} onChangeText={setSearch} />
      </View>

      {zones.map((zone) => (
        <View key={zone._id} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconBadge, { backgroundColor: zone.backgroundColor }]}>
              <Ionicons name={(zone.icon || 'gift') as any} size={20} color={zone.iconColor} />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>{zone.name}</Text>
              <Text style={[styles.cardMeta, { color: colors.icon }]}>{zone.slug}</Text>
            </View>
            <Switch value={zone.isActive} onValueChange={() => handleToggle(zone)} />
          </View>
          {zone.description ? <Text style={[styles.cardDesc, { color: colors.icon }]} numberOfLines={2}>{zone.description}</Text> : null}
          <View style={styles.tagRow}>
            <View style={[styles.badge, { backgroundColor: getEligibilityColor(zone.eligibilityType) + '20' }]}>
              <Text style={[styles.badgeText, { color: getEligibilityColor(zone.eligibilityType) }]}>{zone.eligibilityType.replace('_', ' ')}</Text>
            </View>
            <Text style={[styles.cardMeta, { color: colors.icon }]}>{zone.offersCount} offers</Text>
            {zone.verificationRequired && (
              <View style={[styles.badge, { backgroundColor: `${colors.warning}20` }]}>
                <Text style={[styles.badgeText, { color: colors.warning }]}>Verification Required</Text>
              </View>
            )}
          </View>
          <View style={styles.cardActions}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => openEdit(zone)}><Ionicons name="pencil" size={16} color={colors.info} /></TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(zone)}><Ionicons name="trash" size={16} color={colors.error} /></TouchableOpacity>
          </View>
        </View>
      ))}

      {zones.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="shield-checkmark-outline" size={48} color={colors.icon} />
          <Text style={[styles.emptyText, { color: colors.icon }]}>No exclusive zones found</Text>
        </View>
      )}

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <ScrollView>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{editingZone ? 'Edit Zone' : 'Create Zone'}</Text>
              {[
                { label: 'Name *', value: formName, setter: setFormName },
                { label: 'Slug *', value: formSlug, setter: setFormSlug },
                { label: 'Icon', value: formIcon, setter: setFormIcon },
                { label: 'Icon Color', value: formIconColor, setter: setFormIconColor },
                { label: 'Background Color', value: formBgColor, setter: setFormBgColor },
                { label: 'Description', value: formDescription, setter: setFormDescription },
                { label: 'Eligibility Details', value: formEligibilityDetails, setter: setFormEligibilityDetails },
                { label: 'Priority', value: formPriority, setter: setFormPriority, keyboard: 'number-pad' as const },
              ].map((field) => (
                <View key={field.label} style={styles.formField}>
                  <Text style={[styles.formLabel, { color: colors.text }]}>{field.label}</Text>
                  <TextInput
                    style={[styles.formInput, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
                    value={field.value} onChangeText={field.setter} placeholderTextColor={colors.icon} keyboardType={field.keyboard}
                  />
                </View>
              ))}
              <View style={styles.formField}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Eligibility Type *</Text>
                <View style={styles.typeRow}>
                  {ELIGIBILITY_TYPES.map((t) => (
                    <TouchableOpacity key={t} style={[styles.typeChip, formEligibilityType === t && { backgroundColor: colors.tint }]} onPress={() => setFormEligibilityType(t)}>
                      <Text style={[styles.typeChipText, formEligibilityType === t && { color: colors.card }]}>{t.replace('_', ' ')}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
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
                  {saving ? <ActivityIndicator color={colors.card} size="small" /> : <Text style={styles.modalBtnText}>{editingZone ? 'Update' : 'Create'}</Text>}
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
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  iconBadge: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '600' },
  cardMeta: { fontSize: 12, marginTop: 2 },
  cardDesc: { fontSize: 13, marginBottom: 8 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 11, fontWeight: '600' },
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
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  typeChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, backgroundColor: Colors.light.border },
  typeChipText: { fontSize: 12, fontWeight: '500', color: Colors.light.secondaryText },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  modalBtnText: { color: Colors.light.card, fontWeight: '600', fontSize: 15 },
});
