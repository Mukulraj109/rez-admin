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
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { loyaltyService, LoyaltyUser, LoyaltyStats } from '../../services/api/loyalty';
import { Colors } from '../../constants/Colors';
import { showAlert, showConfirm } from '../../utils/alert';

const CATEGORIES = [
  { slug: '', label: 'All' },
  { slug: 'food-dining', label: 'Food & Dining' },
  { slug: 'beauty-wellness', label: 'Beauty' },
  { slug: 'grocery-essentials', label: 'Grocery' },
  { slug: 'fitness-sports', label: 'Fitness' },
  { slug: 'healthcare', label: 'Healthcare' },
  { slug: 'fashion', label: 'Fashion' },
  { slug: 'education-learning', label: 'Education' },
  { slug: 'home-services', label: 'Home Services' },
  { slug: 'travel-experiences', label: 'Travel' },
  { slug: 'entertainment', label: 'Entertainment' },
  { slug: 'financial-lifestyle', label: 'Financial' },
  { slug: 'electronics', label: 'Electronics' },
];

const SORT_OPTIONS = [
  { key: 'streak', label: 'By Streak' },
  { key: 'coins', label: 'By Coins' },
  { key: 'missions', label: 'By Missions' },
];

const TIER_COLORS: Record<string, string> = {
  Bronze: Colors.light.bronze,
  Silver: '#C0C0C0',
  Gold: Colors.light.goldBright,
  Platinum: '#E5E4E2',
};

