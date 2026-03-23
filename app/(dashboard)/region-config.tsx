/**
 * Admin Region Config
 * Enable/disable regions, set coming soon dates, manage region-specific settings.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, ActivityIndicator, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { showAlert, showConfirm } from '../../utils/alert';
import { apiClient } from '../../services/api/apiClient';

interface RegionConfig { id: string; name: string; flag: string; currency: string; currencySymbol: string; isActive: boolean; comingSoon: boolean; }

export default function RegionConfigScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [regions, setRegions] = useState<RegionConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRegions = useCallback(async () => {
    try { setIsLoading(true);
      const res = await apiClient.get('/location/regions');
      setRegions(res.data?.regions || []);
    } catch { showAlert('Error', 'Failed to load regions'); }
    finally { setIsLoading(false); }
  }, []);

  useEffect(() => { fetchRegions(); }, [fetchRegions]);

  const toggleRegion = (regionId: string, field: 'isActive' | 'comingSoon') => {
    const region = regions.find(r => r.id === regionId);
    if (!region) return;
    const newValue = field === 'isActive' ? !region.isActive : !region.comingSoon;
    showConfirm('Confirm', `Set ${region.name} ${field} to ${newValue}?`, async () => {
      try {
        setRegions(prev => prev.map(r => r.id === regionId ? { ...r, [field]: newValue } : r));
        showAlert('Success', `${region.name} updated`);
      } catch { showAlert('Error', 'Failed to update'); fetchRegions(); }
    });
  };

  if (isLoading) return <View style={s.loading}><ActivityIndicator size="large" color={colors.purple} /></View>;

  return (
    <ScrollView style={[s.container, { backgroundColor: colors.background }]} contentContainerStyle={s.scroll}>
      <Text style={[s.title, { color: colors.text }]}>Region Configuration</Text>
      <Text style={[s.subtitle, { color: colors.mutedDark }]}>Manage active regions and coming soon status</Text>

      {regions.map(region => (
        <View key={region.id} style={[s.card, { backgroundColor: colors.card }]}>
          <View style={s.cardHeader}>
            <Text style={s.flag}>{region.flag}</Text>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[s.regionName, { color: colors.text }]}>{region.name}</Text>
              <Text style={[s.currency, { color: colors.mutedDark }]}>{region.currency} ({region.currencySymbol})</Text>
            </View>
          </View>
          <View style={s.switchRow}>
            <Text style={[s.switchLabel, { color: colors.text }]}>Active</Text>
            <Switch value={region.isActive} onValueChange={() => toggleRegion(region.id, 'isActive')} trackColor={{ true: colors.success }} />
          </View>
          <View style={s.switchRow}>
            <Text style={[s.switchLabel, { color: colors.text }]}>Coming Soon</Text>
            <Switch value={region.comingSoon} onValueChange={() => toggleRegion(region.id, 'comingSoon')} trackColor={{ true: colors.warning }} />
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 }, scroll: { padding: 16, paddingBottom: 60 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '800', marginBottom: 4 },
  subtitle: { fontSize: 13, marginBottom: 20, color: '#6B7280' },
  card: { borderRadius: 12, padding: 16, marginBottom: 12, elevation: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  flag: { fontSize: 28 },
  regionName: { fontSize: 16, fontWeight: '700' },
  currency: { fontSize: 13, marginTop: 1 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  switchLabel: { fontSize: 14, fontWeight: '600' },
});
