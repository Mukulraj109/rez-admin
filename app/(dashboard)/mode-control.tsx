/**
 * Admin Mode Control
 * Enable/disable app modes globally, force mode for specific regions.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity, ActivityIndicator, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { BRAND } from '../../constants/brand';
import { showAlert } from '../../utils/alert';
import { apiClient } from '../../services/api/apiClient';

const APP_MODES = [
  { id: 'near_u', label: 'Near U', icon: 'location', color: '#EF4444', description: 'Local stores, services, food delivery' },
  { id: 'mall', label: 'Mall', icon: 'storefront', color: '#3B82F6', description: 'Online brands, affiliate cashback' },
  { id: 'cash_store', label: 'Cash Store', icon: 'cash', color: '#10B981', description: 'Bill upload cashback' },
  { id: 'prive', label: 'Privé', icon: 'diamond', color: '#7C3AED', description: 'Social cashback, exclusive campaigns' },
];

export default function ModeControlScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [modes, setModes] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchModes = useCallback(async () => {
    try { setIsLoading(true);
      const res = await apiClient.get('/admin/feature-flags');
      const flags = res.data?.flags || res.data || [];
      const modeState: Record<string, boolean> = {};
      APP_MODES.forEach(m => {
        const flag = flags.find?.((f: any) => f.key === `mode.${m.id}`) || flags.find?.((f: any) => f.key === m.id);
        modeState[m.id] = flag?.isEnabled ?? true;
      });
      setModes(modeState);
    } catch { APP_MODES.forEach(m => setModes(prev => ({ ...prev, [m.id]: true }))); }
    finally { setIsLoading(false); }
  }, []);

  useEffect(() => { fetchModes(); }, [fetchModes]);

  const toggleMode = async (modeId: string) => {
    const newValue = !modes[modeId];
    setModes(prev => ({ ...prev, [modeId]: newValue }));
    try {
      await apiClient.put(`/admin/feature-flags/mode.${modeId}`, { isEnabled: newValue });
      showAlert('Success', `${modeId} mode ${newValue ? 'enabled' : 'disabled'}`);
    } catch {
      setModes(prev => ({ ...prev, [modeId]: !newValue }));
      showAlert('Error', 'Failed to update mode');
    }
  };

  if (isLoading) return <View style={s.loading}><ActivityIndicator size="large" color={colors.purple} /></View>;

  return (
    <ScrollView style={[s.container, { backgroundColor: colors.background }]} contentContainerStyle={s.scroll}>
      <Text style={[s.title, { color: colors.text }]}>Mode Control</Text>
      <Text style={[s.subtitle, { color: colors.mutedDark }]}>Enable or disable app modes globally</Text>

      {APP_MODES.map(mode => (
        <View key={mode.id} style={[s.card, { backgroundColor: colors.card, borderLeftColor: mode.color }]}>
          <View style={s.cardRow}>
            <View style={[s.iconWrap, { backgroundColor: mode.color + '20' }]}>
              <Ionicons name={mode.icon as any} size={22} color={mode.color} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[s.modeName, { color: colors.text }]}>{mode.label}</Text>
              <Text style={[s.modeDesc, { color: colors.mutedDark }]}>{mode.description}</Text>
            </View>
            <Switch value={modes[mode.id] ?? true} onValueChange={() => toggleMode(mode.id)}
              trackColor={{ true: mode.color, false: colors.gray200 }} />
          </View>
        </View>
      ))}

      <View style={[s.infoCard, { backgroundColor: colors.card }]}>
        <Ionicons name="information-circle" size={20} color={colors.info} />
        <Text style={[s.infoText, { color: colors.mutedDark }]}>
          Disabling a mode hides it from the tab bar for all users. Existing data is preserved.
        </Text>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 }, scroll: { padding: 16, paddingBottom: 60 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '800', marginBottom: 4 },
  subtitle: { fontSize: 13, marginBottom: 20 },
  card: { borderRadius: 12, padding: 16, marginBottom: 12, borderLeftWidth: 4, elevation: 1 },
  cardRow: { flexDirection: 'row', alignItems: 'center' },
  iconWrap: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  modeName: { fontSize: 16, fontWeight: '700' },
  modeDesc: { fontSize: 12, marginTop: 2 },
  infoCard: { flexDirection: 'row', padding: 14, borderRadius: 10, gap: 10, marginTop: 8 },
  infoText: { flex: 1, fontSize: 13, lineHeight: 18 },
});
