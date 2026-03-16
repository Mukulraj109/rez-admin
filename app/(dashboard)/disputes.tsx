import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { disputesService, AdminDispute, DisputeStats } from '../../services/api/disputes';
import { Colors } from '../../constants/Colors';
import { format } from 'date-fns';
import { showAlert, showConfirm } from '../../utils/alert';

// ─── Constants ──────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  open: Colors.light.error,
  under_review: Colors.light.warning,
  escalated: Colors.light.purple,
  resolved_refund: Colors.light.success,
  resolved_reject: Colors.light.info,
  auto_resolved: Colors.light.indigo,
  closed: Colors.light.mutedDark,
};

const STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  under_review: 'Under Review',
  escalated: 'Escalated',
  resolved_refund: 'Refunded',
  resolved_reject: 'Rejected',
  auto_resolved: 'Auto-Resolved',
  closed: 'Closed',
};

const PRIORITY_COLORS: Record<string, string> = {
  low: Colors.light.muted,
  medium: Colors.light.info,
  high: Colors.light.warning,
  urgent: Colors.light.error,
};

const REASON_LABELS: Record<string, string> = {
  item_not_received: 'Item Not Received',
  wrong_item: 'Wrong Item',
  damaged_item: 'Damaged Item',
  quality_issue: 'Quality Issue',
  unauthorized_charge: 'Unauthorized Charge',
  double_charge: 'Double Charge',
  service_not_rendered: 'Service Not Rendered',
  other: 'Other',
};

const STATUS_OPTIONS = ['all', 'open', 'under_review', 'escalated', 'resolved_refund', 'resolved_reject', 'auto_resolved'];
const PRIORITY_OPTIONS = ['all', 'low', 'medium', 'high', 'urgent'];

// ─── Component ──────────────────────────────────────────────

