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
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { photoModerationService, PhotoUploadItem } from '../../services/api/photoModeration';
import { Colors } from '../../constants/Colors';
import { format } from 'date-fns';
import { showAlert, showConfirm } from '../../utils/alert';

export default function PhotoModerationScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [photos, setPhotos] = useState<PhotoUploadItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Reject modal
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);

  // Photo preview modal
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewPhotos, setPreviewPhotos] = useState<PhotoUploadItem['photos']>([]);
  const [previewIndex, setPreviewIndex] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async (pageNum: number = 1, append: boolean = false) => {
    try {
      if (!append) setIsLoading(true);
      const data = await photoModerationService.getPendingPhotos(pageNum, 20);

      if (append) {
        setPhotos(prev => [...prev, ...data.photos]);
      } else {
        setPhotos(data.photos);
      }

      setHasMore(data.pagination.hasMore);
      setPage(pageNum);
    } catch (error: any) {
      console.error('Failed to load photos:', error);
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

  const handleApprove = async (photoId: string) => {
    try {
      setProcessingId(photoId);
      await photoModerationService.moderatePhoto(photoId, 'approve');
      showAlert('Success', 'Photo approved and coins credited');
      setPhotos(prev => prev.filter(p => p._id !== photoId));
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
      await photoModerationService.moderatePhoto(rejectTargetId, 'reject', rejectReason);
      showAlert('Success', 'Photo rejected');
      setPhotos(prev => prev.filter(p => p._id !== rejectTargetId));
      setShowRejectModal(false);
      setRejectReason('');
      setRejectTargetId(null);
    } catch (error: any) {
      showAlert('Error', error.message);
    } finally {
      setProcessingId(null);
    }
  };

  const openPreview = (item: PhotoUploadItem) => {
    setPreviewPhotos(item.photos);
    setPreviewIndex(0);
    setShowPreviewModal(true);
  };

  const getUserName = (item: PhotoUploadItem) => {
    const u = item.user;
    if (!u) return 'Unknown User';
    return `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Unknown User';
  };

  const renderPhotoCard = ({ item }: { item: PhotoUploadItem }) => (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={[styles.avatar, { backgroundColor: `${colors.tint}20` }]}>
          <Ionicons name="camera" size={20} color={colors.tint} />
        </View>
        <View style={styles.cardInfo}>
          <Text style={[styles.userName, { color: colors.text }]}>{getUserName(item)}</Text>
          <Text style={[styles.subtitle, { color: colors.icon }]}>
            {item.contentType?.replace('_', ' ')} &middot; {item.photos.length} photo{item.photos.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <Text style={[styles.dateText, { color: colors.icon }]}>
          {format(new Date(item.createdAt), 'MMM d, h:mm a')}
        </Text>
      </View>

      {/* Caption */}
      {item.caption && (
        <Text style={[styles.caption, { color: colors.text }]} numberOfLines={2}>
          {item.caption}
        </Text>
      )}

      {/* Store */}
      {item.store && (
        <View style={styles.storeRow}>
          <Ionicons name="storefront-outline" size={14} color={colors.icon} />
          <Text style={[styles.storeText, { color: colors.icon }]}>{item.store.name}</Text>
        </View>
      )}

      {/* Photo thumbnails */}
      <TouchableOpacity style={styles.photoGrid} onPress={() => openPreview(item)}>
        {item.photos.slice(0, 4).map((photo, idx) => (
          <View key={idx} style={styles.thumbnailWrapper}>
            <Image source={{ uri: photo.url }} style={styles.thumbnail} resizeMode="cover" />
            {idx === 3 && item.photos.length > 4 && (
              <View style={styles.moreOverlay}>
                <Text style={styles.moreText}>+{item.photos.length - 4}</Text>
              </View>
            )}
          </View>
        ))}
      </TouchableOpacity>

      {/* Actions */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, styles.approveButton]}
          onPress={() => handleApprove(item._id)}
          disabled={processingId === item._id}
        >
          {processingId === item._id ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="checkmark" size={18} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Approve</Text>
            </>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.rejectButton]}
          onPress={() => {
            setRejectTargetId(item._id);
            setShowRejectModal(true);
          }}
          disabled={processingId === item._id}
        >
          <Ionicons name="close" size={18} color="#FFFFFF" />
          <Text style={styles.actionButtonText}>Reject</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (isLoading && photos.length === 0) {
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
        <Ionicons name="camera" size={24} color={colors.tint} />
        <Text style={[styles.headerTitle, { color: colors.text }]}>Photo Moderation</Text>
        <View style={[styles.countBadge, { backgroundColor: `${colors.tint}20` }]}>
          <Text style={[styles.countText, { color: colors.tint }]}>{photos.length} pending</Text>
        </View>
      </View>

      <FlatList
        data={photos}
        renderItem={renderPhotoCard}
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
            <Ionicons name="checkmark-circle-outline" size={48} color={colors.icon} />
            <Text style={[styles.emptyText, { color: colors.icon }]}>
              No photos pending review
            </Text>
          </View>
        }
      />

      {/* Reject Modal */}
      <Modal visible={showRejectModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Reject Photo</Text>
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
                <Text style={[styles.modalButtonText, { color: '#FFFFFF' }]}>Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Photo Preview Modal */}
      <Modal visible={showPreviewModal} transparent animationType="fade">
        <View style={styles.previewOverlay}>
          <TouchableOpacity
            style={styles.previewClose}
            onPress={() => setShowPreviewModal(false)}
          >
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          {previewPhotos.length > 0 && (
            <Image
              source={{ uri: previewPhotos[previewIndex]?.url }}
              style={styles.previewImage}
              resizeMode="contain"
            />
          )}
          {previewPhotos.length > 1 && (
            <View style={styles.previewNav}>
              <TouchableOpacity
                style={[styles.previewNavBtn, previewIndex === 0 && { opacity: 0.3 }]}
                onPress={() => setPreviewIndex(Math.max(0, previewIndex - 1))}
                disabled={previewIndex === 0}
              >
                <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.previewCounter}>
                {previewIndex + 1} / {previewPhotos.length}
              </Text>
              <TouchableOpacity
                style={[styles.previewNavBtn, previewIndex === previewPhotos.length - 1 && { opacity: 0.3 }]}
                onPress={() => setPreviewIndex(Math.min(previewPhotos.length - 1, previewIndex + 1))}
                disabled={previewIndex === previewPhotos.length - 1}
              >
                <Ionicons name="chevron-forward" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          )}
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
  dateText: { fontSize: 11 },
  caption: { marginTop: 10, fontSize: 13, lineHeight: 18 },
  storeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 4 },
  storeText: { fontSize: 12 },
  photoGrid: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 6,
    flexWrap: 'wrap',
  },
  thumbnailWrapper: { position: 'relative' },
  thumbnail: {
    width: 72,
    height: 72,
    borderRadius: 8,
    backgroundColor: '#E2E8F0',
  },
  moreOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
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
  approveButton: { backgroundColor: '#10B981' },
  rejectButton: { backgroundColor: '#EF4444' },
  actionButtonText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
  emptyContainer: { padding: 40, alignItems: 'center' },
  emptyText: { marginTop: 12, fontSize: 16 },
  // Reject modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '600', marginBottom: 16 },
  reasonInput: { borderWidth: 1, borderRadius: 8, padding: 12, minHeight: 80, textAlignVertical: 'top' },
  modalButtons: { flexDirection: 'row', marginTop: 16, gap: 12 },
  modalButton: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  modalButtonText: { fontWeight: '600' },
  // Photo preview
  previewOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  previewClose: { position: 'absolute', top: 50, right: 20, zIndex: 10, padding: 8 },
  previewImage: { width: '90%', height: '70%' },
  previewNav: { flexDirection: 'row', alignItems: 'center', marginTop: 16, gap: 20 },
  previewNavBtn: { padding: 8 },
  previewCounter: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
});
