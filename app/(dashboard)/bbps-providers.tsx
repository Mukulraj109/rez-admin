import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, RefreshControl,
  ActivityIndicator, TextInput, Modal, useColorScheme, SafeAreaView,
  ScrollView, StyleSheet, Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { showAlert, showConfirm } from '../../utils/alert';
import { bbpsAdminService, BbpsProvider, BillType } from '../../services/api/bbps';

const BILL_TYPES: { key: string; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'prepaid', label: 'Prepaid' },
  { key: 'postpaid', label: 'Postpaid' },
  { key: 'electricity', label: 'Electricity' },
  { key: 'dth', label: 'DTH' },
  { key: 'broadband', label: 'Broadband' },
  { key: 'gas', label: 'Gas' },
  { key: 'fastag', label: 'FASTag' },
  { key: 'water', label: 'Water' },
  { key: 'insurance', label: 'Insurance' },
];

const EMPTY_FORM: Partial<BbpsProvider> = {
  name: '',
  code: '',
  billType: 'prepaid',
  aggregatorCode: '',
  cashbackPercent: 0,
  promoCoinsFixed: 0,
  minAmount: 10,
  maxAmount: 100000,
  isActive: true,
};

export default function BbpsProvidersScreen() {
  const scheme = useColorScheme();
  const colors = Colors[scheme ?? 'light'];

  const [providers, setProviders] = useState<BbpsProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editingProvider, setEditingProvider] = useState<BbpsProvider | null>(null);
  const [form, setForm] = useState<Partial<BbpsProvider>>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadData(1); }, [activeTab]);

  const loadData = async (pageNum = 1, append = false) => {
    try {
      if (!append) setLoading(true);
      const { providers: items } = await bbpsAdminService.getProviders(
        pageNum, 20, activeTab, search || undefined
      );
      setProviders(prev => append ? [...prev, ...items] : items);
      setHasMore(items.length === 20);
      setPage(pageNum);
    } catch {
      showAlert('Error', 'Failed to load providers');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => { setRefreshing(true); loadData(1); };

  const handleToggle = async (provider: BbpsProvider) => {
    setTogglingId(provider._id);
    try {
      await bbpsAdminService.toggleProvider(provider._id);
      setProviders(prev =>
        prev.map(p => p._id === provider._id ? { ...p, isActive: !p.isActive } : p)
      );
    } catch {
      showAlert('Error', 'Failed to toggle provider');
    } finally {
      setTogglingId(null);
    }
  };

  const openCreate = () => {
    setEditingProvider(null);
    setForm({ ...EMPTY_FORM });
    setShowModal(true);
  };

  const openEdit = (provider: BbpsProvider) => {
    setEditingProvider(provider);
    setForm({
      name: provider.name,
      code: provider.code,
      billType: provider.billType,
      aggregatorCode: provider.aggregatorCode,
      cashbackPercent: provider.cashbackPercent,
      promoCoinsFixed: provider.promoCoinsFixed,
      minAmount: provider.minAmount,
      maxAmount: provider.maxAmount,
      isActive: provider.isActive,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name?.trim() || !form.code?.trim()) {
      showAlert('Error', 'Name and code are required');
      return;
    }
    setSaving(true);
    try {
      if (editingProvider) {
        await bbpsAdminService.updateProvider(editingProvider._id, form);
        showAlert('Success', 'Provider updated');
      } else {
        await bbpsAdminService.createProvider(form);
        showAlert('Success', 'Provider created');
      }
      setShowModal(false);
      loadData(1);
    } catch {
      showAlert('Error', editingProvider ? 'Failed to update provider' : 'Failed to create provider');
    } finally {
      setSaving(false);
    }
  };

  const getBillTypeColor = (type: string) => {
    const map: Record<string, string> = {
      prepaid: '#3B82F6', postpaid: '#8B5CF6', electricity: '#F59E0B',
      dth: '#EC4899', broadband: '#06B6D4', gas: '#EF4444',
      fastag: '#10B981', water: '#0EA5E9', insurance: '#6366F1', loan: '#D97706',
    };
    return map[type] || colors.tabIconDefault;
  };

  const renderItem = useCallback(({ item }: { item: BbpsProvider }) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card }]}
      onPress={() => openEdit(item)}
      activeOpacity={0.7}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1, marginRight: 12 }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>{item.name}</Text>
          <Text style={{ fontSize: 12, color: colors.tabIconDefault, marginTop: 2 }}>Code: {item.code}</Text>
          {item.aggregatorCode ? (
            <Text style={{ fontSize: 11, color: colors.tabIconDefault, marginTop: 1 }}>
              Aggregator: {item.aggregatorCode}
            </Text>
          ) : null}
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <View style={{
            paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
            backgroundColor: `${getBillTypeColor(item.billType)}18`,
          }}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: getBillTypeColor(item.billType) }}>
              {item.billType.toUpperCase()}
            </Text>
          </View>
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Ionicons name="cash-outline" size={13} color={colors.success} />
          <Text style={{ fontSize: 12, color: colors.text }}>
            {item.cashbackPercent}% cashback
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Ionicons name="gift-outline" size={13} color={colors.purple} />
          <Text style={{ fontSize: 12, color: colors.text }}>
            {item.promoCoinsFixed} coins
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Ionicons name="wallet-outline" size={13} color={colors.info} />
          <Text style={{ fontSize: 12, color: colors.tabIconDefault }}>
            {item.minAmount.toLocaleString()}-{item.maxAmount.toLocaleString()}
          </Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
        <View style={{
          paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6,
          backgroundColor: item.isActive ? '#DCFCE7' : '#FEE2E2',
        }}>
          <Text style={{
            fontSize: 11, fontWeight: '700',
            color: item.isActive ? '#166534' : '#991B1B',
          }}>
            {item.isActive ? 'ACTIVE' : 'INACTIVE'}
          </Text>
        </View>
        {togglingId === item._id ? (
          <ActivityIndicator size="small" color={colors.tint} />
        ) : (
          <Switch
            value={item.isActive}
            onValueChange={() => handleToggle(item)}
            trackColor={{ false: colors.border, true: colors.success }}
            thumbColor="#fff"
          />
        )}
      </View>
    </TouchableOpacity>
  ), [colors, togglingId]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{ padding: 16, paddingBottom: 0 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text }}>Bill Providers</Text>
            <Text style={{ fontSize: 13, color: colors.tabIconDefault, marginTop: 4 }}>
              Manage BBPS bill payment providers
            </Text>
          </View>
          <TouchableOpacity
            onPress={openCreate}
            style={{
              backgroundColor: colors.tint, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8,
              flexDirection: 'row', alignItems: 'center', gap: 4,
            }}
          >
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Add</Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card,
          borderRadius: 10, paddingHorizontal: 12, marginTop: 12,
        }}>
          <Ionicons name="search" size={16} color={colors.tabIconDefault} />
          <TextInput
            style={{ flex: 1, padding: 10, color: colors.text, fontSize: 14 }}
            placeholder="Search providers..."
            placeholderTextColor={colors.tabIconDefault}
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={() => loadData(1)}
            returnKeyType="search"
          />
        </View>

        {/* Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12, marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {BILL_TYPES.map(tab => (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                style={{
                  paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8,
                  backgroundColor: activeTab === tab.key ? colors.tint : colors.card,
                }}
              >
                <Text style={{
                  fontSize: 12, fontWeight: '700',
                  color: activeTab === tab.key ? '#fff' : colors.text,
                }}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* List */}
      {loading && providers.length === 0 ? (
        <ActivityIndicator size="large" color={colors.tint} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={providers}
          keyExtractor={item => item._id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingTop: 0, paddingBottom: 120 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />}
          onEndReached={() => hasMore && !loading && loadData(page + 1, true)}
          onEndReachedThreshold={0.3}
          ListFooterComponent={loading && providers.length > 0 ? <ActivityIndicator style={{ marginVertical: 16 }} color={colors.tint} /> : null}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 40 }}>
              <Ionicons name="list-outline" size={48} color={colors.tabIconDefault} />
              <Text style={{ textAlign: 'center', color: colors.tabIconDefault, marginTop: 12 }}>
                No providers found
              </Text>
            </View>
          }
        />
      )}

      {/* Create / Edit Modal */}
      <Modal visible={showModal} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 }}>
          <View style={{ backgroundColor: colors.card, borderRadius: 16, padding: 20, maxHeight: '85%' }}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 16 }}>
                {editingProvider ? 'Edit Provider' : 'Add Provider'}
              </Text>

              {/* Name */}
              <Text style={[styles.label, { color: colors.tabIconDefault }]}>Provider Name *</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
                placeholder="e.g. Jio Prepaid"
                placeholderTextColor={colors.tabIconDefault}
                value={form.name}
                onChangeText={v => setForm(f => ({ ...f, name: v }))}
              />

              {/* Code */}
              <Text style={[styles.label, { color: colors.tabIconDefault }]}>Provider Code *</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
                placeholder="e.g. JIO_PREPAID"
                placeholderTextColor={colors.tabIconDefault}
                value={form.code}
                onChangeText={v => setForm(f => ({ ...f, code: v }))}
                autoCapitalize="characters"
              />

              {/* Bill Type */}
              <Text style={[styles.label, { color: colors.tabIconDefault }]}>Bill Type</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {BILL_TYPES.filter(t => t.key !== 'all').map(t => (
                    <TouchableOpacity
                      key={t.key}
                      onPress={() => setForm(f => ({ ...f, billType: t.key as BillType }))}
                      style={{
                        paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6,
                        backgroundColor: form.billType === t.key ? colors.tint : colors.background,
                        borderWidth: 1, borderColor: form.billType === t.key ? colors.tint : colors.border,
                      }}
                    >
                      <Text style={{
                        fontSize: 12, fontWeight: '600',
                        color: form.billType === t.key ? '#fff' : colors.text,
                      }}>{t.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              {/* Aggregator Code */}
              <Text style={[styles.label, { color: colors.tabIconDefault }]}>Aggregator Code</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
                placeholder="e.g. RAZORPAY_JIO"
                placeholderTextColor={colors.tabIconDefault}
                value={form.aggregatorCode}
                onChangeText={v => setForm(f => ({ ...f, aggregatorCode: v }))}
              />

              {/* Cashback Percent */}
              <Text style={[styles.label, { color: colors.tabIconDefault }]}>Cashback Percent (%)</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
                placeholder="0"
                placeholderTextColor={colors.tabIconDefault}
                value={String(form.cashbackPercent ?? 0)}
                onChangeText={v => setForm(f => ({ ...f, cashbackPercent: parseFloat(v) || 0 }))}
                keyboardType="numeric"
              />

              {/* Promo Coins */}
              <Text style={[styles.label, { color: colors.tabIconDefault }]}>Promo Coins (Fixed)</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
                placeholder="0"
                placeholderTextColor={colors.tabIconDefault}
                value={String(form.promoCoinsFixed ?? 0)}
                onChangeText={v => setForm(f => ({ ...f, promoCoinsFixed: parseInt(v) || 0 }))}
                keyboardType="numeric"
              />

              {/* Min/Max Amount */}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, { color: colors.tabIconDefault }]}>Min Amount</Text>
                  <TextInput
                    style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
                    placeholder="10"
                    placeholderTextColor={colors.tabIconDefault}
                    value={String(form.minAmount ?? 10)}
                    onChangeText={v => setForm(f => ({ ...f, minAmount: parseFloat(v) || 0 }))}
                    keyboardType="numeric"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, { color: colors.tabIconDefault }]}>Max Amount</Text>
                  <TextInput
                    style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
                    placeholder="100000"
                    placeholderTextColor={colors.tabIconDefault}
                    value={String(form.maxAmount ?? 100000)}
                    onChangeText={v => setForm(f => ({ ...f, maxAmount: parseFloat(v) || 0 }))}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              {/* Active toggle */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, marginBottom: 8 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>Active</Text>
                <Switch
                  value={form.isActive}
                  onValueChange={v => setForm(f => ({ ...f, isActive: v }))}
                  trackColor={{ false: colors.border, true: colors.success }}
                  thumbColor="#fff"
                />
              </View>

              {/* Buttons */}
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                <TouchableOpacity
                  onPress={() => setShowModal(false)}
                  style={{
                    flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 10,
                    padding: 12, alignItems: 'center',
                  }}
                >
                  <Text style={{ color: colors.text, fontWeight: '600' }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSave}
                  disabled={saving}
                  style={{
                    flex: 1, backgroundColor: colors.tint, borderRadius: 10,
                    padding: 12, alignItems: 'center',
                  }}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={{ color: '#fff', fontWeight: '700' }}>
                      {editingProvider ? 'Update' : 'Create'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    marginBottom: 4,
  },
});
