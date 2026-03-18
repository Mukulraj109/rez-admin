import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  Modal, ActivityIndicator, useColorScheme, RefreshControl, Switch,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import {
  institutionsService,
  VerifiedInstitution,
} from '../../services/api/institutions';
import { showAlert, showConfirm } from '../../utils/alert';

type FilterType = 'all' | 'college' | 'company';

export default function InstitutionsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [institutions, setInstitutions] = useState<VerifiedInstitution[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<'college' | 'company'>('college');
  const [formDomains, setFormDomains] = useState('');
  const [formAliases, setFormAliases] = useState('');
  const [formCity, setFormCity] = useState('');
  const [formAutoVerify, setFormAutoVerify] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async (pageNum = 1, append = false) => {
    try {
      if (!append) setLoading(true);
      const result = await institutionsService.getInstitutions({
        type: filterType === 'all' ? undefined : filterType,
        search: search || undefined,
        page: pageNum,
        limit: 20,
      });
      if (append) {
        setInstitutions((prev) => [...prev, ...result.institutions]);
      } else {
        setInstitutions(result.institutions);
      }
      setHasMore(result.pagination.hasNextPage);
      setPage(pageNum);
    } catch (e: any) {
      showAlert('Error', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filterType, search]);

  useEffect(() => {
    loadData(1);
  }, [loadData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData(1);
  };

  const openCreateModal = () => {
    setEditingId(null);
    setFormName('');
    setFormType('college');
    setFormDomains('');
    setFormAliases('');
    setFormCity('');
    setFormAutoVerify(true);
    setModalVisible(true);
  };

  const openEditModal = (inst: VerifiedInstitution) => {
    setEditingId(inst._id);
    setFormName(inst.name);
    setFormType(inst.type);
    setFormDomains(inst.emailDomains.join(', '));
    setFormAliases(inst.aliases.join(', '));
    setFormCity(inst.city);
    setFormAutoVerify(inst.autoVerifyEnabled);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!formName.trim() || !formCity.trim()) {
      showAlert('Required', 'Name and city are required');
      return;
    }
    setSaving(true);
    try {
      const data = {
        name: formName.trim(),
        type: formType,
        emailDomains: formDomains.split(',').map((d) => d.trim()).filter(Boolean),
        aliases: formAliases.split(',').map((a) => a.trim()).filter(Boolean),
        city: formCity.trim(),
        autoVerifyEnabled: formAutoVerify,
      };

      if (editingId) {
        await institutionsService.updateInstitution(editingId, data);
        showAlert('Updated', `${formName} updated successfully`);
      } else {
        await institutionsService.createInstitution(data);
        showAlert('Created', `${formName} added. Matching emails will now auto-verify.`);
      }

      setModalVisible(false);
      loadData(1);
    } catch (e: any) {
      showAlert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (inst: VerifiedInstitution) => {
    const confirmed = await showConfirm(
      'Deactivate',
      `Deactivate ${inst.name}? Auto-verify will stop for this institution.`
    );
    if (!confirmed) return;

    try {
      await institutionsService.deleteInstitution(inst._id);
      loadData(1);
    } catch (e: any) {
      showAlert('Error', e.message);
    }
  };

  const renderItem = useCallback(({ item }: { item: VerifiedInstitution }) => (
    <View style={[styles.card, { backgroundColor: colors.background }]}>
      <View style={styles.cardHeader}>
        <Text style={[styles.cardIcon]}>
          {item.type === 'college' ? '🎓' : '💼'}
        </Text>
        <Text style={[styles.cardName, { color: colors.text }]} numberOfLines={1}>
          {item.name}
        </Text>
        <View style={[
          styles.autoBadge,
          { backgroundColor: item.autoVerifyEnabled ? '#dcfce7' : '#fef2f2' },
        ]}>
          <Text style={{
            fontSize: 11, fontWeight: '600',
            color: item.autoVerifyEnabled ? '#16a34a' : '#dc2626',
          }}>
            {item.autoVerifyEnabled ? 'Auto ON' : 'Auto OFF'}
          </Text>
        </View>
      </View>

      <Text style={[styles.cardCity, { color: colors.text + '99' }]}>{item.city}</Text>

      {item.emailDomains.length > 0 && (
        <Text style={[styles.cardDomains, { color: colors.tint }]}>
          📧 {item.emailDomains.join(', ')}
        </Text>
      )}

      <View style={styles.cardStats}>
        <Text style={{ fontSize: 12, color: '#16a34a' }}>
          ✓ {item.verifiedCount || 0} verified
        </Text>
        <Text style={{ fontSize: 12, color: '#f59e0b' }}>
          ⏳ {item.pendingCount || 0} pending
        </Text>
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity onPress={() => openEditModal(item)} style={styles.actionBtn}>
          <Ionicons name="create-outline" size={16} color={colors.tint} />
          <Text style={{ fontSize: 13, color: colors.tint, marginLeft: 4 }}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleDelete(item)} style={styles.actionBtn}>
          <Ionicons name="trash-outline" size={16} color="#dc2626" />
          <Text style={{ fontSize: 13, color: '#dc2626', marginLeft: 4 }}>Deactivate</Text>
        </TouchableOpacity>
      </View>
    </View>
  ), [colors]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Verified Institutions
        </Text>
        <TouchableOpacity onPress={openCreateModal} style={[styles.addButton, { backgroundColor: colors.tint }]}>
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={styles.addButtonText}>Add</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <TextInput
        style={[styles.searchInput, { backgroundColor: colors.background, borderColor: colors.text + '30', color: colors.text }]}
        placeholder="Search institutions..."
        placeholderTextColor={colors.text + '66'}
        value={search}
        onChangeText={setSearch}
      />

      {/* Filter chips */}
      <View style={styles.chipRow}>
        {(['all', 'college', 'company'] as FilterType[]).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.chip, filterType === t && { backgroundColor: colors.tint }]}
            onPress={() => setFilterType(t)}
          >
            <Text style={[styles.chipText, filterType === t && { color: '#fff' }]}>
              {t === 'all' ? 'All' : t === 'college' ? '🎓 Colleges' : '💼 Companies'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      <FlatList
        data={institutions}
        renderItem={renderItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        onEndReached={() => hasMore && loadData(page + 1, true)}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator size="large" style={{ marginTop: 40 }} />
          ) : (
            <Text style={[styles.emptyText, { color: colors.text + '66' }]}>
              No institutions found
            </Text>
          )
        }
      />

      {/* Add/Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.background }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {editingId ? 'Edit Institution' : 'Add Institution'}
            </Text>

            <ScrollView>
              <Text style={[styles.formLabel, { color: colors.text }]}>Name *</Text>
              <TextInput
                style={[styles.formInput, { color: colors.text, borderColor: colors.text + '30' }]}
                value={formName}
                onChangeText={setFormName}
                placeholder="Institution name"
                placeholderTextColor={colors.text + '66'}
              />

              <Text style={[styles.formLabel, { color: colors.text }]}>Type</Text>
              <View style={styles.chipRow}>
                {(['college', 'company'] as const).map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.chip, formType === t && { backgroundColor: colors.tint }]}
                    onPress={() => setFormType(t)}
                  >
                    <Text style={[styles.chipText, formType === t && { color: '#fff' }]}>
                      {t === 'college' ? 'College' : 'Company'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.formLabel, { color: colors.text }]}>Email Domains</Text>
              <TextInput
                style={[styles.formInput, { color: colors.text, borderColor: colors.text + '30' }]}
                value={formDomains}
                onChangeText={setFormDomains}
                placeholder="domain1.edu, domain2.edu"
                placeholderTextColor={colors.text + '66'}
              />
              <Text style={{ fontSize: 11, color: colors.text + '66', marginBottom: 12 }}>
                Comma-separated. Students with these emails get instant verification.
              </Text>

              <Text style={[styles.formLabel, { color: colors.text }]}>Aliases</Text>
              <TextInput
                style={[styles.formInput, { color: colors.text, borderColor: colors.text + '30' }]}
                value={formAliases}
                onChangeText={setFormAliases}
                placeholder="Short names, abbreviations"
                placeholderTextColor={colors.text + '66'}
              />

              <Text style={[styles.formLabel, { color: colors.text }]}>City *</Text>
              <TextInput
                style={[styles.formInput, { color: colors.text, borderColor: colors.text + '30' }]}
                value={formCity}
                onChangeText={setFormCity}
                placeholder="City"
                placeholderTextColor={colors.text + '66'}
              />

              <View style={styles.switchRow}>
                <Text style={[styles.formLabel, { color: colors.text, marginBottom: 0 }]}>
                  Auto-Verify
                </Text>
                <Switch value={formAutoVerify} onValueChange={setFormAutoVerify} />
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={[styles.modalBtn, { borderColor: colors.text + '30' }]}
              >
                <Text style={{ color: colors.text }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSave}
                disabled={saving}
                style={[styles.modalBtn, { backgroundColor: colors.tint }]}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={{ color: '#fff', fontWeight: '600' }}>
                    {editingId ? 'Update' : 'Save'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8,
  },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  addButton: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14,
    paddingVertical: 8, borderRadius: 8, gap: 4,
  },
  addButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  searchInput: {
    marginHorizontal: 16, marginBottom: 8, paddingHorizontal: 14,
    paddingVertical: 10, borderRadius: 10, borderWidth: 1, fontSize: 14,
  },
  chipRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 12 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    backgroundColor: '#f3f4f6',
  },
  chipText: { fontSize: 13, fontWeight: '500', color: '#374151' },
  listContent: { paddingHorizontal: 16, paddingBottom: 100 },
  card: {
    borderRadius: 12, padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  cardIcon: { fontSize: 18 },
  cardName: { flex: 1, fontSize: 15, fontWeight: '700' },
  autoBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  cardCity: { fontSize: 13, marginBottom: 4 },
  cardDomains: { fontSize: 12, marginBottom: 6 },
  cardStats: { flexDirection: 'row', gap: 16, marginBottom: 8 },
  cardActions: { flexDirection: 'row', gap: 16 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  emptyText: { textAlign: 'center', marginTop: 40, fontSize: 14 },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, maxHeight: '80%',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  formLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  formInput: {
    borderWidth: 1, borderRadius: 8, paddingHorizontal: 12,
    paddingVertical: 10, fontSize: 14, marginBottom: 12,
  },
  switchRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginVertical: 12,
  },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  modalBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center',
    borderWidth: 1, borderColor: 'transparent',
  },
});
