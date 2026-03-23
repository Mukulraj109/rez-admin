/**
 * Admin WhatsApp Templates
 * Manage notification templates for order updates, coin credits, campaign invitations.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator, RefreshControl, Modal, Switch, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { BRAND } from '../../constants/brand';
import { showAlert } from '../../utils/alert';
import { apiClient } from '../../services/api/apiClient';

interface WATemplate { _id: string; name: string; category: string; language: string; body: string; variables: string[]; isActive: boolean; lastUsed?: string; usageCount: number; }
const CATEGORIES = ['all', 'order', 'coin', 'campaign', 'reminder', 'marketing'] as const;

export default function WhatsAppTemplatesScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [templates, setTemplates] = useState<WATemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTemplate, setNewTemplate] = useState({ name: '', category: 'order', body: '' });

  const fetchTemplates = useCallback(async () => {
    try { setIsLoading(true);
      const res = await apiClient.get('/admin/notifications/templates', { type: 'whatsapp' });
      setTemplates(res.data?.templates || []);
    } catch { /* Templates might not exist yet — that's okay */ }
    finally { setIsLoading(false); }
  }, []);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const filtered = filter === 'all' ? templates : templates.filter(t => t.category === filter);

  const handleCreate = async () => {
    if (!newTemplate.name || !newTemplate.body) { showAlert('Error', 'Name and body are required'); return; }
    try {
      await apiClient.post('/admin/notifications/templates', { ...newTemplate, type: 'whatsapp', language: 'en' });
      showAlert('Success', 'Template created');
      setShowCreateModal(false);
      setNewTemplate({ name: '', category: 'order', body: '' });
      fetchTemplates();
    } catch { showAlert('Error', 'Failed to create template'); }
  };

  const toggleTemplate = async (id: string, isActive: boolean) => {
    try {
      await apiClient.put(`/admin/notifications/templates/${id}`, { isActive: !isActive });
      setTemplates(prev => prev.map(t => t._id === id ? { ...t, isActive: !isActive } : t));
    } catch { showAlert('Error', 'Failed to update'); }
  };

  const renderTemplate = useCallback(({ item }: { item: WATemplate }) => (
    <View style={[s.card, { backgroundColor: colors.card }]}>
      <View style={s.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[s.templateName, { color: colors.text }]}>{item.name}</Text>
          <View style={s.catRow}>
            <View style={[s.catBadge, { backgroundColor: colors.purple + '20' }]}>
              <Text style={[s.catText, { color: colors.purple }]}>{item.category}</Text>
            </View>
            <Text style={[s.usage, { color: colors.mutedDark }]}>Used {item.usageCount} times</Text>
          </View>
        </View>
        <Switch value={item.isActive} onValueChange={() => toggleTemplate(item._id, item.isActive)} trackColor={{ true: colors.success }} />
      </View>
      <View style={[s.bodyPreview, { backgroundColor: colors.backgroundSecondary }]}>
        <Ionicons name="logo-whatsapp" size={14} color="#25D366" />
        <Text style={[s.bodyText, { color: colors.text }]} numberOfLines={3}>{item.body}</Text>
      </View>
      {item.variables?.length > 0 && (
        <Text style={[s.vars, { color: colors.mutedDark }]}>Variables: {item.variables.join(', ')}</Text>
      )}
    </View>
  ), [colors]);

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <View style={s.headerRow}>
        <Text style={[s.title, { color: colors.text }]}>WhatsApp Templates</Text>
        <TouchableOpacity style={[s.createBtn, { backgroundColor: colors.purple }]} onPress={() => setShowCreateModal(true)}>
          <Ionicons name="add" size={18} color="#FFF" /><Text style={s.createBtnText}>New</Text>
        </TouchableOpacity>
      </View>

      <View style={s.filterRow}>
        {CATEGORIES.map(c => (
          <TouchableOpacity key={c} style={[s.chip, { backgroundColor: filter === c ? colors.purple : colors.card }]} onPress={() => setFilter(c)}>
            <Text style={[s.chipText, { color: filter === c ? '#FFF' : colors.mutedDark }]}>{c.charAt(0).toUpperCase() + c.slice(1)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? <ActivityIndicator size="large" style={{ marginTop: 40 }} color={colors.purple} /> : (
        <FlatList data={filtered} keyExtractor={i => i._id} renderItem={renderTemplate}
          contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
          refreshControl={<RefreshControl refreshing={false} onRefresh={fetchTemplates} />}
          ListEmptyComponent={<View style={s.empty}><Ionicons name="chatbubbles-outline" size={48} color={colors.muted} /><Text style={[s.emptyText, { color: colors.mutedDark }]}>No templates found</Text></View>}
        />
      )}

      <Modal visible={showCreateModal} transparent animationType="fade">
        <View style={s.overlay}>
          <View style={[s.modal, { backgroundColor: colors.card }]}>
            <Text style={[s.modalTitle, { color: colors.text }]}>New WhatsApp Template</Text>
            <TextInput style={[s.input, { color: colors.text, borderColor: colors.border }]} placeholder="Template name" placeholderTextColor={colors.muted} value={newTemplate.name} onChangeText={t => setNewTemplate(p => ({ ...p, name: t }))} />
            <TextInput style={[s.input, s.textArea, { color: colors.text, borderColor: colors.border }]} placeholder="Message body (use {{1}}, {{2}} for variables)" placeholderTextColor={colors.muted} value={newTemplate.body} onChangeText={t => setNewTemplate(p => ({ ...p, body: t }))} multiline numberOfLines={4} />
            <View style={s.modalActions}>
              <TouchableOpacity style={[s.modalBtn, { backgroundColor: colors.backgroundSecondary }]} onPress={() => setShowCreateModal(false)}><Text style={{ color: colors.text, fontWeight: '600' }}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={[s.modalBtn, { backgroundColor: colors.purple }]} onPress={handleCreate}><Text style={{ color: '#FFF', fontWeight: '600' }}>Create</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16 },
  title: { fontSize: 22, fontWeight: '800' },
  createBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, gap: 4 },
  createBtnText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
  filterRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 6, marginTop: 12, marginBottom: 4, flexWrap: 'wrap' },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, elevation: 1 },
  chipText: { fontSize: 12, fontWeight: '600' },
  card: { borderRadius: 12, padding: 14, marginBottom: 10, elevation: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  templateName: { fontSize: 15, fontWeight: '700' },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  catBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  catText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  usage: { fontSize: 11 },
  bodyPreview: { flexDirection: 'row', gap: 8, padding: 10, borderRadius: 8, alignItems: 'flex-start' },
  bodyText: { flex: 1, fontSize: 13, lineHeight: 18 },
  vars: { fontSize: 11, marginTop: 6 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 14, marginTop: 12 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modal: { borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, marginBottom: 12 },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 8 },
  modalBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
});
