/**
 * Privé Admin Page
 * 4-tab interface: Offers | Vouchers | Reputation | Analytics
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Modal,
  SafeAreaView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import priveAdminApi, { PriveOffer, PriveVoucher, PriveAnalytics } from '@/services/api/priveAdmin';
import priveInviteAdminApi, { PriveAccessRecord, PriveInviteCodeAdmin, PriveInviteConfig } from '@/services/api/priveInviteAdmin';
import { priveConfigAdminApi, PriveProgramConfig, TierThresholds, PillarWeights, FeatureFlags, TierConfig } from '@/services/api/priveConfig';
import { priveMissionsAdminApi, PriveMission } from '@/services/api/priveMissions';
import { priveConciergeAdminApi, ConciergeTicket, ConciergeAnalytics } from '@/services/api/priveConcierge';
import { showAlert, showConfirm } from '@/utils/alert';

type Tab = 'offers' | 'vouchers' | 'reputation' | 'analytics' | 'config' | 'habits' | 'smart_spend' | 'invites' | 'program_config' | 'missions' | 'concierge';

export default function PriveAdminScreen() {
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState<Tab>('offers');

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'offers', label: 'Offers', icon: 'pricetag-outline' },
    { key: 'vouchers', label: 'Vouchers', icon: 'ticket-outline' },
    { key: 'reputation', label: 'Reputation', icon: 'shield-outline' },
    { key: 'analytics', label: 'Analytics', icon: 'bar-chart-outline' },
    { key: 'config', label: 'Config', icon: 'settings-outline' },
    { key: 'habits', label: 'Habits', icon: 'fitness-outline' },
    { key: 'smart_spend', label: 'Smart Spend', icon: 'storefront-outline' },
    { key: 'invites', label: 'Invites', icon: 'people-outline' },
    { key: 'program_config', label: 'Program', icon: 'options-outline' },
    { key: 'missions', label: 'Missions', icon: 'flag-outline' },
    { key: 'concierge', label: 'Concierge', icon: 'chatbubble-ellipses-outline' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Privé Management</Text>
      </View>

      {/* Tab Bar */}
      <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.activeTab]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Ionicons
              name={tab.icon as any}
              size={18}
              color={activeTab === tab.key ? '#C9A962' : colors.icon}
            />
            <Text style={[
              styles.tabLabel,
              { color: activeTab === tab.key ? '#C9A962' : colors.secondaryText },
            ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab Content */}
      {activeTab === 'offers' && <OffersTab colors={colors} />}
      {activeTab === 'vouchers' && <VouchersTab colors={colors} />}
      {activeTab === 'reputation' && <ReputationTab colors={colors} />}
      {activeTab === 'analytics' && <AnalyticsTab colors={colors} />}
      {activeTab === 'config' && <RedemptionConfigTab colors={colors} />}
      {activeTab === 'habits' && <HabitLoopsConfigTab colors={colors} />}
      {activeTab === 'smart_spend' && <SmartSpendTab colors={colors} />}
      {activeTab === 'invites' && <InvitesTab colors={colors} />}
      {activeTab === 'program_config' && <ProgramConfigTab colors={colors} />}
      {activeTab === 'missions' && <MissionsTab colors={colors} />}
      {activeTab === 'concierge' && <ConciergeTab colors={colors} />}
    </SafeAreaView>
  );
}

// ==========================================
// Offers Tab
// ==========================================
function OffersTab({ colors }: { colors: any }) {
  const [offers, setOffers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchOffers = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await priveAdminApi.getOffers({ page, limit: 20, search: search || undefined });
      if (res.data?.data) {
        setOffers(res.data.data.offers || []);
        setTotalPages(res.data.data.pagination?.pages || 1);
      }
    } catch (err) {
      console.error('Failed to fetch offers:', err);
    } finally {
      setIsLoading(false);
    }
  }, [page, search]);

  useEffect(() => { fetchOffers(); }, [fetchOffers]);

  const handleToggleStatus = async (id: string) => {
    try {
      await priveAdminApi.toggleOfferStatus(id);
      fetchOffers();
    } catch (err) {
      console.error('Failed to toggle status:', err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await priveAdminApi.deleteOffer(id);
      fetchOffers();
    } catch (err) {
      console.error('Failed to delete offer:', err);
    }
  };

  return (
    <ScrollView
      style={styles.tabContent}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={fetchOffers} />}
    >
      {/* Search */}
      <View style={[styles.searchBar, { backgroundColor: colors.card }]}>
        <Ionicons name="search-outline" size={18} color={colors.icon} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search offers..."
          placeholderTextColor={colors.secondaryText}
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={() => { setPage(1); fetchOffers(); }}
        />
      </View>

      {isLoading && offers.length === 0 ? (
        <ActivityIndicator size="large" color="#C9A962" style={{ marginTop: 40 }} />
      ) : offers.length === 0 ? (
        <Text style={[styles.emptyText, { color: colors.secondaryText }]}>No offers found</Text>
      ) : (
        offers.map((offer: any) => (
          <View key={offer._id} style={[styles.card, { backgroundColor: colors.card }]}>
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>{offer.title}</Text>
                <Text style={[styles.cardSubtitle, { color: colors.secondaryText }]}>
                  {offer.brand?.name || 'Unknown'} | Tier: {offer.tierRequired}
                </Text>
              </View>
              <View style={[
                styles.statusBadge,
                { backgroundColor: offer.isActive ? '#4CAF5020' : '#F4433620' },
              ]}>
                <Text style={{ color: offer.isActive ? '#4CAF50' : '#F44336', fontSize: 11 }}>
                  {offer.isActive ? 'Active' : 'Inactive'}
                </Text>
              </View>
            </View>
            <View style={styles.cardStats}>
              <Text style={[styles.stat, { color: colors.secondaryText }]}>
                Views: {offer.views || 0}
              </Text>
              <Text style={[styles.stat, { color: colors.secondaryText }]}>
                Clicks: {offer.clicks || 0}
              </Text>
              <Text style={[styles.stat, { color: colors.secondaryText }]}>
                Redeemed: {offer.redemptions || 0}
              </Text>
            </View>
            <View style={styles.cardActions}>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#C9A96220' }]}
                onPress={() => handleToggleStatus(offer._id)}
              >
                <Text style={{ color: '#C9A962', fontSize: 12 }}>
                  {offer.isActive ? 'Deactivate' : 'Activate'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#F4433620' }]}
                onPress={() => handleDelete(offer._id)}
              >
                <Text style={{ color: '#F44336', fontSize: 12 }}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <View style={styles.pagination}>
          <TouchableOpacity
            disabled={page <= 1}
            onPress={() => setPage(p => Math.max(1, p - 1))}
          >
            <Text style={{ color: page > 1 ? '#C9A962' : colors.secondaryText }}>Previous</Text>
          </TouchableOpacity>
          <Text style={{ color: colors.text }}>Page {page} of {totalPages}</Text>
          <TouchableOpacity
            disabled={page >= totalPages}
            onPress={() => setPage(p => p + 1)}
          >
            <Text style={{ color: page < totalPages ? '#C9A962' : colors.secondaryText }}>Next</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

// ==========================================
// Vouchers Tab
// ==========================================
function VouchersTab({ colors }: { colors: any }) {
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  const fetchVouchers = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await priveAdminApi.getVouchers({
        status: statusFilter !== 'all' ? statusFilter : undefined,
        search: search || undefined,
      });
      if (res.data?.data) {
        setVouchers(res.data.data.vouchers || []);
      }
    } catch (err) {
      console.error('Failed to fetch vouchers:', err);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => { fetchVouchers(); }, [fetchVouchers]);

  const handleInvalidate = async (id: string) => {
    try {
      await priveAdminApi.invalidateVoucher(id);
      fetchVouchers();
    } catch (err) {
      console.error('Failed to invalidate:', err);
    }
  };

  const handleExtend = async (id: string) => {
    try {
      await priveAdminApi.extendVoucher(id, { extendDays: 30 });
      fetchVouchers();
    } catch (err) {
      console.error('Failed to extend:', err);
    }
  };

  const statuses = ['all', 'active', 'used', 'expired', 'cancelled'];

  return (
    <ScrollView
      style={styles.tabContent}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={fetchVouchers} />}
    >
      {/* Filters */}
      <View style={[styles.searchBar, { backgroundColor: colors.card }]}>
        <Ionicons name="search-outline" size={18} color={colors.icon} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search by code or user..."
          placeholderTextColor={colors.secondaryText}
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={fetchVouchers}
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
        {statuses.map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.filterChip, statusFilter === s && styles.filterChipActive]}
            onPress={() => setStatusFilter(s)}
          >
            <Text style={{ color: statusFilter === s ? '#fff' : colors.secondaryText, fontSize: 12 }}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {isLoading && vouchers.length === 0 ? (
        <ActivityIndicator size="large" color="#C9A962" style={{ marginTop: 40 }} />
      ) : vouchers.length === 0 ? (
        <Text style={[styles.emptyText, { color: colors.secondaryText }]}>No vouchers found</Text>
      ) : (
        vouchers.map((v: any) => (
          <View key={v._id} style={[styles.card, { backgroundColor: colors.card }]}>
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>{v.code}</Text>
                <Text style={[styles.cardSubtitle, { color: colors.secondaryText }]}>
                  {v.type} | {v.coinAmount} {v.coinType || 'rez'} coins | {v.currency} {v.value}
                </Text>
                <Text style={[styles.cardSubtitle, { color: colors.secondaryText }]}>
                  User: {v.userId?.fullName || v.userId?.phoneNumber || v.userId || 'Unknown'}
                </Text>
                <Text style={[styles.cardSubtitle, { color: colors.secondaryText }]}>
                  {v.createdAt ? new Date(v.createdAt).toLocaleString() : ''}{v.expiresAt ? ` | Expires: ${new Date(v.expiresAt).toLocaleDateString()}` : ''}
                </Text>
              </View>
              <View style={[
                styles.statusBadge,
                { backgroundColor: v.status === 'active' ? '#4CAF5020' : v.status === 'cancelled' ? '#F4433620' : '#FF980020' },
              ]}>
                <Text style={{
                  color: v.status === 'active' ? '#4CAF50' : v.status === 'cancelled' ? '#F44336' : '#FF9800',
                  fontSize: 11,
                }}>
                  {v.status}
                </Text>
              </View>
            </View>
            {v.status === 'active' && (
              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: '#FF980020' }]}
                  onPress={() => handleExtend(v._id)}
                >
                  <Text style={{ color: '#FF9800', fontSize: 12 }}>+30 Days</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: '#F4433620' }]}
                  onPress={() => handleInvalidate(v._id)}
                >
                  <Text style={{ color: '#F44336', fontSize: 12 }}>Invalidate</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))
      )}
    </ScrollView>
  );
}

