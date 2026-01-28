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
import { usersService, User, UserWallet } from '../../services/api/users';
import { Colors } from '../../constants/Colors';
import { format } from 'date-fns';
import { showAlert, showConfirm } from '../../utils/alert';

type RoleFilter = 'all' | 'user' | 'merchant' | 'admin';
type StatusFilter = 'all' | 'active' | 'suspended';

export default function UsersScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [users, setUsers] = useState<User[]>([]);
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [processingUser, setProcessingUser] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Detail modal
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userWallet, setUserWallet] = useState<UserWallet | null>(null);
  const [loadingWallet, setLoadingWallet] = useState(false);

  useEffect(() => {
    loadData();
  }, [roleFilter, statusFilter, searchQuery]);

  const loadData = async (pageNum: number = 1, append: boolean = false) => {
    try {
      setError(null);
      const data = await usersService.getUsers({
        page: pageNum,
        limit: 20,
        role: roleFilter === 'all' ? undefined : roleFilter,
        status: statusFilter === 'all' ? undefined : statusFilter,
        search: searchQuery || undefined,
      });

      if (append) {
        setUsers(prev => [...prev, ...data.users]);
      } else {
        setUsers(data.users);
      }

      setHasMore(data.pagination.page < data.pagination.totalPages);
      setPage(pageNum);
    } catch (err: any) {
      console.error('Failed to load users:', err);
      setError(err.message || 'Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData(1);
    setRefreshing(false);
  }, [roleFilter, statusFilter, searchQuery]);

  const loadMore = () => {
    if (!isLoading && hasMore) {
      loadData(page + 1, true);
    }
  };

  const handleViewDetails = async (user: User) => {
    setSelectedUser(user);
    setShowDetailModal(true);
    setLoadingWallet(true);
    setUserWallet(null);

    try {
      const wallet = await usersService.getUserWallet(user._id);
      setUserWallet(wallet);
    } catch (err: any) {
      console.error('Failed to load wallet:', err);
    } finally {
      setLoadingWallet(false);
    }
  };

  const handleSuspend = (userId: string) => {
    showConfirm(
      'Suspend User',
      'Are you sure you want to suspend this user? They will not be able to access the platform.',
      async () => {
        try {
          setProcessingUser(userId);
          await usersService.suspendUser(userId);
          showAlert('Success', 'User suspended successfully');
          await loadData(1);
        } catch (err: any) {
          showAlert('Error', err.message);
        } finally {
          setProcessingUser(null);
        }
      },
      'Suspend'
    );
  };

  const handleUnsuspend = (userId: string) => {
    showConfirm(
      'Unsuspend User',
      'Are you sure you want to unsuspend this user? They will regain access to the platform.',
      async () => {
        try {
          setProcessingUser(userId);
          await usersService.unsuspendUser(userId);
          showAlert('Success', 'User unsuspended successfully');
          await loadData(1);
        } catch (err: any) {
          showAlert('Error', err.message);
        } finally {
          setProcessingUser(null);
        }
      },
      'Unsuspend'
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return colors.success;
      case 'suspended': return colors.error;
      default: return colors.icon;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return colors.error;
      case 'merchant': return colors.info;
      case 'user': return colors.success;
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

  const getUserDisplayName = (user: User) => {
    if (user.profile?.firstName || user.profile?.lastName) {
      return `${user.profile.firstName || ''} ${user.profile.lastName || ''}`.trim();
    }
    return user.phoneNumber;
  };

  const renderFilters = () => (
    <View style={styles.filtersContainer}>
      <View style={[styles.searchContainer, { backgroundColor: colors.card }]}>
        <Ionicons name="search" size={20} color={colors.icon} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search by name, email, or phone..."
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

      <Text style={[styles.filterLabel, { color: colors.icon }]}>Role</Text>
      <View style={styles.statusFilters}>
        {(['all', 'user', 'merchant', 'admin'] as RoleFilter[]).map(role => (
          <TouchableOpacity
            key={role}
            style={[
              styles.filterChip,
              { backgroundColor: roleFilter === role ? colors.tint : colors.card },
            ]}
            onPress={() => {
              setRoleFilter(role);
              setIsLoading(true);
            }}
          >
            <Text
              style={[
                styles.filterChipText,
                { color: roleFilter === role ? '#FFFFFF' : colors.text },
              ]}
            >
              {role.charAt(0).toUpperCase() + role.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[styles.filterLabel, { color: colors.icon, marginTop: 8 }]}>Status</Text>
      <View style={styles.statusFilters}>
        {(['all', 'active', 'suspended'] as StatusFilter[]).map(status => (
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

  const renderUserItem = ({ item }: { item: User }) => (
    <View style={[styles.userCard, { backgroundColor: colors.card }]}>
      <View style={styles.userHeader}>
        <View style={styles.userAvatar}>
          <Ionicons name="person" size={24} color={colors.tint} />
        </View>
        <View style={styles.userInfo}>
          <Text style={[styles.userName, { color: colors.text }]}>
            {getUserDisplayName(item)}
          </Text>
          <View style={styles.badgeRow}>
            <View style={[styles.roleBadge, { backgroundColor: `${getRoleColor(item.role)}20` }]}>
              <Text style={[styles.roleBadgeText, { color: getRoleColor(item.role) }]}>
                {item.role}
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(item.status)}20` }]}>
              <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                {item.status}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.userDetails}>
        {item.email && (
          <View style={styles.detailRow}>
            <Ionicons name="mail-outline" size={16} color={colors.icon} />
            <Text style={[styles.detailText, { color: colors.icon }]}>{item.email}</Text>
          </View>
        )}
        <View style={styles.detailRow}>
          <Ionicons name="call-outline" size={16} color={colors.icon} />
          <Text style={[styles.detailText, { color: colors.icon }]}>{item.phoneNumber}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="calendar-outline" size={16} color={colors.icon} />
          <Text style={[styles.detailText, { color: colors.icon }]}>
            Joined {format(new Date(item.createdAt), 'MMM d, yyyy')}
          </Text>
        </View>
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.info }]}
          onPress={() => handleViewDetails(item)}
        >
          <Ionicons name="eye" size={18} color="#FFFFFF" />
          <Text style={styles.actionButtonText}>View Details</Text>
        </TouchableOpacity>
        {item.status === 'active' ? (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#6B7280' }]}
            onPress={() => handleSuspend(item._id)}
            disabled={processingUser === item._id}
          >
            {processingUser === item._id ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="ban" size={18} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Suspend</Text>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.success }]}
            onPress={() => handleUnsuspend(item._id)}
            disabled={processingUser === item._id}
          >
            {processingUser === item._id ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Unsuspend</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderDetailModal = () => (
    <Modal visible={showDetailModal} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>User Details</Text>
            <TouchableOpacity onPress={() => setShowDetailModal(false)}>
              <Ionicons name="close" size={24} color={colors.icon} />
            </TouchableOpacity>
          </View>

          {selectedUser && (
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* User Info Section */}
              <View style={styles.modalSection}>
                <View style={styles.modalUserHeader}>
                  <View style={[styles.modalAvatar, { backgroundColor: '#FEE2E2' }]}>
                    <Ionicons name="person" size={32} color={colors.tint} />
                  </View>
                  <View style={styles.modalUserInfo}>
                    <Text style={[styles.modalUserName, { color: colors.text }]}>
                      {getUserDisplayName(selectedUser)}
                    </Text>
                    <View style={styles.badgeRow}>
                      <View style={[styles.roleBadge, { backgroundColor: `${getRoleColor(selectedUser.role)}20` }]}>
                        <Text style={[styles.roleBadgeText, { color: getRoleColor(selectedUser.role) }]}>
                          {selectedUser.role}
                        </Text>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(selectedUser.status)}20` }]}>
                        <Text style={[styles.statusText, { color: getStatusColor(selectedUser.status) }]}>
                          {selectedUser.status}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                <View style={[styles.infoCard, { backgroundColor: colors.background }]}>
                  {selectedUser.email && (
                    <View style={styles.infoRow}>
                      <Ionicons name="mail-outline" size={18} color={colors.icon} />
                      <View style={styles.infoContent}>
                        <Text style={[styles.infoLabel, { color: colors.icon }]}>Email</Text>
                        <Text style={[styles.infoValue, { color: colors.text }]}>{selectedUser.email}</Text>
                      </View>
                    </View>
                  )}
                  <View style={styles.infoRow}>
                    <Ionicons name="call-outline" size={18} color={colors.icon} />
                    <View style={styles.infoContent}>
                      <Text style={[styles.infoLabel, { color: colors.icon }]}>Phone</Text>
                      <Text style={[styles.infoValue, { color: colors.text }]}>{selectedUser.phoneNumber}</Text>
                    </View>
                  </View>
                  <View style={styles.infoRow}>
                    <Ionicons name="calendar-outline" size={18} color={colors.icon} />
                    <View style={styles.infoContent}>
                      <Text style={[styles.infoLabel, { color: colors.icon }]}>Joined</Text>
                      <Text style={[styles.infoValue, { color: colors.text }]}>
                        {format(new Date(selectedUser.createdAt), 'MMMM d, yyyy')}
                      </Text>
                    </View>
                  </View>
                  {selectedUser.lastLogin && (
                    <View style={styles.infoRow}>
                      <Ionicons name="time-outline" size={18} color={colors.icon} />
                      <View style={styles.infoContent}>
                        <Text style={[styles.infoLabel, { color: colors.icon }]}>Last Login</Text>
                        <Text style={[styles.infoValue, { color: colors.text }]}>
                          {format(new Date(selectedUser.lastLogin), 'MMM d, yyyy h:mm a')}
                        </Text>
                      </View>
                    </View>
                  )}
                  <View style={styles.infoRow}>
                    <Ionicons name="shield-checkmark-outline" size={18} color={colors.icon} />
                    <View style={styles.infoContent}>
                      <Text style={[styles.infoLabel, { color: colors.icon }]}>Verified</Text>
                      <Text style={[styles.infoValue, { color: selectedUser.isVerified ? colors.success : colors.warning }]}>
                        {selectedUser.isVerified ? 'Yes' : 'No'}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Wallet Section */}
              <View style={styles.modalSection}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Wallet Balance</Text>
                {loadingWallet ? (
                  <View style={styles.walletLoading}>
                    <ActivityIndicator size="small" color={colors.tint} />
                    <Text style={[styles.walletLoadingText, { color: colors.icon }]}>Loading wallet...</Text>
                  </View>
                ) : userWallet ? (
                  <View style={[styles.walletCard, { backgroundColor: colors.tint }]}>
                    <View style={styles.walletIcon}>
                      <Ionicons name="wallet" size={28} color="#FFFFFF" />
                    </View>
                    <View style={styles.walletInfo}>
                      <Text style={styles.walletLabel}>Available Balance</Text>
                      <Text style={styles.walletBalance}>{formatCurrency(userWallet.balance)}</Text>
                    </View>
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
  );

  if (isLoading && users.length === 0) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  if (error && users.length === 0) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
        <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: colors.tint }]}
          onPress={() => {
            setIsLoading(true);
            loadData(1);
          }}
        >
          <Ionicons name="refresh" size={18} color="#FFFFFF" />
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {renderFilters()}

      <FlatList
        data={users}
        renderItem={renderUserItem}
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
            <Ionicons name="people-outline" size={48} color={colors.icon} />
            <Text style={[styles.emptyText, { color: colors.icon }]}>
              No users found
            </Text>
          </View>
        }
      />

      {renderDetailModal()}
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    textAlign: 'center',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
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
  filterLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 6,
    marginLeft: 4,
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
  userCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
  },
  badgeRow: {
    flexDirection: 'row',
    marginTop: 6,
    gap: 6,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  userDetails: {
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
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '85%',
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
    maxHeight: 450,
  },
  modalSection: {
    marginBottom: 20,
  },
  modalUserHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalUserInfo: {
    flex: 1,
    marginLeft: 16,
  },
  modalUserName: {
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
