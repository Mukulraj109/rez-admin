import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Switch, ActivityIndicator, RefreshControl, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { showAlert } from '../../utils/alert';
import { apiClient } from '../../services/api/apiClient';

interface RechargeTier {
  minAmount: number;
  cashbackPercentage: number;
}

interface WalletConfigData {
  transferLimits: {
    dailyMax: number;
    perTransactionMax: number;
    minAmount: number;
    requireOtpAbove: number;
    maxRecipientsPerDay: number;
  };
  giftLimits: {
    dailyMax: number;
    perGiftMax: number;
    minAmount: number;
    requireOtpAbove: number;
    maxGiftsPerDay: number;
  };
  rechargeConfig: {
    isEnabled: boolean;
    tiers: RechargeTier[];
    maxCashback: number;
    minRecharge: number;
  };
  expiryConfig: {
    promoExpiryDays: number;
    alertDaysBefore: number;
    gracePeriodDays: number;
  };
  commissionRate: number;
  coinConversion: {
    nuqtaToInr: number;
    promoToInr: number;
    brandedToInr: number;
  };
  fraudThresholds: {
    maxTransfersPerHour: number;
    maxGiftsPerDay: number;
    suspiciousAmountThreshold: number;
    autoFreezeMultiplier: number;
  };
  coinExpiryConfig?: {
    rez: { expiryDays: number; maxUsagePct: number };
    prive: { expiryDays: number; maxUsagePct: number };
    promo: { expiryDays: number; maxUsagePct: number };
    branded: { expiryDays: number; maxUsagePct: number };
  };
}

type SectionKey = 'transfer' | 'gift' | 'recharge' | 'expiry' | 'coinExpiry' | 'commission' | 'fraud';

const SECTIONS: { key: SectionKey; title: string; icon: keyof typeof Ionicons.glyphMap; color: string }[] = [
  { key: 'transfer', title: 'Transfer Limits', icon: 'swap-horizontal', color: '#3B82F6' },
  { key: 'gift', title: 'Gift Limits', icon: 'gift', color: '#8B5CF6' },
  { key: 'recharge', title: 'Recharge Config', icon: 'card', color: '#10B981' },
  { key: 'expiry', title: 'Expiry Config', icon: 'time', color: '#F59E0B' },
  { key: 'coinExpiry', title: 'Coin Expiry Rules', icon: 'hourglass', color: '#D97706' },
  { key: 'commission', title: 'Commission & Conversion', icon: 'calculator', color: '#EC4899' },
  { key: 'fraud', title: 'Fraud Thresholds', icon: 'shield', color: '#EF4444' },
];

