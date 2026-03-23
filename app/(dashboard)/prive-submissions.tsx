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
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { BRAND } from '../../constants/brand';
import { showAlert } from '../../utils/alert';
import {
  priveSubmissionsService,
  PriveSubmission,
  SubmissionStats,
} from '../../services/api/priveSubmissions';
import { format } from 'date-fns';

// ─── Constants ──────────────────────────────────────────

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected';

const STATUS_TABS: StatusFilter[] = ['all', 'pending', 'approved', 'rejected'];

const STATUS_LABELS: Record<string, string> = {
  all: 'All',
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  expired: 'Expired',
};

const STATUS_COLORS: Record<string, { bg: string; darkBg: string; text: string; darkText: string }> = {
  pending:  { bg: '#FEF3C7', darkBg: '#78350F', text: '#92400E', darkText: '#FDE68A' },
  approved: { bg: '#D1FAE5', darkBg: '#064E3B', text: '#065F46', darkText: '#6EE7B7' },
  rejected: { bg: '#FEE2E2', darkBg: '#7F1D1D', text: '#991B1B', darkText: '#FCA5A5' },
  expired:  { bg: '#F3F4F6', darkBg: '#374151', text: '#6B7280', darkText: '#9CA3AF' },
};

const REJECTION_REASONS = [
  { value: 'post_removed', label: 'Post Removed' },
  { value: 'wrong_hashtag', label: 'Wrong Hashtag' },
  { value: 'no_brand_tag', label: 'No Brand Tag' },
  { value: 'minimum_followers_not_met', label: 'Min Followers Not Met' },
  { value: 'fraudulent', label: 'Fraudulent' },
  { value: 'other', label: 'Other' },
];

const LIMIT = 20;

// ─── Component ──────────────────────────────────────────

