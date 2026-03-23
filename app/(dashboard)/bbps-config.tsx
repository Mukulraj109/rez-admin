import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, useColorScheme, SafeAreaView,
  ScrollView, StyleSheet, Switch, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { showAlert } from '../../utils/alert';

interface BbpsConfig {
  coinRewards: {
    defaultPromoCoins: number;
    mobileRechargeBonus: number;
    electricityBonus: number;
    dthBonus: number;
    broadbandBonus: number;
    gasBonus: number;
    fastagBonus: number;
    waterBonus: number;
  };
  paymentLimits: {
    minTransactionAmount: number;
    maxTransactionAmount: number;
  };
  featureFlags: {
    prepaidEnabled: boolean;
    postpaidEnabled: boolean;
    electricityEnabled: boolean;
    dthEnabled: boolean;
    broadbandEnabled: boolean;
    gasEnabled: boolean;
    fastagEnabled: boolean;
    waterEnabled: boolean;
    insuranceEnabled: boolean;
  };
  reminders: {
    daysBeforeDueDate: number;
    templateText: string;
  };
}

const DEFAULT_CONFIG: BbpsConfig = {
  coinRewards: {
    defaultPromoCoins: 5,
    mobileRechargeBonus: 2,
    electricityBonus: 10,
    dthBonus: 3,
    broadbandBonus: 5,
    gasBonus: 8,
    fastagBonus: 3,
    waterBonus: 5,
  },
  paymentLimits: {
    minTransactionAmount: 10,
    maxTransactionAmount: 100000,
  },
  featureFlags: {
    prepaidEnabled: true,
    postpaidEnabled: true,
    electricityEnabled: true,
    dthEnabled: true,
    broadbandEnabled: true,
    gasEnabled: true,
    fastagEnabled: true,
    waterEnabled: true,
    insuranceEnabled: false,
  },
  reminders: {
    daysBeforeDueDate: 3,
    templateText: 'Your {billType} bill of {amount} is due in {days} days. Pay now and earn {coins} coins!',
  },
};

const STORAGE_KEY = 'bbps_admin_config';

