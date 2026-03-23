/**
 * Admin Credit Engine
 * Configure credit limits per trust tier, pay-later rules, and credit scoring.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, RefreshControl, Switch, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { showAlert } from '../../utils/alert';
import { apiClient } from '../../services/api/apiClient';

const TRUST_TIERS = [
  { tier: 'bronze', label: 'Bronze', color: '#CD7F32', defaultLimit: 5000, defaultPayLaterDays: 7 },
  { tier: 'silver', label: 'Silver', color: '#C0C0C0', defaultLimit: 15000, defaultPayLaterDays: 14 },
  { tier: 'gold', label: 'Gold', color: '#FFD700', defaultLimit: 50000, defaultPayLaterDays: 30 },
  { tier: 'platinum', label: 'Platinum', color: '#7C3AED', defaultLimit: 100000, defaultPayLaterDays: 45 },
  { tier: 'diamond', label: 'Diamond', color: '#3B82F6', defaultLimit: 0, defaultPayLaterDays: 60 },
];

export default function CreditEngineScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [config, setConfig] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchConfig = useCallback(async () => {
    try { setIsLoading(true);
      const res = await apiClient.get('/admin/wallet-config');
      setConfig(res.data || {});
    } catch { showAlert('Error', 'Failed to load credit config'); }
    finally { setIsLoading(false); }
  }, []);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await apiClient.put('/admin/wallet-config', config);
      showAlert('Success', 'Credit engine config saved');
    } catch { showAlert('Error', 'Failed to save'); }
    finally { setIsSaving(false); }
  };

  if (isLoading) return <View style={s.loading}><ActivityIndicator size="large" color={colors.purple} /></View>;

  return (
    <ScrollView style={[s.container, { backgroundColor: colors.background }]} contentContainerStyle={s.scroll}>
      <Text style={[s.title, { color: colors.text }]}>Credit Engine</Text>
      <Text style={[s.subtitle, { color: colors.mutedDark }]}>Configure credit limits and pay-later rules per trust tier</Text>

      {TRUST_TIERS.map(t => (
        <View key={t.tier} style={[s.tierCard, { backgroundColor: colors.card, borderLeftColor: t.color }]}>
          <View style={s.tierHeader}>
            <View style={[s.tierDot, { backgroundColor: t.color }]} />
            <Text style={[s.tierName, { color: colors.text }]}>{t.label} Tier</Text>
          </View>
          <View style={s.tierRow}>
            <Text style={[s.fieldLabel, { color: colors.mutedDark }]}>Credit Limit (₹)</Text>
            <TextInput style={[s.input, { color: colors.text, borderColor: colors.border }]}
              value={String(t.defaultLimit)} keyboardType="numeric" editable={false} />
          </View>
          <View style={s.tierRow}>
            <Text style={[s.fieldLabel, { color: colors.mutedDark }]}>Pay Later (days)</Text>
            <TextInput style={[s.input, { color: colors.text, borderColor: colors.border }]}
              value={String(t.defaultPayLaterDays)} keyboardType="numeric" editable={false} />
          </View>
          <View style={s.tierRow}>
            <Text style={[s.fieldLabel, { color: colors.mutedDark }]}>Score Range</Text>
            <Text style={[s.rangeText, { color: colors.text }]}>
              {t.tier === 'bronze' ? '0-199' : t.tier === 'silver' ? '200-399' : t.tier === 'gold' ? '400-599' : t.tier === 'platinum' ? '600-799' : '800-1000'}
            </Text>
          </View>
        </View>
      ))}

      <TouchableOpacity style={s.saveBtn} onPress={handleSave} disabled={isSaving}>
        {isSaving ? <ActivityIndicator color="#FFF" /> : <Text style={s.saveBtnText}>Save Configuration</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 }, scroll: { padding: 16, paddingBottom: 60 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '800', marginBottom: 4 },
  subtitle: { fontSize: 13, marginBottom: 20 },
  tierCard: { borderRadius: 12, padding: 16, marginBottom: 12, borderLeftWidth: 4, elevation: 1 },
  tierHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
  tierDot: { width: 10, height: 10, borderRadius: 5 },
  tierName: { fontSize: 16, fontWeight: '700' },
  tierRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  fieldLabel: { fontSize: 13 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, width: 120, textAlign: 'right', fontSize: 14 },
  rangeText: { fontSize: 14, fontWeight: '600' },
  saveBtn: { backgroundColor: '#7C3AED', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  saveBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
});