// ==========================================
// Reputation Tab
// ==========================================
function ReputationTab({ colors }: { colors: any }) {
  const [userId, setUserId] = useState('');
  const [reputation, setReputation] = useState<any>(null);
  const [weightedScores, setWeightedScores] = useState<any>(null);
  const [thresholds, setThresholds] = useState<any>(null);
  const [pillarWeights, setPillarWeights] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideScores, setOverrideScores] = useState<Record<string, string>>({});
  const [expandedPillars, setExpandedPillars] = useState<Record<string, boolean>>({});
  const [showHistory, setShowHistory] = useState(false);

  const fetchReputation = async () => {
    if (!userId.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await priveAdminApi.getUserReputation(userId.trim());
      if (res.data?.data) {
        setReputation(res.data.data.reputation);
        setWeightedScores(res.data.data.weightedScores);
        setThresholds(res.data.data.thresholds);
        setPillarWeights(res.data.data.pillarWeights);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'User not found');
      setReputation(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecalculate = async () => {
    if (!userId.trim()) return;
    setIsRecalculating(true);
    setError(null);
    try {
      await priveAdminApi.recalculateReputation(userId.trim());
      await fetchReputation();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Recalculation failed');
    } finally {
      setIsRecalculating(false);
    }
  };

  const handleOverride = async () => {
    if (!userId.trim() || !overrideReason.trim()) return;
    const pillars: Record<string, number> = {};
    for (const [key, val] of Object.entries(overrideScores)) {
      if (val) pillars[key] = parseInt(val, 10);
    }
    if (Object.keys(pillars).length === 0) return;

    try {
      await priveAdminApi.overrideReputation(userId.trim(), { pillars, reason: overrideReason });
      setOverrideScores({});
      setOverrideReason('');
      fetchReputation();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Override failed');
    }
  };

  const togglePillarExpand = (pillar: string) => {
    setExpandedPillars(prev => ({ ...prev, [pillar]: !prev[pillar] }));
  };

  const formatFactorValue = (key: string, value: any): string => {
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (value instanceof Date || (typeof value === 'string' && key.toLowerCase().includes('date'))) {
      try { return new Date(value).toLocaleDateString(); } catch { return String(value); }
    }
    if (Array.isArray(value)) return value.length > 0 ? value.join(', ') : 'None';
    if (typeof value === 'number') {
      if (key.toLowerCase().includes('rate') || key.toLowerCase().includes('score')) return `${value}%`;
      return value.toLocaleString();
    }
    return String(value);
  };

  const pillarNames = ['engagement', 'trust', 'influence', 'economicValue', 'brandAffinity', 'network'];
  const pillarLabels: Record<string, string> = {
    engagement: 'Engagement',
    trust: 'Trust & Integrity',
    influence: 'Influence',
    economicValue: 'Economic Value',
    brandAffinity: 'Brand Affinity',
    network: 'Network & Community',
  };

  return (
    <ScrollView style={styles.tabContent}>
      {/* Search */}
      <View style={[styles.searchBar, { backgroundColor: colors.card }]}>
        <Ionicons name="person-outline" size={18} color={colors.icon} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Enter User ID..."
          placeholderTextColor={colors.secondaryText}
          value={userId}
          onChangeText={setUserId}
          onSubmitEditing={fetchReputation}
        />
        <TouchableOpacity onPress={fetchReputation}>
          <Text style={{ color: '#C9A962' }}>Search</Text>
        </TouchableOpacity>
      </View>

      {isLoading && <ActivityIndicator size="large" color="#C9A962" style={{ marginTop: 40 }} />}
      {error && <Text style={[styles.errorText, { color: '#F44336' }]}>{error}</Text>}

      {reputation && (
        <>
          {/* Score Summary */}
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              Score: {reputation.totalScore?.toFixed(1)} | Tier: {reputation.tier?.toUpperCase()}
            </Text>
            <Text style={[styles.cardSubtitle, { color: colors.secondaryText }]}>
              Eligible: {reputation.isEligible ? 'Yes' : 'No'} | Last Calculated: {
                reputation.lastCalculated ? new Date(reputation.lastCalculated).toLocaleString() : 'Never'
              }
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#4CAF5020', flex: 1, alignItems: 'center', paddingVertical: 10 }]}
              onPress={handleRecalculate}
              disabled={isRecalculating}
            >
              <Text style={{ color: '#4CAF50', fontSize: 13, fontWeight: '600' }}>
                {isRecalculating ? 'Recalculating...' : 'Recalculate from Data'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#2196F320', flex: 1, alignItems: 'center', paddingVertical: 10 }]}
              onPress={() => setShowHistory(!showHistory)}
            >
              <Text style={{ color: '#2196F3', fontSize: 13, fontWeight: '600' }}>
                {showHistory ? 'Hide History' : 'Score History'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Thresholds & Weights Info Card */}
          {thresholds && pillarWeights && (
            <View style={[styles.card, { backgroundColor: colors.card }]}>
              <Text style={[styles.cardTitle, { color: colors.text, marginBottom: 8 }]}>Configuration</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                <View style={[styles.configBadge, { backgroundColor: '#CD7F3220' }]}>
                  <Text style={{ color: '#CD7F32', fontSize: 11 }}>Entry: {thresholds.ENTRY_TIER}+</Text>
                </View>
                <View style={[styles.configBadge, { backgroundColor: '#C0C0C020' }]}>
                  <Text style={{ color: '#C0C0C0', fontSize: 11 }}>Signature: {thresholds.SIGNATURE_TIER}+</Text>
                </View>
                <View style={[styles.configBadge, { backgroundColor: '#FFD70020' }]}>
                  <Text style={{ color: '#FFD700', fontSize: 11 }}>Elite: {thresholds.ELITE_TIER}+</Text>
                </View>
                <View style={[styles.configBadge, { backgroundColor: '#F4433620' }]}>
                  <Text style={{ color: '#F44336', fontSize: 11 }}>Trust Min: {thresholds.TRUST_MINIMUM}</Text>
                </View>
              </View>
              <Text style={[styles.cardSubtitle, { color: colors.secondaryText, marginTop: 8 }]}>
                Weights: {pillarNames.map(p => `${pillarLabels[p]} ${((pillarWeights[p] || 0) * 100).toFixed(0)}%`).join(' | ')}
              </Text>
            </View>
          )}

          {/* Score History */}
          {showHistory && reputation.history && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Score History (Last 20)</Text>
              {(reputation.history as any[]).slice(-20).reverse().map((snap: any, i: number) => (
                <View key={i} style={[styles.card, { backgroundColor: colors.card, paddingVertical: 10 }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ color: colors.text, fontSize: 13, fontWeight: '500' }}>
                      {snap.date ? new Date(snap.date).toLocaleDateString() : 'N/A'}
                    </Text>
                    <Text style={{ color: '#C9A962', fontSize: 13, fontWeight: '600' }}>
                      {snap.totalScore?.toFixed(1)} — {snap.tier?.toUpperCase()}
                    </Text>
                  </View>
                  {snap.trigger && (
                    <Text style={{ color: colors.secondaryText, fontSize: 11, marginTop: 4 }}>
                      Trigger: {snap.trigger}
                    </Text>
                  )}
                </View>
              ))}
              {(!reputation.history || reputation.history.length === 0) && (
                <Text style={{ color: colors.secondaryText, fontSize: 13, textAlign: 'center', marginVertical: 12 }}>
                  No history snapshots yet
                </Text>
              )}
            </>
          )}

          {/* Pillar Scores with Expandable Factors */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Pillar Scores</Text>
          {pillarNames.map((pillar) => {
            const data = reputation.pillars?.[pillar];
            const isExpanded = expandedPillars[pillar];
            const weighted = weightedScores?.[pillar];
            return (
              <View key={pillar} style={[styles.card, { backgroundColor: colors.card }]}>
                <TouchableOpacity onPress={() => togglePillarExpand(pillar)}>
                  <View style={styles.pillarRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.pillarName, { color: colors.text }]}>{pillarLabels[pillar]}</Text>
                      {weighted !== undefined && (
                        <Text style={{ color: colors.secondaryText, fontSize: 11, marginTop: 2 }}>
                          Weighted: {weighted.toFixed(2)} pts
                        </Text>
                      )}
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={[styles.pillarScore, { color: '#C9A962' }]}>
                        {data?.score?.toFixed(0) || 0}
                      </Text>
                      <Ionicons
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={16}
                        color={colors.secondaryText}
                      />
                    </View>
                  </View>
                </TouchableOpacity>

                {/* Expanded Factor Breakdown */}
                {isExpanded && data?.factors && (
                  <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }}>
                    <Text style={{ color: colors.text, fontSize: 12, fontWeight: '600', marginBottom: 8 }}>Factors</Text>
                    {Object.entries(data.factors).map(([key, value]) => (
                      <View key={key} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
                        <Text style={{ color: colors.secondaryText, fontSize: 12 }}>
                          {key.replace(/([A-Z])/g, ' $1').replace(/^./, (s: string) => s.toUpperCase())}
                        </Text>
                        <Text style={{ color: colors.text, fontSize: 12, fontWeight: '500' }}>
                          {formatFactorValue(key, value)}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Override Input */}
                <TextInput
                  style={[styles.overrideInput, { borderColor: colors.border, color: colors.text }]}
                  placeholder="New score (0-100)"
                  placeholderTextColor={colors.secondaryText}
                  keyboardType="numeric"
                  value={overrideScores[pillar] || ''}
                  onChangeText={(val) => setOverrideScores(prev => ({ ...prev, [pillar]: val }))}
                />
              </View>
            );
          })}

          {/* Override Reason + Submit */}
          <TextInput
            style={[styles.reasonInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.card }]}
            placeholder="Reason for override (min 10 chars)..."
            placeholderTextColor={colors.secondaryText}
            value={overrideReason}
            onChangeText={setOverrideReason}
            multiline
          />
          <TouchableOpacity
            style={[styles.submitBtn, { opacity: overrideReason.trim().length >= 10 ? 1 : 0.5 }]}
            onPress={handleOverride}
            disabled={overrideReason.trim().length < 10}
          >
            <Text style={styles.submitBtnText}>Apply Override</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

// ==========================================
// Analytics Tab
// ==========================================
function AnalyticsTab({ colors }: { colors: any }) {
  const [analytics, setAnalytics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      const res = await priveAdminApi.getAnalytics();
      if (res.data?.data) {
        setAnalytics(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchAnalytics(); }, []);

  if (isLoading) {
    return <ActivityIndicator size="large" color="#C9A962" style={{ marginTop: 40 }} />;
  }

  if (!analytics) {
    return <Text style={[styles.emptyText, { color: colors.secondaryText }]}>No data available</Text>;
  }

  const summary = analytics.offerSummary || {};

  return (
    <ScrollView
      style={styles.tabContent}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={fetchAnalytics} />}
    >
      {/* Summary Cards */}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Offer Performance</Text>
      <View style={styles.statsGrid}>
        <StatCard label="Total Offers" value={summary.totalOffers || 0} colors={colors} />
        <StatCard label="Active" value={summary.activeOffers || 0} colors={colors} />
        <StatCard label="Total Views" value={summary.totalViews || 0} colors={colors} />
        <StatCard label="Total Clicks" value={summary.totalClicks || 0} colors={colors} />
        <StatCard label="CTR" value={`${(summary.overallCTR || 0).toFixed(1)}%`} colors={colors} />
        <StatCard label="Redemptions" value={summary.totalRedemptions || 0} colors={colors} />
      </View>

      {/* Tier Distribution */}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>User Tier Distribution</Text>
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        {(analytics.tierDistribution || []).map((item: any) => (
          <View key={item._id} style={styles.distributionRow}>
            <Text style={[styles.distributionLabel, { color: colors.text }]}>
              {item._id || 'none'}
            </Text>
            <Text style={[styles.distributionValue, { color: '#C9A962' }]}>
              {item.count} users
            </Text>
          </View>
        ))}
      </View>

      {/* Voucher Stats */}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Voucher Stats</Text>
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        {(analytics.voucherStats || []).map((item: any) => (
          <View key={item._id} style={styles.distributionRow}>
            <Text style={[styles.distributionLabel, { color: colors.text }]}>
              {item._id}
            </Text>
            <Text style={[styles.distributionValue, { color: colors.secondaryText }]}>
              {item.count} ({item.totalValue?.toLocaleString()} value)
            </Text>
          </View>
        ))}
      </View>

      {/* Top Offers */}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Top Performing Offers</Text>
      {(analytics.topPerformingOffers || []).map((offer: any, i: number) => (
        <View key={offer._id} style={[styles.card, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            #{i + 1} {offer.title}
          </Text>
          <Text style={[styles.cardSubtitle, { color: colors.secondaryText }]}>
            {offer.brand} | Views: {offer.views} | CTR: {offer.ctr?.toFixed(1)}%
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

// Stat Card Component
function StatCard({ label, value, colors }: { label: string; value: string | number; colors: any }) {
  return (
    <View style={[styles.statCard, { backgroundColor: colors.card }]}>
      <Text style={[styles.statValue, { color: '#C9A962' }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.secondaryText }]}>{label}</Text>
    </View>
  );
}

// ==========================================
// Redemption Config Tab
// ==========================================
function RedemptionConfigTab({ colors }: { colors: any }) {
  const [config, setConfig] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Editable state
  const [rates, setRates] = useState({ gift_card: '0.10', bill_pay: '0.10', experience: '0.12', charity: '0.15' });
  const [minCoins, setMinCoins] = useState({ gift_card: '500', bill_pay: '100', experience: '1000', charity: '100' });
  const [expiryDays, setExpiryDays] = useState({ gift_card: '365', bill_pay: '30', experience: '90', charity: '7' });
  const [maxCoins, setMaxCoins] = useState('50000');
  const [dailyLimit, setDailyLimit] = useState('5');
  const [reAuthThreshold, setReAuthThreshold] = useState('5000');

  const fetchConfig = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await priveAdminApi.getRedemptionConfig();
      const rc = res.data?.data?.redemptionConfig;
      if (rc) {
        setConfig(rc);
        if (rc.conversionRates) {
          setRates({
            gift_card: String(rc.conversionRates.gift_card ?? 0.10),
            bill_pay: String(rc.conversionRates.bill_pay ?? 0.10),
            experience: String(rc.conversionRates.experience ?? 0.12),
            charity: String(rc.conversionRates.charity ?? 0.15),
          });
        }
        if (rc.minCoinsPerCategory) {
          setMinCoins({
            gift_card: String(rc.minCoinsPerCategory.gift_card ?? 500),
            bill_pay: String(rc.minCoinsPerCategory.bill_pay ?? 100),
            experience: String(rc.minCoinsPerCategory.experience ?? 1000),
            charity: String(rc.minCoinsPerCategory.charity ?? 100),
          });
        }
        if (rc.expiryDays) {
          setExpiryDays({
            gift_card: String(rc.expiryDays.gift_card ?? 365),
            bill_pay: String(rc.expiryDays.bill_pay ?? 30),
            experience: String(rc.expiryDays.experience ?? 90),
            charity: String(rc.expiryDays.charity ?? 7),
          });
        }
        setMaxCoins(String(rc.maxCoinsPerRedemption ?? 50000));
        setDailyLimit(String(rc.dailyRedemptionLimit ?? 5));
        setReAuthThreshold(String(rc.reAuthThreshold ?? 5000));
      }
    } catch (err) {
      console.error('Failed to fetch config:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await priveAdminApi.updateRedemptionConfig({
        conversionRates: {
          gift_card: parseFloat(rates.gift_card),
          bill_pay: parseFloat(rates.bill_pay),
          experience: parseFloat(rates.experience),
          charity: parseFloat(rates.charity),
        },
        minCoinsPerCategory: {
          gift_card: parseInt(minCoins.gift_card),
          bill_pay: parseInt(minCoins.bill_pay),
          experience: parseInt(minCoins.experience),
          charity: parseInt(minCoins.charity),
        },
        expiryDays: {
          gift_card: parseInt(expiryDays.gift_card),
          bill_pay: parseInt(expiryDays.bill_pay),
          experience: parseInt(expiryDays.experience),
          charity: parseInt(expiryDays.charity),
        },
        maxCoinsPerRedemption: parseInt(maxCoins),
        dailyRedemptionLimit: parseInt(dailyLimit),
        reAuthThreshold: parseInt(reAuthThreshold),
      });
      if (Platform.OS === 'web') {
        window.alert('Configuration saved successfully');
      }
      fetchConfig();
    } catch (err) {
      console.error('Failed to save config:', err);
      if (Platform.OS === 'web') {
        window.alert('Failed to save configuration');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const categories = ['gift_card', 'bill_pay', 'experience', 'charity'];
  const categoryLabels: Record<string, string> = {
    gift_card: 'Gift Card',
    bill_pay: 'Bill Pay',
    experience: 'Experience',
    charity: 'Charity',
  };

  if (isLoading) {
    return (
      <View style={[styles.tabContent, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color="#C9A962" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.tabContent}>
      <Text style={[styles.cardTitle, { color: colors.text, fontSize: 17, marginBottom: 16 }]}>
        Redemption Configuration
      </Text>

      {/* Conversion Rates */}
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>Conversion Rates (coins to currency)</Text>
        <Text style={[styles.cardSubtitle, { color: colors.secondaryText, marginBottom: 12 }]}>
          1 coin = X currency units
        </Text>
        {categories.map((cat) => (
          <View key={cat} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
            <Text style={{ color: colors.text, width: 100, fontSize: 13 }}>{categoryLabels[cat]}</Text>
            <TextInput
              style={[styles.searchInput, {
                backgroundColor: colors.background,
                color: colors.text,
                padding: 8,
                borderRadius: 8,
                flex: 1,
              }]}
              value={(rates as any)[cat]}
              onChangeText={(v) => setRates(prev => ({ ...prev, [cat]: v }))}
              keyboardType="decimal-pad"
            />
          </View>
        ))}
      </View>

      {/* Min Coins */}
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>Minimum Coins per Category</Text>
        {categories.map((cat) => (
          <View key={cat} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
            <Text style={{ color: colors.text, width: 100, fontSize: 13 }}>{categoryLabels[cat]}</Text>
            <TextInput
              style={[styles.searchInput, {
                backgroundColor: colors.background,
                color: colors.text,
                padding: 8,
                borderRadius: 8,
                flex: 1,
              }]}
              value={(minCoins as any)[cat]}
              onChangeText={(v) => setMinCoins(prev => ({ ...prev, [cat]: v }))}
              keyboardType="numeric"
            />
          </View>
        ))}
      </View>

      {/* Expiry Days */}
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>Voucher Expiry Days</Text>
        {categories.map((cat) => (
          <View key={cat} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
            <Text style={{ color: colors.text, width: 100, fontSize: 13 }}>{categoryLabels[cat]}</Text>
            <TextInput
              style={[styles.searchInput, {
                backgroundColor: colors.background,
                color: colors.text,
                padding: 8,
                borderRadius: 8,
                flex: 1,
              }]}
              value={(expiryDays as any)[cat]}
              onChangeText={(v) => setExpiryDays(prev => ({ ...prev, [cat]: v }))}
              keyboardType="numeric"
            />
          </View>
        ))}
      </View>

      {/* Global Limits */}
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>Global Limits</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, marginTop: 8 }}>
          <Text style={{ color: colors.text, width: 140, fontSize: 13 }}>Max coins/redeem</Text>
          <TextInput
            style={[styles.searchInput, {
              backgroundColor: colors.background,
              color: colors.text,
              padding: 8,
              borderRadius: 8,
              flex: 1,
            }]}
            value={maxCoins}
            onChangeText={setMaxCoins}
            keyboardType="numeric"
          />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
          <Text style={{ color: colors.text, width: 140, fontSize: 13 }}>Daily limit</Text>
          <TextInput
            style={[styles.searchInput, {
              backgroundColor: colors.background,
              color: colors.text,
              padding: 8,
              borderRadius: 8,
              flex: 1,
            }]}
            value={dailyLimit}
            onChangeText={setDailyLimit}
            keyboardType="numeric"
          />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
          <Text style={{ color: colors.text, width: 140, fontSize: 13 }}>Re-auth threshold</Text>
          <TextInput
            style={[styles.searchInput, {
              backgroundColor: colors.background,
              color: colors.text,
              padding: 8,
              borderRadius: 8,
              flex: 1,
            }]}
            value={reAuthThreshold}
            onChangeText={setReAuthThreshold}
            keyboardType="numeric"
          />
        </View>
      </View>

      {/* Save Button */}
      <TouchableOpacity
        style={[styles.submitBtn, isSaving && { opacity: 0.6 }]}
        onPress={handleSave}
        disabled={isSaving}
      >
        {isSaving ? (
          <ActivityIndicator size="small" color="#000" />
        ) : (
          <Text style={styles.submitBtnText}>Save Configuration</Text>
        )}
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// ==========================================
// Habit Loops Config Tab
// ==========================================

interface HabitLoopDef {
  id: string;
  name: string;
  icon: string;
  description: string;
  targetCount: number;
  deepLink: string;
  enabled: boolean;
  bonusCoins: number;
}

function HabitLoopsConfigTab({ colors }: { colors: any }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [completionBonus, setCompletionBonus] = useState('25');
  const [streakMultiplier, setStreakMultiplier] = useState('1');
  const [loops, setLoops] = useState<HabitLoopDef[]>([]);

  const fetchConfig = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await priveAdminApi.getRedemptionConfig();
      const hc = res.data?.data?.habitLoopConfig;
      if (hc) {
        setEnabled(hc.enabled !== false);
        setCompletionBonus(String(hc.completionBonusCoins ?? 25));
        setStreakMultiplier(String(hc.streakMultiplier ?? 1));
        if (hc.loops?.length) {
          setLoops(hc.loops.map((l: any) => ({
            id: l.id || '',
            name: l.name || '',
            icon: l.icon || '',
            description: l.description || '',
            targetCount: l.targetCount ?? 1,
            deepLink: l.deepLink || '',
            enabled: l.enabled !== false,
            bonusCoins: l.bonusCoins ?? 0,
          })));
        }
      }
    } catch (err) {
      console.error('Failed to fetch habit loop config:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const updateLoop = (index: number, field: keyof HabitLoopDef, value: any) => {
    setLoops(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await priveAdminApi.updateHabitLoopConfig({
        enabled,
        completionBonusCoins: parseInt(completionBonus) || 25,
        streakMultiplier: parseFloat(streakMultiplier) || 1,
        loops: loops.map(l => ({
          ...l,
          targetCount: Number(l.targetCount) || 1,
          bonusCoins: Number(l.bonusCoins) || 0,
        })),
      });
      if (Platform.OS === 'web') {
        window.alert('Habit loop config saved successfully');
      }
      fetchConfig();
    } catch (err) {
      console.error('Failed to save habit loop config:', err);
      if (Platform.OS === 'web') {
        window.alert('Failed to save habit loop configuration');
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.tabContent, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color="#C9A962" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.tabContent}>
      <Text style={[styles.cardTitle, { color: colors.text, fontSize: 17, marginBottom: 16 }]}>
        Habit Loops Configuration
      </Text>

      {/* Global Settings */}
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>Global Settings</Text>
        <TouchableOpacity
          style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, marginBottom: 10 }}
          onPress={() => setEnabled(!enabled)}
        >
          <View style={{
            width: 20, height: 20, borderRadius: 4,
            borderWidth: 2, borderColor: enabled ? '#C9A962' : colors.border,
            backgroundColor: enabled ? '#C9A962' : 'transparent',
            alignItems: 'center', justifyContent: 'center', marginRight: 10,
          }}>
            {enabled && <Text style={{ color: '#000', fontSize: 12, fontWeight: 'bold' }}>✓</Text>}
          </View>
          <Text style={{ color: colors.text, fontSize: 14 }}>Habit Loops Enabled</Text>
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
          <Text style={{ color: colors.text, width: 160, fontSize: 13 }}>Completion Bonus Coins</Text>
          <TextInput
            style={[styles.searchInput, {
              backgroundColor: colors.background, color: colors.text,
              padding: 8, borderRadius: 8, flex: 1,
            }]}
            value={completionBonus}
            onChangeText={setCompletionBonus}
            keyboardType="numeric"
          />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
          <Text style={{ color: colors.text, width: 160, fontSize: 13 }}>Streak Multiplier</Text>
          <TextInput
            style={[styles.searchInput, {
              backgroundColor: colors.background, color: colors.text,
              padding: 8, borderRadius: 8, flex: 1,
            }]}
            value={streakMultiplier}
            onChangeText={setStreakMultiplier}
            keyboardType="decimal-pad"
          />
        </View>
      </View>

      {/* Loop Definitions */}
      {loops.map((loop, index) => (
        <View key={loop.id || index} style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              {loop.icon} {loop.name || `Loop ${index + 1}`}
            </Text>
            <TouchableOpacity onPress={() => updateLoop(index, 'enabled', !loop.enabled)}>
              <View style={{
                paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
                backgroundColor: loop.enabled ? 'rgba(76,175,80,0.15)' : 'rgba(244,67,54,0.15)',
              }}>
                <Text style={{ fontSize: 11, color: loop.enabled ? '#4CAF50' : '#F44336', fontWeight: '600' }}>
                  {loop.enabled ? 'Enabled' : 'Disabled'}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {([
            { label: 'ID', field: 'id' as const, kb: 'default' },
            { label: 'Name', field: 'name' as const, kb: 'default' },
            { label: 'Icon', field: 'icon' as const, kb: 'default' },
            { label: 'Description', field: 'description' as const, kb: 'default' },
            { label: 'Deep Link', field: 'deepLink' as const, kb: 'default' },
            { label: 'Target Count', field: 'targetCount' as const, kb: 'numeric' },
            { label: 'Bonus Coins', field: 'bonusCoins' as const, kb: 'numeric' },
          ] as const).map(({ label, field, kb }) => (
            <View key={field} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ color: colors.text, width: 110, fontSize: 12 }}>{label}</Text>
              <TextInput
                style={[styles.searchInput, {
                  backgroundColor: colors.background, color: colors.text,
                  padding: 8, borderRadius: 8, flex: 1, fontSize: 13,
                }]}
                value={String(loop[field])}
                onChangeText={(v) => updateLoop(index, field, v)}
                keyboardType={kb as any}
              />
            </View>
          ))}
        </View>
      ))}

      {/* Save Button */}
      <TouchableOpacity
        style={[styles.submitBtn, isSaving && { opacity: 0.6 }]}
        onPress={handleSave}
        disabled={isSaving}
      >
        {isSaving ? (
          <ActivityIndicator size="small" color="#000" />
        ) : (
          <Text style={styles.submitBtnText}>Save Habit Loop Config</Text>
        )}
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// ==========================================
// Smart Spend Tab
// ==========================================
function SmartSpendTab({ colors }: { colors: any }) {
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [sections, setSections] = useState<string[]>([]);

  // Create form state
  const [formItemType, setFormItemType] = useState<'store' | 'product'>('store');
  const [formStoreId, setFormStoreId] = useState('');
  const [formProductId, setFormProductId] = useState('');
  const [formDisplayTitle, setFormDisplayTitle] = useState('');
  const [formDisplayDescription, setFormDisplayDescription] = useState('');
  const [formBannerImage, setFormBannerImage] = useState('');
  const [formBadgeText, setFormBadgeText] = useState('');
  const [formCoinRewardRate, setFormCoinRewardRate] = useState('10');
  const [formCoinDisplayText, setFormCoinDisplayText] = useState('Earn 10% Prive Coins');
  const [formTierRequired, setFormTierRequired] = useState('entry');
  const [formSectionLabel, setFormSectionLabel] = useState('');
  const [formIsFeatured, setFormIsFeatured] = useState(false);
  const [formSortOrder, setFormSortOrder] = useState('0');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchItems = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await priveAdminApi.getSmartSpendItems({
        page,
        limit: 20,
        search: search || undefined,
      });
      if (res.data?.data) {
        setItems(res.data.data.items || []);
        setTotalPages(res.data.data.pagination?.totalPages || 1);
        if (res.data.data.sections) setSections(res.data.data.sections);
      }
    } catch (err) {
      console.error('Failed to fetch Smart Spend items:', err);
    } finally {
      setIsLoading(false);
    }
  }, [page, search]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleToggleStatus = async (id: string) => {
    try {
      await priveAdminApi.toggleSmartSpendItemStatus(id);
      fetchItems();
    } catch (err) {
      console.error('Failed to toggle status:', err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await priveAdminApi.deleteSmartSpendItem(id);
      fetchItems();
    } catch (err) {
      console.error('Failed to delete item:', err);
    }
  };

  const handleCreate = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const data: any = {
        itemType: formItemType,
        coinRewardRate: parseFloat(formCoinRewardRate) / 100, // Convert from percentage to decimal
        coinRewardType: 'percentage',
        coinDisplayText: formCoinDisplayText,
        tierRequired: formTierRequired,
        isFeatured: formIsFeatured,
        sortOrder: parseInt(formSortOrder) || 0,
      };
      if (formItemType === 'store') data.store = formStoreId;
      if (formItemType === 'product') data.product = formProductId;
      if (formDisplayTitle) data.displayTitle = formDisplayTitle;
      if (formDisplayDescription) data.displayDescription = formDisplayDescription;
      if (formBannerImage) data.bannerImage = formBannerImage;
      if (formBadgeText) data.badgeText = formBadgeText;
      if (formSectionLabel) data.sectionLabel = formSectionLabel;

      await priveAdminApi.createSmartSpendItem(data);
      setShowCreateModal(false);
      resetForm();
      fetchItems();
    } catch (err: any) {
      console.error('Failed to create item:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormItemType('store');
    setFormStoreId('');
    setFormProductId('');
    setFormDisplayTitle('');
    setFormDisplayDescription('');
    setFormBannerImage('');
    setFormBadgeText('');
    setFormCoinRewardRate('10');
    setFormCoinDisplayText('Earn 10% Prive Coins');
    setFormTierRequired('entry');
    setFormSectionLabel('');
    setFormIsFeatured(false);
    setFormSortOrder('0');
  };

  const getItemName = (item: any): string => {
    if (item.itemType === 'store') return item.store?.name || item.displayTitle || 'Unknown Store';
    return item.product?.name || item.displayTitle || 'Unknown Product';
  };

  return (
    <ScrollView
      style={styles.tabContent}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={fetchItems} />}
    >
      {/* Header with Add Button */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 0, marginBottom: 0 }]}>
          Smart Spend Catalog ({items.length} items)
        </Text>
        <TouchableOpacity
          style={[styles.submitBtn, { paddingHorizontal: 16, paddingVertical: 8, marginBottom: 0 }]}
          onPress={() => setShowCreateModal(true)}
        >
          <Text style={styles.submitBtnText}>+ Add Item</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={[styles.searchBar, { backgroundColor: colors.card }]}>
        <Ionicons name="search-outline" size={18} color={colors.icon} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search Smart Spend items..."
          placeholderTextColor={colors.secondaryText}
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={() => { setPage(1); fetchItems(); }}
        />
      </View>

      {isLoading && items.length === 0 ? (
        <ActivityIndicator size="large" color="#C9A962" style={{ marginTop: 40 }} />
      ) : items.length === 0 ? (
        <Text style={[styles.emptyText, { color: colors.secondaryText }]}>
          No Smart Spend items. Add stores or products to the curated catalog.
        </Text>
      ) : (
        items.map((item: any) => (
          <View key={item._id} style={[styles.card, { backgroundColor: colors.card }]}>
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>
                  {getItemName(item)}
                </Text>
                <Text style={[styles.cardSubtitle, { color: colors.secondaryText }]}>
                  {item.itemType === 'store' ? 'Store' : 'Product'} | Tier: {item.tierRequired} | Rate: {Math.round((item.coinRewardRate || 0.05) * 100)}%
                </Text>
                {item.sectionLabel && (
                  <Text style={{ color: '#C9A962', fontSize: 11, marginTop: 2 }}>
                    Section: {item.sectionLabel}
                  </Text>
                )}
              </View>
              <View style={[
                styles.statusBadge,
                { backgroundColor: item.isActive ? '#4CAF5020' : '#F4433620' },
              ]}>
                <Text style={{ color: item.isActive ? '#4CAF50' : '#F44336', fontSize: 11 }}>
                  {item.isActive ? 'Active' : 'Inactive'}
                </Text>
              </View>
            </View>
            <View style={styles.cardStats}>
              <Text style={[styles.stat, { color: colors.secondaryText }]}>
                Views: {item.views || 0}
              </Text>
              <Text style={[styles.stat, { color: colors.secondaryText }]}>
                Clicks: {item.clicks || 0}
              </Text>
              <Text style={[styles.stat, { color: colors.secondaryText }]}>
                Purchases: {item.purchases || 0}
              </Text>
              {item.ctr != null && (
                <Text style={[styles.stat, { color: colors.secondaryText }]}>
                  CTR: {item.ctr}%
                </Text>
              )}
            </View>
            {item.badgeText && (
              <Text style={{ color: '#C9A962', fontSize: 12, marginTop: 4 }}>
                Badge: {item.badgeText} | {item.coinDisplayText}
              </Text>
            )}
            <View style={styles.cardActions}>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#C9A96220' }]}
                onPress={() => handleToggleStatus(item._id)}
              >
                <Text style={{ color: '#C9A962', fontSize: 12 }}>
                  {item.isActive ? 'Deactivate' : 'Activate'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#F4433620' }]}
                onPress={() => handleDelete(item._id)}
              >
                <Text style={{ color: '#F44336', fontSize: 12 }}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 12, marginVertical: 16 }}>
          <TouchableOpacity
            disabled={page <= 1}
            onPress={() => setPage(p => Math.max(1, p - 1))}
            style={{ opacity: page <= 1 ? 0.3 : 1 }}
          >
            <Text style={{ color: '#C9A962' }}>Previous</Text>
          </TouchableOpacity>
          <Text style={{ color: colors.secondaryText }}>
            Page {page} of {totalPages}
          </Text>
          <TouchableOpacity
            disabled={page >= totalPages}
            onPress={() => setPage(p => p + 1)}
            style={{ opacity: page >= totalPages ? 0.3 : 1 }}
          >
            <Text style={{ color: '#C9A962' }}>Next</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Create Modal */}
      <Modal visible={showCreateModal} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 }}>
          <View style={{ backgroundColor: colors.card, borderRadius: 16, padding: 20, maxHeight: '85%' }}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Add Smart Spend Item</Text>

              {/* Item Type */}
              <Text style={{ color: colors.secondaryText, marginBottom: 4, fontSize: 13 }}>Item Type</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                {(['store', 'product'] as const).map(type => (
                  <TouchableOpacity
                    key={type}
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                      borderRadius: 8,
                      alignItems: 'center',
                      backgroundColor: formItemType === type ? '#C9A96230' : colors.background,
                      borderWidth: 1,
                      borderColor: formItemType === type ? '#C9A962' : colors.border,
                    }}
                    onPress={() => setFormItemType(type)}
                  >
                    <Text style={{ color: formItemType === type ? '#C9A962' : colors.text, fontSize: 14, fontWeight: '500' }}>
                      {type === 'store' ? 'Store' : 'Product'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Store/Product ID */}
              <Text style={{ color: colors.secondaryText, marginBottom: 4, fontSize: 13 }}>
                {formItemType === 'store' ? 'Store ID' : 'Product ID'}
              </Text>
              <TextInput
                style={[styles.reasonInput, { color: colors.text, borderColor: colors.border }]}
                placeholder={`Paste ${formItemType} ID from database`}
                placeholderTextColor={colors.secondaryText}
                value={formItemType === 'store' ? formStoreId : formProductId}
                onChangeText={formItemType === 'store' ? setFormStoreId : setFormProductId}
              />

              {/* Display Title */}
              <Text style={{ color: colors.secondaryText, marginBottom: 4, fontSize: 13 }}>Display Title (optional override)</Text>
              <TextInput
                style={[styles.reasonInput, { color: colors.text, borderColor: colors.border }]}
                placeholder="Custom display title"
                placeholderTextColor={colors.secondaryText}
                value={formDisplayTitle}
                onChangeText={setFormDisplayTitle}
              />

              {/* Display Description */}
              <Text style={{ color: colors.secondaryText, marginBottom: 4, fontSize: 13 }}>Description (optional)</Text>
              <TextInput
                style={[styles.reasonInput, { color: colors.text, borderColor: colors.border, minHeight: 60 }]}
                placeholder="Curated description"
                placeholderTextColor={colors.secondaryText}
                value={formDisplayDescription}
                onChangeText={setFormDisplayDescription}
                multiline
              />

              {/* Banner Image */}
              <Text style={{ color: colors.secondaryText, marginBottom: 4, fontSize: 13 }}>Banner Image URL (optional)</Text>
              <TextInput
                style={[styles.reasonInput, { color: colors.text, borderColor: colors.border }]}
                placeholder="https://..."
                placeholderTextColor={colors.secondaryText}
                value={formBannerImage}
                onChangeText={setFormBannerImage}
              />

              {/* Badge Text */}
              <Text style={{ color: colors.secondaryText, marginBottom: 4, fontSize: 13 }}>Badge Text (optional, e.g. "2x Coins")</Text>
              <TextInput
                style={[styles.reasonInput, { color: colors.text, borderColor: colors.border }]}
                placeholder="2x Coins"
                placeholderTextColor={colors.secondaryText}
                value={formBadgeText}
                onChangeText={setFormBadgeText}
              />

              {/* Coin Reward Rate */}
              <Text style={{ color: colors.secondaryText, marginBottom: 4, fontSize: 13 }}>Coin Reward Rate (%)</Text>
              <TextInput
                style={[styles.reasonInput, { color: colors.text, borderColor: colors.border }]}
                placeholder="10"
                placeholderTextColor={colors.secondaryText}
                value={formCoinRewardRate}
                onChangeText={(text) => {
                  setFormCoinRewardRate(text);
                  setFormCoinDisplayText(`Earn ${text}% Prive Coins`);
                }}
                keyboardType="numeric"
              />

              {/* Coin Display Text */}
              <Text style={{ color: colors.secondaryText, marginBottom: 4, fontSize: 13 }}>Coin Display Text</Text>
              <TextInput
                style={[styles.reasonInput, { color: colors.text, borderColor: colors.border }]}
                placeholder="Earn 10% Prive Coins"
                placeholderTextColor={colors.secondaryText}
                value={formCoinDisplayText}
                onChangeText={setFormCoinDisplayText}
              />

              {/* Tier Required */}
              <Text style={{ color: colors.secondaryText, marginBottom: 4, fontSize: 13 }}>Tier Required</Text>
              <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
                {['none', 'entry', 'signature', 'elite'].map(tier => (
                  <TouchableOpacity
                    key={tier}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 6,
                      backgroundColor: formTierRequired === tier ? '#C9A96230' : colors.background,
                      borderWidth: 1,
                      borderColor: formTierRequired === tier ? '#C9A962' : colors.border,
                    }}
                    onPress={() => setFormTierRequired(tier)}
                  >
                    <Text style={{ color: formTierRequired === tier ? '#C9A962' : colors.text, fontSize: 12, textTransform: 'capitalize' }}>
                      {tier}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Section Label */}
              <Text style={{ color: colors.secondaryText, marginBottom: 4, fontSize: 13 }}>Section Label (for grouping)</Text>
              <TextInput
                style={[styles.reasonInput, { color: colors.text, borderColor: colors.border }]}
                placeholder="e.g. Premium Dining, Fashion Picks"
                placeholderTextColor={colors.secondaryText}
                value={formSectionLabel}
                onChangeText={setFormSectionLabel}
              />
              {sections.length > 0 && (
                <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
                  {sections.map(s => (
                    <TouchableOpacity
                      key={s}
                      style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, backgroundColor: '#C9A96215' }}
                      onPress={() => setFormSectionLabel(s)}
                    >
                      <Text style={{ color: '#C9A962', fontSize: 11 }}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Sort Order & Featured */}
              <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.secondaryText, marginBottom: 4, fontSize: 13 }}>Sort Order</Text>
                  <TextInput
                    style={[styles.reasonInput, { color: colors.text, borderColor: colors.border, marginBottom: 0 }]}
                    placeholder="0"
                    placeholderTextColor={colors.secondaryText}
                    value={formSortOrder}
                    onChangeText={setFormSortOrder}
                    keyboardType="numeric"
                  />
                </View>
                <View style={{ flex: 1, justifyContent: 'flex-end' }}>
                  <TouchableOpacity
                    style={{
                      paddingVertical: 12,
                      borderRadius: 10,
                      alignItems: 'center',
                      backgroundColor: formIsFeatured ? '#C9A96230' : colors.background,
                      borderWidth: 1,
                      borderColor: formIsFeatured ? '#C9A962' : colors.border,
                    }}
                    onPress={() => setFormIsFeatured(!formIsFeatured)}
                  >
                    <Text style={{ color: formIsFeatured ? '#C9A962' : colors.text, fontSize: 14, fontWeight: '500' }}>
                      {formIsFeatured ? 'Featured' : 'Not Featured'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Actions */}
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
                <TouchableOpacity
                  style={{ flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center', backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border }}
                  onPress={() => { setShowCreateModal(false); resetForm(); }}
                >
                  <Text style={{ color: colors.text, fontSize: 15 }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.submitBtn, { flex: 1, marginBottom: 0, opacity: isSubmitting ? 0.5 : 1 }]}
                  onPress={handleCreate}
                  disabled={isSubmitting}
                >
                  <Text style={styles.submitBtnText}>
                    {isSubmitting ? 'Creating...' : 'Create Item'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// ==========================================
// Invites & Access Tab
// ==========================================
function InvitesTab({ colors }: { colors: any }) {
  const [subTab, setSubTab] = useState<'access' | 'codes' | 'config' | 'analytics'>('access');
  const [accessList, setAccessList] = useState<any[]>([]);
  const [inviteCodes, setInviteCodes] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [config, setConfig] = useState<PriveInviteConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  // Grant access form
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [grantForm, setGrantForm] = useState({ identifier: '', reason: '', tierOverride: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Revoke form
  const [revokeTarget, setRevokeTarget] = useState<any>(null);
  const [revokeReason, setRevokeReason] = useState('');
  const [revokeAction, setRevokeAction] = useState<'suspend' | 'revoke' | 'remove_whitelist'>('suspend');
  // Config editing
  const [editConfig, setEditConfig] = useState<PriveInviteConfig | null>(null);
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  const fetchAccessList = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await priveInviteAdminApi.getAccessList({
        page,
        limit: 20,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        search: search || undefined,
      });
      if (res.data?.data) {
        setAccessList(res.data.data.accessList || res.data.data || []);
        setTotalPages(res.data.data.pagination?.pages || 1);
      }
    } catch (err) {
      console.error('Failed to fetch access list:', err);
    } finally {
      setIsLoading(false);
    }
  }, [page, statusFilter, search]);

  const fetchInviteCodes = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await priveInviteAdminApi.getInviteCodes({
        page,
        limit: 20,
        search: search || undefined,
      });
      if (res.data?.data) {
        setInviteCodes(res.data.data.codes || res.data.data || []);
        setTotalPages(res.data.data.pagination?.pages || 1);
      }
    } catch (err) {
      console.error('Failed to fetch invite codes:', err);
    } finally {
      setIsLoading(false);
    }
  }, [page, search]);

  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await priveInviteAdminApi.getInviteAnalytics();
      if (res.data?.data) {
        setAnalytics(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchConfig = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await priveInviteAdminApi.getInviteConfig();
      if (res.data?.data) {
        setConfig(res.data.data);
        setEditConfig(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch config:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (subTab === 'access') fetchAccessList();
    else if (subTab === 'codes') fetchInviteCodes();
    else if (subTab === 'analytics') fetchAnalytics();
    else if (subTab === 'config') fetchConfig();
  }, [subTab, fetchAccessList, fetchInviteCodes, fetchAnalytics, fetchConfig]);

  const handleGrantAccess = async () => {
    if (!grantForm.identifier.trim() || !grantForm.reason.trim()) return;
    setIsSubmitting(true);
    try {
      const isEmail = grantForm.identifier.includes('@');
      const isPhone = grantForm.identifier.startsWith('+');
      const payload: any = { reason: grantForm.reason };
      if (grantForm.tierOverride) payload.tierOverride = grantForm.tierOverride;
      if (isEmail) payload.email = grantForm.identifier.trim();
      else if (isPhone) payload.phone = grantForm.identifier.trim();
      else payload.userId = grantForm.identifier.trim();

      await priveInviteAdminApi.grantAccess(payload);
      setShowGrantModal(false);
      setGrantForm({ identifier: '', reason: '', tierOverride: '' });
      fetchAccessList();
    } catch (err: any) {
      console.error('Grant failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevoke = async () => {
    if (!revokeTarget || !revokeReason.trim()) return;
    setIsSubmitting(true);
    try {
      await priveInviteAdminApi.revokeAccess({
        userId: revokeTarget.userId,
        action: revokeAction,
        reason: revokeReason,
      });
      setRevokeTarget(null);
      setRevokeReason('');
      fetchAccessList();
    } catch (err: any) {
      console.error('Revoke failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeactivateCode = async (id: string) => {
    try {
      await priveInviteAdminApi.deactivateCode(id);
      fetchInviteCodes();
    } catch (err) {
      console.error('Deactivate failed:', err);
    }
  };

  const handleSaveConfig = async () => {
    if (!editConfig) return;
    setIsSavingConfig(true);
    try {
      await priveInviteAdminApi.updateInviteConfig(editConfig);
      setConfig(editConfig);
    } catch (err) {
      console.error('Save config failed:', err);
    } finally {
      setIsSavingConfig(false);
    }
  };

  const subTabs = [
    { key: 'access' as const, label: 'Access' },
    { key: 'codes' as const, label: 'Codes' },
    { key: 'config' as const, label: 'Config' },
    { key: 'analytics' as const, label: 'Analytics' },
  ];

  return (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {/* Sub-tabs */}
      <View style={{ flexDirection: 'row', marginBottom: 16, gap: 8 }}>
        {subTabs.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[
              styles.filterChip,
              subTab === t.key && styles.filterChipActive,
            ]}
            onPress={() => { setSubTab(t.key); setPage(1); setSearch(''); }}
          >
            <Text style={{ color: subTab === t.key ? '#000' : colors.secondaryText, fontSize: 13, fontWeight: '500' }}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ACCESS SUB-TAB */}
      {subTab === 'access' && (
        <>
          {/* Search + Grant */}
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
            <View style={[styles.searchBar, { backgroundColor: colors.card, flex: 1 }]}>
              <Ionicons name="search" size={18} color={colors.icon} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Search by name, phone, email..."
                placeholderTextColor={colors.secondaryText}
                value={search}
                onChangeText={setSearch}
                onSubmitEditing={() => { setPage(1); fetchAccessList(); }}
              />
            </View>
            <TouchableOpacity
              style={[styles.submitBtn, { marginBottom: 0, paddingHorizontal: 16 }]}
              onPress={() => setShowGrantModal(true)}
            >
              <Text style={styles.submitBtnText}>+ Grant</Text>
            </TouchableOpacity>
          </View>

          {/* Status filters */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
            {['all', 'active', 'suspended', 'revoked'].map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.filterChip, statusFilter === s && styles.filterChipActive]}
                onPress={() => { setStatusFilter(s); setPage(1); }}
              >
                <Text style={{ color: statusFilter === s ? '#000' : colors.secondaryText, fontSize: 12 }}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {isLoading ? (
            <ActivityIndicator size="large" color="#C9A962" style={{ marginTop: 40 }} />
          ) : accessList.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.secondaryText }]}>No access records found</Text>
          ) : (
            accessList.map((record: any) => (
              <View key={record._id} style={[styles.card, { backgroundColor: colors.card }]}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardTitle, { color: colors.text }]}>
                      {record.userName || record.userId}
                    </Text>
                    <Text style={[styles.cardSubtitle, { color: colors.secondaryText }]}>
                      {record.userPhone || record.userEmail || ''}
                    </Text>
                  </View>
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: record.status === 'active' ? '#1a472a' : record.status === 'suspended' ? '#4a3520' : '#4a1a1a' }
                  ]}>
                    <Text style={{ color: record.status === 'active' ? '#4ade80' : record.status === 'suspended' ? '#fbbf24' : '#f87171', fontSize: 11, fontWeight: '600' }}>
                      {record.status}
                    </Text>
                  </View>
                </View>

                <View style={styles.cardStats}>
                  <Text style={[styles.stat, { color: colors.secondaryText }]}>
                    Method: {record.grantMethod?.replace('_', ' ')}
                  </Text>
                  {record.isWhitelisted && (
                    <Text style={[styles.stat, { color: '#C9A962' }]}>Whitelisted</Text>
                  )}
                  {record.tierOverride && (
                    <Text style={[styles.stat, { color: '#C9A962' }]}>Tier: {record.tierOverride}</Text>
                  )}
                  {record.inviteCodeUsed && (
                    <Text style={[styles.stat, { color: colors.secondaryText }]}>Code: {record.inviteCodeUsed}</Text>
                  )}
                </View>

                <View style={styles.cardActions}>
                  {record.status === 'active' && (
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: '#4a3520' }]}
                      onPress={() => { setRevokeTarget(record); setRevokeAction('suspend'); }}
                    >
                      <Text style={{ color: '#fbbf24', fontSize: 12 }}>Suspend</Text>
                    </TouchableOpacity>
                  )}
                  {record.status === 'active' && (
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: '#4a1a1a' }]}
                      onPress={() => { setRevokeTarget(record); setRevokeAction('revoke'); }}
                    >
                      <Text style={{ color: '#f87171', fontSize: 12 }}>Revoke</Text>
                    </TouchableOpacity>
                  )}
                  {record.isWhitelisted && (
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: '#2a2a2a' }]}
                      onPress={() => { setRevokeTarget(record); setRevokeAction('remove_whitelist'); }}
                    >
                      <Text style={{ color: colors.secondaryText, fontSize: 12 }}>Remove Whitelist</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <View style={styles.pagination}>
              <TouchableOpacity
                onPress={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                <Text style={{ color: page <= 1 ? colors.secondaryText : '#C9A962' }}>Previous</Text>
              </TouchableOpacity>
              <Text style={{ color: colors.secondaryText }}>Page {page} of {totalPages}</Text>
              <TouchableOpacity
                onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                <Text style={{ color: page >= totalPages ? colors.secondaryText : '#C9A962' }}>Next</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Grant Access Modal */}
          <Modal visible={showGrantModal} transparent animationType="fade">
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 }}>
              <View style={{ backgroundColor: colors.card, borderRadius: 16, padding: 20, maxHeight: '80%' }}>
                <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text, marginBottom: 16 }}>
                  Grant Prive Access
                </Text>

                <Text style={{ fontSize: 13, color: colors.secondaryText, marginBottom: 6 }}>User ID, Email, or Phone</Text>
                <TextInput
                  style={[styles.reasonInput, { borderColor: colors.border, color: colors.text }]}
                  placeholder="e.g. +918210224305 or user@email.com"
                  placeholderTextColor={colors.secondaryText}
                  value={grantForm.identifier}
                  onChangeText={(t) => setGrantForm((f) => ({ ...f, identifier: t }))}
                />

                <Text style={{ fontSize: 13, color: colors.secondaryText, marginBottom: 6 }}>Reason</Text>
                <TextInput
                  style={[styles.reasonInput, { borderColor: colors.border, color: colors.text }]}
                  placeholder="Reason for granting access"
                  placeholderTextColor={colors.secondaryText}
                  value={grantForm.reason}
                  onChangeText={(t) => setGrantForm((f) => ({ ...f, reason: t }))}
                />

                <Text style={{ fontSize: 13, color: colors.secondaryText, marginBottom: 6 }}>Tier Override (optional)</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                  {['', 'entry', 'signature', 'elite'].map((t) => (
                    <TouchableOpacity
                      key={t}
                      style={[styles.filterChip, grantForm.tierOverride === t && styles.filterChipActive]}
                      onPress={() => setGrantForm((f) => ({ ...f, tierOverride: t }))}
                    >
                      <Text style={{ color: grantForm.tierOverride === t ? '#000' : colors.secondaryText, fontSize: 12 }}>
                        {t || 'None'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <TouchableOpacity
                    style={{ flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center', backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border }}
                    onPress={() => setShowGrantModal(false)}
                  >
                    <Text style={{ color: colors.text, fontSize: 15 }}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.submitBtn, { flex: 1, marginBottom: 0, opacity: isSubmitting ? 0.5 : 1 }]}
                    onPress={handleGrantAccess}
                    disabled={isSubmitting}
                  >
                    <Text style={styles.submitBtnText}>{isSubmitting ? 'Granting...' : 'Grant Access'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

          {/* Revoke Modal */}
          <Modal visible={!!revokeTarget} transparent animationType="fade">
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 }}>
              <View style={{ backgroundColor: colors.card, borderRadius: 16, padding: 20 }}>
                <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text, marginBottom: 8 }}>
                  {revokeAction === 'suspend' ? 'Suspend' : revokeAction === 'revoke' ? 'Revoke' : 'Remove Whitelist'}
                </Text>
                <Text style={{ color: colors.secondaryText, marginBottom: 16 }}>
                  User: {revokeTarget?.userName || revokeTarget?.userId}
                </Text>

                <TextInput
                  style={[styles.reasonInput, { borderColor: colors.border, color: colors.text }]}
                  placeholder="Reason"
                  placeholderTextColor={colors.secondaryText}
                  value={revokeReason}
                  onChangeText={setRevokeReason}
                />

                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <TouchableOpacity
                    style={{ flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center', backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border }}
                    onPress={() => { setRevokeTarget(null); setRevokeReason(''); }}
                  >
                    <Text style={{ color: colors.text, fontSize: 15 }}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.submitBtn, { flex: 1, marginBottom: 0, backgroundColor: '#dc2626', opacity: isSubmitting ? 0.5 : 1 }]}
                    onPress={handleRevoke}
                    disabled={isSubmitting}
                  >
                    <Text style={[styles.submitBtnText, { color: '#fff' }]}>
                      {isSubmitting ? 'Processing...' : 'Confirm'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        </>
      )}

      {/* CODES SUB-TAB */}
      {subTab === 'codes' && (
        <>
          <View style={[styles.searchBar, { backgroundColor: colors.card }]}>
            <Ionicons name="search" size={18} color={colors.icon} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search by code or creator..."
              placeholderTextColor={colors.secondaryText}
              value={search}
              onChangeText={setSearch}
              onSubmitEditing={() => { setPage(1); fetchInviteCodes(); }}
            />
          </View>

          {isLoading ? (
            <ActivityIndicator size="large" color="#C9A962" style={{ marginTop: 40 }} />
          ) : inviteCodes.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.secondaryText }]}>No invite codes found</Text>
          ) : (
            inviteCodes.map((code: any) => (
              <View key={code._id} style={[styles.card, { backgroundColor: colors.card }]}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardTitle, { color: '#C9A962', letterSpacing: 1 }]}>{code.code}</Text>
                    <Text style={[styles.cardSubtitle, { color: colors.secondaryText }]}>
                      Creator: {code.creatorName || code.creatorId} ({code.creatorTier})
                    </Text>
                  </View>
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: code.isActive ? '#1a472a' : '#4a1a1a' }
                  ]}>
                    <Text style={{ color: code.isActive ? '#4ade80' : '#f87171', fontSize: 11, fontWeight: '600' }}>
                      {code.isActive ? 'Active' : 'Inactive'}
                    </Text>
                  </View>
                </View>

                <View style={styles.cardStats}>
                  <Text style={[styles.stat, { color: colors.secondaryText }]}>
                    Usage: {code.usageCount}/{code.maxUses}
                  </Text>
                  <Text style={[styles.stat, { color: colors.secondaryText }]}>
                    Expires: {new Date(code.expiresAt).toLocaleDateString()}
                  </Text>
                </View>

                {code.isActive && (
                  <View style={styles.cardActions}>
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: '#4a1a1a' }]}
                      onPress={() => handleDeactivateCode(code._id)}
                    >
                      <Text style={{ color: '#f87171', fontSize: 12 }}>Deactivate</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))
          )}

          {totalPages > 1 && (
            <View style={styles.pagination}>
              <TouchableOpacity onPress={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                <Text style={{ color: page <= 1 ? colors.secondaryText : '#C9A962' }}>Previous</Text>
              </TouchableOpacity>
              <Text style={{ color: colors.secondaryText }}>Page {page} of {totalPages}</Text>
              <TouchableOpacity onPress={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
                <Text style={{ color: page >= totalPages ? colors.secondaryText : '#C9A962' }}>Next</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}

      {/* CONFIG SUB-TAB */}
      {subTab === 'config' && (
        <>
          {isLoading ? (
            <ActivityIndicator size="large" color="#C9A962" style={{ marginTop: 40 }} />
          ) : editConfig ? (
            <>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Invite System Configuration</Text>

              {[
                { key: 'enabled', label: 'System Enabled', type: 'toggle' },
                { key: 'inviterRewardCoins', label: 'Inviter Reward (coins)', type: 'number' },
                { key: 'inviteeRewardCoins', label: 'Invitee Reward (coins)', type: 'number' },
                { key: 'maxCodesPerUser', label: 'Max Codes Per User', type: 'number' },
                { key: 'codeExpiryDays', label: 'Code Expiry (days)', type: 'number' },
                { key: 'maxUsesPerCode', label: 'Max Uses Per Code', type: 'number' },
                { key: 'cooldownHours', label: 'Cooldown (hours)', type: 'number' },
                { key: 'fraudBlockThreshold', label: 'Fraud Block Threshold', type: 'number' },
              ].map((field) => (
                <View key={field.key} style={{ marginBottom: 16 }}>
                  <Text style={{ fontSize: 13, color: colors.secondaryText, marginBottom: 6 }}>{field.label}</Text>
                  {field.type === 'toggle' ? (
                    <TouchableOpacity
                      style={[
                        styles.filterChip,
                        (editConfig as any)[field.key] && styles.filterChipActive,
                        { alignSelf: 'flex-start' },
                      ]}
                      onPress={() => setEditConfig((c) => c ? { ...c, [field.key]: !(c as any)[field.key] } : c)}
                    >
                      <Text style={{ color: (editConfig as any)[field.key] ? '#000' : colors.secondaryText, fontSize: 13 }}>
                        {(editConfig as any)[field.key] ? 'Enabled' : 'Disabled'}
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <TextInput
                      style={[styles.overrideInput, { borderColor: colors.border, color: colors.text }]}
                      value={String((editConfig as any)[field.key] || '')}
                      onChangeText={(t) => setEditConfig((c) => c ? { ...c, [field.key]: parseInt(t) || 0 } : c)}
                      keyboardType="numeric"
                    />
                  )}
                </View>
              ))}

              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 13, color: colors.secondaryText, marginBottom: 6 }}>Min Tier to Invite</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {['entry', 'signature', 'elite'].map((t) => (
                    <TouchableOpacity
                      key={t}
                      style={[styles.filterChip, editConfig.minTierToInvite === t && styles.filterChipActive]}
                      onPress={() => setEditConfig((c) => c ? { ...c, minTierToInvite: t as any } : c)}
                    >
                      <Text style={{ color: editConfig.minTierToInvite === t ? '#000' : colors.secondaryText, fontSize: 12 }}>
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TouchableOpacity
                style={[styles.submitBtn, { opacity: isSavingConfig ? 0.5 : 1 }]}
                onPress={handleSaveConfig}
                disabled={isSavingConfig}
              >
                <Text style={styles.submitBtnText}>{isSavingConfig ? 'Saving...' : 'Save Configuration'}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <Text style={[styles.emptyText, { color: colors.secondaryText }]}>Failed to load config</Text>
          )}
        </>
      )}

      {/* ANALYTICS SUB-TAB */}
      {subTab === 'analytics' && (
        <>
          {isLoading ? (
            <ActivityIndicator size="large" color="#C9A962" style={{ marginTop: 40 }} />
          ) : analytics ? (
            <>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Access Overview</Text>
              <View style={styles.statsGrid}>
                {[
                  { label: 'Total Access', value: analytics.totalAccess || 0 },
                  { label: 'Active', value: analytics.activeAccess || 0 },
                  { label: 'Whitelisted', value: analytics.whitelistedCount || 0 },
                  { label: 'Total Codes', value: analytics.totalCodes || 0 },
                  { label: 'Active Codes', value: analytics.activeCodes || 0 },
                  { label: 'Total Uses', value: analytics.totalUsage || 0 },
                ].map((s, i) => (
                  <View key={i} style={[styles.statCard, { backgroundColor: colors.card }]}>
                    <Text style={[styles.statValue, { color: '#C9A962' }]}>{s.value}</Text>
                    <Text style={[styles.statLabel, { color: colors.secondaryText }]}>{s.label}</Text>
                  </View>
                ))}
              </View>

              {analytics.byMethod && analytics.byMethod.length > 0 && (
                <>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>By Grant Method</Text>
                  {analytics.byMethod.map((m: any, i: number) => (
                    <View key={i} style={styles.distributionRow}>
                      <Text style={[styles.distributionLabel, { color: colors.text }]}>
                        {(m._id || 'unknown').replace('_', ' ')}
                      </Text>
                      <Text style={[styles.distributionValue, { color: '#C9A962' }]}>{m.count}</Text>
                    </View>
                  ))}
                </>
              )}

              {analytics.topInviters && analytics.topInviters.length > 0 && (
                <>
                  <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 16 }]}>Top Inviters</Text>
                  {analytics.topInviters.map((inv: any, i: number) => (
                    <View key={i} style={[styles.card, { backgroundColor: colors.card }]}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={[styles.cardTitle, { color: colors.text }]}>{inv.name || inv.userId}</Text>
                        <Text style={{ color: '#C9A962', fontWeight: '600' }}>{inv.totalInvites} invites</Text>
                      </View>
                    </View>
                  ))}
                </>
              )}
            </>
          ) : (
            <Text style={[styles.emptyText, { color: colors.secondaryText }]}>No analytics data</Text>
          )}
        </>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// ==========================================
// Program Config Tab
// ==========================================
function ProgramConfigTab({ colors }: { colors: any }) {
  const [config, setConfig] = useState<PriveProgramConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editSection, setEditSection] = useState<'thresholds' | 'weights' | 'flags' | null>(null);
  const [thresholds, setThresholds] = useState<TierThresholds>({ entryTier: 50, signatureTier: 70, eliteTier: 85, trustMinimum: 60 });
  const [weights, setWeights] = useState<PillarWeights>({ engagement: 0.25, trust: 0.20, influence: 0.20, economicValue: 0.15, brandAffinity: 0.10, network: 0.10 });
  const [flags, setFlags] = useState<FeatureFlags>({ offersEnabled: true, missionsEnabled: true, conciergeEnabled: true, smartSpendEnabled: true, redemptionEnabled: true, analyticsEnabled: true, invitesEnabled: true });

  const fetchConfig = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await priveConfigAdminApi.getProgramConfig();
      setConfig(data);
      if (data.tierThresholds) setThresholds(data.tierThresholds);
      if (data.pillarWeights) setWeights(data.pillarWeights);
      if (data.featureFlags) setFlags(data.featureFlags);
    } catch (err) {
      console.error('[ProgramConfig] Failed to fetch:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const saveThresholds = async () => {
    setIsSaving(true);
    try {
      await priveConfigAdminApi.updateTierThresholds(thresholds);
      setEditSection(null);
      fetchConfig();
    } catch (err) {
      console.error('[ProgramConfig] Failed to save thresholds:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const saveWeights = async () => {
    setIsSaving(true);
    try {
      await priveConfigAdminApi.updatePillarWeights(weights);
      setEditSection(null);
      fetchConfig();
    } catch (err) {
      console.error('[ProgramConfig] Failed to save weights:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleFlag = async (key: keyof FeatureFlags) => {
    const updated = { ...flags, [key]: !flags[key] };
    setFlags(updated);
    try {
      await priveConfigAdminApi.updateFeatureFlags({ [key]: updated[key] });
    } catch (err) {
      console.error('[ProgramConfig] Failed to toggle flag:', err);
      setFlags(flags); // revert
    }
  };

  const weightsSum = Object.values(weights).reduce((s, v) => s + v, 0);

  if (isLoading) return <ActivityIndicator size="large" color="#C9A962" style={{ marginTop: 40 }} />;

  return (
    <ScrollView style={styles.tabContent} refreshControl={<RefreshControl refreshing={isLoading} onRefresh={fetchConfig} />}>
      {/* Tier Thresholds */}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Tier Thresholds</Text>
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        {(['entryTier', 'signatureTier', 'eliteTier', 'trustMinimum'] as const).map((key) => (
          <View key={key} style={[styles.pillarRow, { paddingVertical: 8 }]}>
            <Text style={[styles.pillarName, { color: colors.text }]}>
              {key === 'entryTier' ? 'Entry' : key === 'signatureTier' ? 'Signature' : key === 'eliteTier' ? 'Elite' : 'Trust Min'}
            </Text>
            {editSection === 'thresholds' ? (
              <TextInput
                style={[styles.overrideInput, { color: colors.text, borderColor: colors.border, width: 80 }]}
                keyboardType="numeric"
                value={String(thresholds[key])}
                onChangeText={(v) => setThresholds({ ...thresholds, [key]: Number(v) || 0 })}
              />
            ) : (
              <Text style={[styles.pillarScore, { color: '#C9A962' }]}>{thresholds[key]}</Text>
            )}
          </View>
        ))}
        {editSection === 'thresholds' ? (
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
            <TouchableOpacity style={[styles.submitBtn, { flex: 1 }]} onPress={saveThresholds} disabled={isSaving}>
              <Text style={styles.submitBtnText}>{isSaving ? 'Saving...' : 'Save'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.submitBtn, { flex: 1, backgroundColor: '#666' }]} onPress={() => setEditSection(null)}>
              <Text style={styles.submitBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={[styles.submitBtn, { marginTop: 12 }]} onPress={() => setEditSection('thresholds')}>
            <Text style={styles.submitBtnText}>Edit Thresholds</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Pillar Weights */}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Pillar Weights (sum: {weightsSum.toFixed(2)})</Text>
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        {(Object.keys(weights) as (keyof PillarWeights)[]).map((key) => (
          <View key={key} style={[styles.pillarRow, { paddingVertical: 8 }]}>
            <Text style={[styles.pillarName, { color: colors.text }]}>{key}</Text>
            {editSection === 'weights' ? (
              <TextInput
                style={[styles.overrideInput, { color: colors.text, borderColor: colors.border, width: 80 }]}
                keyboardType="numeric"
                value={String(weights[key])}
                onChangeText={(v) => setWeights({ ...weights, [key]: parseFloat(v) || 0 })}
              />
            ) : (
              <Text style={[styles.pillarScore, { color: '#C9A962' }]}>{(weights[key] * 100).toFixed(0)}%</Text>
            )}
          </View>
        ))}
        {editSection === 'weights' ? (
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
            <TouchableOpacity
              style={[styles.submitBtn, { flex: 1, opacity: Math.abs(weightsSum - 1) > 0.01 ? 0.5 : 1 }]}
              onPress={saveWeights}
              disabled={isSaving || Math.abs(weightsSum - 1) > 0.01}
            >
              <Text style={styles.submitBtnText}>{isSaving ? 'Saving...' : 'Save'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.submitBtn, { flex: 1, backgroundColor: '#666' }]} onPress={() => setEditSection(null)}>
              <Text style={styles.submitBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={[styles.submitBtn, { marginTop: 12 }]} onPress={() => setEditSection('weights')}>
            <Text style={styles.submitBtnText}>Edit Weights</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Feature Flags */}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Feature Flags</Text>
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        {(Object.keys(flags) as (keyof FeatureFlags)[]).map((key) => (
          <View key={key} style={[styles.pillarRow, { paddingVertical: 10 }]}>
            <Text style={[styles.pillarName, { color: colors.text }]}>{key.replace('Enabled', '')}</Text>
            <TouchableOpacity
              onPress={() => toggleFlag(key)}
              style={[styles.configBadge, { backgroundColor: flags[key] ? '#1A5D1A22' : '#D32F2F22' }]}
            >
              <Text style={{ color: flags[key] ? '#1A5D1A' : '#D32F2F', fontWeight: '600', fontSize: 13 }}>
                {flags[key] ? 'ON' : 'OFF'}
              </Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>

      {/* Tier Benefits Summary */}
      {config?.tiers && (
        <>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Tier Configuration</Text>
          {config.tiers.map((tier) => (
            <View key={tier.tier} style={[styles.card, { backgroundColor: colors.card, marginBottom: 10 }]}>
              <View style={styles.cardHeader}>
                <Text style={[styles.cardTitle, { color: tier.color || colors.text }]}>{tier.displayName}</Text>
                <View style={[styles.statusBadge, { backgroundColor: '#C9A96222' }]}>
                  <Text style={{ color: '#C9A962', fontSize: 12 }}>{tier.coinMultiplier}x</Text>
                </View>
              </View>
              <Text style={[styles.cardSubtitle, { color: colors.secondaryText }]}>
                SLA: {tier.conciergeResponseSLA}h | Invites: {tier.inviteCodesLimit} | Concierge: {tier.conciergeAccess ? 'Yes' : 'No'}
              </Text>
              {tier.benefits?.length > 0 && (
                <Text style={{ color: colors.secondaryText, fontSize: 12, marginTop: 4 }}>
                  Benefits: {tier.benefits.join(', ')}
                </Text>
              )}
            </View>
          ))}
        </>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// ==========================================
// Missions Tab
// ==========================================
function MissionsTab({ colors }: { colors: any }) {
  const [missions, setMissions] = useState<PriveMission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newMission, setNewMission] = useState({
    title: '', description: '', targetPillar: 'engagement', actionType: 'order',
    targetCount: 1, reward: { coins: 50, coinType: 'rez', pillarBoost: 1 },
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    tierRequired: 'none', maxParticipants: 100, priority: 1,
  });

  const [editingMission, setEditingMission] = useState<PriveMission | null>(null);

  const fetchMissions = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await priveMissionsAdminApi.getMissions({
        page, limit: 20, status: statusFilter || undefined,
      });
      setMissions(res.missions || []);
      setTotalPages(res.pagination?.pages || 1);
    } catch (err) {
      console.error('[Missions] Failed to fetch:', err);
      showAlert('Error', 'Failed to load missions. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => { fetchMissions(); }, [fetchMissions]);

  const validateMission = (mission: typeof newMission): string | null => {
    if (!mission.title.trim()) return 'Title is required';
    if (!mission.description.trim()) return 'Description is required';
    if (mission.targetCount < 1) return 'Target count must be at least 1';
    if (mission.reward.coins < 1) return 'Reward coins must be at least 1';
    if (mission.reward.coins > 10000) return 'Reward coins cannot exceed 10,000';
    if (mission.maxParticipants < 1) return 'Max participants must be at least 1';
    if (new Date(mission.endDate) <= new Date(mission.startDate)) return 'End date must be after start date';
    return null;
  };

  const handleCreate = async () => {
    const error = validateMission(newMission);
    if (error) { showAlert('Validation Error', error); return; }
    try {
      await priveMissionsAdminApi.createMission(newMission as any);
      setShowCreate(false);
      showAlert('Success', 'Mission created successfully');
      fetchMissions();
    } catch (err: any) {
      console.error('[Missions] Failed to create:', err);
      showAlert('Error', err?.message || 'Failed to create mission. Please try again.');
    }
  };

  const handleUpdate = async () => {
    if (!editingMission) return;
    const asForm = {
      title: editingMission.title,
      description: editingMission.description || '',
      targetPillar: editingMission.targetPillar,
      actionType: editingMission.actionType,
      targetCount: editingMission.targetCount,
      reward: editingMission.reward || { coins: 50, coinType: 'rez', pillarBoost: 1 },
      startDate: editingMission.startDate,
      endDate: editingMission.endDate,
      tierRequired: editingMission.tierRequired || 'none',
      maxParticipants: editingMission.maxParticipants || 100,
      priority: editingMission.priority || 1,
    };
    const error = validateMission(asForm);
    if (error) { showAlert('Validation Error', error); return; }
    try {
      await priveMissionsAdminApi.updateMission(editingMission._id, asForm as any);
      setEditingMission(null);
      showAlert('Success', 'Mission updated successfully');
      fetchMissions();
    } catch (err: any) {
      console.error('[Missions] Failed to update:', err);
      showAlert('Error', err?.message || 'Failed to update mission. Please try again.');
    }
  };

  const handleDelete = async (id: string) => {
    showConfirm('Delete Mission', 'Are you sure you want to delete this mission? This cannot be undone.', async () => {
      try {
        await priveMissionsAdminApi.deleteMission(id);
        showAlert('Deleted', 'Mission deleted successfully');
        fetchMissions();
      } catch (err: any) {
        console.error('[Missions] Failed to delete:', err);
        showAlert('Error', err?.message || 'Failed to delete mission.');
      }
    });
  };

  return (
    <ScrollView style={styles.tabContent} refreshControl={<RefreshControl refreshing={isLoading} onRefresh={fetchMissions} />}>
      {/* Filters */}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        {['', 'active', 'inactive', 'expired'].map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.configBadge, { backgroundColor: statusFilter === s ? '#C9A96233' : colors.card }]}
            onPress={() => { setStatusFilter(s); setPage(1); }}
          >
            <Text style={{ color: statusFilter === s ? '#C9A962' : colors.secondaryText, fontSize: 13 }}>
              {s || 'All'}
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={[styles.submitBtn, { paddingVertical: 6, paddingHorizontal: 16 }]} onPress={() => setShowCreate(!showCreate)}>
          <Text style={styles.submitBtnText}>{showCreate ? 'Cancel' : '+ New Mission'}</Text>
        </TouchableOpacity>
      </View>

      {/* Create Form */}
      {showCreate && (
        <View style={[styles.card, { backgroundColor: colors.card, marginBottom: 16 }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>New Mission</Text>
          {[
            { key: 'title', label: 'Title', placeholder: 'e.g. Complete 3 Orders' },
            { key: 'description', label: 'Description', placeholder: 'Mission description' },
          ].map(({ key, label, placeholder }) => (
            <View key={key} style={{ marginBottom: 8 }}>
              <Text style={{ color: colors.secondaryText, fontSize: 12, marginBottom: 4 }}>{label}</Text>
              <TextInput
                style={[styles.overrideInput, { color: colors.text, borderColor: colors.border }]}
                placeholder={placeholder}
                placeholderTextColor={colors.secondaryText}
                value={(newMission as any)[key]}
                onChangeText={(v) => setNewMission({ ...newMission, [key]: v })}
              />
            </View>
          ))}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1, marginBottom: 8 }}>
              <Text style={{ color: colors.secondaryText, fontSize: 12, marginBottom: 4 }}>Target Count</Text>
              <TextInput
                style={[styles.overrideInput, { color: colors.text, borderColor: colors.border }]}
                keyboardType="numeric"
                value={String(newMission.targetCount)}
                onChangeText={(v) => setNewMission({ ...newMission, targetCount: Number(v) || 1 })}
              />
            </View>
            <View style={{ flex: 1, marginBottom: 8 }}>
              <Text style={{ color: colors.secondaryText, fontSize: 12, marginBottom: 4 }}>Reward Coins</Text>
              <TextInput
                style={[styles.overrideInput, { color: colors.text, borderColor: colors.border }]}
                keyboardType="numeric"
                value={String(newMission.reward.coins)}
                onChangeText={(v) => setNewMission({ ...newMission, reward: { ...newMission.reward, coins: Number(v) || 0 } })}
              />
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1, marginBottom: 8 }}>
              <Text style={{ color: colors.secondaryText, fontSize: 12, marginBottom: 4 }}>Pillar</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
                {['engagement', 'trust', 'influence', 'economicValue', 'brandAffinity', 'network'].map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[styles.configBadge, { backgroundColor: newMission.targetPillar === p ? '#C9A96233' : colors.background }]}
                    onPress={() => setNewMission({ ...newMission, targetPillar: p })}
                  >
                    <Text style={{ color: newMission.targetPillar === p ? '#C9A962' : colors.secondaryText, fontSize: 11 }}>{p}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
          <TouchableOpacity style={[styles.submitBtn, { marginTop: 8 }]} onPress={handleCreate}>
            <Text style={styles.submitBtnText}>Create Mission</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Edit Form */}
      {editingMission && (
        <View style={[styles.card, { backgroundColor: colors.card, marginBottom: 16, borderWidth: 1, borderColor: '#C9A962' }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Edit Mission</Text>
          {[
            { key: 'title', label: 'Title' },
            { key: 'description', label: 'Description' },
          ].map(({ key, label }) => (
            <View key={key} style={{ marginBottom: 8 }}>
              <Text style={{ color: colors.secondaryText, fontSize: 12, marginBottom: 4 }}>{label}</Text>
              <TextInput
                style={[styles.overrideInput, { color: colors.text, borderColor: colors.border }]}
                value={(editingMission as any)[key] || ''}
                onChangeText={(v) => setEditingMission({ ...editingMission, [key]: v })}
              />
            </View>
          ))}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1, marginBottom: 8 }}>
              <Text style={{ color: colors.secondaryText, fontSize: 12, marginBottom: 4 }}>Target Count</Text>
              <TextInput
                style={[styles.overrideInput, { color: colors.text, borderColor: colors.border }]}
                keyboardType="numeric"
                value={String(editingMission.targetCount || 1)}
                onChangeText={(v) => setEditingMission({ ...editingMission, targetCount: Number(v) || 1 })}
              />
            </View>
            <View style={{ flex: 1, marginBottom: 8 }}>
              <Text style={{ color: colors.secondaryText, fontSize: 12, marginBottom: 4 }}>Reward Coins</Text>
              <TextInput
                style={[styles.overrideInput, { color: colors.text, borderColor: colors.border }]}
                keyboardType="numeric"
                value={String(editingMission.reward?.coins || 50)}
                onChangeText={(v) => setEditingMission({ ...editingMission, reward: { ...editingMission.reward, coins: Number(v) || 0 } })}
              />
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1, marginBottom: 8 }}>
              <Text style={{ color: colors.secondaryText, fontSize: 12, marginBottom: 4 }}>Max Participants</Text>
              <TextInput
                style={[styles.overrideInput, { color: colors.text, borderColor: colors.border }]}
                keyboardType="numeric"
                value={String(editingMission.maxParticipants || 100)}
                onChangeText={(v) => setEditingMission({ ...editingMission, maxParticipants: Number(v) || 100 })}
              />
            </View>
            <View style={{ flex: 1, marginBottom: 8 }}>
              <Text style={{ color: colors.secondaryText, fontSize: 12, marginBottom: 4 }}>Active</Text>
              <TouchableOpacity
                style={[styles.configBadge, { backgroundColor: editingMission.isActive ? '#1A5D1A22' : '#D32F2F22', paddingVertical: 8 }]}
                onPress={() => setEditingMission({ ...editingMission, isActive: !editingMission.isActive })}
              >
                <Text style={{ color: editingMission.isActive ? '#1A5D1A' : '#D32F2F', fontSize: 13 }}>
                  {editingMission.isActive ? 'Active' : 'Inactive'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            <TouchableOpacity style={[styles.submitBtn, { flex: 1 }]} onPress={handleUpdate}>
              <Text style={styles.submitBtnText}>Save Changes</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.configBadge, { flex: 1, alignItems: 'center', paddingVertical: 10, backgroundColor: colors.background }]}
              onPress={() => setEditingMission(null)}
            >
              <Text style={{ color: colors.secondaryText }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Mission List */}
      {isLoading && missions.length === 0 ? (
        <ActivityIndicator size="large" color="#C9A962" style={{ marginTop: 40 }} />
      ) : missions.length === 0 ? (
        <Text style={[styles.emptyText, { color: colors.secondaryText }]}>No missions found</Text>
      ) : (
        missions.map((m) => (
          <View key={m._id} style={[styles.card, { backgroundColor: colors.card, marginBottom: 10 }]}>
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>{m.title}</Text>
                <Text style={[styles.cardSubtitle, { color: colors.secondaryText }]}>
                  {m.targetPillar} | {m.actionType} x{m.targetCount} | Tier: {m.tierRequired}
                </Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: m.isActive ? '#1A5D1A22' : '#D32F2F22' }]}>
                <Text style={{ color: m.isActive ? '#1A5D1A' : '#D32F2F', fontSize: 12 }}>
                  {m.isActive ? 'Active' : 'Inactive'}
                </Text>
              </View>
            </View>
            <Text style={{ color: colors.secondaryText, fontSize: 12, marginTop: 4 }}>
              Reward: {m.reward?.coins || 0} coins | Participants: {m.currentParticipants}/{m.maxParticipants}
            </Text>
            <Text style={{ color: colors.secondaryText, fontSize: 11, marginTop: 2 }}>
              {new Date(m.startDate).toLocaleDateString()} — {new Date(m.endDate).toLocaleDateString()}
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <TouchableOpacity
                style={[styles.configBadge, { backgroundColor: '#C9A96222' }]}
                onPress={() => setEditingMission(m)}
              >
                <Text style={{ color: '#C9A962', fontSize: 12 }}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.configBadge, { backgroundColor: '#D32F2F22' }]}
                onPress={() => handleDelete(m._id)}
              >
                <Text style={{ color: '#D32F2F', fontSize: 12 }}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <View style={styles.pagination}>
          <TouchableOpacity disabled={page <= 1} onPress={() => setPage(p => p - 1)}>
            <Text style={{ color: page <= 1 ? colors.secondaryText : '#C9A962' }}>← Prev</Text>
          </TouchableOpacity>
          <Text style={{ color: colors.secondaryText }}>Page {page} of {totalPages}</Text>
          <TouchableOpacity disabled={page >= totalPages} onPress={() => setPage(p => p + 1)}>
            <Text style={{ color: page >= totalPages ? colors.secondaryText : '#C9A962' }}>Next →</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// ==========================================
// Concierge Tab
// ==========================================
function ConciergeTab({ colors }: { colors: any }) {
  const [tickets, setTickets] = useState<ConciergeTicket[]>([]);
  const [analytics, setAnalytics] = useState<ConciergeAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<ConciergeTicket | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [ticketRes, analyticsRes] = await Promise.all([
        priveConciergeAdminApi.getTickets({
          page, limit: 20, status: statusFilter || undefined,
        }),
        priveConciergeAdminApi.getAnalytics(),
      ]);
      setTickets(ticketRes.tickets || []);
      setTotalPages(ticketRes.pagination?.pages || 1);
      setAnalytics(analyticsRes);
    } catch (err) {
      console.error('[Concierge] Failed to fetch:', err);
    } finally {
      setIsLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleReply = async (ticketId: string) => {
    if (!replyMessage.trim()) return;
    setIsSending(true);
    try {
      await priveConciergeAdminApi.respondToTicket(ticketId, replyMessage);
      setReplyMessage('');
      setSelectedTicket(null);
      fetchData();
    } catch (err) {
      console.error('[Concierge] Failed to reply:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleResolve = async (ticketId: string) => {
    try {
      await priveConciergeAdminApi.resolveTicket(ticketId);
      fetchData();
    } catch (err) {
      console.error('[Concierge] Failed to resolve:', err);
    }
  };

  const tierColor = (tier: string) => {
    if (tier === 'elite') return '#FFD700';
    if (tier === 'signature') return '#C0C0C0';
    return '#CD7F32';
  };

  return (
    <ScrollView style={styles.tabContent} refreshControl={<RefreshControl refreshing={isLoading} onRefresh={fetchData} />}>
      {/* Analytics Summary */}
      {analytics && (
        <View style={[styles.statsGrid, { marginBottom: 16 }]}>
          {[
            { label: 'Total (30d)', value: analytics.totalTickets },
            { label: 'Open', value: analytics.openTickets },
            { label: 'SLA Compliance', value: `${analytics.slaComplianceRate}%` },
            { label: 'SLA Breached', value: analytics.slaBreached },
            { label: 'Avg Response', value: analytics.avgResponseHours ? `${analytics.avgResponseHours}h` : 'N/A' },
          ].map((s, i) => (
            <View key={i} style={[styles.statCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.statValue, { color: '#C9A962' }]}>{s.value}</Text>
              <Text style={[styles.statLabel, { color: colors.secondaryText }]}>{s.label}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Filters */}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        {['', 'open', 'in_progress', 'resolved', 'closed'].map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.configBadge, { backgroundColor: statusFilter === s ? '#C9A96233' : colors.card }]}
            onPress={() => { setStatusFilter(s); setPage(1); }}
          >
            <Text style={{ color: statusFilter === s ? '#C9A962' : colors.secondaryText, fontSize: 13 }}>
              {s || 'All'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Ticket List */}
      {isLoading && tickets.length === 0 ? (
        <ActivityIndicator size="large" color="#C9A962" style={{ marginTop: 40 }} />
      ) : tickets.length === 0 ? (
        <Text style={[styles.emptyText, { color: colors.secondaryText }]}>No tickets found</Text>
      ) : (
        tickets.map((ticket) => (
          <View key={ticket._id} style={[styles.card, { backgroundColor: colors.card, marginBottom: 10 }]}>
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>{ticket.subject}</Text>
                <Text style={[styles.cardSubtitle, { color: colors.secondaryText }]}>
                  #{ticket.ticketNumber} | {ticket.user?.fullName || ticket.user?.phoneNumber || 'Unknown'}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <View style={[styles.statusBadge, { backgroundColor: ticket.status === 'open' ? '#FF980022' : ticket.status === 'resolved' ? '#1A5D1A22' : '#2196F322' }]}>
                  <Text style={{ color: ticket.status === 'open' ? '#FF9800' : ticket.status === 'resolved' ? '#1A5D1A' : '#2196F3', fontSize: 12 }}>
                    {ticket.status}
                  </Text>
                </View>
                <View style={[styles.configBadge, { backgroundColor: tierColor(ticket.priveTier) + '22' }]}>
                  <Text style={{ color: tierColor(ticket.priveTier), fontSize: 11, fontWeight: '600' }}>{ticket.priveTier}</Text>
                </View>
              </View>
            </View>

            {ticket.slaBreached && (
              <View style={{ backgroundColor: '#D32F2F22', padding: 6, borderRadius: 6, marginTop: 6 }}>
                <Text style={{ color: '#D32F2F', fontSize: 12, fontWeight: '600' }}>SLA BREACHED</Text>
              </View>
            )}

            <Text style={{ color: colors.secondaryText, fontSize: 11, marginTop: 4 }}>
              SLA: {ticket.slaHours}h | Created: {new Date(ticket.createdAt).toLocaleDateString()}
              {ticket.assignedTo ? ` | Agent: ${ticket.assignedTo.name}` : ''}
            </Text>

            {/* Actions */}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <TouchableOpacity
                style={[styles.configBadge, { backgroundColor: '#2196F322' }]}
                onPress={() => setSelectedTicket(selectedTicket?._id === ticket._id ? null : ticket)}
              >
                <Text style={{ color: '#2196F3', fontSize: 12 }}>
                  {selectedTicket?._id === ticket._id ? 'Hide' : 'Reply'}
                </Text>
              </TouchableOpacity>
              {!['resolved', 'closed'].includes(ticket.status) && (
                <TouchableOpacity
                  style={[styles.configBadge, { backgroundColor: '#1A5D1A22' }]}
                  onPress={() => handleResolve(ticket._id)}
                >
                  <Text style={{ color: '#1A5D1A', fontSize: 12 }}>Resolve</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Reply Form */}
            {selectedTicket?._id === ticket._id && (
              <View style={{ marginTop: 8 }}>
                {ticket.messages?.map((msg, i) => (
                  <View key={i} style={{
                    padding: 8, borderRadius: 8, marginBottom: 4,
                    backgroundColor: msg.senderType === 'user' ? colors.background : '#C9A96211',
                  }}>
                    <Text style={{ color: msg.senderType === 'user' ? colors.secondaryText : '#C9A962', fontSize: 11, fontWeight: '600' }}>
                      {msg.senderType === 'user' ? 'User' : 'Agent'}
                    </Text>
                    <Text style={{ color: colors.text, fontSize: 13 }}>{msg.message}</Text>
                  </View>
                ))}
                <TextInput
                  style={[styles.reasonInput, { color: colors.text, borderColor: colors.border, marginTop: 8 }]}
                  placeholder="Type your reply..."
                  placeholderTextColor={colors.secondaryText}
                  value={replyMessage}
                  onChangeText={setReplyMessage}
                  multiline
                />
                <TouchableOpacity
                  style={[styles.submitBtn, { opacity: isSending ? 0.5 : 1 }]}
                  onPress={() => handleReply(ticket._id)}
                  disabled={isSending}
                >
                  <Text style={styles.submitBtnText}>{isSending ? 'Sending...' : 'Send Reply'}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <View style={styles.pagination}>
          <TouchableOpacity disabled={page <= 1} onPress={() => setPage(p => p - 1)}>
            <Text style={{ color: page <= 1 ? colors.secondaryText : '#C9A962' }}>← Prev</Text>
          </TouchableOpacity>
          <Text style={{ color: colors.secondaryText }}>Page {page} of {totalPages}</Text>
          <TouchableOpacity disabled={page >= totalPages} onPress={() => setPage(p => p + 1)}>
            <Text style={{ color: page >= totalPages ? colors.secondaryText : '#C9A962' }}>Next →</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// ==========================================
// Styles
// ==========================================
const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 22, fontWeight: '700' },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: 8,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#C9A962',
  },
  tabLabel: { fontSize: 13, fontWeight: '500' },
  tabContent: { flex: 1, padding: 16 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    gap: 8,
    marginBottom: 12,
  },
  searchInput: { flex: 1, fontSize: 14 },
  filterRow: { marginBottom: 12, maxHeight: 36 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#2a2a2a',
    marginRight: 8,
  },
  filterChipActive: { backgroundColor: '#C9A962' },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardTitle: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  cardSubtitle: { fontSize: 12, marginTop: 2 },
  cardStats: { flexDirection: 'row', gap: 16, marginTop: 12 },
  stat: { fontSize: 12 },
  cardActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  actionBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  emptyText: { textAlign: 'center', marginTop: 40, fontSize: 14 },
  errorText: { textAlign: 'center', marginTop: 20, fontSize: 14 },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginTop: 8, marginBottom: 12 },
  pillarRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pillarName: { fontSize: 14, fontWeight: '500' },
  pillarScore: { fontSize: 18, fontWeight: '600' },
  overrideInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
    fontSize: 13,
  },
  reasonInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    fontSize: 14,
  },
  submitBtn: {
    backgroundColor: '#C9A962',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginBottom: 24,
  },
  submitBtnText: { color: '#000', fontSize: 15, fontWeight: '600' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  statCard: {
    width: '31%',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  statValue: { fontSize: 20, fontWeight: '600' },
  statLabel: { fontSize: 11, marginTop: 4, textAlign: 'center' },
  distributionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#333',
  },
  distributionLabel: { fontSize: 14 },
  distributionValue: { fontSize: 14, fontWeight: '500' },
  configBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
});
