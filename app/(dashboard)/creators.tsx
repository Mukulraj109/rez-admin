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
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import {
  getCreatorApplications,
  approveCreator,
  rejectCreator,
  toggleFeatured,
  updateCreatorTier,
  suspendCreator,
  unsuspendCreator,
  getCreatorProgramStats,
  getAdminPicks,
  moderatePick,
  getAdminConversions,
  getCreatorConfig,
  updateCreatorConfig,
  AdminCreator,
  AdminPick,
  AdminConversion,
  CreatorProgramStats,
  CreatorProgramConfig,
} from '../../services/api/creators';
import { showAlert, showConfirm } from '../../utils/alert';

type TabType = 'creators' | 'picks' | 'conversions' | 'config';
type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected' | 'suspended';
type PickFilter = 'all' | 'pending' | 'approved' | 'rejected';

export default function CreatorsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [activeTab, setActiveTab] = useState<TabType>('creators');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);

  // Data
  const [creators, setCreators] = useState<AdminCreator[]>([]);
  const [picks, setPicks] = useState<AdminPick[]>([]);
  const [conversions, setConversions] = useState<AdminConversion[]>([]);
  const [stats, setStats] = useState<CreatorProgramStats | null>(null);
  const [config, setConfig] = useState<CreatorProgramConfig | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [pickFilter, setPickFilter] = useState<PickFilter>('pending');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal
  const [rejectModal, setRejectModal] = useState<{ visible: boolean; creatorId: string; type: 'creator' | 'pick' | 'suspend' }>({
    visible: false, creatorId: '', type: 'creator',
  });
  const [rejectReason, setRejectReason] = useState('');
  const [tierModal, setTierModal] = useState<{ visible: boolean; creatorId: string; currentTier: string }>({
    visible: false, creatorId: '', currentTier: '',
  });
  const [selectedTier, setSelectedTier] = useState('');
  const [editingConfig, setEditingConfig] = useState(false);
  const [configDraft, setConfigDraft] = useState<Partial<CreatorProgramConfig>>({});

  // Fetch data — optional searchOverride lets callers pass a value that takes effect immediately
  const fetchData = useCallback(async (isRefresh = false, searchOverride?: string) => {
    try {
      if (!isRefresh) setIsLoading(true);

      const searchTerm = searchOverride !== undefined ? searchOverride : searchQuery;

      const [statsRes, creatorsRes] = await Promise.all([
        getCreatorProgramStats(),
        getCreatorApplications({
          status: statusFilter === 'all' ? undefined : statusFilter,
          search: searchTerm || undefined,
          limit: 50,
        }),
      ]);

      const statsData = statsRes?.data?.data || statsRes?.data;
      if (statsData) setStats(statsData);
      const creatorsData = creatorsRes?.data?.data || creatorsRes?.data;
      if (creatorsData) {
        const list = creatorsData.creators || creatorsData.applications || (Array.isArray(creatorsData) ? creatorsData : []);
        setCreators(Array.isArray(list) ? list : []);
      }
    } catch (err) {
      console.error('[ADMIN CREATORS] Error:', err);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter, searchQuery]);

  const fetchPicks = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await getAdminPicks({
        status: pickFilter === 'all' ? 'all' : pickFilter,
        limit: 50,
      });
      const picksData = res?.data?.data || res?.data;
      if (picksData) {
        const list = picksData.picks || (Array.isArray(picksData) ? picksData : []);
        setPicks(Array.isArray(list) ? list : []);
      }
    } catch (err) {
      console.error('[ADMIN CREATORS] Error fetching picks:', err);
    } finally {
      setIsLoading(false);
    }
  }, [pickFilter]);

  const fetchConversions = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await getAdminConversions({ limit: 50 });
      const convData = res?.data?.data || res?.data;
      if (convData) {
        const list = convData.conversions || (Array.isArray(convData) ? convData : []);
        setConversions(Array.isArray(list) ? list : []);
      }
    } catch (err) {
      console.error('[ADMIN CREATORS] Error fetching conversions:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchConfig = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await getCreatorConfig();
      const configData = res?.data?.data || res?.data;
      if (configData) setConfig(configData);
    } catch (err) {
      console.error('[ADMIN CREATORS] Error fetching config:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'creators') fetchData();
    else if (activeTab === 'picks') fetchPicks();
    else if (activeTab === 'conversions') fetchConversions();
    else if (activeTab === 'config') fetchConfig();
  }, [activeTab, statusFilter, pickFilter]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    if (activeTab === 'creators') fetchData(true);
    else if (activeTab === 'picks') fetchPicks();
    else if (activeTab === 'conversions') fetchConversions();
    else if (activeTab === 'config') fetchConfig();
  }, [activeTab, statusFilter, pickFilter]);

  // Actions
  const handleApprove = async (id: string) => {
    try {
      setProcessing(id);
      await approveCreator(id);
      showAlert('Success', 'Creator approved successfully');
      fetchData(true);
    } catch (err: any) {
      showAlert('Error', err.message || 'Failed to approve creator');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      showAlert('Error', 'Please provide a reason');
      return;
    }
    try {
      setProcessing(rejectModal.creatorId);
      if (rejectModal.type === 'suspend') {
        await suspendCreator(rejectModal.creatorId, rejectReason.trim());
        showAlert('Success', 'Creator suspended');
      } else if (rejectModal.type === 'creator') {
        await rejectCreator(rejectModal.creatorId, rejectReason.trim());
        showAlert('Success', 'Creator rejected');
      } else {
        await moderatePick(rejectModal.creatorId, 'reject', rejectReason.trim());
        showAlert('Success', 'Pick rejected');
      }
      setRejectModal({ visible: false, creatorId: '', type: 'creator' });
      setRejectReason('');
      if (rejectModal.type === 'pick') fetchPicks();
      else fetchData(true);
    } catch (err: any) {
      showAlert('Error', err.message || 'Failed');
    } finally {
      setProcessing(null);
    }
  };

  const handleToggleFeatured = async (id: string) => {
    try {
      setProcessing(id);
      await toggleFeatured(id);
      fetchData(true);
    } catch (err: any) {
      showAlert('Error', err.message || 'Failed to toggle featured');
    } finally {
      setProcessing(null);
    }
  };

  const handleSuspend = (id: string) => {
    setRejectModal({ visible: true, creatorId: id, type: 'suspend' });
  };

  const handleUnsuspend = async (id: string) => {
    showConfirm('Unsuspend Creator', 'Restore this creator to approved status?', async () => {
      try {
        setProcessing(id);
        await unsuspendCreator(id);
        showAlert('Success', 'Creator unsuspended');
        fetchData(true);
      } catch (err: any) {
        showAlert('Error', err.message || 'Failed to unsuspend');
      } finally {
        setProcessing(null);
      }
    });
  };

  const handleUpdateTier = async () => {
    if (!selectedTier || selectedTier === tierModal.currentTier) {
      setTierModal({ visible: false, creatorId: '', currentTier: '' });
      return;
    }
    try {
      setProcessing(tierModal.creatorId);
      await updateCreatorTier(tierModal.creatorId, selectedTier);
      showAlert('Success', `Tier updated to ${selectedTier}`);
      setTierModal({ visible: false, creatorId: '', currentTier: '' });
      fetchData(true);
    } catch (err: any) {
      showAlert('Error', err.message || 'Failed to update tier');
    } finally {
      setProcessing(null);
    }
  };

  const handleApprovePick = async (pickId: string) => {
    try {
      setProcessing(pickId);
      await moderatePick(pickId, 'approve');
      showAlert('Success', 'Pick approved');
      fetchPicks();
    } catch (err: any) {
      showAlert('Error', err.message || 'Failed to approve pick');
    } finally {
      setProcessing(null);
    }
  };

  // ============================================
  // RENDER STATS
  // ============================================

  const renderStats = () => {
    if (!stats) return null;
    const row1 = [
      { label: 'Total Creators', value: stats.totalCreators, color: colors.info },
      { label: 'Approved', value: stats.approvedCreators, color: colors.greenDark },
      { label: 'Pending', value: stats.pendingApplications, color: colors.warning },
      { label: 'Suspended', value: stats.suspendedCreators, color: colors.error },
    ];
    const row2 = [
      { label: 'Published Picks', value: stats.totalPicks, color: colors.purple },
      { label: 'Pending Picks', value: stats.pendingPicks, color: colors.warningDark },
      { label: 'Conversions', value: stats.totalConversions, color: colors.greenDark },
      { label: 'Commission Paid', value: stats.totalCommissionPaid, color: colors.successDark },
    ];

    return (
      <View>
        <View style={s.statsGrid}>
          {row1.map((item, idx) => (
            <View key={idx} style={[s.statCard, { backgroundColor: colors.card }]}>
              <Text style={[s.statValue, { color: item.color }]}>{item.value}</Text>
              <Text style={[s.statLabel, { color: colors.secondaryText }]}>{item.label}</Text>
            </View>
          ))}
        </View>
        <View style={[s.statsGrid, { paddingTop: 0 }]}>
          {row2.map((item, idx) => (
            <View key={idx} style={[s.statCard, { backgroundColor: colors.card }]}>
              <Text style={[s.statValue, { color: item.color }]}>{item.value}</Text>
              <Text style={[s.statLabel, { color: colors.secondaryText }]}>{item.label}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  // ============================================
  // RENDER CREATOR CARD
  // ============================================

  const renderCreatorCard = ({ item }: { item: AdminCreator }) => (
    <View style={[s.card, { backgroundColor: colors.card }]}>
      <View style={s.cardHeader}>
        <View style={s.cardInfo}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={[s.cardName, { color: colors.text }]}>{item.displayName}</Text>
            {item.isVerified && (
              <Ionicons name="checkmark-circle" size={16} color={colors.info} />
            )}
            {item.isFeatured && (
              <Ionicons name="star" size={14} color={colors.warning} />
            )}
          </View>
          <Text style={[s.cardCategory, { color: colors.secondaryText }]}>
            {item.category} · {item.tier}
          </Text>
        </View>
        <View style={[
          s.statusBadge,
          item.status === 'pending' && { backgroundColor: colors.warningLight },
          item.status === 'approved' && { backgroundColor: colors.successLight },
          item.status === 'rejected' && { backgroundColor: colors.errorLight },
          item.status === 'suspended' && { backgroundColor: colors.errorLight },
        ]}>
          <Text style={[
            s.statusText,
            item.status === 'pending' && { color: colors.warningDark },
            item.status === 'approved' && { color: colors.greenDark },
            item.status === 'rejected' && { color: colors.error },
            item.status === 'suspended' && { color: colors.errorDark },
          ]}>
            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
          </Text>
        </View>
      </View>

      <Text style={[s.cardBio, { color: colors.secondaryText }]} numberOfLines={2}>
        {item.bio}
      </Text>

      {/* Application / Approval date */}
      <Text style={{ fontSize: 11, color: colors.secondaryText, marginBottom: 6 }}>
        Applied: {new Date(item.applicationDate).toLocaleDateString()}
        {item.approvedDate ? ` · Approved: ${new Date(item.approvedDate).toLocaleDateString()}` : ''}
      </Text>

      {/* Rejection reason */}
      {item.status === 'rejected' && item.rejectionReason && (
        <Text style={{ fontSize: 12, color: colors.error, marginBottom: 8 }}>
          Rejection: {item.rejectionReason}
        </Text>
      )}

      {/* Suspension reason */}
      {item.status === 'suspended' && item.suspensionReason && (
        <Text style={{ fontSize: 12, color: colors.errorDark, marginBottom: 8 }}>
          Suspended: {item.suspensionReason}
        </Text>
      )}

      <View style={s.cardStats}>
        <Text style={[s.cardStatText, { color: colors.secondaryText }]}>
          {item.stats?.totalPicks || 0} picks
        </Text>
        <Text style={[s.cardStatText, { color: colors.secondaryText }]}>
          {item.stats?.totalViews || 0} views
        </Text>
        <Text style={[s.cardStatText, { color: colors.secondaryText }]}>
          {item.stats?.totalFollowers || 0} followers
        </Text>
        <Text style={[s.cardStatText, { color: colors.secondaryText }]}>
          {item.stats?.totalConversions || 0} conv
        </Text>
      </View>

      {/* Actions */}
      <View style={s.cardActions}>
        {item.status === 'pending' && (
          <>
            <TouchableOpacity
              style={[s.actionBtn, { backgroundColor: colors.greenDark }]}
              onPress={() => handleApprove(item.id)}
              disabled={processing === item.id}
            >
              {processing === item.id ? (
                <ActivityIndicator size="small" color={colors.card} />
              ) : (
                <Text style={s.actionBtnText}>Approve</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.actionBtn, { backgroundColor: colors.error }]}
              onPress={() => setRejectModal({ visible: true, creatorId: item.id, type: 'creator' })}
            >
              <Text style={s.actionBtnText}>Reject</Text>
            </TouchableOpacity>
          </>
        )}
        {item.status === 'approved' && (
          <>
            <TouchableOpacity
              style={[s.actionBtn, { backgroundColor: item.isFeatured ? colors.secondaryText : colors.warning }]}
              onPress={() => handleToggleFeatured(item.id)}
              disabled={processing === item.id}
            >
              <Text style={s.actionBtnText}>
                {item.isFeatured ? 'Unfeature' : 'Feature'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.actionBtn, { backgroundColor: colors.info }]}
              onPress={() => {
                setSelectedTier(item.tier);
                setTierModal({ visible: true, creatorId: item.id, currentTier: item.tier });
              }}
            >
              <Text style={s.actionBtnText}>Tier</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.actionBtn, { backgroundColor: colors.error }]}
              onPress={() => handleSuspend(item.id)}
              disabled={processing === item.id}
            >
              <Text style={s.actionBtnText}>Suspend</Text>
            </TouchableOpacity>
          </>
        )}
        {item.status === 'suspended' && (
          <>
            <TouchableOpacity
              style={[s.actionBtn, { backgroundColor: colors.greenDark }]}
              onPress={() => handleUnsuspend(item.id)}
              disabled={processing === item.id}
            >
              {processing === item.id ? (
                <ActivityIndicator size="small" color={colors.card} />
              ) : (
                <Text style={s.actionBtnText}>Unsuspend</Text>
              )}
            </TouchableOpacity>
          </>
        )}
        {item.status === 'rejected' && (
          <TouchableOpacity
            style={[s.actionBtn, { backgroundColor: colors.greenDark }]}
            onPress={() => handleApprove(item.id)}
            disabled={processing === item.id}
          >
            {processing === item.id ? (
              <ActivityIndicator size="small" color={colors.card} />
            ) : (
              <Text style={s.actionBtnText}>Re-approve</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  // ============================================
  // RENDER PICK CARD
  // ============================================

  const renderPickCard = ({ item }: { item: AdminPick }) => {
    const isMerchantPending = item.status === 'pending_merchant';
    return (
    <View style={[s.card, { backgroundColor: colors.card }]}>
      <View style={s.cardHeader}>
        <View style={s.cardInfo}>
          <Text style={[s.cardName, { color: colors.text }]}>{item.title}</Text>
          <Text style={[s.cardCategory, { color: colors.secondaryText }]}>
            by {item.creatorName} · {item.productBrand}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {isMerchantPending && (
            <View style={[s.statusBadge, { backgroundColor: '#EDE9FE' }]}>
              <Text style={[s.statusText, { color: colors.purpleDark }]}>Merchant Pending</Text>
            </View>
          )}
          <View style={[
            s.statusBadge,
            item.moderationStatus === 'pending' && { backgroundColor: colors.warningLight },
            item.moderationStatus === 'approved' && { backgroundColor: colors.successLight },
            item.moderationStatus === 'rejected' && { backgroundColor: colors.errorLight },
          ]}>
            <Text style={[
              s.statusText,
              item.moderationStatus === 'pending' && { color: colors.warningDark },
              item.moderationStatus === 'approved' && { color: colors.greenDark },
              item.moderationStatus === 'rejected' && { color: colors.error },
            ]}>
              {item.moderationStatus}
            </Text>
          </View>
        </View>
      </View>

      {isMerchantPending && (
        <Text style={{ fontSize: 12, color: colors.purpleDark, marginBottom: 8, fontStyle: 'italic' }}>
          Awaiting merchant store approval before admin can moderate
        </Text>
      )}

      <View style={s.cardStats}>
        <Text style={[s.cardStatText, { color: colors.secondaryText }]}>
          {item.views} views
        </Text>
        <Text style={[s.cardStatText, { color: colors.secondaryText }]}>
          {item.likes} likes
        </Text>
        <Text style={[s.cardStatText, { color: colors.secondaryText }]}>
          {item.purchases} purchases
        </Text>
        <Text style={[s.cardStatText, { color: colors.secondaryText }]}>
          {new Date(item.createdAt).toLocaleDateString()}
        </Text>
      </View>

      {item.moderationStatus === 'pending' && !isMerchantPending && (
        <View style={s.cardActions}>
          <TouchableOpacity
            style={[s.actionBtn, { backgroundColor: colors.greenDark }]}
            onPress={() => handleApprovePick(item.id)}
            disabled={processing === item.id}
          >
            {processing === item.id ? (
              <ActivityIndicator size="small" color={colors.card} />
            ) : (
              <Text style={s.actionBtnText}>Approve</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.actionBtn, { backgroundColor: colors.error }]}
            onPress={() => setRejectModal({ visible: true, creatorId: item.id, type: 'pick' })}
          >
            <Text style={s.actionBtnText}>Reject</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
    );
  };

  // ============================================
  // RENDER CONVERSION CARD
  // ============================================

  const renderConversionCard = ({ item }: { item: AdminConversion }) => (
    <View style={[s.card, { backgroundColor: colors.card }]}>
      <View style={s.cardHeader}>
        <View style={s.cardInfo}>
          <Text style={[s.cardName, { color: colors.text }]}>{item.pickTitle}</Text>
          <Text style={[s.cardCategory, { color: colors.secondaryText }]}>
            Creator: {item.creatorName} · Buyer: {item.buyerName}
          </Text>
        </View>
        <Text style={{ fontSize: 11, color: colors.secondaryText }}>
          {new Date(item.createdAt).toLocaleDateString()}
        </Text>
      </View>
      <View style={s.convRow}>
        <Text style={[s.convAmount, { color: colors.text }]}>
          Purchase: {item.purchaseAmount} coins
        </Text>
        <Text style={[s.convCommission, { color: colors.greenDark }]}>
          Commission: +{item.commissionAmount}
        </Text>
        <View style={[
          s.statusBadge,
          item.status === 'paid' && { backgroundColor: colors.successLight },
          item.status === 'confirmed' && { backgroundColor: colors.infoLighter },
          item.status === 'pending' && { backgroundColor: colors.warningLight },
        ]}>
          <Text style={[
            s.statusText,
            item.status === 'paid' && { color: colors.greenDark },
            item.status === 'confirmed' && { color: colors.info },
            item.status === 'pending' && { color: colors.warningDark },
          ]}>
            {item.status}
          </Text>
        </View>
      </View>
    </View>
  );

  // ============================================
  // RENDER CONFIG
  // ============================================

  const handleSaveConfig = async () => {
    try {
      setProcessing('config');
      await updateCreatorConfig(configDraft);
      showAlert('Success', 'Configuration updated');
      setEditingConfig(false);
      setConfigDraft({});
      fetchConfig();
    } catch (err: any) {
      showAlert('Error', err.message || 'Failed to update config');
    } finally {
      setProcessing(null);
    }
  };

  const renderConfigField = (label: string, key: keyof CreatorProgramConfig, type: 'number' | 'boolean' = 'number') => {
    const value = configDraft[key] ?? config?.[key];
    if (!editingConfig) {
      return (
        <View style={s.configRow}>
          <Text style={[s.configLabel, { color: colors.secondaryText }]}>{label}</Text>
          <Text style={[s.configValue, { color: colors.text }]}>
            {type === 'boolean' ? (value ? 'Yes' : 'No') : String(value ?? '')}
          </Text>
        </View>
      );
    }
    if (type === 'boolean') {
      return (
        <View style={s.configRow}>
          <Text style={[s.configLabel, { color: colors.secondaryText }]}>{label}</Text>
          <TouchableOpacity
            onPress={() => setConfigDraft(d => ({ ...d, [key]: !value }))}
            style={[s.filterChip, value ? { backgroundColor: colors.greenDark } : { backgroundColor: colors.error }]}
          >
            <Text style={{ color: colors.card, fontSize: 12, fontWeight: '600' }}>{value ? 'Yes' : 'No'}</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View style={s.configRow}>
        <Text style={[s.configLabel, { color: colors.secondaryText }]}>{label}</Text>
        <TextInput
          style={[s.configInput, { color: colors.text, borderColor: colors.border }]}
          value={String(value ?? '')}
          onChangeText={v => setConfigDraft(d => ({ ...d, [key]: Number(v) || 0 }))}
          keyboardType="numeric"
        />
      </View>
    );
  };

  const renderConfig = () => {
    if (!config) return <ActivityIndicator style={{ marginTop: 40 }} />;

    return (
      <ScrollView style={{ padding: 16 }}>
        <View style={[s.card, { backgroundColor: colors.card }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={[s.configTitle, { color: colors.text, marginBottom: 0 }]}>Program Settings</Text>
            {editingConfig ? (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  style={[s.filterChip, { backgroundColor: colors.background }]}
                  onPress={() => { setEditingConfig(false); setConfigDraft({}); }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '600', color: colors.gray700 }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.filterChip, { backgroundColor: colors.greenDark }]}
                  onPress={handleSaveConfig}
                  disabled={processing === 'config'}
                >
                  <Text style={{ fontSize: 12, fontWeight: '600', color: colors.card }}>
                    {processing === 'config' ? 'Saving...' : 'Save'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[s.filterChip, { backgroundColor: colors.info }]}
                onPress={() => setEditingConfig(true)}
              >
                <Text style={{ fontSize: 12, fontWeight: '600', color: colors.card }}>Edit</Text>
              </TouchableOpacity>
            )}
          </View>

          {renderConfigField('Program Enabled', 'enabled', 'boolean')}
          {renderConfigField('Default Commission Rate (%)', 'defaultCommissionRate')}
          {renderConfigField('Coins Per Conversion', 'coinsPerConversion')}
          {renderConfigField('Max Daily Earnings', 'maxDailyEarnings')}
          {renderConfigField('Pending Period (days)', 'pendingPeriodDays')}
          {renderConfigField('Attribution Window (hours)', 'attributionWindowHours')}
          {renderConfigField('Auto-Approve Creators', 'autoApproveCreators', 'boolean')}
          {renderConfigField('Min Followers to Apply', 'minFollowersToApply')}
          {renderConfigField('Min Videos to Apply', 'minVideosToApply')}
          {renderConfigField('Featured Creator Limit', 'featuredCreatorLimit')}
          {renderConfigField('Trending Pick Limit', 'trendingPickLimit')}

          <Text style={[s.configTitle, { color: colors.text, marginTop: 20 }]}>Tier Commission Rates (%)</Text>
          {config.tierRates && Object.entries(config.tierRates).map(([tier, rate]) => {
            const draftRates = (configDraft as any).tierRates || {};
            const value = draftRates[tier] ?? rate;
            return (
              <View key={tier} style={s.configRow}>
                <Text style={[s.configLabel, { color: colors.secondaryText }]}>
                  {tier.charAt(0).toUpperCase() + tier.slice(1)}
                </Text>
                {editingConfig ? (
                  <TextInput
                    style={[s.configInput, { color: colors.text, borderColor: colors.border }]}
                    value={String(value)}
                    onChangeText={v => setConfigDraft(d => ({
                      ...d,
                      tierRates: { ...config.tierRates, ...draftRates, [tier]: Number(v) || 0 },
                    }))}
                    keyboardType="numeric"
                  />
                ) : (
                  <Text style={[s.configValue, { color: colors.text }]}>{rate}%</Text>
                )}
              </View>
            );
          })}

          <Text style={[s.configTitle, { color: colors.text, marginTop: 20 }]}>Min Picks for Tier Upgrade</Text>
          {config.minPicksForTier && Object.entries(config.minPicksForTier).map(([tier, count]) => {
            const draftMinPicks = (configDraft as any).minPicksForTier || {};
            const value = draftMinPicks[tier] ?? count;
            return (
              <View key={tier} style={s.configRow}>
                <Text style={[s.configLabel, { color: colors.secondaryText }]}>
                  {tier.charAt(0).toUpperCase() + tier.slice(1)}
                </Text>
                {editingConfig ? (
                  <TextInput
                    style={[s.configInput, { color: colors.text, borderColor: colors.border }]}
                    value={String(value)}
                    onChangeText={v => setConfigDraft(d => ({
                      ...d,
                      minPicksForTier: { ...config.minPicksForTier, ...draftMinPicks, [tier]: Number(v) || 0 },
                    }))}
                    keyboardType="numeric"
                  />
                ) : (
                  <Text style={[s.configValue, { color: colors.text }]}>{count} picks</Text>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>
    );
  };

  // ============================================
  // MAIN RENDER
  // ============================================

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      {/* Title */}
      <View style={[s.titleBar, { backgroundColor: colors.card }]}>
        <Text style={[s.title, { color: colors.text }]}>Creator Program</Text>
      </View>

      {/* Stats */}
      {renderStats()}

      {/* Tabs */}
      <View style={s.tabBar}>
        {(['creators', 'picks', 'conversions', 'config'] as TabType[]).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[s.tab, activeTab === tab && s.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[
              s.tabText,
              { color: activeTab === tab ? colors.info : colors.secondaryText },
            ]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Status Filter Chips (for creators tab) */}
      {activeTab === 'creators' && (
        <View style={s.filterRow}>
          {(['all', 'pending', 'approved', 'rejected', 'suspended'] as StatusFilter[]).map(f => (
            <TouchableOpacity
              key={f}
              style={[
                s.filterChip,
                statusFilter === f && { backgroundColor: colors.info },
              ]}
              onPress={() => setStatusFilter(f)}
            >
              <Text style={[
                s.filterChipText,
                { color: statusFilter === f ? colors.card : colors.secondaryText },
              ]}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
                {f === 'all' && stats?.totalCreators ? ` (${stats.totalCreators})` : ''}
                {f === 'pending' && stats?.pendingApplications ? ` (${stats.pendingApplications})` : ''}
                {f === 'approved' && stats?.approvedCreators ? ` (${stats.approvedCreators})` : ''}
                {f === 'rejected' && stats?.rejectedCreators ? ` (${stats.rejectedCreators})` : ''}
                {f === 'suspended' && stats?.suspendedCreators ? ` (${stats.suspendedCreators})` : ''}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Pick Filter Chips */}
      {activeTab === 'picks' && (
        <View style={s.filterRow}>
          {(['pending', 'approved', 'rejected', 'all'] as PickFilter[]).map(f => (
            <TouchableOpacity
              key={f}
              style={[
                s.filterChip,
                pickFilter === f && { backgroundColor: colors.info },
              ]}
              onPress={() => setPickFilter(f)}
            >
              <Text style={[
                s.filterChipText,
                { color: pickFilter === f ? colors.card : colors.secondaryText },
              ]}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
                {f === 'pending' && stats?.pendingPicks ? ` (${stats.pendingPicks})` : ''}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Search (for creators tab) */}
      {activeTab === 'creators' && (
        <View style={[s.searchBar, { backgroundColor: colors.card }]}>
          <Ionicons name="search" size={18} color={colors.secondaryText} />
          <TextInput
            style={[s.searchInput, { color: colors.text }]}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search by name, category..."
            placeholderTextColor={colors.secondaryText}
            onSubmitEditing={() => fetchData()}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => { setSearchQuery(''); fetchData(false, ''); }}>
              <Ionicons name="close-circle" size={18} color={colors.secondaryText} />
            </TouchableOpacity>
          ) : null}
        </View>
      )}

      {/* Content */}
      {activeTab === 'config' ? (
        renderConfig()
      ) : isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.info} />
      ) : (
        <FlatList
          data={
            activeTab === 'picks' ? picks :
            activeTab === 'conversions' ? conversions :
            creators
          }
          renderItem={
            activeTab === 'picks' ? renderPickCard :
            activeTab === 'conversions' ? renderConversionCard :
            renderCreatorCard
          }
          keyExtractor={(item: any) => item.id || item._id}
          contentContainerStyle={s.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="people-outline" size={48} color={colors.secondaryText} />
              <Text style={[s.emptyText, { color: colors.secondaryText }]}>No items found</Text>
            </View>
          }
        />
      )}

      {/* Reject / Suspend Modal */}
      <Modal visible={rejectModal.visible} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={[s.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[s.modalTitle, { color: colors.text }]}>
              {rejectModal.type === 'suspend' ? 'Suspension Reason' : 'Rejection Reason'}
            </Text>
            <TextInput
              style={[s.modalInput, { color: colors.text, borderColor: colors.border }]}
              value={rejectReason}
              onChangeText={setRejectReason}
              placeholder={rejectModal.type === 'suspend' ? 'Enter reason for suspension...' : 'Enter reason for rejection...'}
              placeholderTextColor={colors.secondaryText}
              multiline
              numberOfLines={3}
            />
            <View style={s.modalActions}>
              <TouchableOpacity
                style={[s.modalBtn, { backgroundColor: colors.background }]}
                onPress={() => {
                  setRejectModal({ visible: false, creatorId: '', type: 'creator' });
                  setRejectReason('');
                }}
              >
                <Text style={[s.modalBtnText, { color: colors.gray700 }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.modalBtn, { backgroundColor: rejectModal.type === 'suspend' ? colors.errorDark : colors.error }]}
                onPress={handleReject}
                disabled={processing === rejectModal.creatorId}
              >
                {processing === rejectModal.creatorId ? (
                  <ActivityIndicator size="small" color={colors.card} />
                ) : (
                  <Text style={[s.modalBtnText, { color: colors.card }]}>
                    {rejectModal.type === 'suspend' ? 'Suspend' : 'Reject'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Tier Update Modal */}
      <Modal visible={tierModal.visible} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={[s.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[s.modalTitle, { color: colors.text }]}>Update Creator Tier</Text>
            <View style={s.tierOptions}>
              {['starter', 'bronze', 'silver', 'gold', 'platinum'].map(tier => (
                <TouchableOpacity
                  key={tier}
                  style={[
                    s.tierOption,
                    { borderColor: selectedTier === tier ? colors.info : colors.border },
                    selectedTier === tier && { backgroundColor: colors.infoLight },
                  ]}
                  onPress={() => setSelectedTier(tier)}
                >
                  <Text style={[
                    s.tierOptionText,
                    { color: selectedTier === tier ? colors.info : colors.text },
                  ]}>
                    {tier.charAt(0).toUpperCase() + tier.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={s.modalActions}>
              <TouchableOpacity
                style={[s.modalBtn, { backgroundColor: colors.background }]}
                onPress={() => setTierModal({ visible: false, creatorId: '', currentTier: '' })}
              >
                <Text style={[s.modalBtnText, { color: colors.gray700 }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.modalBtn, { backgroundColor: colors.info }]}
                onPress={handleUpdateTier}
                disabled={processing === tierModal.creatorId}
              >
                {processing === tierModal.creatorId ? (
                  <ActivityIndicator size="small" color={colors.card} />
                ) : (
                  <Text style={[s.modalBtnText, { color: colors.card }]}>Update</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ============================================
// STYLES
// ============================================

const s = StyleSheet.create({
  container: { flex: 1 },
  titleBar: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  title: { fontSize: 22, fontWeight: '700' },

  // Stats
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
  },
  statCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  statValue: { fontSize: 20, fontWeight: '700' },
  statLabel: { fontSize: 11, fontWeight: '500', marginTop: 2 },

  // Tabs
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
    backgroundColor: Colors.light.card,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 4,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: Colors.light.info,
  },
  tabText: { fontSize: 14, fontWeight: '600' },

  // Filter chips
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Search
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  searchInput: { flex: 1, fontSize: 14 },

  // List
  list: { padding: 16, gap: 12 },

  // Cards
  card: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardInfo: { flex: 1, marginRight: 12 },
  cardName: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  cardCategory: { fontSize: 12 },
  cardBio: { fontSize: 13, lineHeight: 18, marginBottom: 10 },
  cardStats: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  cardStatText: { fontSize: 12, fontWeight: '500' },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.light.backgroundSecondary,
    paddingTop: 12,
  },

  // Status
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: { fontSize: 11, fontWeight: '600' },

  // Action buttons
  actionBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionBtnText: { color: Colors.light.card, fontSize: 13, fontWeight: '600' },

  // Conversions
  convRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  convAmount: { fontSize: 13, fontWeight: '500' },
  convCommission: { fontSize: 13, fontWeight: '600' },

  // Config
  configTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  configRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.backgroundSecondary,
  },
  configLabel: { fontSize: 14, flex: 1 },
  configValue: { fontSize: 14, fontWeight: '600' },
  configInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 14,
    fontWeight: '600',
    width: 80,
    textAlign: 'right',
  },

  // Empty
  empty: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: { fontSize: 15, fontWeight: '500' },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  modalInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalBtnText: { fontSize: 14, fontWeight: '600' },

  // Tier options
  tierOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  tierOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 2,
  },
  tierOptionText: { fontSize: 14, fontWeight: '600' },
});
