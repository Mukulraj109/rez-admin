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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { offerCommentsService, PendingComment } from '../../services/api/offerComments';
import { Colors } from '../../constants/Colors';
import { format } from 'date-fns';
import { showAlert } from '../../utils/alert';

export default function OfferCommentsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [comments, setComments] = useState<PendingComment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Reject modal
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);

  // Expanded comment
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async (pageNum: number = 1, append: boolean = false) => {
    try {
      if (!append) setIsLoading(true);
      const data = await offerCommentsService.getPendingComments(pageNum, 20);

      if (append) {
        setComments(prev => [...prev, ...data.comments]);
      } else {
        setComments(data.comments);
      }

      setHasMore(data.pagination.hasMore);
      setPage(pageNum);
    } catch (error: any) {
      if (__DEV__) console.error('Failed to load comments:', error);
      showAlert('Error', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData(1);
    setRefreshing(false);
  }, []);

  const loadMore = () => {
    if (!isLoading && hasMore) {
      loadData(page + 1, true);
    }
  };

  const handleApprove = async (commentId: string) => {
    try {
      setProcessingId(commentId);
      await offerCommentsService.moderateComment(commentId, 'approve');
      showAlert('Success', 'Comment approved and coins credited');
      setComments(prev => prev.filter(c => c.id !== commentId));
    } catch (error: any) {
      showAlert('Error', error.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async () => {
    if (!rejectTargetId || !rejectReason.trim()) {
      showAlert('Error', 'Please provide a rejection reason');
      return;
    }
    try {
      setProcessingId(rejectTargetId);
      await offerCommentsService.moderateComment(rejectTargetId, 'reject', rejectReason);
      showAlert('Success', 'Comment rejected');
      setComments(prev => prev.filter(c => c.id !== rejectTargetId));
      setShowRejectModal(false);
      setRejectReason('');
      setRejectTargetId(null);
    } catch (error: any) {
      showAlert('Error', error.message);
    } finally {
      setProcessingId(null);
    }
  };

  const getQualityBadge = (score: number) => {
    if (score >= 3) return { label: 'High', color: colors.success };
    if (score >= 2) return { label: 'Medium', color: colors.warning };
    return { label: 'Low', color: colors.error };
  };

  const renderCommentCard = ({ item }: { item: PendingComment }) => {
    const quality = getQualityBadge(item.qualityScore);
    const isExpanded = expandedId === item.id;

    return (
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={[styles.avatar, { backgroundColor: colors.warningLight }]}>
            <Ionicons name="chatbubble-ellipses" size={20} color={colors.warningDark} />
          </View>
          <View style={styles.cardInfo}>
            <Text style={[styles.userName, { color: colors.text }]}>
              {item.user?.name || 'Unknown User'}
            </Text>
            <Text style={[styles.subtitle, { color: colors.icon }]} numberOfLines={1}>
              on: {item.offer?.title || 'Unknown Offer'}
            </Text>
          </View>
          <View style={[styles.qualityBadge, { backgroundColor: `${quality.color}20` }]}>
            <Text style={{ color: quality.color, fontSize: 10, fontWeight: '600' }}>
              Q: {quality.label}
            </Text>
          </View>
        </View>

        {/* Comment text */}
        <TouchableOpacity onPress={() => setExpandedId(isExpanded ? null : item.id)}>
          <Text
            style={[styles.commentText, { color: colors.text }]}
            numberOfLines={isExpanded ? undefined : 3}
          >
            {item.text}
          </Text>
          {item.text.length > 120 && (
            <Text style={[styles.expandText, { color: colors.tint }]}>
              {isExpanded ? 'Show less' : 'Show more'}
            </Text>
          )}
        </TouchableOpacity>

        {/* Meta */}
        <View style={styles.metaRow}>
          <Text style={[styles.metaText, { color: colors.icon }]}>
            {item.text.length} chars
          </Text>
          <Text style={[styles.metaText, { color: colors.icon }]}>
            {format(new Date(item.createdAt), 'MMM d, h:mm a')}
          </Text>
        </View>

        {/* Actions */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.approveButton]}
            onPress={() => handleApprove(item.id)}
            disabled={processingId === item.id}
          >
            {processingId === item.id ? (
              <ActivityIndicator size="small" color={colors.card} />
            ) : (
              <>
                <Ionicons name="checkmark" size={18} color={colors.card} />
                <Text style={styles.actionButtonText}>Approve</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.rejectButton]}
            onPress={() => {
              setRejectTargetId(item.id);
              setShowRejectModal(true);
            }}
            disabled={processingId === item.id}
          >
            <Ionicons name="close" size={18} color={colors.card} />
            <Text style={styles.actionButtonText}>Reject</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (isLoading && comments.length === 0) {
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
        <Ionicons name="chatbubble-ellipses" size={24} color={colors.warningDark} />
        <Text style={[styles.headerTitle, { color: colors.text }]}>Offer Comment Moderation</Text>
        <View style={[styles.countBadge, { backgroundColor: colors.warningLight }]}>
          <Text style={[styles.countText, { color: colors.warningDark }]}>{comments.length} pending</Text>
        </View>
      </View>

      <FlatList
        data={comments}
        renderItem={renderCommentCard}
        keyExtractor={item => item.id}
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
            <Ionicons name="checkmark-circle-outline" size={48} color={colors.icon} />
            <Text style={[styles.emptyText, { color: colors.icon }]}>
              No comments pending review
            </Text>
          </View>
        }
      />

      {/* Reject Modal */}
      <Modal visible={showRejectModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Reject Comment</Text>
            <TextInput
              style={[styles.reasonInput, { color: colors.text, borderColor: colors.border }]}
              placeholder="Enter rejection reason..."
              placeholderTextColor={colors.icon}
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
              numberOfLines={3}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.border }]}
                onPress={() => {
                  setShowRejectModal(false);
                  setRejectReason('');
                  setRejectTargetId(null);
                }}
              >
                <Text style={[styles.modalButtonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.error }]}
                onPress={handleReject}
              >
                <Text style={[styles.modalButtonText, { color: colors.card }]}>Reject</Text>
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
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 10,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', flex: 1 },
  countBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  countText: { fontSize: 12, fontWeight: '600' },
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
  userName: { fontSize: 15, fontWeight: '600' },
  subtitle: { fontSize: 12, marginTop: 2 },
  qualityBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  commentText: { marginTop: 12, fontSize: 14, lineHeight: 20 },
  expandText: { fontSize: 12, marginTop: 4, fontWeight: '500' },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  metaText: { fontSize: 11 },
  actionButtons: { flexDirection: 'row', marginTop: 12, gap: 8 },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 4,
  },
  approveButton: { backgroundColor: Colors.light.success },
  rejectButton: { backgroundColor: Colors.light.error },
  actionButtonText: { color: Colors.light.card, fontWeight: '600', fontSize: 14 },
  emptyContainer: { padding: 40, alignItems: 'center' },
  emptyText: { marginTop: 12, fontSize: 16 },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '600', marginBottom: 16 },
  reasonInput: { borderWidth: 1, borderRadius: 8, padding: 12, minHeight: 80, textAlignVertical: 'top' },
  modalButtons: { flexDirection: 'row', marginTop: 16, gap: 12 },
  modalButton: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  modalButtonText: { fontWeight: '600' },
});