export default function BbpsConfigScreen() {
  const scheme = useColorScheme();
  const colors = Colors[scheme ?? 'light'];

  const [config, setConfig] = useState<BbpsConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => { loadConfig(); }, []);

  const loadConfig = () => {
    try {
      const stored = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
      if (stored) {
        setConfig(JSON.parse(stored));
      }
    } catch { /* use defaults */ }
    setLoading(false);
  };

  const updateConfig = (updater: (prev: BbpsConfig) => BbpsConfig) => {
    setConfig(prev => {
      const next = updater(prev);
      setHasChanges(true);
      return next;
    });
  };

  const handleSave = () => {
    setSaving(true);
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
      }
      setHasChanges(false);
      showAlert('Success', 'BBPS configuration saved');
    } catch {
      showAlert('Error', 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setConfig(DEFAULT_CONFIG);
    setHasChanges(true);
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.tint} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Header */}
        <View style={{ padding: 16, paddingBottom: 0 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text }}>BBPS Config</Text>
              <Text style={{ fontSize: 13, color: colors.tabIconDefault, marginTop: 4 }}>
                Global bill payment settings
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                onPress={handleReset}
                style={{
                  borderWidth: 1, borderColor: colors.border, borderRadius: 10,
                  paddingHorizontal: 12, paddingVertical: 8,
                }}
              >
                <Text style={{ color: colors.tabIconDefault, fontWeight: '600', fontSize: 12 }}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSave}
                disabled={saving || !hasChanges}
                style={{
                  backgroundColor: hasChanges ? colors.tint : colors.border, borderRadius: 10,
                  paddingHorizontal: 14, paddingVertical: 8,
                  flexDirection: 'row', alignItems: 'center', gap: 4,
                }}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="save-outline" size={14} color={hasChanges ? '#fff' : colors.tabIconDefault} />
                    <Text style={{ color: hasChanges ? '#fff' : colors.tabIconDefault, fontWeight: '700', fontSize: 13 }}>Save</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Coin Rewards Section */}
        <View style={{ padding: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: `${colors.success}18`, justifyContent: 'center', alignItems: 'center' }}>
              <Ionicons name="gift-outline" size={18} color={colors.success} />
            </View>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>Coin Rewards</Text>
          </View>
          <View style={[styles.section, { backgroundColor: colors.card }]}>
            {([
              { key: 'defaultPromoCoins' as const, label: 'Default Promo Coins per Bill' },
              { key: 'mobileRechargeBonus' as const, label: 'Mobile Recharge Bonus' },
              { key: 'electricityBonus' as const, label: 'Electricity Bill Bonus' },
              { key: 'dthBonus' as const, label: 'DTH Recharge Bonus' },
              { key: 'broadbandBonus' as const, label: 'Broadband Bill Bonus' },
              { key: 'gasBonus' as const, label: 'Gas Bill Bonus' },
              { key: 'fastagBonus' as const, label: 'FASTag Recharge Bonus' },
              { key: 'waterBonus' as const, label: 'Water Bill Bonus' },
            ]).map(({ key, label }) => (
              <View key={key} style={styles.row}>
                <Text style={{ flex: 1, fontSize: 14, color: colors.text }}>{label}</Text>
                <TextInput
                  style={[styles.numberInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
                  value={String(config.coinRewards[key])}
                  onChangeText={v => updateConfig(c => ({
                    ...c, coinRewards: { ...c.coinRewards, [key]: parseInt(v) || 0 }
                  }))}
                  keyboardType="numeric"
                />
              </View>
            ))}
          </View>
        </View>

        {/* Payment Limits Section */}
        <View style={{ paddingHorizontal: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: `${colors.info}18`, justifyContent: 'center', alignItems: 'center' }}>
              <Ionicons name="wallet-outline" size={18} color={colors.info} />
            </View>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>Payment Limits</Text>
          </View>
          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <View style={styles.row}>
              <Text style={{ flex: 1, fontSize: 14, color: colors.text }}>Minimum Amount</Text>
              <TextInput
                style={[styles.numberInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
                value={String(config.paymentLimits.minTransactionAmount)}
                onChangeText={v => updateConfig(c => ({
                  ...c, paymentLimits: { ...c.paymentLimits, minTransactionAmount: parseFloat(v) || 0 }
                }))}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.row}>
              <Text style={{ flex: 1, fontSize: 14, color: colors.text }}>Maximum Amount</Text>
              <TextInput
                style={[styles.numberInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
                value={String(config.paymentLimits.maxTransactionAmount)}
                onChangeText={v => updateConfig(c => ({
                  ...c, paymentLimits: { ...c.paymentLimits, maxTransactionAmount: parseFloat(v) || 0 }
                }))}
                keyboardType="numeric"
              />
            </View>
          </View>
        </View>

        {/* Feature Flags Section */}
        <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: `${colors.purple}18`, justifyContent: 'center', alignItems: 'center' }}>
              <Ionicons name="toggle-outline" size={18} color={colors.purple} />
            </View>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>Feature Flags</Text>
          </View>
          <View style={[styles.section, { backgroundColor: colors.card }]}>
            {([
              { key: 'prepaidEnabled' as const, label: 'Prepaid Recharge', icon: 'phone-portrait-outline' as const },
              { key: 'postpaidEnabled' as const, label: 'Postpaid Bills', icon: 'call-outline' as const },
              { key: 'electricityEnabled' as const, label: 'Electricity', icon: 'flash-outline' as const },
              { key: 'dthEnabled' as const, label: 'DTH / Satellite TV', icon: 'tv-outline' as const },
              { key: 'broadbandEnabled' as const, label: 'Broadband / WiFi', icon: 'wifi-outline' as const },
              { key: 'gasEnabled' as const, label: 'Gas (Piped)', icon: 'flame-outline' as const },
              { key: 'fastagEnabled' as const, label: 'FASTag', icon: 'car-outline' as const },
              { key: 'waterEnabled' as const, label: 'Water', icon: 'water-outline' as const },
              { key: 'insuranceEnabled' as const, label: 'Insurance', icon: 'shield-checkmark-outline' as const },
            ]).map(({ key, label, icon }) => (
              <View key={key} style={styles.row}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                  <Ionicons name={icon} size={18} color={config.featureFlags[key] ? colors.success : colors.tabIconDefault} />
                  <Text style={{ fontSize: 14, color: colors.text }}>{label}</Text>
                </View>
                <Switch
                  value={config.featureFlags[key]}
                  onValueChange={v => updateConfig(c => ({
                    ...c, featureFlags: { ...c.featureFlags, [key]: v }
                  }))}
                  trackColor={{ false: colors.border, true: colors.success }}
                  thumbColor="#fff"
                />
              </View>
            ))}
          </View>
        </View>

        {/* Reminder Settings */}
        <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: `${colors.warning}18`, justifyContent: 'center', alignItems: 'center' }}>
              <Ionicons name="notifications-outline" size={18} color={colors.warning} />
            </View>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>Reminder Settings</Text>
          </View>
          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <View style={styles.row}>
              <Text style={{ flex: 1, fontSize: 14, color: colors.text }}>Days Before Due Date</Text>
              <TextInput
                style={[styles.numberInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
                value={String(config.reminders.daysBeforeDueDate)}
                onChangeText={v => updateConfig(c => ({
                  ...c, reminders: { ...c.reminders, daysBeforeDueDate: parseInt(v) || 0 }
                }))}
                keyboardType="numeric"
              />
            </View>
            <View style={{ padding: 14 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.tabIconDefault, marginBottom: 6 }}>
                Reminder Template
              </Text>
              <TextInput
                style={{
                  borderWidth: 1, borderColor: colors.border, borderRadius: 8,
                  padding: 12, color: colors.text, backgroundColor: colors.background,
                  minHeight: 80, textAlignVertical: 'top', fontSize: 13,
                }}
                value={config.reminders.templateText}
                onChangeText={v => updateConfig(c => ({
                  ...c, reminders: { ...c.reminders, templateText: v }
                }))}
                multiline
                placeholder="Use {billType}, {amount}, {days}, {coins} as placeholders"
                placeholderTextColor={colors.tabIconDefault}
              />
              <Text style={{ fontSize: 11, color: colors.tabIconDefault, marginTop: 6 }}>
                Available placeholders: {'{billType}'}, {'{amount}'}, {'{days}'}, {'{coins}'}, {'{providerName}'}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  section: {
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  numberInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    width: 80,
  },
});
