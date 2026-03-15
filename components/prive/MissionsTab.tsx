import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, RefreshControl, StyleSheet } from 'react-native';
import { priveMissionsAdminApi, PriveMission } from '@/services/api/priveMissions';
import { showAlert, showConfirm } from '@/utils/alert';
import { Colors } from '@/constants/Colors';

export default function MissionsTab({ colors }: { colors: any }) {
  const [missions, setMissions] = useState<PriveMission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newMission, setNewMission] = useState({
    title: '', description: '', targetPillar: 'engagement', actionType: 'order',
    targetCount: 1, reward: { coins: 50, coinType: 'rez', pillarBoost: 1 },
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    tierRequired: 'none', maxParticipants: 100, priority: 1,
  });
  const [editingMission, setEditingMission] = useState<PriveMission | null>(null);

  const fetchMissions = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await priveMissionsAdminApi.getMissions({ page, limit: 20, status: statusFilter || undefined });
      setMissions(res.missions || []);
      setTotalPages(res.pagination?.pages || 1);
    } catch (err) { console.error('[Missions] Failed to fetch:', err); showAlert('Error', 'Failed to load missions.'); } finally { setIsLoading(false); }
  }, [page, statusFilter]);

  useEffect(() => { fetchMissions(); }, [fetchMissions]);

  const validateMission = (mission: typeof newMission): string | null => {
    if (!mission.title.trim()) return 'Title is required';
    if (!mission.description.trim()) return 'Description is required';
    if (mission.targetCount < 1) return 'Target count must be at least 1';
    if (mission.reward.coins < 1) return 'Reward coins must be at least 1';
    if (mission.reward.coins > 10000) return 'Reward coins cannot exceed 10,000';
    if (mission.maxParticipants < 1) return 'Max participants must be at least 1';
    if (new Date(mission.endDate) <= new Date(mission.startDate)) return 'End date must be after start date';
    return null;
  };

  const handleCreate = async () => {
    const error = validateMission(newMission);
    if (error) { showAlert('Validation Error', error); return; }
    try { await priveMissionsAdminApi.createMission(newMission as any); setShowCreate(false); showAlert('Success', 'Mission created successfully'); fetchMissions(); } catch (err: any) { showAlert('Error', err?.message || 'Failed to create mission.'); }
  };

  const handleUpdate = async () => {
    if (!editingMission) return;
    const asForm = { title: editingMission.title, description: editingMission.description || '', targetPillar: editingMission.targetPillar, actionType: editingMission.actionType, targetCount: editingMission.targetCount, reward: editingMission.reward || { coins: 50, coinType: 'rez', pillarBoost: 1 }, startDate: editingMission.startDate, endDate: editingMission.endDate, tierRequired: editingMission.tierRequired || 'none', maxParticipants: editingMission.maxParticipants || 100, priority: editingMission.priority || 1 };
    const error = validateMission(asForm);
    if (error) { showAlert('Validation Error', error); return; }
    try { await priveMissionsAdminApi.updateMission(editingMission._id, asForm as any); setEditingMission(null); showAlert('Success', 'Mission updated successfully'); fetchMissions(); } catch (err: any) { showAlert('Error', err?.message || 'Failed to update mission.'); }
  };

  const handleDelete = async (id: string) => {
    showConfirm('Delete Mission', 'Are you sure you want to delete this mission?', async () => {
      try { await priveMissionsAdminApi.deleteMission(id); showAlert('Deleted', 'Mission deleted successfully'); fetchMissions(); } catch (err: any) { showAlert('Error', err?.message || 'Failed to delete mission.'); }
    });
  };

  const renderMissionForm = (mission: any, setMission: (m: any) => void, onSave: () => void, onCancel: () => void, saveLabel: string) => (
    <View style={[styles.card, { backgroundColor: colors.card, marginBottom: 16, borderWidth: editingMission ? 1 : 0, borderColor: colors.gold }]}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{editingMission ? 'Edit Mission' : 'New Mission'}</Text>
      {[{ key: 'title', label: 'Title', placeholder: 'e.g. Complete 3 Orders' }, { key: 'description', label: 'Description', placeholder: 'Mission description' }].map(({ key, label, placeholder }) => (
        <View key={key} style={{ marginBottom: 8 }}>
          <Text style={{ color: colors.secondaryText, fontSize: 12, marginBottom: 4 }}>{label}</Text>
          <TextInput style={[styles.overrideInput, { color: colors.text, borderColor: colors.border }]} placeholder={placeholder} placeholderTextColor={colors.secondaryText} value={(mission as any)[key] || ''} onChangeText={(v) => setMission({ ...mission, [key]: v })} />
        </View>
      ))}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1, marginBottom: 8 }}>
          <Text style={{ color: colors.secondaryText, fontSize: 12, marginBottom: 4 }}>Target Count</Text>
          <TextInput style={[styles.overrideInput, { color: colors.text, borderColor: colors.border }]} keyboardType="numeric" value={String(mission.targetCount || 1)} onChangeText={(v) => setMission({ ...mission, targetCount: Number(v) || 1 })} />
        </View>
        <View style={{ flex: 1, marginBottom: 8 }}>
          <Text style={{ color: colors.secondaryText, fontSize: 12, marginBottom: 4 }}>Reward Coins</Text>
          <TextInput style={[styles.overrideInput, { color: colors.text, borderColor: colors.border }]} keyboardType="numeric" value={String(mission.reward?.coins || 50)} onChangeText={(v) => setMission({ ...mission, reward: { ...mission.reward, coins: Number(v) || 0 } })} />
        </View>
      </View>
      {!editingMission && (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1, marginBottom: 8 }}>
            <Text style={{ color: colors.secondaryText, fontSize: 12, marginBottom: 4 }}>Pillar</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
              {['engagement', 'trust', 'influence', 'economicValue', 'brandAffinity', 'network'].map((p) => (
                <TouchableOpacity key={p} style={[styles.configBadge, { backgroundColor: mission.targetPillar === p ? `${colors.gold}33` : colors.background }]} onPress={() => setMission({ ...mission, targetPillar: p })}>
                  <Text style={{ color: mission.targetPillar === p ? colors.gold : colors.secondaryText, fontSize: 11 }}>{p}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      )}
      {editingMission && (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1, marginBottom: 8 }}>
            <Text style={{ color: colors.secondaryText, fontSize: 12, marginBottom: 4 }}>Max Participants</Text>
            <TextInput style={[styles.overrideInput, { color: colors.text, borderColor: colors.border }]} keyboardType="numeric" value={String(mission.maxParticipants || 100)} onChangeText={(v) => setMission({ ...mission, maxParticipants: Number(v) || 100 })} />
          </View>
          <View style={{ flex: 1, marginBottom: 8 }}>
            <Text style={{ color: colors.secondaryText, fontSize: 12, marginBottom: 4 }}>Active</Text>
            <TouchableOpacity style={[styles.configBadge, { backgroundColor: mission.isActive ? `${Colors.light.greenDeep}22` : `${Colors.light.errorMaterial}22`, paddingVertical: 8 }]} onPress={() => setMission({ ...mission, isActive: !mission.isActive })}>
              <Text style={{ color: mission.isActive ? Colors.light.greenDeep : Colors.light.errorMaterial, fontSize: 13 }}>{mission.isActive ? 'Active' : 'Inactive'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
        <TouchableOpacity style={[styles.submitBtn, { flex: 1 }]} onPress={onSave}><Text style={styles.submitBtnText}>{saveLabel}</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.configBadge, { flex: 1, alignItems: 'center', paddingVertical: 10, backgroundColor: colors.background }]} onPress={onCancel}><Text style={{ color: colors.secondaryText }}>Cancel</Text></TouchableOpacity>
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.tabContent} refreshControl={<RefreshControl refreshing={isLoading} onRefresh={fetchMissions} />}>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        {['', 'active', 'inactive', 'expired'].map((s) => (
          <TouchableOpacity key={s} style={[styles.configBadge, { backgroundColor: statusFilter === s ? `${colors.gold}33` : colors.card }]} onPress={() => { setStatusFilter(s); setPage(1); }}>
            <Text style={{ color: statusFilter === s ? colors.gold : colors.secondaryText, fontSize: 13 }}>{s || 'All'}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={[styles.submitBtn, { paddingVertical: 6, paddingHorizontal: 16 }]} onPress={() => setShowCreate(!showCreate)}>
          <Text style={styles.submitBtnText}>{showCreate ? 'Cancel' : '+ New Mission'}</Text>
        </TouchableOpacity>
      </View>

      {showCreate && renderMissionForm(newMission, setNewMission, handleCreate, () => setShowCreate(false), 'Create Mission')}
      {editingMission && renderMissionForm(editingMission, setEditingMission, handleUpdate, () => setEditingMission(null), 'Save Changes')}

      {isLoading && missions.length === 0 ? (
        <ActivityIndicator size="large" color={colors.gold} style={{ marginTop: 40 }} />
      ) : missions.length === 0 ? (
        <Text style={[styles.emptyText, { color: colors.secondaryText }]}>No missions found</Text>
      ) : (
        missions.map((m) => (
          <View key={m._id} style={[styles.card, { backgroundColor: colors.card, marginBottom: 10 }]}>
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>{m.title}</Text>
                <Text style={[styles.cardSubtitle, { color: colors.secondaryText }]}>{m.targetPillar} | {m.actionType} x{m.targetCount} | Tier: {m.tierRequired}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: m.isActive ? `${Colors.light.greenDeep}22` : `${Colors.light.errorMaterial}22` }]}>
                <Text style={{ color: m.isActive ? Colors.light.greenDeep : Colors.light.errorMaterial, fontSize: 12 }}>{m.isActive ? 'Active' : 'Inactive'}</Text>
              </View>
            </View>
            <Text style={{ color: colors.secondaryText, fontSize: 12, marginTop: 4 }}>Reward: {m.reward?.coins || 0} coins | Participants: {m.currentParticipants}/{m.maxParticipants}</Text>
            <Text style={{ color: colors.secondaryText, fontSize: 11, marginTop: 2 }}>{new Date(m.startDate).toLocaleDateString()} — {new Date(m.endDate).toLocaleDateString()}</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <TouchableOpacity style={[styles.configBadge, { backgroundColor: `${colors.gold}22` }]} onPress={() => setEditingMission(m)}><Text style={{ color: colors.gold, fontSize: 12 }}>Edit</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.configBadge, { backgroundColor: `${Colors.light.errorMaterial}22` }]} onPress={() => handleDelete(m._id)}><Text style={{ color: Colors.light.errorMaterial, fontSize: 12 }}>Delete</Text></TouchableOpacity>
            </View>
          </View>
        ))
      )}

      {totalPages > 1 && (
        <View style={styles.pagination}>
          <TouchableOpacity disabled={page <= 1} onPress={() => setPage(p => p - 1)}><Text style={{ color: page <= 1 ? colors.secondaryText : colors.gold }}>Prev</Text></TouchableOpacity>
          <Text style={{ color: colors.secondaryText }}>Page {page} of {totalPages}</Text>
          <TouchableOpacity disabled={page >= totalPages} onPress={() => setPage(p => p + 1)}><Text style={{ color: page >= totalPages ? colors.secondaryText : colors.gold }}>Next</Text></TouchableOpacity>
        </View>
      )}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  tabContent: { flex: 1, padding: 16 },
  card: { borderRadius: 12, padding: 16, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardTitle: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  cardSubtitle: { fontSize: 12, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  emptyText: { textAlign: 'center', marginTop: 40, fontSize: 14 },
  pagination: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginTop: 8, marginBottom: 12 },
  overrideInput: { borderWidth: 1, borderRadius: 8, padding: 8, marginTop: 8, fontSize: 13 },
  submitBtn: { backgroundColor: Colors.light.gold, borderRadius: 10, padding: 14, alignItems: 'center', marginBottom: 24 },
  submitBtnText: { color: Colors.light.text, fontSize: 15, fontWeight: '600' },
  configBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
});
