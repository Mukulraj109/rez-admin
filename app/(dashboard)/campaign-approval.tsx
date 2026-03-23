/**
 * Admin Campaign Approval Queue
 *
 * Review, approve, or reject merchant-submitted offers.
 * Supports tabbed filtering, batch approve, reject with reason modal,
 * pagination, pull-to-refresh, and full dark mode.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  useColorScheme,
  Modal,
  TextInput,
  SafeAreaView,
  ScrollView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { showAlert, showConfirm } from '../../utils/alert';
import { campaignApprovalService, MerchantOffer } from '../../services/api/campaignApproval';

// ============================================
// TYPES & CONSTANTS
// ============================================

type TabKey = 'pending' | 'approved' | 'rejected';

interface TabDef {
  key: TabKey;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const TABS: TabDef[] = [
  { key: 'pending', label: 'Pending', icon: 'time-outline' },
  { key: 'approved', label: 'Approved', icon: 'checkmark-circle-outline' },
  { key: 'rejected', label: 'Rejected', icon: 'close-circle-outline' },
];

const OFFER_TYPE_LABELS: Record<string, string> = {
  cashback: 'Cashback',
  discount: 'Discount',
  voucher: 'Voucher',
  combo: 'Combo',
  special: 'Special',
  walk_in: 'Walk-in',
};

const OFFER_TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  cashback: { bg: '#DCFCE7', text: '#059669' },
  discount: { bg: '#DBEAFE', text: '#2563EB' },
  voucher: { bg: '#FEF3C7', text: '#D97706' },
  combo: { bg: '#EDE9FE', text: '#7C3AED' },
  special: { bg: '#FCE7F3', text: '#DB2777' },
  walk_in: { bg: '#F3F4F6', text: '#4B5563' },
};

function formatDate(dateString?: string): string {
  if (!dateString) return '-';
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}

function formatValue(offer: MerchantOffer): string {
  if (offer.type === 'cashback' || offer.type === 'discount') {
    return `${offer.cashbackPercentage}% ${offer.type}`;
  }
  if (offer.discountedPrice != null && offer.originalPrice != null) {
    return `${offer.originalPrice.toFixed(0)} → ${offer.discountedPrice.toFixed(0)}`;
  }
  if (offer.cashbackPercentage) {
    return `${offer.cashbackPercentage}%`;
  }
  return offer.type;
}

function getInitials(name?: string): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function CampaignApprovalScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  // Tab & data state
  const [activeTab, setActiveTab] = useState<TabKey>('pending');
  const [offers, setOffers] = useState<MerchantOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tab counts
  const [pendingCount, setPendingCount] = useState(0);
  const [approvedCount, setApprovedCount] = useState(0);
  const [rejectedCount, setRejectedCount] = useState(0);

  // Action state
  const [actionLoading, setActionLoading] = useState<Set<string>>(new Set());

  // Batch select
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchLoading, setBatchLoading] = useState(false);

  // Reject modal
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectSubmitting, setRejectSubmitting] = useState(false);

  // Ref to avoid stale closures
  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;

  // ==========================================
  // DATA LOADING
  // ==========================================

  const loadOffers = useCallback(async (pageNum: number = 1, append: boolean = false) => {
    try {
      if (pageNum === 1 && !append) {
        setLoading(true);
        setError(null);
      }
      if (append) setLoadingMore(true);

      const data = await campaignApprovalService.getOffers({
        status: activeTabRef.current,
        page: pageNum,
        limit: 20,
      });

      const fetched = data.offers || [];
      setOffers(prev => (append ? [...prev, ...fetched] : fetched));
      setPage(pageNum);
      setHasMore(data.pagination?.hasNext ?? (pageNum < (data.pagination?.totalPages || 1)));

      // Update count for the active tab
      const total = data.pagination?.total ?? fetched.length;
      if (activeTabRef.current === 'pending') setPendingCount(total);
      else if (activeTabRef.current === 'approved') setApprovedCount(total);
      else if (activeTabRef.current === 'rejected') setRejectedCount(total);
    } catch (err: any) {
      setError(err.message || 'Failed to load offers');
      if (pageNum === 1) setOffers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, []);

  const loadPendingCount = useCallback(async () => {
    const count = await campaignApprovalService.getPendingCount();
    setPendingCount(count);
  }, []);

  useEffect(() => {
    setSelectedIds(new Set());
    loadOffers(1);
  }, [activeTab, loadOffers]);

  // Fetch pending count for badge on initial load
  useEffect(() => {
    loadPendingCount();
  }, [loadPendingCount]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadOffers(1);
    loadPendingCount();
  }, [loadOffers, loadPendingCount]);

  const onEndReached = useCallback(() => {
    if (!loadingMore && hasMore) {
      loadOffers(page + 1, true);
    }
  }, [loadingMore, hasMore, page, loadOffers]);

  // ==========================================
  // ACTIONS
  // ==========================================

  const setActionLoadingFor = (id: string, on: boolean) => {
    setActionLoading(prev => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleApprove = useCallback((id: string) => {
    showConfirm(
      'Approve Offer',
      'Are you sure you want to approve this offer? It will become active for users.',
      async () => {
        setActionLoadingFor(id, true);
        try {
          await campaignApprovalService.approveOffer(id, 'Approved by admin');
          showAlert('Success', 'Offer approved successfully');
          loadOffers(1);
          loadPendingCount();
        } catch (err: any) {
          showAlert('Error', err.message || 'Failed to approve offer');
        } finally {
          setActionLoadingFor(id, false);
        }
      }
    );
  }, [loadOffers, loadPendingCount]);

  const openRejectModal = useCallback((id: string) => {
    setRejectTargetId(id);
    setRejectReason('');
    setShowRejectModal(true);
  }, []);

  const handleRejectSubmit = useCallback(async () => {
    if (!rejectTargetId) return;
    if (!rejectReason.trim()) {
      showAlert('Required', 'Please provide a reason for rejection');
      return;
    }

    setRejectSubmitting(true);
    try {
      await campaignApprovalService.rejectOffer(rejectTargetId, rejectReason.trim());
      showAlert('Success', 'Offer rejected');
      setShowRejectModal(false);
      setRejectTargetId(null);
      setRejectReason('');
      loadOffers(1);
      loadPendingCount();
    } catch (err: any) {
      showAlert('Error', err.message || 'Failed to reject offer');
    } finally {
      setRejectSubmitting(false);
    }
  }, [rejectTargetId, rejectReason, loadOffers, loadPendingCount]);

  // Batch approve
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleBatchApprove = useCallback(() => {
    if (selectedIds.size === 0) {
      showAlert('No Selection', 'Select at least one offer to approve');
      return;
    }

    showConfirm(
      'Batch Approve',
      `Approve ${selectedIds.size} selected offer${selectedIds.size > 1 ? 's' : ''}?`,
      async () => {
        setBatchLoading(true);
        let successCount = 0;
        let failCount = 0;

        const ids = Array.from(selectedIds);
        for (const id of ids) {
          try {
            await campaignApprovalService.approveOffer(id, 'Batch approved by admin');
            successCount++;
          } catch {
            failCount++;
          }
        }

        setBatchLoading(false);
        setSelectedIds(new Set());

        if (failCount > 0) {
          showAlert('Partial Success', `${successCount} approved, ${failCount} failed`);
        } else {
          showAlert('Success', `${successCount} offer${successCount > 1 ? 's' : ''} approved`);
        }

        loadOffers(1);
        loadPendingCount();
      }
    );
  }, [selectedIds, loadOffers, loadPendingCount]);

  // ==========================================
  // RENDER HELPERS
  // ==========================================

  const getCountForTab = (tab: TabKey): number => {
    if (tab === 'pending') return pendingCount;
    if (tab === 'approved') return approvedCount;
    return rejectedCount;
  };

  const renderTabs = () => (
    <View style={{ height: 44, marginBottom: 12 }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ alignItems: 'center', paddingHorizontal: 4, gap: 8 }}
      >
        {TABS.map(tab => {
          const isActive = activeTab === tab.key;
          const count = getCountForTab(tab.key);
          return (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={[
                styles.tab,
                {
                  backgroundColor: isActive ? colors.purpleDark : colors.card,
                  borderColor: isActive ? colors.purpleDark : colors.border,
                },
              ]}
            >
              <Ionicons
                name={tab.icon}
                size={15}
                color={isActive ? '#FFF' : colors.secondaryText}
              />
              <Text
                style={[
                  styles.tabText,
                  { color: isActive ? '#FFF' : colors.text },
                ]}
              >
                {tab.label}
              </Text>
              {count > 0 && (
                <View
                  style={[
                    styles.tabBadge,
                    {
                      backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : colors.errorLight,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.tabBadgeText,
                      { color: isActive ? '#FFF' : colors.errorDark },
                    ]}
                  >
                    {count > 99 ? '99+' : count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  const renderOfferCard = useCallback(({ item }: { item: MerchantOffer }) => {
    const isPending = activeTabRef.current === 'pending';
    const isLoading = actionLoading.has(item._id);
    const isSelected = selectedIds.has(item._id);
    const typeColor = OFFER_TYPE_COLORS[item.type] || OFFER_TYPE_COLORS.special;

    const statusBadge = (() => {
      if (item.adminApproved === true) return { label: 'Approved', bg: colors.successLight, text: colors.successDark };
      if (item.adminApproved === false) return { label: 'Rejected', bg: colors.errorLight, text: colors.errorDark };
      return { label: 'Pending', bg: colors.warningLight, text: colors.warningDark };
    })();

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={isPending ? () => toggleSelect(item._id) : undefined}
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: isSelected ? colors.purpleDark : colors.border,
            borderWidth: isSelected ? 2 : 1,
          },
        ]}
      >
        {/* Header: store info + status badge */}
        <View style={styles.cardHeader}>
          <View style={styles.storeRow}>
            {/* Checkbox for pending tab */}
            {isPending && (
              <TouchableOpacity
                onPress={() => toggleSelect(item._id)}
                style={[
                  styles.checkbox,
                  {
                    backgroundColor: isSelected ? colors.purpleDark : 'transparent',
                    borderColor: isSelected ? colors.purpleDark : colors.border,
                  },
                ]}
              >
                {isSelected && <Ionicons name="checkmark" size={14} color="#FFF" />}
              </TouchableOpacity>
            )}

            {/* Store logo / initials */}
            {item.store?.logo ? (
              <Image source={{ uri: item.store.logo }} style={styles.storeLogo} />
            ) : (
              <View style={[styles.storeInitials, { backgroundColor: colors.backgroundSecondary }]}>
                <Text style={[styles.storeInitialsText, { color: colors.secondaryText }]}>
                  {getInitials(item.store?.name)}
                </Text>
              </View>
            )}

            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[styles.storeName, { color: colors.text }]} numberOfLines={1}>
                {item.store?.name || 'Unknown Store'}
              </Text>
              {item.store?.verified && (
                <View style={styles.verifiedRow}>
                  <Ionicons name="shield-checkmark" size={12} color={colors.info} />
                  <Text style={[styles.verifiedText, { color: colors.info }]}>Verified</Text>
                </View>
              )}
            </View>
          </View>

          <View style={[styles.statusBadge, { backgroundColor: statusBadge.bg }]}>
            <Text style={[styles.statusBadgeText, { color: statusBadge.text }]}>
              {statusBadge.label}
            </Text>
          </View>
        </View>

        {/* Offer title + type */}
        <View style={styles.offerTitleRow}>
          <Text style={[styles.offerTitle, { color: colors.text }]} numberOfLines={2}>
            {item.title}
          </Text>
          <View style={[styles.typeBadge, { backgroundColor: typeColor.bg }]}>
            <Text style={[styles.typeBadgeText, { color: typeColor.text }]}>
              {OFFER_TYPE_LABELS[item.type] || item.type}
            </Text>
          </View>
        </View>

        {/* Value + dates */}
        <View style={styles.detailsRow}>
          <View style={styles.detailItem}>
            <Text style={[styles.detailLabel, { color: colors.muted }]}>Value</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>
              {formatValue(item)}
            </Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={[styles.detailLabel, { color: colors.muted }]}>From</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>
              {formatDate(item.validity?.startDate)}
            </Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={[styles.detailLabel, { color: colors.muted }]}>To</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>
              {formatDate(item.validity?.endDate)}
            </Text>
          </View>
        </View>

        {/* Min order / max discount row */}
        {(item.restrictions?.minOrderValue || item.restrictions?.maxDiscountAmount) && (
          <View style={[styles.restrictionRow, { backgroundColor: colors.backgroundSecondary, borderColor: colors.borderLight }]}>
            {item.restrictions.minOrderValue != null && item.restrictions.minOrderValue > 0 && (
              <Text style={[styles.restrictionText, { color: colors.secondaryText }]}>
                Min order: {item.restrictions.minOrderValue.toFixed(0)}
              </Text>
            )}
            {item.restrictions.maxDiscountAmount != null && item.restrictions.maxDiscountAmount > 0 && (
              <Text style={[styles.restrictionText, { color: colors.secondaryText }]}>
                Max discount: {item.restrictions.maxDiscountAmount.toFixed(0)}
              </Text>
            )}
          </View>
        )}

        {/* Admin notes (if rejected/approved) */}
        {item.adminNotes && activeTabRef.current !== 'pending' && (
          <View style={[styles.notesRow, { borderTopColor: colors.borderLight }]}>
            <Ionicons name="document-text-outline" size={13} color={colors.muted} />
            <Text style={[styles.notesText, { color: colors.secondaryText }]} numberOfLines={2}>
              {item.adminNotes}
            </Text>
          </View>
        )}

        {/* Actions for pending tab */}
        {isPending && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.approveBtn, { opacity: isLoading ? 0.6 : 1 }]}
              onPress={() => handleApprove(item._id)}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={16} color="#FFF" />
                  <Text style={styles.approveBtnText}>Approve</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.rejectBtn, { backgroundColor: colors.errorLight, opacity: isLoading ? 0.6 : 1 }]}
              onPress={() => openRejectModal(item._id)}
              disabled={isLoading}
            >
              <Ionicons name="close-circle" size={16} color={colors.errorDark} />
              <Text style={[styles.rejectBtnText, { color: colors.errorDark }]}>Reject</Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  }, [actionLoading, selectedIds, colors, handleApprove, openRejectModal, toggleSelect]);

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* Title row */}
      <View style={styles.titleRow}>
        <View style={styles.titleLeft}>
          <View style={[styles.titleIcon, { backgroundColor: colors.purpleDark + '15' }]}>
            <Ionicons name="checkmark-circle-outline" size={24} color={colors.purpleDark} />
          </View>
          <View>
            <Text style={[styles.title, { color: colors.text }]}>Campaign Approval</Text>
            <Text style={[styles.subtitle, { color: colors.secondaryText }]}>
              Review merchant-submitted offers
            </Text>
          </View>
        </View>

        <View style={styles.titleRight}>
          {pendingCount > 0 && (
            <View style={[styles.pendingHeaderBadge, { backgroundColor: colors.errorLight }]}>
              <Text style={[styles.pendingHeaderBadgeText, { color: colors.errorDark }]}>
                {pendingCount} pending
              </Text>
            </View>
          )}
          <TouchableOpacity
            onPress={onRefresh}
            style={[styles.refreshBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Ionicons name="refresh" size={18} color={colors.secondaryText} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      {renderTabs()}

      {/* Batch approve bar (pending tab only, with selections) */}
      {activeTab === 'pending' && selectedIds.size > 0 && (
        <View style={[styles.batchBar, { backgroundColor: colors.purpleDark + '10', borderColor: colors.purpleDark + '30' }]}>
          <Text style={[styles.batchText, { color: colors.purpleDark }]}>
            {selectedIds.size} selected
          </Text>
          <TouchableOpacity
            onPress={() => setSelectedIds(new Set())}
            style={[styles.batchClearBtn, { borderColor: colors.border }]}
          >
            <Text style={[styles.batchClearText, { color: colors.secondaryText }]}>Clear</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleBatchApprove}
            disabled={batchLoading}
            style={[styles.batchApproveBtn, { opacity: batchLoading ? 0.6 : 1 }]}
          >
            {batchLoading ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <>
                <Ionicons name="checkmark-done" size={16} color="#FFF" />
                <Text style={styles.batchApproveBtnText}>Approve All</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderEmpty = () => {
    if (loading) return null;
    const emptyConfig: Record<TabKey, { icon: keyof typeof Ionicons.glyphMap; title: string; subtitle: string }> = {
      pending: {
        icon: 'checkmark-done-circle-outline',
        title: 'All caught up!',
        subtitle: 'No offers pending approval',
      },
      approved: {
        icon: 'checkmark-circle-outline',
        title: 'No approved offers',
        subtitle: 'Approved offers will appear here',
      },
      rejected: {
        icon: 'close-circle-outline',
        title: 'No rejected offers',
        subtitle: 'Rejected offers will appear here',
      },
    };
    const config = emptyConfig[activeTab];

    return (
      <View style={styles.emptyContainer}>
        <View style={[styles.emptyIconCircle, { backgroundColor: colors.backgroundSecondary }]}>
          <Ionicons name={config.icon} size={40} color={colors.success} />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>{config.title}</Text>
        <Text style={[styles.emptySubtitle, { color: colors.secondaryText }]}>{config.subtitle}</Text>
      </View>
    );
  };

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.purpleDark} />
        <Text style={[styles.footerText, { color: colors.secondaryText }]}>Loading more...</Text>
      </View>
    );
  };

  // ==========================================
  // ERROR STATE
  // ==========================================

  if (error && offers.length === 0 && !loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        {renderHeader()}
        <View style={styles.errorContainer}>
          <View style={[styles.emptyIconCircle, { backgroundColor: colors.errorLight }]}>
            <Ionicons name="alert-circle-outline" size={40} color={colors.errorDark} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Something went wrong</Text>
          <Text style={[styles.emptySubtitle, { color: colors.secondaryText }]}>{error}</Text>
          <TouchableOpacity
            onPress={() => loadOffers(1)}
            style={[styles.retryBtn, { backgroundColor: colors.purpleDark }]}
          >
            <Ionicons name="refresh" size={16} color="#FFF" />
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ==========================================
  // MAIN RENDER
  // ==========================================

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {loading && offers.length === 0 ? (
        <View style={{ flex: 1 }}>
          {renderHeader()}
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={colors.purpleDark} />
            <Text style={[styles.loaderText, { color: colors.secondaryText }]}>Loading offers...</Text>
          </View>
        </View>
      ) : (
        <FlatList
          data={offers}
          keyExtractor={item => item._id}
          renderItem={renderOfferCard}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
          contentContainerStyle={{ paddingBottom: 60, paddingHorizontal: 16 }}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.3}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.purpleDark}
              colors={[colors.purpleDark]}
            />
          }
        />
      )}

      {/* ======== Reject Modal ======== */}
      <Modal
        visible={showRejectModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRejectModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Ionicons name="close-circle" size={28} color={colors.errorDark} />
              <Text style={[styles.modalTitle, { color: colors.text }]}>Reject Offer</Text>
            </View>

            <Text style={[styles.modalLabel, { color: colors.secondaryText }]}>
              Reason for rejection (required)
            </Text>
            <TextInput
              style={[
                styles.modalInput,
                {
                  backgroundColor: colors.backgroundSecondary,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              placeholder="Enter rejection reason..."
              placeholderTextColor={colors.muted}
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => {
                  setShowRejectModal(false);
                  setRejectTargetId(null);
                  setRejectReason('');
                }}
                style={[styles.modalCancelBtn, { borderColor: colors.border }]}
              >
                <Text style={[styles.modalCancelText, { color: colors.secondaryText }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleRejectSubmit}
                disabled={rejectSubmitting || !rejectReason.trim()}
                style={[
                  styles.modalRejectBtn,
                  { opacity: rejectSubmitting || !rejectReason.trim() ? 0.5 : 1 },
                ]}
              >
                {rejectSubmitting ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.modalRejectText}>Reject</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    paddingTop: 8,
    marginBottom: 4,
  },

  // Title
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  titleIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  titleRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pendingHeaderBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  pendingHeaderBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },

  // Tabs
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
  },
  tabBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },

  // Batch bar
  batchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    gap: 10,
  },
  batchText: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  batchClearBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  batchClearText: {
    fontSize: 12,
    fontWeight: '600',
  },
  batchApproveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  batchApproveBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },

  // Card
  card: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  storeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  storeLogo: {
    width: 36,
    height: 36,
    borderRadius: 10,
  },
  storeInitials: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storeInitialsText: {
    fontSize: 13,
    fontWeight: '700',
  },
  storeName: {
    fontSize: 14,
    fontWeight: '600',
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },

  // Offer info
  offerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
    gap: 8,
  },
  offerTitle: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'capitalize',
  },

  // Details
  detailsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  detailItem: {},
  detailLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    fontWeight: '500',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Restrictions
  restrictionRow: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
  },
  restrictionText: {
    fontSize: 11,
    fontWeight: '500',
  },

  // Notes
  notesRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    paddingTop: 8,
    marginTop: 8,
    borderTopWidth: 1,
  },
  notesText: {
    fontSize: 12,
    flex: 1,
    lineHeight: 17,
  },

  // Actions
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  approveBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#059669',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  approveBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 13,
  },
  rejectBtn: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  rejectBtnText: {
    fontWeight: '700',
    fontSize: 13,
  },

  // Empty
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 80,
    paddingBottom: 40,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
  },

  // Error
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 80,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 16,
    gap: 6,
  },
  retryBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },

  // Loader
  loaderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loaderText: {
    fontSize: 14,
  },

  // Footer
  footerLoader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  footerText: {
    fontSize: 13,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    maxWidth: 440,
    borderRadius: 16,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalLabel: {
    fontSize: 13,
    marginBottom: 8,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    minHeight: 100,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalRejectBtn: {
    flex: 1,
    backgroundColor: '#DC2626',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalRejectText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
