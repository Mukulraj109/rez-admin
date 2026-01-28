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
  TextInput,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { merchantsService, Merchant, MerchantWallet } from '../../services/api/merchants';
import { Colors } from '../../constants/Colors';
import { format } from 'date-fns';
import { showAlert, showConfirm } from '../../utils/alert';

type StatusFilter = 'all' | 'pending' | 'approved' | 'suspended';

export default function MerchantsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [processingMerchant, setProcessingMerchant] = useState<string | null>(null);

  // Rejection modal
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [selectedMerchant, setSelectedMerchant] = useState<string | null>(null);

  // Detail modal
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailMerchant, setDetailMerchant] = useState<Merchant | null>(null);
  const [merchantWallet, setMerchantWallet] = useState<MerchantWallet | null>(null);
  const [loadingWallet, setLoadingWallet] = useState(false);

  // Suspend modal
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');
  const [suspendMerchantId, setSuspendMerchantId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [statusFilter, searchQuery]);

  const loadData = async (pageNum: number = 1, append: boolean = false) => {
    try {
      const data = await merchantsService.getMerchants(
        pageNum,
        20,
        statusFilter === 'all' ? undefined : statusFilter,
        searchQuery || undefined
      );

      if (append) {
        setMerchants(prev => [...prev, ...data.merchants]);
      } else {
        setMerchants(data.merchants);
      }

      setHasMore(data.pagination.page < data.pagination.totalPages);
      setPage(pageNum);
    } catch (error) {
      console.error('Failed to load merchants:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData(1);
    setRefreshing(false);
  }, [statusFilter, searchQuery]);

  const loadMore = () => {
    if (!isLoading && hasMore) {
      loadData(page + 1, true);
    }
  };

  const handleApprove = async (merchantId: string) => {
    showConfirm(
      'Approve Merchant',
      'Are you sure you want to approve this merchant?',
      async () => {
        try {
          setProcessingMerchant(merchantId);
          await merchantsService.approveMerchant(merchantId);
          showAlert('Success', 'Merchant approved successfully');
          await loadData(1);
        } catch (error: any) {
          showAlert('Error', error.message);
        } finally {
          setProcessingMerchant(null);
        }
      },
      'Approve'
    );
  };

  const handleReject = async () => {
    if (!rejectReason.trim() || !selectedMerchant) {
      showAlert('Error', 'Please provide a rejection reason');
      return;
    }
    try {
      setProcessingMerchant(selectedMerchant);
      await merchantsService.rejectMerchant(selectedMerchant, rejectReason);
      showAlert('Success', 'Merchant rejected');
      setShowRejectModal(false);
      setRejectReason('');
      setSelectedMerchant(null);
      await loadData(1);
    } catch (error: any) {
      showAlert('Error', error.message);
    } finally {
      setProcessingMerchant(null);
    }
  };

  const handleViewDetails = async (merchant: Merchant) => {
    setDetailMerchant(merchant);
    setShowDetailModal(true);
    setLoadingWallet(true);
    setMerchantWallet(null);

    try {
      const wallet = await merchantsService.getMerchantWallet(merchant._id);
      setMerchantWallet(wallet);
    } catch (err: any) {
      console.error('Failed to load merchant wallet:', err);
    } finally {
      setLoadingWallet(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleSuspend = (merchantId: string) => {
    setSuspendMerchantId(merchantId);
    setSuspendReason('');
    setShowSuspendModal(true);
  };

  const handleSuspendConfirm = async () => {
    if (!suspendReason.trim() || !suspendMerchantId) {
      showAlert('Error', 'Please provide a suspension reason');
      return;
    }
    try {
      setProcessingMerchant(suspendMerchantId);
      await merchantsService.suspendMerchant(suspendMerchantId, suspendReason);
      showAlert('Success', 'Merchant suspended');
      setShowSuspendModal(false);
      setSuspendReason('');
      setSuspendMerchantId(null);
      await loadData(1);
    } catch (error: any) {
      showAlert('Error', error.message);
    } finally {
      setProcessingMerchant(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return colors.success;
      case 'pending': return colors.warning;
      case 'rejected': return colors.error;
      case 'suspended': return '#6B7280';
      default: return colors.icon;
    }
  };

  const renderFilters = () => (
    <View style={styles.filtersContainer}>
      <View style={[styles.searchContainer, { backgroundColor: colors.card }]}>
        <Ionicons name="search" size={20} color={colors.icon} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search merchants..."
          placeholderTextColor={colors.icon}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color={colors.icon} />
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.statusFilters}>
        {(['all', 'pending', 'approved', 'suspended'] as StatusFilter[]).map(status => (
          <TouchableOpacity
            key={status}
            style={[
              styles.filterChip,
              { backgroundColor: statusFilter === status ? colors.tint : colors.card },
            ]}
            onPress={() => {
              setStatusFilter(status);
              setIsLoading(true);
            }}
          >
            <Text
              style={[
                styles.filterChipText,
                { color: statusFilter === status ? '#FFFFFF' : colors.text },
              ]}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderMerchantItem = ({ item }: { item: Merchant }) => (
    <View style={[styles.merchantCard, { backgroundColor: colors.card }]}>
      <View style={styles.merchantHeader}>
        <View style={styles.merchantAvatar}>
          <Ionicons name="storefront" size={24} color={colors.tint} />
        </View>
        <View style={styles.merchantInfo}>
          <Text style={[styles.businessName, { color: colors.text }]}>
            {item.businessName}
          </Text>
          <Text style={[styles.businessType, { color: colors.icon }]}>
            {item.businessType}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(item.status)}20` }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status}
          </Text>
        </View>
      </View>

      <View style={styles.merchantDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="mail-outline" size={16} color={colors.icon} />
          <Text style={[styles.detailText, { color: colors.icon }]}>{item.email}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="call-outline" size={16} color={colors.icon} />
          <Text style={[styles.detailText, { color: colors.icon }]}>{item.phoneNumber}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="storefront-outline" size={16} color={colors.icon} />
          <Text style={[styles.detailText, { color: colors.icon }]}>
            {item.stores?.length || 0} stores
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="calendar-outline" size={16} color={colors.icon} />
          <Text style={[styles.detailText, { color: colors.icon }]}>
            Joined {format(new Date(item.createdAt), 'MMM d, yyyy')}
          </Text>
        </View>
      </View>

      {item.status === 'pending' && (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.success }]}
            onPress={() => handleApprove(item._id)}
            disabled={processingMerchant === item._id}
          >
            {processingMerchant === item._id ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Approve</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.error }]}
            onPress={() => {
              setSelectedMerchant(item._id);
              setShowRejectModal(true);
            }}
            disabled={processingMerchant === item._id}
          >
            <Ionicons name="close" size={18} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Reject</Text>
          </TouchableOpacity>
        </View>
      )}

      {item.status === 'approved' && (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.info }]}
            onPress={() => handleViewDetails(item)}
          >
            <Ionicons name="eye" size={18} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>View Details</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#6B7280' }]}
            onPress={() => handleSuspend(item._id)}
            disabled={processingMerchant === item._id}
          >
            <Ionicons name="ban" size={18} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Suspend</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  if (isLoading && merchants.length === 0) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {renderFilters()}

      <FlatList
        data={merchants}
        renderItem={renderMerchantItem}
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
            <Ionicons name="storefront-outline" size={48} color={colors.icon} />
            <Text style={[styles.emptyText, { color: colors.icon }]}>
              No merchants found
            </Text>
          </View>
        }
      />

      {/* Reject Modal */}
      <Modal visible={showRejectModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Reject Merchant</Text>
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
                  setSelectedMerchant(null);
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

      {/* Suspend Modal */}
      <Modal visible={showSuspendModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.suspendModalHeader}>
              <Ionicons name="warning" size={24} color="#6B7280" />
              <Text style={[styles.modalTitle, { color: colors.text, marginBottom: 0 }]}>Suspend Merchant</Text>
            </View>
            <TextInput
              style={[styles.reasonInput, { color: colors.text, borderColor: colors.border }]}
              placeholder="Enter suspension reason..."
              placeholderTextColor={colors.icon}
              value={suspendReason}
              onChangeText={setSuspendReason}
              multiline
              numberOfLines={3}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.border }]}
                onPress={() => {
                  setShowSuspendModal(false);
                  setSuspendReason('');
                  setSuspendMerchantId(null);
                }}
              >
                <Text style={[styles.modalButtonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: '#6B7280' }]}
                onPress={handleSuspendConfirm}
              >
                <Text style={[styles.modalButtonText, { color: '#FFFFFF' }]}>Suspend</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Merchant Detail Modal */}
      <Modal visible={showDetailModal} transparent animationType="slide">
        <View style={styles.detailModalOverlay}>
          <View style={[styles.detailModalContent, { backgroundColor: colors.card }]}>
            <View style={styles.detailModalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text, marginBottom: 0 }]}>Merchant Details</Text>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                <Ionicons name="close" size={24} color={colors.icon} />
              </TouchableOpacity>
            </View>

            {detailMerchant && (
              <ScrollView style={styles.detailModalBody} showsVerticalScrollIndicator={false}>
                {/* Merchant Info */}
                <View style={styles.detailSection}>
                  <View style={styles.detailMerchantHeader}>
                    <View style={[styles.detailAvatar, { backgroundColor: '#FEE2E2' }]}>
                      <Ionicons name="storefront" size={32} color={colors.tint} />
                    </View>
                    <View style={styles.detailMerchantInfo}>
                      <Text style={[styles.detailMerchantName, { color: colors.text }]}>
                        {detailMerchant.businessName}
                      </Text>
                      <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(detailMerchant.status)}20`, alignSelf: 'flex-start' }]}>
                        <Text style={[styles.statusText, { color: getStatusColor(detailMerchant.status) }]}>
                          {detailMerchant.status}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={[styles.infoCard, { backgroundColor: colors.background }]}>
                    <View style={styles.infoRow}>
                      <Ionicons name="briefcase-outline" size={18} color={colors.icon} />
                      <View style={styles.infoContent}>
                        <Text style={[styles.infoLabel, { color: colors.icon }]}>Business Type</Text>
                        <Text style={[styles.infoValue, { color: colors.text }]}>{detailMerchant.businessType}</Text>
                      </View>
                    </View>
                    <View style={styles.infoRow}>
                      <Ionicons name="mail-outline" size={18} color={colors.icon} />
                      <View style={styles.infoContent}>
                        <Text style={[styles.infoLabel, { color: colors.icon }]}>Email</Text>
                        <Text style={[styles.infoValue, { color: colors.text }]}>{detailMerchant.email}</Text>
                      </View>
                    </View>
                    <View style={styles.infoRow}>
                      <Ionicons name="call-outline" size={18} color={colors.icon} />
                      <View style={styles.infoContent}>
                        <Text style={[styles.infoLabel, { color: colors.icon }]}>Phone</Text>
                        <Text style={[styles.infoValue, { color: colors.text }]}>{detailMerchant.phoneNumber}</Text>
                      </View>
                    </View>
                    <View style={styles.infoRow}>
                      <Ionicons name="calendar-outline" size={18} color={colors.icon} />
                      <View style={styles.infoContent}>
                        <Text style={[styles.infoLabel, { color: colors.icon }]}>Joined</Text>
                        <Text style={[styles.infoValue, { color: colors.text }]}>
                          {format(new Date(detailMerchant.createdAt), 'MMMM d, yyyy')}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.infoRow}>
                      <Ionicons name="storefront-outline" size={18} color={colors.icon} />
                      <View style={styles.infoContent}>
                        <Text style={[styles.infoLabel, { color: colors.icon }]}>Stores</Text>
                        <Text style={[styles.infoValue, { color: colors.text }]}>
                          {detailMerchant.stores?.length || 0} stores
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Stores List */}
                {detailMerchant.stores && detailMerchant.stores.length > 0 && (
                  <View style={styles.detailSection}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Stores</Text>
                    {detailMerchant.stores.map((store, index) => (
                      <View key={store._id || index} style={[styles.storeItem, { backgroundColor: colors.background }]}>
                        <Ionicons name="storefront-outline" size={18} color={colors.tint} />
                        <View style={styles.storeInfo}>
                          <Text style={[styles.storeName, { color: colors.text }]}>{store.name}</Text>
                          <Text style={[styles.storeStatus, { color: getStatusColor(store.status) }]}>{store.status}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {/* Bank Details */}
                {detailMerchant.bankDetails && (
                  <View style={styles.detailSection}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Bank Details</Text>
                    <View style={[styles.infoCard, { backgroundColor: colors.background }]}>
                      <View style={styles.infoRow}>
                        <Ionicons name="person-outline" size={18} color={colors.icon} />
                        <View style={styles.infoContent}>
                          <Text style={[styles.infoLabel, { color: colors.icon }]}>Account Holder</Text>
                          <Text style={[styles.infoValue, { color: colors.text }]}>{detailMerchant.bankDetails.accountHolderName}</Text>
                        </View>
                      </View>
                      <View style={styles.infoRow}>
                        <Ionicons name="card-outline" size={18} color={colors.icon} />
                        <View style={styles.infoContent}>
                          <Text style={[styles.infoLabel, { color: colors.icon }]}>Account Number</Text>
                          <Text style={[styles.infoValue, { color: colors.text }]}>{detailMerchant.bankDetails.accountNumber}</Text>
                        </View>
                      </View>
                      <View style={styles.infoRow}>
                        <Ionicons name="code-outline" size={18} color={colors.icon} />
                        <View style={styles.infoContent}>
                          <Text style={[styles.infoLabel, { color: colors.icon }]}>IFSC Code</Text>
                          <Text style={[styles.infoValue, { color: colors.text }]}>{detailMerchant.bankDetails.ifscCode}</Text>
                        </View>
                      </View>
                      <View style={styles.infoRow}>
                        <Ionicons name="shield-checkmark-outline" size={18} color={colors.icon} />
                        <View style={styles.infoContent}>
                          <Text style={[styles.infoLabel, { color: colors.icon }]}>Verified</Text>
                          <Text style={[styles.infoValue, { color: detailMerchant.bankDetails.isVerified ? colors.success : colors.warning }]}>
                            {detailMerchant.bankDetails.isVerified ? 'Yes' : 'No'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                )}

                {/* Wallet Section */}
                <View style={styles.detailSection}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Wallet</Text>
                  {loadingWallet ? (
                    <View style={styles.walletLoading}>
                      <ActivityIndicator size="small" color={colors.tint} />
                      <Text style={[styles.walletLoadingText, { color: colors.icon }]}>Loading wallet...</Text>
                    </View>
                  ) : merchantWallet ? (
                    <View>
                      <View style={[styles.walletCard, { backgroundColor: colors.tint }]}>
                        <View style={styles.walletIcon}>
                          <Ionicons name="wallet" size={28} color="#FFFFFF" />
                        </View>
                        <View style={styles.walletInfo}>
                          <Text style={styles.walletLabel}>Available Balance</Text>
                          <Text style={styles.walletBalance}>{formatCurrency(merchantWallet.balance.available)}</Text>
                        </View>
                      </View>
                      <View style={styles.walletStatsRow}>
                        <View style={[styles.walletStatItem, { backgroundColor: colors.background }]}>
                          <Text style={[styles.walletStatLabel, { color: colors.icon }]}>Total</Text>
                          <Text style={[styles.walletStatValue, { color: colors.text }]}>{formatCurrency(merchantWallet.balance.total)}</Text>
                        </View>
                        <View style={[styles.walletStatItem, { backgroundColor: colors.background }]}>
                          <Text style={[styles.walletStatLabel, { color: colors.icon }]}>Pending</Text>
                          <Text style={[styles.walletStatValue, { color: colors.warning }]}>{formatCurrency(merchantWallet.balance.pending)}</Text>
                        </View>
                        <View style={[styles.walletStatItem, { backgroundColor: colors.background }]}>
                          <Text style={[styles.walletStatLabel, { color: colors.icon }]}>Withdrawn</Text>
                          <Text style={[styles.walletStatValue, { color: colors.text }]}>{formatCurrency(merchantWallet.balance.withdrawn)}</Text>
                        </View>
                      </View>
                      {merchantWallet.statistics && (
                        <View style={[styles.infoCard, { backgroundColor: colors.background, marginTop: 12 }]}>
                          <View style={styles.infoRow}>
                            <Ionicons name="cart-outline" size={18} color={colors.icon} />
                            <View style={styles.infoContent}>
                              <Text style={[styles.infoLabel, { color: colors.icon }]}>Total Orders</Text>
                              <Text style={[styles.infoValue, { color: colors.text }]}>{merchantWallet.statistics.totalOrders}</Text>
                            </View>
                          </View>
                          <View style={styles.infoRow}>
                            <Ionicons name="trending-up-outline" size={18} color={colors.icon} />
                            <View style={styles.infoContent}>
                              <Text style={[styles.infoLabel, { color: colors.icon }]}>Total Sales</Text>
                              <Text style={[styles.infoValue, { color: colors.text }]}>{formatCurrency(merchantWallet.statistics.totalSales)}</Text>
                            </View>
                          </View>
                          <View style={styles.infoRow}>
                            <Ionicons name="cash-outline" size={18} color={colors.icon} />
                            <View style={styles.infoContent}>
                              <Text style={[styles.infoLabel, { color: colors.icon }]}>Net Sales</Text>
                              <Text style={[styles.infoValue, { color: colors.success }]}>{formatCurrency(merchantWallet.statistics.netSales)}</Text>
                            </View>
                          </View>
                        </View>
                      )}
                    </View>
                  ) : (
                    <View style={[styles.walletEmpty, { backgroundColor: colors.background }]}>
                      <Ionicons name="wallet-outline" size={24} color={colors.icon} />
                      <Text style={[styles.walletEmptyText, { color: colors.icon }]}>
                        No wallet data available
                      </Text>
                    </View>
                  )}
                </View>
              </ScrollView>
            )}

            <TouchableOpacity
              style={[styles.closeButton, { backgroundColor: colors.tint }]}
              onPress={() => setShowDetailModal(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
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
  filtersContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    height: 44,
    marginLeft: 8,
    fontSize: 15,
  },
  statusFilters: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
  },
  merchantCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  merchantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  merchantAvatar: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  merchantInfo: {
    flex: 1,
    marginLeft: 12,
  },
  businessName: {
    fontSize: 16,
    fontWeight: '600',
  },
  businessType: {
    fontSize: 13,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  merchantDetails: {
    marginTop: 16,
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 13,
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 16,
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
  actionButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
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
  suspendModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  detailModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  detailModalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '85%',
  },
  detailModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  detailModalBody: {
    maxHeight: 450,
  },
  detailSection: {
    marginBottom: 20,
  },
  detailMerchantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  detailAvatar: {
    width: 64,
    height: 64,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailMerchantInfo: {
    flex: 1,
    marginLeft: 16,
  },
  detailMerchantName: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  infoCard: {
    borderRadius: 12,
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  storeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    gap: 10,
  },
  storeInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  storeName: {
    fontSize: 14,
    fontWeight: '500',
  },
  storeStatus: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  walletLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 8,
  },
  walletLoadingText: {
    fontSize: 14,
  },
  walletCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 16,
  },
  walletIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  walletInfo: {
    flex: 1,
    marginLeft: 16,
  },
  walletLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    marginBottom: 4,
  },
  walletBalance: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
  },
  walletStatsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  walletStatItem: {
    flex: 1,
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
  },
  walletStatLabel: {
    fontSize: 11,
    marginBottom: 4,
  },
  walletStatValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  walletEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    padding: 20,
    gap: 8,
  },
  walletEmptyText: {
    fontSize: 14,
  },
  closeButton: {
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
});
