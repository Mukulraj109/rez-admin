import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity,
  useColorScheme, ActivityIndicator, Switch, TextInput, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { loyaltyMilestonesService, LoyaltyMilestone } from '../../services/api/loyaltyMilestones';
import { Colors } from '../../constants/Colors';
import { showAlert, showConfirm } from '../../utils/alert';

const TARGET_TYPES = ['orders', 'spend', 'referrals', 'reviews', 'checkins', 'purchases'];
const REWARD_TYPES = ['coins', 'badge', 'discount', 'freebie', 'tier_upgrade'];
const TIERS = ['bronze', 'silver', 'gold', 'platinum'];

export default function LoyaltyMilestonesScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';

  const [milestones, setMilestones] = useState<LoyaltyMilestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<LoyaltyMilestone | null>(null);
  const [saving, setSaving] = useState(false);

  // Form
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formTargetType, setFormTargetType] = useState('orders');
  const [formTargetValue, setFormTargetValue] = useState('');
  const [formReward, setFormReward] = useState('');
  const [formRewardType, setFormRewardType] = useState('coins');
  const [formRewardCoins, setFormRewardCoins] = useState('');
  const [formRewardDiscount, setFormRewardDiscount] = useState('');
  const [formIcon, setFormIcon] = useState('trophy');
  const [formColor, setFormColor] = useState(colors.warning);
  const [formTier, setFormTier] = useState('');
  const [formOrder, setFormOrder] = useState('0');
  const [formIsActive, setFormIsActive] = useState(true);

  const fetchMilestones = useCallback(async () => {
    try {
      const params: any = {};
      if (filter !== 'all') params.status = filter;
      if (search) params.search = search;
      const response = await loyaltyMilestonesService.getMilestones(params);
      if (response.success && response.data) setMilestones(response.data.milestones || []);
    } catch (error: any) { showAlert('Error', error.message || 'Failed to load'); }
    finally { setLoading(false); setRefreshing(false); }
  }, [filter, search]);

  useEffect(() => { fetchMilestones(); }, [fetchMilestones]);

  const resetForm = () => {
    setFormTitle(''); setFormDescription(''); setFormTargetType('orders'); setFormTargetValue('');
    setFormReward(''); setFormRewardType('coins'); setFormRewardCoins(''); setFormRewardDiscount('');
    setFormIcon('trophy'); setFormColor(colors.warning); setFormTier(''); setFormOrder('0');
    setFormIsActive(true); setEditingMilestone(null);
  };

  const openCreate = () => { resetForm(); setShowModal(true); };
  const openEdit = (m: LoyaltyMilestone) => {
    setEditingMilestone(m);
    setFormTitle(m.title); setFormDescription(m.description); setFormTargetType(m.targetType);
    setFormTargetValue(String(m.targetValue)); setFormReward(m.reward); setFormRewardType(m.rewardType);
    setFormRewardCoins(m.rewardCoins ? String(m.rewardCoins) : ''); setFormRewardDiscount(m.rewardDiscount ? String(m.rewardDiscount) : '');
    setFormIcon(m.icon); setFormColor(m.color); setFormTier(m.tier || ''); setFormOrder(String(m.order));
    setFormIsActive(m.isActive); setShowModal(true);
  };

  const handleSave = async () => {
    if (!formTitle || !formDescription || !formTargetValue || !formReward || !formRewardType) {
      showAlert('Error', 'Title, description, target value, reward, and reward type are required'); return;
    }
    setSaving(true);
    try {
      const data: any = {
        title: formTitle, description: formDescription, targetType: formTargetType,
        targetValue: parseInt(formTargetValue), reward: formReward, rewardType: formRewardType,
        rewardCoins: formRewardCoins ? parseInt(formRewardCoins) : undefined,
        rewardDiscount: formRewardDiscount ? parseInt(formRewardDiscount) : undefined,
        icon: formIcon, color: formColor, tier: formTier || undefined,
        order: parseInt(formOrder) || 0, isActive: formIsActive,
      };
      if (editingMilestone) await loyaltyMilestonesService.updateMilestone(editingMilestone._id, data);
      else await loyaltyMilestonesService.createMilestone(data);
      setShowModal(false); resetForm(); fetchMilestones();
      showAlert('Success', editingMilestone ? 'Milestone updated' : 'Milestone created');
    } catch (error: any) { showAlert('Error', error.message || 'Failed to save'); }
    finally { setSaving(false); }
  };

  const handleToggle = async (m: LoyaltyMilestone) => {
    try { await loyaltyMilestonesService.toggleMilestone(m._id); fetchMilestones(); }
    catch (error: any) { showAlert('Error', error.message); }
  };

  const handleDelete = async (m: LoyaltyMilestone) => {
    const confirmed = await showConfirm('Delete Milestone', `Delete "${m.title}"?`);
    if (!confirmed) return;
    try { await loyaltyMilestonesService.deleteMilestone(m._id); fetchMilestones(); showAlert('Success', 'Milestone deleted'); }
    catch (error: any) { showAlert('Error', error.message); }
  };

  const getTierColor = (tier?: string) => {
    const map: Record<string, string> = { bronze: colors.bronze, silver: '#C0C0C0', gold: colors.goldBright, platinum: '#E5E4E2' };
    return map[tier || ''] || colors.mutedDark;
  };

  const stats = {
    total: milestones.length, active: milestones.filter(m => m.isActive).length, inactive: milestones.filter(m => !m.isActive).length,
  };

  if (loading) return <View style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator size="large" color={colors.tint} /></View>;

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchMilestones(); }} />}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.text }]}>Loyalty Milestones</Text>
          <Text style={[styles.subtitle, { color: colors.icon }]}>Manage loyalty program milestones</Text>
        </View>
        <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.tint }]} onPress={openCreate}>
          <Ionicons name="add" size={20} color={colors.card} />
          <Text style={styles.addBtnText}>Add Milestone</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsRow}>
        {[{ label: 'Total', value: stats.total, color: colors.info }, { label: 'Active', value: stats.active, color: colors.success }, { label: 'Inactive', value: stats.inactive, color: colors.error }].map((s) => (
          <View key={s.label} style={[styles.statCard, { backgroundColor: isDark ? colors.gray800 : colors.card, borderColor: isDark ? colors.gray700 : colors.gray200 }]}>
            <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
            <Text style={[styles.statLabel, { color: colors.icon }]}>{s.label}</Text>
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

      <View style={[styles.searchBar, { backgroundColor: isDark ? colors.gray800 : colors.backgroundSecondary, borderColor: isDark ? colors.gray700 : colors.gray200 }]}>
        <Ionicons name="search" size={18} color={colors.icon} />
        <TextInput style={[styles.searchInput, { color: colors.text }]} placeholder="Search milestones..." placeholderTextColor={colors.icon} value={search} onChangeText={setSearch} />
      </View>

      {milestones.map((m) => (
        <View key={m._id} style={[styles.card, { backgroundColor: isDark ? colors.gray800 : colors.card, borderColor: isDark ? colors.gray700 : colors.gray200 }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconBadge, { backgroundColor: m.color + '30' }]}>
              <Ionicons name={(m.icon || 'trophy') as any} size={20} color={m.color} />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>{m.title}</Text>
              <Text style={[styles.cardMeta, { color: colors.icon }]} numberOfLines={1}>{m.description}</Text>
            </View>
            <Switch value={m.isActive} onValueChange={() => handleToggle(m)} />
          </View>
          <View style={styles.tagRow}>
            <View style={[styles.badge, { backgroundColor: `${colors.info}20` }]}><Text style={[styles.badgeText, { color: colors.info }]}>{m.targetType}: {m.targetValue}</Text></View>
            <View style={[styles.badge, { backgroundColor: `${colors.success}20` }]}><Text style={[styles.badgeText, { color: colors.success }]}>{m.rewardType}: {m.reward}</Text></View>
            {m.tier && <View style={[styles.badge, { backgroundColor: getTierColor(m.tier) + '30' }]}><Text style={[styles.badgeText, { color: getTierColor(m.tier) }]}>{m.tier}</Text></View>}
            <Text style={[styles.cardMeta, { color: colors.icon }]}>Order: {m.order}</Text>
          </View>
          <View style={styles.cardActions}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => openEdit(m)}><Ionicons name="pencil" size={16} color={colors.info} /></TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(m)}><Ionicons name="trash" size={16} color={colors.error} /></TouchableOpacity>
          </View>
        </View>
      ))}

      {milestones.length === 0 && <View style={styles.emptyState}><Ionicons name="trophy-outline" size={48} color={colors.icon} /><Text style={[styles.emptyText, { color: colors.icon }]}>No loyalty milestones found</Text></View>}

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? colors.gray800 : colors.card }]}>
            <ScrollView>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{editingMilestone ? 'Edit Milestone' : 'Create Milestone'}</Text>
              {[
                { label: 'Title *', value: formTitle, setter: setFormTitle },
                { label: 'Description *', value: formDescription, setter: setFormDescription },
                { label: 'Target Value *', value: formTargetValue, setter: setFormTargetValue, keyboard: 'number-pad' as const },
                { label: 'Reward *', value: formReward, setter: setFormReward },
                { label: 'Reward Coins', value: formRewardCoins, setter: setFormRewardCoins, keyboard: 'number-pad' as const },
                { label: 'Reward Discount %', value: formRewardDiscount, setter: setFormRewardDiscount, keyboard: 'number-pad' as const },
                { label: 'Icon', value: formIcon, setter: setFormIcon },
                { label: 'Color', value: formColor, setter: setFormColor },
                { label: 'Order', value: formOrder, setter: setFormOrder, keyboard: 'number-pad' as const },
              ].map((field) => (
                <View key={field.label} style={styles.formField}>
                  <Text style={[styles.formLabel, { color: colors.text }]}>{field.label}</Text>
                  <TextInput
                    style={[styles.formInput, { color: colors.text, backgroundColor: isDark ? colors.gray700 : colors.backgroundSecondary, borderColor: isDark ? colors.gray600 : colors.gray300 }]}
                    value={field.value} onChangeText={field.setter} placeholderTextColor={colors.icon} keyboardType={field.keyboard}
                  />
                </View>
              ))}
              <View style={styles.formField}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Target Type *</Text>
                <View style={styles.typeRow}>
                  {TARGET_TYPES.map((t) => (
                    <TouchableOpacity key={t} style={[styles.typeChip, formTargetType === t && { backgroundColor: colors.tint }]} onPress={() => setFormTargetType(t)}>
                      <Text style={[styles.typeChipText, formTargetType === t && { color: colors.card }]}>{t}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={styles.formField}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Reward Type *</Text>
                <View style={styles.typeRow}>
                  {REWARD_TYPES.map((t) => (
                    <TouchableOpacity key={t} style={[styles.typeChip, formRewardType === t && { backgroundColor: colors.tint }]} onPress={() => setFormRewardType(t)}>
                      <Text style={[styles.typeChipText, formRewardType === t && { color: colors.card }]}>{t}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={styles.formField}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Tier (Optional)</Text>
                <View style={styles.typeRow}>
                  {['', ...TIERS].map((t) => (
                    <TouchableOpacity key={t} style={[styles.typeChip, formTier === t && { backgroundColor: colors.tint }]} onPress={() => setFormTier(t)}>
                      <Text style={[styles.typeChipText, formTier === t && { color: colors.card }]}>{t || 'None'}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={styles.formField}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Active</Text>
                <Switch value={formIsActive} onValueChange={setFormIsActive} />
              </View>
              <View style={styles.modalActions}>
                <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.mutedDark }]} onPress={() => { setShowModal(false); resetForm(); }}><Text style={styles.modalBtnText}>Cancel</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.tint }]} onPress={handleSave} disabled={saving}>
                  {saving ? <ActivityIndicator color={colors.card} size="small" /> : <Text style={styles.modalBtnText}>{editingMilestone ? 'Update' : 'Create'}</Text>}
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
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, backgroundColor: Colors.light.gray200 },
  filterText: { fontSize: 13, fontWeight: '500', color: Colors.light.mutedDark },
  searchBar: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, padding: 10, borderRadius: 10, borderWidth: 1, marginBottom: 12, gap: 8 },
  searchInput: { flex: 1, fontSize: 14 },
  card: { marginHorizontal: 16, marginBottom: 12, borderRadius: 12, borderWidth: 1, padding: 14 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  iconBadge: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '600' },
  cardMeta: { fontSize: 12, marginTop: 2 },
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
  typeChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, backgroundColor: Colors.light.gray200 },
  typeChipText: { fontSize: 12, fontWeight: '500', color: Colors.light.mutedDark },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  modalBtnText: { color: Colors.light.card, fontWeight: '600', fontSize: 15 },
});
