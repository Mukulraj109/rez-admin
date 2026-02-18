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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { pollsService, Poll, CreatePollPayload } from '../../services/api/polls';
import { Colors } from '../../constants/Colors';
import { format } from 'date-fns';
import { showAlert, showConfirm } from '../../utils/alert';

type TabType = 'active' | 'closed' | 'archived';

export default function PollsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [activeTab, setActiveTab] = useState<TabType>('active');
  const [polls, setPolls] = useState<Poll[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Create poll modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newOptions, setNewOptions] = useState(['', '']);
  const [newCoinsPerVote, setNewCoinsPerVote] = useState('10');
  const [newIsDaily, setNewIsDaily] = useState(false);
  const [newStartsAt, setNewStartsAt] = useState('');
  const [newEndsAt, setNewEndsAt] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Detail modal
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedPoll, setSelectedPoll] = useState<Poll | null>(null);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async (pageNum: number = 1, append: boolean = false) => {
    try {
      if (!append) setIsLoading(true);
      const data = await pollsService.getPolls(pageNum, 20, activeTab);

      if (append) {
        setPolls(prev => [...prev, ...data.polls]);
      } else {
        setPolls(data.polls);
      }

      setHasMore(data.pagination.hasMore);
      setPage(pageNum);
    } catch (error: any) {
      console.error('Failed to load polls:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData(1);
    setRefreshing(false);
  }, [activeTab]);

  const loadMore = () => {
    if (!isLoading && hasMore) {
      loadData(page + 1, true);
    }
  };

  const resetCreateForm = () => {
    setNewTitle('');
    setNewDescription('');
    setNewOptions(['', '']);
    setNewCoinsPerVote('10');
    setNewIsDaily(false);
    setNewStartsAt('');
    setNewEndsAt('');
  };

  const handleCreatePoll = async () => {
    if (!newTitle.trim()) {
      showAlert('Error', 'Title is required');
      return;
    }

    const validOptions = newOptions.filter(o => o.trim().length > 0);
    if (validOptions.length < 2) {
      showAlert('Error', 'At least 2 options are required');
      return;
    }

    // Default dates: start now, end in 7 days
    const start = newStartsAt || new Date().toISOString();
    const end = newEndsAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const payload: CreatePollPayload = {
      title: newTitle.trim(),
      description: newDescription.trim() || undefined,
      options: validOptions.map(text => ({ text: text.trim() })),
      startsAt: start,
      endsAt: end,
      coinsPerVote: parseInt(newCoinsPerVote, 10) || 10,
      isDaily: newIsDaily,
    };

    try {
      setIsCreating(true);
      await pollsService.createPoll(payload);
      showAlert('Success', 'Poll created successfully');
      setShowCreateModal(false);
      resetCreateForm();
      await loadData(1);
    } catch (error: any) {
      showAlert('Error', error.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleClosePoll = (pollId: string) => {
    showConfirm(
      'Close Poll',
      'This will stop accepting new votes. Continue?',
      async () => {
        try {
          await pollsService.updatePoll(pollId, { status: 'closed' });
          showAlert('Success', 'Poll closed');
          await loadData(1);
        } catch (error: any) {
          showAlert('Error', error.message);
        }
      },
      'Close'
    );
  };

  const handleArchivePoll = (pollId: string) => {
    showConfirm(
      'Archive Poll',
      'This will archive the poll permanently. Continue?',
      async () => {
        try {
          await pollsService.archivePoll(pollId);
          showAlert('Success', 'Poll archived');
          await loadData(1);
        } catch (error: any) {
          showAlert('Error', error.message);
        }
      },
      'Archive'
    );
  };

  const addOption = () => {
    if (newOptions.length < 6) {
      setNewOptions([...newOptions, '']);
    }
  };

  const removeOption = (idx: number) => {
    if (newOptions.length > 2) {
      setNewOptions(newOptions.filter((_, i) => i !== idx));
    }
  };

  const updateOption = (idx: number, text: string) => {
    const updated = [...newOptions];
    updated[idx] = text;
    setNewOptions(updated);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#10B981';
      case 'closed': return '#F59E0B';
      case 'archived': return '#6B7280';
      default: return '#3B82F6';
    }
  };

  const renderTabs = () => (
    <View style={styles.tabsContainer}>
      {(['active', 'closed', 'archived'] as TabType[]).map(tab => (
        <TouchableOpacity
          key={tab}
          style={[styles.tab, activeTab === tab && { backgroundColor: colors.tint }]}
          onPress={() => {
            setActiveTab(tab);
            setIsLoading(true);
          }}
        >
          <Text style={[styles.tabText, { color: activeTab === tab ? '#FFFFFF' : colors.icon }]}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderPollCard = ({ item }: { item: Poll }) => {
    const totalVotes = item.totalVotes || 0;
    const maxVotes = Math.max(...item.options.map(o => o.voteCount), 1);

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.card }]}
        onPress={() => {
          setSelectedPoll(item);
          setShowDetailModal(true);
        }}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.avatar, { backgroundColor: '#EEF2FF' }]}>
            <Ionicons name="bar-chart" size={20} color="#6366F1" />
          </View>
          <View style={styles.cardInfo}>
            <Text style={[styles.pollTitle, { color: colors.text }]} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={[styles.subtitle, { color: colors.icon }]}>
              {totalVotes} vote{totalVotes !== 1 ? 's' : ''} &middot; {item.coinsPerVote} coins/vote
            </Text>
          </View>
          <View style={styles.badges}>
            {item.isDaily && (
              <View style={[styles.badge, { backgroundColor: '#FEF3C7' }]}>
                <Text style={{ color: '#D97706', fontSize: 10, fontWeight: '600' }}>DAILY</Text>
              </View>
            )}
            <View style={[styles.badge, { backgroundColor: `${getStatusColor(item.status)}20` }]}>
              <Text style={{ color: getStatusColor(item.status), fontSize: 10, fontWeight: '600' }}>
                {item.status.toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        {/* Options preview */}
        <View style={styles.optionsPreview}>
          {item.options.slice(0, 3).map((opt, idx) => (
            <View key={opt.id || idx} style={styles.optionRow}>
              <View style={[styles.optionBar, { width: `${Math.max(5, (opt.voteCount / maxVotes) * 100)}%`, backgroundColor: `${colors.tint}30` }]} />
              <Text style={[styles.optionText, { color: colors.text }]} numberOfLines={1}>
                {opt.text}
              </Text>
              <Text style={[styles.optionCount, { color: colors.icon }]}>{opt.voteCount}</Text>
            </View>
          ))}
          {item.options.length > 3 && (
            <Text style={[styles.moreOptions, { color: colors.icon }]}>
              +{item.options.length - 3} more options
            </Text>
          )}
        </View>

        {/* Date range */}
        <View style={styles.dateRow}>
          <Ionicons name="time-outline" size={14} color={colors.icon} />
          <Text style={[styles.dateText, { color: colors.icon }]}>
            {format(new Date(item.startsAt), 'MMM d')} - {format(new Date(item.endsAt), 'MMM d, yyyy')}
          </Text>
        </View>

        {/* Actions */}
        {item.status === 'active' && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.smallButton, { backgroundColor: '#F59E0B' }]}
              onPress={() => handleClosePoll(item._id)}
            >
              <Ionicons name="lock-closed" size={14} color="#FFFFFF" />
              <Text style={styles.smallButtonText}>Close</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.smallButton, { backgroundColor: '#6B7280' }]}
              onPress={() => handleArchivePoll(item._id)}
            >
              <Ionicons name="archive" size={14} color="#FFFFFF" />
              <Text style={styles.smallButtonText}>Archive</Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (isLoading && polls.length === 0) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <Ionicons name="bar-chart" size={24} color="#6366F1" />
        <Text style={[styles.headerTitle, { color: colors.text }]}>Poll Management</Text>
        <TouchableOpacity
          style={[styles.createBtn, { backgroundColor: colors.tint }]}
          onPress={() => setShowCreateModal(true)}
        >
          <Ionicons name="add" size={18} color="#FFFFFF" />
          <Text style={styles.createBtnText}>New Poll</Text>
        </TouchableOpacity>
      </View>

      {renderTabs()}

      <FlatList
        data={polls}
        renderItem={renderPollCard}
        keyExtractor={item => item._id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          hasMore ? <ActivityIndicator style={{ padding: 20 }} color={colors.tint} /> : null
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="bar-chart-outline" size={48} color={colors.icon} />
            <Text style={[styles.emptyText, { color: colors.icon }]}>
              No {activeTab} polls
            </Text>
          </View>
        }
      />

      {/* Create Poll Modal */}
      <Modal visible={showCreateModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.createModalContent, { backgroundColor: colors.card }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Create New Poll</Text>

              <Text style={[styles.fieldLabel, { color: colors.icon }]}>Title *</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                placeholder="What's your question?"
                placeholderTextColor={colors.icon}
                value={newTitle}
                onChangeText={setNewTitle}
              />

              <Text style={[styles.fieldLabel, { color: colors.icon }]}>Description</Text>
              <TextInput
                style={[styles.input, styles.multilineInput, { color: colors.text, borderColor: colors.border }]}
                placeholder="Optional description..."
                placeholderTextColor={colors.icon}
                value={newDescription}
                onChangeText={setNewDescription}
                multiline
              />

              <Text style={[styles.fieldLabel, { color: colors.icon }]}>Options *</Text>
              {newOptions.map((opt, idx) => (
                <View key={idx} style={styles.optionInputRow}>
                  <TextInput
                    style={[styles.input, { flex: 1, color: colors.text, borderColor: colors.border }]}
                    placeholder={`Option ${idx + 1}`}
                    placeholderTextColor={colors.icon}
                    value={opt}
                    onChangeText={(text) => updateOption(idx, text)}
                  />
                  {newOptions.length > 2 && (
                    <TouchableOpacity style={styles.removeOptionBtn} onPress={() => removeOption(idx)}>
                      <Ionicons name="close-circle" size={22} color={colors.error} />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
              {newOptions.length < 6 && (
                <TouchableOpacity style={styles.addOptionBtn} onPress={addOption}>
                  <Ionicons name="add-circle-outline" size={18} color={colors.tint} />
                  <Text style={[styles.addOptionText, { color: colors.tint }]}>Add Option</Text>
                </TouchableOpacity>
              )}

              <Text style={[styles.fieldLabel, { color: colors.icon }]}>Coins Per Vote</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                placeholder="10"
                placeholderTextColor={colors.icon}
                value={newCoinsPerVote}
                onChangeText={setNewCoinsPerVote}
                keyboardType="numeric"
              />

              <View style={styles.switchRow}>
                <Text style={[styles.switchLabel, { color: colors.text }]}>Daily Poll</Text>
                <Switch
                  value={newIsDaily}
                  onValueChange={setNewIsDaily}
                  trackColor={{ false: '#E2E8F0', true: colors.tint }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: colors.border }]}
                  onPress={() => {
                    setShowCreateModal(false);
                    resetCreateForm();
                  }}
                >
                  <Text style={[styles.modalButtonText, { color: colors.text }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: colors.tint }]}
                  onPress={handleCreatePoll}
                  disabled={isCreating}
                >
                  {isCreating ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={[styles.modalButtonText, { color: '#FFFFFF' }]}>Create</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Poll Detail Modal */}
      <Modal visible={showDetailModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.detailModalContent, { backgroundColor: colors.card }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {selectedPoll && (
                <>
                  <Text style={[styles.modalTitle, { color: colors.text }]}>{selectedPoll.title}</Text>
                  {selectedPoll.description && (
                    <Text style={[styles.detailDescription, { color: colors.icon }]}>
                      {selectedPoll.description}
                    </Text>
                  )}

                  <View style={styles.detailStats}>
                    <View style={styles.detailStat}>
                      <Text style={[styles.detailStatValue, { color: colors.text }]}>{selectedPoll.totalVotes}</Text>
                      <Text style={[styles.detailStatLabel, { color: colors.icon }]}>Total Votes</Text>
                    </View>
                    <View style={styles.detailStat}>
                      <Text style={[styles.detailStatValue, { color: colors.text }]}>{selectedPoll.coinsPerVote}</Text>
                      <Text style={[styles.detailStatLabel, { color: colors.icon }]}>Coins/Vote</Text>
                    </View>
                    <View style={styles.detailStat}>
                      <Text style={[styles.detailStatValue, { color: getStatusColor(selectedPoll.status) }]}>
                        {selectedPoll.status}
                      </Text>
                      <Text style={[styles.detailStatLabel, { color: colors.icon }]}>Status</Text>
                    </View>
                  </View>

                  <Text style={[styles.fieldLabel, { color: colors.icon, marginTop: 16 }]}>Results</Text>
                  {selectedPoll.options.map((opt, idx) => {
                    const pct = selectedPoll.totalVotes > 0
                      ? Math.round((opt.voteCount / selectedPoll.totalVotes) * 100)
                      : 0;
                    return (
                      <View key={opt.id || idx} style={styles.resultRow}>
                        <View style={styles.resultInfo}>
                          <Text style={[styles.resultText, { color: colors.text }]}>{opt.text}</Text>
                          <Text style={[styles.resultCount, { color: colors.icon }]}>
                            {opt.voteCount} ({pct}%)
                          </Text>
                        </View>
                        <View style={[styles.resultBarBg, { backgroundColor: `${colors.tint}15` }]}>
                          <View style={[styles.resultBarFill, { width: `${pct}%`, backgroundColor: colors.tint }]} />
                        </View>
                      </View>
                    );
                  })}

                  <View style={styles.detailDateRow}>
                    <Ionicons name="calendar-outline" size={14} color={colors.icon} />
                    <Text style={[styles.dateText, { color: colors.icon }]}>
                      {format(new Date(selectedPoll.startsAt), 'MMM d, yyyy h:mm a')} -{' '}
                      {format(new Date(selectedPoll.endsAt), 'MMM d, yyyy h:mm a')}
                    </Text>
                  </View>
                </>
              )}
            </ScrollView>
            <TouchableOpacity
              style={[styles.closeDetailBtn, { backgroundColor: colors.border }]}
              onPress={() => {
                setShowDetailModal(false);
                setSelectedPoll(null);
              }}
            >
              <Text style={[styles.modalButtonText, { color: colors.text }]}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 10,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', flex: 1 },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  createBtnText: { color: '#FFFFFF', fontWeight: '600', fontSize: 13 },
  tabsContainer: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 8, gap: 8 },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#E2E8F0',
  },
  tabText: { fontSize: 14, fontWeight: '600' },
  listContent: { padding: 16, paddingTop: 8 },
  card: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  cardInfo: { flex: 1, marginLeft: 12 },
  pollTitle: { fontSize: 15, fontWeight: '600' },
  subtitle: { fontSize: 12, marginTop: 2 },
  badges: { flexDirection: 'row', gap: 4 },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  optionsPreview: { marginTop: 12 },
  optionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, position: 'relative' },
  optionBar: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 4 },
  optionText: { flex: 1, fontSize: 13, paddingVertical: 6, paddingHorizontal: 8 },
  optionCount: { fontSize: 12, fontWeight: '600', paddingRight: 4 },
  moreOptions: { fontSize: 11, marginTop: 2 },
  dateRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 4 },
  dateText: { fontSize: 11 },
  actionButtons: { flexDirection: 'row', marginTop: 10, gap: 8 },
  smallButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  smallButtonText: { color: '#FFFFFF', fontWeight: '600', fontSize: 12 },
  emptyContainer: { padding: 40, alignItems: 'center' },
  emptyText: { marginTop: 12, fontSize: 16 },
  // Create modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  createModalContent: { borderRadius: 16, padding: 20, maxHeight: '85%' },
  detailModalContent: { borderRadius: 16, padding: 20, maxHeight: '85%' },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  fieldLabel: { fontSize: 12, fontWeight: '600', marginBottom: 6, marginTop: 12 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
  },
  multilineInput: { minHeight: 60, textAlignVertical: 'top' },
  optionInputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 4 },
  removeOptionBtn: { padding: 4 },
  addOptionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6 },
  addOptionText: { fontSize: 13, fontWeight: '500' },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  switchLabel: { fontSize: 14, fontWeight: '500' },
  modalButtons: { flexDirection: 'row', marginTop: 20, gap: 12 },
  modalButton: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  modalButtonText: { fontWeight: '600' },
  // Detail modal
  detailDescription: { fontSize: 14, lineHeight: 20, marginBottom: 8 },
  detailStats: { flexDirection: 'row', marginTop: 12, gap: 8 },
  detailStat: { flex: 1, alignItems: 'center', padding: 10, borderRadius: 8, backgroundColor: '#F8FAFC' },
  detailStatValue: { fontSize: 18, fontWeight: '700' },
  detailStatLabel: { fontSize: 11, marginTop: 2 },
  resultRow: { marginBottom: 12 },
  resultInfo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  resultText: { fontSize: 13, fontWeight: '500', flex: 1 },
  resultCount: { fontSize: 12 },
  resultBarBg: { height: 8, borderRadius: 4, overflow: 'hidden' },
  resultBarFill: { height: '100%', borderRadius: 4 },
  detailDateRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16, gap: 4 },
  closeDetailBtn: { paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginTop: 12 },
});
