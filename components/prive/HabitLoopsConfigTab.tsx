import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Platform, StyleSheet } from 'react-native';
import priveAdminApi from '@/services/api/priveAdmin';
import { Colors } from '@/constants/Colors';

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

export default function HabitLoopsConfigTab({ colors }: { colors: any }) {
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
            id: l.id || '', name: l.name || '', icon: l.icon || '',
            description: l.description || '', targetCount: l.targetCount ?? 1,
            deepLink: l.deepLink || '', enabled: l.enabled !== false, bonusCoins: l.bonusCoins ?? 0,
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
        loops: loops.map(l => ({ ...l, targetCount: Number(l.targetCount) || 1, bonusCoins: Number(l.bonusCoins) || 0 })),
      });
      if (Platform.OS === 'web') window.alert('Habit loop config saved successfully');
      fetchConfig();
    } catch (err) {
      console.error('Failed to save habit loop config:', err);
      if (Platform.OS === 'web') window.alert('Failed to save habit loop configuration');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.tabContent, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={colors.gold} />
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
            borderWidth: 2, borderColor: enabled ? colors.gold : colors.border,
            backgroundColor: enabled ? colors.gold : 'transparent',
            alignItems: 'center', justifyContent: 'center', marginRight: 10,
          }}>
            {enabled && <Text style={{ color: Colors.light.text, fontSize: 12, fontWeight: 'bold' }}>✓</Text>}
          </View>
          <Text style={{ color: colors.text, fontSize: 14 }}>Habit Loops Enabled</Text>
        </TouchableOpacity>
        {[
          { label: 'Completion Bonus Coins', value: completionBonus, setter: setCompletionBonus, kb: 'numeric' as const },
          { label: 'Streak Multiplier', value: streakMultiplier, setter: setStreakMultiplier, kb: 'decimal-pad' as const },
        ].map(({ label, value, setter, kb }) => (
          <View key={label} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
            <Text style={{ color: colors.text, width: 160, fontSize: 13 }}>{label}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text }]}
              value={value}
              onChangeText={setter}
              keyboardType={kb}
            />
          </View>
        ))}
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
                <Text style={{ fontSize: 11, color: loop.enabled ? colors.success : colors.error, fontWeight: '600' }}>
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
                style={[styles.input, { backgroundColor: colors.background, color: colors.text, fontSize: 13 }]}
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

const styles = StyleSheet.create({
  tabContent: { flex: 1, padding: 16 },
  card: { borderRadius: 12, padding: 16, marginBottom: 12 },
  cardTitle: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  input: { padding: 8, borderRadius: 8, flex: 1 },
  submitBtn: { backgroundColor: Colors.light.gold, borderRadius: 10, padding: 14, alignItems: 'center', marginBottom: 24 },
  submitBtnText: { color: Colors.light.text, fontSize: 15, fontWeight: '600' },
});