export default function PriveSubmissionsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';

  // Data
  const [submissions, setSubmissions] = useState<PriveSubmission[]>([]);
  const [stats, setStats] = useState<SubmissionStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Filter
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // Processing
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Approve modal
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [approveTargetId, setApproveTargetId] = useState<string | null>(null);
  const [approveNote, setApproveNote] = useState('');

  // Reject modal
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectNote, setRejectNote] = useState('');
  const [showReasonPicker, setShowReasonPicker] = useState(false);

  // ─── Data Loading ─────────────────────────────────────

  const loadSubmissions = useCallback(async (pageNum: number = 1, append: boolean = false) => {
    if (!append) setIsLoading(true);
    else setLoadingMore(true);

    try {
      const params: any = { page: pageNum, limit: LIMIT };
      if (statusFilter !== 'all') params.status = statusFilter;

      const data = await priveSubmissionsService.getSubmissions(params);
      const items = data.submissions || [];
      const pagination = data.pagination;

      if (append) {
        setSubmissions(prev => [...prev, ...items]);
      } else {
        setSubmissions(items);
      }

      if (data.stats) {
        setStats(data.stats);
      }

      setPage(pageNum);
      setHasMore(pagination ? pageNum < pagination.totalPages : false);
    } catch (error: any) {
      if (__DEV__) console.error('Failed to load submissions:', error);
      showAlert('Error', error.message || 'Failed to load submissions');
    } finally {
      setIsLoading(false);
      setLoadingMore(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    setPage(1);
    loadSubmissions(1);
  }, [statusFilter]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadSubmissions(1);
    setRefreshing(false);
  }, [loadSubmissions]);

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      loadSubmissions(page + 1, true);
    }
  }, [loadingMore, hasMore, page, loadSubmissions]);

  // ─── Actions ──────────────────────────────────────────

  const openApproveModal = (id: string) => {
    setApproveTargetId(id);
    setApproveNote('');
    setShowApproveModal(true);
  };

  const handleApprove = async () => {
    if (!approveTargetId) return;

    setProcessingId(approveTargetId);
    try {
      await priveSubmissionsService.approveSubmission(
        approveTargetId,
        approveNote.trim() || undefined
      );
      showAlert('Success', 'Submission approved and cashback issued');
      setShowApproveModal(false);
      setApproveTargetId(null);
      setApproveNote('');
      loadSubmissions(1);
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to approve submission');
    } finally {
      setProcessingId(null);
    }
  };

  const openRejectModal = (id: string) => {
    setRejectTargetId(id);
    setRejectReason('');
    setRejectNote('');
    setShowReasonPicker(false);
    setShowRejectModal(true);
  };

  const handleReject = async () => {
    if (!rejectTargetId) return;
    if (!rejectReason) {
      showAlert('Error', 'Please select a rejection reason');
      return;
    }

    setProcessingId(rejectTargetId);
    try {
      await priveSubmissionsService.rejectSubmission(
        rejectTargetId,
        rejectReason,
        rejectNote.trim() || undefined
      );
      showAlert('Success', 'Submission rejected');
      setShowRejectModal(false);
      setRejectTargetId(null);
      setRejectReason('');
      setRejectNote('');
      loadSubmissions(1);
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to reject submission');
    } finally {
      setProcessingId(null);
    }
  };

  const openPostUrl = (url: string) => {
    if (typeof window !== 'undefined') {
      window.open(url, '_blank');
    } else {
      Linking.openURL(url).catch(() => {
        showAlert('Error', 'Could not open URL');
      });
    }
  };

  // ─── Helpers ──────────────────────────────────────────

  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(w => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getStatusStyle = (status: string) => {
    const s = STATUS_COLORS[status] || STATUS_COLORS.pending;
    return {
      bg: isDark ? s.darkBg : s.bg,
      text: isDark ? s.darkText : s.text,
    };
  };

  // ─── Stats Bar ────────────────────────────────────────

  const renderStats = () => {
    if (!stats) return null;
    return (
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.card, borderLeftColor: colors.warning }]}>
          <Text style={[styles.statValue, { color: colors.text }]}>{stats.pending}</Text>
          <Text style={[styles.statLabel, { color: colors.mutedDark }]}>Pending</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card, borderLeftColor: colors.success }]}>
          <Text style={[styles.statValue, { color: colors.text }]}>{stats.approvedToday}</Text>
          <Text style={[styles.statLabel, { color: colors.mutedDark }]}>Approved Today</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card, borderLeftColor: colors.error }]}>
          <Text style={[styles.statValue, { color: colors.text }]}>{stats.rejectedToday}</Text>
          <Text style={[styles.statLabel, { color: colors.mutedDark }]}>Rejected Today</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card, borderLeftColor: colors.purple }]}>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {stats.totalPendingCashback.toLocaleString()}
          </Text>
          <Text style={[styles.statLabel, { color: colors.mutedDark }]}>Pending Cashback</Text>
        </View>
      </View>
    );
  };

  // ─── Tabs ─────────────────────────────────────────────

  const renderTabs = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
      {STATUS_TABS.map(tab => {
        const isActive = statusFilter === tab;
        return (
          <TouchableOpacity
            key={tab}
            style={[
              styles.chip,
              { backgroundColor: colors.card, borderColor: colors.border },
              isActive && { backgroundColor: colors.purple, borderColor: colors.purple },
            ]}
            onPress={() => setStatusFilter(tab)}
          >
            <Text
              style={[
                styles.chipText,
                { color: colors.mutedDark },
                isActive && styles.chipTextActive,
              ]}
            >
              {STATUS_LABELS[tab]}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );

  // ─── Submission Card ──────────────────────────────────

  const renderSubmissionCard = useCallback(({ item }: { item: PriveSubmission }) => {
    const userName = item.userId?.fullName || item.userId?.phoneNumber || 'Unknown User';
    const campaignTitle = item.campaignId?.title || 'Unknown Campaign';
    const merchantName = item.campaignId?.merchantId?.name;
    const statusStyle = getStatusStyle(item.status);
    const isPending = item.status === 'pending';
    const isProcessing = processingId === item._id;

    return (
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        {/* User row */}
        <View style={styles.cardHeader}>
          <View style={styles.userRow}>
            {item.userId?.profile?.avatar ? (
              <View style={[styles.avatarContainer, { backgroundColor: colors.backgroundSecondary }]}>
                <Text style={[styles.avatarText, { color: colors.purple }]}>
                  {getInitials(userName)}
                </Text>
              </View>
            ) : (
              <View style={[styles.avatarContainer, { backgroundColor: `${colors.purple}20` }]}>
                <Text style={[styles.avatarText, { color: colors.purple }]}>
                  {getInitials(userName)}
                </Text>
              </View>
            )}
            <View style={styles.userInfo}>
              <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>
                {userName}
              </Text>
              <Text style={[styles.campaignName, { color: colors.mutedDark }]} numberOfLines={1}>
                {campaignTitle}
                {merchantName ? ` - ${merchantName}` : ''}
              </Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.statusText, { color: statusStyle.text }]}>
              {STATUS_LABELS[item.status] || item.status}
            </Text>
          </View>
        </View>

        {/* Post URL */}
        <TouchableOpacity
          style={[styles.urlRow, { backgroundColor: colors.backgroundSecondary }]}
          onPress={() => openPostUrl(item.postUrl)}
        >
          <Ionicons name="link-outline" size={14} color={colors.info} />
          <Text style={[styles.urlText, { color: colors.info }]} numberOfLines={1}>
            {item.postUrl}
          </Text>
          <Ionicons name="open-outline" size={14} color={colors.info} />
        </TouchableOpacity>

        {/* Meta row */}
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={13} color={colors.icon} />
            <Text style={[styles.metaText, { color: colors.icon }]}>
              {format(new Date(item.submittedAt), 'MMM dd, HH:mm')}
            </Text>
          </View>
          {item.coinsEarned > 0 && (
            <View style={styles.metaItem}>
              <Ionicons name="diamond-outline" size={13} color={colors.success} />
              <Text style={[styles.metaText, { color: colors.success }]}>
                {item.coinsEarned} {BRAND.COIN_SHORT}
              </Text>
            </View>
          )}
          {item.cashbackIssued > 0 && (
            <View style={styles.metaItem}>
              <Ionicons name="cash-outline" size={13} color={colors.success} />
              <Text style={[styles.metaText, { color: colors.success }]}>
                {item.cashbackIssued.toFixed(2)} cashback
              </Text>
            </View>
          )}
        </View>

        {/* Fraud score */}
        {item.fraudScore != null && item.fraudScore > 0 && (
          <View style={styles.fraudRow}>
            <View style={[styles.fraudBadge, { backgroundColor: colors.errorLight }]}>
              <Ionicons name="warning-outline" size={12} color={colors.error} />
              <Text style={[styles.fraudText, { color: colors.error }]}>
                Fraud Score: {item.fraudScore}
              </Text>
            </View>
            {item.autoFlags && item.autoFlags.length > 0 && (
              <View style={styles.flagsRow}>
                {item.autoFlags.map((flag, i) => (
                  <View key={i} style={[styles.flagChip, { backgroundColor: `${colors.warning}20` }]}>
                    <Text style={{ fontSize: 10, color: colors.warningDeep }}>{flag}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Rejection reason */}
        {item.status === 'rejected' && item.rejectionReason && (
          <View style={[styles.rejectionRow, { backgroundColor: colors.errorLight }]}>
            <Text style={[styles.rejectionLabel, { color: colors.errorDark }]}>Reason:</Text>
            <Text style={[styles.rejectionValue, { color: colors.errorDeep }]}>
              {REJECTION_REASONS.find(r => r.value === item.rejectionReason)?.label || item.rejectionReason}
            </Text>
          </View>
        )}

        {/* Reviewer note */}
        {item.reviewerNote && (
          <View style={[styles.noteRow, { backgroundColor: colors.backgroundSecondary }]}>
            <Ionicons name="chatbox-ellipses-outline" size={12} color={colors.mutedDark} />
            <Text style={[styles.noteText, { color: colors.mutedDark }]} numberOfLines={2}>
              {item.reviewerNote}
            </Text>
          </View>
        )}

        {/* Action buttons (pending only) */}
        {isPending && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.success }]}
              onPress={() => openApproveModal(item._id)}
              disabled={isProcessing}
            >
              {isProcessing && approveTargetId === item._id ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark" size={16} color="#fff" />
                  <Text style={styles.actionButtonText}>Approve</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.error }]}
              onPress={() => openRejectModal(item._id)}
              disabled={isProcessing}
            >
              {isProcessing && rejectTargetId === item._id ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="close" size={16} color="#fff" />
                  <Text style={styles.actionButtonText}>Reject</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Reviewed date */}
        {item.reviewedAt && (
          <Text style={[styles.reviewedText, { color: colors.muted }]}>
            Reviewed: {format(new Date(item.reviewedAt), 'MMM dd, yyyy HH:mm')}
          </Text>
        )}
      </View>
    );
  }, [processingId, colors, approveTargetId, rejectTargetId, isDark]);

  // ─── Approve Modal ────────────────────────────────────

  const renderApproveModal = () => (
    <Modal visible={showApproveModal} transparent animationType="fade" onRequestClose={() => setShowApproveModal(false)}>
      <View style={styles.overlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Approve Submission</Text>
          <Text style={[styles.modalSubtext, { color: colors.mutedDark }]}>
            This will approve the submission and issue the cashback/coins to the user.
          </Text>

          <Text style={[styles.inputLabel, { color: colors.text }]}>Note (optional)</Text>
          <TextInput
            style={[styles.textInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}
            placeholder="Add a reviewer note..."
            placeholderTextColor={colors.muted}
            value={approveNote}
            onChangeText={setApproveNote}
            multiline
            numberOfLines={3}
          />

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.modalBtn, { backgroundColor: colors.backgroundSecondary }]}
              onPress={() => {
                setShowApproveModal(false);
                setApproveTargetId(null);
                setApproveNote('');
              }}
            >
              <Text style={[styles.modalBtnText, { color: colors.text }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalBtn, { backgroundColor: colors.success }, processingId ? { opacity: 0.6 } : null]}
              onPress={handleApprove}
              disabled={!!processingId}
            >
              {processingId ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={[styles.modalBtnText, { color: '#fff' }]}>Approve</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // ─── Reject Modal ─────────────────────────────────────

  const renderRejectModal = () => (
    <Modal visible={showRejectModal} transparent animationType="fade" onRequestClose={() => setShowRejectModal(false)}>
      <View style={styles.overlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Reject Submission</Text>

          <Text style={[styles.inputLabel, { color: colors.text }]}>Reason *</Text>
          <TouchableOpacity
            style={[styles.pickerButton, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}
            onPress={() => setShowReasonPicker(!showReasonPicker)}
          >
            <Text style={[styles.pickerText, { color: rejectReason ? colors.text : colors.muted }]}>
              {rejectReason
                ? REJECTION_REASONS.find(r => r.value === rejectReason)?.label || rejectReason
                : 'Select reason...'}
            </Text>
            <Ionicons name={showReasonPicker ? 'chevron-up' : 'chevron-down'} size={18} color={colors.icon} />
          </TouchableOpacity>

          {showReasonPicker && (
            <View style={[styles.reasonList, { borderColor: colors.border, backgroundColor: colors.card }]}>
              {REJECTION_REASONS.map(reason => (
                <TouchableOpacity
                  key={reason.value}
                  style={[
                    styles.reasonItem,
                    { borderBottomColor: colors.borderLight },
                    rejectReason === reason.value && { backgroundColor: `${colors.purple}15` },
                  ]}
                  onPress={() => {
                    setRejectReason(reason.value);
                    setShowReasonPicker(false);
                  }}
                >
                  <Text
                    style={[
                      styles.reasonItemText,
                      { color: colors.text },
                      rejectReason === reason.value && { color: colors.purple, fontWeight: '600' as const },
                    ]}
                  >
                    {reason.label}
                  </Text>
                  {rejectReason === reason.value && (
                    <Ionicons name="checkmark" size={16} color={colors.purple} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Text style={[styles.inputLabel, { color: colors.text, marginTop: 12 }]}>Note (optional)</Text>
          <TextInput
            style={[styles.textInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}
            placeholder="Additional note..."
            placeholderTextColor={colors.muted}
            value={rejectNote}
            onChangeText={setRejectNote}
            multiline
            numberOfLines={3}
          />

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.modalBtn, { backgroundColor: colors.backgroundSecondary }]}
              onPress={() => {
                setShowRejectModal(false);
                setRejectTargetId(null);
                setRejectReason('');
                setRejectNote('');
                setShowReasonPicker(false);
              }}
            >
              <Text style={[styles.modalBtnText, { color: colors.text }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalBtn, { backgroundColor: colors.error }, processingId ? { opacity: 0.6 } : null]}
              onPress={handleReject}
              disabled={!!processingId}
            >
              {processingId ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={[styles.modalBtnText, { color: '#fff' }]}>Reject</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // ─── List Header ──────────────────────────────────────

  const renderListHeader = () => (
    <View>
      {renderStats()}
      {renderTabs()}
    </View>
  );

  // ─── Main Render ──────────────────────────────────────

  if (isLoading && submissions.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <View style={styles.headerLeft}>
            <Ionicons name="megaphone-outline" size={24} color={colors.purple} />
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              {BRAND.PRIVE_NAME} Submissions
            </Text>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.purple} />
          <Text style={[styles.loadingText, { color: colors.mutedDark }]}>Loading submissions...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <Ionicons name="megaphone-outline" size={24} color={colors.purple} />
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {BRAND.PRIVE_NAME} Submissions
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.refreshBtn, { backgroundColor: colors.backgroundSecondary }]}
          onPress={onRefresh}
        >
          <Ionicons name="refresh" size={18} color={colors.icon} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={submissions}
        keyExtractor={item => item._id}
        renderItem={renderSubmissionCard}
        ListHeaderComponent={renderListHeader}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.purple} />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator size="small" style={{ padding: 16 }} color={colors.purple} />
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.backgroundSecondary }]}>
              <Ionicons name="document-text-outline" size={36} color={colors.muted} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No submissions found</Text>
            <Text style={[styles.emptySubtitle, { color: colors.mutedDark }]}>
              {statusFilter !== 'all'
                ? `No ${statusFilter} submissions to show`
                : 'Submissions will appear here when users submit posts'}
            </Text>
          </View>
        }
        contentContainerStyle={
          submissions.length === 0
            ? { flexGrow: 1 }
            : { paddingHorizontal: 16, paddingBottom: 60 }
        }
      />

      {renderApproveModal()}
      {renderRejectModal()}
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 14 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingVertical: 12,
  },
  statCard: {
    flex: 1,
    minWidth: 80,
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 3,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  statValue: { fontSize: 18, fontWeight: '700' },
  statLabel: { fontSize: 11, marginTop: 2 },

  // Chips / Tabs
  chipRow: { flexDirection: 'row', marginBottom: 12, marginTop: 4 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  chipText: { fontSize: 13 },
  chipTextActive: { color: '#fff', fontWeight: '600' },

  // Card
  card: {
    borderRadius: 12,
    marginBottom: 12,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },

  // User
  userRow: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 },
  avatarContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarText: { fontSize: 14, fontWeight: '700' },
  userInfo: { marginLeft: 10, flex: 1 },
  userName: { fontSize: 14, fontWeight: '600' },
  campaignName: { fontSize: 12, marginTop: 1 },

  // Status badge
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: '600' },

  // URL row
  urlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  urlText: { fontSize: 12, flex: 1 },

  // Meta
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12 },

  // Fraud
  fraudRow: { marginTop: 8 },
  fraudBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  fraudText: { fontSize: 11, fontWeight: '600' },
  flagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 },
  flagChip: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },

  // Rejection
  rejectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  rejectionLabel: { fontSize: 12, fontWeight: '600' },
  rejectionValue: { fontSize: 12, flex: 1 },

  // Note
  noteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    padding: 8,
    borderRadius: 8,
    marginTop: 6,
  },
  noteText: { fontSize: 12, flex: 1, lineHeight: 17 },

  // Action buttons
  actionButtons: { flexDirection: 'row', gap: 8, marginTop: 12 },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 4,
  },
  actionButtonText: { color: '#fff', fontWeight: '600', fontSize: 13 },

  // Reviewed
  reviewedText: { fontSize: 11, marginTop: 8, textAlign: 'right' },

  // Empty
  emptyContainer: { alignItems: 'center', padding: 40 },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  emptySubtitle: { fontSize: 13, textAlign: 'center', lineHeight: 19 },

  // Modal overlay
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  modalSubtext: { fontSize: 13, marginBottom: 16, lineHeight: 19 },
  inputLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    minHeight: 70,
    textAlignVertical: 'top',
    fontSize: 14,
    marginBottom: 4,
  },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 16 },
  modalBtn: {
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 90,
  },
  modalBtnText: { fontWeight: '600', fontSize: 14 },

  // Reason picker
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  pickerText: { fontSize: 14 },
  reasonList: {
    borderWidth: 1,
    borderRadius: 8,
    marginTop: 4,
    maxHeight: 200,
    overflow: 'hidden',
  },
  reasonItem: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reasonItemText: { fontSize: 14 },
});