export default function WalletConfigScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Record<SectionKey, boolean>>({
    transfer: false, gift: true, recharge: true, expiry: true, coinExpiry: true, commission: true, fraud: true,
  });
  const [config, setConfig] = useState<WalletConfigData | null>(null);

  const loadConfig = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const response = await apiClient.get<WalletConfigData>('admin/wallet-config');
      if (response.success && response.data) {
        setConfig(response.data);
        setDirty(false);
      } else {
        setError(response.message || 'Failed to load config');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load config');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadConfig(); }, [loadConfig]);

  const handleSave = async () => {
    if (!config) return;
    try {
      setSaving(true);
      const response = await apiClient.put('admin/wallet-config', config);
      if (response.success) {
        showAlert('Success', 'Wallet configuration saved successfully');
        setDirty(false);
      } else {
        showAlert('Error', response.message || 'Failed to save config');
      }
    } catch (err: any) {
      showAlert('Error', err.message || 'Failed to save config');
    } finally {
      setSaving(false);
    }
  };

  const updateField = (path: string, value: number | boolean) => {
    if (!config) return;
    setConfig(prev => {
      if (!prev) return prev;
      const updated = JSON.parse(JSON.stringify(prev));
      const keys = path.split('.');
      let obj: any = updated;
      for (let i = 0; i < keys.length - 1; i++) obj = obj[keys[i]];
      obj[keys[keys.length - 1]] = value;
      return updated;
    });
    setDirty(true);
  };

  const toggleSection = (key: SectionKey) => {
    setCollapsed(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // --- Render helpers ---

  const renderInput = (label: string, path: string, value: number, suffix?: string) => (
    <View style={styles.fieldRow} key={path}>
      <Text style={[styles.fieldLabel, { color: colors.text }]}>{label}{suffix ? ` (${suffix})` : ''}</Text>
      <TextInput
        style={[styles.fieldInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
        value={String(value)}
        onChangeText={t => updateField(path, parseFloat(t) || 0)}
        keyboardType="numeric"
        selectTextOnFocus
      />
    </View>
  );

  const renderSectionCard = (sectionKey: SectionKey, content: React.ReactNode) => {
    const sec = SECTIONS.find(s => s.key === sectionKey)!;
    const isCollapsed = collapsed[sectionKey];
    return (
      <View key={sectionKey} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TouchableOpacity style={styles.cardHeader} onPress={() => toggleSection(sectionKey)} activeOpacity={0.7}>
          <Ionicons name={sec.icon} size={18} color={sec.color} />
          <Text style={[styles.cardTitle, { color: colors.text }]}>{sec.title}</Text>
          <Ionicons name={isCollapsed ? 'chevron-down' : 'chevron-up'} size={18} color={colors.text} />
        </TouchableOpacity>
        {!isCollapsed && <View style={[styles.cardBody, { borderTopColor: colors.border }]}>{content}</View>}
      </View>
    );
  };

  // --- Recharge tiers helpers ---

  const addTier = () => {
    if (!config) return;
    setConfig(prev => {
      if (!prev) return prev;
      const updated = JSON.parse(JSON.stringify(prev));
      updated.rechargeConfig.tiers.push({ minAmount: 0, cashbackPercentage: 0 });
      return updated;
    });
    setDirty(true);
  };

  const removeTier = (index: number) => {
    if (!config) return;
    setConfig(prev => {
      if (!prev) return prev;
      const updated = JSON.parse(JSON.stringify(prev));
      updated.rechargeConfig.tiers.splice(index, 1);
      return updated;
    });
    setDirty(true);
  };

  const updateTier = (index: number, field: keyof RechargeTier, value: string) => {
    if (!config) return;
    setConfig(prev => {
      if (!prev) return prev;
      const updated = JSON.parse(JSON.stringify(prev));
      updated.rechargeConfig.tiers[index][field] = parseFloat(value) || 0;
      return updated;
    });
    setDirty(true);
  };

  // --- Loading / Error states ---

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
        <Text style={[styles.loadingText, { color: colors.text }]}>Loading config...</Text>
      </View>
    );
  }

  if (error || !config) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <Ionicons name="alert-circle" size={48} color="#EF4444" />
        <Text style={[styles.errorText, { color: colors.text }]}>{error || 'Unknown error'}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => loadConfig()}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <Ionicons name="wallet" size={22} color={colors.tint} />
          <Text style={[styles.headerTitle, { color: colors.text }]}>Wallet Configuration</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => loadConfig(true)} style={styles.iconBtn}>
            <Ionicons name="refresh" size={20} color={colors.tint} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveButton, !dirty && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={!dirty || saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <>
                <Ionicons name="save" size={16} color="#FFF" />
                <Text style={styles.saveButtonText}>Save</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadConfig(true)} colors={[colors.tint]} />}
      >
        {/* Transfer Limits */}
        {renderSectionCard('transfer', <>
          {renderInput('Daily Max', 'transferLimits.dailyMax', config.transferLimits.dailyMax)}
          {renderInput('Per Transaction Max', 'transferLimits.perTransactionMax', config.transferLimits.perTransactionMax)}
          {renderInput('Min Amount', 'transferLimits.minAmount', config.transferLimits.minAmount)}
          {renderInput('Require OTP Above', 'transferLimits.requireOtpAbove', config.transferLimits.requireOtpAbove)}
          {renderInput('Max Recipients/Day', 'transferLimits.maxRecipientsPerDay', config.transferLimits.maxRecipientsPerDay)}
        </>)}

        {/* Gift Limits */}
        {renderSectionCard('gift', <>
          {renderInput('Daily Max', 'giftLimits.dailyMax', config.giftLimits.dailyMax)}
          {renderInput('Per Gift Max', 'giftLimits.perGiftMax', config.giftLimits.perGiftMax)}
          {renderInput('Min Amount', 'giftLimits.minAmount', config.giftLimits.minAmount)}
          {renderInput('Require OTP Above', 'giftLimits.requireOtpAbove', config.giftLimits.requireOtpAbove)}
          {renderInput('Max Gifts/Day', 'giftLimits.maxGiftsPerDay', config.giftLimits.maxGiftsPerDay)}
        </>)}

        {/* Recharge Config */}
        {renderSectionCard('recharge', <>
          <View style={styles.fieldRow}>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>Enabled</Text>
            <Switch
              value={config.rechargeConfig.isEnabled}
              onValueChange={v => updateField('rechargeConfig.isEnabled', v)}
              trackColor={{ false: colors.border, true: `${colors.tint}60` }}
              thumbColor={config.rechargeConfig.isEnabled ? colors.tint : '#f4f3f4'}
            />
          </View>
          {renderInput('Max Cashback', 'rechargeConfig.maxCashback', config.rechargeConfig.maxCashback)}
          {renderInput('Min Recharge', 'rechargeConfig.minRecharge', config.rechargeConfig.minRecharge)}
          <Text style={[styles.subHeading, { color: colors.text }]}>Cashback Tiers</Text>
          {config.rechargeConfig.tiers.map((tier, i) => (
            <View key={i} style={[styles.tierRow, { borderColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.tierLabel, { color: colors.text }]}>Min Amount</Text>
                <TextInput
                  style={[styles.fieldInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                  value={String(tier.minAmount)}
                  onChangeText={v => updateTier(i, 'minAmount', v)}
                  keyboardType="numeric"
                  selectTextOnFocus
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.tierLabel, { color: colors.text }]}>Cashback %</Text>
                <TextInput
                  style={[styles.fieldInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                  value={String(tier.cashbackPercentage)}
                  onChangeText={v => updateTier(i, 'cashbackPercentage', v)}
                  keyboardType="numeric"
                  selectTextOnFocus
                />
              </View>
              <TouchableOpacity style={styles.removeTierBtn} onPress={() => removeTier(i)}>
                <Ionicons name="trash-outline" size={18} color="#EF4444" />
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity style={[styles.addTierBtn, { borderColor: colors.border }]} onPress={addTier}>
            <Ionicons name="add-circle-outline" size={16} color={colors.tint} />
            <Text style={[styles.addTierText, { color: colors.tint }]}>Add Tier</Text>
          </TouchableOpacity>
        </>)}

        {/* Expiry Config */}
        {renderSectionCard('expiry', <>
          {renderInput('Promo Expiry Days', 'expiryConfig.promoExpiryDays', config.expiryConfig.promoExpiryDays)}
          {renderInput('Alert Days Before', 'expiryConfig.alertDaysBefore', config.expiryConfig.alertDaysBefore)}
          {renderInput('Grace Period Days', 'expiryConfig.gracePeriodDays', config.expiryConfig.gracePeriodDays)}
        </>)}

        {/* Coin Expiry Rules */}
        {renderSectionCard('coinExpiry', <>
          <Text style={[styles.subHeading, { color: colors.text }]}>Per-Coin-Type Expiry & Usage Rules</Text>
          <Text style={{ fontSize: 12, color: '#6B7280', marginBottom: 8 }}>Set expiry days (0 = never expires) and max usage % per transaction for each coin type.</Text>
          {(['rez', 'prive', 'promo', 'branded'] as const).map(coinType => {
            const label = coinType === 'rez' ? 'ReZ (Nuqta)' : coinType === 'prive' ? 'Prive' : coinType === 'promo' ? 'Promo' : 'Branded';
            const cfg = config.coinExpiryConfig?.[coinType] || { expiryDays: 0, maxUsagePct: 100 };
            return (
              <View key={coinType} style={[styles.tierRow, { borderColor: colors.border }]}>
                <View style={{ width: 80 }}>
                  <Text style={[styles.tierLabel, { color: colors.text, fontWeight: '700' }]}>{label}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.tierLabel, { color: colors.text }]}>Expiry Days</Text>
                  <TextInput
                    style={[styles.fieldInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                    value={String(cfg.expiryDays)}
                    onChangeText={v => updateField(`coinExpiryConfig.${coinType}.expiryDays`, parseFloat(v) || 0)}
                    keyboardType="numeric"
                    selectTextOnFocus
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.tierLabel, { color: colors.text }]}>Max Usage %</Text>
                  <TextInput
                    style={[styles.fieldInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                    value={String(cfg.maxUsagePct)}
                    onChangeText={v => updateField(`coinExpiryConfig.${coinType}.maxUsagePct`, parseFloat(v) || 0)}
                    keyboardType="numeric"
                    selectTextOnFocus
                  />
                </View>
              </View>
            );
          })}
        </>)}

        {/* Commission & Conversion */}
        {renderSectionCard('commission', <>
          {renderInput('Commission Rate', 'commissionRate', config.commissionRate, '0-1')}
          {renderInput('Nuqta to INR', 'coinConversion.nuqtaToInr', config.coinConversion.nuqtaToInr)}
          {renderInput('Promo to INR', 'coinConversion.promoToInr', config.coinConversion.promoToInr)}
          {renderInput('Branded to INR', 'coinConversion.brandedToInr', config.coinConversion.brandedToInr)}
        </>)}

        {/* Fraud Thresholds */}
        {renderSectionCard('fraud', <>
          {renderInput('Max Transfers/Hour', 'fraudThresholds.maxTransfersPerHour', config.fraudThresholds.maxTransfersPerHour)}
          {renderInput('Max Gifts/Day', 'fraudThresholds.maxGiftsPerDay', config.fraudThresholds.maxGiftsPerDay)}
          {renderInput('Suspicious Amount', 'fraudThresholds.suspiciousAmountThreshold', config.fraudThresholds.suspiciousAmountThreshold)}
          {renderInput('Auto Freeze Multiplier', 'fraudThresholds.autoFreezeMultiplier', config.fraudThresholds.autoFreezeMultiplier)}
        </>)}

        {/* Bottom Save */}
        <TouchableOpacity
          style={[styles.bottomSave, !dirty && { backgroundColor: '#9CA3AF' }]}
          onPress={handleSave}
          disabled={!dirty || saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={styles.bottomSaveText}>{dirty ? 'Save All Changes' : 'No Changes'}</Text>
          )}
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { marginTop: 12, fontSize: 14 },
  errorText: { marginTop: 12, fontSize: 15, textAlign: 'center' },
  retryButton: { marginTop: 16, backgroundColor: '#1a3a52', borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12 },
  retryButtonText: { color: '#FFF', fontWeight: '600', fontSize: 14 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: { padding: 8 },
  saveButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: '#1a3a52' },
  saveButtonDisabled: { backgroundColor: '#9CA3AF' },
  saveButtonText: { fontWeight: '600', color: '#FFF', fontSize: 14 },
  scrollContent: { padding: 16, paddingBottom: 60 },
  card: { borderRadius: 12, marginBottom: 12, borderWidth: 1, overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 8 },
  cardTitle: { flex: 1, fontSize: 16, fontWeight: '700' },
  cardBody: { paddingHorizontal: 16, paddingBottom: 16, borderTopWidth: 1 },
  fieldRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  fieldLabel: { fontSize: 13, fontWeight: '600', flex: 1 },
  fieldInput: { borderRadius: 8, padding: 10, borderWidth: 1, minWidth: 120, textAlign: 'right', fontSize: 14 },
  subHeading: { fontSize: 14, fontWeight: '700', marginTop: 16, marginBottom: 4 },
  tierRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 8, paddingBottom: 8, borderBottomWidth: 1 },
  tierLabel: { fontSize: 11, fontWeight: '600', marginBottom: 4 },
  removeTierBtn: { padding: 10 },
  addTierBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderWidth: 1, borderStyle: 'dashed', borderRadius: 8, marginTop: 8 },
  addTierText: { fontSize: 13, fontWeight: '600' },
  bottomSave: { backgroundColor: '#1a3a52', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 8 },
  bottomSaveText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
