import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity,
  useColorScheme, ActivityIndicator, Switch, TextInput, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { specialProfilesService, SpecialProfile } from '../../services/api/specialProfiles';
import { Colors } from '../../constants/Colors';
import { showAlert, showConfirm } from '../../utils/alert';

export default function SpecialProfilesScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';

  const [profiles, setProfiles] = useState<SpecialProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingProfile, setEditingProfile] = useState<SpecialProfile | null>(null);
  const [saving, setSaving] = useState(false);

  // Form
  const [formName, setFormName] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formIcon, setFormIcon] = useState('shield');
  const [formIconColor, setFormIconColor] = useState('#059669');
  const [formBgColor, setFormBgColor] = useState('#D1FAE5');
  const [formDescription, setFormDescription] = useState('');
  const [formVerificationRequired, setFormVerificationRequired] = useState('');
  const [formVerificationTime, setFormVerificationTime] = useState('24-48 hours');
  const [formDiscountRange, setFormDiscountRange] = useState('');
  const [formPriority, setFormPriority] = useState('0');
  const [formIsActive, setFormIsActive] = useState(true);

  const fetchProfiles = useCallback(async () => {
    try {
      const params: any = {};
      if (filter !== 'all') params.status = filter;
      if (search) params.search = search;
      const response = await specialProfilesService.getProfiles(params);
      if (response.success && response.data) setProfiles(response.data.profiles || []);
    } catch (error: any) { showAlert('Error', error.message || 'Failed to load'); }
    finally { setLoading(false); setRefreshing(false); }
  }, [filter, search]);

  useEffect(() => { fetchProfiles(); }, [fetchProfiles]);

  const resetForm = () => {
    setFormName(''); setFormSlug(''); setFormIcon('shield'); setFormIconColor('#059669');
    setFormBgColor('#D1FAE5'); setFormDescription(''); setFormVerificationRequired('');
    setFormVerificationTime('24-48 hours'); setFormDiscountRange(''); setFormPriority('0');
    setFormIsActive(true); setEditingProfile(null);
  };

  const openCreate = () => { resetForm(); setShowModal(true); };
  const openEdit = (p: SpecialProfile) => {
    setEditingProfile(p);
    setFormName(p.name); setFormSlug(p.slug); setFormIcon(p.icon); setFormIconColor(p.iconColor);
    setFormBgColor(p.backgroundColor); setFormDescription(p.description || '');
    setFormVerificationRequired(p.verificationRequired); setFormVerificationTime(p.verificationTime);
    setFormDiscountRange(p.discountRange || ''); setFormPriority(String(p.priority));
    setFormIsActive(p.isActive); setShowModal(true);
  };

  const handleSave = async () => {
    if (!formName || !formSlug || !formVerificationRequired) { showAlert('Error', 'Name, slug, and verification info are required'); return; }
    setSaving(true);
    try {
      const data: any = {
        name: formName, slug: formSlug, icon: formIcon, iconColor: formIconColor,
        backgroundColor: formBgColor, description: formDescription || undefined,
        verificationRequired: formVerificationRequired, verificationTime: formVerificationTime,
        discountRange: formDiscountRange || undefined, priority: parseInt(formPriority) || 0, isActive: formIsActive,
      };
      if (editingProfile) await specialProfilesService.updateProfile(editingProfile._id, data);
      else await specialProfilesService.createProfile(data);
      setShowModal(false); resetForm(); fetchProfiles();
      showAlert('Success', editingProfile ? 'Profile updated' : 'Profile created');
    } catch (error: any) { showAlert('Error', error.message || 'Failed to save'); }
    finally { setSaving(false); }
  };

  const handleToggle = async (p: SpecialProfile) => {
    try { await specialProfilesService.toggleProfile(p._id); fetchProfiles(); }
    catch (error: any) { showAlert('Error', error.message); }
  };

  const handleDelete = async (p: SpecialProfile) => {
    const confirmed = await showConfirm('Delete Profile', `Delete "${p.name}"?`);
    if (!confirmed) return;
    try { await specialProfilesService.deleteProfile(p._id); fetchProfiles(); showAlert('Success', 'Profile deleted'); }
    catch (error: any) { showAlert('Error', error.message); }
  };

  const stats = {
    total: profiles.length, active: profiles.filter(p => p.isActive).length, inactive: profiles.filter(p => !p.isActive).length,
  };

  if (loading) return <View style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator size="large" color={colors.tint} /></View>;

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchProfiles(); }} />}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.text }]}>Special Profiles</Text>
          <Text style={[styles.subtitle, { color: colors.icon }]}>Manage special access profiles</Text>
        </View>
        <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.tint }]} onPress={openCreate}>
          <Ionicons name="add" size={20} color="#FFF" />
          <Text style={styles.addBtnText}>Add Profile</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsRow}>
        {[{ label: 'Total', value: stats.total, color: '#3B82F6' }, { label: 'Active', value: stats.active, color: '#10B981' }, { label: 'Inactive', value: stats.inactive, color: '#EF4444' }].map((s) => (
          <View key={s.label} style={[styles.statCard, { backgroundColor: isDark ? '#1F2937' : '#FFF', borderColor: isDark ? '#374151' : '#E5E7EB' }]}>
            <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
            <Text style={[styles.statLabel, { color: colors.icon }]}>{s.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.filtersRow}>
        {(['all', 'active', 'inactive'] as const).map((f) => (
          <TouchableOpacity key={f} style={[styles.filterChip, filter === f && { backgroundColor: colors.tint }]} onPress={() => setFilter(f)}>
            <Text style={[styles.filterText, filter === f && { color: '#FFF' }]}>{f.charAt(0).toUpperCase() + f.slice(1)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={[styles.searchBar, { backgroundColor: isDark ? '#1F2937' : '#F3F4F6', borderColor: isDark ? '#374151' : '#E5E7EB' }]}>
        <Ionicons name="search" size={18} color={colors.icon} />
        <TextInput style={[styles.searchInput, { color: colors.text }]} placeholder="Search profiles..." placeholderTextColor={colors.icon} value={search} onChangeText={setSearch} />
      </View>

      {profiles.map((p) => (
        <View key={p._id} style={[styles.card, { backgroundColor: isDark ? '#1F2937' : '#FFF', borderColor: isDark ? '#374151' : '#E5E7EB' }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconBadge, { backgroundColor: p.backgroundColor }]}>
              <Ionicons name={(p.icon || 'shield') as any} size={20} color={p.iconColor} />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>{p.name}</Text>
              <Text style={[styles.cardMeta, { color: colors.icon }]}>{p.slug}</Text>
            </View>
            <Switch value={p.isActive} onValueChange={() => handleToggle(p)} />
          </View>
          {p.description && <Text style={[styles.cardDesc, { color: colors.icon }]} numberOfLines={2}>{p.description}</Text>}
          <View style={styles.tagRow}>
            <Text style={[styles.cardMeta, { color: colors.icon }]}>{p.offersCount} offers</Text>
            {p.discountRange && <View style={[styles.badge, { backgroundColor: '#10B98120' }]}><Text style={[styles.badgeText, { color: '#10B981' }]}>{p.discountRange}</Text></View>}
            <View style={[styles.badge, { backgroundColor: '#F59E0B20' }]}><Text style={[styles.badgeText, { color: '#F59E0B' }]}>{p.verificationTime}</Text></View>
          </View>
          <View style={styles.cardActions}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => openEdit(p)}><Ionicons name="pencil" size={16} color="#3B82F6" /></TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(p)}><Ionicons name="trash" size={16} color="#EF4444" /></TouchableOpacity>
          </View>
        </View>
      ))}

      {profiles.length === 0 && <View style={styles.emptyState}><Ionicons name="ribbon-outline" size={48} color={colors.icon} /><Text style={[styles.emptyText, { color: colors.icon }]}>No special profiles found</Text></View>}

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? '#1F2937' : '#FFF' }]}>
            <ScrollView>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{editingProfile ? 'Edit Profile' : 'Create Profile'}</Text>
              {[
                { label: 'Name *', value: formName, setter: setFormName },
                { label: 'Slug *', value: formSlug, setter: setFormSlug },
                { label: 'Icon', value: formIcon, setter: setFormIcon },
                { label: 'Icon Color', value: formIconColor, setter: setFormIconColor },
                { label: 'Background Color', value: formBgColor, setter: setFormBgColor },
                { label: 'Description', value: formDescription, setter: setFormDescription },
                { label: 'Verification Required *', value: formVerificationRequired, setter: setFormVerificationRequired },
                { label: 'Verification Time', value: formVerificationTime, setter: setFormVerificationTime },
                { label: 'Discount Range', value: formDiscountRange, setter: setFormDiscountRange },
                { label: 'Priority', value: formPriority, setter: setFormPriority, keyboard: 'number-pad' as const },
              ].map((field) => (
                <View key={field.label} style={styles.formField}>
                  <Text style={[styles.formLabel, { color: colors.text }]}>{field.label}</Text>
                  <TextInput
                    style={[styles.formInput, { color: colors.text, backgroundColor: isDark ? '#374151' : '#F3F4F6', borderColor: isDark ? '#4B5563' : '#D1D5DB' }]}
                    value={field.value} onChangeText={field.setter} placeholderTextColor={colors.icon} keyboardType={field.keyboard}
                  />
                </View>
              ))}
              <View style={styles.formField}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Active</Text>
                <Switch value={formIsActive} onValueChange={setFormIsActive} />
              </View>
              <View style={styles.modalActions}>
                <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#6B7280' }]} onPress={() => { setShowModal(false); resetForm(); }}><Text style={styles.modalBtnText}>Cancel</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.tint }]} onPress={handleSave} disabled={saving}>
                  {saving ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.modalBtnText}>{editingProfile ? 'Update' : 'Create'}</Text>}
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
  addBtnText: { color: '#FFF', fontWeight: '600', fontSize: 14 },
  statsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 12 },
  statCard: { flex: 1, padding: 12, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '700' },
  statLabel: { fontSize: 12, marginTop: 2 },
  filtersRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 12 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, backgroundColor: '#E5E7EB' },
  filterText: { fontSize: 13, fontWeight: '500', color: '#6B7280' },
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
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  modalBtnText: { color: '#FFF', fontWeight: '600', fontSize: 15 },
});
