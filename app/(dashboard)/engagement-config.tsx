import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useColorScheme,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';

interface EngagementAction {
  key: string;
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  baseCoins: number;
  bonusCoins: number;
  dailyLimit: number;
  requiresModeration: boolean;
  qualityChecks?: string;
  coinSource: string;
}

/**
 * Hardcoded config matching engagementRewardService.ts ENGAGEMENT_CONFIGS.
 * Phase 6 will replace this with a backend endpoint (EngagementConfig model).
 */
const ENGAGEMENT_ACTIONS: EngagementAction[] = [
  {
    key: 'share_store',
    label: 'Share Store',
    description: 'Users share a store to earn coins. Instant reward.',
    icon: 'share-social',
    iconColor: '#3B82F6',
    baseCoins: 10,
    bonusCoins: 0,
    dailyLimit: 5,
    requiresModeration: false,
    coinSource: 'social_share_reward',
  },
  {
    key: 'share_offer',
    label: 'Share Offer',
    description: 'Users share an offer to earn coins. Instant reward.',
    icon: 'pricetag',
    iconColor: '#10B981',
    baseCoins: 5,
    bonusCoins: 0,
    dailyLimit: 10,
    requiresModeration: false,
    coinSource: 'social_share_reward',
  },
  {
    key: 'poll_vote',
    label: 'Vote in Poll',
    description: 'Users vote in a poll to earn coins. Instant reward.',
    icon: 'bar-chart',
    iconColor: '#6366F1',
    baseCoins: 10,
    bonusCoins: 0,
    dailyLimit: 3,
    requiresModeration: false,
    coinSource: 'poll_vote',
  },
  {
    key: 'offer_comment',
    label: 'Comment on Offer',
    description: 'Users comment on offers. Requires moderation before coins are credited.',
    icon: 'chatbubble-ellipses',
    iconColor: '#D97706',
    baseCoins: 15,
    bonusCoins: 5,
    dailyLimit: 5,
    requiresModeration: true,
    qualityChecks: 'Min 20 chars, +5 bonus for 100+ chars',
    coinSource: 'offer_comment',
  },
  {
    key: 'photo_upload',
    label: 'Upload Photos',
    description: 'Users upload photos of stores/products. Requires moderation.',
    icon: 'camera',
    iconColor: '#EC4899',
    baseCoins: 25,
    bonusCoins: 75,
    dailyLimit: 3,
    requiresModeration: true,
    qualityChecks: 'Min 1 photo, quality bonus on approval',
    coinSource: 'photo_upload',
  },
  {
    key: 'ugc_reel',
    label: 'Create Reel',
    description: 'Users create UGC reels. Requires moderation before publish + coins.',
    icon: 'videocam',
    iconColor: '#EF4444',
    baseCoins: 50,
    bonusCoins: 150,
    dailyLimit: 2,
    requiresModeration: true,
    qualityChecks: 'Min 10s duration, quality bonus on approval',
    coinSource: 'ugc_reel',
  },
  {
    key: 'event_rating',
    label: 'Rate Event',
    description: 'Users rate events they attended. +5 bonus for verified bookings.',
    icon: 'star',
    iconColor: '#F59E0B',
    baseCoins: 20,
    bonusCoins: 5,
    dailyLimit: 3,
    requiresModeration: false,
    qualityChecks: '+5 bonus for verified booking',
    coinSource: 'event_rating',
  },
];

