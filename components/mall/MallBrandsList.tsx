import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, ScrollView, Image, ActivityIndicator, RefreshControl, Modal, Switch, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { mallService, MallBrand } from '../../services/api/mall';
import { showAlert, showConfirm } from '../../utils/alert';
import { Colors } from '../../constants/Colors';

type BrandFilter = 'all' | 'active' | 'inactive' | 'featured' | 'luxury';

export default function MallBrandsList({ colors }: { colors: any }) {
  const [brands, setBrands] = useState<MallBrand[]>([]);
  const [brandFilter, setBrandFilter] = useState<BrandFilter>('all');
  const [brandSearch, setBrandSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<MallBrand | null>(null);
  const [form, setForm] = useState({ name: '', slug: '', description: '', logo: '', externalUrl: '', tier: 'standard' as string, mallCategory: '', cashbackPercentage: '0', cashbackMaxAmount: '', cashbackMinPurchase: '', isActive: true, isFeatured: false, isLuxury: false, isNewArrival: false, badges: '', tags: '' });

  const loadBrands = async () => {
    try {
      setLoading(true);
      const params: any = { limit: 50 };
      if (brandFilter === 'active') params.isActive = true;
      if (brandFilter === 'inactive') params.isActive = false;
      if (brandSearch) params.search = brandSearch;
      const result = await mallService.getBrands(params);
      let filtered = result.brands;
      if (brandFilter === 'featured') filtered = filtered.filter(b => b.isFeatured);
      else if (brandFilter === 'luxury') filtered = filtered.filter(b => b.isLuxury || b.tier === 'luxury');
      setBrands(filtered);
    } catch (e: any) { showAlert('Error', 'Failed to load brands'); } finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { loadBrands(); }, [brandFilter]);

  const openForm = (brand?: MallBrand) => {
    if (brand) {
      setEditing(brand);
      setForm({ name: brand.name, slug: brand.slug, description: brand.description || '', logo: brand.logo || '', externalUrl: brand.externalUrl || '', tier: brand.tier, mallCategory: brand.mallCategory?._id || '', cashbackPercentage: brand.cashback?.percentage?.toString() || '0', cashbackMaxAmount: brand.cashback?.maxAmount?.toString() || '', cashbackMinPurchase: brand.cashback?.minPurchase?.toString() || '', isActive: brand.isActive, isFeatured: brand.isFeatured, isLuxury: brand.isLuxury, isNewArrival: brand.isNewArrival || false, badges: brand.badges?.join(', ') || '', tags: brand.tags?.join(', ') || '' });
    } else {
      setEditing(null);
      setForm({ name: '', slug: '', description: '', logo: '', externalUrl: '', tier: 'standard', mallCategory: '', cashbackPercentage: '0', cashbackMaxAmount: '', cashbackMinPurchase: '', isActive: true, isFeatured: false, isLuxury: false, isNewArrival: false, badges: '', tags: '' });
    }
    setShowModal(true);
  };

  const save = async () => {
    if (!form.name.trim()) { showAlert('Error', 'Brand name is required'); return; }
    try {
      const cashback: any = { percentage: parseFloat(form.cashbackPercentage) || 0 };
      if (form.cashbackMaxAmount) cashback.maxAmount = parseFloat(form.cashbackMaxAmount);
      if (form.cashbackMinPurchase) cashback.minPurchase = parseFloat(form.cashbackMinPurchase);
      const data: any = { name: form.name.trim(), slug: form.slug.trim() || form.name.toLowerCase().replace(/\s+/g, '-'), description: form.description.trim(), logo: form.logo.trim(), externalUrl: form.externalUrl.trim(), tier: form.tier, mallCategory: form.mallCategory || undefined, cashback, isActive: form.isActive, isFeatured: form.isFeatured, isLuxury: form.isLuxury, isNewArrival: form.isNewArrival, badges: form.badges.split(',').map(b => b.trim()).filter(Boolean), tags: form.tags.split(',').map(t => t.trim()).filter(Boolean) };
      if (editing) { await mallService.updateBrand(editing._id, data); showAlert('Success', 'Brand updated'); } else { await mallService.createBrand(data); showAlert('Success', 'Brand created'); }
      setShowModal(false); loadBrands();
    } catch (e: any) { showAlert('Error', e.message || 'Failed to save brand'); }
  };

  const deleteBrand = (brand: MallBrand) => { showConfirm('Delete Brand', `Delete "${brand.name}"?`, async () => { try { setProcessing(brand._id); await mallService.deleteBrand(brand._id); loadBrands(); } catch (e: any) { showAlert('Error', e.message); } finally { setProcessing(null); } }, 'Delete'); };
  const toggleActive = async (brand: MallBrand) => { try { setProcessing(brand._id); await mallService.updateBrand(brand._id, { isActive: !brand.isActive } as any); loadBrands(); } catch (e) { showAlert('Error', 'Failed'); } finally { setProcessing(null); } };
  const toggleFeatured = async (brand: MallBrand) => { try { setProcessing(brand._id); await mallService.updateBrand(brand._id, { isFeatured: !brand.isFeatured } as any); loadBrands(); } catch (e) { showAlert('Error', 'Failed'); } finally { setProcessing(null); } };

  const renderItem = ({ item }: { item: MallBrand }) => (
    <View style={[styles.listItem, { backgroundColor: colors.card }]}>
      <View style={styles.row}>{item.logo ? <Image source={{ uri: item.logo }} style={styles.img} /> : <View style={[styles.imgFallback, { backgroundColor: colors.navy }]}><Text style={styles.initials}>{item.name.charAt(0).toUpperCase()}</Text></View>}
        <View style={{ flex: 1 }}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>{item.isFeatured && <View style={[styles.badge, { backgroundColor: Colors.light.warning + '20' }]}><Text style={{ color: Colors.light.warning, fontSize: 10, fontWeight: '600' }}>Featured</Text></View>}</View>
          <Text style={{ color: colors.icon, fontSize: 12, marginTop: 2 }}>{item.tier} | {item.cashback?.percentage || 0}% cashback</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}><View style={[styles.dot, { backgroundColor: item.isActive ? Colors.light.success : Colors.light.error }]} /><Text style={{ color: colors.icon, fontSize: 11 }}>{item.isActive ? 'Active' : 'Inactive'}</Text></View></View></View>
      <View style={styles.actions}>{processing === item._id ? <ActivityIndicator size="small" color={colors.tint} /> : (<>
        <TouchableOpacity style={styles.actionBtn} onPress={() => toggleFeatured(item)}><Ionicons name={item.isFeatured ? 'star' : 'star-outline'} size={18} color={Colors.light.warning} /></TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => toggleActive(item)}><Ionicons name={item.isActive ? 'eye' : 'eye-off'} size={18} color={item.isActive ? Colors.light.success : Colors.light.error} /></TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => openForm(item)}><Ionicons name="create-outline" size={18} color={colors.tint} /></TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => deleteBrand(item)}><Ionicons name="trash-outline" size={18} color={Colors.light.error} /></TouchableOpacity>
      </>)}</View>
    </View>
  );

  const Field = ({ label, value, onChange, placeholder, multiline }: any) => (<View style={{ marginBottom: 16 }}><Text style={[styles.formLabel, { color: colors.text }]}>{label}</Text><TextInput style={[styles.formInput, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }, multiline && { height: 80, textAlignVertical: 'top' }]} value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={colors.icon} multiline={multiline} /></View>);
  const SwitchField = ({ label, value, onChange }: any) => (<View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}><Text style={[styles.formLabel, { color: colors.text }]}>{label}</Text><Switch value={value} onValueChange={onChange} trackColor={{ false: Colors.light.border, true: colors.tint }} thumbColor={Colors.light.card} /></View>);

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.searchRow}><View style={[styles.searchBox, { backgroundColor: colors.card }]}><Ionicons name="search" size={18} color={colors.icon} /><TextInput style={[{ flex: 1, fontSize: 14, color: colors.text }]} placeholder="Search brands..." placeholderTextColor={colors.icon} value={brandSearch} onChangeText={setBrandSearch} onSubmitEditing={loadBrands} /></View><TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.tint }]} onPress={() => openForm()}><Ionicons name="add" size={22} color={colors.card} /></TouchableOpacity></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingHorizontal: 16, marginBottom: 8 }}>{(['all', 'active', 'inactive', 'featured', 'luxury'] as BrandFilter[]).map(f => (<TouchableOpacity key={f} style={[styles.chip, brandFilter === f ? { backgroundColor: colors.tint } : { backgroundColor: colors.card }]} onPress={() => setBrandFilter(f)}><Text style={{ color: brandFilter === f ? colors.card : colors.icon, fontSize: 13, fontWeight: '600' }}>{f.charAt(0).toUpperCase() + f.slice(1)}</Text></TouchableOpacity>))}</ScrollView>
      <FlatList data={brands} renderItem={renderItem} keyExtractor={i => i._id} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadBrands(); }} tintColor={colors.tint} />} ListEmptyComponent={loading ? <View style={styles.center}><ActivityIndicator size="large" color={colors.tint} /></View> : <View style={styles.center}><Ionicons name="storefront-outline" size={48} color={colors.icon} /><Text style={{ color: colors.icon, fontSize: 16 }}>No brands found</Text></View>} />
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[{ flex: 1 }, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: colors.card }]}><TouchableOpacity onPress={() => setShowModal(false)}><Text style={{ color: colors.tint, fontSize: 16 }}>Cancel</Text></TouchableOpacity><Text style={[styles.modalTitle, { color: colors.text }]}>{editing ? 'Edit Brand' : 'New Brand'}</Text><TouchableOpacity onPress={save}><Text style={{ color: colors.tint, fontSize: 16, fontWeight: '600' }}>Save</Text></TouchableOpacity></View>
          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
            <Field label="Name *" value={form.name} onChange={(v: string) => setForm(p => ({ ...p, name: v }))} />
            <Field label="Slug" value={form.slug} onChange={(v: string) => setForm(p => ({ ...p, slug: v }))} placeholder="auto-generated" />
            <Field label="Description" value={form.description} onChange={(v: string) => setForm(p => ({ ...p, description: v }))} multiline />
            <Field label="Logo URL" value={form.logo} onChange={(v: string) => setForm(p => ({ ...p, logo: v }))} />
            <Field label="External URL" value={form.externalUrl} onChange={(v: string) => setForm(p => ({ ...p, externalUrl: v }))} />
            <View style={{ marginBottom: 16 }}><Text style={[styles.formLabel, { color: colors.text }]}>Tier</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{['standard', 'premium', 'exclusive', 'luxury'].map(t => (<TouchableOpacity key={t} style={[{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 }, form.tier === t ? { backgroundColor: colors.tint } : { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]} onPress={() => setForm(p => ({ ...p, tier: t }))}><Text style={{ color: form.tier === t ? colors.card : colors.icon, fontSize: 12, fontWeight: '600' }}>{t.charAt(0).toUpperCase() + t.slice(1)}</Text></TouchableOpacity>))}</View></View>
            <Field label="Category ID" value={form.mallCategory} onChange={(v: string) => setForm(p => ({ ...p, mallCategory: v }))} placeholder="MallCategory ObjectId" />
            <Field label="Cashback %" value={form.cashbackPercentage} onChange={(v: string) => setForm(p => ({ ...p, cashbackPercentage: v }))} />
            <Field label="Max Cashback" value={form.cashbackMaxAmount} onChange={(v: string) => setForm(p => ({ ...p, cashbackMaxAmount: v }))} />
            <Field label="Min Purchase" value={form.cashbackMinPurchase} onChange={(v: string) => setForm(p => ({ ...p, cashbackMinPurchase: v }))} />
            <Field label="Tags (comma separated)" value={form.tags} onChange={(v: string) => setForm(p => ({ ...p, tags: v }))} />
            <SwitchField label="Active" value={form.isActive} onChange={(v: boolean) => setForm(p => ({ ...p, isActive: v }))} />
            <SwitchField label="Featured" value={form.isFeatured} onChange={(v: boolean) => setForm(p => ({ ...p, isFeatured: v }))} />
            <SwitchField label="Luxury" value={form.isLuxury} onChange={(v: boolean) => setForm(p => ({ ...p, isLuxury: v }))} />
            <SwitchField label="New Arrival" value={form.isNewArrival} onChange={(v: boolean) => setForm(p => ({ ...p, isNewArrival: v }))} />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  searchRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 10 },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, gap: 8 },
  addBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 8 },
  listItem: { padding: 14, borderRadius: 12, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  img: { width: 44, height: 44, borderRadius: 10, backgroundColor: Colors.light.backgroundSecondary },
  imgFallback: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  initials: { fontSize: 18, fontWeight: '700', color: Colors.light.card },
  name: { fontSize: 15, fontWeight: '600', flex: 1 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 4, marginTop: 8 },
  actionBtn: { width: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60, gap: 12 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 60, paddingBottom: 14, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: Colors.light.border },
  modalTitle: { fontSize: 17, fontWeight: '600' },
  formLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  formInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
});
