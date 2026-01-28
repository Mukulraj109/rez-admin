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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ordersService, Order } from '../../services/api/orders';
import { Colors } from '../../constants/Colors';
import { format } from 'date-fns';
import { showAlert } from '../../utils/alert';

type StatusFilter = 'all' | 'pending' | 'confirmed' | 'delivered' | 'cancelled';

export default function OrdersScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [orders, setOrders] = useState<Order[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [processingOrder, setProcessingOrder] = useState<string | null>(null);

  // Detail modal
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Reason modal (refund / cancel)
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [reasonText, setReasonText] = useState('');
  const [reasonAction, setReasonAction] = useState<'refund' | 'cancel'>('refund');
  const [reasonOrderId, setReasonOrderId] = useState<string | null>(null);

  // Status update modal
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusOrderId, setStatusOrderId] = useState<string | null>(null);
  const [statusOrderCurrent, setStatusOrderCurrent] = useState<string>('');

  useEffect(() => {
    loadData();
  }, [statusFilter, searchQuery]);

  const loadData = async (pageNum: number = 1, append: boolean = false) => {
    try {
      const data = await ordersService.getOrders(
        pageNum,
        20,
        statusFilter === 'all' ? undefined : statusFilter,
        undefined,
        searchQuery || undefined
      );

      if (append) {
        setOrders(prev => [...prev, ...data.orders]);
      } else {
        setOrders(data.orders);
      }

      setHasMore(data.pagination.page < data.pagination.totalPages);
      setPage(pageNum);
    } catch (error) {
      console.error('Failed to load orders:', error);
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

  const handleRefund = (orderId: string) => {
    setReasonOrderId(orderId);
    setReasonAction('refund');
    setReasonText('');
    setShowReasonModal(true);
  };

  const handleCancel = (orderId: string) => {
    setReasonOrderId(orderId);
    setReasonAction('cancel');
    setReasonText('');
    setShowReasonModal(true);
  };

  const handleReasonConfirm = async () => {
    if (!reasonText.trim() || !reasonOrderId) {
      showAlert('Error', 'Please provide a reason');
      return;
    }
    try {
      setProcessingOrder(reasonOrderId);
      if (reasonAction === 'refund') {
        await ordersService.refundOrder(reasonOrderId, reasonText);
        showAlert('Success', 'Refund processed successfully');
      } else {
        await ordersService.cancelOrder(reasonOrderId, reasonText);
        showAlert('Success', 'Order cancelled');
      }
      setShowReasonModal(false);
      setReasonText('');
      setReasonOrderId(null);
      await loadData(1);
    } catch (error: any) {
      showAlert('Error', error.message);
    } finally {
      setProcessingOrder(null);
    }
  };

  const STATUS_TRANSITIONS: { [key: string]: string[] } = {
    placed: ['confirmed', 'cancelled'],
    pending: ['confirmed', 'cancelled'],
    confirmed: ['preparing', 'cancelled'],
    preparing: ['ready', 'cancelled'],
    ready: ['dispatched', 'cancelled'],
    dispatched: ['delivered', 'returned'],
    delivered: ['returned', 'refunded'],
    cancelled: ['refunded'],
    returned: ['refunded'],
    refunded: [],
  };

  const handleUpdateStatus = (orderId: string, currentStatus: string) => {
    setStatusOrderId(orderId);
    setStatusOrderCurrent(currentStatus);
    setShowStatusModal(true);
  };

  const handleStatusSelect = async (newStatus: string) => {
    if (!statusOrderId) return;
    try {
      setProcessingOrder(statusOrderId);
      setShowStatusModal(false);
      await ordersService.updateOrderStatus(statusOrderId, newStatus);
      showAlert('Success', `Order status updated to ${newStatus}`);
      await loadData(1);
    } catch (error: any) {
      showAlert('Error', error.message);
    } finally {
      setProcessingOrder(null);
      setStatusOrderId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return colors.success;
      case 'pending':
      case 'placed': return colors.warning;
      case 'confirmed':
      case 'preparing':
      case 'ready': return colors.info;
      case 'out_for_delivery': return '#8B5CF6';
      case 'cancelled':
      case 'refunded': return colors.error;
      default: return colors.icon;
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return colors.success;
      case 'pending': return colors.warning;
      case 'failed':
      case 'refunded': return colors.error;
      default: return colors.icon;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const renderFilters = () => (
    <View style={styles.filtersContainer}>
      <View style={[styles.searchContainer, { backgroundColor: colors.card }]}>
        <Ionicons name="search" size={20} color={colors.icon} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search by order number..."
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
        {(['all', 'pending', 'confirmed', 'delivered', 'cancelled'] as StatusFilter[]).map(status => (
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

  const renderOrderItem = ({ item }: { item: Order }) => {
    const customerName = item.user?.profile
      ? `${item.user.profile.firstName || ''} ${item.user.profile.lastName || ''}`.trim()
      : item.user?.phoneNumber || 'Unknown';

    return (
      <TouchableOpacity
        style={[styles.orderCard, { backgroundColor: colors.card }]}
        onPress={() => {
          setSelectedOrder(item);
          setShowDetailModal(true);
        }}
      >
        <View style={styles.orderHeader}>
          <View>
            <Text style={[styles.orderNumber, { color: colors.text }]}>
              #{item.orderNumber}
            </Text>
            <Text style={[styles.storeName, { color: colors.icon }]}>
              {item.store?.name || item.items?.[0]?.store?.name || 'Unknown Store'}
            </Text>
            {item.items?.length > 0 && (
              <Text style={[styles.productNames, { color: colors.icon }]} numberOfLines={1}>
                {item.items.map((i: any) => i.name || i.product?.name).filter(Boolean).join(', ')}
              </Text>
            )}
          </View>
          <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(item.status)}20` }]}>
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {item.status.replace(/_/g, ' ')}
            </Text>
          </View>
        </View>

        <View style={styles.orderDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="person-outline" size={16} color={colors.icon} />
            <Text style={[styles.detailText, { color: colors.icon }]}>{customerName}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="receipt-outline" size={16} color={colors.icon} />
            <Text style={[styles.detailText, { color: colors.icon }]}>
              {item.items?.length || 0} items
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={16} color={colors.icon} />
            <Text style={[styles.detailText, { color: colors.icon }]}>
              {format(new Date(item.createdAt), 'MMM d, yyyy h:mm a')}
            </Text>
          </View>
        </View>

        <View style={styles.orderFooter}>
          <View>
            <Text style={[styles.totalLabel, { color: colors.icon }]}>Total</Text>
            <Text style={[styles.totalAmount, { color: colors.text }]}>
              {formatCurrency(item.totals?.total || 0)}
            </Text>
          </View>
          <View style={styles.paymentInfo}>
            <View style={[styles.paymentBadge, { backgroundColor: `${getPaymentStatusColor(item.paymentStatus)}20` }]}>
              <Text style={[styles.paymentStatusText, { color: getPaymentStatusColor(item.paymentStatus) }]}>
                {item.paymentStatus}
              </Text>
            </View>
            <Text style={[styles.deliveryType, { color: colors.icon }]}>
              {item.deliveryType}
            </Text>
          </View>
        </View>

        {/* Fee breakdown */}
        {item.totals?.platformFee > 0 && (
          <View style={[styles.feeBreakdown, { borderTopColor: colors.border }]}>
            <View style={styles.feeRow}>
              <Text style={[styles.feeLabel, { color: colors.icon }]}>Platform Fee (15%)</Text>
              <Text style={[styles.feeValue, { color: colors.tint }]}>
                {formatCurrency(item.totals.platformFee)}
              </Text>
            </View>
            <View style={styles.feeRow}>
              <Text style={[styles.feeLabel, { color: colors.icon }]}>Merchant Payout</Text>
              <Text style={[styles.feeValue, { color: colors.success }]}>
                {formatCurrency(item.totals.merchantPayout || 0)}
              </Text>
            </View>
          </View>
        )}

        {/* Coin & Cashback Details */}
        {(() => {
          const lockFee = item.items?.reduce((sum: number, i: any) => sum + (i.discount || 0), 0) || 0;
          const coinsUsed = item.payment?.coinsUsed;
          const checkoutCoins = coinsUsed?.totalCoinsValue || coinsUsed?.rezCoins || 0;
          const cashback = item.totals?.cashback || 0;
          const hasDetails = lockFee > 0 || checkoutCoins > 0 || cashback > 0;

          if (!hasDetails) return null;

          return (
            <View style={[styles.feeBreakdown, { borderTopColor: colors.border }]}>
              {lockFee > 0 && (
                <View style={styles.feeRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Ionicons name="lock-closed" size={13} color="#059669" />
                    <Text style={[styles.feeLabel, { color: '#059669' }]}>Lock Fee Paid</Text>
                  </View>
                  <Text style={[styles.feeValue, { color: '#059669' }]}>
                    {formatCurrency(lockFee)}
                  </Text>
                </View>
              )}
              {checkoutCoins > 0 && (
                <View style={styles.feeRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Ionicons name="wallet" size={13} color="#7C3AED" />
                    <Text style={[styles.feeLabel, { color: '#7C3AED' }]}>Coins Used at Checkout</Text>
                  </View>
                  <Text style={[styles.feeValue, { color: '#7C3AED' }]}>
                    {formatCurrency(checkoutCoins)}
                  </Text>
                </View>
              )}
              {cashback > 0 && (
                <View style={styles.feeRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Ionicons name="gift" size={13} color="#D97706" />
                    <Text style={[styles.feeLabel, { color: '#D97706' }]}>
                      {item.status === 'delivered' ? 'Cashback Earned' : 'Cashback (after delivery)'}
                    </Text>
                  </View>
                  <Text style={[styles.feeValue, { color: '#D97706' }]}>
                    {formatCurrency(cashback)}
                  </Text>
                </View>
              )}
            </View>
          );
        })()}

        {/* Actions for specific statuses */}
        {(item.status === 'delivered' || item.status === 'confirmed') && item.paymentStatus === 'paid' && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.warning }]}
              onPress={() => handleRefund(item._id)}
              disabled={processingOrder === item._id}
            >
              {processingOrder === item._id ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="refresh" size={16} color="#FFFFFF" />
                  <Text style={styles.actionButtonText}>Refund</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {(item.status === 'pending' || item.status === 'placed') && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.error }]}
              onPress={() => handleCancel(item._id)}
              disabled={processingOrder === item._id}
            >
              {processingOrder === item._id ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="close" size={16} color="#FFFFFF" />
                  <Text style={styles.actionButtonText}>Cancel</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Update Status button for orders with available transitions */}
        {(STATUS_TRANSITIONS[item.status]?.length > 0) && (
          <View style={[styles.actionButtons, { marginTop: item.status === 'pending' || item.status === 'placed' || ((item.status === 'delivered' || item.status === 'confirmed') && item.paymentStatus === 'paid') ? 0 : 12 }]}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.tint }]}
              onPress={() => handleUpdateStatus(item._id, item.status)}
              disabled={processingOrder === item._id}
            >
              {processingOrder === item._id ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="swap-horizontal" size={16} color="#FFFFFF" />
                  <Text style={styles.actionButtonText}>Update Status</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (isLoading && orders.length === 0) {
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
        data={orders}
        renderItem={renderOrderItem}
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
            <Ionicons name="receipt-outline" size={48} color={colors.icon} />
            <Text style={[styles.emptyText, { color: colors.icon }]}>
              No orders found
            </Text>
          </View>
        }
      />

      {/* Order Detail Modal */}
      <Modal visible={showDetailModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Order #{selectedOrder?.orderNumber}
              </Text>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                <Ionicons name="close" size={24} color={colors.icon} />
              </TouchableOpacity>
            </View>

            {selectedOrder && (
              <View style={styles.modalBody}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Items</Text>
                {selectedOrder.items?.map((item, index) => (
                  <View key={index} style={styles.itemRow}>
                    <Text style={[styles.itemName, { color: colors.text }]}>
                      {item.quantity}x {item.product?.name || 'Item'}
                    </Text>
                    <Text style={[styles.itemPrice, { color: colors.icon }]}>
                      {formatCurrency(item.total)}
                    </Text>
                  </View>
                ))}

                <View style={[styles.totalSection, { borderTopColor: colors.border }]}>
                  <View style={styles.totalRow}>
                    <Text style={[styles.totalLabel, { color: colors.icon }]}>Subtotal</Text>
                    <Text style={[styles.totalValue, { color: colors.text }]}>
                      {formatCurrency(selectedOrder.totals?.subtotal || 0)}
                    </Text>
                  </View>
                  <View style={styles.totalRow}>
                    <Text style={[styles.totalLabel, { color: colors.icon }]}>Tax</Text>
                    <Text style={[styles.totalValue, { color: colors.text }]}>
                      {formatCurrency(selectedOrder.totals?.tax || 0)}
                    </Text>
                  </View>
                  <View style={styles.totalRow}>
                    <Text style={[styles.totalLabel, { color: colors.icon }]}>Delivery</Text>
                    <Text style={[styles.totalValue, { color: colors.text }]}>
                      {formatCurrency(selectedOrder.totals?.deliveryFee || 0)}
                    </Text>
                  </View>
                  <View style={styles.totalRow}>
                    <Text style={[styles.totalLabelBold, { color: colors.text }]}>Total</Text>
                    <Text style={[styles.totalValueBold, { color: colors.text }]}>
                      {formatCurrency(selectedOrder.totals?.total || 0)}
                    </Text>
                  </View>
                </View>
              </View>
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

      {/* Status Update Modal */}
      <Modal visible={showStatusModal} transparent animationType="slide">
        <View style={styles.reasonModalOverlay}>
          <View style={[styles.reasonModalContent, { backgroundColor: colors.card }]}>
            <View style={styles.reasonModalHeader}>
              <Ionicons name="swap-horizontal" size={24} color={colors.tint} />
              <Text style={[styles.reasonModalTitle, { color: colors.text }]}>
                Update Status
              </Text>
            </View>
            <Text style={[{ fontSize: 13, color: colors.icon, marginBottom: 16 }]}>
              Current: {statusOrderCurrent.replace(/_/g, ' ')}
            </Text>
            <View style={{ gap: 8 }}>
              {(STATUS_TRANSITIONS[statusOrderCurrent] || []).map((nextStatus: string) => (
                <TouchableOpacity
                  key={nextStatus}
                  style={[
                    styles.statusOption,
                    { backgroundColor: `${getStatusColor(nextStatus)}15`, borderColor: getStatusColor(nextStatus) },
                  ]}
                  onPress={() => handleStatusSelect(nextStatus)}
                >
                  <View style={[styles.statusDot, { backgroundColor: getStatusColor(nextStatus) }]} />
                  <Text style={[styles.statusOptionText, { color: colors.text }]}>
                    {nextStatus.replace(/_/g, ' ')}
                  </Text>
                  <Ionicons name="chevron-forward" size={18} color={colors.icon} />
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={[styles.closeButton, { backgroundColor: colors.border, marginTop: 16 }]}
              onPress={() => {
                setShowStatusModal(false);
                setStatusOrderId(null);
              }}
            >
              <Text style={[styles.closeButtonText, { color: colors.text }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Reason Modal (Refund / Cancel) */}
      <Modal visible={showReasonModal} transparent animationType="slide">
        <View style={styles.reasonModalOverlay}>
          <View style={[styles.reasonModalContent, { backgroundColor: colors.card }]}>
            <View style={styles.reasonModalHeader}>
              <Ionicons
                name="warning"
                size={24}
                color={reasonAction === 'refund' ? colors.error : colors.warning}
              />
              <Text style={[styles.reasonModalTitle, { color: colors.text }]}>
                {reasonAction === 'refund' ? 'Refund Order' : 'Cancel Order'}
              </Text>
            </View>
            <TextInput
              style={[styles.reasonInput, { color: colors.text, borderColor: colors.border }]}
              placeholder={
                reasonAction === 'refund'
                  ? 'Enter refund reason...'
                  : 'Enter cancellation reason...'
              }
              placeholderTextColor={colors.icon}
              value={reasonText}
              onChangeText={setReasonText}
              multiline
              numberOfLines={3}
            />
            <View style={styles.reasonModalButtons}>
              <TouchableOpacity
                style={[styles.reasonModalButton, { backgroundColor: colors.border }]}
                onPress={() => {
                  setShowReasonModal(false);
                  setReasonText('');
                  setReasonOrderId(null);
                }}
              >
                <Text style={[styles.reasonModalButtonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.reasonModalButton,
                  { backgroundColor: reasonAction === 'refund' ? colors.error : colors.warning },
                ]}
                onPress={handleReasonConfirm}
              >
                <Text style={[styles.reasonModalButtonText, { color: '#FFFFFF' }]}>
                  {reasonAction === 'refund' ? 'Refund' : 'Cancel Order'}
                </Text>
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
    flexWrap: 'wrap',
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
  orderCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: '600',
  },
  storeName: {
    fontSize: 13,
    marginTop: 2,
  },
  productNames: {
    fontSize: 12,
    marginTop: 2,
    fontStyle: 'italic',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  orderDetails: {
    marginTop: 12,
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 13,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  totalLabel: {
    fontSize: 12,
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 2,
  },
  paymentInfo: {
    alignItems: 'flex-end',
  },
  paymentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: 4,
  },
  paymentStatusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  deliveryType: {
    fontSize: 11,
    textTransform: 'capitalize',
  },
  feeBreakdown: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  feeLabel: {
    fontSize: 12,
  },
  feeValue: {
    fontSize: 12,
    fontWeight: '600',
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
  actionButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
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
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalBody: {
    maxHeight: 400,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  itemName: {
    fontSize: 14,
    flex: 1,
  },
  itemPrice: {
    fontSize: 14,
  },
  totalSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  totalValue: {
    fontSize: 14,
  },
  totalLabelBold: {
    fontSize: 16,
    fontWeight: '600',
  },
  totalValueBold: {
    fontSize: 16,
    fontWeight: '700',
  },
  closeButton: {
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  reasonModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  reasonModalContent: {
    borderRadius: 16,
    padding: 20,
  },
  reasonModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  reasonModalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  reasonInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  reasonModalButtons: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 12,
  },
  reasonModalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  reasonModalButtonText: {
    fontWeight: '600',
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusOptionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
});
