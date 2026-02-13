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
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { showAlert, showConfirm } from '../../utils/alert';
import { cashStoreAdminService } from '../../services/api/cashStore';
import type {
  VoucherBrand,
  AdminCoupon,
  AdminStore,
  DoubleCashbackCampaign,
  CoinDrop,
} from '../../services/api/cashStore';

type TabType = 'vouchers' | 'coupons' | 'campaigns' | 'coindrops' | 'affiliate';
type FilterType = 'all' | 'active' | 'inactive' | 'featured';

export default function CashStoreScreen() {
  const router = useRouter();
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
    validFrom: '', validTo: '', usageLimit: '100', perUserLimit: '1', tags: '', category: '',
    imageUrl: '', status: 'active' as string, isAutoApply: false, isFeatured: false, isNewlyAdded: true,
  });
  const [selectedStores, setSelectedStores] = useState<AdminStore[]>([]);
  const [storeSearchQuery, setStoreSearchQuery] = useState('');
  const [storeSearchResults, setStoreSearchResults] = useState<AdminStore[]>([]);
  const [storeSearching, setStoreSearching] = useState(false);
  const [showStoreDropdown, setShowStoreDropdown] = useState(false);

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

  // Reload when filter changes
  useEffect(() => { if (activeTab === 'vouchers') loadVouchers(); }, [voucherFilter]);
  useEffect(() => { if (activeTab === 'coupons') loadCoupons(); }, [couponFilter]);

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
      let filtered = result.voucherBrands || [];
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
      if (couponFilter === 'featured') params.featured = 'true';
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
      const ul = typeof coupon.usageLimit === 'object' ? (coupon.usageLimit as any)?.totalUsage : coupon.usageLimit;
      const pu = typeof coupon.usageLimit === 'object' ? (coupon.usageLimit as any)?.perUser : 1;
      setCouponForm({
        title: coupon.title, couponCode: coupon.couponCode, description: coupon.description || '',
        discountType: coupon.discountType, discountValue: coupon.discountValue?.toString() || '0',
        minOrderValue: coupon.minOrderValue?.toString() || '0',
        maxDiscountCap: coupon.maxDiscountCap?.toString() || '0',
        validFrom: coupon.validFrom || '', validTo: coupon.validTo || '',
        usageLimit: (ul || 0)?.toString(), perUserLimit: (pu || 1)?.toString(),
        tags: coupon.tags?.join(', ') || '', category: coupon.category || '',
        imageUrl: coupon.imageUrl || '', status: coupon.status || 'active',
        isAutoApply: coupon.isAutoApply, isFeatured: coupon.isFeatured || false, isNewlyAdded: coupon.isNewlyAdded || false,
      });
      // Load existing applicable stores
      const existingStores = coupon.applicableTo?.stores || [];
      setSelectedStores(existingStores.map(s =>
        typeof s === 'object' ? { _id: s._id, name: s.name, logo: s.logo || '', category: '' } : { _id: s, name: s, logo: '', category: '' }
      ));
    } else {
      setEditingCoupon(null);
      setCouponForm({
        title: '', couponCode: '', description: '', discountType: 'PERCENTAGE',
        discountValue: '0', minOrderValue: '0', maxDiscountCap: '0',
        validFrom: '', validTo: '', usageLimit: '100', perUserLimit: '1', tags: '', category: '',
        imageUrl: '', status: 'active', isAutoApply: false, isFeatured: false, isNewlyAdded: true,
      });
      setSelectedStores([]);
    }
    setStoreSearchQuery('');
    setStoreSearchResults([]);
    setShowStoreDropdown(false);
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
        usageLimit: { totalUsage: parseInt(couponForm.usageLimit) || 0, perUser: parseInt(couponForm.perUserLimit) || 1, usedCount: 0 },
        tags: couponForm.tags.split(',').map(t => t.trim()).filter(Boolean),
        category: couponForm.category.trim() || undefined,
        imageUrl: couponForm.imageUrl.trim() || undefined,
        status: couponForm.status, autoApply: couponForm.isAutoApply,
        isFeatured: couponForm.isFeatured, isNewlyAdded: couponForm.isNewlyAdded,
        applicableTo: {
          stores: selectedStores.map(s => s._id),
          categories: couponForm.category.trim() ? [couponForm.category.trim()] : [],
          products: [],
          userTiers: [],
        },
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

  const searchStores = async (query: string) => {
    setStoreSearchQuery(query);
    if (!query.trim()) {
      setStoreSearchResults([]);
      setShowStoreDropdown(false);
      return;
    }
    setStoreSearching(true);
    try {
      const stores = await cashStoreAdminService.getCouponStores(query.trim());
      const filtered = stores.filter(s => !selectedStores.some(sel => sel._id === s._id));
      setStoreSearchResults(filtered);
      setShowStoreDropdown(filtered.length > 0);
    } catch {
      setStoreSearchResults([]);
    } finally {
      setStoreSearching(false);
    }
  };

  const addStore = (store: AdminStore) => {
    setSelectedStores(prev => [...prev, store]);
    setStoreSearchQuery('');
    setStoreSearchResults([]);
    setShowStoreDropdown(false);
  };

  const removeStore = (storeId: string) => {
    setSelectedStores(prev => prev.filter(s => s._id !== storeId));
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
    if (!campaignForm.subtitle.trim()) { showAlert('Error', 'Subtitle is required'); return; }
    if (!campaignForm.startTime) { showAlert('Error', 'Start time is required'); return; }
    if (!campaignForm.endTime) { showAlert('Error', 'End time is required'); return; }
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

  // Convert ISO string to datetime-local value (YYYY-MM-DDTHH:MM)
  const toDateTimeLocal = (iso: string): string => {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return '';
      const pad = (n: number) => n.toString().padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch { return ''; }
  };

  // Convert datetime-local value back to ISO string
  const fromDateTimeLocal = (val: string): string => {
    if (!val) return '';
    try {
      return new Date(val).toISOString();
    } catch { return ''; }
  };

  const renderDateTimeField = (label: string, value: string, onChange: (v: string) => void) => (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.text }]}>{label}</Text>
      {Platform.OS === 'web' ? (
        <input
          type="datetime-local"
          value={toDateTimeLocal(value)}
          onChange={(e: any) => onChange(fromDateTimeLocal(e.target.value))}
          style={{
            padding: 10,
            fontSize: 14,
            borderRadius: 8,
            border: `1px solid ${colors.border}`,
            backgroundColor: colors.background,
            color: colors.text,
            outline: 'none',
            width: '100%',
            boxSizing: 'border-box' as any,
          }}
        />
      ) : (
        <TextInput
          style={[styles.fieldInput, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
          value={value}
          onChangeText={onChange}
          placeholder="YYYY-MM-DD HH:MM"
          placeholderTextColor={colors.icon}
        />
      )}
    </View>
  );

  const renderStatusBadge = (isActive: boolean) => (
    <View style={[styles.badge, isActive ? styles.badgeActive : styles.badgeInactive]}>
      <View style={[styles.badgeDot, { backgroundColor: isActive ? '#10B981' : '#EF4444' }]} />
      <Text style={[styles.badgeText, { color: isActive ? '#059669' : '#DC2626' }]}>
        {isActive ? 'Active' : 'Inactive'}
      </Text>
    </View>
  );

  const renderActionButtons = (
    onToggle: () => void,
    onEdit: () => void,
    onDelete: () => void,
    isItemActive: boolean,
    isProcessing: boolean,
  ) => (
    <View style={styles.actions}>
      {isProcessing ? <ActivityIndicator size="small" color="#1a3a52" /> : (
        <>
          <TouchableOpacity onPress={onToggle} style={[styles.actionBtn, { backgroundColor: isItemActive ? '#F0FDF4' : '#FEF2F2' }]}>
            <Ionicons name={isItemActive ? 'eye' : 'eye-off'} size={15} color={isItemActive ? '#10B981' : '#EF4444'} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onEdit} style={[styles.actionBtn, { backgroundColor: '#EFF6FF' }]}>
            <Ionicons name="create-outline" size={15} color="#3B82F6" />
          </TouchableOpacity>
          <TouchableOpacity onPress={onDelete} style={[styles.actionBtn, { backgroundColor: '#FEF2F2' }]}>
            <Ionicons name="trash-outline" size={15} color="#EF4444" />
          </TouchableOpacity>
        </>
      )}
    </View>
  );

  // ═══════════════════════════════════════════════════════════
  //  RENDER: VOUCHER BRANDS TAB
  // ═══════════════════════════════════════════════════════════

  const renderVoucherItem = ({ item }: { item: VoucherBrand }) => (
    <View style={styles.listItem}>
      <View style={styles.listItemRow}>
        {item.logo ? (
          <Image source={{ uri: item.logo }} style={styles.itemImage} resizeMode="contain" />
        ) : (
          <View style={[styles.itemImageFallback, { backgroundColor: '#1a3a52' }]}>
            <Text style={styles.itemInitial}>{item.name?.charAt(0)}</Text>
          </View>
        )}
        <View style={styles.itemInfo}>
          <Text style={styles.itemTitle} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.itemSubtitle}>{item.category} • {item.cashbackRate}% cashback</Text>
          <View style={styles.tagRow}>
            {renderStatusBadge(item.isActive)}
            {item.isFeatured && <View style={[styles.badge, { backgroundColor: '#FEF3C7' }]}><Text style={[styles.badgeText, { color: '#D97706' }]}>Featured</Text></View>}
          </View>
        </View>
      </View>
      {renderActionButtons(() => toggleVoucherActive(item), () => openVoucherForm(item), () => deleteVoucher(item), item.isActive, processingVoucher === item._id)}
    </View>
  );

  // ═══════════════════════════════════════════════════════════
  //  RENDER: COUPONS TAB
  // ═══════════════════════════════════════════════════════════

  const renderCouponItem = ({ item }: { item: AdminCoupon }) => {
    const discount = item.discountType === 'PERCENTAGE' ? `${item.discountValue}%` : `₹${item.discountValue}`;
    const usage = typeof item.usageLimit === 'object' ? item.usageLimit?.totalUsage || '∞' : item.usageLimit || '∞';
    return (
      <View style={styles.listItem}>
        <View style={styles.listItemRow}>
          <View style={[styles.itemImageFallback, { backgroundColor: '#E8B896' }]}>
            <Ionicons name="pricetag" size={18} color="#FFF" />
          </View>
          <View style={styles.itemInfo}>
            <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
            <Text style={[styles.itemSubtitle, { color: '#C4956A' }]}>{discount} OFF  •  <Text style={{ fontFamily: 'monospace', letterSpacing: 1 }}>{item.couponCode}</Text></Text>
            <View style={styles.tagRow}>
              {renderStatusBadge(item.status === 'active')}
              {item.isAutoApply && <View style={[styles.badge, { backgroundColor: '#DBEAFE' }]}><Text style={[styles.badgeText, { color: '#2563EB' }]}>Auto</Text></View>}
              {item.isFeatured && <View style={[styles.badge, { backgroundColor: '#FEF3C7' }]}><Text style={[styles.badgeText, { color: '#D97706' }]}>Featured</Text></View>}
              {item.applicableTo?.stores && item.applicableTo.stores.length > 0 && (
                <View style={[styles.badge, { backgroundColor: '#E8F5E9' }]}>
                  <Ionicons name="storefront-outline" size={10} color="#2E7D32" />
                  <Text style={[styles.badgeText, { color: '#2E7D32' }]}> {item.applicableTo.stores.length} store{item.applicableTo.stores.length > 1 ? 's' : ''}</Text>
                </View>
              )}
              <Text style={styles.usageText}>{item.usedCount || 0}/{usage} used</Text>
            </View>
          </View>
        </View>
        {renderActionButtons(() => toggleCouponActive(item), () => openCouponForm(item), () => deleteCoupon(item), item.status === 'active', processingCoupon === item._id)}
      </View>
    );
  };

  // ═══════════════════════════════════════════════════════════
  //  RENDER: CAMPAIGNS TAB
  // ═══════════════════════════════════════════════════════════

  const renderCampaignItem = ({ item }: { item: DoubleCashbackCampaign }) => {
    const isRunning = item.isActive && new Date(item.startTime) <= new Date() && new Date(item.endTime) > new Date();
    return (
      <View style={styles.listItem}>
        <View style={styles.listItemRow}>
          <View style={[styles.itemImageFallback, { backgroundColor: item.backgroundColor || '#10B981' }]}>
            <Text style={styles.multiplierText}>{item.multiplier}X</Text>
          </View>
          <View style={styles.itemInfo}>
            <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
            <Text style={styles.itemSubtitle}>{item.subtitle}</Text>
            <View style={styles.tagRow}>
              {renderStatusBadge(item.isActive)}
              {isRunning && <View style={[styles.badge, { backgroundColor: '#DCFCE7' }]}><View style={[styles.badgeDot, { backgroundColor: '#10B981' }]} /><Text style={[styles.badgeText, { color: '#059669' }]}>LIVE</Text></View>}
            </View>
          </View>
        </View>
        {renderActionButtons(() => toggleCampaignActive(item), () => openCampaignForm(item), () => deleteCampaign(item), item.isActive, processingCampaign === item._id)}
      </View>
    );
  };

  // ═══════════════════════════════════════════════════════════
  //  RENDER: COIN DROPS TAB
  // ═══════════════════════════════════════════════════════════

  const renderCoinDropItem = ({ item }: { item: CoinDrop }) => (
    <View style={styles.listItem}>
      <View style={styles.listItemRow}>
        {item.storeLogo ? (
          <Image source={{ uri: item.storeLogo }} style={styles.itemImage} resizeMode="contain" />
        ) : (
          <View style={[styles.itemImageFallback, { backgroundColor: '#F59E0B' }]}>
            <Ionicons name="flash" size={18} color="#FFF" />
          </View>
        )}
        <View style={styles.itemInfo}>
          <Text style={styles.itemTitle} numberOfLines={1}>{item.storeName || 'Store'}</Text>
          <Text style={styles.itemSubtitle}>{item.multiplier}X boost • {item.category}</Text>
          <View style={styles.tagRow}>{renderStatusBadge(item.isActive)}</View>
        </View>
      </View>
      {renderActionButtons(() => toggleCoinDropActive(item), () => openCoinDropForm(item), () => deleteCoinDrop(item), item.isActive, processingCoinDrop === item._id)}
    </View>
  );

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

  const getTabCount = (key: TabType) => {
    if (key === 'vouchers') return vouchers.length;
    if (key === 'coupons') return coupons.length;
    if (key === 'campaigns') return campaigns.length;
    if (key === 'coindrops') return coinDrops.length;
    return 0;
  };

  return (
    <View style={[styles.container, { backgroundColor: '#F8F9FB' }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={20} color="#FFF" />
            </TouchableOpacity>
            <View>
              <Text style={styles.headerTitle}>Cash Store</Text>
              <Text style={styles.headerSubtitle}>Manage vouchers, coupons & campaigns</Text>
            </View>
          </View>
          {activeTab !== 'affiliate' && (
            <TouchableOpacity style={styles.addBtnHeader} onPress={handleAdd} activeOpacity={0.8}>
              <Ionicons name="add" size={20} color="#FFF" />
              <Text style={styles.addBtnText}>Add</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Tab Bar */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabBarContent}>
          {TABS.map(tab => {
            const isTabActive = activeTab === tab.key;
            const count = getTabCount(tab.key);
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tab, isTabActive && styles.tabActive]}
                onPress={() => setActiveTab(tab.key)}
                activeOpacity={0.7}
              >
                <Ionicons name={tab.icon as any} size={14} color={isTabActive ? '#FFF' : 'rgba(255,255,255,0.5)'} />
                <Text style={[styles.tabText, isTabActive && styles.tabTextActive]}>{tab.label}</Text>
                {count > 0 && tab.key !== 'affiliate' && (
                  <View style={[styles.tabBadge, isTabActive && styles.tabBadgeActive]}>
                    <Text style={[styles.tabBadgeText, isTabActive && styles.tabBadgeTextActive]}>{count}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Affiliate Tab (special layout) */}
      {activeTab === 'affiliate' ? renderAffiliateTab() : (
        <>
          {/* Search + Filter bar */}
          {(activeTab === 'vouchers' || activeTab === 'coupons') && (
            <View style={styles.toolbarContainer}>
              <View style={styles.searchRow}>
                <View style={styles.searchInput}>
                  <Ionicons name="search" size={16} color="#9CA3AF" />
                  <TextInput
                    style={styles.searchText}
                    placeholder={`Search ${activeTab}...`}
                    placeholderTextColor="#9CA3AF"
                    value={activeTab === 'vouchers' ? voucherSearch : couponSearch}
                    onChangeText={activeTab === 'vouchers' ? setVoucherSearch : setCouponSearch}
                    onSubmitEditing={handleSearch}
                  />
                </View>
              </View>
              <View style={styles.filterRow}>
                {(['all', 'active', 'inactive', 'featured'] as FilterType[]).map(f => {
                  const isFilterActive = (activeTab === 'vouchers' ? voucherFilter : couponFilter) === f;
                  return (
                    <TouchableOpacity
                      key={f}
                      style={[styles.chip, isFilterActive && styles.chipActive]}
                      onPress={() => {
                        if (activeTab === 'vouchers') { setVoucherFilter(f); }
                        else { setCouponFilter(f); }
                      }}
                    >
                      <Text style={[styles.chipText, isFilterActive && styles.chipTextActive]}>
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* List */}
          <FlatList
            data={getListData() as any[]}
            renderItem={getListRenderer() as any}
            keyExtractor={(item: any) => item._id}
            contentContainerStyle={styles.listContent}
            refreshControl={<RefreshControl refreshing={false} onRefresh={handleRefresh} tintColor="#1a3a52" />}
            ListEmptyComponent={
              getIsLoading() ? (
                <View style={styles.loadingWrap}>
                  <ActivityIndicator size="large" color="#1a3a52" />
                  <Text style={styles.loadingText}>Loading...</Text>
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <View style={styles.emptyIconWrap}>
                    <Ionicons name="folder-open-outline" size={36} color="#9CA3AF" />
                  </View>
                  <Text style={styles.emptyTitle}>No {activeTab} found</Text>
                  <Text style={styles.emptySubtext}>Tap the "Add" button to create one</Text>
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
            {/* ── Preview Card ── */}
            <View style={{ backgroundColor: '#667eea', borderRadius: 14, padding: 16, marginBottom: 20 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <View style={{ backgroundColor: 'rgba(255,255,255,0.25)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 }}>
                  <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 12, fontFamily: 'monospace' }}>{couponForm.couponCode || 'CODE'}</Text>
                </View>
                {couponForm.isFeatured && <Text style={{ color: '#FDE68A', fontSize: 11, fontWeight: '600' }}>★ Featured</Text>}
              </View>
              <Text style={{ color: '#FFF', fontSize: 26, fontWeight: '800' }}>
                {couponForm.discountType === 'PERCENTAGE' ? `${couponForm.discountValue || '0'}% OFF` : `₹${couponForm.discountValue || '0'} OFF`}
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 4 }} numberOfLines={1}>{couponForm.title || 'Coupon Title'}</Text>
              {parseFloat(couponForm.minOrderValue) > 0 && <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11, marginTop: 4 }}>Min order: ₹{couponForm.minOrderValue}</Text>}
            </View>

            {/* ── Section: Basic Info ── */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <Ionicons name="information-circle" size={16} color={colors.tint} />
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text, textTransform: 'uppercase', letterSpacing: 0.5 }}>Basic Info</Text>
            </View>
            {renderFormField('Title *', couponForm.title, v => setCouponForm(p => ({ ...p, title: v })), { placeholder: 'e.g. Crispy Chicken - 33% Off' })}
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-end' }}>
              <View style={{ flex: 1 }}>
                {renderFormField('Coupon Code *', couponForm.couponCode, v => setCouponForm(p => ({ ...p, couponCode: v.toUpperCase() })), { placeholder: 'e.g. SAVE20' })}
              </View>
              <TouchableOpacity
                style={{ backgroundColor: colors.tint, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, marginBottom: 14 }}
                onPress={() => {
                  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
                  let code = '';
                  for (let i = 0; i < 8; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
                  setCouponForm(p => ({ ...p, couponCode: code }));
                }}
              >
                <Ionicons name="dice" size={18} color="#FFF" />
              </TouchableOpacity>
            </View>
            {renderFormField('Description', couponForm.description, v => setCouponForm(p => ({ ...p, description: v })), { multiline: true, placeholder: 'Describe the coupon offer...' })}

            {/* ── Section: Discount ── */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, marginBottom: 10 }}>
              <Ionicons name="pricetag" size={16} color="#EC4899" />
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text, textTransform: 'uppercase', letterSpacing: 0.5 }}>Discount</Text>
            </View>
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: colors.text }]}>Discount Type</Text>
              <View style={styles.chipRow}>
                {[{ key: 'PERCENTAGE', label: '% Percentage' }, { key: 'FIXED', label: '₹ Fixed Amount' }].map(type => (
                  <TouchableOpacity key={type.key} style={[styles.chip, { flex: 1, alignItems: 'center' as any }, couponForm.discountType === type.key ? { backgroundColor: colors.tint } : { backgroundColor: colors.card }]} onPress={() => setCouponForm(p => ({ ...p, discountType: type.key }))}>
                    <Text style={{ color: couponForm.discountType === type.key ? '#FFF' : colors.icon, fontWeight: '600', fontSize: 13 }}>{type.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            {renderFormField(couponForm.discountType === 'PERCENTAGE' ? 'Discount (%)' : 'Discount (₹)', couponForm.discountValue, v => setCouponForm(p => ({ ...p, discountValue: v })), { placeholder: couponForm.discountType === 'PERCENTAGE' ? 'e.g. 20' : 'e.g. 100' })}
            {couponForm.discountType === 'PERCENTAGE' && renderFormField('Max Discount Cap (₹)', couponForm.maxDiscountCap, v => setCouponForm(p => ({ ...p, maxDiscountCap: v })), { placeholder: '0 = no cap' })}
            {renderFormField('Min Order Value (₹)', couponForm.minOrderValue, v => setCouponForm(p => ({ ...p, minOrderValue: v })), { placeholder: '0 = no minimum' })}

            {/* ── Section: Validity & Limits ── */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, marginBottom: 10 }}>
              <Ionicons name="time" size={16} color="#F59E0B" />
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text, textTransform: 'uppercase', letterSpacing: 0.5 }}>Validity & Limits</Text>
            </View>
            {renderDateTimeField('Valid From', couponForm.validFrom, v => setCouponForm(p => ({ ...p, validFrom: v })))}
            {renderDateTimeField('Valid To', couponForm.validTo, v => setCouponForm(p => ({ ...p, validTo: v })))}
            {renderFormField('Total Usage Limit', couponForm.usageLimit, v => setCouponForm(p => ({ ...p, usageLimit: v })), { placeholder: '0 = unlimited' })}
            {renderFormField('Per User Limit', couponForm.perUserLimit, v => setCouponForm(p => ({ ...p, perUserLimit: v })), { placeholder: '1' })}

            {/* ── Section: Targeting ── */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, marginBottom: 10 }}>
              <Ionicons name="funnel" size={16} color="#8B5CF6" />
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text, textTransform: 'uppercase', letterSpacing: 0.5 }}>Targeting</Text>
            </View>
            {renderFormField('Tags', couponForm.tags, v => setCouponForm(p => ({ ...p, tags: v })), { placeholder: 'shopping, food, nquta-exclusive, etc.' })}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
              {['shopping', 'food', 'fashion', 'electronics', 'nquta-exclusive'].map(tag => (
                <TouchableOpacity
                  key={tag}
                  style={{ backgroundColor: couponForm.tags.includes(tag) ? colors.tint : colors.card, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 }}
                  onPress={() => {
                    const current = couponForm.tags.split(',').map(t => t.trim()).filter(Boolean);
                    const updated = current.includes(tag) ? current.filter(t => t !== tag) : [...current, tag];
                    setCouponForm(p => ({ ...p, tags: updated.join(', ') }));
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '600', color: couponForm.tags.includes(tag) ? '#FFF' : colors.icon }}>{tag}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {renderFormField('Category', couponForm.category, v => setCouponForm(p => ({ ...p, category: v })), { placeholder: 'e.g. food-dining' })}

            {/* ── Store Selector ── */}
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: colors.text }]}>Applicable Stores</Text>
              <Text style={{ fontSize: 11, color: colors.icon, marginBottom: 8 }}>
                Leave empty for all stores. Search and add specific stores to restrict this coupon.
              </Text>

              {/* Selected stores chips */}
              {selectedStores.length > 0 && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                  {selectedStores.map(store => (
                    <View key={store._id} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#E8F5E9', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, gap: 6 }}>
                      <Ionicons name="storefront" size={13} color="#2E7D32" />
                      <Text style={{ fontSize: 12, fontWeight: '600', color: '#2E7D32' }}>{store.name}</Text>
                      <TouchableOpacity onPress={() => removeStore(store._id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Ionicons name="close-circle" size={16} color="#2E7D32" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              {/* Search input */}
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background, borderRadius: 10, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 10 }}>
                <Ionicons name="search" size={16} color={colors.icon} />
                <TextInput
                  style={{ flex: 1, paddingVertical: 10, paddingHorizontal: 8, fontSize: 14, color: colors.text }}
                  placeholder="Search stores by name..."
                  placeholderTextColor={colors.icon}
                  value={storeSearchQuery}
                  onChangeText={searchStores}
                />
                {storeSearching && <ActivityIndicator size="small" color={colors.tint} />}
              </View>

              {/* Dropdown results */}
              {showStoreDropdown && storeSearchResults.length > 0 && (
                <View style={{ backgroundColor: colors.card, borderRadius: 10, marginTop: 6, borderWidth: 1, borderColor: colors.border, maxHeight: 200, overflow: 'hidden' }}>
                  <ScrollView nestedScrollEnabled style={{ maxHeight: 200 }}>
                    {storeSearchResults.map(store => (
                      <TouchableOpacity
                        key={store._id}
                        style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 10 }}
                        onPress={() => addStore(store)}
                      >
                        {store.logo ? (
                          <Image source={{ uri: store.logo }} style={{ width: 28, height: 28, borderRadius: 6 }} />
                        ) : (
                          <View style={{ width: 28, height: 28, borderRadius: 6, backgroundColor: '#F0F0F5', alignItems: 'center', justifyContent: 'center' }}>
                            <Ionicons name="storefront-outline" size={14} color={colors.icon} />
                          </View>
                        )}
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>{store.name}</Text>
                          {store.category ? <Text style={{ fontSize: 11, color: colors.icon }}>{store.category}</Text> : null}
                        </View>
                        <Ionicons name="add-circle" size={20} color={colors.tint} />
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            {renderFormField('Image URL', couponForm.imageUrl, v => setCouponForm(p => ({ ...p, imageUrl: v })), { placeholder: 'https://...' })}

            {/* ── Section: Settings ── */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, marginBottom: 10 }}>
              <Ionicons name="settings" size={16} color="#6B7280" />
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text, textTransform: 'uppercase', letterSpacing: 0.5 }}>Settings</Text>
            </View>
            <View style={styles.field}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: couponForm.status === 'active' ? '#10B981' : '#EF4444' }} />
                  <Text style={[styles.fieldLabel, { color: colors.text, marginBottom: 0 }]}>Status: {couponForm.status === 'active' ? 'Active' : 'Inactive'}</Text>
                </View>
                <Switch
                  value={couponForm.status === 'active'}
                  onValueChange={(v) => setCouponForm(p => ({ ...p, status: v ? 'active' : 'inactive' }))}
                  trackColor={{ false: '#D1D5DB', true: '#A7F3D0' }}
                  thumbColor={couponForm.status === 'active' ? '#10B981' : '#9CA3AF'}
                />
              </View>
            </View>
            {renderSwitchField('Auto-Apply at Checkout', couponForm.isAutoApply, v => setCouponForm(p => ({ ...p, isAutoApply: v })))}
            {renderSwitchField('Featured (show on top)', couponForm.isFeatured, v => setCouponForm(p => ({ ...p, isFeatured: v })))}
            {renderSwitchField('Show "New" Badge', couponForm.isNewlyAdded, v => setCouponForm(p => ({ ...p, isNewlyAdded: v })))}
            <View style={{ height: 40 }} />
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
            {renderDateTimeField('Start Time', campaignForm.startTime, v => setCampaignForm(p => ({ ...p, startTime: v })))}
            {renderDateTimeField('End Time', campaignForm.endTime, v => setCampaignForm(p => ({ ...p, endTime: v })))}
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
            {renderDateTimeField('Start Time', coinDropForm.startTime, v => setCoinDropForm(p => ({ ...p, startTime: v })))}
            {renderDateTimeField('End Time', coinDropForm.endTime, v => setCoinDropForm(p => ({ ...p, endTime: v })))}
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

  // Header — dark navy
  header: { backgroundColor: '#1a3a52', paddingTop: 48, paddingBottom: 4, paddingHorizontal: 20 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#FFF' },
  headerSubtitle: { fontSize: 13, marginTop: 2, color: 'rgba(255,255,255,0.6)' },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  addBtnHeader: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  addBtnText: { color: '#FFF', fontWeight: '600', fontSize: 14 },

  // Tab Bar (inside header)
  tabBarContent: { paddingBottom: 10, gap: 6, alignItems: 'center' },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.08)' },
  tabActive: { backgroundColor: 'rgba(255,255,255,0.22)' },
  tabText: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.5)' },
  tabTextActive: { color: '#FFF' },
  tabBadge: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1, minWidth: 20, alignItems: 'center' },
  tabBadgeActive: { backgroundColor: 'rgba(255,255,255,0.3)' },
  tabBadgeText: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.5)' },
  tabBadgeTextActive: { color: '#FFF' },

  // Toolbar (search + filter)
  toolbarContainer: { backgroundColor: '#FFF', paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  searchRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, gap: 10 },
  searchInput: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10, backgroundColor: '#F3F4F6', flex: 1 },
  searchText: { flex: 1, fontSize: 14, color: '#1F2937' },
  addBtn: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },

  // Filter chips
  filterRow: { flexDirection: 'row', paddingHorizontal: 16, marginTop: 10, gap: 8 },
  filterContent: { paddingHorizontal: 16, gap: 8, alignItems: 'center' },
  chip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 18, backgroundColor: '#F3F4F6' },
  chipActive: { backgroundColor: '#1a3a52' },
  chipText: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  chipTextActive: { color: '#FFF' },
  chipRow: { flexDirection: 'row', gap: 8, marginTop: 6 },

  // List
  listContent: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 40 },
  listItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 14, borderRadius: 12, marginBottom: 8, gap: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 },
  listItemRow: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  itemImage: { width: 44, height: 44, borderRadius: 12 },
  itemImageFallback: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  itemInitial: { fontSize: 18, fontWeight: '700', color: '#FFF' },
  multiplierText: { fontSize: 16, fontWeight: '800', color: '#FFF' },
  itemInfo: { flex: 1 },
  itemTitle: { fontSize: 15, fontWeight: '600', color: '#1F2937' },
  itemSubtitle: { fontSize: 12, marginTop: 2, color: '#6B7280' },
  tagRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, flexWrap: 'wrap' },
  usageText: { fontSize: 11, color: '#9CA3AF' },
  actions: { flexDirection: 'column', gap: 4, alignItems: 'center' },
  actionBtn: { padding: 6, borderRadius: 8 },

  // Badge
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeActive: { backgroundColor: '#DCFCE7' },
  badgeInactive: { backgroundColor: '#FEE2E2' },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 11, fontWeight: '600' },

  // Loading
  loadingWrap: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  loadingText: { fontSize: 14, color: '#9CA3AF' },

  // Empty
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyIconWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#374151' },
  emptySubtext: { fontSize: 13, color: '#9CA3AF' },
  emptyText: { fontSize: 14, color: '#9CA3AF' },

  // Modal
  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 60, paddingBottom: 14, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
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
