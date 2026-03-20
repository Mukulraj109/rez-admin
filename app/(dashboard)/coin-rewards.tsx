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
import { coinRewardsService, PendingCoinReward, CoinRewardStats } from '../../services/api/coinRewards';
import { Colors } from '../../constants/Colors';
import { format } from 'date-fns';
import { showAlert, showConfirm } from '../../utils/alert';

type TabType = 'pending' | 'approved' | 'rejected';

export default function CoinRewardsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [rewards, setRewards] = useState<PendingCoinReward[]>([]);
  const [stats, setStats] = useState<CoinRewardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [selectedRewards, setSelectedRewards] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  // Modal state
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [processingReward, setProcessingReward] = useState<string | null>(null);

  useEffect(() => {
    loadData();
    loadStats();
  }, [activeTab]);

  const loadData = async (pageNum: number = 1, append: boolean = false) => {
    try {
      const data = await coinRewardsService.getRewards(pageNum, 20, activeTab);

      if (append) {
        setRewards(prev => [...prev, ...data.rewards]);
      } else {
        setRewards(data.rewards);
      }

      setHasMore(data.pagination.page < data.pagination.totalPages);
      setPage(pageNum);
    } catch (error) {
      if (__DEV__) console.error('Failed to load rewards:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const data = await coinRewardsService.getStats();
      setStats(data);
    } catch (error) {
      if (__DEV__) console.error('Failed to load stats:', error);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadData(1), loadStats()]);
    setRefreshing(false);
  }, [activeTab]);

  const loadMore = () => {
    if (!isLoading && hasMore) {
      loadData(page + 1, true);
    }
  };

  const handleApprove = async (rewardId: string) => {
    try {
      setProcessingReward(rewardId);
      await coinRewardsService.approveReward(rewardId);
      showAlert('Success', 'Reward approved and coins credited');
      await loadData(1);
      await loadStats();
    } catch (error: any) {
      showAlert('Error', error.message);
    } finally {
      setProcessingReward(null);
    }
  };

  const handleReject = async (rewardId: string) => {
    if (!rejectReason.trim()) {
      showAlert('Error', 'Please provide a rejection reason');
      return;
    }
    try {
      setProcessingReward(rewardId);
      await coinRewardsService.rejectReward(rewardId, rejectReason);
      showAlert('Success', 'Reward rejected');
      setShowRejectModal(false);
      setRejectReason('');
      await loadData(1);
      await loadStats();
    } catch (error: any) {
      showAlert('Error', error.message);
    } finally {
      setProcessingReward(null);
    }
  };

  const handleBulkApprove = async () => {
    if (selectedRewards.length === 0) return;

    showConfirm(
      'Bulk Approve',
      `Approve ${selectedRewards.length} rewards?`,
      async () => {
        const results = { success: 0, failed: 0 };
        for (const rewardId of selectedRewards) {
          try {
            await coinRewardsService.approveReward(rewardId);
            results.success++;
          } catch {
            results.failed++;
          }
        }
        const msg = results.failed > 0
          ? `${results.success} approved, ${results.failed} failed — check individually.`
          : `${results.success} rewards approved successfully.`;
        showAlert(results.failed > 0 ? 'Partial Success' : 'Success', msg);
        setSelectedRewards([]);
        setIsSelectionMode(false);
        await loadData(1);
        await loadStats();
      },
      'Approve All'
    );
  };

  const toggleSelection = (rewardId: string) => {
    setSelectedRewards(prev =>
      prev.includes(rewardId)
        ? prev.filter(id => id !== rewardId)
        : [...prev, rewardId]
    );
  };

  const getSourceIcon = (source: string): keyof typeof Ionicons.glyphMap => {
    switch (source) {
      case 'purchase_bonus': return 'cart';
      case 'social_media_post': return 'share-social';
      case 'review_bonus': return 'star';
      case 'referral_bonus': return 'people';
      default: return 'share-social';
    }
  };

  const getSourceLabel = (item: PendingCoinReward): string => {
    const platform = item.platform?.charAt(0).toUpperCase() + (item.platform?.slice(1) || '');
    if (item.posterTitle && item.posterTitle !== 'Promotional Poster') {
      return `${platform} — ${item.posterTitle}`;
    }
    return platform ? `${platform} Share` : 'Social Media Post';
  };

  const renderStatsCard = () => (
    <View style={styles.statsContainer}>
      <View style={[styles.statsCard, { backgroundColor: colors.card }]}>
        <Text style={[styles.statsValue, { color: colors.text }]}>{stats?.pending || 0}</Text>
        <Text style={[styles.statsLabel, { color: colors.icon }]}>Pending</Text>
      </View>
      <View style={[styles.statsCard, { backgroundColor: colors.card }]}>
        <Text style={[styles.statsValue, { color: colors.success }]}>{stats?.approved || 0}</Text>
        <Text style={[styles.statsLabel, { color: colors.icon }]}>Approved</Text>
      </View>
      <View style={[styles.statsCard, { backgroundColor: colors.card }]}>
        <Text style={[styles.statsValue, { color: colors.error }]}>{stats?.rejected || 0}</Text>
        <Text style={[styles.statsLabel, { color: colors.icon }]}>Rejected</Text>
      </View>
      <View style={[styles.statsCard, { backgroundColor: colors.card }]}>
        <Text style={[styles.statsValue, { color: colors.warning }]}>{stats?.totalCoinsPending || 0}</Text>
        <Text style={[styles.statsLabel, { color: colors.icon }]}>Coins Pending</Text>
      </View>
    </View>
  );

  const renderTabs = () => (
    <View style={styles.tabsContainer}>
      {(['pending', 'approved', 'rejected'] as TabType[]).map(tab => (
        <TouchableOpacity
          key={tab}
          style={[
            styles.tab,
            activeTab === tab && { backgroundColor: colors.tint },
          ]}
          onPress={() => {
            setActiveTab(tab);
            setIsLoading(true);
          }}
        >
          <Text
            style={[
              styles.tabText,
              { color: activeTab === tab ? colors.card : colors.icon },
            ]}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderRewardItem = ({ item }: { item: PendingCoinReward }) => {
    const userName = item.user?.profile
      ? `${item.user.profile.firstName || ''} ${item.user.profile.lastName || ''}`.trim()
      : item.user?.phoneNumber || 'Unknown User';

    return (
      <TouchableOpacity
        style={[styles.rewardCard, { backgroundColor: colors.card }]}
        onPress={() => isSelectionMode && toggleSelection(item._id)}
        onLongPress={() => {
          setIsSelectionMode(true);
          toggleSelection(item._id);
        }}
      >
        {isSelectionMode && (
          <TouchableOpacity
            style={styles.checkbox}
            onPress={() => toggleSelection(item._id)}
          >
            <Ionicons
              name={selectedRewards.includes(item._id) ? 'checkbox' : 'square-outline'}
              size={24}
              color={selectedRewards.includes(item._id) ? colors.tint : colors.icon}
            />
          </TouchableOpacity>
        )}

        <View style={styles.rewardHeader}>
          <View style={[styles.sourceIcon, { backgroundColor: `${colors.tint}20` }]}>
            <Ionicons name={getSourceIcon(item.source)} size={20} color={colors.tint} />
          </View>
          <View style={styles.rewardInfo}>
            <Text style={[styles.userName, { color: colors.text }]}>{userName}</Text>
            <Text style={[styles.sourceLabel, { color: colors.icon }]}>
              {getSourceLabel(item)}
            </Text>
          </View>
          <View style={styles.coinBadge}>
            <Ionicons name="sparkles" size={14} color={colors.warning} />
            <Text style={styles.coinAmount}>{item.amount}</Text>
          </View>
        </View>

        {item.postUrl ? (
          <TouchableOpacity
            style={styles.rewardDetails}
            onPress={() => {
              if (typeof window !== 'undefined') window.open(item.postUrl, '_blank');
            }}
          >
            <Text style={[styles.detailText, { color: colors.info }]} numberOfLines={1}>
              {item.postUrl}
            </Text>
            <Ionicons name="open-outline" size={14} color={colors.info} />
          </TouchableOpacity>
        ) : (
          <View style={styles.rewardDetails}>
            <Text style={[styles.detailText, { color: colors.icon }]}>No URL</Text>
          </View>
        )}
        <View style={[styles.rewardDetails, { borderTopWidth: 0, marginTop: 4, paddingTop: 0 }]}>
          <Text style={[styles.dateText, { color: colors.icon }]}>
            {format(new Date(item.submittedAt), 'MMM d, yyyy h:mm a')}
          </Text>
        </View>

        {activeTab === 'pending' && !isSelectionMode && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.approveButton]}
              onPress={() => handleApprove(item._id)}
              disabled={processingReward === item._id}
            >
              {processingReward === item._id ? (
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
                setProcessingReward(item._id);
                setShowRejectModal(true);
              }}
              disabled={processingReward === item._id}
            >
              <Ionicons name="close" size={18} color={colors.card} />
              <Text style={styles.actionButtonText}>Reject</Text>
            </TouchableOpacity>
          </View>
        )}

        {item.status === 'rejected' && item.rejectionReason && (
          <View style={[styles.rejectionReason, { backgroundColor: colors.errorLight }]}>
            <Text style={{ color: colors.errorDark, fontSize: 12 }}>
              Reason: {item.rejectionReason}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (isLoading && rewards.length === 0) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {renderStatsCard()}
      {renderTabs()}

      {isSelectionMode && activeTab === 'pending' && (
        <View style={[styles.bulkActions, { backgroundColor: colors.card }]}>
          <Text style={[styles.selectedCount, { color: colors.text }]}>
            {selectedRewards.length} selected
          </Text>
          <TouchableOpacity
            style={[styles.bulkButton, { backgroundColor: colors.success }]}
            onPress={handleBulkApprove}
          >
            <Text style={styles.bulkButtonText}>Approve All</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.bulkButton, { backgroundColor: colors.icon }]}
            onPress={() => {
              setIsSelectionMode(false);
              setSelectedRewards([]);
            }}
          >
            <Text style={styles.bulkButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={rewards}
        renderItem={renderRewardItem}
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
            <Ionicons name="gift-outline" size={48} color={colors.icon} />
            <Text style={[styles.emptyText, { color: colors.icon }]}>
              No {activeTab} rewards
            </Text>
          </View>
        }
      />

      {/* Reject Modal */}
      <Modal visible={showRejectModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Reject Reward</Text>
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
                  setProcessingReward(null);
                }}
              >
                <Text style={[styles.modalButtonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.error }]}
                onPress={() => processingReward && handleReject(processingReward)}
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
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  statsCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  statsValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  statsLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 8,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: Colors.light.border,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  bulkActions: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 8,
  },
  selectedCount: {
    flex: 1,
    fontWeight: '600',
  },
  bulkButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  bulkButtonText: {
    color: Colors.light.card,
    fontWeight: '600',
    fontSize: 13,
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
  },
  rewardCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  checkbox: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  rewardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sourceIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rewardInfo: {
    flex: 1,
    marginLeft: 12,
  },
  userName: {
    fontSize: 15,
    fontWeight: '600',
  },
  sourceLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  coinBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.warningLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  coinAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.light.warningDark,
  },
  rewardDetails: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailText: {
    fontSize: 12,
  },
  dateText: {
    fontSize: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 4,
  },
  approveButton: {
    backgroundColor: Colors.light.success,
  },
  rejectButton: {
    backgroundColor: Colors.light.error,
  },
  actionButtonText: {
    color: Colors.light.card,
    fontWeight: '600',
    fontSize: 14,
  },
  rejectionReason: {
    marginTop: 12,
    padding: 10,
    borderRadius: 8,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  reasonInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonText: {
    fontWeight: '600',
  },
});
