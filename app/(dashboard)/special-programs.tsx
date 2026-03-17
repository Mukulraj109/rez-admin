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
  ScrollView,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  specialProgramsService,
  ProgramConfig,
  ProgramMember,
  ProgramStats,
  ProgramSlug,
  MemberStatus,
} from '../../services/api/specialPrograms';
import { Colors } from '../../constants/Colors';
import { showAlert, showConfirm } from '../../utils/alert';

type TabFilter = 'overview' | 'student_zone' | 'corporate_perks' | 'nuqta_prive';

const TABS: { value: TabFilter; label: string; icon: string }[] = [
  { value: 'overview', label: 'Overview', icon: 'grid-outline' },
  { value: 'student_zone', label: 'Student', icon: 'school-outline' },
  { value: 'corporate_perks', label: 'Corporate', icon: 'briefcase-outline' },
  { value: 'nuqta_prive', label: 'Privé', icon: 'diamond-outline' },
];

const STATUS_COLORS: Record<string, string> = {
  active: Colors.light.successDark,
  pending_verification: Colors.light.warning,
  suspended: Colors.light.error,
  expired: Colors.light.mutedDark,
  revoked: Colors.light.errorDark,
};

export default function SpecialProgramsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [activeTab, setActiveTab] = useState<TabFilter>('overview');
  const [programs, setPrograms] = useState<ProgramConfig[]>([]);
  const [stats, setStats] = useState<ProgramStats | null>(null);
  const [members, setMembers] = useState<ProgramMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [memberPage, setMemberPage] = useState(1);
  const [hasMoreMembers, setHasMoreMembers] = useState(true);
  const [memberStatusFilter, setMemberStatusFilter] = useState<MemberStatus | undefined>(undefined);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Edit modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProgram, setEditingProgram] = useState<ProgramConfig | null>(null);
  const [editCap, setEditCap] = useState('');
  const [editMultiplier, setEditMultiplier] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [saving, setSaving] = useState(false);

  // Member search
  const [memberSearch, setMemberSearch] = useState('');
  const [searchTimeout, setSearchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

  // Action modal for member
  const [showActionModal, setShowActionModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<ProgramMember | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [actionExpiresAt, setActionExpiresAt] = useState('');

  useEffect(() => {
    loadData();
  }, [activeTab, memberStatusFilter]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [programsData, statsData] = await Promise.all([
        specialProgramsService.getPrograms(),
        specialProgramsService.getStats(),
      ]);
      setPrograms(programsData);
      setStats(statsData);

      if (activeTab !== 'overview') {
        await loadMembers(activeTab as ProgramSlug, 1);
      }
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const loadMembers = async (slug: ProgramSlug, page: number, append = false) => {
    try {
      const data = await specialProgramsService.getMembers(slug, page, 20, memberStatusFilter, memberSearch || undefined);
      if (append) {
        setMembers(prev => [...prev, ...data.members]);
      } else {
        setMembers(data.members);
      }
      setHasMoreMembers(page < data.pagination.totalPages);
      setMemberPage(page);
    } catch (error: any) {
      if (__DEV__) console.error('Failed to load members:', error);
    }
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [activeTab, memberStatusFilter]);

  const handleToggleProgram = async (slug: ProgramSlug) => {
    const program = programs.find(p => p.slug === slug);
    if (!program) return;

    const confirmed = await showConfirm(
      `${program.isActive ? 'Deactivate' : 'Activate'} ${program.name}?`,
      program.isActive
        ? 'Members will not earn multiplier bonuses while deactivated.'
        : 'Members will resume earning multiplier bonuses.'
    );
    if (!confirmed) return;

    try {
      await specialProgramsService.toggleProgram(slug);
      await loadData();
      showAlert('Success', `${program.name} has been ${program.isActive ? 'deactivated' : 'activated'}`);
    } catch (error: any) {
      showAlert('Error', error.message);
    }
  };

  const handleEditProgram = (program: ProgramConfig) => {
    setEditingProgram(program);
    setEditCap(program.earningConfig.monthlyCap.toString());
    setEditMultiplier(program.earningConfig.multiplier.toString());
    setEditDescription(program.description);
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingProgram) return;
    setSaving(true);
    try {
      await specialProgramsService.updateProgram(editingProgram.slug, {
        description: editDescription,
        earningConfig: {
          monthlyCap: parseInt(editCap) || 0,
          multiplier: parseFloat(editMultiplier) || 1,
        },
      });
      setShowEditModal(false);
      await loadData();
      showAlert('Success', 'Program updated successfully');
    } catch (error: any) {
      showAlert('Error', error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleMemberAction = async (action: 'activate' | 'suspend' | 'revoke' | 'reactivate') => {
    if (!selectedMember) return;
    setProcessingId(selectedMember._id);
    try {
      await specialProgramsService.updateMemberStatus(
        selectedMember.programSlug,
        typeof selectedMember.user === 'string' ? selectedMember.user : selectedMember.user._id,
        action,
        actionReason || undefined,
        actionExpiresAt || undefined
      );
      setShowActionModal(false);
      setActionReason('');
      setActionExpiresAt('');
      setSelectedMember(null);
      if (activeTab !== 'overview') {
        await loadMembers(activeTab as ProgramSlug, 1);
      }
      await specialProgramsService.getStats().then(setStats);
      showAlert('Success', `Member ${action}d successfully`);
    } catch (error: any) {
      showAlert('Error', error.message);
    } finally {
      setProcessingId(null);
    }
  };

  const getMemberName = (member: ProgramMember): string => {
    if (typeof member.user === 'string') return member.user;
    const u = member.user;
    return u.fullName || `${u.profile?.firstName || ''} ${u.profile?.lastName || ''}`.trim() || u.phoneNumber || 'Unknown';
  };

  // ========== RENDER: Overview ==========
  const renderOverview = () => {
    if (!stats) return null;

    return (
      <ScrollView
        style={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {/* Stats Cards */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.statValue, { color: colors.successDark }]}>{stats.totalActiveMembers}</Text>
            <Text style={[styles.statLabel, { color: colors.icon }]}>Active Members</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.statValue, { color: colors.warning }]}>{stats.totalPendingVerifications}</Text>
            <Text style={[styles.statLabel, { color: colors.icon }]}>Pending</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.statValue, { color: colors.info }]}>{stats.totalMonthlyEarnings.toLocaleString()}</Text>
            <Text style={[styles.statLabel, { color: colors.icon }]}>Monthly Earnings</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.statValue, { color: colors.purple }]}>{stats.totalMultiplierBonus.toLocaleString()}</Text>
            <Text style={[styles.statLabel, { color: colors.icon }]}>Bonus Given</Text>
          </View>
        </View>

        {/* Program Cards */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Programs</Text>
        {programs.map(program => {
          const programStats = stats.byProgram?.[program.slug];
          return (
            <View key={program.slug} style={[styles.programCard, { backgroundColor: colors.card }]}>
              <View style={styles.programCardHeader}>
                <View style={styles.programInfo}>
                  <Text style={styles.programEmoji}>{program.badge}</Text>
                  <View>
                    <Text style={[styles.programName, { color: colors.text }]}>{program.name}</Text>
                    <Text style={[styles.programSlug, { color: colors.icon }]}>{program.slug}</Text>
                  </View>
                </View>
                <View style={styles.programActions}>
                  <TouchableOpacity
                    style={[styles.statusBadge, { backgroundColor: program.isActive ? '#ECFDF5' : colors.errorLight }]}
                    onPress={() => handleToggleProgram(program.slug)}
                  >
                    <Text style={{ color: program.isActive ? colors.successDark : colors.errorDark, fontSize: 12, fontWeight: '600' }}>
                      {program.isActive ? 'Active' : 'Inactive'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleEditProgram(program)} style={styles.editButton}>
                    <Ionicons name="settings-outline" size={18} color={colors.icon} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.programMeta}>
                <View style={styles.metaItem}>
                  <Text style={[styles.metaLabel, { color: colors.icon }]}>Cap</Text>
                  <Text style={[styles.metaValue, { color: colors.text }]}>
                    {program.earningConfig.monthlyCap === 0 ? 'Unlimited' : program.earningConfig.monthlyCap.toLocaleString()}
                  </Text>
                </View>
                <View style={styles.metaItem}>
                  <Text style={[styles.metaLabel, { color: colors.icon }]}>Multiplier</Text>
                  <Text style={[styles.metaValue, { color: colors.text }]}>{program.earningConfig.multiplier}x</Text>
                </View>
                <View style={styles.metaItem}>
                  <Text style={[styles.metaLabel, { color: colors.icon }]}>Members</Text>
                  <Text style={[styles.metaValue, { color: colors.text }]}>{programStats?.activeMembers || 0}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Text style={[styles.metaLabel, { color: colors.icon }]}>Monthly Earned</Text>
                  <Text style={[styles.metaValue, { color: colors.text }]}>{(programStats?.monthlyEarnings || 0).toLocaleString()}</Text>
                </View>
              </View>
            </View>
          );
        })}

        <View style={{ height: 40 }} />
      </ScrollView>
    );
  };

  // ========== RENDER: Member List ==========
  const renderMemberItem = ({ item }: { item: ProgramMember }) => (
    <TouchableOpacity
      style={[styles.memberCard, { backgroundColor: colors.card }]}
      onPress={() => {
        setSelectedMember(item);
        setShowActionModal(true);
      }}
    >
      <View style={styles.memberHeader}>
        <View>
          <Text style={[styles.memberName, { color: colors.text }]}>{getMemberName(item)}</Text>
          <Text style={[styles.memberPhone, { color: colors.icon }]}>
            {typeof item.user !== 'string' ? item.user.phoneNumber || item.user.email || '' : ''}
          </Text>
        </View>
        <View style={[styles.memberStatusBadge, { backgroundColor: (STATUS_COLORS[item.status] || colors.mutedDark) + '20' }]}>
          <Text style={{ color: STATUS_COLORS[item.status] || colors.mutedDark, fontSize: 11, fontWeight: '600' }}>
            {item.status.replace('_', ' ')}
          </Text>
        </View>
      </View>
      <View style={styles.memberStats}>
        <View style={styles.memberStat}>
          <Text style={[styles.memberStatValue, { color: colors.text }]}>{item.currentMonthEarnings.toLocaleString()}</Text>
          <Text style={[styles.memberStatLabel, { color: colors.icon }]}>This Month</Text>
        </View>
        <View style={styles.memberStat}>
          <Text style={[styles.memberStatValue, { color: colors.text }]}>{item.totalEarnings.toLocaleString()}</Text>
          <Text style={[styles.memberStatLabel, { color: colors.icon }]}>Total</Text>
        </View>
        <View style={styles.memberStat}>
          <Text style={[styles.memberStatValue, { color: colors.text }]}>+{item.totalMultiplierBonus.toLocaleString()}</Text>
          <Text style={[styles.memberStatLabel, { color: colors.icon }]}>Bonus</Text>
        </View>
        <View style={styles.memberStat}>
          <Text style={[styles.memberStatValue, { color: colors.text }]}>{item.monthsActive}</Text>
          <Text style={[styles.memberStatLabel, { color: colors.icon }]}>Months</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderMembersList = () => (
    <FlatList
      data={members}
      keyExtractor={item => item._id}
      renderItem={renderMemberItem}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      onEndReached={() => {
        if (hasMoreMembers && activeTab !== 'overview') {
          loadMembers(activeTab as ProgramSlug, memberPage + 1, true);
        }
      }}
      onEndReachedThreshold={0.5}
      ListHeaderComponent={
        <View>
          <TextInput
            style={[styles.searchInput, { color: colors.text, borderColor: colors.icon + '30', backgroundColor: colors.card }]}
            value={memberSearch}
            onChangeText={(text) => {
              setMemberSearch(text);
              if (searchTimeout) clearTimeout(searchTimeout);
              setSearchTimeout(setTimeout(() => {
                setMembers([]);
                if (activeTab !== 'overview') {
                  loadMembers(activeTab as ProgramSlug, 1);
                }
              }, 500));
            }}
            placeholder="Search by name, email, or phone..."
            placeholderTextColor={colors.icon}
          />
        <View style={styles.memberFilters}>
          {(['all', 'active', 'pending_verification', 'suspended', 'expired', 'revoked'] as const).map(s => (
            <TouchableOpacity
              key={s}
              style={[
                styles.filterChip,
                (memberStatusFilter === (s === 'all' ? undefined : s as MemberStatus) ||
                 (s === 'all' && !memberStatusFilter))
                  && { backgroundColor: colors.tint + '20' },
              ]}
              onPress={() => {
                setMemberStatusFilter(s === 'all' ? undefined : s as MemberStatus);
                setMembers([]);
              }}
            >
              <Text style={[
                styles.filterChipText,
                { color: (memberStatusFilter === (s === 'all' ? undefined : s as MemberStatus) ||
                  (s === 'all' && !memberStatusFilter)) ? colors.tint : colors.icon },
              ]}>
                {s === 'all' ? 'All' : s.replace('_', ' ')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        </View>
      }
      ListEmptyComponent={
        !isLoading ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={48} color={colors.icon} />
            <Text style={[styles.emptyText, { color: colors.icon }]}>No members found</Text>
          </View>
        ) : null
      }
      contentContainerStyle={{ paddingBottom: 40 }}
    />
  );

  // ========== RENDER: Edit Modal ==========
  const renderEditModal = () => (
    <Modal visible={showEditModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowEditModal(false)}>
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowEditModal(false)}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Edit {editingProgram?.name}</Text>
          <TouchableOpacity onPress={handleSaveEdit} disabled={saving}>
            {saving ? <ActivityIndicator size="small" /> : <Text style={{ color: colors.tint, fontWeight: '600' }}>Save</Text>}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          <Text style={[styles.inputLabel, { color: colors.icon }]}>Description</Text>
          <TextInput
            style={[styles.textInput, styles.textArea, { color: colors.text, borderColor: colors.icon + '30' }]}
            value={editDescription}
            onChangeText={setEditDescription}
            multiline
            numberOfLines={3}
            placeholder="Program description"
            placeholderTextColor={colors.icon}
          />

          <Text style={[styles.inputLabel, { color: colors.icon }]}>Monthly Cap (0 = unlimited)</Text>
          <TextInput
            style={[styles.textInput, { color: colors.text, borderColor: colors.icon + '30' }]}
            value={editCap}
            onChangeText={setEditCap}
            keyboardType="numeric"
            placeholder="5000"
            placeholderTextColor={colors.icon}
          />

          <Text style={[styles.inputLabel, { color: colors.icon }]}>Multiplier</Text>
          <TextInput
            style={[styles.textInput, { color: colors.text, borderColor: colors.icon + '30' }]}
            value={editMultiplier}
            onChangeText={setEditMultiplier}
            keyboardType="decimal-pad"
            placeholder="1.5"
            placeholderTextColor={colors.icon}
          />

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </Modal>
  );

  // ========== RENDER: Member Action Modal ==========
  const renderActionModal = () => (
    <Modal visible={showActionModal} transparent animationType="fade" onRequestClose={() => setShowActionModal(false)}>
      <TouchableOpacity style={styles.actionOverlay} activeOpacity={1} onPress={() => setShowActionModal(false)}>
        <View style={[styles.actionSheet, { backgroundColor: colors.card }]}>
          <Text style={[styles.actionTitle, { color: colors.text }]}>
            {getMemberName(selectedMember!)}
          </Text>
          <Text style={[styles.actionSubtitle, { color: colors.icon }]}>
            Status: {selectedMember?.status.replace('_', ' ')}
          </Text>

          <TextInput
            style={[styles.textInput, { color: colors.text, borderColor: colors.icon + '30', marginVertical: 12 }]}
            value={actionReason}
            onChangeText={setActionReason}
            placeholder="Reason (optional)"
            placeholderTextColor={colors.icon}
          />

          <TextInput
            style={[styles.textInput, { color: colors.text, borderColor: colors.icon + '30', marginBottom: 12 }]}
            value={actionExpiresAt}
            onChangeText={setActionExpiresAt}
            placeholder="Expiration date (YYYY-MM-DD, optional)"
            placeholderTextColor={colors.icon}
          />

          {selectedMember?.status !== 'active' && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.successDark }]}
              onPress={() => handleMemberAction(selectedMember?.status === 'pending_verification' ? 'activate' : 'reactivate')}
              disabled={!!processingId}
            >
              {processingId === selectedMember?._id ? <ActivityIndicator color={colors.card} size="small" /> :
                <Text style={styles.actionButtonText}>
                  {selectedMember?.status === 'pending_verification' ? 'Approve & Activate' : 'Reactivate'}
                </Text>
              }
            </TouchableOpacity>
          )}

          {selectedMember?.status === 'active' && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.warning }]}
              onPress={() => handleMemberAction('suspend')}
              disabled={!!processingId}
            >
              {processingId === selectedMember?._id ? <ActivityIndicator color={colors.card} size="small" /> :
                <Text style={styles.actionButtonText}>Suspend</Text>
              }
            </TouchableOpacity>
          )}

          {selectedMember?.status !== 'revoked' && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.errorDark }]}
              onPress={() => handleMemberAction('revoke')}
              disabled={!!processingId}
            >
              {processingId === selectedMember?._id ? <ActivityIndicator color={colors.card} size="small" /> :
                <Text style={styles.actionButtonText}>Revoke</Text>
              }
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.icon + '20' }]}
            onPress={() => { setShowActionModal(false); setActionReason(''); setActionExpiresAt(''); }}
          >
            <Text style={[styles.actionButtonText, { color: colors.text }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Special Programs</Text>
      </View>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar} contentContainerStyle={styles.tabBarContent}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.value}
            style={[styles.tab, activeTab === tab.value && { backgroundColor: colors.tint + '20', borderColor: colors.tint }]}
            onPress={() => {
              setActiveTab(tab.value);
              setMembers([]);
              setMemberStatusFilter(undefined);
              setMemberSearch('');
            }}
          >
            <Ionicons
              name={tab.icon as any}
              size={16}
              color={activeTab === tab.value ? colors.tint : colors.icon}
            />
            <Text style={[styles.tabText, { color: activeTab === tab.value ? colors.tint : colors.icon }]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Content */}
      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      ) : activeTab === 'overview' ? (
        renderOverview()
      ) : (
        renderMembersList()
      )}

      {/* Modals */}
      {renderEditModal()}
      {showActionModal && selectedMember && renderActionModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Tabs
  tabBar: {
    maxHeight: 50,
    paddingHorizontal: 12,
  },
  tabBarContent: {
    gap: 8,
    paddingVertical: 4,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Stats
  scrollContent: {
    flex: 1,
    paddingHorizontal: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 16,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },

  // Programs
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  programCard: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  programCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  programInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  programEmoji: {
    fontSize: 28,
  },
  programName: {
    fontSize: 16,
    fontWeight: '600',
  },
  programSlug: {
    fontSize: 12,
  },
  programActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  editButton: {
    padding: 6,
  },
  programMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaItem: {
    alignItems: 'center',
  },
  metaLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Members
  memberFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    padding: 16,
    paddingBottom: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.light.gray200,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  memberCard: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 10,
    padding: 12,
  },
  memberHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '600',
  },
  memberPhone: {
    fontSize: 12,
    marginTop: 2,
  },
  memberStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  memberStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  memberStat: {
    alignItems: 'center',
  },
  memberStatValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  memberStatLabel: {
    fontSize: 10,
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 14,
    marginTop: 12,
  },

  // Modal
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.gray200,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalContent: {
    padding: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 6,
    marginTop: 16,
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },

  // Action modal
  actionOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  actionSheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    paddingBottom: 40,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 13,
  },
  actionButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  actionButtonText: {
    color: Colors.light.card,
    fontSize: 14,
    fontWeight: '600',
  },
});
