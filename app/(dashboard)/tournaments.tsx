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
  SafeAreaView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { tournamentAdminService, TournamentAdmin } from '../../services/api/tournaments';
import { Colors } from '../../constants/Colors';
import { format } from 'date-fns';
import { showAlert, showConfirm } from '../../utils/alert';

// Web-native datetime picker component
const DateTimeInput = ({ value, onChange, isDark, placeholder }: {
  value: string; onChange: (v: string) => void; isDark: boolean; placeholder?: string;
}) => {
  if (Platform.OS === 'web') {
    return (
      <input
        type="datetime-local"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%',
          padding: '10px 12px',
          fontSize: 15,
          borderRadius: 8,
          border: '1px solid #D1D5DB',
          backgroundColor: isDark ? Colors.light.slateDark : Colors.light.card,
          color: isDark ? Colors.light.slate : Colors.light.gray800,
          fontFamily: 'inherit',
          outline: 'none',
          boxSizing: 'border-box' as any,
        }}
      />
    );
  }
  // Fallback for native (unlikely for admin app)
  return (
    <TextInput
      style={{
        borderWidth: 1,
        borderColor: Colors.light.gray300,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 15,
        color: isDark ? Colors.light.slate : Colors.light.gray800,
        backgroundColor: isDark ? Colors.light.slateDark : Colors.light.card,
      }}
      value={value}
      onChangeText={onChange}
      placeholder={placeholder || 'YYYY-MM-DDTHH:mm'}
      placeholderTextColor={Colors.light.muted}
    />
  );
};

const STATUS_COLORS: Record<string, string> = {
  upcoming: Colors.light.info,
  active: Colors.light.success,
  completed: Colors.light.mutedDark,
  cancelled: Colors.light.error,
};

const TYPE_COLORS: Record<string, string> = {
  daily: Colors.light.info,
  weekly: Colors.light.purple,
  monthly: Colors.light.warning,
  special: Colors.light.error,
};

const GAME_TYPES = ['spin_wheel', 'memory_match', 'coin_hunt', 'guess_price', 'quiz', 'mixed'] as const;
const TOURNAMENT_TYPES = ['daily', 'weekly', 'monthly', 'special'] as const;

interface FormData {
  name: string;
  description: string;
  type: string;
  gameType: string;
  startDate: string;
  endDate: string;
  maxParticipants: number;
  entryFee: number;
  totalPrizePool: number;
  featured: boolean;
  prizes: { rank: number; coins: number; description: string }[];
  rules: { minGamesRequired: number; maxGamesPerDay: number; scoringMethod: string };
}

const INITIAL_FORM: FormData = {
  name: '',
  description: '',
  type: 'daily',
  gameType: 'mixed',
  startDate: '',
  endDate: '',
  maxParticipants: 100,
  entryFee: 0,
  totalPrizePool: 1000,
  featured: false,
  prizes: [
    { rank: 1, coins: 500, description: '1st Place' },
    { rank: 2, coins: 300, description: '2nd Place' },
    { rank: 3, coins: 200, description: '3rd Place' },
  ],
  rules: { minGamesRequired: 3, maxGamesPerDay: 10, scoringMethod: 'cumulative' },
};

function formatDate(dateString: string): string {
  try {
    return format(new Date(dateString), 'MMM dd, yyyy HH:mm');
  } catch {
    return dateString;
  }
}

