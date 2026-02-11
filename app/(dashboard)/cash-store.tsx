/**
 * Cash Store Admin Management
 *
 * 5-tab admin page for managing Cash Store features:
 * 1. Voucher Brands - CRUD for gift card brands
 * 2. Coupons - CRUD for coupon codes
 * 3. Double Cashback - Campaign management
 * 4. Coin Drops - Boosted cashback events
 * 5. Affiliate - Click/conversion analytics
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  useColorScheme,
  ActivityIndicator,
  TextInput,
  Modal,
  ScrollView,
  Image,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { showAlert, showConfirm } from '../../utils/alert';
import { cashStoreAdminService } from '../../services/api/cashStore';
import type {
  VoucherBrand,
  AdminCoupon,
  DoubleCashbackCampaign,
  CoinDrop,
} from '../../services/api/cashStore';

type TabType = 'vouchers' | 'coupons' | 'campaigns' | 'coindrops' | 'affiliate';
type FilterType = 'all' | 'active' | 'inactive' | 'featured';

export default function CashStoreScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [activeTab, setActiveTab] = useState<TabType>('vouchers');

  // ─── Voucher Brands State ──────────────────────────────────
  const [vouchers, setVouchers] = useState<VoucherBrand[]>([]);
  const [vouchersLoading, setVouchersLoading] = useState(false);
  const [vouchersRefreshing, setVouchersRefreshing] = useState(false);
  const [voucherFilter, setVoucherFilter] = useState<FilterType>('all');
  const [voucherSearch, setVoucherSearch] = useState('');
  const [processingVoucher, setProcessingVoucher] = useState<string | null>(null);
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState<VoucherBrand | null>(null);
  const [voucherForm, setVoucherForm] = useState({
    name: '', slug: '', logo: '', description: '', category: '',
    cashbackRate: '0', denominations: '', termsAndConditions: '',
    isActive: true, isFeatured: false,
  });

  // ─── Coupons State ─────────────────────────────────────────
  const [coupons, setCoupons] = useState<AdminCoupon[]>([]);
  const [couponsLoading, setCouponsLoading] = useState(false);
  const [couponsRefreshing, setCouponsRefreshing] = useState(false);
  const [couponFilter, setCouponFilter] = useState<FilterType>('all');
  const [couponSearch, setCouponSearch] = useState('');
  const [processingCoupon, setProcessingCoupon] = useState<string | null>(null);
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<AdminCoupon | null>(null);
  const [couponForm, setCouponForm] = useState({
    title: '', couponCode: '', description: '', discountType: 'PERCENTAGE' as string,
    discountValue: '0', minOrderValue: '0', maxDiscountCap: '0',
    validFrom: '', validTo: '', usageLimit: '100', tags: '', category: '',
    imageUrl: '', isActive: true, isAutoApply: false,
  });

  // ─── Double Cashback State ─────────────────────────────────
  const [campaigns, setCampaigns] = useState<DoubleCashbackCampaign[]>([]);
  const [campaignsLoading, setCampaignsLoading] = useState(false);
  const [processingCampaign, setProcessingCampaign] = useState<string | null>(null);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<DoubleCashbackCampaign | null>(null);
  const [campaignForm, setCampaignForm] = useState({
    title: '', subtitle: '', description: '', multiplier: '2',
    startTime: '', endTime: '', terms: '', minOrderValue: '0',
    maxCashback: '0', backgroundColor: '#10B981', isActive: true,
  });

  // ─── Coin Drops State ──────────────────────────────────────
  const [coinDrops, setCoinDrops] = useState<CoinDrop[]>([]);
  const [coinDropsLoading, setCoinDropsLoading] = useState(false);
  const [processingCoinDrop, setProcessingCoinDrop] = useState<string | null>(null);
  const [showCoinDropModal, setShowCoinDropModal] = useState(false);
  const [editingCoinDrop, setEditingCoinDrop] = useState<CoinDrop | null>(null);
  const [coinDropForm, setCoinDropForm] = useState({
    storeId: '', multiplier: '2', normalCashback: '0', category: '',
    startTime: '', endTime: '', minOrderValue: '0', maxCashback: '0',
    isActive: true,
  });

  // ─── Affiliate State ───────────────────────────────────────
  const [affiliateBrandId, setAffiliateBrandId] = useState('');
  const [affiliateData, setAffiliateData] = useState<any>(null);
  const [affiliateLoading, setAffiliateLoading] = useState(false);

  // ─── Tab change loader ─────────────────────────────────────
  useEffect(() => {
    if (activeTab === 'vouchers') loadVouchers();
    else if (activeTab === 'coupons') loadCoupons();
    else if (activeTab === 'campaigns') loadCampaigns();
    else if (activeTab === 'coindrops') loadCoinDrops();
  }, [activeTab]);

  // ═══════════════════════════════════════════════════════════
  //  VOUCHER BRANDS
  // ═══════════════════════════════════════════════════════════

  const loadVouchers = async () => {
    try {
      setVouchersLoading(true);
      const params: any = { limit: 50 };
      if (voucherFilter === 'active') params.status = 'active';
      if (voucherFilter === 'inactive') params.status = 'inactive';
      if (voucherSearch) params.search = voucherSearch;
      const result = await cashStoreAdminService.getVoucherBrands(params);
      let filtered = result.brands;
      if (voucherFilter === 'featured') filtered = filtered.filter(v => v.isFeatured);
      setVouchers(filtered);
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to load voucher brands');
    } finally {
      setVouchersLoading(false);
      setVouchersRefreshing(false);
    }
  };

  const openVoucherForm = (voucher?: VoucherBrand) => {
    if (voucher) {
      setEditingVoucher(voucher);
      setVoucherForm({
        name: voucher.name, slug: voucher.slug || '', logo: voucher.logo || '',
        description: voucher.description || '', category: voucher.category || '',
        cashbackRate: voucher.cashbackRate?.toString() || '0',
        denominations: voucher.denominations?.join(', ') || '',
        termsAndConditions: voucher.termsAndConditions?.join('\n') || '',
        isActive: voucher.isActive, isFeatured: voucher.isFeatured,
      });
    } else {
      setEditingVoucher(null);
      setVoucherForm({
        name: '', slug: '', logo: '', description: '', category: '',
        cashbackRate: '0', denominations: '100, 250, 500, 1000',
        termsAndConditions: '', isActive: true, isFeatured: false,
      });
    }
    setShowVoucherModal(true);
  };

  const saveVoucher = async () => {
    if (!voucherForm.name.trim()) { showAlert('Error', 'Brand name is required'); return; }
    try {
      const data: any = {
        name: voucherForm.name.trim(),
        slug: voucherForm.slug.trim() || voucherForm.name.toLowerCase().replace(/\s+/g, '-'),
        logo: voucherForm.logo.trim(), description: voucherForm.description.trim(),
        category: voucherForm.category.trim(),
        cashbackRate: parseFloat(voucherForm.cashbackRate) || 0,
        denominations: voucherForm.denominations.split(',').map(d => parseFloat(d.trim())).filter(Boolean),
        termsAndConditions: voucherForm.termsAndConditions.split('\n').filter(t => t.trim()),
        isActive: voucherForm.isActive, isFeatured: voucherForm.isFeatured,
      };
      if (editingVoucher) {
        await cashStoreAdminService.updateVoucherBrand(editingVoucher._id, data);
        showAlert('Success', 'Voucher brand updated');
      } else {
        await cashStoreAdminService.createVoucherBrand(data);
        showAlert('Success', 'Voucher brand created');
      }
      setShowVoucherModal(false);
      loadVouchers();
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to save voucher brand');
    }
  };

  const deleteVoucher = (voucher: VoucherBrand) => {
    showConfirm('Delete Voucher Brand', `Delete "${voucher.name}"?`, async () => {
      try {
        setProcessingVoucher(voucher._id);
        await cashStoreAdminService.deleteVoucherBrand(voucher._id);
        showAlert('Success', 'Voucher brand deleted');
        loadVouchers();
      } catch (error: any) { showAlert('Error', error.message); }
      finally { setProcessingVoucher(null); }
    }, 'Delete');
  };

  const toggleVoucherActive = async (voucher: VoucherBrand) => {
    try {
      setProcessingVoucher(voucher._id);
      await cashStoreAdminService.toggleVoucherBrand(voucher._id);
      loadVouchers();
    } catch (error: any) { showAlert('Error', 'Failed to toggle status'); }
    finally { setProcessingVoucher(null); }
  };

  // ═══════════════════════════════════════════════════════════
  //  COUPONS
  // ═══════════════════════════════════════════════════════════

  const loadCoupons = async () => {
    try {
      setCouponsLoading(true);
      const params: any = { limit: 50 };
      if (couponFilter === 'active') params.status = 'active';
      if (couponFilter === 'inactive') params.status = 'inactive';
      if (couponSearch) params.search = couponSearch;
      const result = await cashStoreAdminService.getCoupons(params);
      setCoupons(result.coupons);
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to load coupons');
    } finally {
      setCouponsLoading(false);
      setCouponsRefreshing(false);
    }
  };

  const openCouponForm = (coupon?: AdminCoupon) => {
    if (coupon) {
      setEditingCoupon(coupon);
      setCouponForm({
        title: coupon.title, couponCode: coupon.couponCode, description: coupon.description || '',
        discountType: coupon.discountType, discountValue: coupon.discountValue?.toString() || '0',
        minOrderValue: coupon.minOrderValue?.toString() || '0',
        maxDiscountCap: coupon.maxDiscountCap?.toString() || '0',
        validFrom: coupon.validFrom || '', validTo: coupon.validTo || '',
        usageLimit: coupon.usageLimit?.toString() || '100',
        tags: coupon.tags?.join(', ') || '', category: coupon.category || '',
        imageUrl: coupon.imageUrl || '', isActive: coupon.isActive, isAutoApply: coupon.isAutoApply,
      });
    } else {
      setEditingCoupon(null);
      setCouponForm({
        title: '', couponCode: '', description: '', discountType: 'PERCENTAGE',
        discountValue: '0', minOrderValue: '0', maxDiscountCap: '0',
        validFrom: '', validTo: '', usageLimit: '100', tags: '', category: '',
        imageUrl: '', isActive: true, isAutoApply: false,
      });
    }
    setShowCouponModal(true);
  };

  const saveCoupon = async () => {
    if (!couponForm.title.trim()) { showAlert('Error', 'Coupon title is required'); return; }
    if (!couponForm.couponCode.trim()) { showAlert('Error', 'Coupon code is required'); return; }
    try {
      const data: any = {
        title: couponForm.title.trim(), couponCode: couponForm.couponCode.trim().toUpperCase(),
        description: couponForm.description.trim(), discountType: couponForm.discountType,
        discountValue: parseFloat(couponForm.discountValue) || 0,
        minOrderValue: parseFloat(couponForm.minOrderValue) || 0,
        maxDiscountCap: parseFloat(couponForm.maxDiscountCap) || 0,
        validFrom: couponForm.validFrom || undefined, validTo: couponForm.validTo || undefined,
        usageLimit: parseInt(couponForm.usageLimit) || 100,
        tags: couponForm.tags.split(',').map(t => t.trim()).filter(Boolean),
        category: couponForm.category.trim() || undefined,
        imageUrl: couponForm.imageUrl.trim() || undefined,
        isActive: couponForm.isActive, isAutoApply: couponForm.isAutoApply,
      };
      if (editingCoupon) {
        await cashStoreAdminService.updateCoupon(editingCoupon._id, data);
        showAlert('Success', 'Coupon updated');
      } else {
        await cashStoreAdminService.createCoupon(data);
        showAlert('Success', 'Coupon created');
      }
      setShowCouponModal(false);
      loadCoupons();
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to save coupon');
    }
  };

  const deleteCoupon = (coupon: AdminCoupon) => {
    showConfirm('Delete Coupon', `Delete "${coupon.title}"?`, async () => {
      try {
        setProcessingCoupon(coupon._id);
        await cashStoreAdminService.deleteCoupon(coupon._id);
        showAlert('Success', 'Coupon deleted');
        loadCoupons();
      } catch (error: any) { showAlert('Error', error.message); }
      finally { setProcessingCoupon(null); }
    }, 'Delete');
  };

  const toggleCouponActive = async (coupon: AdminCoupon) => {
    try {
      setProcessingCoupon(coupon._id);
      await cashStoreAdminService.toggleCoupon(coupon._id);
      loadCoupons();
    } catch (error: any) { showAlert('Error', 'Failed to toggle status'); }
    finally { setProcessingCoupon(null); }
  };

  // ═══════════════════════════════════════════════════════════
  //  DOUBLE CASHBACK CAMPAIGNS
  // ═══════════════════════════════════════════════════════════

  const loadCampaigns = async () => {
    try {
      setCampaignsLoading(true);
      const result = await cashStoreAdminService.getDoubleCampaigns({ limit: 50 });
      setCampaigns(result.campaigns);
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to load campaigns');
    } finally { setCampaignsLoading(false); }
  };

  const openCampaignForm = (campaign?: DoubleCashbackCampaign) => {
    if (campaign) {
      setEditingCampaign(campaign);
      setCampaignForm({
        title: campaign.title, subtitle: campaign.subtitle || '',
        description: campaign.description || '', multiplier: campaign.multiplier?.toString() || '2',
        startTime: campaign.startTime || '', endTime: campaign.endTime || '',
        terms: campaign.terms?.join('\n') || '',
        minOrderValue: campaign.minOrderValue?.toString() || '0',
        maxCashback: campaign.maxCashback?.toString() || '0',
        backgroundColor: campaign.backgroundColor || '#10B981', isActive: campaign.isActive,
      });
    } else {
      setEditingCampaign(null);
      setCampaignForm({
        title: '', subtitle: '', description: '', multiplier: '2',
        startTime: '', endTime: '', terms: '', minOrderValue: '0',
        maxCashback: '0', backgroundColor: '#10B981', isActive: true,
      });
    }
    setShowCampaignModal(true);
  };

  const saveCampaign = async () => {
    if (!campaignForm.title.trim()) { showAlert('Error', 'Title is required'); return; }
    try {
      const data: any = {
        title: campaignForm.title.trim(), subtitle: campaignForm.subtitle.trim(),
        description: campaignForm.description.trim(),
        multiplier: parseFloat(campaignForm.multiplier) || 2,
        startTime: campaignForm.startTime || undefined, endTime: campaignForm.endTime || undefined,
        terms: campaignForm.terms.split('\n').filter(t => t.trim()),
        minOrderValue: parseFloat(campaignForm.minOrderValue) || 0,
        maxCashback: parseFloat(campaignForm.maxCashback) || 0,
        backgroundColor: campaignForm.backgroundColor, isActive: campaignForm.isActive,
      };
      if (editingCampaign) {
        await cashStoreAdminService.updateDoubleCampaign(editingCampaign._id, data);
        showAlert('Success', 'Campaign updated');
      } else {
        await cashStoreAdminService.createDoubleCampaign(data);
        showAlert('Success', 'Campaign created');
      }
      setShowCampaignModal(false);
      loadCampaigns();
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to save campaign');
    }
  };

  const deleteCampaign = (campaign: DoubleCashbackCampaign) => {
    showConfirm('Delete Campaign', `Delete "${campaign.title}"?`, async () => {
      try {
        setProcessingCampaign(campaign._id);
        await cashStoreAdminService.deleteDoubleCampaign(campaign._id);
        showAlert('Success', 'Campaign deleted');
        loadCampaigns();
      } catch (error: any) { showAlert('Error', error.message); }
      finally { setProcessingCampaign(null); }
    }, 'Delete');
  };

  const toggleCampaignActive = async (campaign: DoubleCashbackCampaign) => {
    try {
      setProcessingCampaign(campaign._id);
      await cashStoreAdminService.toggleDoubleCampaign(campaign._id);
      loadCampaigns();
    } catch (error: any) { showAlert('Error', 'Failed to toggle'); }
    finally { setProcessingCampaign(null); }
  };

  // ═══════════════════════════════════════════════════════════
  //  COIN DROPS
  // ═══════════════════════════════════════════════════════════

  const loadCoinDrops = async () => {
    try {
      setCoinDropsLoading(true);
      const result = await cashStoreAdminService.getCoinDrops({ limit: 50 });
      setCoinDrops(result.coinDrops);
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to load coin drops');
    } finally { setCoinDropsLoading(false); }
  };

  const openCoinDropForm = (drop?: CoinDrop) => {
    if (drop) {
      setEditingCoinDrop(drop);
      setCoinDropForm({
        storeId: drop.storeId || '', multiplier: drop.multiplier?.toString() || '2',
        normalCashback: drop.normalCashback?.toString() || '0', category: drop.category || '',
        startTime: drop.startTime || '', endTime: drop.endTime || '',
        minOrderValue: drop.minOrderValue?.toString() || '0',
        maxCashback: drop.maxCashback?.toString() || '0', isActive: drop.isActive,
      });
    } else {
      setEditingCoinDrop(null);
      setCoinDropForm({
        storeId: '', multiplier: '2', normalCashback: '0', category: '',
        startTime: '', endTime: '', minOrderValue: '0', maxCashback: '0', isActive: true,
      });
    }
    setShowCoinDropModal(true);
  };

  const saveCoinDrop = async () => {
    if (!coinDropForm.storeId.trim()) { showAlert('Error', 'Store ID is required'); return; }
    try {
      const data: any = {
        storeId: coinDropForm.storeId.trim(),
        multiplier: parseFloat(coinDropForm.multiplier) || 2,
        normalCashback: parseFloat(coinDropForm.normalCashback) || 0,
        category: coinDropForm.category.trim(),
        startTime: coinDropForm.startTime || undefined, endTime: coinDropForm.endTime || undefined,
        minOrderValue: parseFloat(coinDropForm.minOrderValue) || 0,
        maxCashback: parseFloat(coinDropForm.maxCashback) || 0,
        isActive: coinDropForm.isActive,
      };
      if (editingCoinDrop) {
        await cashStoreAdminService.updateCoinDrop(editingCoinDrop._id, data);
        showAlert('Success', 'Coin drop updated');
      } else {
        await cashStoreAdminService.createCoinDrop(data);
        showAlert('Success', 'Coin drop created');
      }
      setShowCoinDropModal(false);
      loadCoinDrops();
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to save coin drop');
    }
  };

  const deleteCoinDrop = (drop: CoinDrop) => {
    showConfirm('Delete Coin Drop', `Delete coin drop for "${drop.storeName}"?`, async () => {
      try {
        setProcessingCoinDrop(drop._id);
        await cashStoreAdminService.deleteCoinDrop(drop._id);
        showAlert('Success', 'Coin drop deleted');
        loadCoinDrops();
      } catch (error: any) { showAlert('Error', error.message); }
      finally { setProcessingCoinDrop(null); }
    }, 'Delete');
  };

  const toggleCoinDropActive = async (drop: CoinDrop) => {
    try {
      setProcessingCoinDrop(drop._id);
      await cashStoreAdminService.toggleCoinDrop(drop._id);
      loadCoinDrops();
    } catch (error: any) { showAlert('Error', 'Failed to toggle'); }
    finally { setProcessingCoinDrop(null); }
  };

  // ═══════════════════════════════════════════════════════════
  //  AFFILIATE ANALYTICS
  // ═══════════════════════════════════════════════════════════

  const loadAffiliateAnalytics = async () => {
    if (!affiliateBrandId.trim()) { showAlert('Info', 'Enter a brand ID to view analytics'); return; }
    try {
      setAffiliateLoading(true);
      const data = await cashStoreAdminService.getAffiliateAnalytics(affiliateBrandId.trim());
      setAffiliateData(data);
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to load analytics');
    } finally { setAffiliateLoading(false); }
  };

  // ═══════════════════════════════════════════════════════════
  //  SHARED HELPERS
  // ═══════════════════════════════════════════════════════════

  const renderFormField = (label: string, value: string, onChange: (v: string) => void, opts?: { multiline?: boolean; placeholder?: string; keyboardType?: string }) => (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.text }]}>{label}</Text>
      <TextInput
        style={[styles.fieldInput, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }, opts?.multiline && { height: 80, textAlignVertical: 'top' }]}
        value={value}
        onChangeText={onChange}
        placeholder={opts?.placeholder}
        placeholderTextColor={colors.icon}
        multiline={opts?.multiline}
      />
    </View>
  );

  const renderSwitchField = (label: string, value: boolean, onChange: (v: boolean) => void) => (
    <View style={styles.switchRow}>
      <Text style={[styles.fieldLabel, { color: colors.text, flex: 1 }]}>{label}</Text>
      <Switch value={value} onValueChange={onChange} trackColor={{ false: '#E2E8F0', true: colors.tint }} thumbColor="#FFF" />
    </View>
  );

  const renderStatusBadge = (isActive: boolean) => (
    <View style={[styles.badge, { backgroundColor: isActive ? '#DCFCE7' : '#FEE2E2' }]}>
      <View style={[styles.badgeDot, { backgroundColor: isActive ? '#10B981' : '#EF4444' }]} />
      <Text style={[styles.badgeText, { color: isActive ? '#059669' : '#DC2626' }]}>
        {isActive ? 'Active' : 'Inactive'}
      </Text>
    </View>
  );

  // ═══════════════════════════════════════════════════════════
  //  RENDER: VOUCHER BRANDS TAB
  // ═══════════════════════════════════════════════════════════

  const renderVoucherItem = ({ item }: { item: VoucherBrand }) => {
    const isProcessing = processingVoucher === item._id;
    return (
      <View style={[styles.listItem, { backgroundColor: colors.card }]}>
        <View style={styles.listItemRow}>
          {item.logo ? (
            <Image source={{ uri: item.logo }} style={styles.itemImage} resizeMode="contain" />
          ) : (
            <View style={[styles.itemImageFallback, { backgroundColor: '#1a3a52' }]}>
              <Text style={styles.itemInitial}>{item.name?.charAt(0)}</Text>
            </View>
          )}
          <View style={styles.itemInfo}>
            <Text style={[styles.itemTitle, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
            <Text style={[styles.itemSubtitle, { color: colors.icon }]}>{item.category} • {item.cashbackRate}% cashback</Text>
            <View style={styles.tagRow}>
              {renderStatusBadge(item.isActive)}
              {item.isFeatured && <View style={[styles.badge, { backgroundColor: '#FEF3C7' }]}><Text style={[styles.badgeText, { color: '#D97706' }]}>Featured</Text></View>}
            </View>
          </View>
        </View>
        <View style={styles.actions}>
          {isProcessing ? <ActivityIndicator size="small" color={colors.tint} /> : (
            <>
              <TouchableOpacity onPress={() => toggleVoucherActive(item)} style={styles.actionBtn}>
                <Ionicons name={item.isActive ? 'eye' : 'eye-off'} size={18} color={colors.icon} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => openVoucherForm(item)} style={styles.actionBtn}>
                <Ionicons name="create-outline" size={18} color="#3B82F6" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => deleteVoucher(item)} style={styles.actionBtn}>
                <Ionicons name="trash-outline" size={18} color="#EF4444" />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  };

  // ═══════════════════════════════════════════════════════════
  //  RENDER: COUPONS TAB
  // ═══════════════════════════════════════════════════════════

  const renderCouponItem = ({ item }: { item: AdminCoupon }) => {
    const isProcessing = processingCoupon === item._id;
    const discount = item.discountType === 'PERCENTAGE' ? `${item.discountValue}%` : `₹${item.discountValue}`;
    return (
      <View style={[styles.listItem, { backgroundColor: colors.card }]}>
        <View style={styles.listItemRow}>
          <View style={[styles.itemImageFallback, { backgroundColor: '#E8B896' }]}>
            <Ionicons name="pricetag" size={20} color="#FFF" />
          </View>
          <View style={styles.itemInfo}>
            <Text style={[styles.itemTitle, { color: colors.text }]} numberOfLines={1}>{item.title}</Text>
            <Text style={[styles.itemSubtitle, { color: '#E8B896' }]}>{discount} OFF • Code: {item.couponCode}</Text>
            <View style={styles.tagRow}>
              {renderStatusBadge(item.isActive)}
              {item.isAutoApply && <View style={[styles.badge, { backgroundColor: '#DBEAFE' }]}><Text style={[styles.badgeText, { color: '#2563EB' }]}>Auto-Apply</Text></View>}
              <Text style={[styles.usageText, { color: colors.icon }]}>Used: {item.usedCount}/{item.usageLimit}</Text>
            </View>
          </View>
        </View>
        <View style={styles.actions}>
          {isProcessing ? <ActivityIndicator size="small" color={colors.tint} /> : (
            <>
              <TouchableOpacity onPress={() => toggleCouponActive(item)} style={styles.actionBtn}>
                <Ionicons name={item.isActive ? 'eye' : 'eye-off'} size={18} color={colors.icon} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => openCouponForm(item)} style={styles.actionBtn}>
                <Ionicons name="create-outline" size={18} color="#3B82F6" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => deleteCoupon(item)} style={styles.actionBtn}>
                <Ionicons name="trash-outline" size={18} color="#EF4444" />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  };

  // ═══════════════════════════════════════════════════════════
  //  RENDER: CAMPAIGNS TAB
  // ═══════════════════════════════════════════════════════════

  const renderCampaignItem = ({ item }: { item: DoubleCashbackCampaign }) => {
    const isProcessing = processingCampaign === item._id;
    const isRunning = item.isActive && new Date(item.startTime) <= new Date() && new Date(item.endTime) > new Date();
    return (
      <View style={[styles.listItem, { backgroundColor: colors.card }]}>
        <View style={styles.listItemRow}>
          <View style={[styles.itemImageFallback, { backgroundColor: item.backgroundColor || '#10B981' }]}>
            <Text style={styles.multiplierText}>{item.multiplier}X</Text>
          </View>
          <View style={styles.itemInfo}>
            <Text style={[styles.itemTitle, { color: colors.text }]} numberOfLines={1}>{item.title}</Text>
            <Text style={[styles.itemSubtitle, { color: colors.icon }]}>{item.subtitle}</Text>
            <View style={styles.tagRow}>
              {renderStatusBadge(item.isActive)}
              {isRunning && <View style={[styles.badge, { backgroundColor: '#DCFCE7' }]}><Text style={[styles.badgeText, { color: '#059669' }]}>LIVE</Text></View>}
            </View>
          </View>
        </View>
        <View style={styles.actions}>
          {isProcessing ? <ActivityIndicator size="small" color={colors.tint} /> : (
            <>
              <TouchableOpacity onPress={() => toggleCampaignActive(item)} style={styles.actionBtn}>
                <Ionicons name={item.isActive ? 'eye' : 'eye-off'} size={18} color={colors.icon} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => openCampaignForm(item)} style={styles.actionBtn}>
                <Ionicons name="create-outline" size={18} color="#3B82F6" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => deleteCampaign(item)} style={styles.actionBtn}>
                <Ionicons name="trash-outline" size={18} color="#EF4444" />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  };

  // ═══════════════════════════════════════════════════════════
  //  RENDER: COIN DROPS TAB
  // ═══════════════════════════════════════════════════════════

  const renderCoinDropItem = ({ item }: { item: CoinDrop }) => {
    const isProcessing = processingCoinDrop === item._id;
    return (
      <View style={[styles.listItem, { backgroundColor: colors.card }]}>
        <View style={styles.listItemRow}>
          {item.storeLogo ? (
            <Image source={{ uri: item.storeLogo }} style={styles.itemImage} resizeMode="contain" />
          ) : (
            <View style={[styles.itemImageFallback, { backgroundColor: '#F59E0B' }]}>
              <Ionicons name="flash" size={20} color="#FFF" />
            </View>
          )}
          <View style={styles.itemInfo}>
            <Text style={[styles.itemTitle, { color: colors.text }]} numberOfLines={1}>{item.storeName || 'Store'}</Text>
            <Text style={[styles.itemSubtitle, { color: colors.icon }]}>{item.multiplier}X boost • {item.category}</Text>
            <View style={styles.tagRow}>{renderStatusBadge(item.isActive)}</View>
          </View>
        </View>
        <View style={styles.actions}>
          {isProcessing ? <ActivityIndicator size="small" color={colors.tint} /> : (
            <>
              <TouchableOpacity onPress={() => toggleCoinDropActive(item)} style={styles.actionBtn}>
                <Ionicons name={item.isActive ? 'eye' : 'eye-off'} size={18} color={colors.icon} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => openCoinDropForm(item)} style={styles.actionBtn}>
                <Ionicons name="create-outline" size={18} color="#3B82F6" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => deleteCoinDrop(item)} style={styles.actionBtn}>
                <Ionicons name="trash-outline" size={18} color="#EF4444" />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  };

  // ═══════════════════════════════════════════════════════════
  //  RENDER: AFFILIATE TAB
  // ═══════════════════════════════════════════════════════════

  const renderAffiliateTab = () => (
    <View style={styles.affiliateContainer}>
      <View style={[styles.searchRow, { marginBottom: 16 }]}>
        <View style={[styles.searchInput, { backgroundColor: colors.card, flex: 1 }]}>
          <Ionicons name="search" size={18} color={colors.icon} />
          <TextInput
            style={[styles.searchText, { color: colors.text }]}
            placeholder="Enter Brand ID..."
            placeholderTextColor={colors.icon}
            value={affiliateBrandId}
            onChangeText={setAffiliateBrandId}
            onSubmitEditing={loadAffiliateAnalytics}
          />
        </View>
        <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.tint }]} onPress={loadAffiliateAnalytics}>
          <Text style={{ color: '#FFF', fontWeight: '600' }}>Search</Text>
        </TouchableOpacity>
      </View>

      {affiliateLoading && <ActivityIndicator size="large" color={colors.tint} style={{ marginTop: 40 }} />}

      {affiliateData && !affiliateLoading && (
        <View style={styles.analyticsGrid}>
          {[
            { label: 'Total Clicks', value: affiliateData.clicks || 0, icon: 'hand-left', color: '#3B82F6' },
            { label: 'Purchases', value: affiliateData.purchases || 0, icon: 'cart', color: '#10B981' },
            { label: 'Revenue', value: `₹${affiliateData.revenue || 0}`, icon: 'cash', color: '#F59E0B' },
            { label: 'Cashback Paid', value: `₹${affiliateData.cashbackPaid || 0}`, icon: 'wallet', color: '#8B5CF6' },
            { label: 'Conversion Rate', value: `${(affiliateData.conversionRate || 0).toFixed(1)}%`, icon: 'trending-up', color: '#06B6D4' },
          ].map((stat, i) => (
            <View key={i} style={[styles.statCard, { backgroundColor: colors.card }]}>
              <View style={[styles.statIcon, { backgroundColor: `${stat.color}20` }]}>
                <Ionicons name={stat.icon as any} size={20} color={stat.color} />
              </View>
              <Text style={[styles.statValue, { color: colors.text }]}>{stat.value}</Text>
              <Text style={[styles.statLabel, { color: colors.icon }]}>{stat.label}</Text>
            </View>
          ))}
        </View>
      )}

      {!affiliateData && !affiliateLoading && (
        <View style={styles.emptyState}>
          <Ionicons name="analytics-outline" size={48} color={colors.icon} />
          <Text style={[styles.emptyText, { color: colors.icon }]}>Enter a brand ID to view affiliate analytics</Text>
        </View>
      )}
    </View>
  );

  // ═══════════════════════════════════════════════════════════
  //  RENDER: TAB BAR + LIST WITH SEARCH/FILTER
  // ═══════════════════════════════════════════════════════════

  const TABS: { key: TabType; label: string; icon: string }[] = [
    { key: 'vouchers', label: 'Vouchers', icon: 'gift' },
    { key: 'coupons', label: 'Coupons', icon: 'pricetag' },
    { key: 'campaigns', label: '2X Cashback', icon: 'flash' },
    { key: 'coindrops', label: 'Coin Drops', icon: 'diamond' },
    { key: 'affiliate', label: 'Analytics', icon: 'bar-chart' },
  ];

  const getListData = () => {
    if (activeTab === 'vouchers') return vouchers;
    if (activeTab === 'coupons') return coupons;
    if (activeTab === 'campaigns') return campaigns;
    if (activeTab === 'coindrops') return coinDrops;
    return [];
  };

  const getListRenderer = () => {
    if (activeTab === 'vouchers') return renderVoucherItem;
    if (activeTab === 'coupons') return renderCouponItem;
    if (activeTab === 'campaigns') return renderCampaignItem;
    if (activeTab === 'coindrops') return renderCoinDropItem;
    return renderVoucherItem;
  };

  const getIsLoading = () => {
    if (activeTab === 'vouchers') return vouchersLoading;
    if (activeTab === 'coupons') return couponsLoading;
    if (activeTab === 'campaigns') return campaignsLoading;
    if (activeTab === 'coindrops') return coinDropsLoading;
    return false;
  };

  const handleRefresh = () => {
    if (activeTab === 'vouchers') { setVouchersRefreshing(true); loadVouchers(); }
    else if (activeTab === 'coupons') { setCouponsRefreshing(true); loadCoupons(); }
    else if (activeTab === 'campaigns') loadCampaigns();
    else if (activeTab === 'coindrops') loadCoinDrops();
  };

  const handleAdd = () => {
    if (activeTab === 'vouchers') openVoucherForm();
    else if (activeTab === 'coupons') openCouponForm();
    else if (activeTab === 'campaigns') openCampaignForm();
    else if (activeTab === 'coindrops') openCoinDropForm();
  };

  const handleSearch = () => {
    if (activeTab === 'vouchers') loadVouchers();
    else if (activeTab === 'coupons') loadCoupons();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Cash Store Management</Text>
        <Text style={[styles.headerSubtitle, { color: colors.icon }]}>Vouchers, Coupons, Campaigns & Analytics</Text>
      </View>

      {/* Tab Bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.tabBar, { backgroundColor: colors.card }]} contentContainerStyle={styles.tabBarContent}>
        {TABS.map(tab => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, isActive && { backgroundColor: colors.tint }]}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.7}
            >
              <Ionicons name={tab.icon as any} size={16} color={isActive ? '#FFF' : colors.icon} />
              <Text style={[styles.tabText, { color: isActive ? '#FFF' : colors.icon }]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Affiliate Tab (special layout) */}
      {activeTab === 'affiliate' ? renderAffiliateTab() : (
        <>
          {/* Search + Add */}
          {(activeTab === 'vouchers' || activeTab === 'coupons') && (
            <View style={styles.searchRow}>
              <View style={[styles.searchInput, { backgroundColor: colors.card }]}>
                <Ionicons name="search" size={18} color={colors.icon} />
                <TextInput
                  style={[styles.searchText, { color: colors.text }]}
                  placeholder="Search..."
                  placeholderTextColor={colors.icon}
                  value={activeTab === 'vouchers' ? voucherSearch : couponSearch}
                  onChangeText={activeTab === 'vouchers' ? setVoucherSearch : setCouponSearch}
                  onSubmitEditing={handleSearch}
                />
              </View>
              <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.tint }]} onPress={handleAdd}>
                <Ionicons name="add" size={22} color="#FFF" />
              </TouchableOpacity>
            </View>
          )}

          {/* Add button for campaigns/coindrops (no search) */}
          {(activeTab === 'campaigns' || activeTab === 'coindrops') && (
            <View style={[styles.searchRow, { justifyContent: 'flex-end' }]}>
              <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.tint }]} onPress={handleAdd}>
                <Ionicons name="add" size={22} color="#FFF" />
              </TouchableOpacity>
            </View>
          )}

          {/* Filter chips (vouchers/coupons) */}
          {(activeTab === 'vouchers' || activeTab === 'coupons') && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={styles.filterContent}>
              {(['all', 'active', 'inactive', 'featured'] as FilterType[]).map(f => {
                const isActive = (activeTab === 'vouchers' ? voucherFilter : couponFilter) === f;
                return (
                  <TouchableOpacity
                    key={f}
                    style={[styles.chip, isActive ? { backgroundColor: colors.tint } : { backgroundColor: colors.card }]}
                    onPress={() => {
                      if (activeTab === 'vouchers') { setVoucherFilter(f); }
                      else { setCouponFilter(f); }
                    }}
                  >
                    <Text style={[styles.chipText, { color: isActive ? '#FFF' : colors.icon }]}>
                      {f.charAt(0).toUpperCase() + f.slice(1)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {/* List */}
          <FlatList
            data={getListData() as any[]}
            renderItem={getListRenderer() as any}
            keyExtractor={(item: any) => item._id}
            contentContainerStyle={styles.listContent}
            refreshControl={<RefreshControl refreshing={false} onRefresh={handleRefresh} tintColor={colors.tint} />}
            ListEmptyComponent={
              getIsLoading() ? (
                <ActivityIndicator size="large" color={colors.tint} style={{ marginTop: 60 }} />
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons name="folder-open-outline" size={48} color={colors.icon} />
                  <Text style={[styles.emptyText, { color: colors.icon }]}>No items found</Text>
                </View>
              )
            }
          />
        </>
      )}

      {/* ═══ VOUCHER FORM MODAL ═══ */}
      <Modal visible={showVoucherModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: colors.card }]}>
            <TouchableOpacity onPress={() => setShowVoucherModal(false)}><Text style={[styles.modalCancel, { color: colors.tint }]}>Cancel</Text></TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{editingVoucher ? 'Edit Voucher' : 'New Voucher'}</Text>
            <TouchableOpacity onPress={saveVoucher}><Text style={[styles.modalSave, { color: colors.tint }]}>Save</Text></TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalContent}>
            {renderFormField('Brand Name *', voucherForm.name, v => setVoucherForm(p => ({ ...p, name: v })))}
            {renderFormField('Slug', voucherForm.slug, v => setVoucherForm(p => ({ ...p, slug: v })), { placeholder: 'auto-generated' })}
            {renderFormField('Logo URL', voucherForm.logo, v => setVoucherForm(p => ({ ...p, logo: v })))}
            {renderFormField('Category', voucherForm.category, v => setVoucherForm(p => ({ ...p, category: v })), { placeholder: 'e.g. Shopping, Food' })}
            {renderFormField('Cashback Rate (%)', voucherForm.cashbackRate, v => setVoucherForm(p => ({ ...p, cashbackRate: v })))}
            {renderFormField('Denominations (comma-sep)', voucherForm.denominations, v => setVoucherForm(p => ({ ...p, denominations: v })), { placeholder: '100, 250, 500, 1000' })}
            {renderFormField('Description', voucherForm.description, v => setVoucherForm(p => ({ ...p, description: v })), { multiline: true })}
            {renderFormField('Terms & Conditions (one per line)', voucherForm.termsAndConditions, v => setVoucherForm(p => ({ ...p, termsAndConditions: v })), { multiline: true })}
            {renderSwitchField('Active', voucherForm.isActive, v => setVoucherForm(p => ({ ...p, isActive: v })))}
            {renderSwitchField('Featured', voucherForm.isFeatured, v => setVoucherForm(p => ({ ...p, isFeatured: v })))}
          </ScrollView>
        </View>
      </Modal>

      {/* ═══ COUPON FORM MODAL ═══ */}
      <Modal visible={showCouponModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: colors.card }]}>
            <TouchableOpacity onPress={() => setShowCouponModal(false)}><Text style={[styles.modalCancel, { color: colors.tint }]}>Cancel</Text></TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{editingCoupon ? 'Edit Coupon' : 'New Coupon'}</Text>
            <TouchableOpacity onPress={saveCoupon}><Text style={[styles.modalSave, { color: colors.tint }]}>Save</Text></TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalContent}>
            {renderFormField('Title *', couponForm.title, v => setCouponForm(p => ({ ...p, title: v })))}
            {renderFormField('Coupon Code *', couponForm.couponCode, v => setCouponForm(p => ({ ...p, couponCode: v })), { placeholder: 'e.g. SAVE20' })}
            {renderFormField('Description', couponForm.description, v => setCouponForm(p => ({ ...p, description: v })), { multiline: true })}
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: colors.text }]}>Discount Type</Text>
              <View style={styles.chipRow}>
                {['PERCENTAGE', 'FIXED'].map(type => (
                  <TouchableOpacity key={type} style={[styles.chip, couponForm.discountType === type ? { backgroundColor: colors.tint } : { backgroundColor: colors.card }]} onPress={() => setCouponForm(p => ({ ...p, discountType: type }))}>
                    <Text style={{ color: couponForm.discountType === type ? '#FFF' : colors.icon, fontWeight: '600' }}>{type}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            {renderFormField('Discount Value', couponForm.discountValue, v => setCouponForm(p => ({ ...p, discountValue: v })))}
            {renderFormField('Min Order Value', couponForm.minOrderValue, v => setCouponForm(p => ({ ...p, minOrderValue: v })))}
            {renderFormField('Max Discount Cap', couponForm.maxDiscountCap, v => setCouponForm(p => ({ ...p, maxDiscountCap: v })))}
            {renderFormField('Valid From (ISO)', couponForm.validFrom, v => setCouponForm(p => ({ ...p, validFrom: v })), { placeholder: '2026-01-01T00:00:00Z' })}
            {renderFormField('Valid To (ISO)', couponForm.validTo, v => setCouponForm(p => ({ ...p, validTo: v })), { placeholder: '2026-12-31T23:59:59Z' })}
            {renderFormField('Usage Limit', couponForm.usageLimit, v => setCouponForm(p => ({ ...p, usageLimit: v })))}
            {renderFormField('Tags (comma-sep)', couponForm.tags, v => setCouponForm(p => ({ ...p, tags: v })), { placeholder: 'shopping, food, rez-exclusive' })}
            {renderFormField('Category', couponForm.category, v => setCouponForm(p => ({ ...p, category: v })))}
            {renderFormField('Image URL', couponForm.imageUrl, v => setCouponForm(p => ({ ...p, imageUrl: v })))}
            {renderSwitchField('Active', couponForm.isActive, v => setCouponForm(p => ({ ...p, isActive: v })))}
            {renderSwitchField('Auto-Apply', couponForm.isAutoApply, v => setCouponForm(p => ({ ...p, isAutoApply: v })))}
          </ScrollView>
        </View>
      </Modal>

      {/* ═══ CAMPAIGN FORM MODAL ═══ */}
      <Modal visible={showCampaignModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: colors.card }]}>
            <TouchableOpacity onPress={() => setShowCampaignModal(false)}><Text style={[styles.modalCancel, { color: colors.tint }]}>Cancel</Text></TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{editingCampaign ? 'Edit Campaign' : 'New Campaign'}</Text>
            <TouchableOpacity onPress={saveCampaign}><Text style={[styles.modalSave, { color: colors.tint }]}>Save</Text></TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalContent}>
            {renderFormField('Title *', campaignForm.title, v => setCampaignForm(p => ({ ...p, title: v })))}
            {renderFormField('Subtitle', campaignForm.subtitle, v => setCampaignForm(p => ({ ...p, subtitle: v })))}
            {renderFormField('Description', campaignForm.description, v => setCampaignForm(p => ({ ...p, description: v })), { multiline: true })}
            {renderFormField('Multiplier (e.g. 2)', campaignForm.multiplier, v => setCampaignForm(p => ({ ...p, multiplier: v })))}
            {renderFormField('Start Time (ISO)', campaignForm.startTime, v => setCampaignForm(p => ({ ...p, startTime: v })))}
            {renderFormField('End Time (ISO)', campaignForm.endTime, v => setCampaignForm(p => ({ ...p, endTime: v })))}
            {renderFormField('Terms (one per line)', campaignForm.terms, v => setCampaignForm(p => ({ ...p, terms: v })), { multiline: true })}
            {renderFormField('Min Order Value', campaignForm.minOrderValue, v => setCampaignForm(p => ({ ...p, minOrderValue: v })))}
            {renderFormField('Max Cashback', campaignForm.maxCashback, v => setCampaignForm(p => ({ ...p, maxCashback: v })))}
            {renderFormField('Background Color', campaignForm.backgroundColor, v => setCampaignForm(p => ({ ...p, backgroundColor: v })))}
            {renderSwitchField('Active', campaignForm.isActive, v => setCampaignForm(p => ({ ...p, isActive: v })))}
          </ScrollView>
        </View>
      </Modal>

      {/* ═══ COIN DROP FORM MODAL ═══ */}
      <Modal visible={showCoinDropModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: colors.card }]}>
            <TouchableOpacity onPress={() => setShowCoinDropModal(false)}><Text style={[styles.modalCancel, { color: colors.tint }]}>Cancel</Text></TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{editingCoinDrop ? 'Edit Coin Drop' : 'New Coin Drop'}</Text>
            <TouchableOpacity onPress={saveCoinDrop}><Text style={[styles.modalSave, { color: colors.tint }]}>Save</Text></TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalContent}>
            {renderFormField('Store ID *', coinDropForm.storeId, v => setCoinDropForm(p => ({ ...p, storeId: v })))}
            {renderFormField('Category', coinDropForm.category, v => setCoinDropForm(p => ({ ...p, category: v })), { placeholder: 'e.g. food-dining' })}
            {renderFormField('Multiplier (e.g. 2)', coinDropForm.multiplier, v => setCoinDropForm(p => ({ ...p, multiplier: v })))}
            {renderFormField('Normal Cashback (%)', coinDropForm.normalCashback, v => setCoinDropForm(p => ({ ...p, normalCashback: v })))}
            {renderFormField('Start Time (ISO)', coinDropForm.startTime, v => setCoinDropForm(p => ({ ...p, startTime: v })))}
            {renderFormField('End Time (ISO)', coinDropForm.endTime, v => setCoinDropForm(p => ({ ...p, endTime: v })))}
            {renderFormField('Min Order Value', coinDropForm.minOrderValue, v => setCoinDropForm(p => ({ ...p, minOrderValue: v })))}
            {renderFormField('Max Cashback', coinDropForm.maxCashback, v => setCoinDropForm(p => ({ ...p, maxCashback: v })))}
            {renderSwitchField('Active', coinDropForm.isActive, v => setCoinDropForm(p => ({ ...p, isActive: v })))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 60, paddingBottom: 12, paddingHorizontal: 20 },
  headerTitle: { fontSize: 22, fontWeight: '700' },
  headerSubtitle: { fontSize: 13, marginTop: 2 },

  // Tab Bar
  tabBar: { maxHeight: 50, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  tabBarContent: { paddingHorizontal: 12, gap: 8, alignItems: 'center', paddingVertical: 8 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  tabText: { fontSize: 13, fontWeight: '600' },

  // Search
  searchRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, gap: 10 },
  searchInput: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, flex: 1 },
  searchText: { flex: 1, fontSize: 14 },
  addBtn: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },

  // Filter
  filterRow: { maxHeight: 44, marginTop: 8 },
  filterContent: { paddingHorizontal: 16, gap: 8, alignItems: 'center' },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  chipText: { fontSize: 13, fontWeight: '600' },
  chipRow: { flexDirection: 'row', gap: 8, marginTop: 6 },

  // List
  listContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 40 },
  listItem: { padding: 14, borderRadius: 12, marginBottom: 8 },
  listItemRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  itemImage: { width: 44, height: 44, borderRadius: 12 },
  itemImageFallback: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  itemInitial: { fontSize: 18, fontWeight: '700', color: '#FFF' },
  multiplierText: { fontSize: 16, fontWeight: '800', color: '#FFF' },
  itemInfo: { flex: 1 },
  itemTitle: { fontSize: 15, fontWeight: '600' },
  itemSubtitle: { fontSize: 12, marginTop: 2 },
  tagRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, flexWrap: 'wrap' },
  usageText: { fontSize: 11 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 10, justifyContent: 'flex-end' },
  actionBtn: { padding: 6 },

  // Badge
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 11, fontWeight: '600' },

  // Empty
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 14 },

  // Modal
  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 60, paddingBottom: 14, paddingHorizontal: 20 },
  modalCancel: { fontSize: 15, fontWeight: '500' },
  modalTitle: { fontSize: 17, fontWeight: '700' },
  modalSave: { fontSize: 15, fontWeight: '600' },
  modalContent: { padding: 20, paddingBottom: 60 },

  // Form
  field: { marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  fieldInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14 },
  switchRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },

  // Affiliate
  affiliateContainer: { flex: 1, padding: 16 },
  analyticsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard: { width: '47%' as any, padding: 16, borderRadius: 12, alignItems: 'center', gap: 8 },
  statIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '700' },
  statLabel: { fontSize: 12 },
});