export default function LoyaltyScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [users, setUsers] = useState<LoyaltyUser[]>([]);
  const [stats, setStats] = useState<LoyaltyStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sortBy, setSortBy] = useState('streak');

  // Modals
  const [selectedUser, setSelectedUser] = useState<LoyaltyUser | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showAddCoinsModal, setShowAddCoinsModal] = useState(false);
  const [coinAmount, setCoinAmount] = useState('');
  const [coinReason, setCoinReason] = useState('');
  const [coinCategory, setCoinCategory] = useState('');
  const [processingUser, setProcessingUser] = useState<string | null>(null);

  useEffect(() => {
    loadData(1);
    loadStats();
  }, [selectedCategory, sortBy]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(true);
      loadData(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadData = async (pageNum: number = 1, append: boolean = false) => {
    try {
      const data = await loyaltyService.getUsers(
        pageNum,
        20,
        searchQuery || undefined,
        selectedCategory || undefined,
        sortBy
      );

      if (append) {
        setUsers(prev => [...prev, ...data.users]);
      } else {
        setUsers(data.users);
      }

      setHasMore(data.pagination.page < data.pagination.totalPages);
      setPage(pageNum);
    } catch (error) {
      if (__DEV__) console.error('Failed to load loyalty users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const data = await loyaltyService.getStats();
      setStats(data);
    } catch (error) {
      if (__DEV__) console.error('Failed to load loyalty stats:', error);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadData(1), loadStats()]);
    setRefreshing(false);
  }, [selectedCategory, sortBy, searchQuery]);

  const loadMore = () => {
    if (!isLoading && hasMore) {
      loadData(page + 1, true);
    }
  };

  const handleAddCoins = async () => {
    if (!selectedUser || !coinAmount || !coinReason) return;
    try {
      setProcessingUser(selectedUser._id);
      await loyaltyService.addCoins(
        selectedUser.userId._id,
        parseInt(coinAmount),
        coinReason,
        coinCategory || undefined
      );
      showAlert('Success', `Added ${coinAmount} coins to user`);
      setShowAddCoinsModal(false);
      setCoinAmount('');
      setCoinReason('');
      setCoinCategory('');
      await loadData(1);
      await loadStats();
    } catch (error: any) {
      showAlert('Error', error.message);
    } finally {
      setProcessingUser(null);
    }
  };

  const handleResetStreak = (userId: string) => {
    showConfirm(
      'Reset Streak',
      'Are you sure? This will reset the user\'s streak to 0.',
      async () => {
        try {
          await loyaltyService.resetStreak(userId);
          showAlert('Success', 'Streak reset');
          setShowDetailModal(false);
          await loadData(1);
        } catch (error: any) {
          showAlert('Error', error.message);
        }
      },
      'Reset'
    );
  };

  const handleResetMissions = (userId: string) => {
    showConfirm(
      'Reset Missions',
      'Are you sure? This will reset all mission progress.',
      async () => {
        try {
          await loyaltyService.resetMissions(userId);
          showAlert('Success', 'Missions reset');
          setShowDetailModal(false);
          await loadData(1);
        } catch (error: any) {
          showAlert('Error', error.message);
        }
      },
      'Reset'
    );
  };

  const getUserName = (user: LoyaltyUser): string => {
    const profile = user.userId?.profile;
    if (profile?.firstName || profile?.lastName) {
      return `${profile.firstName || ''} ${profile.lastName || ''}`.trim();
    }
    return user.userId?.phoneNumber || 'Unknown User';
  };

  const getUserInitials = (user: LoyaltyUser): string => {
    const profile = user.userId?.profile;
    if (profile?.firstName) {
      const first = profile.firstName.charAt(0).toUpperCase();
      const last = profile.lastName ? profile.lastName.charAt(0).toUpperCase() : '';
      return first + last;
    }
    return '??';
  };

  const getCompletedMissions = (user: LoyaltyUser): number => {
    return user.missions?.filter(m => m.completedAt)?.length || 0;
  };

  const getTopCategoryCoins = (user: LoyaltyUser): { category: string; amount: number } => {
    const catCoins = user.categoryCoins || {};
    let topCategory = '';
    let topAmount = 0;
    for (const [cat, data] of Object.entries(catCoins)) {
      if (data.available > topAmount) {
        topAmount = data.available;
        topCategory = cat;
      }
    }
    const label = CATEGORIES.find(c => c.slug === topCategory)?.label || topCategory;
    return { category: label, amount: topAmount };
  };

  const formatDate = (dateStr?: string): string => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return 'N/A';
    }
  };

  const renderStatsCard = () => (
    <View style={styles.statsContainer}>
      <View style={[styles.statsCard, { backgroundColor: colors.card }]}>
        <Text style={[styles.statsValue, { color: colors.text }]}>{stats?.totalUsers || 0}</Text>
        <Text style={[styles.statsLabel, { color: colors.icon }]}>Total Users</Text>
      </View>
      <View style={[styles.statsCard, { backgroundColor: colors.card }]}>
        <Text style={[styles.statsValue, { color: colors.warning }]}>{stats?.activeStreaks || 0}</Text>
        <Text style={[styles.statsLabel, { color: colors.icon }]}>Active Streaks</Text>
      </View>
      <View style={[styles.statsCard, { backgroundColor: colors.card }]}>
        <Text style={[styles.statsValue, { color: colors.success }]}>{stats?.totalCoinsEarned || 0}</Text>
        <Text style={[styles.statsLabel, { color: colors.icon }]}>Total Coins</Text>
      </View>
      <View style={[styles.statsCard, { backgroundColor: colors.card }]}>
        <Text style={[styles.statsValue, { color: colors.info }]}>{stats?.completedMissions || 0}</Text>
        <Text style={[styles.statsLabel, { color: colors.icon }]}>Completed</Text>
      </View>
    </View>
  );

  const renderCategoryFilter = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.categoryContainer}
    >
      {CATEGORIES.map(cat => (
        <TouchableOpacity
          key={cat.slug}
          style={[
            styles.categoryChip,
            selectedCategory === cat.slug && { backgroundColor: colors.tint },
            selectedCategory !== cat.slug && { backgroundColor: colors.card },
          ]}
          onPress={() => {
            setSelectedCategory(cat.slug);
            setIsLoading(true);
          }}
        >
          <Text
            style={[
              styles.categoryChipText,
              { color: selectedCategory === cat.slug ? colors.card : colors.icon },
            ]}
          >
            {cat.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderSearchBar = () => (
    <View style={[styles.searchContainer, { backgroundColor: colors.card }]}>
      <Ionicons name="search" size={18} color={colors.icon} />
      <TextInput
        style={[styles.searchInput, { color: colors.text }]}
        placeholder="Search by name or phone..."
        placeholderTextColor={colors.icon}
        value={searchQuery}
        onChangeText={setSearchQuery}
      />
      {searchQuery.length > 0 && (
        <TouchableOpacity onPress={() => setSearchQuery('')}>
          <Ionicons name="close-circle" size={18} color={colors.icon} />
        </TouchableOpacity>
      )}
    </View>
  );

  const renderSortOptions = () => (
    <View style={styles.sortContainer}>
      {SORT_OPTIONS.map(opt => (
        <TouchableOpacity
          key={opt.key}
          style={[
            styles.sortChip,
            sortBy === opt.key && { backgroundColor: colors.tint },
            sortBy !== opt.key && { backgroundColor: colors.card },
          ]}
          onPress={() => {
            setSortBy(opt.key);
            setIsLoading(true);
          }}
        >
          <Text
            style={[
              styles.sortChipText,
              { color: sortBy === opt.key ? colors.card : colors.icon },
            ]}
          >
            {opt.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderUserItem = ({ item }: { item: LoyaltyUser }) => {
    const name = getUserName(item);
    const initials = getUserInitials(item);
    const completed = getCompletedMissions(item);
    const totalMissions = item.missions?.length || 0;
    const topCat = getTopCategoryCoins(item);

    return (
      <TouchableOpacity
        style={[styles.userCard, { backgroundColor: colors.card }]}
        onPress={() => {
          setSelectedUser(item);
          setShowDetailModal(true);
        }}
      >
        <View style={styles.userHeader}>
          <View style={[styles.avatar, { backgroundColor: `${colors.tint}20` }]}>
            <Text style={[styles.avatarText, { color: colors.tint }]}>{initials}</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: colors.text }]}>{name}</Text>
            <Text style={[styles.userPhone, { color: colors.icon }]}>
              {item.userId?.phoneNumber || 'No phone'}
            </Text>
            {item.streak?.current > 0 && (
              <View style={styles.streakRow}>
                <Ionicons name="flame" size={14} color={colors.warning} />
                <Text style={styles.streakText}>{item.streak.current} day streak</Text>
              </View>
            )}
          </View>
          <View style={styles.coinBadge}>
            <Ionicons name="sparkles" size={14} color={colors.warning} />
            <Text style={styles.coinAmount}>{item.coins?.available || 0}</Text>
          </View>
        </View>

        <View style={styles.userMiniStats}>
          <View style={styles.miniStat}>
            <Ionicons name="business-outline" size={14} color={colors.icon} />
            <Text style={[styles.miniStatText, { color: colors.icon }]}>
              {item.brandLoyalty?.length || 0} Brands
            </Text>
          </View>
          <View style={styles.miniStat}>
            <Ionicons name="flag-outline" size={14} color={colors.icon} />
            <Text style={[styles.miniStatText, { color: colors.icon }]}>
              {completed}/{totalMissions} Missions
            </Text>
          </View>
          <View style={styles.miniStat}>
            <Ionicons name="wallet-outline" size={14} color={colors.icon} />
            <Text style={[styles.miniStatText, { color: colors.icon }]}>
              {topCat.amount > 0 ? `${topCat.amount} ${topCat.category}` : 'No cat. coins'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderDetailModal = () => {
    if (!selectedUser) return null;
    const name = getUserName(selectedUser);
    const completed = getCompletedMissions(selectedUser);
    const activeMissions = selectedUser.missions?.filter(m => !m.completedAt) || [];
    const topBrands = (selectedUser.brandLoyalty || []).slice(0, 5);
    const catCoins = selectedUser.categoryCoins || {};

    return (
      <Modal visible={showDetailModal} transparent animationType="slide">
        <View style={styles.detailModalOverlay}>
          <View style={[styles.detailModalContent, { backgroundColor: colors.card }]}>
            <View style={styles.detailModalHandle} />
            <TouchableOpacity
              style={styles.detailCloseButton}
              onPress={() => setShowDetailModal(false)}
            >
              <Ionicons name="close" size={24} color={colors.icon} />
            </TouchableOpacity>

            <ScrollView style={styles.detailScrollView} showsVerticalScrollIndicator={false}>
              {/* User Info */}
              <View style={styles.detailSection}>
                <Text style={[styles.detailSectionTitle, { color: colors.text }]}>User Info</Text>
                <Text style={[styles.detailLabel, { color: colors.icon }]}>Name</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>{name}</Text>
                <Text style={[styles.detailLabel, { color: colors.icon }]}>Phone</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {selectedUser.userId?.phoneNumber || 'N/A'}
                </Text>
                <Text style={[styles.detailLabel, { color: colors.icon }]}>Email</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {selectedUser.userId?.email || 'N/A'}
                </Text>
              </View>

              {/* Streak Section */}
              <View style={styles.detailSection}>
                <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Streak</Text>
                <View style={styles.detailRow}>
                  <View style={styles.detailStatBox}>
                    <Ionicons name="flame" size={20} color={colors.warning} />
                    <Text style={[styles.detailStatValue, { color: colors.text }]}>
                      {selectedUser.streak?.current || 0}
                    </Text>
                    <Text style={[styles.detailStatLabel, { color: colors.icon }]}>Current</Text>
                  </View>
                  <View style={styles.detailStatBox}>
                    <Ionicons name="trophy-outline" size={20} color={colors.info} />
                    <Text style={[styles.detailStatValue, { color: colors.text }]}>
                      {selectedUser.streak?.target || 7}
                    </Text>
                    <Text style={[styles.detailStatLabel, { color: colors.icon }]}>Target</Text>
                  </View>
                  <View style={styles.detailStatBox}>
                    <Ionicons name="calendar-outline" size={20} color={colors.icon} />
                    <Text style={[styles.detailStatSmallValue, { color: colors.text }]}>
                      {formatDate(selectedUser.streak?.lastCheckin)}
                    </Text>
                    <Text style={[styles.detailStatLabel, { color: colors.icon }]}>Last Checkin</Text>
                  </View>
                </View>
              </View>

              {/* Coins Section */}
              <View style={styles.detailSection}>
                <Text style={[styles.detailSectionTitle, { color: colors.text }]}>Coins</Text>
                <View style={styles.detailRow}>
                  <View style={styles.detailStatBox}>
                    <Ionicons name="sparkles" size={20} color={colors.warning} />
                    <Text style={[styles.detailStatValue, { color: colors.text }]}>
                      {selectedUser.coins?.available || 0}
                    </Text>
                    <Text style={[styles.detailStatLabel, { color: colors.icon }]}>Available</Text>
                  </View>
                  <View style={styles.detailStatBox}>
                    <Ionicons name="time-outline" size={20} color={colors.error} />
                    <Text style={[styles.detailStatValue, { color: colors.text }]}>
                      {selectedUser.coins?.expiring || 0}
                    </Text>
                    <Text style={[styles.detailStatLabel, { color: colors.icon }]}>Expiring</Text>
                  </View>
                  <View style={styles.detailStatBox}>
                    <Ionicons name="calendar-outline" size={20} color={colors.icon} />
                    <Text style={[styles.detailStatSmallValue, { color: colors.text }]}>
                      {formatDate(selectedUser.coins?.expiryDate)}
                    </Text>
                    <Text style={[styles.detailStatLabel, { color: colors.icon }]}>Expiry Date</Text>
                  </View>
                </View>
              </View>

              {/* Brand Loyalty */}
              {topBrands.length > 0 && (
                <View style={styles.detailSection}>
                  <Text style={[styles.detailSectionTitle, { color: colors.text }]}>
                    Brand Loyalty (Top 5)
                  </Text>
                  {topBrands.map((brand, idx) => (
                    <View key={idx} style={[styles.brandRow, { borderBottomColor: colors.border }]}>
                      <View style={styles.brandInfo}>
                        <Text style={[styles.brandName, { color: colors.text }]}>
                          {brand.brandName}
                        </Text>
                        <Text style={[styles.brandPurchases, { color: colors.icon }]}>
                          {brand.purchaseCount} purchases
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.tierBadge,
                          { backgroundColor: `${TIER_COLORS[brand.tier] || Colors.light.bronze}30` },
                        ]}
                      >
                        <Text
                          style={[
                            styles.tierText,
                            { color: TIER_COLORS[brand.tier] || Colors.light.bronze },
                          ]}
                        >
                          {brand.tier}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* Active Missions */}
              {activeMissions.length > 0 && (
                <View style={styles.detailSection}>
                  <Text style={[styles.detailSectionTitle, { color: colors.text }]}>
                    Active Missions
                  </Text>
                  {activeMissions.map((mission, idx) => {
                    const progressPct = mission.target > 0
                      ? Math.min((mission.progress / mission.target) * 100, 100)
                      : 0;
                    return (
                      <View key={idx} style={styles.missionRow}>
                        <View style={styles.missionInfo}>
                          <Text style={[styles.missionTitle, { color: colors.text }]}>
                            {mission.icon} {mission.title}
                          </Text>
                          <Text style={[styles.missionProgress, { color: colors.icon }]}>
                            {mission.progress}/{mission.target} - {mission.reward} coins
                          </Text>
                        </View>
                        <View style={[styles.progressBarBg, { backgroundColor: colors.border }]}>
                          <View
                            style={[
                              styles.progressBarFill,
                              {
                                width: `${progressPct}%`,
                                backgroundColor: progressPct >= 100 ? colors.success : colors.tint,
                              },
                            ]}
                          />
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}

              {/* Category Coins */}
              {Object.keys(catCoins).length > 0 && (
                <View style={styles.detailSection}>
                  <Text style={[styles.detailSectionTitle, { color: colors.text }]}>
                    Category Coins
                  </Text>
                  <View style={styles.catCoinsGrid}>
                    {Object.entries(catCoins).map(([slug, data]) => {
                      const label = CATEGORIES.find(c => c.slug === slug)?.label || slug;
                      return (
                        <View
                          key={slug}
                          style={[styles.catCoinCard, { backgroundColor: `${colors.tint}10` }]}
                        >
                          <Text style={[styles.catCoinAmount, { color: colors.text }]}>
                            {data.available}
                          </Text>
                          <Text
                            style={[styles.catCoinLabel, { color: colors.icon }]}
                            numberOfLines={1}
                          >
                            {label}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Action Buttons */}
              <View style={styles.detailActions}>
                <TouchableOpacity
                  style={[styles.detailActionButton, { backgroundColor: colors.success }]}
                  onPress={() => {
                    setShowAddCoinsModal(true);
                  }}
                >
                  <Ionicons name="add-circle-outline" size={18} color={colors.card} />
                  <Text style={styles.detailActionText}>Add Coins</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.detailActionButton, { backgroundColor: colors.warning }]}
                  onPress={() => handleResetStreak(selectedUser.userId._id)}
                >
                  <Ionicons name="refresh-outline" size={18} color={colors.card} />
                  <Text style={styles.detailActionText}>Reset Streak</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.detailActionButton, { backgroundColor: colors.error }]}
                  onPress={() => handleResetMissions(selectedUser.userId._id)}
                >
                  <Ionicons name="trash-outline" size={18} color={colors.card} />
                  <Text style={styles.detailActionText}>Reset Missions</Text>
                </TouchableOpacity>
              </View>

              <View style={{ height: 30 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  const renderAddCoinsModal = () => (
    <Modal visible={showAddCoinsModal} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Add Coins</Text>
          <Text style={[styles.modalSubtitle, { color: colors.icon }]}>
            Adding coins to {selectedUser ? getUserName(selectedUser) : ''}
          </Text>

          <Text style={[styles.inputLabel, { color: colors.text }]}>Amount</Text>
          <TextInput
            style={[styles.modalInput, { color: colors.text, borderColor: colors.border }]}
            placeholder="Enter coin amount"
            placeholderTextColor={colors.icon}
            value={coinAmount}
            onChangeText={setCoinAmount}
            keyboardType="numeric"
          />

          <Text style={[styles.inputLabel, { color: colors.text }]}>Reason</Text>
          <TextInput
            style={[
              styles.modalInput,
              styles.reasonInput,
              { color: colors.text, borderColor: colors.border },
            ]}
            placeholder="Enter reason for adding coins..."
            placeholderTextColor={colors.icon}
            value={coinReason}
            onChangeText={setCoinReason}
            multiline
            numberOfLines={3}
          />

          <Text style={[styles.inputLabel, { color: colors.text }]}>Category (optional)</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.coinCategoryScroll}
          >
            {CATEGORIES.filter(c => c.slug !== '').map(cat => (
              <TouchableOpacity
                key={cat.slug}
                style={[
                  styles.coinCategoryChip,
                  coinCategory === cat.slug && { backgroundColor: colors.tint },
                  coinCategory !== cat.slug && { backgroundColor: colors.border },
                ]}
                onPress={() => setCoinCategory(coinCategory === cat.slug ? '' : cat.slug)}
              >
                <Text
                  style={[
                    styles.coinCategoryChipText,
                    { color: coinCategory === cat.slug ? colors.card : colors.icon },
                  ]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: colors.border }]}
              onPress={() => {
                setShowAddCoinsModal(false);
                setCoinAmount('');
                setCoinReason('');
                setCoinCategory('');
              }}
            >
              <Text style={[styles.modalButtonText, { color: colors.text }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: colors.success }]}
              onPress={handleAddCoins}
              disabled={!coinAmount || !coinReason || processingUser !== null}
            >
              {processingUser ? (
                <ActivityIndicator size="small" color={colors.card} />
              ) : (
                <Text style={[styles.modalButtonText, { color: colors.card }]}>Add Coins</Text>
              )}
            </TouchableOpacity>
          </View>
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

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {renderStatsCard()}
      {renderCategoryFilter()}
      {renderSearchBar()}
      {renderSortOptions()}

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
              No loyalty users found
            </Text>
          </View>
        }
      />

      {renderDetailModal()}
      {renderAddCoinsModal()}
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
  // Stats
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
  // Category filter
  categoryContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  // Sort
  sortContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 8,
    gap: 8,
  },
  sortChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  sortChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  // User list
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
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  userName: {
    fontSize: 15,
    fontWeight: '600',
  },
  userPhone: {
    fontSize: 12,
    marginTop: 2,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
    gap: 4,
  },
  streakText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.warning,
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
  userMiniStats: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    justifyContent: 'space-between',
  },
  miniStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  miniStatText: {
    fontSize: 11,
  },
  // Detail modal
  detailModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  detailModalContent: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '85%',
    paddingTop: 12,
  },
  detailModalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.light.slateLight,
    alignSelf: 'center',
    marginBottom: 8,
  },
  detailCloseButton: {
    position: 'absolute',
    top: 12,
    right: 16,
    zIndex: 10,
  },
  detailScrollView: {
    paddingHorizontal: 20,
  },
  detailSection: {
    marginBottom: 20,
  },
  detailSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
  },
  detailLabel: {
    fontSize: 12,
    marginTop: 6,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 2,
  },
  detailRow: {
    flexDirection: 'row',
    gap: 12,
  },
  detailStatBox: {
    flex: 1,
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  detailStatValue: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 4,
  },
  detailStatSmallValue: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
  detailStatLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  // Brand rows
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  brandInfo: {
    flex: 1,
  },
  brandName: {
    fontSize: 14,
    fontWeight: '600',
  },
  brandPurchases: {
    fontSize: 12,
    marginTop: 2,
  },
  tierBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tierText: {
    fontSize: 12,
    fontWeight: '700',
  },
  // Missions
  missionRow: {
    marginBottom: 12,
  },
  missionInfo: {
    marginBottom: 6,
  },
  missionTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  missionProgress: {
    fontSize: 12,
    marginTop: 2,
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 6,
    borderRadius: 3,
  },
  // Category coins grid
  catCoinsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  catCoinCard: {
    width: '30%',
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  catCoinAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  catCoinLabel: {
    fontSize: 10,
    marginTop: 2,
  },
  // Detail actions
  detailActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  detailActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 4,
  },
  detailActionText: {
    color: Colors.light.card,
    fontWeight: '600',
    fontSize: 12,
  },
  // Add coins modal
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
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    marginBottom: 12,
  },
  reasonInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  coinCategoryScroll: {
    marginBottom: 16,
    maxHeight: 40,
  },
  coinCategoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
  },
  coinCategoryChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalButtons: {
    flexDirection: 'row',
    marginTop: 4,
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
  // Empty
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
  },
});
