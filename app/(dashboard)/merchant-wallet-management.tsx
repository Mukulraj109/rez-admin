import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '../../services/api/apiClient';
import { Colors } from '../../constants/Colors';
import { showAlert, showConfirm } from '../../utils/alert';

// ============================================
// TYPES
// ============================================

interface MerchantWalletUser {
  _id: string;
  profile?: { firstName?: string; lastName?: string };
  phoneNumber?: string;
  email?: string;
}

interface MerchantWalletStore {
  _id: string;
  name?: string;
  logo?: string;
  address?: any;
}

interface MerchantWalletBalance {
  available: number;
  pending: number;
  settled: number;
  totalEarned: number;
}

interface MerchantWallet {
  _id: string;
  merchant: MerchantWalletUser | string;
  store: MerchantWalletStore | string;
  balance: MerchantWalletBalance;
  bankDetails?: {
    accountName?: string;
    accountNumber?: string;
    bankName?: string;
    ifscCode?: string;
    verified?: boolean;
  };
  statistics?: {
    totalSales?: number;
    totalWithdrawals?: number;
    totalTransactions?: number;
  };
  status?: string;
  isFrozen?: boolean;
  createdAt: string;
}

interface WalletTransaction {
  _id: string;
  type: string;
  amount: number;
  status: string;
  description?: string;
  reference?: string;
  createdAt: string;
}

interface PlatformStats {
  totalWallets?: number;
  totalAvailable?: number;
  totalPending?: number;
  totalSettled?: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

type TabType = 'wallets' | 'pending-withdrawals';

// ============================================
// CONSTANTS
// ============================================

const TX_TYPE_COLORS: Record<string, { bg: string; text: string; icon: string }> = {
  credit: { bg: '#D1FAE5', text: '#065F46', icon: 'arrow-down-circle-outline' },
  debit: { bg: '#FEE2E2', text: '#991B1B', icon: 'arrow-up-circle-outline' },
  withdrawal: { bg: '#DBEAFE', text: '#1E40AF', icon: 'wallet-outline' },
  refund: { bg: '#FEF3C7', text: '#92400E', icon: 'return-down-back-outline' },
  adjustment: { bg: '#F3F4F6', text: '#6B7280', icon: 'build-outline' },
};

const TX_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  completed: { bg: '#D1FAE5', text: '#065F46' },
  pending: { bg: '#FEF3C7', text: '#92400E' },
  failed: { bg: '#FEE2E2', text: '#991B1B' },
  cancelled: { bg: '#F3F4F6', text: '#6B7280' },
};

// ============================================
// HELPERS
// ============================================

