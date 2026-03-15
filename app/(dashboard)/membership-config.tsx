'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity,
  useColorScheme, ActivityIndicator, Modal, TextInput, ScrollView,
  Switch, SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  membershipAdminService,
  SubscriptionTierConfig,
  SubscriptionTierBenefits,
  SubscriberInfo,
  SubscribersResponse,
} from '../../services/api/membership';
import { Colors } from '../../constants/Colors';
import { showAlert, showConfirm } from '../../utils/alert';

type ActiveTab = 'plans' | 'subscribers';
type ActiveFilter = 'all' | 'active' | 'inactive';

// Benefit toggle definitions
const BENEFIT_TOGGLES: Array<{ key: keyof SubscriptionTierBenefits; label: string; isNumeric?: boolean }> = [
  { key: 'cashbackMultiplier', label: 'Cashback Multiplier', isNumeric: true },
  { key: 'freeDeliveries', label: 'Free Deliveries/mo', isNumeric: true },
  { key: 'maxWishlists', label: 'Max Wishlists', isNumeric: true },
  { key: 'prioritySupport', label: 'Priority Support' },
  { key: 'exclusiveDeals', label: 'Exclusive Deals' },
  { key: 'earlyAccess', label: 'Early Access' },
  { key: 'freeDelivery', label: 'Free Delivery' },
  { key: 'unlimitedWishlists', label: 'Unlimited Wishlists' },
  { key: 'earlyFlashSaleAccess', label: 'Early Flash Sale Access' },
  { key: 'personalShopper', label: 'Personal Shopper' },
  { key: 'premiumEvents', label: 'Premium Events' },
  { key: 'conciergeService', label: 'Concierge Service' },
  { key: 'birthdayOffer', label: 'Birthday Offer' },
  { key: 'anniversaryOffer', label: 'Anniversary Offer' },
];

const DEFAULT_BENEFITS: SubscriptionTierBenefits = {
  cashbackMultiplier: 1,
  freeDeliveries: 0,
  maxWishlists: 5,
  prioritySupport: false,
  exclusiveDeals: false,
  earlyAccess: false,
  freeDelivery: false,
  unlimitedWishlists: false,
  earlyFlashSaleAccess: false,
  personalShopper: false,
  premiumEvents: false,
  conciergeService: false,
  birthdayOffer: false,
  anniversaryOffer: false,
};

interface TierFormData {
  tier: string;
  name: string;
  description: string;
  pricingMonthly: string;
  pricingYearly: string;
  pricingYearlyDiscount: string;
  benefits: SubscriptionTierBenefits;
  features: string[];
  isActive: boolean;
  sortOrder: string;
  trialDays: string;
}

const DEFAULT_FORM: TierFormData = {
  tier: '',
  name: '',
  description: '',
  pricingMonthly: '0',
  pricingYearly: '0',
  pricingYearlyDiscount: '0',
  benefits: { ...DEFAULT_BENEFITS },
  features: [],
  isActive: true,
  sortOrder: '0',
  trialDays: '0',
};

