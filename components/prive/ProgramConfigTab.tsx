import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, RefreshControl, StyleSheet } from 'react-native';
import { priveConfigAdminApi, PriveProgramConfig, TierThresholds, PillarWeights, FeatureFlags } from '@/services/api/priveConfig';
import { Colors } from '@/constants/Colors';

export default function ProgramConfigTab({ colors }: { colors: any }) {
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
    } catch (err) { console.error('[ProgramConfig] Failed to fetch:', err); } finally { setIsLoading(false); }
  }, []);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const saveThresholds = async () => {
    setIsSaving(true);
    try { await priveConfigAdminApi.updateTierThresholds(thresholds); setEditSection(null); fetchConfig(); } catch (err) { console.error('[ProgramConfig] Failed to save thresholds:', err); } finally { setIsSaving(false); }
  };

  const saveWeights = async () => {
    setIsSaving(true);
    try { await priveConfigAdminApi.updatePillarWeights(weights); setEditSection(null); fetchConfig(); } catch (err) { console.error('[ProgramConfig] Failed to save weights:', err); } finally { setIsSaving(false); }
  };

  const toggleFlag = async (key: keyof FeatureFlags) => {
    const updated = { ...flags, [key]: !flags[key] };
    setFlags(updated);
    try { await priveConfigAdminApi.updateFeatureFlags({ [key]: updated[key] }); } catch (err) { console.error('[ProgramConfig] Failed to toggle flag:', err); setFlags(flags); }
  };

  const weightsSum = Object.values(weights).reduce((s, v) => s + v, 0);

  if (isLoading) return <ActivityIndicator size="large" color={colors.gold} style={{ marginTop: 40 }} />;

  return (
    <ScrollView style={styles.tabContent} refreshControl={<RefreshControl refreshing={isLoading} onRefresh={fetchConfig} />}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Tier Thresholds</Text>
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        {(['entryTier', 'signatureTier', 'eliteTier', 'trustMinimum'] as const).map((key) => (
          <View key={key} style={[styles.pillarRow, { paddingVertical: 8 }]}>
            <Text style={[styles.pillarName, { color: colors.text }]}>{key === 'entryTier' ? 'Entry' : key === 'signatureTier' ? 'Signature' : key === 'eliteTier' ? 'Elite' : 'Trust Min'}</Text>
            {editSection === 'thresholds' ? (
              <TextInput style={[styles.overrideInput, { color: colors.text, borderColor: colors.border, width: 80 }]} keyboardType="numeric" value={String(thresholds[key])} onChangeText={(v) => setThresholds({ ...thresholds, [key]: Number(v) || 0 })} />
            ) : (
              <Text style={[styles.pillarScore, { color: colors.gold }]}>{thresholds[key]}</Text>
            )}
          </View>
        ))}
        {editSection === 'thresholds' ? (
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
            <TouchableOpacity style={[styles.submitBtn, { flex: 1 }]} onPress={saveThresholds} disabled={isSaving}><Text style={styles.submitBtnText}>{isSaving ? 'Saving...' : 'Save'}</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.submitBtn, { flex: 1, backgroundColor: '#666' }]} onPress={() => setEditSection(null)}><Text style={styles.submitBtnText}>Cancel</Text></TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={[styles.submitBtn, { marginTop: 12 }]} onPress={() => setEditSection('thresholds')}><Text style={styles.submitBtnText}>Edit Thresholds</Text></TouchableOpacity>
        )}
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Pillar Weights (sum: {weightsSum.toFixed(2)})</Text>
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        {(Object.keys(weights) as (keyof PillarWeights)[]).map((key) => (
          <View key={key} style={[styles.pillarRow, { paddingVertical: 8 }]}>
            <Text style={[styles.pillarName, { color: colors.text }]}>{key}</Text>
            {editSection === 'weights' ? (
              <TextInput style={[styles.overrideInput, { color: colors.text, borderColor: colors.border, width: 80 }]} keyboardType="numeric" value={String(weights[key])} onChangeText={(v) => setWeights({ ...weights, [key]: parseFloat(v) || 0 })} />
            ) : (
              <Text style={[styles.pillarScore, { color: colors.gold }]}>{(weights[key] * 100).toFixed(0)}%</Text>
            )}
          </View>
        ))}
        {editSection === 'weights' ? (
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
            <TouchableOpacity style={[styles.submitBtn, { flex: 1, opacity: Math.abs(weightsSum - 1) > 0.01 ? 0.5 : 1 }]} onPress={saveWeights} disabled={isSaving || Math.abs(weightsSum - 1) > 0.01}><Text style={styles.submitBtnText}>{isSaving ? 'Saving...' : 'Save'}</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.submitBtn, { flex: 1, backgroundColor: '#666' }]} onPress={() => setEditSection(null)}><Text style={styles.submitBtnText}>Cancel</Text></TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={[styles.submitBtn, { marginTop: 12 }]} onPress={() => setEditSection('weights')}><Text style={styles.submitBtnText}>Edit Weights</Text></TouchableOpacity>
        )}
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Feature Flags</Text>
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        {(Object.keys(flags) as (keyof FeatureFlags)[]).map((key) => (
          <View key={key} style={[styles.pillarRow, { paddingVertical: 10 }]}>
            <Text style={[styles.pillarName, { color: colors.text }]}>{key.replace('Enabled', '')}</Text>
            <TouchableOpacity onPress={() => toggleFlag(key)} style={[styles.configBadge, { backgroundColor: flags[key] ? `${Colors.light.greenDeep}22` : `${Colors.light.errorMaterial}22` }]}>
              <Text style={{ color: flags[key] ? Colors.light.greenDeep : Colors.light.errorMaterial, fontWeight: '600', fontSize: 13 }}>{flags[key] ? 'ON' : 'OFF'}</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>

      {config?.tiers && (
        <>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Tier Configuration</Text>
          {config.tiers.map((tier) => (
            <View key={tier.tier} style={[styles.card, { backgroundColor: colors.card, marginBottom: 10 }]}>
              <View style={styles.cardHeader}>
                <Text style={[styles.cardTitle, { color: tier.color || colors.text }]}>{tier.displayName}</Text>
                <View style={[styles.statusBadge, { backgroundColor: `${colors.gold}22` }]}>
                  <Text style={{ color: colors.gold, fontSize: 12 }}>{tier.coinMultiplier}x</Text>
                </View>
              </View>
              <Text style={[styles.cardSubtitle, { color: colors.secondaryText }]}>
                SLA: {tier.conciergeResponseSLA}h | Invites: {tier.inviteCodesLimit} | Concierge: {tier.conciergeAccess ? 'Yes' : 'No'}
              </Text>
              {tier.benefits?.length > 0 && (
                <Text style={{ color: colors.secondaryText, fontSize: 12, marginTop: 4 }}>Benefits: {tier.benefits.join(', ')}</Text>
              )}
            </View>
          ))}
        </>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  tabContent: { flex: 1, padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginTop: 8, marginBottom: 12 },
  card: { borderRadius: 12, padding: 16, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardTitle: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  cardSubtitle: { fontSize: 12, marginTop: 2 },
  pillarRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pillarName: { fontSize: 14, fontWeight: '500' },
  pillarScore: { fontSize: 18, fontWeight: '600' },
  overrideInput: { borderWidth: 1, borderRadius: 8, padding: 8, marginTop: 8, fontSize: 13 },
  submitBtn: { backgroundColor: Colors.light.gold, borderRadius: 10, padding: 14, alignItems: 'center', marginBottom: 24 },
  submitBtnText: { color: Colors.light.text, fontSize: 15, fontWeight: '600' },
  configBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
});
