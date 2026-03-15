import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Platform, StyleSheet } from 'react-native';
import priveAdminApi from '@/services/api/priveAdmin';
import { Colors } from '@/constants/Colors';

export default function RedemptionConfigTab({ colors }: { colors: any }) {
  const [config, setConfig] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [rates, setRates] = useState({ gift_card: '0.10', bill_pay: '0.10', experience: '0.12', charity: '0.15' });
  const [minCoins, setMinCoins] = useState({ gift_card: '500', bill_pay: '100', experience: '1000', charity: '100' });
  const [expiryDays, setExpiryDays] = useState({ gift_card: '365', bill_pay: '30', experience: '90', charity: '7' });
  const [maxCoins, setMaxCoins] = useState('50000');
  const [dailyLimit, setDailyLimit] = useState('5');
  const [reAuthThreshold, setReAuthThreshold] = useState('5000');

  const fetchConfig = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await priveAdminApi.getRedemptionConfig();
      const rc = res.data?.data?.redemptionConfig;
      if (rc) {
        setConfig(rc);
        if (rc.conversionRates) {
          setRates({
            gift_card: String(rc.conversionRates.gift_card ?? 0.10),
            bill_pay: String(rc.conversionRates.bill_pay ?? 0.10),
            experience: String(rc.conversionRates.experience ?? 0.12),
            charity: String(rc.conversionRates.charity ?? 0.15),
          });
        }
        if (rc.minCoinsPerCategory) {
          setMinCoins({
            gift_card: String(rc.minCoinsPerCategory.gift_card ?? 500),
            bill_pay: String(rc.minCoinsPerCategory.bill_pay ?? 100),
            experience: String(rc.minCoinsPerCategory.experience ?? 1000),
            charity: String(rc.minCoinsPerCategory.charity ?? 100),
          });
        }
        if (rc.expiryDays) {
          setExpiryDays({
            gift_card: String(rc.expiryDays.gift_card ?? 365),
            bill_pay: String(rc.expiryDays.bill_pay ?? 30),
            experience: String(rc.expiryDays.experience ?? 90),
            charity: String(rc.expiryDays.charity ?? 7),
          });
        }
        setMaxCoins(String(rc.maxCoinsPerRedemption ?? 50000));
        setDailyLimit(String(rc.dailyRedemptionLimit ?? 5));
        setReAuthThreshold(String(rc.reAuthThreshold ?? 5000));
      }
    } catch (err) {
      console.error('Failed to fetch config:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await priveAdminApi.updateRedemptionConfig({
        conversionRates: { gift_card: parseFloat(rates.gift_card), bill_pay: parseFloat(rates.bill_pay), experience: parseFloat(rates.experience), charity: parseFloat(rates.charity) },
        minCoinsPerCategory: { gift_card: parseInt(minCoins.gift_card), bill_pay: parseInt(minCoins.bill_pay), experience: parseInt(minCoins.experience), charity: parseInt(minCoins.charity) },
        expiryDays: { gift_card: parseInt(expiryDays.gift_card), bill_pay: parseInt(expiryDays.bill_pay), experience: parseInt(expiryDays.experience), charity: parseInt(expiryDays.charity) },
        maxCoinsPerRedemption: parseInt(maxCoins),
        dailyRedemptionLimit: parseInt(dailyLimit),
        reAuthThreshold: parseInt(reAuthThreshold),
      });
      if (Platform.OS === 'web') window.alert('Configuration saved successfully');
      fetchConfig();
    } catch (err) {
      console.error('Failed to save config:', err);
      if (Platform.OS === 'web') window.alert('Failed to save configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const categories = ['gift_card', 'bill_pay', 'experience', 'charity'];
  const categoryLabels: Record<string, string> = { gift_card: 'Gift Card', bill_pay: 'Bill Pay', experience: 'Experience', charity: 'Charity' };

  if (isLoading) {
    return (
      <View style={[styles.tabContent, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={colors.gold} />
      </View>
    );
  }

  const renderConfigSection = (title: string, subtitle: string | null, data: Record<string, string>, setter: (v: any) => void, keyboardType: 'decimal-pad' | 'numeric' = 'numeric') => (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      <Text style={[styles.cardTitle, { color: colors.text }]}>{title}</Text>
      {subtitle && <Text style={[styles.cardSubtitle, { color: colors.secondaryText, marginBottom: 12 }]}>{subtitle}</Text>}
      {categories.map((cat) => (
        <View key={cat} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
          <Text style={{ color: colors.text, width: 100, fontSize: 13 }}>{categoryLabels[cat]}</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.background, color: colors.text }]}
            value={(data as any)[cat]}
            onChangeText={(v) => setter((prev: any) => ({ ...prev, [cat]: v }))}
            keyboardType={keyboardType}
          />
        </View>
      ))}
    </View>
  );

  return (
    <ScrollView style={styles.tabContent}>
      <Text style={[styles.cardTitle, { color: colors.text, fontSize: 17, marginBottom: 16 }]}>
        Redemption Configuration
      </Text>

      {renderConfigSection('Conversion Rates (coins to currency)', '1 coin = X currency units', rates, setRates, 'decimal-pad')}
      {renderConfigSection('Minimum Coins per Category', null, minCoins, setMinCoins)}
      {renderConfigSection('Voucher Expiry Days', null, expiryDays, setExpiryDays)}

      {/* Global Limits */}
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>Global Limits</Text>
        {[
          { label: 'Max coins/redeem', value: maxCoins, setter: setMaxCoins },
          { label: 'Daily limit', value: dailyLimit, setter: setDailyLimit },
          { label: 'Re-auth threshold', value: reAuthThreshold, setter: setReAuthThreshold },
        ].map(({ label, value, setter }) => (
          <View key={label} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, marginTop: label === 'Max coins/redeem' ? 8 : 0 }}>
            <Text style={{ color: colors.text, width: 140, fontSize: 13 }}>{label}</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text }]}
              value={value}
              onChangeText={setter}
              keyboardType="numeric"
            />
          </View>
        ))}
      </View>

      {/* Save Button */}
      <TouchableOpacity
        style={[styles.submitBtn, isSaving && { opacity: 0.6 }]}
        onPress={handleSave}
        disabled={isSaving}
      >
        {isSaving ? (
          <ActivityIndicator size="small" color="#000" />
        ) : (
          <Text style={styles.submitBtnText}>Save Configuration</Text>
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
  cardSubtitle: { fontSize: 12, marginTop: 2 },
  input: { padding: 8, borderRadius: 8, flex: 1, fontSize: 14 },
  submitBtn: { backgroundColor: Colors.light.gold, borderRadius: 10, padding: 14, alignItems: 'center', marginBottom: 24 },
  submitBtnText: { color: Colors.light.text, fontSize: 15, fontWeight: '600' },
});
