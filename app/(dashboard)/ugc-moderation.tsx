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
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ugcModerationService } from '../../services/api/ugcModeration';
import { Colors } from '../../constants/Colors';
import { format } from 'date-fns';
import { showAlert } from '../../utils/alert';

interface PendingReel {
  id: string;
  title: string;
  description?: string;
  videoUrl: string;
  thumbnailUrl?: string;
  duration: number;
  creator: {
    id: string;
    name: string;
    avatar?: string;
  } | null;
  store: {
    id: string;
    name: string;
    logo?: string;
  } | null;
  tags: string[];
  createdAt: string;
}

export default function UgcModerationScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [reels, setReels] = useState<PendingReel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Reject modal
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);

  // Video preview
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async (pageNum: number = 1, append: boolean = false) => {
    try {
      if (!append) setIsLoading(true);
      const data = await ugcModerationService.getPendingReels(pageNum, 20);

      if (append) {
        setReels(prev => [...prev, ...data.reels as any]);
      } else {
        setReels(data.reels as any);
      }

      setHasMore(data.pagination.hasMore);
      setPage(pageNum);
    } catch (error: any) {
      if (__DEV__) console.error('Failed to load reels:', error);
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

  const handleApprove = async (reelId: string) => {
    try {
      setProcessingId(reelId);
      await ugcModerationService.moderateReel(reelId, 'approve');
      showAlert('Success', 'Reel approved, published, and coins credited');
      setReels(prev => prev.filter(r => r.id !== reelId));
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
      await ugcModerationService.moderateReel(rejectTargetId, 'reject', rejectReason);
      showAlert('Success', 'Reel rejected');
      setReels(prev => prev.filter(r => r.id !== rejectTargetId));
      setShowRejectModal(false);
      setRejectReason('');
      setRejectTargetId(null);
    } catch (error: any) {
      showAlert('Error', error.message);
    } finally {
      setProcessingId(null);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderReelCard = ({ item }: { item: PendingReel }) => (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      {/* Thumbnail + play */}
      <TouchableOpacity
        style={styles.thumbnailContainer}
        onPress={() => {
          if (item.videoUrl && typeof window !== 'undefined') {
            window.open(item.videoUrl, '_blank');
          }
        }}
      >
        {item.thumbnailUrl ? (
          <Image source={{ uri: item.thumbnailUrl }} style={styles.thumbnail} resizeMode="cover" />
        ) : (
          <View style={[styles.thumbnail, { backgroundColor: colors.gray800 }]}>
            <Ionicons name="videocam" size={32} color={colors.mutedDark} />
          </View>
        )}
        <View style={styles.playOverlay}>
          <Ionicons name="play-circle" size={40} color="rgba(255,255,255,0.9)" />
        </View>
        <View style={styles.durationBadge}>
          <Text style={styles.durationText}>{formatDuration(item.duration)}</Text>
        </View>
      </TouchableOpacity>

      {/* Info */}
      <View style={styles.reelInfo}>
        <Text style={[styles.reelTitle, { color: colors.text }]} numberOfLines={2}>
          {item.title}
        </Text>

        {item.description && (
          <Text style={[styles.reelDescription, { color: colors.icon }]} numberOfLines={2}>
            {item.description}
          </Text>
        )}

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="person-outline" size={13} color={colors.icon} />
            <Text style={[styles.metaText, { color: colors.icon }]}>
              {item.creator?.name || 'Unknown'}
            </Text>
          </View>
          {item.store && (
            <View style={styles.metaItem}>
              <Ionicons name="storefront-outline" size={13} color={colors.icon} />
              <Text style={[styles.metaText, { color: colors.icon }]}>{item.store.name}</Text>
            </View>
          )}
          <Text style={[styles.metaText, { color: colors.icon }]}>
            {format(new Date(item.createdAt), 'MMM d, h:mm a')}
          </Text>
        </View>

        {item.tags?.length > 0 && (
          <View style={styles.tagsRow}>
            {item.tags.slice(0, 3).map(tag => (
              <View key={tag} style={[styles.tag, { backgroundColor: `${colors.tint}15` }]}>
                <Text style={{ color: colors.tint, fontSize: 10 }}>#{tag}</Text>
              </View>
            ))}
          </View>
        )}
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
              <Text style={styles.actionButtonText}>Approve & Publish</Text>
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

  if (isLoading && reels.length === 0) {
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
        <Ionicons name="videocam" size={24} color={colors.error} />
        <Text style={[styles.headerTitle, { color: colors.text }]}>UGC Reel Moderation</Text>
        <View style={[styles.countBadge, { backgroundColor: colors.errorLight }]}>
          <Text style={[styles.countText, { color: colors.error }]}>{reels.length} pending</Text>
        </View>
      </View>

      <FlatList
        data={reels}
        renderItem={renderReelCard}
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
              No reels pending review
            </Text>
          </View>
        }
      />

      {/* Reject Modal */}
      <Modal visible={showRejectModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Reject Reel</Text>
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
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  thumbnailContainer: { position: 'relative', width: '100%', height: 200 },
  thumbnail: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  durationText: { color: Colors.light.card, fontSize: 12, fontWeight: '600' },
  reelInfo: { padding: 14 },
  reelTitle: { fontSize: 16, fontWeight: '600' },
  reelDescription: { fontSize: 13, marginTop: 4, lineHeight: 18 },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 12,
    flexWrap: 'wrap',
  },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { fontSize: 11 },
  tagsRow: { flexDirection: 'row', marginTop: 8, gap: 4 },
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  actionButtons: { flexDirection: 'row', padding: 14, paddingTop: 0, gap: 8 },
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
  actionButtonText: { color: Colors.light.card, fontWeight: '600', fontSize: 13 },
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