export default function DisputesScreen() {
  // Data state
  const [disputes, setDisputes] = useState<AdminDispute[]>([]);
  const [stats, setStats] = useState<DisputeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Filters
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Detail modal
  const [selectedDispute, setSelectedDispute] = useState<AdminDispute | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  // Resolve modal
  const [showResolve, setShowResolve] = useState(false);
  const [resolveDecision, setResolveDecision] = useState<'refund' | 'reject' | 'partial_refund'>('refund');
  const [resolveAmount, setResolveAmount] = useState('');
  const [resolveReason, setResolveReason] = useState('');
  const [resolveLoading, setResolveLoading] = useState(false);

  // Note modal
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteText, setNoteText] = useState('');

  // ─── Data Loading ───────────────────────────────────────

  const loadStats = useCallback(async () => {
    try {
      const response = await disputesService.getStats();
      if (response.success && response.data) {
        setStats(response.data as any);
      }
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  }, []);

  const loadDisputes = useCallback(async (pageNum: number = 1, append: boolean = false) => {
    if (!append) setLoading(true);
    else setLoadingMore(true);

    try {
      const params: any = { page: pageNum, limit: 20 };
      if (filterStatus !== 'all') params.status = filterStatus;
      if (filterPriority !== 'all') params.priority = filterPriority;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const response = await disputesService.getDisputes(params);
      if (response.success && response.data) {
        const data = response.data as any;
        const items = data.disputes || [];
        const pagination = data.pagination;

        if (append) {
          setDisputes(prev => [...prev, ...items]);
        } else {
          setDisputes(items);
        }
        setPage(pageNum);
        setHasMore(pagination?.hasNext ?? false);
      }
    } catch (err) {
      console.error('Failed to load disputes:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [filterStatus, filterPriority, searchQuery]);

  useEffect(() => {
    loadStats();
    loadDisputes(1);
  }, [filterStatus, filterPriority]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadStats(), loadDisputes(1)]);
    setRefreshing(false);
  }, [loadStats, loadDisputes]);

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      loadDisputes(page + 1, true);
    }
  }, [loadingMore, hasMore, page, loadDisputes]);

  // ─── Actions ────────────────────────────────────────────

  const openDetail = async (dispute: AdminDispute) => {
    setDetailLoading(true);
    setShowDetail(true);
    try {
      const response = await disputesService.getDispute(dispute._id);
      if (response.success && response.data) {
        setSelectedDispute(response.data as any);
      } else {
        setSelectedDispute(dispute);
      }
    } catch {
      setSelectedDispute(dispute);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedDispute) return;
    try {
      const response = await disputesService.assign(selectedDispute._id);
      if (response.success) {
        showAlert('Success', 'Dispute assigned to you');
        loadDisputes(1);
        loadStats();
        setShowDetail(false);
      } else {
        showAlert('Error', (response as any).message || 'Failed to assign');
      }
    } catch (err: any) {
      showAlert('Error', err.message || 'Failed to assign');
    }
  };

  const handleResolve = async () => {
    if (!selectedDispute || !resolveReason.trim()) {
      showAlert('Error', 'Please provide a reason');
      return;
    }
    if (resolveDecision === 'partial_refund' && (!resolveAmount || Number(resolveAmount) <= 0)) {
      showAlert('Error', 'Please enter a valid refund amount');
      return;
    }

    setResolveLoading(true);
    try {
      const response = await disputesService.resolve(selectedDispute._id, {
        decision: resolveDecision,
        amount: resolveDecision === 'partial_refund' ? Number(resolveAmount) : undefined,
        reason: resolveReason,
      });

      if (response.success) {
        showAlert('Success', `Dispute ${resolveDecision === 'reject' ? 'rejected' : 'resolved with refund'}`);
        setShowResolve(false);
        setShowDetail(false);
        setResolveReason('');
        setResolveAmount('');
        loadDisputes(1);
        loadStats();
      } else {
        showAlert('Error', (response as any).message || 'Failed to resolve');
      }
    } catch (err: any) {
      showAlert('Error', err.message || 'Failed to resolve');
    } finally {
      setResolveLoading(false);
    }
  };

  const handleEscalate = async () => {
    if (!selectedDispute) return;
    const confirmed = await showConfirm('Escalate Dispute', 'This will escalate the dispute and extend the timeout by 48 hours.');
    if (!confirmed) return;

    try {
      const response = await disputesService.escalate(selectedDispute._id, 'Escalated by admin for senior review');
      if (response.success) {
        showAlert('Success', 'Dispute escalated');
        setShowDetail(false);
        loadDisputes(1);
        loadStats();
      }
    } catch (err: any) {
      showAlert('Error', err.message || 'Failed to escalate');
    }
  };

  const handleAddNote = async () => {
    if (!selectedDispute || !noteText.trim()) return;
    try {
      await disputesService.addNote(selectedDispute._id, noteText.trim());
      showAlert('Success', 'Note added');
      setShowNoteModal(false);
      setNoteText('');
      // Refresh detail
      openDetail(selectedDispute);
    } catch (err: any) {
      showAlert('Error', err.message || 'Failed to add note');
    }
  };

  const handleSearch = () => {
    loadDisputes(1);
  };

  // ─── Stats Row ──────────────────────────────────────────

  const renderStats = () => {
    if (!stats) return null;
    return (
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { borderLeftColor: Colors.light.error }]}>
          <Text style={styles.statValue}>{stats.open}</Text>
          <Text style={styles.statLabel}>Open</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: Colors.light.warning }]}>
          <Text style={styles.statValue}>{stats.underReview}</Text>
          <Text style={styles.statLabel}>Reviewing</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: Colors.light.purple }]}>
          <Text style={styles.statValue}>{stats.escalated}</Text>
          <Text style={styles.statLabel}>Escalated</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: Colors.light.success }]}>
          <Text style={styles.statValue}>{stats.resolvedToday}</Text>
          <Text style={styles.statLabel}>Resolved Today</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: Colors.light.info }]}>
          <Text style={styles.statValue}>{stats.avgResolutionHours}h</Text>
          <Text style={styles.statLabel}>Avg Resolution</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: Colors.light.indigo }]}>
          <Text style={styles.statValue}>{stats.refundRate}%</Text>
          <Text style={styles.statLabel}>Refund Rate</Text>
        </View>
      </View>
    );
  };

  // ─── Filters ────────────────────────────────────────────

  const renderFilters = () => (
    <View style={styles.filterSection}>
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by dispute # or order #..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
          <Ionicons name="search" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
        {STATUS_OPTIONS.map(s => (
          <TouchableOpacity
            key={s}
            style={[styles.chip, filterStatus === s && styles.chipActive]}
            onPress={() => setFilterStatus(s)}
          >
            <Text style={[styles.chipText, filterStatus === s && styles.chipTextActive]}>
              {s === 'all' ? 'All Status' : STATUS_LABELS[s] || s}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
        {PRIORITY_OPTIONS.map(p => (
          <TouchableOpacity
            key={p}
            style={[styles.chip, filterPriority === p && styles.chipActive]}
            onPress={() => setFilterPriority(p)}
          >
            <Text style={[styles.chipText, filterPriority === p && styles.chipTextActive]}>
              {p === 'all' ? 'All Priority' : p.charAt(0).toUpperCase() + p.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  // ─── Dispute Card ───────────────────────────────────────

  const renderDisputeCard = useCallback(({ item }: { item: AdminDispute }) => {
    const statusColor = STATUS_COLORS[item.status] || Colors.light.muted;
    const priorityColor = PRIORITY_COLORS[item.priority] || Colors.light.muted;
    const userName = typeof item.user === 'object'
      ? (item.user?.profile?.firstName ? `${item.user.profile.firstName} ${item.user.profile?.lastName || ''}`.trim() : item.user?.phoneNumber || 'Unknown')
      : 'User';

    return (
      <TouchableOpacity style={styles.card} onPress={() => openDetail(item)}>
        <View style={styles.cardHeader}>
          <Text style={styles.disputeNumber}>{item.disputeNumber}</Text>
          <View style={[styles.badge, { backgroundColor: statusColor + '20' }]}>
            <Text style={[styles.badgeText, { color: statusColor }]}>
              {STATUS_LABELS[item.status] || item.status}
            </Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.cardRow}>
            <Ionicons name="person-outline" size={14} color={Colors.light.mutedDark} />
            <Text style={styles.cardRowText}>{userName}</Text>
          </View>
          <View style={styles.cardRow}>
            <Ionicons name="receipt-outline" size={14} color={Colors.light.mutedDark} />
            <Text style={styles.cardRowText}>Order: {item.targetRef}</Text>
          </View>
          <View style={styles.cardRow}>
            <Ionicons name="alert-circle-outline" size={14} color={Colors.light.mutedDark} />
            <Text style={styles.cardRowText}>{REASON_LABELS[item.reason] || item.reason}</Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.amountText}>{item.amount} coins</Text>
          <View style={[styles.priorityDot, { backgroundColor: priorityColor }]} />
          <Text style={styles.dateText}>
            {format(new Date(item.createdAt), 'MMM dd, HH:mm')}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }, []);

  // ─── Detail Modal ───────────────────────────────────────

  const renderDetailModal = () => {
    const d = selectedDispute;
    if (!d) return null;
    const isResolvable = ['open', 'under_review', 'escalated'].includes(d.status);

    return (
      <Modal visible={showDetail} animationType="slide" onRequestClose={() => setShowDetail(false)}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowDetail(false)}>
              <Ionicons name="close" size={24} color={Colors.light.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{d.disputeNumber}</Text>
            <View style={{ width: 24 }} />
          </View>

          {detailLoading ? (
            <ActivityIndicator size="large" style={{ marginTop: 40 }} />
          ) : (
            <ScrollView style={styles.modalBody} contentContainerStyle={{ paddingBottom: 100 }}>
              {/* Status + Priority */}
              <View style={styles.detailRow}>
                <View style={[styles.badge, { backgroundColor: (STATUS_COLORS[d.status] || '#999') + '20' }]}>
                  <Text style={[styles.badgeText, { color: STATUS_COLORS[d.status] || '#999' }]}>
                    {STATUS_LABELS[d.status] || d.status}
                  </Text>
                </View>
                <View style={[styles.badge, { backgroundColor: (PRIORITY_COLORS[d.priority] || '#999') + '20', marginLeft: 8 }]}>
                  <Text style={[styles.badgeText, { color: PRIORITY_COLORS[d.priority] || '#999' }]}>
                    {d.priority.toUpperCase()}
                  </Text>
                </View>
              </View>

              {/* Info */}
              <View style={styles.infoSection}>
                <InfoRow label="Reason" value={REASON_LABELS[d.reason] || d.reason} />
                <InfoRow label="Amount" value={`${d.amount} coins`} />
                <InfoRow label="Order" value={d.targetRef} />
                <InfoRow label="Created" value={format(new Date(d.createdAt), 'MMM dd yyyy, HH:mm')} />
                <InfoRow label="Auto-Resolve" value={format(new Date(d.autoResolveAt), 'MMM dd yyyy, HH:mm')} />
                {d.assignedTo && (
                  <InfoRow label="Assigned To" value={typeof d.assignedTo === 'object' ? d.assignedTo.name || d.assignedTo.email : d.assignedTo} />
                )}
              </View>

              {/* Description */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Description</Text>
                <Text style={styles.descText}>{d.description}</Text>
              </View>

              {/* Evidence */}
              {d.evidence.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Evidence ({d.evidence.length})</Text>
                  {d.evidence.map((e, i) => (
                    <View key={i} style={styles.evidenceItem}>
                      <Text style={styles.evidenceType}>{e.submitterType} — {format(new Date(e.submittedAt), 'MMM dd, HH:mm')}</Text>
                      <Text style={styles.evidenceDesc}>{e.description}</Text>
                      {e.attachments.length > 0 && (
                        <Text style={styles.attachmentCount}>{e.attachments.length} attachment(s)</Text>
                      )}
                    </View>
                  ))}
                </View>
              )}

              {/* Merchant Response */}
              {d.merchantResponse && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Merchant Response</Text>
                  <Text style={styles.descText}>{d.merchantResponse.response}</Text>
                  <Text style={styles.dateText}>
                    {format(new Date(d.merchantResponse.respondedAt), 'MMM dd yyyy, HH:mm')}
                  </Text>
                </View>
              )}

              {/* Resolution */}
              {d.resolution && (
                <View style={[styles.section, { backgroundColor: d.resolution.decision === 'reject' ? Colors.light.errorLight : Colors.light.successLight, borderRadius: 10, padding: 12 }]}>
                  <Text style={styles.sectionTitle}>Resolution</Text>
                  <InfoRow label="Decision" value={d.resolution.decision.replace('_', ' ').toUpperCase()} />
                  <InfoRow label="Amount" value={`${d.resolution.amount} coins`} />
                  <InfoRow label="Reason" value={d.resolution.reason} />
                  <InfoRow label="Resolved At" value={format(new Date(d.resolution.resolvedAt), 'MMM dd yyyy, HH:mm')} />
                </View>
              )}

              {/* Timeline */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Timeline</Text>
                {d.timeline.map((t, i) => (
                  <View key={i} style={styles.timelineItem}>
                    <View style={styles.timelineDot} />
                    <View style={styles.timelineContent}>
                      <Text style={styles.timelineAction}>{t.action.replace(/_/g, ' ')}</Text>
                      {t.details && <Text style={styles.timelineDetails}>{t.details}</Text>}
                      <Text style={styles.timelineTime}>
                        {t.performerType} — {format(new Date(t.timestamp), 'MMM dd, HH:mm')}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>

              {/* Actions */}
              {isResolvable && (
                <View style={styles.actionSection}>
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: Colors.light.info }]} onPress={handleAssign}>
                    <Ionicons name="person-add-outline" size={16} color="#fff" />
                    <Text style={styles.actionBtnText}>Assign to Me</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: Colors.light.success }]}
                    onPress={() => { setResolveDecision('refund'); setShowResolve(true); }}
                  >
                    <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
                    <Text style={styles.actionBtnText}>Resolve</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: Colors.light.purple }]} onPress={handleEscalate}>
                    <Ionicons name="arrow-up-circle-outline" size={16} color="#fff" />
                    <Text style={styles.actionBtnText}>Escalate</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: Colors.light.mutedDark }]}
                    onPress={() => setShowNoteModal(true)}
                  >
                    <Ionicons name="create-outline" size={16} color="#fff" />
                    <Text style={styles.actionBtnText}>Add Note</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          )}
        </SafeAreaView>

        {/* Resolve Sub-Modal */}
        <Modal visible={showResolve} transparent animationType="fade" onRequestClose={() => setShowResolve(false)}>
          <View style={styles.overlay}>
            <View style={styles.resolveModal}>
              <Text style={styles.resolveTitle}>Resolve Dispute</Text>

              <Text style={styles.inputLabel}>Decision</Text>
              <View style={styles.decisionRow}>
                {(['refund', 'reject', 'partial_refund'] as const).map(d => (
                  <TouchableOpacity
                    key={d}
                    style={[styles.decisionChip, resolveDecision === d && styles.decisionChipActive]}
                    onPress={() => setResolveDecision(d)}
                  >
                    <Text style={[styles.decisionChipText, resolveDecision === d && styles.decisionChipTextActive]}>
                      {d === 'partial_refund' ? 'Partial' : d.charAt(0).toUpperCase() + d.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {resolveDecision === 'partial_refund' && (
                <>
                  <Text style={styles.inputLabel}>Refund Amount (coins)</Text>
                  <TextInput
                    style={styles.input}
                    value={resolveAmount}
                    onChangeText={setResolveAmount}
                    keyboardType="numeric"
                    placeholder={`Max: ${selectedDispute?.amount || 0}`}
                  />
                </>
              )}

              <Text style={styles.inputLabel}>Reason</Text>
              <TextInput
                style={[styles.input, { height: 80 }]}
                value={resolveReason}
                onChangeText={setResolveReason}
                multiline
                placeholder="Explain the decision..."
              />

              <View style={styles.resolveActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowResolve(false)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.confirmBtn, resolveLoading && { opacity: 0.6 }]}
                  onPress={handleResolve}
                  disabled={resolveLoading}
                >
                  {resolveLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.confirmBtnText}>Confirm</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Note Sub-Modal */}
        <Modal visible={showNoteModal} transparent animationType="fade" onRequestClose={() => setShowNoteModal(false)}>
          <View style={styles.overlay}>
            <View style={styles.resolveModal}>
              <Text style={styles.resolveTitle}>Add Note</Text>
              <TextInput
                style={[styles.input, { height: 100 }]}
                value={noteText}
                onChangeText={setNoteText}
                multiline
                placeholder="Internal note..."
              />
              <View style={styles.resolveActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowNoteModal(false)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.confirmBtn} onPress={handleAddNote}>
                  <Text style={styles.confirmBtnText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </Modal>
    );
  };

  // ─── Main Render ────────────────────────────────────────

  return (
    <View style={styles.container}>
      <Text style={styles.pageTitle}>Dispute Management</Text>

      {renderStats()}
      {renderFilters()}

      {loading && !refreshing ? (
        <ActivityIndicator size="large" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={disputes}
          keyExtractor={item => item._id}
          renderItem={renderDisputeCard}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={loadingMore ? <ActivityIndicator size="small" style={{ padding: 16 }} /> : null}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="shield-checkmark-outline" size={48} color={Colors.light.muted} />
              <Text style={styles.emptyText}>No disputes found</Text>
            </View>
          }
          contentContainerStyle={disputes.length === 0 ? { flex: 1, justifyContent: 'center' } : { paddingBottom: 20 }}
        />
      )}

      {renderDetailModal()}
    </View>
  );
}

// ─── Helper Component ─────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background, padding: 16 },
  pageTitle: { fontSize: 22, fontWeight: '700', color: Colors.light.text, marginBottom: 16 },

  // Stats
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  statCard: {
    flex: 1, minWidth: 100, backgroundColor: Colors.light.card,
    borderRadius: 10, padding: 12, borderLeftWidth: 3,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  statValue: { fontSize: 20, fontWeight: '700', color: Colors.light.text },
  statLabel: { fontSize: 11, color: Colors.light.mutedDark, marginTop: 2 },

  // Filters
  filterSection: { marginBottom: 12 },
  searchRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  searchInput: {
    flex: 1, backgroundColor: Colors.light.card, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 8, fontSize: 14,
    borderWidth: 1, borderColor: Colors.light.border,
  },
  searchBtn: {
    backgroundColor: Colors.light.purple, borderRadius: 8,
    paddingHorizontal: 14, justifyContent: 'center',
  },
  chipRow: { flexDirection: 'row', marginBottom: 6 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
    backgroundColor: Colors.light.card, borderWidth: 1,
    borderColor: Colors.light.border, marginRight: 6,
  },
  chipActive: { backgroundColor: Colors.light.purple, borderColor: Colors.light.purple },
  chipText: { fontSize: 12, color: Colors.light.mutedDark },
  chipTextActive: { color: '#fff', fontWeight: '600' },

  // Card
  card: {
    backgroundColor: Colors.light.card, borderRadius: 12,
    padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  disputeNumber: { fontSize: 14, fontWeight: '700', color: Colors.light.text },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  cardBody: { gap: 4, marginBottom: 8 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardRowText: { fontSize: 13, color: Colors.light.mutedDark },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  amountText: { fontSize: 14, fontWeight: '700', color: Colors.light.text },
  priorityDot: { width: 8, height: 8, borderRadius: 4 },
  dateText: { fontSize: 11, color: Colors.light.muted },

  // Empty
  emptyState: { alignItems: 'center', gap: 8 },
  emptyText: { fontSize: 14, color: Colors.light.muted },

  // Modal
  modalContainer: { flex: 1, backgroundColor: Colors.light.background },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.light.border,
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: Colors.light.text },
  modalBody: { flex: 1, padding: 16 },

  // Detail
  detailRow: { flexDirection: 'row', marginBottom: 16 },
  infoSection: { backgroundColor: Colors.light.card, borderRadius: 10, padding: 12, marginBottom: 16 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  infoLabel: { fontSize: 13, color: Colors.light.mutedDark },
  infoValue: { fontSize: 13, fontWeight: '600', color: Colors.light.text, maxWidth: '60%', textAlign: 'right' },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.light.text, marginBottom: 8 },
  descText: { fontSize: 13, color: Colors.light.mutedDark, lineHeight: 20 },

  // Evidence
  evidenceItem: {
    backgroundColor: Colors.light.backgroundSecondary, borderRadius: 8,
    padding: 10, marginBottom: 6,
  },
  evidenceType: { fontSize: 11, color: Colors.light.muted, marginBottom: 4 },
  evidenceDesc: { fontSize: 13, color: Colors.light.text },
  attachmentCount: { fontSize: 11, color: Colors.light.info, marginTop: 4 },

  // Timeline
  timelineItem: { flexDirection: 'row', marginBottom: 12 },
  timelineDot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: Colors.light.purple, marginTop: 4, marginRight: 10,
  },
  timelineContent: { flex: 1 },
  timelineAction: { fontSize: 13, fontWeight: '600', color: Colors.light.text, textTransform: 'capitalize' },
  timelineDetails: { fontSize: 12, color: Colors.light.mutedDark, marginTop: 2 },
  timelineTime: { fontSize: 11, color: Colors.light.muted, marginTop: 2 },

  // Actions
  actionSection: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8,
  },
  actionBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  // Resolve modal
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  resolveModal: { backgroundColor: Colors.light.card, borderRadius: 14, padding: 20 },
  resolveTitle: { fontSize: 17, fontWeight: '700', color: Colors.light.text, marginBottom: 16 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: Colors.light.text, marginBottom: 6 },
  input: {
    backgroundColor: Colors.light.backgroundSecondary, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14,
    borderWidth: 1, borderColor: Colors.light.border, marginBottom: 12,
    textAlignVertical: 'top',
  },
  decisionRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  decisionChip: {
    flex: 1, paddingVertical: 8, borderRadius: 8,
    borderWidth: 1, borderColor: Colors.light.border, alignItems: 'center',
  },
  decisionChipActive: { backgroundColor: Colors.light.purple, borderColor: Colors.light.purple },
  decisionChipText: { fontSize: 13, color: Colors.light.mutedDark },
  decisionChipTextActive: { color: '#fff', fontWeight: '600' },
  resolveActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 4 },
  cancelBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  cancelBtnText: { fontSize: 14, color: Colors.light.mutedDark },
  confirmBtn: {
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8,
    backgroundColor: Colors.light.purple,
  },
  confirmBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
});
