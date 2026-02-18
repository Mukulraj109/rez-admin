import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  useColorScheme,
  RefreshControl,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { showAlert, showConfirm } from '../../utils/alert';
import { dailyCheckinConfigService, DailyCheckinConfig, MilestoneReward } from '../../services/api/dailyCheckinConfig';

export default function DailyCheckinConfigScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Config state
  const [isEnabled, setIsEnabled] = useState(true);
  const [dayRewards, setDayRewards] = useState<number[]>([10, 15, 20, 25, 30, 40, 100]);
  const [milestones, setMilestones] = useState<MilestoneReward[]>([
    { day: 7, coins: 200 },
    { day: 30, coins: 2000 },
    { day: 100, coins: 10000 },
  ]);
  const [proTips, setProTips] = useState<string[]>([]);
  const [affiliateTip, setAffiliateTip] = useState('');
  const [reviewTimeframe, setReviewTimeframe] = useState('');

  const loadConfig = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const response = await dailyCheckinConfigService.getConfig();
      if (response.success && response.data) {
        const cfg = response.data;
        setIsEnabled(cfg.isEnabled);
        setDayRewards(cfg.dayRewards);
        setMilestones(cfg.milestoneRewards);
        setProTips(cfg.proTips);
        setAffiliateTip(cfg.affiliateTip);
        setReviewTimeframe(cfg.reviewTimeframe);
        setDirty(false);
      }
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to load config');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const handleSave = async () => {
    // Validate
    if (dayRewards.length !== 7 || dayRewards.some(n => !n || n <= 0)) {
      showAlert('Validation Error', 'All 7 day rewards must be positive numbers');
      return;
    }
    if (milestones.some(m => !m.day || !m.coins || m.day <= 0 || m.coins <= 0)) {
      showAlert('Validation Error', 'All milestones must have positive day and coin values');
      return;
    }
    if (proTips.some(t => !t.trim())) {
      showAlert('Validation Error', 'Pro tips cannot be empty');
      return;
    }

    try {
      setSaving(true);
      const response = await dailyCheckinConfigService.updateConfig({
        isEnabled,
        dayRewards,
        milestoneRewards: milestones,
        proTips: proTips.filter(t => t.trim()),
        affiliateTip,
        reviewTimeframe,
      });
      if (response.success) {
        showAlert('Success', 'Daily check-in config saved successfully');
        setDirty(false);
      } else {
        showAlert('Error', 'Failed to save config');
      }
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to save config');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    showConfirm(
      'Reset to Defaults',
      'This will reset all daily check-in configuration to default values. This cannot be undone.',
      async () => {
        try {
          setSaving(true);
          const response = await dailyCheckinConfigService.resetConfig();
          if (response.success && response.data) {
            const cfg = response.data;
            setIsEnabled(cfg.isEnabled);
            setDayRewards(cfg.dayRewards);
            setMilestones(cfg.milestoneRewards);
            setProTips(cfg.proTips);
            setAffiliateTip(cfg.affiliateTip);
            setReviewTimeframe(cfg.reviewTimeframe);
            setDirty(false);
            showAlert('Success', 'Config reset to defaults');
          }
        } catch (error: any) {
          showAlert('Error', error.message || 'Failed to reset config');
        } finally {
          setSaving(false);
        }
      },
      'Reset'
    );
  };

  const updateDayReward = (index: number, value: string) => {
    const num = parseInt(value) || 0;
    setDayRewards(prev => {
      const updated = [...prev];
      updated[index] = num;
      return updated;
    });
    setDirty(true);
  };

  const updateMilestone = (index: number, field: 'day' | 'coins' | 'badge', value: string) => {
    setMilestones(prev => {
      const updated = [...prev];
      if (field === 'badge') {
        updated[index] = { ...updated[index], badge: value || undefined };
      } else {
        updated[index] = { ...updated[index], [field]: parseInt(value) || 0 };
      }
      return updated;
    });
    setDirty(true);
  };

  const addMilestone = () => {
    setMilestones(prev => [...prev, { day: 0, coins: 0 }]);
    setDirty(true);
  };

  const removeMilestone = (index: number) => {
    setMilestones(prev => prev.filter((_, i) => i !== index));
    setDirty(true);
  };

  const updateProTip = (index: number, value: string) => {
    setProTips(prev => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
    setDirty(true);
  };

  const addProTip = () => {
    setProTips(prev => [...prev, '']);
    setDirty(true);
  };

  const removeProTip = (index: number) => {
    setProTips(prev => prev.filter((_, i) => i !== index));
    setDirty(true);
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
        <Text style={[styles.loadingText, { color: colors.secondaryText }]}>Loading config...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <Ionicons name="calendar" size={22} color={colors.tint} />
          <Text style={[styles.headerTitle, { color: colors.text }]}>Daily Check-In Config</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.resetButton} onPress={handleReset} disabled={saving}>
            <Ionicons name="refresh" size={16} color={colors.warning} />
            <Text style={[styles.resetButtonText, { color: colors.warning }]}>Reset</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveButton, !dirty && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={!dirty || saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="save" size={16} color="#FFFFFF" />
                <Text style={styles.saveButtonText}>Save</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadConfig(true)} colors={[colors.tint]} />
        }
      >
        {/* Enable/Disable Toggle */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="power" size={18} color={colors.success} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Feature Status</Text>
          </View>
          <View style={styles.toggleRow}>
            <Text style={[styles.toggleLabel, { color: colors.text }]}>Daily Check-In Enabled</Text>
            <Switch
              value={isEnabled}
              onValueChange={(v) => { setIsEnabled(v); setDirty(true); }}
              trackColor={{ false: colors.border, true: `${colors.success}60` }}
              thumbColor={isEnabled ? colors.success : '#f4f3f4'}
            />
          </View>
        </View>

        {/* Day Rewards */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="gift" size={18} color="#F59E0B" />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Day Rewards (7-day cycle)</Text>
          </View>
          <Text style={[styles.sectionDescription, { color: colors.secondaryText }]}>
            Coins earned for each day in the weekly cycle. Repeats every 7 days.
          </Text>
          <View style={styles.dayRewardsGrid}>
            {dayRewards.map((reward, index) => (
              <View key={index} style={[styles.dayRewardItem, { borderColor: colors.border }]}>
                <Text style={[styles.dayRewardLabel, { color: colors.secondaryText }]}>Day {index + 1}</Text>
                <TextInput
                  style={[styles.dayRewardInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                  value={String(reward)}
                  onChangeText={(v) => updateDayReward(index, v)}
                  keyboardType="numeric"
                  selectTextOnFocus
                />
              </View>
            ))}
          </View>
          <View style={[styles.totalRow, { borderTopColor: colors.border }]}>
            <Text style={[styles.totalLabel, { color: colors.secondaryText }]}>Weekly Total:</Text>
            <Text style={[styles.totalValue, { color: colors.tint }]}>
              {dayRewards.reduce((a, b) => a + b, 0)} coins
            </Text>
          </View>
        </View>

        {/* Milestone Rewards */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="trophy" size={18} color="#8B5CF6" />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Streak Milestone Rewards</Text>
          </View>
          <Text style={[styles.sectionDescription, { color: colors.secondaryText }]}>
            Bonus coins awarded when users reach streak milestones. Claimed once per milestone.
          </Text>
          {milestones.map((milestone, index) => (
            <View key={index} style={[styles.milestoneRow, { borderColor: colors.border }]}>
              <View style={styles.milestoneField}>
                <Text style={[styles.fieldLabel, { color: colors.secondaryText }]}>Day</Text>
                <TextInput
                  style={[styles.milestoneInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                  value={String(milestone.day)}
                  onChangeText={(v) => updateMilestone(index, 'day', v)}
                  keyboardType="numeric"
                  selectTextOnFocus
                />
              </View>
              <View style={styles.milestoneField}>
                <Text style={[styles.fieldLabel, { color: colors.secondaryText }]}>Coins</Text>
                <TextInput
                  style={[styles.milestoneInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                  value={String(milestone.coins)}
                  onChangeText={(v) => updateMilestone(index, 'coins', v)}
                  keyboardType="numeric"
                  selectTextOnFocus
                />
              </View>
              <View style={styles.milestoneField}>
                <Text style={[styles.fieldLabel, { color: colors.secondaryText }]}>Badge</Text>
                <TextInput
                  style={[styles.milestoneInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                  value={milestone.badge || ''}
                  onChangeText={(v) => updateMilestone(index, 'badge', v)}
                  placeholder="optional"
                  placeholderTextColor={colors.icon}
                />
              </View>
              <TouchableOpacity style={styles.removeButton} onPress={() => removeMilestone(index)}>
                <Ionicons name="trash-outline" size={18} color={colors.error} />
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity style={[styles.addButton, { borderColor: colors.border }]} onPress={addMilestone}>
            <Ionicons name="add-circle-outline" size={18} color={colors.info} />
            <Text style={[styles.addButtonText, { color: colors.info }]}>Add Milestone</Text>
          </TouchableOpacity>
        </View>

        {/* Pro Tips */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="bulb" size={18} color="#F59E0B" />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Pro Tips</Text>
          </View>
          <Text style={[styles.sectionDescription, { color: colors.secondaryText }]}>
            Tips shown to users on the daily check-in page.
          </Text>
          {proTips.map((tip, index) => (
            <View key={index} style={[styles.tipRow, { borderColor: colors.border }]}>
              <TextInput
                style={[styles.tipInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                value={tip}
                onChangeText={(v) => updateProTip(index, v)}
                placeholder="Enter a pro tip..."
                placeholderTextColor={colors.icon}
                multiline
              />
              <TouchableOpacity style={styles.removeButton} onPress={() => removeProTip(index)}>
                <Ionicons name="trash-outline" size={18} color={colors.error} />
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity style={[styles.addButton, { borderColor: colors.border }]} onPress={addProTip}>
            <Ionicons name="add-circle-outline" size={18} color={colors.info} />
            <Text style={[styles.addButtonText, { color: colors.info }]}>Add Pro Tip</Text>
          </TouchableOpacity>
        </View>

        {/* Affiliate & Review Settings */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="share-social" size={18} color="#3B82F6" />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Affiliate & Review Settings</Text>
          </View>
          <View style={styles.textFieldContainer}>
            <Text style={[styles.fieldLabel, { color: colors.secondaryText }]}>Affiliate Tip Text</Text>
            <TextInput
              style={[styles.textArea, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
              value={affiliateTip}
              onChangeText={(v) => { setAffiliateTip(v); setDirty(true); }}
              placeholder="How the affiliate program works..."
              placeholderTextColor={colors.icon}
              multiline
              numberOfLines={3}
            />
          </View>
          <View style={styles.textFieldContainer}>
            <Text style={[styles.fieldLabel, { color: colors.secondaryText }]}>Review Timeframe</Text>
            <TextInput
              style={[styles.textInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
              value={reviewTimeframe}
              onChangeText={(v) => { setReviewTimeframe(v); setDirty(true); }}
              placeholder="e.g. within 24 hours"
              placeholderTextColor={colors.icon}
            />
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
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
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  resetButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#3B82F6',
  },
  saveButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  section: {
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  sectionDescription: {
    fontSize: 13,
    marginBottom: 12,
    lineHeight: 18,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  dayRewardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dayRewardItem: {
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    minWidth: 70,
  },
  dayRewardLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  dayRewardInput: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 54,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  totalValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  milestoneRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  milestoneField: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  milestoneInput: {
    fontSize: 14,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  removeButton: {
    padding: 8,
    justifyContent: 'center',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 8,
    marginTop: 4,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  tipInput: {
    flex: 1,
    fontSize: 14,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minHeight: 40,
  },
  textFieldContainer: {
    marginBottom: 12,
  },
  textArea: {
    fontSize: 14,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minHeight: 60,
    textAlignVertical: 'top',
    marginTop: 4,
  },
  textInput: {
    fontSize: 14,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 4,
  },
});
