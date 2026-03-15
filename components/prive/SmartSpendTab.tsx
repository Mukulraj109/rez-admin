import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, RefreshControl, Modal, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import priveAdminApi from '@/services/api/priveAdmin';
import { Colors } from '@/constants/Colors';

export default function SmartSpendTab({ colors }: { colors: any }) {
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [sections, setSections] = useState<string[]>([]);

  const [formItemType, setFormItemType] = useState<'store' | 'product'>('store');
  const [formStoreId, setFormStoreId] = useState('');
  const [formProductId, setFormProductId] = useState('');
  const [formDisplayTitle, setFormDisplayTitle] = useState('');
  const [formDisplayDescription, setFormDisplayDescription] = useState('');
  const [formBannerImage, setFormBannerImage] = useState('');
  const [formBadgeText, setFormBadgeText] = useState('');
  const [formCoinRewardRate, setFormCoinRewardRate] = useState('10');
  const [formCoinDisplayText, setFormCoinDisplayText] = useState('Earn 10% Prive Coins');
  const [formTierRequired, setFormTierRequired] = useState('entry');
  const [formSectionLabel, setFormSectionLabel] = useState('');
  const [formIsFeatured, setFormIsFeatured] = useState(false);
  const [formSortOrder, setFormSortOrder] = useState('0');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchItems = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await priveAdminApi.getSmartSpendItems({ page, limit: 20, search: search || undefined });
      if (res.data?.data) {
        setItems(res.data.data.items || []);
        setTotalPages(res.data.data.pagination?.totalPages || 1);
        if (res.data.data.sections) setSections(res.data.data.sections);
      }
    } catch (err) {
      console.error('Failed to fetch Smart Spend items:', err);
    } finally {
      setIsLoading(false);
    }
  }, [page, search]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleToggleStatus = async (id: string) => {
    try { await priveAdminApi.toggleSmartSpendItemStatus(id); fetchItems(); } catch (err) { console.error('Failed to toggle status:', err); }
  };

  const handleDelete = async (id: string) => {
    try { await priveAdminApi.deleteSmartSpendItem(id); fetchItems(); } catch (err) { console.error('Failed to delete item:', err); }
  };

  const handleCreate = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const data: any = {
        itemType: formItemType, coinRewardRate: parseFloat(formCoinRewardRate) / 100,
        coinRewardType: 'percentage', coinDisplayText: formCoinDisplayText,
        tierRequired: formTierRequired, isFeatured: formIsFeatured, sortOrder: parseInt(formSortOrder) || 0,
      };
      if (formItemType === 'store') data.store = formStoreId;
      if (formItemType === 'product') data.product = formProductId;
      if (formDisplayTitle) data.displayTitle = formDisplayTitle;
      if (formDisplayDescription) data.displayDescription = formDisplayDescription;
      if (formBannerImage) data.bannerImage = formBannerImage;
      if (formBadgeText) data.badgeText = formBadgeText;
      if (formSectionLabel) data.sectionLabel = formSectionLabel;

      await priveAdminApi.createSmartSpendItem(data);
      setShowCreateModal(false);
      resetForm();
      fetchItems();
    } catch (err: any) {
      console.error('Failed to create item:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormItemType('store'); setFormStoreId(''); setFormProductId('');
    setFormDisplayTitle(''); setFormDisplayDescription(''); setFormBannerImage('');
    setFormBadgeText(''); setFormCoinRewardRate('10'); setFormCoinDisplayText('Earn 10% Prive Coins');
    setFormTierRequired('entry'); setFormSectionLabel(''); setFormIsFeatured(false); setFormSortOrder('0');
  };

  const getItemName = (item: any): string => {
    if (item.itemType === 'store') return item.store?.name || item.displayTitle || 'Unknown Store';
    return item.product?.name || item.displayTitle || 'Unknown Product';
  };

  return (
    <ScrollView style={styles.tabContent} refreshControl={<RefreshControl refreshing={isLoading} onRefresh={fetchItems} />}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 0, marginBottom: 0 }]}>
          Smart Spend Catalog ({items.length} items)
        </Text>
        <TouchableOpacity style={[styles.submitBtn, { paddingHorizontal: 16, paddingVertical: 8, marginBottom: 0 }]} onPress={() => setShowCreateModal(true)}>
          <Text style={styles.submitBtnText}>+ Add Item</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.searchBar, { backgroundColor: colors.card }]}>
        <Ionicons name="search-outline" size={18} color={colors.icon} />
        <TextInput style={[styles.searchInput, { color: colors.text }]} placeholder="Search Smart Spend items..." placeholderTextColor={colors.secondaryText} value={search} onChangeText={setSearch} onSubmitEditing={() => { setPage(1); fetchItems(); }} />
      </View>

      {isLoading && items.length === 0 ? (
        <ActivityIndicator size="large" color={colors.gold} style={{ marginTop: 40 }} />
      ) : items.length === 0 ? (
        <Text style={[styles.emptyText, { color: colors.secondaryText }]}>No Smart Spend items. Add stores or products to the curated catalog.</Text>
      ) : (
        items.map((item: any) => (
          <View key={item._id} style={[styles.card, { backgroundColor: colors.card }]}>
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>{getItemName(item)}</Text>
                <Text style={[styles.cardSubtitle, { color: colors.secondaryText }]}>
                  {item.itemType === 'store' ? 'Store' : 'Product'} | Tier: {item.tierRequired} | Rate: {Math.round((item.coinRewardRate || 0.05) * 100)}%
                </Text>
                {item.sectionLabel && <Text style={{ color: colors.gold, fontSize: 11, marginTop: 2 }}>Section: {item.sectionLabel}</Text>}
              </View>
              <View style={[styles.statusBadge, { backgroundColor: item.isActive ? `${Colors.light.success}20` : `${Colors.light.error}20` }]}>
                <Text style={{ color: item.isActive ? colors.success : colors.error, fontSize: 11 }}>{item.isActive ? 'Active' : 'Inactive'}</Text>
              </View>
            </View>
            <View style={styles.cardStats}>
              <Text style={[styles.stat, { color: colors.secondaryText }]}>Views: {item.views || 0}</Text>
              <Text style={[styles.stat, { color: colors.secondaryText }]}>Clicks: {item.clicks || 0}</Text>
              <Text style={[styles.stat, { color: colors.secondaryText }]}>Purchases: {item.purchases || 0}</Text>
              {item.ctr != null && <Text style={[styles.stat, { color: colors.secondaryText }]}>CTR: {item.ctr}%</Text>}
            </View>
            {item.badgeText && <Text style={{ color: colors.gold, fontSize: 12, marginTop: 4 }}>Badge: {item.badgeText} | {item.coinDisplayText}</Text>}
            <View style={styles.cardActions}>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: `${colors.gold}20` }]} onPress={() => handleToggleStatus(item._id)}>
                <Text style={{ color: colors.gold, fontSize: 12 }}>{item.isActive ? 'Deactivate' : 'Activate'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: `${Colors.light.error}20` }]} onPress={() => handleDelete(item._id)}>
                <Text style={{ color: colors.error, fontSize: 12 }}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}

      {totalPages > 1 && (
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 12, marginVertical: 16 }}>
          <TouchableOpacity disabled={page <= 1} onPress={() => setPage(p => Math.max(1, p - 1))} style={{ opacity: page <= 1 ? 0.3 : 1 }}>
            <Text style={{ color: colors.gold }}>Previous</Text>
          </TouchableOpacity>
          <Text style={{ color: colors.secondaryText }}>Page {page} of {totalPages}</Text>
          <TouchableOpacity disabled={page >= totalPages} onPress={() => setPage(p => p + 1)} style={{ opacity: page >= totalPages ? 0.3 : 1 }}>
            <Text style={{ color: colors.gold }}>Next</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Create Modal */}
      <Modal visible={showCreateModal} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 }}>
          <View style={{ backgroundColor: colors.card, borderRadius: 16, padding: 20, maxHeight: '85%' }}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Add Smart Spend Item</Text>

              <Text style={{ color: colors.secondaryText, marginBottom: 4, fontSize: 13 }}>Item Type</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                {(['store', 'product'] as const).map(type => (
                  <TouchableOpacity key={type} style={{ flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center', backgroundColor: formItemType === type ? `${colors.gold}30` : colors.background, borderWidth: 1, borderColor: formItemType === type ? colors.gold : colors.border }} onPress={() => setFormItemType(type)}>
                    <Text style={{ color: formItemType === type ? colors.gold : colors.text, fontSize: 14, fontWeight: '500' }}>{type === 'store' ? 'Store' : 'Product'}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={{ color: colors.secondaryText, marginBottom: 4, fontSize: 13 }}>{formItemType === 'store' ? 'Store ID' : 'Product ID'}</Text>
              <TextInput style={[styles.reasonInput, { color: colors.text, borderColor: colors.border }]} placeholder={`Paste ${formItemType} ID from database`} placeholderTextColor={colors.secondaryText} value={formItemType === 'store' ? formStoreId : formProductId} onChangeText={formItemType === 'store' ? setFormStoreId : setFormProductId} />

              <Text style={{ color: colors.secondaryText, marginBottom: 4, fontSize: 13 }}>Display Title (optional override)</Text>
              <TextInput style={[styles.reasonInput, { color: colors.text, borderColor: colors.border }]} placeholder="Custom display title" placeholderTextColor={colors.secondaryText} value={formDisplayTitle} onChangeText={setFormDisplayTitle} />

              <Text style={{ color: colors.secondaryText, marginBottom: 4, fontSize: 13 }}>Description (optional)</Text>
              <TextInput style={[styles.reasonInput, { color: colors.text, borderColor: colors.border, minHeight: 60 }]} placeholder="Curated description" placeholderTextColor={colors.secondaryText} value={formDisplayDescription} onChangeText={setFormDisplayDescription} multiline />

              <Text style={{ color: colors.secondaryText, marginBottom: 4, fontSize: 13 }}>Banner Image URL (optional)</Text>
              <TextInput style={[styles.reasonInput, { color: colors.text, borderColor: colors.border }]} placeholder="https://..." placeholderTextColor={colors.secondaryText} value={formBannerImage} onChangeText={setFormBannerImage} />

              <Text style={{ color: colors.secondaryText, marginBottom: 4, fontSize: 13 }}>Badge Text (optional, e.g. "2x Coins")</Text>
              <TextInput style={[styles.reasonInput, { color: colors.text, borderColor: colors.border }]} placeholder="2x Coins" placeholderTextColor={colors.secondaryText} value={formBadgeText} onChangeText={setFormBadgeText} />

              <Text style={{ color: colors.secondaryText, marginBottom: 4, fontSize: 13 }}>Coin Reward Rate (%)</Text>
              <TextInput style={[styles.reasonInput, { color: colors.text, borderColor: colors.border }]} placeholder="10" placeholderTextColor={colors.secondaryText} value={formCoinRewardRate} onChangeText={(text) => { setFormCoinRewardRate(text); setFormCoinDisplayText(`Earn ${text}% Prive Coins`); }} keyboardType="numeric" />

              <Text style={{ color: colors.secondaryText, marginBottom: 4, fontSize: 13 }}>Coin Display Text</Text>
              <TextInput style={[styles.reasonInput, { color: colors.text, borderColor: colors.border }]} placeholder="Earn 10% Prive Coins" placeholderTextColor={colors.secondaryText} value={formCoinDisplayText} onChangeText={setFormCoinDisplayText} />

              <Text style={{ color: colors.secondaryText, marginBottom: 4, fontSize: 13 }}>Tier Required</Text>
              <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
                {['none', 'entry', 'signature', 'elite'].map(tier => (
                  <TouchableOpacity key={tier} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, backgroundColor: formTierRequired === tier ? `${colors.gold}30` : colors.background, borderWidth: 1, borderColor: formTierRequired === tier ? colors.gold : colors.border }} onPress={() => setFormTierRequired(tier)}>
                    <Text style={{ color: formTierRequired === tier ? colors.gold : colors.text, fontSize: 12, textTransform: 'capitalize' }}>{tier}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={{ color: colors.secondaryText, marginBottom: 4, fontSize: 13 }}>Section Label (for grouping)</Text>
              <TextInput style={[styles.reasonInput, { color: colors.text, borderColor: colors.border }]} placeholder="e.g. Premium Dining, Fashion Picks" placeholderTextColor={colors.secondaryText} value={formSectionLabel} onChangeText={setFormSectionLabel} />
              {sections.length > 0 && (
                <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
                  {sections.map(s => (
                    <TouchableOpacity key={s} style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, backgroundColor: `${colors.gold}15` }} onPress={() => setFormSectionLabel(s)}>
                      <Text style={{ color: colors.gold, fontSize: 11 }}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.secondaryText, marginBottom: 4, fontSize: 13 }}>Sort Order</Text>
                  <TextInput style={[styles.reasonInput, { color: colors.text, borderColor: colors.border, marginBottom: 0 }]} placeholder="0" placeholderTextColor={colors.secondaryText} value={formSortOrder} onChangeText={setFormSortOrder} keyboardType="numeric" />
                </View>
                <View style={{ flex: 1, justifyContent: 'flex-end' }}>
                  <TouchableOpacity style={{ paddingVertical: 12, borderRadius: 10, alignItems: 'center', backgroundColor: formIsFeatured ? `${colors.gold}30` : colors.background, borderWidth: 1, borderColor: formIsFeatured ? colors.gold : colors.border }} onPress={() => setFormIsFeatured(!formIsFeatured)}>
                    <Text style={{ color: formIsFeatured ? colors.gold : colors.text, fontSize: 14, fontWeight: '500' }}>{formIsFeatured ? 'Featured' : 'Not Featured'}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
                <TouchableOpacity style={{ flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center', backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border }} onPress={() => { setShowCreateModal(false); resetForm(); }}>
                  <Text style={{ color: colors.text, fontSize: 15 }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.submitBtn, { flex: 1, marginBottom: 0, opacity: isSubmitting ? 0.5 : 1 }]} onPress={handleCreate} disabled={isSubmitting}>
                  <Text style={styles.submitBtnText}>{isSubmitting ? 'Creating...' : 'Create Item'}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <View style={{ height: 40 }} />
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
  cardStats: { flexDirection: 'row', gap: 16, marginTop: 12 },
  stat: { fontSize: 12 },
  cardActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  actionBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  emptyText: { textAlign: 'center', marginTop: 40, fontSize: 14 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginTop: 8, marginBottom: 12 },
  reasonInput: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 12, fontSize: 14 },
  submitBtn: { backgroundColor: Colors.light.gold, borderRadius: 10, padding: 14, alignItems: 'center', marginBottom: 24 },
  submitBtnText: { color: Colors.light.text, fontSize: 15, fontWeight: '600' },
});