export default function TournamentsPage() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

  const [items, setItems] = useState<TournamentAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');

  // Modal
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<TournamentAdmin | null>(null);
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [saving, setSaving] = useState(false);

  // Detail modal
  const [detailItem, setDetailItem] = useState<TournamentAdmin | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  // Reactivate modal
  const [reactivateItem, setReactivateItem] = useState<TournamentAdmin | null>(null);
  const [reactivateModalVisible, setReactivateModalVisible] = useState(false);
  const [reactivateStartDate, setReactivateStartDate] = useState('');
  const [reactivateEndDate, setReactivateEndDate] = useState('');
  const [reactivating, setReactivating] = useState(false);

  const fetchItems = useCallback(async (pageNum = 1, isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const result = await tournamentAdminService.getAll({
        page: pageNum,
        limit: 20,
        status: filterStatus || undefined,
        type: filterType || undefined,
      });

      setItems(result.tournaments || []);
      setPage(result.pagination?.page || 1);
      setTotalPages(result.pagination?.pages || 1);
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to load tournaments');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filterStatus, filterType]);

  useEffect(() => {
    fetchItems(1);
  }, [fetchItems]);

  // Helper: generate ISO datetime string for N hours from now
  const futureDate = (hoursFromNow: number) => {
    const d = new Date(Date.now() + hoursFromNow * 60 * 60 * 1000);
    return d.toISOString().slice(0, 16);
  };

  const openCreateModal = () => {
    setEditingItem(null);
    setForm({
      ...INITIAL_FORM,
      startDate: futureDate(1), // 1 hour from now
      endDate: futureDate(25),  // ~1 day from now
    });
    setModalVisible(true);
  };

  const openEditModal = (item: TournamentAdmin) => {
    setEditingItem(item);
    setForm({
      name: item.name,
      description: item.description || '',
      type: item.type,
      gameType: item.gameType,
      startDate: item.startDate?.slice(0, 16) || '',
      endDate: item.endDate?.slice(0, 16) || '',
      maxParticipants: item.maxParticipants,
      entryFee: item.entryFee || 0,
      totalPrizePool: item.totalPrizePool || 0,
      featured: item.featured || false,
      prizes: item.prizes || INITIAL_FORM.prizes,
      rules: item.rules || INITIAL_FORM.rules,
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      showAlert('Validation', 'Tournament name is required');
      return;
    }

    try {
      setSaving(true);
      if (editingItem) {
        await tournamentAdminService.update(editingItem._id, form as any);
        showAlert('Success', 'Tournament updated');
      } else {
        await tournamentAdminService.create(form as any);
        showAlert('Success', 'Tournament created');
      }
      setModalVisible(false);
      fetchItems(page);
    } catch (error: any) {
      showAlert('Error', error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleActivate = async (item: TournamentAdmin) => {
    const confirmed = await showConfirm('Activate Tournament', `Activate "${item.name}"?`);
    if (!confirmed) return;

    try {
      await tournamentAdminService.activate(item._id);
      showAlert('Success', 'Tournament activated');
      fetchItems(page);
    } catch (error: any) {
      showAlert('Error', error.message);
    }
  };

  const handleCancel = async (item: TournamentAdmin) => {
    const confirmed = await showConfirm('Cancel Tournament', `Cancel "${item.name}"? This cannot be undone.`);
    if (!confirmed) return;

    try {
      await tournamentAdminService.cancel(item._id);
      showAlert('Success', 'Tournament cancelled');
      fetchItems(page);
    } catch (error: any) {
      showAlert('Error', error.message);
    }
  };

  const handleDelete = async (item: TournamentAdmin) => {
    const confirmed = await showConfirm('Delete Tournament', `Delete "${item.name}"? This cannot be undone.`);
    if (!confirmed) return;

    try {
      await tournamentAdminService.delete(item._id);
      showAlert('Success', 'Tournament deleted');
      fetchItems(page);
    } catch (error: any) {
      showAlert('Error', error.message);
    }
  };

  const handleClone = async (item: TournamentAdmin) => {
    const confirmed = await showConfirm('Clone Tournament', `Create a copy of "${item.name}" with new dates?`);
    if (!confirmed) return;

    try {
      await tournamentAdminService.clone(item._id);
      showAlert('Success', 'Tournament cloned! Edit the copy to set your preferred dates.');
      fetchItems(page);
    } catch (error: any) {
      showAlert('Error', error.message);
    }
  };

  const openReactivateModal = (item: TournamentAdmin) => {
    setReactivateItem(item);
    // Default: start in 1 hour, same duration as original
    const originalDuration = new Date(item.endDate).getTime() - new Date(item.startDate).getTime();
    const start = new Date(Date.now() + 60 * 60 * 1000);
    const end = new Date(start.getTime() + originalDuration);
    setReactivateStartDate(start.toISOString().slice(0, 16));
    setReactivateEndDate(end.toISOString().slice(0, 16));
    setReactivateModalVisible(true);
  };

  const handleReactivate = async () => {
    if (!reactivateItem || !reactivateStartDate || !reactivateEndDate) return;
    try {
      setReactivating(true);
      await tournamentAdminService.reactivate(reactivateItem._id, reactivateStartDate, reactivateEndDate);
      showAlert('Success', 'Tournament reactivated!');
      setReactivateModalVisible(false);
      fetchItems(page);
    } catch (error: any) {
      showAlert('Error', error.message);
    } finally {
      setReactivating(false);
    }
  };

  const viewDetail = async (item: TournamentAdmin) => {
    try {
      const full = await tournamentAdminService.getById(item._id);
      setDetailItem(full);
      setDetailModalVisible(true);
    } catch (error: any) {
      showAlert('Error', error.message);
    }
  };

  const renderItem = ({ item }: { item: TournamentAdmin }) => {
    const statusColor = STATUS_COLORS[item.status] || colors.mutedDark;
    const typeColor = TYPE_COLORS[item.type] || colors.mutedDark;

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: isDark ? colors.slateDark : colors.card }]}
        onPress={() => viewDetail(item)}
      >
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: isDark ? colors.slate : colors.gray800 }]} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText, { color: statusColor }]}>{item.status}</Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <View style={[styles.chip, { backgroundColor: typeColor + '20' }]}>
            <Text style={[styles.chipText, { color: typeColor }]}>{item.type}</Text>
          </View>
          <Text style={styles.metaText}>{item.gameType}</Text>
          <Text style={styles.metaText}>{item.participantsCount || 0} players</Text>
          <Text style={styles.metaText}>{item.totalPrizePool} coins</Text>
        </View>

        <View style={styles.dateRow}>
          <Text style={styles.dateText}>
            {formatDate(item.startDate)} - {formatDate(item.endDate)}
          </Text>
        </View>

        <View style={styles.cardActions}>
          {/* Upcoming: Edit, Activate, Delete */}
          {item.status === 'upcoming' && (
            <>
              <TouchableOpacity style={styles.actionBtn} onPress={() => openEditModal(item)}>
                <Ionicons name="create-outline" size={16} color={colors.info} />
                <Text style={[styles.actionText, { color: colors.info }]}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => handleActivate(item)}>
                <Ionicons name="play-outline" size={16} color={colors.success} />
                <Text style={[styles.actionText, { color: colors.success }]}>Activate</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(item)}>
                <Ionicons name="trash-outline" size={16} color={colors.error} />
                <Text style={[styles.actionText, { color: colors.error }]}>Delete</Text>
              </TouchableOpacity>
            </>
          )}
          {/* Active: Cancel */}
          {item.status === 'active' && (
            <TouchableOpacity style={styles.actionBtn} onPress={() => handleCancel(item)}>
              <Ionicons name="close-circle-outline" size={16} color={colors.error} />
              <Text style={[styles.actionText, { color: colors.error }]}>Cancel</Text>
            </TouchableOpacity>
          )}
          {/* Completed/Cancelled: Reactivate */}
          {(item.status === 'completed' || item.status === 'cancelled') && (
            <TouchableOpacity style={styles.actionBtn} onPress={() => openReactivateModal(item)}>
              <Ionicons name="refresh-outline" size={16} color={colors.warning} />
              <Text style={[styles.actionText, { color: colors.warning }]}>Reactivate</Text>
            </TouchableOpacity>
          )}
          {/* Clone: available for all statuses */}
          <TouchableOpacity style={styles.actionBtn} onPress={() => handleClone(item)}>
            <Ionicons name="copy-outline" size={16} color={colors.purple} />
            <Text style={[styles.actionText, { color: colors.purple }]}>Clone</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? Colors.dark.background : colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.pageTitle, { color: isDark ? colors.slate : colors.gray800 }]}>
          Tournaments
        </Text>
        <TouchableOpacity style={styles.createButton} onPress={openCreateModal}>
          <Ionicons name="add" size={20} color={colors.card} />
          <Text style={styles.createButtonText}>Create</Text>
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
        {['', 'upcoming', 'active', 'completed', 'cancelled'].map(s => (
          <TouchableOpacity
            key={s || 'all'}
            style={[styles.filterChip, filterStatus === s && styles.filterChipActive]}
            onPress={() => setFilterStatus(s)}
          >
            <Text style={[styles.filterChipText, filterStatus === s && styles.filterChipTextActive]}>
              {s || 'All'}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* List */}
      {loading ? (
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color={colors.info} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchItems(1, true)} />}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="trophy-outline" size={48} color={colors.muted} />
              <Text style={styles.emptyText}>No tournaments found</Text>
            </View>
          }
        />
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <View style={styles.pagination}>
          <TouchableOpacity
            disabled={page <= 1}
            onPress={() => fetchItems(page - 1)}
            style={[styles.pageBtn, page <= 1 && styles.pageBtnDisabled]}
          >
            <Ionicons name="chevron-back" size={18} color={page <= 1 ? colors.muted : colors.info} />
          </TouchableOpacity>
          <Text style={styles.pageInfo}>Page {page} of {totalPages}</Text>
          <TouchableOpacity
            disabled={page >= totalPages}
            onPress={() => fetchItems(page + 1)}
            style={[styles.pageBtn, page >= totalPages && styles.pageBtnDisabled]}
          >
            <Ionicons name="chevron-forward" size={18} color={page >= totalPages ? colors.muted : colors.info} />
          </TouchableOpacity>
        </View>
      )}

      {/* Create/Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: isDark ? Colors.dark.background : colors.background }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={24} color={isDark ? colors.slate : colors.gray800} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: isDark ? colors.slate : colors.gray800 }]}>
              {editingItem ? 'Edit Tournament' : 'Create Tournament'}
            </Text>
            <TouchableOpacity onPress={handleSave} disabled={saving}>
              {saving ? (
                <ActivityIndicator size="small" color={colors.info} />
              ) : (
                <Text style={styles.saveText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} contentContainerStyle={styles.modalBodyContent}>
            <Text style={[styles.fieldLabel, { color: isDark ? colors.slateLight : colors.gray700 }]}>Name *</Text>
            <TextInput
              style={[styles.input, { color: isDark ? colors.slate : colors.gray800, backgroundColor: isDark ? colors.slateDark : colors.card }]}
              value={form.name}
              onChangeText={(v) => setForm(f => ({ ...f, name: v }))}
              placeholder="Tournament name"
              placeholderTextColor={colors.muted}
            />

            <Text style={[styles.fieldLabel, { color: isDark ? colors.slateLight : colors.gray700 }]}>Description</Text>
            <TextInput
              style={[styles.textArea, { color: isDark ? colors.slate : colors.gray800, backgroundColor: isDark ? colors.slateDark : colors.card }]}
              value={form.description}
              onChangeText={(v) => setForm(f => ({ ...f, description: v }))}
              placeholder="Tournament description"
              placeholderTextColor={colors.muted}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            <Text style={[styles.fieldLabel, { color: isDark ? colors.slateLight : colors.gray700 }]}>Type</Text>
            <View style={styles.chipRow}>
              {TOURNAMENT_TYPES.map(t => (
                <TouchableOpacity
                  key={t}
                  style={[styles.selectChip, form.type === t && { backgroundColor: (TYPE_COLORS[t] || colors.mutedDark) + '20', borderColor: TYPE_COLORS[t] }]}
                  onPress={() => setForm(f => ({ ...f, type: t }))}
                >
                  <Text style={[styles.selectChipText, form.type === t && { color: TYPE_COLORS[t] }]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.fieldLabel, { color: isDark ? colors.slateLight : colors.gray700 }]}>Game Type</Text>
            <View style={styles.chipRow}>
              {GAME_TYPES.map(g => (
                <TouchableOpacity
                  key={g}
                  style={[styles.selectChip, form.gameType === g && styles.selectChipActive]}
                  onPress={() => setForm(f => ({ ...f, gameType: g }))}
                >
                  <Text style={[styles.selectChipText, form.gameType === g && { color: colors.info }]}>{g.replace('_', ' ')}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.fieldLabel, { color: isDark ? colors.slateLight : colors.gray700 }]}>Start Date</Text>
            <DateTimeInput
              value={form.startDate}
              onChange={(v) => setForm(f => ({ ...f, startDate: v }))}
              isDark={isDark}
              placeholder="Select start date & time"
            />

            <Text style={[styles.fieldLabel, { color: isDark ? colors.slateLight : colors.gray700 }]}>End Date</Text>
            <DateTimeInput
              value={form.endDate}
              onChange={(v) => setForm(f => ({ ...f, endDate: v }))}
              isDark={isDark}
              placeholder="Select end date & time"
            />

            <View style={styles.numberRow}>
              <View style={styles.numberField}>
                <Text style={[styles.fieldLabel, { color: isDark ? colors.slateLight : colors.gray700 }]}>Max Players</Text>
                <TextInput
                  style={[styles.input, { color: isDark ? colors.slate : colors.gray800, backgroundColor: isDark ? colors.slateDark : colors.card }]}
                  value={String(form.maxParticipants)}
                  onChangeText={(v) => setForm(f => ({ ...f, maxParticipants: parseInt(v) || 100 }))}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.numberField}>
                <Text style={[styles.fieldLabel, { color: isDark ? colors.slateLight : colors.gray700 }]}>Prize Pool</Text>
                <TextInput
                  style={[styles.input, { color: isDark ? colors.slate : colors.gray800, backgroundColor: isDark ? colors.slateDark : colors.card }]}
                  value={String(form.totalPrizePool)}
                  onChangeText={(v) => setForm(f => ({ ...f, totalPrizePool: parseInt(v) || 0 }))}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.numberField}>
                <Text style={[styles.fieldLabel, { color: isDark ? colors.slateLight : colors.gray700 }]}>Entry Fee</Text>
                <TextInput
                  style={[styles.input, { color: isDark ? colors.slate : colors.gray800, backgroundColor: isDark ? colors.slateDark : colors.card }]}
                  value={String(form.entryFee)}
                  onChangeText={(v) => setForm(f => ({ ...f, entryFee: parseInt(v) || 0 }))}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Detail Modal */}
      <Modal visible={detailModalVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: isDark ? Colors.dark.background : colors.background }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
              <Ionicons name="close" size={24} color={isDark ? colors.slate : colors.gray800} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: isDark ? colors.slate : colors.gray800 }]}>
              Tournament Details
            </Text>
            <View style={{ width: 24 }} />
          </View>

          {detailItem && (
            <ScrollView style={styles.modalBody} contentContainerStyle={styles.modalBodyContent}>
              <Text style={[styles.detailName, { color: isDark ? colors.slate : colors.gray800 }]}>{detailItem.name}</Text>

              <View style={styles.metaRow}>
                <View style={[styles.statusBadge, { backgroundColor: (STATUS_COLORS[detailItem.status] || colors.mutedDark) + '20' }]}>
                  <Text style={{ color: STATUS_COLORS[detailItem.status] || colors.mutedDark, fontSize: 12, fontWeight: '600' }}>
                    {detailItem.status}
                  </Text>
                </View>
                <View style={[styles.chip, { backgroundColor: (TYPE_COLORS[detailItem.type] || colors.mutedDark) + '20' }]}>
                  <Text style={[styles.chipText, { color: TYPE_COLORS[detailItem.type] || colors.mutedDark }]}>{detailItem.type}</Text>
                </View>
              </View>

              {detailItem.description ? (
                <Text style={[styles.detailDescription, { color: isDark ? colors.slateMedium : colors.mutedDark }]}>{detailItem.description}</Text>
              ) : null}

              <View style={styles.detailGrid}>
                <View style={styles.detailCell}>
                  <Text style={styles.detailLabel}>Game Type</Text>
                  <Text style={[styles.detailValue, { color: isDark ? colors.slate : colors.gray800 }]}>{detailItem.gameType}</Text>
                </View>
                <View style={styles.detailCell}>
                  <Text style={styles.detailLabel}>Players</Text>
                  <Text style={[styles.detailValue, { color: isDark ? colors.slate : colors.gray800 }]}>{detailItem.participantsCount || 0}/{detailItem.maxParticipants}</Text>
                </View>
                <View style={styles.detailCell}>
                  <Text style={styles.detailLabel}>Prize Pool</Text>
                  <Text style={[styles.detailValue, { color: isDark ? colors.slate : colors.gray800 }]}>{detailItem.totalPrizePool} coins</Text>
                </View>
                <View style={styles.detailCell}>
                  <Text style={styles.detailLabel}>Entry Fee</Text>
                  <Text style={[styles.detailValue, { color: isDark ? colors.slate : colors.gray800 }]}>{detailItem.entryFee || 'Free'}</Text>
                </View>
              </View>

              <Text style={[styles.detailSectionTitle, { color: isDark ? colors.slate : colors.gray800 }]}>Dates</Text>
              <Text style={styles.dateText}>Start: {formatDate(detailItem.startDate)}</Text>
              <Text style={styles.dateText}>End: {formatDate(detailItem.endDate)}</Text>

              {detailItem.prizes?.length > 0 && (
                <>
                  <Text style={[styles.detailSectionTitle, { color: isDark ? colors.slate : colors.gray800 }]}>Prizes</Text>
                  {detailItem.prizes.map((prize, idx) => (
                    <View key={idx} style={styles.prizeRow}>
                      <Text style={styles.prizeRank}>#{prize.rank}</Text>
                      <Text style={[styles.prizeCoins, { color: isDark ? colors.slate : colors.gray800 }]}>{prize.coins} coins</Text>
                      {prize.description ? <Text style={styles.prizeDesc}>{prize.description}</Text> : null}
                    </View>
                  ))}
                </>
              )}

              {detailItem.participants?.length > 0 && (
                <>
                  <Text style={[styles.detailSectionTitle, { color: isDark ? colors.slate : colors.gray800 }]}>
                    Top Participants ({detailItem.participants.length})
                  </Text>
                  {detailItem.participants
                    .sort((a, b) => b.score - a.score)
                    .slice(0, 10)
                    .map((p, idx) => (
                      <View key={idx} style={styles.participantRow}>
                        <Text style={styles.participantRank}>#{idx + 1}</Text>
                        <Text style={[styles.participantName, { color: isDark ? colors.slate : colors.gray800 }]}>
                          {p.user?.name || p.user?.toString()?.slice(-6) || 'User'}
                        </Text>
                        <Text style={styles.participantScore}>{p.score} pts</Text>
                        <Text style={styles.participantGames}>{p.gamesPlayed}g</Text>
                      </View>
                    ))}
                </>
              )}
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
      {/* Reactivate Modal */}
      <Modal visible={reactivateModalVisible} animationType="slide" transparent>
        <View style={styles.reactivateOverlay}>
          <View style={[styles.reactivateCard, { backgroundColor: isDark ? colors.slateDark : colors.card }]}>
            <Text style={[styles.reactivateTitle, { color: isDark ? colors.slate : colors.gray800 }]}>
              Reactivate Tournament
            </Text>
            {reactivateItem && (
              <Text style={styles.reactivateSubtitle}>{reactivateItem.name}</Text>
            )}

            <Text style={[styles.fieldLabel, { color: isDark ? colors.slateLight : colors.gray700, marginTop: 16 }]}>
              New Start Date
            </Text>
            <DateTimeInput
              value={reactivateStartDate}
              onChange={setReactivateStartDate}
              isDark={isDark}
              placeholder="Select start date & time"
            />

            <Text style={[styles.fieldLabel, { color: isDark ? colors.slateLight : colors.gray700, marginTop: 12 }]}>
              New End Date
            </Text>
            <DateTimeInput
              value={reactivateEndDate}
              onChange={setReactivateEndDate}
              isDark={isDark}
              placeholder="Select end date & time"
            />

            <Text style={styles.reactivateNote}>
              This will reset all participants and set the tournament to upcoming/active based on the start date.
            </Text>

            <View style={styles.reactivateActions}>
              <TouchableOpacity
                style={styles.reactivateCancelBtn}
                onPress={() => setReactivateModalVisible(false)}
              >
                <Text style={styles.reactivateCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.reactivateConfirmBtn, reactivating && { opacity: 0.6 }]}
                onPress={handleReactivate}
                disabled={reactivating}
              >
                {reactivating ? (
                  <ActivityIndicator size="small" color={colors.card} />
                ) : (
                  <Text style={styles.reactivateConfirmText}>Reactivate</Text>
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
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  pageTitle: { fontSize: 22, fontWeight: '700' },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.light.info,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  createButtonText: { color: Colors.light.card, fontWeight: '600', fontSize: 14 },
  filterRow: { paddingHorizontal: 16, paddingBottom: 12, maxHeight: 48 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: Colors.light.gray200,
    marginRight: 8,
  },
  filterChipActive: { backgroundColor: Colors.light.info },
  filterChipText: { fontSize: 13, fontWeight: '500', color: Colors.light.mutedDark },
  filterChipTextActive: { color: Colors.light.card },
  loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 16, gap: 12 },
  emptyContainer: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 16, color: Colors.light.muted },
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.gray200,
    gap: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: { fontSize: 16, fontWeight: '600', flex: 1, marginRight: 8 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: '600' },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  chip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  chipText: { fontSize: 11, fontWeight: '600' },
  metaText: { fontSize: 12, color: Colors.light.mutedDark },
  dateRow: { marginTop: 2 },
  dateText: { fontSize: 12, color: Colors.light.muted },
  cardActions: {
    flexDirection: 'row',
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.light.backgroundSecondary,
    paddingTop: 8,
    marginTop: 4,
  },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionText: { fontSize: 13, fontWeight: '500' },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.light.gray200,
  },
  pageBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: Colors.light.infoLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageBtnDisabled: { backgroundColor: Colors.light.backgroundSecondary },
  pageInfo: { fontSize: 14, color: Colors.light.mutedDark },
  // Modal
  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.gray200,
  },
  modalTitle: { fontSize: 17, fontWeight: '600' },
  saveText: { fontSize: 16, fontWeight: '600', color: Colors.light.info },
  modalBody: { flex: 1 },
  modalBodyContent: { padding: 16, gap: 4, paddingBottom: 40 },
  fieldLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 12 },
  input: {
    borderWidth: 1,
    borderColor: Colors.light.gray300,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  textArea: {
    borderWidth: 1,
    borderColor: Colors.light.gray300,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    minHeight: 80,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  selectChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.light.gray300,
  },
  selectChipActive: { backgroundColor: Colors.light.infoLight, borderColor: Colors.light.info },
  selectChipText: { fontSize: 13, fontWeight: '500', color: Colors.light.mutedDark },
  numberRow: { flexDirection: 'row', gap: 12 },
  numberField: { flex: 1 },
  // Detail modal
  detailName: { fontSize: 22, fontWeight: '700', marginBottom: 8 },
  detailDescription: { fontSize: 14, lineHeight: 20, marginBottom: 12 },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 16,
    marginBottom: 16,
  },
  detailCell: {
    width: '46%',
    padding: 12,
    borderRadius: 8,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  detailLabel: { fontSize: 11, color: Colors.light.mutedDark, marginBottom: 4 },
  detailValue: { fontSize: 16, fontWeight: '600' },
  detailSectionTitle: { fontSize: 16, fontWeight: '700', marginTop: 20, marginBottom: 8 },
  prizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.backgroundSecondary,
  },
  prizeRank: { fontSize: 14, fontWeight: '700', color: Colors.light.warning, width: 30 },
  prizeCoins: { fontSize: 14, fontWeight: '600' },
  prizeDesc: { fontSize: 12, color: Colors.light.mutedDark },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.backgroundSecondary,
  },
  participantRank: { fontSize: 13, fontWeight: '600', color: Colors.light.mutedDark, width: 28 },
  participantName: { fontSize: 14, fontWeight: '500', flex: 1 },
  participantScore: { fontSize: 13, fontWeight: '600', color: Colors.light.info },
  participantGames: { fontSize: 12, color: Colors.light.muted },
  // Reactivate modal
  reactivateOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  reactivateCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  reactivateTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  reactivateSubtitle: {
    fontSize: 14,
    color: Colors.light.mutedDark,
  },
  reactivateNote: {
    fontSize: 12,
    color: Colors.light.warning,
    marginTop: 12,
    lineHeight: 18,
    backgroundColor: Colors.light.warningLight,
    padding: 10,
    borderRadius: 8,
  },
  reactivateActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 20,
  },
  reactivateCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  reactivateCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.mutedDark,
  },
  reactivateConfirmBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: Colors.light.warning,
  },
  reactivateConfirmText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.card,
  },
});