export default function EngagementConfigScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  // Summary stats
  const totalActions = ENGAGEMENT_ACTIONS.length;
  const moderatedActions = ENGAGEMENT_ACTIONS.filter(a => a.requiresModeration).length;
  const instantActions = totalActions - moderatedActions;
  const maxDailyCoins = ENGAGEMENT_ACTIONS.reduce(
    (sum, a) => sum + (a.baseCoins + a.bonusCoins) * a.dailyLimit,
    0
  );

  const renderActionCard = (action: EngagementAction) => {
    const isExpanded = expandedKey === action.key;

    return (
      <TouchableOpacity
        key={action.key}
        style={[styles.actionCard, { backgroundColor: colors.card }]}
        onPress={() => setExpandedKey(isExpanded ? null : action.key)}
        activeOpacity={0.7}
      >
        <View style={styles.actionHeader}>
          <View style={[styles.actionIcon, { backgroundColor: `${action.iconColor}20` }]}>
            <Ionicons name={action.icon} size={20} color={action.iconColor} />
          </View>
          <View style={styles.actionInfo}>
            <Text style={[styles.actionLabel, { color: colors.text }]}>{action.label}</Text>
            <Text style={[styles.actionKey, { color: colors.icon }]}>{action.key}</Text>
          </View>
          <View style={styles.coinDisplay}>
            <Ionicons name="sparkles" size={14} color="#F59E0B" />
            <Text style={styles.coinValue}>
              {action.baseCoins}{action.bonusCoins > 0 ? `+${action.bonusCoins}` : ''}
            </Text>
          </View>
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={colors.icon}
          />
        </View>

        {/* Quick badges */}
        <View style={styles.badgeRow}>
          <View style={[styles.badge, {
            backgroundColor: action.requiresModeration ? '#FEF3C7' : '#D1FAE5',
          }]}>
            <Text style={{
              fontSize: 10,
              fontWeight: '600',
              color: action.requiresModeration ? '#D97706' : '#059669',
            }}>
              {action.requiresModeration ? 'MODERATED' : 'INSTANT'}
            </Text>
          </View>
          <View style={[styles.badge, { backgroundColor: '#EEF2FF' }]}>
            <Text style={{ fontSize: 10, fontWeight: '600', color: '#6366F1' }}>
              {action.dailyLimit}/day
            </Text>
          </View>
        </View>

        {/* Expanded details */}
        {isExpanded && (
          <View style={styles.expandedContent}>
            <Text style={[styles.actionDescription, { color: colors.icon }]}>
              {action.description}
            </Text>

            <View style={styles.detailGrid}>
              <View style={[styles.detailItem, { backgroundColor: `${colors.background}` }]}>
                <Text style={[styles.detailLabel, { color: colors.icon }]}>Base Coins</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>{action.baseCoins}</Text>
              </View>
              <View style={[styles.detailItem, { backgroundColor: `${colors.background}` }]}>
                <Text style={[styles.detailLabel, { color: colors.icon }]}>Bonus Coins</Text>
                <Text style={[styles.detailValue, { color: action.bonusCoins > 0 ? '#10B981' : colors.icon }]}>
                  {action.bonusCoins > 0 ? `+${action.bonusCoins}` : 'None'}
                </Text>
              </View>
              <View style={[styles.detailItem, { backgroundColor: `${colors.background}` }]}>
                <Text style={[styles.detailLabel, { color: colors.icon }]}>Daily Limit</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>{action.dailyLimit}</Text>
              </View>
              <View style={[styles.detailItem, { backgroundColor: `${colors.background}` }]}>
                <Text style={[styles.detailLabel, { color: colors.icon }]}>Max/Day</Text>
                <Text style={[styles.detailValue, { color: '#D97706' }]}>
                  {(action.baseCoins + action.bonusCoins) * action.dailyLimit}
                </Text>
              </View>
            </View>

            {action.qualityChecks && (
              <View style={[styles.qualityRow, { backgroundColor: '#FEF9C3' }]}>
                <Ionicons name="shield-checkmark" size={14} color="#CA8A04" />
                <Text style={{ color: '#CA8A04', fontSize: 12, flex: 1 }}>
                  {action.qualityChecks}
                </Text>
              </View>
            )}

            <View style={styles.sourceRow}>
              <Text style={[styles.sourceLabel, { color: colors.icon }]}>CoinTransaction source:</Text>
              <Text style={[styles.sourceValue, { color: colors.text }]}>{action.coinSource}</Text>
            </View>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <Ionicons name="settings" size={24} color={colors.tint} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Engagement Config</Text>
          <Text style={[styles.headerSubtitle, { color: colors.icon }]}>
            Share & Engage reward settings
          </Text>
        </View>
      </View>

      {/* Summary stats */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.statValue, { color: colors.text }]}>{totalActions}</Text>
          <Text style={[styles.statLabel, { color: colors.icon }]}>Actions</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.statValue, { color: '#10B981' }]}>{instantActions}</Text>
          <Text style={[styles.statLabel, { color: colors.icon }]}>Instant</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.statValue, { color: '#F59E0B' }]}>{moderatedActions}</Text>
          <Text style={[styles.statLabel, { color: colors.icon }]}>Moderated</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.statValue, { color: '#D97706' }]}>{maxDailyCoins}</Text>
          <Text style={[styles.statLabel, { color: colors.icon }]}>Max/Day</Text>
        </View>
      </View>

      {/* Info banner */}
      <View style={[styles.infoBanner, { backgroundColor: '#EFF6FF' }]}>
        <Ionicons name="information-circle" size={18} color="#3B82F6" />
        <Text style={styles.infoText}>
          These values are currently hardcoded in the backend. Admin-editable configuration
          will be added in a future update.
        </Text>
      </View>

      {/* Action cards */}
      <View style={styles.actionsList}>
        {ENGAGEMENT_ACTIONS.map(renderActionCard)}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  headerSubtitle: { fontSize: 12, marginTop: 2 },
  statsRow: { flexDirection: 'row', padding: 16, gap: 8 },
  statCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: { fontSize: 20, fontWeight: '700' },
  statLabel: { fontSize: 10, marginTop: 2 },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    padding: 12,
    borderRadius: 10,
    gap: 8,
  },
  infoText: { flex: 1, fontSize: 12, color: '#3B82F6', lineHeight: 16 },
  actionsList: { padding: 16, paddingTop: 12 },
  actionCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  actionHeader: { flexDirection: 'row', alignItems: 'center' },
  actionIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  actionInfo: { flex: 1, marginLeft: 12 },
  actionLabel: { fontSize: 15, fontWeight: '600' },
  actionKey: { fontSize: 11, marginTop: 1 },
  coinDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 3,
    marginRight: 8,
  },
  coinValue: { fontSize: 12, fontWeight: '700', color: '#D97706' },
  badgeRow: { flexDirection: 'row', marginTop: 8, gap: 6 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  expandedContent: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  actionDescription: { fontSize: 13, lineHeight: 18, marginBottom: 12 },
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  detailItem: { width: '48%', padding: 10, borderRadius: 8, alignItems: 'center' },
  detailLabel: { fontSize: 10, fontWeight: '600' },
  detailValue: { fontSize: 16, fontWeight: '700', marginTop: 2 },
  qualityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
    gap: 6,
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 4,
  },
  sourceLabel: { fontSize: 11 },
  sourceValue: { fontSize: 11, fontWeight: '600', fontFamily: 'monospace' },
});
