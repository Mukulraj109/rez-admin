import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useColorScheme,
  TextInput,
  Switch,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { showAlert } from '../../utils/alert';
import { engagementConfigService, EngagementConfigItem } from '../../services/api/engagementConfig';

const ACTION_DISPLAY: Record<string, { label: string; icon: string; iconColor: string }> = {
  share_store:       { label: 'Share Store',       icon: 'share-social',         iconColor: Colors.light.info },
  share_offer:       { label: 'Share Offer',       icon: 'pricetag',             iconColor: Colors.light.success },
  poll_vote:         { label: 'Vote in Poll',      icon: 'bar-chart',            iconColor: Colors.light.indigo },
  offer_comment:     { label: 'Comment on Offer',  icon: 'chatbubble-ellipses',  iconColor: Colors.light.warningDark },
  photo_upload:      { label: 'Upload Photos',     icon: 'camera',               iconColor: Colors.light.pink },
  ugc_reel:          { label: 'Create Reel',       icon: 'videocam',             iconColor: Colors.light.error },
  event_rating:      { label: 'Rate Event',        icon: 'star',                 iconColor: Colors.light.warning },
  social_media_post: { label: 'Social Media Post', icon: 'logo-instagram',       iconColor: '#E1306C' },
  check_in:          { label: 'Daily Check-In',    icon: 'checkmark-circle',     iconColor: Colors.light.success },
  bill_upload:       { label: 'Bill Upload',       icon: 'receipt',              iconColor: Colors.light.info },
  referral:          { label: 'Refer a Friend',    icon: 'people',               iconColor: Colors.light.indigo },
};

