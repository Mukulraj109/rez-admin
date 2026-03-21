import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, RefreshControl,
  ActivityIndicator, TextInput, Modal, useColorScheme, SafeAreaView,
  ScrollView, StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { reviewsAdminService, AdminReview, ReviewStats } from '../../services/api/reviews';
import { Colors } from '../../constants/Colors';
import { showAlert, showConfirm } from '../../utils/alert';

type StatusFilter = 'pending' | 'approved' | 'rejected' | 'all';

export default function ReviewModerationScreen() {
  const scheme = useColorScheme();
  const colors = Colors[scheme ?? 'light'];

  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [stats, setStats] = useState<ReviewStats>({ pending: 0, approved: 0, rejected: 0 });
  const [activeTab, setActiveTab] = useState<StatusFilter>('pending');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<AdminReview | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => { loadData(1); loadStats(); }, [activeTab]);

  const loadStats = async () => {
    try {
      const s = await reviewsAdminService.getStats();
      setStats(s);
    } catch { /* non-blocking */ }
  };

  const loadData = async (pageNum = 1, append = false) => {
    try {
      if (!append) setLoading(true);
      const data = await reviewsAdminService.getReviews(pageNum, 20, activeTab, search || undefined);
      const items = data.reviews || [];
      setReviews(prev => append ? [...prev, ...items] : items);
      setHasMore(items.length === 20);
      setPage(pageNum);
    } catch {
      showAlert('Error', 'Failed to load reviews');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => { setRefreshing(true); loadData(1); loadStats(); };

  const handleApprove = (id: string) => {
    showConfirm('Approve Review?', 'This review will be visible to all users.', async () => {
      setProcessingId(id);
      try {
        await reviewsAdminService.approveReview(id);
        showAlert('Success', 'Review approved');
        loadData(1);
        loadStats();
      } catch {
        showAlert('Error', 'Failed to approve review');
      } finally { setProcessingId(null); }
    }, 'Approve');
  };

  const handleRejectConfirm = async () => {
    if (!rejectTarget || !rejectReason.trim()) {
      showAlert('Error', 'Please provide a rejection reason.');
      return;
    }
    setShowRejectModal(false);
    setProcessingId(rejectTarget._id);
    try {
      await reviewsAdminService.rejectReview(rejectTarget._id, rejectReason.trim());
      setRejectReason('');
      setRejectTarget(null);
      showAlert('Success', 'Review rejected');
      loadData(1);
      loadStats();
    } catch {
      showAlert('Error', 'Failed to reject review');
    } finally { setProcessingId(null); }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch { return dateStr; }
  };

  const getUserName = (review: AdminReview) => {
    const p = review.user?.profile;
    if (p?.firstName || p?.lastName) return `${p.firstName || ''} ${p.lastName || ''}`.trim();
    return review.user?.email || review.user?.phoneNumber || 'Unknown User';
  };

  const TABS: { key: StatusFilter; label: string }[] = [
    { key: 'pending', label: `Pending (${stats.pending})` },
    { key: 'approved', label: `Approved (${stats.approved})` },
    { key: 'rejected', label: `Rejected (${stats.rejected})` },
    { key: 'all', label: 'All' },
  ];

  const renderItem = useCallback(({ item }: { item: AdminReview }) => {
    const isProcessing = processingId === item._id;

    return (
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        {/* Stars + Date */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
            {[1, 2, 3, 4, 5].map(i => (
              <Text key={i} style={{ color: i <= item.rating ? '#F59E0B' : '#D1D5DB', fontSize: 14 }}>★</Text>
            ))}
            <Text style={{ fontSize: 12, color: colors.tabIconDefault, marginLeft: 6 }}>{item.rating}/5</Text>
          </View>
          <Text style={{ fontSize: 11, color: colors.tabIconDefault }}>{formatDate(item.createdAt)}</Text>
        </View>

        {/* Store */}
        <Text style={{ fontSize: 12, color: colors.tint, fontWeight: '600', marginTop: 6 }}>
          {item.store?.name || 'Unknown Store'}
        </Text>

        {/* Title + Comment */}
        {item.title && (
          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text, marginTop: 6 }}>{item.title}</Text>
        )}
        <Text style={{ fontSize: 13, color: colors.text, marginTop: 4, lineHeight: 20 }} numberOfLines={4}>
          {item.comment}
        </Text>

        {/* Author */}
        <Text style={{ fontSize: 12, color: colors.tabIconDefault, marginTop: 6 }}>
          By: {getUserName(item)}
        </Text>

        {/* Images count */}
        {item.images && item.images.length > 0 && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
            <Ionicons name="images-outline" size={12} color={colors.tabIconDefault} />
            <Text style={{ fontSize: 11, color: colors.tabIconDefault }}>{item.images.length} photo{item.images.length !== 1 ? 's' : ''}</Text>
          </View>
        )}

        {/* Status badge */}
        <View style={{
          alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, marginTop: 8,
          backgroundColor: item.moderationStatus === 'pending' ? '#FEF9C3'
            : item.moderationStatus === 'approved' ? '#DCFCE7' : '#FEE2E2',
        }}>
          <Text style={{
            fontSize: 11, fontWeight: '700',
            color: item.moderationStatus === 'pending' ? '#92400E'
              : item.moderationStatus === 'approved' ? '#166534' : '#991B1B',
          }}>
            {item.moderationStatus.toUpperCase()}
          </Text>
        </View>

        {/* Rejection reason */}
        {item.moderationStatus === 'rejected' && item.moderationReason && (
          <Text style={{ fontSize: 11, color: colors.error, marginTop: 4 }}>
            Reason: {item.moderationReason}
          </Text>
        )}

        {/* Actions */}
        {item.moderationStatus !== 'rejected' && (
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
            {item.moderationStatus === 'pending' && (
              <TouchableOpacity
                onPress={() => handleApprove(item._id)}
                disabled={isProcessing}
                style={{ flex: 1, backgroundColor: '#22c55e', borderRadius: 8, padding: 10, alignItems: 'center' }}
              >
                {isProcessing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Approve</Text>
                )}
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() => { setRejectTarget(item); setShowRejectModal(true); }}
              disabled={isProcessing}
              style={{ flex: 1, backgroundColor: '#ef4444', borderRadius: 8, padding: 10, alignItems: 'center' }}
            >
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Reject</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }, [colors, processingId]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{ padding: 16, paddingBottom: 0 }}>
        <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text }}>Review Moderation</Text>
        <Text style={{ fontSize: 13, color: colors.tabIconDefault, marginTop: 4 }}>
          {stats.pending} review{stats.pending !== 1 ? 's' : ''} awaiting approval
        </Text>

        {/* Search */}
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 10, paddingHorizontal: 12, marginTop: 12, marginBottom: 12 }}>
          <Ionicons name="search" size={16} color={colors.tabIconDefault} />
          <TextInput
            style={{ flex: 1, padding: 10, color: colors.text, fontSize: 14 }}
            placeholder="Search reviews..."
            placeholderTextColor={colors.tabIconDefault}
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={() => loadData(1)}
            returnKeyType="search"
          />
        </View>

        {/* Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {TABS.map(tab => (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                style={{
                  paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8,
                  backgroundColor: activeTab === tab.key ? colors.tint : colors.card,
                }}
              >
                <Text style={{
                  fontSize: 12, fontWeight: '700',
                  color: activeTab === tab.key ? '#fff' : colors.text,
                }}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* List */}
      {loading && reviews.length === 0 ? (
        <ActivityIndicator size="large" color={colors.tint} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={reviews}
          keyExtractor={item => item._id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingTop: 0, paddingBottom: 120 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />}
          onEndReached={() => hasMore && !loading && loadData(page + 1, true)}
          onEndReachedThreshold={0.3}
          ListFooterComponent={loading && reviews.length > 0 ? <ActivityIndicator style={{ marginVertical: 16 }} color={colors.tint} /> : null}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 40 }}>
              <Ionicons name="star-outline" size={48} color={colors.tabIconDefault} />
              <Text style={{ textAlign: 'center', color: colors.tabIconDefault, marginTop: 12 }}>
                No {activeTab === 'all' ? '' : activeTab + ' '}reviews found
              </Text>
            </View>
          }
        />
      )}

      {/* Reject Modal */}
      <Modal visible={showRejectModal} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 }}>
          <View style={{ backgroundColor: colors.card, borderRadius: 16, padding: 20 }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 8 }}>
              Reject Review
            </Text>
            <Text style={{ fontSize: 13, color: colors.tabIconDefault, marginBottom: 12 }}>
              Reason (shown internally only):
            </Text>
            <TextInput
              style={{
                borderWidth: 1, borderColor: colors.border, borderRadius: 8,
                padding: 12, color: colors.text, minHeight: 80, textAlignVertical: 'top',
              }}
              placeholder="Spam / Fake review / Inappropriate content..."
              placeholderTextColor={colors.tabIconDefault}
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
            />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <TouchableOpacity
                onPress={() => { setShowRejectModal(false); setRejectReason(''); setRejectTarget(null); }}
                style={{ flex: 1, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, alignItems: 'center' }}
              >
                <Text style={{ color: colors.text, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleRejectConfirm}
                style={{ flex: 1, backgroundColor: '#ef4444', borderRadius: 10, padding: 12, alignItems: 'center' }}
              >
                <Text style={{ color: '#fff', fontWeight: '700' }}>Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
});