export default function MembershipConfigScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  // Tab state
  const [activeTab, setActiveTab] = useState<ActiveTab>('plans');

  // Plans state
  const [plans, setPlans] = useState<SubscriptionTierConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('all');
  const [showFormModal, setShowFormModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionTierConfig | null>(null);
  const [formData, setFormData] = useState<TierFormData>(DEFAULT_FORM);
  const [newFeature, setNewFeature] = useState('');

  // Subscribers state
  const [subscribers, setSubscribers] = useState<SubscriberInfo[]>([]);
  const [subscribersData, setSubscribersData] = useState<SubscribersResponse | null>(null);
  const [subscribersLoading, setSubscribersLoading] = useState(false);
  const [subscribersPage, setSubscribersPage] = useState(1);
  const [tierFilter, setTierFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // ====== PLANS ======

  const loadPlans = useCallback(async () => {
    try {
      setLoading(true);
      const isActiveParam = activeFilter === 'all' ? undefined : activeFilter === 'active';
      const data = await membershipAdminService.listPlans(isActiveParam);
      setPlans([...data].sort((a, b) => a.sortOrder - b.sortOrder));
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to load plans');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeFilter]);

  useEffect(() => { loadPlans(); }, [loadPlans]);
  const onRefresh = useCallback(() => { setRefreshing(true); loadPlans(); }, [loadPlans]);

  const handleCreate = () => {
    setEditingPlan(null);
    setFormData({ ...DEFAULT_FORM, benefits: { ...DEFAULT_BENEFITS } });
    setNewFeature('');
    setShowFormModal(true);
  };

  const handleEdit = (plan: SubscriptionTierConfig) => {
    setEditingPlan(plan);
    setFormData({
      tier: plan.tier,
      name: plan.name,
      description: plan.description || '',
      pricingMonthly: String(plan.pricing?.monthly || 0),
      pricingYearly: String(plan.pricing?.yearly || 0),
      pricingYearlyDiscount: String(plan.pricing?.yearlyDiscount || 0),
      benefits: { ...DEFAULT_BENEFITS, ...plan.benefits },
      features: plan.features ? [...plan.features] : [],
      isActive: plan.isActive,
      sortOrder: String(plan.sortOrder || 0),
      trialDays: String(plan.trialDays || 0),
    });
    setNewFeature('');
    setShowFormModal(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) { showAlert('Error', 'Plan name is required'); return; }
    if (!formData.tier.trim()) { showAlert('Error', 'Tier identifier is required'); return; }
    try {
      setIsSaving(true);
      const payload = {
        tier: formData.tier.trim().toLowerCase(),
        name: formData.name.trim(),
        description: formData.description.trim(),
        pricing: {
          monthly: Number(formData.pricingMonthly) || 0,
          yearly: Number(formData.pricingYearly) || 0,
          yearlyDiscount: Number(formData.pricingYearlyDiscount) || 0,
        },
        benefits: formData.benefits,
        features: formData.features,
        isActive: formData.isActive,
        sortOrder: Number(formData.sortOrder) || 0,
        trialDays: Number(formData.trialDays) || 0,
      };
      if (editingPlan) {
        await membershipAdminService.updatePlan(editingPlan._id, payload);
        showAlert('Success', 'Tier updated');
      } else {
        await membershipAdminService.createPlan(payload);
        showAlert('Success', 'Tier created');
      }
      setShowFormModal(false);
      loadPlans();
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to save tier');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (plan: SubscriptionTierConfig) => {
    try {
      await membershipAdminService.updatePlan(plan._id, { isActive: !plan.isActive });
      loadPlans();
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to toggle status');
    }
  };

  const handleDelete = (plan: SubscriptionTierConfig) => {
    showConfirm('Deactivate Tier', `Deactivate "${plan.name}"? Active subscribers will prevent deactivation.`, async () => {
      try {
        await membershipAdminService.deletePlan(plan._id);
        showAlert('Success', 'Tier deactivated');
        loadPlans();
      } catch (error: any) {
        showAlert('Error', error.message || 'Failed to deactivate');
      }
    });
  };

  const addFeature = () => {
    if (!newFeature.trim()) return;
    setFormData(p => ({ ...p, features: [...p.features, newFeature.trim()] }));
    setNewFeature('');
  };

  const removeFeature = (i: number) => {
    setFormData(p => ({ ...p, features: p.features.filter((_, idx) => idx !== i) }));
  };

  const updateBenefit = (key: keyof SubscriptionTierBenefits, value: boolean | number) => {
    setFormData(p => ({ ...p, benefits: { ...p.benefits, [key]: value } }));
  };

  // ====== SUBSCRIBERS ======

  const loadSubscribers = useCallback(async () => {
    try {
      setSubscribersLoading(true);
      const data = await membershipAdminService.getSubscribers({
        tier: tierFilter || undefined,
        status: statusFilter || undefined,
        page: subscribersPage,
        limit: 20,
      });
      setSubscribersData(data);
      setSubscribers(data.subscribers);
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to load subscribers');
    } finally {
      setSubscribersLoading(false);
    }
  }, [tierFilter, statusFilter, subscribersPage]);

  useEffect(() => {
    if (activeTab === 'subscribers') loadSubscribers();
  }, [activeTab, loadSubscribers]);

  const handleOverride = (subscriber: SubscriberInfo) => {
    const userId = subscriber.user?._id;
    if (!userId) return;
    showConfirm(
      'Override Tier',
      `Change ${subscriber.user?.fullName || 'User'}'s tier? This action will be audited.`,
      async () => {
        try {
          // Simple override to next tier
          const nextTier = subscriber.tier === 'free' ? 'premium' : subscriber.tier === 'premium' ? 'vip' : 'free';
          await membershipAdminService.overrideSubscriberTier(userId, nextTier, 'Admin override from dashboard');
          showAlert('Success', `Tier changed to ${nextTier}`);
          loadSubscribers();
        } catch (error: any) {
          showAlert('Error', error.message || 'Failed to override tier');
        }
      }
    );
  };

  // ====== RENDER PLAN CARD ======

  const renderPlanCard = ({ item }: { item: SubscriptionTierConfig }) => (
    <View style={[S.card, { backgroundColor: colors.card }]}>
      <View style={S.cardHeader}>
        <View style={{ flex: 1 }}>
          <View style={S.nameRow}>
            <Text style={[S.cardTitle, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
            <View style={[S.tierBadge, { backgroundColor: tierBadgeColor(item.tier) }]}>
              <Text style={S.tierBadgeText}>{item.tier.toUpperCase()}</Text>
            </View>
          </View>
          {item.description ? <Text style={S.descText} numberOfLines={2}>{item.description}</Text> : null}
        </View>
        <Switch
          value={item.isActive}
          onValueChange={() => handleToggleActive(item)}
          trackColor={{ false: colors.border, true: colors.success }}
          thumbColor={colors.card}
        />
      </View>

      {/* Pricing */}
      <View style={S.pricingRow}>
        <View style={S.priceBox}>
          <Text style={S.priceLabel}>Monthly</Text>
          <Text style={S.priceValue}>{item.pricing?.monthly || 0}</Text>
        </View>
        <View style={S.priceBox}>
          <Text style={S.priceLabel}>Yearly</Text>
          <Text style={S.priceValue}>{item.pricing?.yearly || 0}</Text>
        </View>
        <View style={S.priceBox}>
          <Text style={S.priceLabel}>Discount</Text>
          <Text style={S.priceValue}>{item.pricing?.yearlyDiscount || 0}%</Text>
        </View>
      </View>

      {/* Benefits summary */}
      <View style={S.benefitsSummary}>
        <Text style={S.benefitsSummaryTitle}>
          Benefits: {item.benefits?.cashbackMultiplier || 1}x cashback
        </Text>
        <View style={S.benefitChips}>
          {item.benefits?.freeDelivery && <View style={S.benefitChip}><Text style={S.benefitChipText}>Free Delivery</Text></View>}
          {item.benefits?.prioritySupport && <View style={S.benefitChip}><Text style={S.benefitChipText}>Priority Support</Text></View>}
          {item.benefits?.exclusiveDeals && <View style={S.benefitChip}><Text style={S.benefitChipText}>Exclusive Deals</Text></View>}
          {item.benefits?.personalShopper && <View style={S.benefitChip}><Text style={S.benefitChipText}>Personal Shopper</Text></View>}
          {item.benefits?.premiumEvents && <View style={S.benefitChip}><Text style={S.benefitChipText}>Premium Events</Text></View>}
          {item.benefits?.conciergeService && <View style={S.benefitChip}><Text style={S.benefitChipText}>Concierge</Text></View>}
        </View>
      </View>

      {/* Meta badges */}
      <View style={S.badgeRow}>
        <View style={[S.badge, { backgroundColor: item.isActive ? colors.successLight : colors.errorLight }]}>
          <Text style={[S.badgeText, { color: item.isActive ? colors.successDeep : colors.errorDeep }]}>
            {item.isActive ? 'Active' : 'Inactive'}
          </Text>
        </View>
        {item.trialDays > 0 && (
          <View style={[S.badge, { backgroundColor: colors.infoLighter }]}>
            <Text style={[S.badgeText, { color: colors.infoDark }]}>{item.trialDays}d trial</Text>
          </View>
        )}
        <View style={[S.badge, { backgroundColor: colors.backgroundSecondary }]}>
          <Text style={[S.badgeText, { color: colors.gray700 }]}>Order: {item.sortOrder}</Text>
        </View>
        {item.features?.length > 0 && (
          <View style={[S.badge, { backgroundColor: '#F3E8FF' }]}>
            <Text style={[S.badgeText, { color: '#6B21A8' }]}>{item.features.length} features</Text>
          </View>
        )}
      </View>

      <View style={S.cardActions}>
        <TouchableOpacity style={S.actionBtn} onPress={() => handleEdit(item)}>
          <Ionicons name="create-outline" size={18} color={colors.info} />
          <Text style={[S.actionText, { color: colors.info }]}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={S.actionBtn} onPress={() => handleDelete(item)}>
          <Ionicons name="trash-outline" size={18} color={colors.error} />
          <Text style={[S.actionText, { color: colors.error }]}>Deactivate</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ====== RENDER SUBSCRIBER CARD ======

  const renderSubscriberCard = ({ item }: { item: SubscriberInfo }) => (
    <View style={[S.card, { backgroundColor: colors.card }]}>
      <View style={S.subscriberHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[S.cardTitle, { color: colors.text }]}>
            {item.user?.fullName || 'Unknown User'}
          </Text>
          <Text style={S.cardSubtitle}>{item.user?.phoneNumber || item.user?.email || 'No contact'}</Text>
        </View>
        <View style={[S.tierBadge, { backgroundColor: tierBadgeColor(item.tier) }]}>
          <Text style={S.tierBadgeText}>{item.tier?.toUpperCase()}</Text>
        </View>
      </View>
      <View style={S.subscriberDetails}>
        <View style={S.detailItem}>
          <Text style={S.detailLabel}>Status</Text>
          <Text style={[S.detailValue, { color: item.status === 'active' ? colors.success : colors.warning }]}>
            {item.status}
          </Text>
        </View>
        <View style={S.detailItem}>
          <Text style={S.detailLabel}>Cycle</Text>
          <Text style={S.detailValue}>{item.billingCycle || '-'}</Text>
        </View>
        <View style={S.detailItem}>
          <Text style={S.detailLabel}>Price</Text>
          <Text style={S.detailValue}>{item.price || 0}</Text>
        </View>
        <View style={S.detailItem}>
          <Text style={S.detailLabel}>Auto-Renew</Text>
          <Text style={S.detailValue}>{item.autoRenew ? 'Yes' : 'No'}</Text>
        </View>
      </View>
      <View style={S.cardActions}>
        <TouchableOpacity style={S.actionBtn} onPress={() => handleOverride(item)}>
          <Ionicons name="swap-horizontal-outline" size={18} color={colors.purple} />
          <Text style={[S.actionText, { color: colors.purple }]}>Override Tier</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ====== FORM MODAL ======

  const renderFormModal = () => (
    <Modal visible={showFormModal} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={[S.modalContainer, { backgroundColor: colors.background }]}>
        <View style={S.modalHeader}>
          <TouchableOpacity onPress={() => setShowFormModal(false)}>
            <Ionicons name="close" size={28} color={colors.text} />
          </TouchableOpacity>
          <Text style={[S.modalTitle, { color: colors.text }]}>
            {editingPlan ? 'Edit Tier' : 'Create Tier'}
          </Text>
          <TouchableOpacity onPress={handleSave} disabled={isSaving}>
            {isSaving ? <ActivityIndicator size="small" color={colors.info} /> : <Text style={S.saveBtn}>Save</Text>}
          </TouchableOpacity>
        </View>

        <ScrollView style={S.formScroll} contentContainerStyle={{ paddingBottom: 40 }}>
          {/* Basic Info */}
          <Text style={S.formSection}>Basic Info</Text>
          <Text style={S.formLabel}>Tier Identifier</Text>
          <TextInput
            style={[S.formInput, { color: colors.text, borderColor: colors.border, backgroundColor: editingPlan ? colors.backgroundSecondary : undefined }]}
            value={formData.tier}
            onChangeText={v => setFormData(p => ({ ...p, tier: v.toLowerCase().replace(/[^a-z0-9_]/g, '') }))}
            placeholder="e.g. premium, vip"
            placeholderTextColor={colors.muted}
            editable={!editingPlan}
          />
          <Text style={S.formLabel}>Display Name</Text>
          <TextInput
            style={[S.formInput, { color: colors.text, borderColor: colors.border }]}
            value={formData.name}
            onChangeText={v => setFormData(p => ({ ...p, name: v }))}
            placeholder="Premium Plan"
            placeholderTextColor={colors.muted}
          />
          <Text style={S.formLabel}>Description</Text>
          <TextInput
            style={[S.formInput, S.formTextArea, { color: colors.text, borderColor: colors.border }]}
            value={formData.description}
            onChangeText={v => setFormData(p => ({ ...p, description: v }))}
            placeholder="Plan description..."
            placeholderTextColor={colors.muted}
            multiline
            numberOfLines={3}
          />

          {/* Pricing */}
          <Text style={S.formSection}>Pricing</Text>
          <View style={S.rowFields}>
            <View style={{ flex: 1 }}>
              <Text style={S.formLabel}>Monthly</Text>
              <TextInput
                style={[S.formInput, { color: colors.text, borderColor: colors.border }]}
                value={formData.pricingMonthly}
                onChangeText={v => setFormData(p => ({ ...p, pricingMonthly: v.replace(/[^0-9.]/g, '') }))}
                placeholder="99"
                placeholderTextColor={colors.muted}
                keyboardType="numeric"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={S.formLabel}>Yearly</Text>
              <TextInput
                style={[S.formInput, { color: colors.text, borderColor: colors.border }]}
                value={formData.pricingYearly}
                onChangeText={v => setFormData(p => ({ ...p, pricingYearly: v.replace(/[^0-9.]/g, '') }))}
                placeholder="999"
                placeholderTextColor={colors.muted}
                keyboardType="numeric"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={S.formLabel}>Discount %</Text>
              <TextInput
                style={[S.formInput, { color: colors.text, borderColor: colors.border }]}
                value={formData.pricingYearlyDiscount}
                onChangeText={v => setFormData(p => ({ ...p, pricingYearlyDiscount: v.replace(/[^0-9]/g, '') }))}
                placeholder="17"
                placeholderTextColor={colors.muted}
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* Benefits */}
          <Text style={S.formSection}>Benefits</Text>
          {BENEFIT_TOGGLES.map(({ key, label, isNumeric }) => (
            <View key={key} style={S.benefitFormRow}>
              <Text style={S.formLabel}>{label}</Text>
              {isNumeric ? (
                <TextInput
                  style={[S.numericInput, { color: colors.text, borderColor: colors.border }]}
                  value={String(formData.benefits[key] || 0)}
                  onChangeText={v => updateBenefit(key, Number(v.replace(/[^0-9.]/g, '')) || 0)}
                  keyboardType="numeric"
                  placeholderTextColor={colors.muted}
                />
              ) : (
                <Switch
                  value={!!formData.benefits[key]}
                  onValueChange={v => updateBenefit(key, v)}
                  trackColor={{ false: colors.border, true: colors.success }}
                  thumbColor={colors.card}
                />
              )}
            </View>
          ))}

          {/* Features */}
          <Text style={S.formSection}>Features ({formData.features.length})</Text>
          {formData.features.map((f, i) => (
            <View key={i} style={S.featEditRow}>
              <Ionicons name="checkmark-circle" size={18} color={colors.success} />
              <Text style={[S.featEditTitle, { color: colors.text, flex: 1 }]}>{f}</Text>
              <TouchableOpacity onPress={() => removeFeature(i)}>
                <Ionicons name="trash-outline" size={18} color={colors.error} />
              </TouchableOpacity>
            </View>
          ))}
          <View style={S.addFeatBox}>
            <TextInput
              style={[S.formInput, { color: colors.text, borderColor: colors.border }]}
              value={newFeature}
              onChangeText={setNewFeature}
              placeholder="Type a feature and press Add"
              placeholderTextColor={colors.muted}
              onSubmitEditing={addFeature}
            />
            <TouchableOpacity style={S.addFeatBtn} onPress={addFeature}>
              <Ionicons name="add" size={16} color={colors.card} />
              <Text style={S.addFeatBtnText}>Add</Text>
            </TouchableOpacity>
          </View>

          {/* Settings */}
          <Text style={S.formSection}>Settings</Text>
          <View style={S.rowFields}>
            <View style={{ flex: 1 }}>
              <Text style={S.formLabel}>Trial Days</Text>
              <TextInput
                style={[S.formInput, { color: colors.text, borderColor: colors.border }]}
                value={formData.trialDays}
                onChangeText={v => setFormData(p => ({ ...p, trialDays: v.replace(/[^0-9]/g, '') }))}
                placeholder="0"
                placeholderTextColor={colors.muted}
                keyboardType="numeric"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={S.formLabel}>Sort Order</Text>
              <TextInput
                style={[S.formInput, { color: colors.text, borderColor: colors.border }]}
                value={formData.sortOrder}
                onChangeText={v => setFormData(p => ({ ...p, sortOrder: v.replace(/[^0-9]/g, '') }))}
                placeholder="0"
                placeholderTextColor={colors.muted}
                keyboardType="numeric"
              />
            </View>
          </View>
          <View style={[S.switchRow, { marginTop: 14 }]}>
            <Text style={S.formLabel}>Active</Text>
            <Switch
              value={formData.isActive}
              onValueChange={v => setFormData(p => ({ ...p, isActive: v }))}
              trackColor={{ false: colors.border, true: colors.success }}
              thumbColor={colors.card}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  // ====== MAIN RENDER ======

  return (
    <View style={[S.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[S.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[S.headerTitle, { color: colors.text }]}>Subscription Management</Text>
        {activeTab === 'plans' && (
          <TouchableOpacity style={S.createBtn} onPress={handleCreate}>
            <Ionicons name="add" size={20} color={colors.card} />
            <Text style={S.createBtnText}>Create</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Tab Bar */}
      <View style={[S.tabBar, { backgroundColor: colors.card }]}>
        <TouchableOpacity
          style={[S.tab, activeTab === 'plans' && S.tabActive]}
          onPress={() => setActiveTab('plans')}
        >
          <Ionicons name="pricetag-outline" size={18} color={activeTab === 'plans' ? colors.info : colors.muted} />
          <Text style={[S.tabText, activeTab === 'plans' && S.tabTextActive]}>Plans</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[S.tab, activeTab === 'subscribers' && S.tabActive]}
          onPress={() => setActiveTab('subscribers')}
        >
          <Ionicons name="people-outline" size={18} color={activeTab === 'subscribers' ? colors.info : colors.muted} />
          <Text style={[S.tabText, activeTab === 'subscribers' && S.tabTextActive]}>Subscribers</Text>
          {subscribersData?.total ? (
            <View style={S.countBadge}>
              <Text style={S.countBadgeText}>{subscribersData.total}</Text>
            </View>
          ) : null}
        </TouchableOpacity>
      </View>

      {/* Plans Tab */}
      {activeTab === 'plans' && (
        <>
          <View style={[S.filtersBar, { backgroundColor: colors.card }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={S.filterChips}>
              {(['all', 'active', 'inactive'] as ActiveFilter[]).map(f => (
                <TouchableOpacity
                  key={f}
                  style={[S.filterChip, activeFilter === f && S.filterChipActive]}
                  onPress={() => setActiveFilter(f)}
                >
                  <Text style={[S.filterChipText, activeFilter === f && S.filterChipTextActive]}>
                    {f === 'all' ? 'All Tiers' : f.charAt(0).toUpperCase() + f.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          <FlatList
            data={plans}
            renderItem={renderPlanCard}
            keyExtractor={item => item._id}
            contentContainerStyle={{ padding: 16 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            ListEmptyComponent={
              loading ? (
                <ActivityIndicator size="large" color={colors.info} style={{ paddingVertical: 40 }} />
              ) : (
                <View style={S.emptyContainer}>
                  <Ionicons name="card-outline" size={48} color={colors.gray300} />
                  <Text style={S.emptyText}>No subscription tiers found</Text>
                  <Text style={S.emptySubText}>Create your first tier to get started</Text>
                </View>
              )
            }
          />
        </>
      )}

      {/* Subscribers Tab */}
      {activeTab === 'subscribers' && (
        <>
          <View style={[S.filtersBar, { backgroundColor: colors.card }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={S.filterChips}>
              {['', 'free', 'premium', 'vip'].map(t => (
                <TouchableOpacity
                  key={t}
                  style={[S.filterChip, tierFilter === t && S.filterChipActive]}
                  onPress={() => { setTierFilter(t); setSubscribersPage(1); }}
                >
                  <Text style={[S.filterChipText, tierFilter === t && S.filterChipTextActive]}>
                    {t === '' ? 'All Tiers' : t.charAt(0).toUpperCase() + t.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
              <View style={{ width: 8 }} />
              {['', 'active', 'cancelled', 'expired'].map(s => (
                <TouchableOpacity
                  key={s}
                  style={[S.filterChip, statusFilter === s && S.filterChipActive]}
                  onPress={() => { setStatusFilter(s); setSubscribersPage(1); }}
                >
                  <Text style={[S.filterChipText, statusFilter === s && S.filterChipTextActive]}>
                    {s === '' ? 'All Status' : s.charAt(0).toUpperCase() + s.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Tier Distribution */}
          {subscribersData?.tierDistribution && subscribersData.tierDistribution.length > 0 && (
            <View style={S.distributionBar}>
              {subscribersData.tierDistribution.map(d => (
                <View key={d._id} style={S.distributionItem}>
                  <View style={[S.distributionDot, { backgroundColor: tierBadgeColor(d._id) }]} />
                  <Text style={S.distributionText}>{d._id}: {d.count}</Text>
                </View>
              ))}
            </View>
          )}

          <FlatList
            data={subscribers}
            renderItem={renderSubscriberCard}
            keyExtractor={item => item._id}
            contentContainerStyle={{ padding: 16 }}
            refreshControl={
              <RefreshControl refreshing={subscribersLoading} onRefresh={loadSubscribers} />
            }
            ListEmptyComponent={
              subscribersLoading ? (
                <ActivityIndicator size="large" color={colors.info} style={{ paddingVertical: 40 }} />
              ) : (
                <View style={S.emptyContainer}>
                  <Ionicons name="people-outline" size={48} color={colors.gray300} />
                  <Text style={S.emptyText}>No subscribers found</Text>
                </View>
              )
            }
            ListFooterComponent={
              subscribersData && subscribersData.totalPages > 1 ? (
                <View style={S.pagination}>
                  <TouchableOpacity
                    style={[S.pageBtn, subscribersPage <= 1 && S.pageBtnDisabled]}
                    disabled={subscribersPage <= 1}
                    onPress={() => setSubscribersPage(p => p - 1)}
                  >
                    <Text style={S.pageBtnText}>Previous</Text>
                  </TouchableOpacity>
                  <Text style={S.pageInfo}>
                    Page {subscribersPage} of {subscribersData.totalPages}
                  </Text>
                  <TouchableOpacity
                    style={[S.pageBtn, subscribersPage >= subscribersData.totalPages && S.pageBtnDisabled]}
                    disabled={subscribersPage >= subscribersData.totalPages}
                    onPress={() => setSubscribersPage(p => p + 1)}
                  >
                    <Text style={S.pageBtnText}>Next</Text>
                  </TouchableOpacity>
                </View>
              ) : null
            }
          />
        </>
      )}

      {renderFormModal()}
    </View>
  );
}

// Helper
function tierBadgeColor(tier: string): string {
  switch (tier) {
    case 'vip': return Colors.light.warning;
    case 'premium': return Colors.light.purple;
    case 'free': return Colors.light.mutedDark;
    default: return Colors.light.info;
  }
}

const S = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  headerTitle: { fontSize: 22, fontWeight: '700' },
  createBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.light.info, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, gap: 4 },
  createBtnText: { color: Colors.light.card, fontWeight: '600', fontSize: 14 },

  // Tab bar
  tabBar: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: Colors.light.gray200 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: Colors.light.info },
  tabText: { fontSize: 14, color: Colors.light.muted, fontWeight: '500' },
  tabTextActive: { color: Colors.light.info, fontWeight: '600' },
  countBadge: { backgroundColor: Colors.light.info, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 10, minWidth: 20, alignItems: 'center' },
  countBadgeText: { color: Colors.light.card, fontSize: 10, fontWeight: '700' },

  // Filters
  filtersBar: { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.light.gray200 },
  filterChips: { flexDirection: 'row' },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, backgroundColor: Colors.light.backgroundSecondary, marginRight: 8 },
  filterChipActive: { backgroundColor: Colors.light.info },
  filterChipText: { fontSize: 12, color: Colors.light.mutedDark, fontWeight: '500' },
  filterChipTextActive: { color: Colors.light.card, fontWeight: '600' },

  // Card
  card: { borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: Colors.light.gray200 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { fontSize: 16, fontWeight: '600' },
  cardSubtitle: { fontSize: 12, color: Colors.light.muted, marginTop: 2 },
  descText: { fontSize: 12, color: Colors.light.mutedDark, marginTop: 4, lineHeight: 18 },

  // Tier badge
  tierBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  tierBadgeText: { color: Colors.light.card, fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },

  // Pricing row
  pricingRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  priceBox: { flex: 1, backgroundColor: Colors.light.backgroundTertiary, borderRadius: 8, padding: 8, alignItems: 'center' },
  priceLabel: { fontSize: 10, color: Colors.light.muted, fontWeight: '500' },
  priceValue: { fontSize: 16, fontWeight: '700', color: Colors.light.gray900, marginTop: 2 },

  // Benefits
  benefitsSummary: { marginBottom: 10 },
  benefitsSummaryTitle: { fontSize: 12, fontWeight: '600', color: Colors.light.mutedDark, marginBottom: 6 },
  benefitChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  benefitChip: { backgroundColor: '#EDE9FE', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  benefitChipText: { fontSize: 10, color: '#6B21A8', fontWeight: '500' },

  // Badges
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 11, fontWeight: '500' },

  // Actions
  cardActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, borderTopWidth: 1, borderTopColor: Colors.light.backgroundSecondary, paddingTop: 10 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 6 },
  actionText: { fontSize: 12, fontWeight: '500' },

  // Subscribers
  subscriberHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  subscriberDetails: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 10 },
  detailItem: { minWidth: '40%' },
  detailLabel: { fontSize: 11, color: Colors.light.muted },
  detailValue: { fontSize: 13, fontWeight: '600', color: Colors.light.gray700 },

  // Distribution
  distributionBar: { flexDirection: 'row', justifyContent: 'center', gap: 16, paddingVertical: 10, backgroundColor: Colors.light.backgroundTertiary },
  distributionItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  distributionDot: { width: 8, height: 8, borderRadius: 4 },
  distributionText: { fontSize: 12, color: Colors.light.mutedDark, fontWeight: '500' },

  // Pagination
  pagination: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 16, paddingVertical: 16 },
  pageBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: Colors.light.info },
  pageBtnDisabled: { backgroundColor: Colors.light.gray300 },
  pageBtnText: { color: Colors.light.card, fontSize: 13, fontWeight: '600' },
  pageInfo: { fontSize: 13, color: Colors.light.mutedDark },

  // Modal / Form
  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.light.gray200 },
  modalTitle: { fontSize: 17, fontWeight: '600' },
  saveBtn: { fontSize: 16, fontWeight: '600', color: Colors.light.info },
  formScroll: { paddingHorizontal: 20 },
  formSection: { fontSize: 15, fontWeight: '700', color: Colors.light.navy, marginTop: 20, marginBottom: 10, borderBottomWidth: 1, borderBottomColor: Colors.light.backgroundSecondary, paddingBottom: 6 },
  formLabel: { fontSize: 13, fontWeight: '500', color: Colors.light.mutedDark, marginTop: 10, marginBottom: 4 },
  formInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  formTextArea: { minHeight: 70, textAlignVertical: 'top' },
  rowFields: { flexDirection: 'row', gap: 12 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  numericInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, width: 80, textAlign: 'center' },
  benefitFormRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  featEditRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.light.backgroundSecondary },
  featEditTitle: { fontSize: 13, fontWeight: '500' },
  addFeatBox: { marginTop: 10, flexDirection: 'row', gap: 8, alignItems: 'center' },
  addFeatBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.light.success, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, gap: 4 },
  addFeatBtnText: { color: Colors.light.card, fontWeight: '600', fontSize: 13 },

  // Empty
  emptyContainer: { paddingVertical: 60, alignItems: 'center' },
  emptyText: { fontSize: 16, color: Colors.light.muted, marginTop: 12, fontWeight: '500' },
  emptySubText: { fontSize: 13, color: Colors.light.gray300, marginTop: 4 },
});