export default function EngagementConfigScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [configs, setConfigs] = useState<EngagementConfigItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, Partial<EngagementConfigItem>>>({});

  const load = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      const data = await engagementConfigService.getAll();
      setConfigs(data);
      setEdits({});
    } catch {
      showAlert('Error', 'Failed to load engagement config');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateEdit = (action: string, field: string, value: any) => {
    setEdits(prev => ({ ...prev, [action]: { ...prev[action], [field]: value } }));
  };

  const getVal = (config: EngagementConfigItem, field: keyof EngagementConfigItem): any =>
    edits[config.action]?.[field] !== undefined ? edits[config.action]![field] : config[field];

  const saveAction = async (config: EngagementConfigItem) => {
    const patch = edits[config.action];
    if (!patch || Object.keys(patch).length === 0) return;
    setSaving(config.action);
    try {
      await engagementConfigService.update(config.action, patch);
      showAlert('Saved', `${ACTION_DISPLAY[config.action]?.label ?? config.action} config updated.`);
      setEdits(prev => { const n = { ...prev }; delete n[config.action]; return n; });
      load();
    } catch {
      showAlert('Error', 'Failed to save config');
    } finally {
      setSaving(null);
    }
  };

  // Summary stats from live data
  const totalActions = configs.length;
  const moderatedActions = configs.filter(c => c.requiresModeration).length;
  const instantActions = totalActions - moderatedActions;
  const maxDailyCoins = configs.reduce(
    (sum, c) => sum + (c.baseCoins + c.bonusCoins) * c.dailyLimit,
    0
  );

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.tint} />
        <Text style={{ color: colors.icon, marginTop: 12 }}>Loading engagement config...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <Ionicons name="settings" size={24} color={colors.tint} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Engagement Config</Text>
          <Text style={[styles.headerSubtitle, { color: colors.icon }]}>
            Control coin rewards for each engagement action
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
          <Text style={[styles.statValue, { color: colors.success }]}>{instantActions}</Text>
          <Text style={[styles.statLabel, { color: colors.icon }]}>Instant</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.statValue, { color: colors.warning }]}>{moderatedActions}</Text>
          <Text style={[styles.statLabel, { color: colors.icon }]}>Moderated</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.statValue, { color: colors.warningDark }]}>{maxDailyCoins}</Text>
          <Text style={[styles.statLabel, { color: colors.icon }]}>Max/Day</Text>
        </View>
      </View>

      {/* Action cards — live from API */}
      <View style={styles.actionsList}>
        {configs.map(config => {
          const meta = ACTION_DISPLAY[config.action] ?? { label: config.action, icon: 'flash', iconColor: colors.icon };
          const isExpanded = expandedKey === config.action;
          const isDirty = !!(edits[config.action] && Object.keys(edits[config.action]!).length > 0);
          const isSaving = saving === config.action;

          return (
            <View
              key={config.action}
              style={[styles.actionCard, { backgroundColor: colors.card, borderWidth: isDirty ? 2 : 0, borderColor: colors.tint }]}
            >
              <TouchableOpacity
                style={styles.actionHeader}
                onPress={() => setExpandedKey(isExpanded ? null : config.action)}
                activeOpacity={0.7}
              >
                <View style={[styles.actionIcon, { backgroundColor: `${meta.iconColor}20` }]}>
                  <Ionicons name={meta.icon as any} size={20} color={meta.iconColor} />
                </View>
                <View style={styles.actionInfo}>
                  <Text style={[styles.actionLabel, { color: colors.text }]}>{meta.label}</Text>
                  <Text style={[styles.actionKey, { color: colors.icon }]}>{config.action}</Text>
                </View>
                <View style={styles.coinDisplay}>
                  <Ionicons name="sparkles" size={14} color={colors.warning} />
                  <Text style={styles.coinValue}>
                    {getVal(config, 'baseCoins')}{(getVal(config, 'bonusCoins') || 0) > 0 ? `+${getVal(config, 'bonusCoins')}` : ''}
                  </Text>
                </View>
                <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.icon} />
              </TouchableOpacity>

              {/* Badges */}
              <View style={styles.badgeRow}>
                <View style={[styles.badge, {
                  backgroundColor: config.requiresModeration ? colors.warningLight : colors.successLight,
                }]}>
                  <Text style={{
                    fontSize: 10, fontWeight: '600',
                    color: config.requiresModeration ? colors.warningDark : colors.successDark,
                  }}>
                    {config.requiresModeration ? 'MODERATED' : 'INSTANT'}
                  </Text>
                </View>
                <View style={[styles.badge, { backgroundColor: '#EEF2FF' }]}>
                  <Text style={{ fontSize: 10, fontWeight: '600', color: colors.indigo }}>
                    {getVal(config, 'dailyLimit')}/day
                  </Text>
                </View>
                {!config.isEnabled && (
                  <View style={[styles.badge, { backgroundColor: colors.errorLight }]}>
                    <Text style={{ fontSize: 10, fontWeight: '600', color: colors.error }}>DISABLED</Text>
                  </View>
                )}
              </View>

              {/* Active multiplier badge */}
              {config.multiplier > 1 && (
                <View style={{ backgroundColor: '#FEF9C3', borderRadius: 8, padding: 8, marginTop: 8 }}>
                  <Text style={{ fontSize: 12, color: '#92400E', fontWeight: '700' }}>
                    Active Multiplier: {config.multiplier}x
                    {config.multiplierEndsAt ? ` (ends ${new Date(config.multiplierEndsAt).toLocaleDateString()})` : ''}
                  </Text>
                </View>
              )}

              {/* Expanded: editable fields */}
              {isExpanded && (
                <View style={styles.expandedContent}>
                  {/* Enable/Disable toggle */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>Enabled</Text>
                    <Switch
                      value={!!getVal(config, 'isEnabled')}
                      onValueChange={v => updateEdit(config.action, 'isEnabled', v)}
                      trackColor={{ true: colors.tint }}
                    />
                  </View>

                  {/* Coin inputs */}
                  <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
                    {[
                      { label: 'Base Coins', field: 'baseCoins' as const },
                      { label: 'Bonus Coins', field: 'bonusCoins' as const },
                      { label: 'Daily Limit', field: 'dailyLimit' as const },
                    ].map(({ label, field }) => (
                      <View key={field} style={{ flex: 1 }}>
                        <Text style={{ fontSize: 11, color: colors.icon, marginBottom: 4 }}>{label}</Text>
                        <TextInput
                          style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 8, color: colors.text, backgroundColor: colors.background, textAlign: 'center', fontSize: 16, fontWeight: '700' }}
                          value={String(getVal(config, field))}
                          onChangeText={v => updateEdit(config.action, field, parseInt(v, 10) || 0)}
                          keyboardType="numeric"
                        />
                      </View>
                    ))}
                  </View>

                  {/* Moderation toggle */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <Text style={{ fontSize: 13, color: colors.text }}>Requires Moderation</Text>
                    <Switch
                      value={!!getVal(config, 'requiresModeration')}
                      onValueChange={v => updateEdit(config.action, 'requiresModeration', v)}
                      trackColor={{ true: colors.warning }}
                    />
                  </View>

                  {/* Save button */}
                  {isDirty && (
                    <TouchableOpacity
                      onPress={() => saveAction(config)}
                      disabled={isSaving}
                      style={{ backgroundColor: colors.tint, borderRadius: 8, padding: 12, alignItems: 'center', marginTop: 4 }}
                    >
                      {isSaving ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Save Changes</Text>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          );
        })}
      </View>

      <View style={{ height: 120 }} />
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
  actionsList: { padding: 16, paddingTop: 4 },
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
    backgroundColor: Colors.light.warningLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 3,
    marginRight: 8,
  },
  coinValue: { fontSize: 12, fontWeight: '700', color: Colors.light.warningDark },
  badgeRow: { flexDirection: 'row', marginTop: 8, gap: 6 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  expandedContent: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.light.border },
});
