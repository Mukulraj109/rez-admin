import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import priveAdminApi from '@/services/api/priveAdmin';
import { Colors } from '@/constants/Colors';

export default function ReputationTab({ colors }: { colors: any }) {
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
          <Text style={{ color: colors.gold }}>Search</Text>
        </TouchableOpacity>
      </View>

      {isLoading && <ActivityIndicator size="large" color={colors.gold} style={{ marginTop: 40 }} />}
      {error && <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>}

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
              style={[styles.actionBtn, { backgroundColor: `${Colors.light.success}20`, flex: 1, alignItems: 'center', paddingVertical: 10 }]}
              onPress={handleRecalculate}
              disabled={isRecalculating}
            >
              <Text style={{ color: colors.success, fontSize: 13, fontWeight: '600' }}>
                {isRecalculating ? 'Recalculating...' : 'Recalculate from Data'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: `${Colors.light.info}20`, flex: 1, alignItems: 'center', paddingVertical: 10 }]}
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
                <View style={[styles.configBadge, { backgroundColor: `${Colors.light.bronze}20` }]}>
                  <Text style={{ color: Colors.light.bronze, fontSize: 11 }}>Entry: {thresholds.ENTRY_TIER}+</Text>
                </View>
                <View style={[styles.configBadge, { backgroundColor: '#C0C0C020' }]}>
                  <Text style={{ color: '#C0C0C0', fontSize: 11 }}>Signature: {thresholds.SIGNATURE_TIER}+</Text>
                </View>
                <View style={[styles.configBadge, { backgroundColor: `${Colors.light.goldBright}20` }]}>
                  <Text style={{ color: Colors.light.goldBright, fontSize: 11 }}>Elite: {thresholds.ELITE_TIER}+</Text>
                </View>
                <View style={[styles.configBadge, { backgroundColor: `${Colors.light.error}20` }]}>
                  <Text style={{ color: colors.error, fontSize: 11 }}>Trust Min: {thresholds.TRUST_MINIMUM}</Text>
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
                    <Text style={{ color: colors.gold, fontSize: 13, fontWeight: '600' }}>
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
                      <Text style={[styles.pillarScore, { color: colors.gold }]}>
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

const styles = StyleSheet.create({
  tabContent: { flex: 1, padding: 16 },
  searchBar: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 10, gap: 8, marginBottom: 12 },
  searchInput: { flex: 1, fontSize: 14 },
  card: { borderRadius: 12, padding: 16, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardTitle: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  cardSubtitle: { fontSize: 12, marginTop: 2 },
  actionBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 },
  errorText: { textAlign: 'center', marginTop: 20, fontSize: 14 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginTop: 8, marginBottom: 12 },
  pillarRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pillarName: { fontSize: 14, fontWeight: '500' },
  pillarScore: { fontSize: 18, fontWeight: '600' },
  overrideInput: { borderWidth: 1, borderRadius: 8, padding: 8, marginTop: 8, fontSize: 13 },
  reasonInput: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 12, fontSize: 14 },
  submitBtn: { backgroundColor: Colors.light.gold, borderRadius: 10, padding: 14, alignItems: 'center', marginBottom: 24 },
  submitBtnText: { color: Colors.light.text, fontSize: 15, fontWeight: '600' },
  configBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
});