function formatCurrency(amount: number): string {
  return '\u20B9' + (amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(dateStr: string): string {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getMerchantName(merchant: MerchantWalletUser | string): string {
  if (typeof merchant === 'string') return 'Merchant';
  const p = merchant.profile;
  if (p?.firstName || p?.lastName) return `${p.firstName || ''} ${p.lastName || ''}`.trim();
  return merchant.phoneNumber || merchant.email || 'Merchant';
}

function getStoreName(store: MerchantWalletStore | string): string {
  if (typeof store === 'string') return 'Store';
  return store.name || 'Unnamed Store';
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function MerchantWalletManagementPage() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  // Tab
  const [activeTab, setActiveTab] = useState<TabType>('wallets');

  // Stats
  const [platformStats, setPlatformStats] = useState<PlatformStats | null>(null);

  // Wallets list
  const [wallets, setWallets] = useState<MerchantWallet[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Pending withdrawals
  const [pendingWithdrawals, setPendingWithdrawals] = useState<any[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);

  // Detail modal
  const [selectedWallet, setSelectedWallet] = useState<MerchantWallet | null>(null);
  const [walletTransactions, setWalletTransactions] = useState<WalletTransaction[]>([]);
  const [txPage, setTxPage] = useState(1);
  const [txHasMore, setTxHasMore] = useState(false);
  const [txLoading, setTxLoading] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ============================================
  // FETCH
  // ============================================

  const fetchStats = useCallback(async () => {
    const res = await apiClient.get<PlatformStats>('admin/merchant-wallets/stats');
    if (res.success && res.data) {
      setPlatformStats(res.data);
    }
  }, []);

  const fetchWallets = useCallback(async (page: number = 1, append: boolean = false) => {
    if (page === 1 && !append) setIsLoading(true);

    const params = new URLSearchParams({
      page: page.toString(),
      limit: '20',
      sortBy: 'statistics.totalSales',
      sortOrder: 'desc',
    });

    const res = await apiClient.get<{ wallets: MerchantWallet[]; pagination: Pagination }>(
      `admin/merchant-wallets?${params}`
    );

    if (res.success && res.data) {
      const filtered = searchQuery
        ? res.data.wallets.filter(w => {
            const name = getMerchantName(w.merchant).toLowerCase();
            const store = getStoreName(w.store).toLowerCase();
            const q = searchQuery.toLowerCase();
            return name.includes(q) || store.includes(q);
          })
        : res.data.wallets;

      if (append) {
        setWallets(prev => [...prev, ...filtered]);
      } else {
        setWallets(filtered);
      }
      setPagination(res.data.pagination);
    }

    setIsLoading(false);
    setIsLoadingMore(false);
    setIsRefreshing(false);
  }, [searchQuery]);

  const fetchPendingWithdrawals = useCallback(async () => {
    setPendingLoading(true);
    const res = await apiClient.get<any[]>('admin/merchant-wallets/pending-withdrawals');
    if (res.success && res.data) {
      setPendingWithdrawals(Array.isArray(res.data) ? res.data : []);
    }
    setPendingLoading(false);
  }, []);

  const fetchWalletTransactions = useCallback(async (merchantId: string, page: number = 1, append: boolean = false) => {
    setTxLoading(true);
    const params = new URLSearchParams({ page: page.toString(), limit: '20' });
    const res = await apiClient.get<{ transactions?: WalletTransaction[]; pagination?: Pagination }>(
      `admin/merchant-wallets/${merchantId}/transactions?${params}`
    );
    if (res.success && res.data) {
      const txs = Array.isArray(res.data) ? res.data : (res.data.transactions || []);
      if (append) {
        setWalletTransactions(prev => [...prev, ...txs]);
      } else {
        setWalletTransactions(txs);
      }
      setTxPage(page);
      setTxHasMore(res.data.pagination ? page < res.data.pagination.totalPages : txs.length === 20);
    }
    setTxLoading(false);
  }, []);

  useEffect(() => {
    fetchStats();
    fetchWallets(1);
  }, []);

  useEffect(() => {
    if (activeTab === 'pending-withdrawals') {
      fetchPendingWithdrawals();
    }
  }, [activeTab]);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchWallets(1), 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchQuery]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchStats();
    if (activeTab === 'wallets') {
      fetchWallets(1);
    } else {
      fetchPendingWithdrawals().then(() => setIsRefreshing(false));
    }
  }, [activeTab, fetchStats, fetchWallets, fetchPendingWithdrawals]);

  const handleLoadMore = useCallback(() => {
    if (isLoadingMore || !pagination || pagination.page >= pagination.totalPages) return;
    setIsLoadingMore(true);
    fetchWallets(pagination.page + 1, true);
  }, [isLoadingMore, pagination, fetchWallets]);

  // ============================================
  // ACTIONS
  // ============================================

  const openWalletDetail = (wallet: MerchantWallet) => {
    setSelectedWallet(wallet);
    setWalletTransactions([]);
    setShowDetailModal(true);
    const merchantId = typeof wallet.merchant === 'string' ? wallet.merchant : wallet.merchant._id;
    fetchWalletTransactions(merchantId);
  };

  const handleVerifyBank = async (wallet: MerchantWallet) => {
    const merchantId = typeof wallet.merchant === 'string' ? wallet.merchant : wallet.merchant._id;
    showConfirm(
      'Verify Bank Details',
      `Verify bank details for ${getMerchantName(wallet.merchant)}?`,
      async () => {
        const res = await apiClient.post(`admin/merchant-wallets/${merchantId}/verify-bank`);
        if (res.success) {
          showAlert('Success', 'Bank details verified.');
          fetchWallets(1);
        } else {
          showAlert('Error', res.message || 'Failed to verify bank details.');
        }
      }
    );
  };

  // ============================================
  // RENDER: STATS
  // ============================================

  const renderStats = () => {
    if (!platformStats) return null;

    const cards = [
      { label: 'Available', value: formatCurrency(platformStats.totalAvailable || 0), icon: 'wallet-outline' as const, color: colors.success },
      { label: 'Pending', value: formatCurrency(platformStats.totalPending || 0), icon: 'time-outline' as const, color: colors.warning },
      { label: 'Settled', value: formatCurrency(platformStats.totalSettled || 0), icon: 'checkmark-circle-outline' as const, color: colors.info },
      { label: 'Total Wallets', value: (platformStats.totalWallets || 0).toString(), icon: 'people-outline' as const, color: colors.purple },
    ];

    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsScroll} contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}>
        {cards.map((c, i) => (
          <View key={i} style={[styles.miniStatCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name={c.icon} size={20} color={c.color} />
            <Text style={[styles.miniStatValue, { color: colors.text }]}>{c.value}</Text>
            <Text style={[styles.miniStatLabel, { color: colors.secondaryText }]}>{c.label}</Text>
          </View>
        ))}
      </ScrollView>
    );
  };

  // ============================================
  // RENDER: WALLET CARD
  // ============================================

  const renderWalletCard = useCallback(({ item }: { item: MerchantWallet }) => {
    const merchantName = getMerchantName(item.merchant);
    const storeName = getStoreName(item.store);

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => openWalletDetail(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.merchantName, { color: colors.text }]}>{merchantName}</Text>
            <Text style={[styles.storeName, { color: colors.secondaryText }]}>{storeName}</Text>
          </View>
          {item.bankDetails?.verified ? (
            <View style={[styles.verifiedBadge, { backgroundColor: '#D1FAE5' }]}>
              <Ionicons name="shield-checkmark" size={12} color="#065F46" />
              <Text style={{ color: '#065F46', fontSize: 10, fontWeight: '700' }}>Verified</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.verifyBtn, { borderColor: colors.warning }]}
              onPress={() => handleVerifyBank(item)}
            >
              <Text style={{ color: colors.warning, fontSize: 11, fontWeight: '600' }}>Verify Bank</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Balance row */}
        <View style={styles.balanceRow}>
          <View style={styles.balanceItem}>
            <Text style={[styles.balanceLabel, { color: colors.secondaryText }]}>Available</Text>
            <Text style={[styles.balanceValue, { color: colors.success }]}>
              {formatCurrency(item.balance.available)}
            </Text>
          </View>
          <View style={styles.balanceDivider} />
          <View style={styles.balanceItem}>
            <Text style={[styles.balanceLabel, { color: colors.secondaryText }]}>Pending</Text>
            <Text style={[styles.balanceValue, { color: colors.warning }]}>
              {formatCurrency(item.balance.pending)}
            </Text>
          </View>
          <View style={styles.balanceDivider} />
          <View style={styles.balanceItem}>
            <Text style={[styles.balanceLabel, { color: colors.secondaryText }]}>Settled</Text>
            <Text style={[styles.balanceValue, { color: colors.info }]}>
              {formatCurrency(item.balance.settled)}
            </Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <Text style={[styles.totalSales, { color: colors.secondaryText }]}>
            Total Sales: {formatCurrency(item.statistics?.totalSales || 0)}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={colors.secondaryText} />
        </View>
      </TouchableOpacity>
    );
  }, [colors]);

  // ============================================
  // RENDER: DETAIL MODAL
  // ============================================

  const renderDetailModal = () => {
    if (!selectedWallet) return null;

    const merchantName = getMerchantName(selectedWallet.merchant);
    const merchantId = typeof selectedWallet.merchant === 'string' ? selectedWallet.merchant : selectedWallet.merchant._id;

    return (
      <Modal visible={showDetailModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          {/* Header */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowDetailModal(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{merchantName}</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
            {/* Balance cards */}
            <View style={styles.detailBalances}>
              {[
                { label: 'Available', value: selectedWallet.balance.available, color: colors.success },
                { label: 'Pending', value: selectedWallet.balance.pending, color: colors.warning },
                { label: 'Settled', value: selectedWallet.balance.settled, color: colors.info },
                { label: 'Total Earned', value: selectedWallet.balance.totalEarned, color: colors.purple },
              ].map((b, i) => (
                <View key={i} style={[styles.detailBalanceCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.detailBalanceLabel, { color: colors.secondaryText }]}>{b.label}</Text>
                  <Text style={[styles.detailBalanceValue, { color: b.color }]}>
                    {formatCurrency(b.value)}
                  </Text>
                </View>
              ))}
            </View>

            {/* Bank Details */}
            {selectedWallet.bankDetails && (
              <View style={[styles.section, { marginHorizontal: 16 }]}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Bank Details</Text>
                <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  {selectedWallet.bankDetails.bankName && (
                    <View style={styles.infoRow}>
                      <Text style={[styles.infoLabel, { color: colors.secondaryText }]}>Bank</Text>
                      <Text style={[styles.infoValue, { color: colors.text }]}>{selectedWallet.bankDetails.bankName}</Text>
                    </View>
                  )}
                  {selectedWallet.bankDetails.accountName && (
                    <View style={styles.infoRow}>
                      <Text style={[styles.infoLabel, { color: colors.secondaryText }]}>Account Name</Text>
                      <Text style={[styles.infoValue, { color: colors.text }]}>{selectedWallet.bankDetails.accountName}</Text>
                    </View>
                  )}
                  {selectedWallet.bankDetails.accountNumber && (
                    <View style={styles.infoRow}>
                      <Text style={[styles.infoLabel, { color: colors.secondaryText }]}>Account No.</Text>
                      <Text style={[styles.infoValue, { color: colors.text }]}>****{selectedWallet.bankDetails.accountNumber.slice(-4)}</Text>
                    </View>
                  )}
                  {selectedWallet.bankDetails.ifscCode && (
                    <View style={styles.infoRow}>
                      <Text style={[styles.infoLabel, { color: colors.secondaryText }]}>IFSC</Text>
                      <Text style={[styles.infoValue, { color: colors.text }]}>{selectedWallet.bankDetails.ifscCode}</Text>
                    </View>
                  )}
                  <View style={styles.infoRow}>
                    <Text style={[styles.infoLabel, { color: colors.secondaryText }]}>Verified</Text>
                    <Text style={[styles.infoValue, { color: selectedWallet.bankDetails.verified ? colors.success : colors.error }]}>
                      {selectedWallet.bankDetails.verified ? 'Yes' : 'No'}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Transaction History */}
            <View style={[styles.section, { marginHorizontal: 16 }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Transaction History</Text>
              {txLoading && walletTransactions.length === 0 ? (
                <ActivityIndicator size="small" color={colors.tint} style={{ paddingVertical: 20 }} />
              ) : walletTransactions.length === 0 ? (
                <Text style={[styles.noTxText, { color: colors.secondaryText }]}>No transactions found.</Text>
              ) : (
                <>
                  {walletTransactions.map(tx => {
                    const typeStyle = TX_TYPE_COLORS[tx.type] || TX_TYPE_COLORS.credit;
                    const statusStyle = TX_STATUS_COLORS[tx.status] || TX_STATUS_COLORS.pending;

                    return (
                      <View key={tx._id} style={[styles.txCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={[styles.txIcon, { backgroundColor: typeStyle.bg }]}>
                          <Ionicons name={typeStyle.icon as any} size={18} color={typeStyle.text} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={styles.txTopRow}>
                            <Text style={[styles.txType, { color: colors.text }]}>
                              {tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}
                            </Text>
                            <Text style={[styles.txAmount, { color: tx.type === 'credit' ? colors.success : colors.error }]}>
                              {tx.type === 'credit' ? '+' : '-'}{formatCurrency(tx.amount)}
                            </Text>
                          </View>
                          <View style={styles.txBottomRow}>
                            <Text style={[styles.txDate, { color: colors.secondaryText }]}>
                              {formatDate(tx.createdAt)}
                            </Text>
                            <View style={[styles.txStatusBadge, { backgroundColor: statusStyle.bg }]}>
                              <Text style={[styles.txStatusText, { color: statusStyle.text }]}>
                                {tx.status}
                              </Text>
                            </View>
                          </View>
                          {tx.description && (
                            <Text style={[styles.txDesc, { color: colors.secondaryText }]} numberOfLines={1}>
                              {tx.description}
                            </Text>
                          )}
                        </View>
                      </View>
                    );
                  })}

                  {txHasMore && (
                    <TouchableOpacity
                      style={[styles.loadMoreBtn, { borderColor: colors.border }]}
                      onPress={() => fetchWalletTransactions(merchantId, txPage + 1, true)}
                      disabled={txLoading}
                    >
                      {txLoading ? (
                        <ActivityIndicator size="small" color={colors.tint} />
                      ) : (
                        <Text style={[styles.loadMoreText, { color: colors.tint }]}>Load More</Text>
                      )}
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    );
  };

  // ============================================
  // RENDER: PENDING WITHDRAWALS
  // ============================================

  const renderPendingTab = () => {
    if (pendingLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      );
    }

    if (pendingWithdrawals.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.backgroundSecondary }]}>
            <Ionicons name="checkmark-circle-outline" size={36} color={colors.success} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No Pending Withdrawals</Text>
          <Text style={[styles.emptySubtitle, { color: colors.secondaryText }]}>
            All withdrawal requests have been processed.
          </Text>
        </View>
      );
    }

    return (
      <FlatList
        data={pendingWithdrawals}
        keyExtractor={(_, i) => i.toString()}
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={[styles.merchantName, { color: colors.text }]}>
                  {getMerchantName(item.merchantId)}
                </Text>
                <Text style={[styles.storeName, { color: colors.secondaryText }]}>
                  {getStoreName(item.store)}
                </Text>
              </View>
              <Text style={[styles.pendingAmount, { color: colors.warning }]}>
                {formatCurrency(item.pendingAmount)}
              </Text>
            </View>
            {item.pendingTransactions?.length > 0 && (
              <Text style={[styles.pendingCount, { color: colors.secondaryText }]}>
                {item.pendingTransactions.length} pending request{item.pendingTransactions.length !== 1 ? 's' : ''}
              </Text>
            )}
          </View>
        )}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.tint} colors={[colors.tint]} />
        }
        contentContainerStyle={[styles.listContent, pendingWithdrawals.length === 0 && { flexGrow: 1 }]}
      />
    );
  };

  // ============================================
  // MAIN
  // ============================================

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.pageHeader, { borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.pageTitle, { color: colors.text }]}>Merchant Wallets</Text>
          <Text style={[styles.pageSubtitle, { color: colors.secondaryText }]}>
            Manage merchant wallet balances and withdrawals
          </Text>
        </View>
      </View>

      {/* Stats */}
      {renderStats()}

      {/* Tabs */}
      <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
        {([
          { key: 'wallets' as TabType, label: 'All Wallets' },
          { key: 'pending-withdrawals' as TabType, label: 'Pending Withdrawals' },
        ]).map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && { borderBottomColor: colors.tint, borderBottomWidth: 2 }]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[
              styles.tabText,
              { color: colors.secondaryText },
              activeTab === tab.key && { color: colors.tint, fontWeight: '700' },
            ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Search (wallets tab only) */}
      {activeTab === 'wallets' && (
        <View style={{ paddingHorizontal: 16, paddingTop: 10 }}>
          <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="search-outline" size={18} color={colors.secondaryText} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search merchant or store..."
              placeholderTextColor={colors.secondaryText}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color={colors.secondaryText} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Content */}
      {activeTab === 'wallets' ? (
        isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.tint} />
          </View>
        ) : (
          <FlatList
            data={wallets}
            keyExtractor={(item) => item._id}
            renderItem={renderWalletCard}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <View style={[styles.emptyIcon, { backgroundColor: colors.backgroundSecondary }]}>
                  <Ionicons name="wallet-outline" size={36} color={colors.tint} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No Wallets Found</Text>
                <Text style={[styles.emptySubtitle, { color: colors.secondaryText }]}>
                  {searchQuery ? 'No wallets match your search.' : 'No merchant wallets yet.'}
                </Text>
              </View>
            }
            ListFooterComponent={
              isLoadingMore ? (
                <View style={styles.footerLoader}>
                  <ActivityIndicator size="small" color={colors.tint} />
                </View>
              ) : null
            }
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.3}
            refreshControl={
              <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.tint} colors={[colors.tint]} />
            }
            contentContainerStyle={[styles.listContent, wallets.length === 0 && { flexGrow: 1 }]}
          />
        )
      ) : (
        renderPendingTab()
      )}

      {renderDetailModal()}
    </SafeAreaView>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: { flex: 1 },
  pageHeader: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  pageTitle: { fontSize: 22, fontWeight: '700' },
  pageSubtitle: { fontSize: 13, marginTop: 2 },

  // Tabs
  tabBar: { flexDirection: 'row', borderBottomWidth: 1 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabText: { fontSize: 13, fontWeight: '600' },

  // Stats scroll
  statsScroll: { paddingVertical: 12, maxHeight: 110 },
  miniStatCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    minWidth: 130,
    alignItems: 'center',
    gap: 4,
  },
  miniStatValue: { fontSize: 16, fontWeight: '700' },
  miniStatLabel: { fontSize: 11 },

  // Search
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 0 },

  // Card
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  merchantName: { fontSize: 15, fontWeight: '600' },
  storeName: { fontSize: 12, marginTop: 2 },

  // Balance
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  balanceItem: { flex: 1, alignItems: 'center' },
  balanceLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', marginBottom: 4 },
  balanceValue: { fontSize: 14, fontWeight: '700' },
  balanceDivider: { width: 1, height: 30, backgroundColor: '#E5E7EB' },

  // Card footer
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 10,
  },
  totalSales: { fontSize: 12 },

  // Verified badge
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  verifyBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },

  // Pending
  pendingAmount: { fontSize: 16, fontWeight: '700' },
  pendingCount: { fontSize: 12, marginTop: 4 },

  // List
  listContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 60 },

  // Loading / Empty
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40, paddingBottom: 40 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 17, fontWeight: '700', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  footerLoader: { paddingVertical: 16, alignItems: 'center' },

  // Modal
  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 17, fontWeight: '700' },

  // Detail
  detailBalances: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    padding: 16,
  },
  detailBalanceCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    flexBasis: '47%',
    flexGrow: 1,
  },
  detailBalanceLabel: { fontSize: 11, fontWeight: '600', marginBottom: 4 },
  detailBalanceValue: { fontSize: 18, fontWeight: '700' },

  // Section
  section: { marginTop: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 10 },

  // Info card
  infoCard: { borderRadius: 12, borderWidth: 1, padding: 14 },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  infoLabel: { fontSize: 13 },
  infoValue: { fontSize: 13, fontWeight: '600' },
  noTxText: { fontSize: 14, textAlign: 'center', paddingVertical: 20 },

  // Transaction card
  txCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
  },
  txIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  txTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  txType: { fontSize: 14, fontWeight: '600' },
  txAmount: { fontSize: 14, fontWeight: '700' },
  txBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  txDate: { fontSize: 11 },
  txStatusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  txStatusText: { fontSize: 9, fontWeight: '700' },
  txDesc: { fontSize: 11, marginTop: 4 },

  // Load more
  loadMoreBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 4,
  },
  loadMoreText: { fontSize: 14, fontWeight: '600' },
});
