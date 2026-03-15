// Admin Travel Management Page
// 5 tabs: Dashboard, Categories, Services, Bookings, Analytics

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Switch,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/Colors';
import { showAlert, showConfirm } from '../../utils/alert';
import {
  travelAdminService,
  TravelDashboardStats,
  TravelCategory,
  TravelService as TravelServiceType,
  TravelBooking,
} from '@/services/api/travel';

type TabName = 'dashboard' | 'categories' | 'services' | 'bookings' | 'analytics';

const TABS: { key: TabName; label: string; icon: string }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: 'grid' },
  { key: 'categories', label: 'Categories', icon: 'folder' },
  { key: 'services', label: 'Services', icon: 'cube' },
  { key: 'bookings', label: 'Bookings', icon: 'calendar' },
  { key: 'analytics', label: 'Analytics', icon: 'bar-chart' },
];

const CATEGORY_ICONS: Record<string, string> = {
  flights: 'airplane',
  hotels: 'bed',
  trains: 'train',
  bus: 'bus',
  cab: 'car',
  packages: 'briefcase',
};

const STATUS_COLORS: Record<string, string> = {
  pending: Colors.light.warning,
  confirmed: Colors.light.info,
  completed: Colors.light.green,
  cancelled: Colors.light.error,
  no_show: Colors.light.mutedDark,
};

const CASHBACK_STATUS_COLORS: Record<string, string> = {
  pending: Colors.light.slateMedium,
  held: Colors.light.warning,
  credited: Colors.light.green,
  clawed_back: Colors.light.error,
};

export default function TravelManagementPage() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [activeTab, setActiveTab] = useState<TabName>('dashboard');

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Travel Management</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabBar}
        >
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tab,
                activeTab === tab.key && { backgroundColor: colors.navy },
              ]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Ionicons
                name={tab.icon as any}
                size={16}
                color={activeTab === tab.key ? colors.card : colors.icon}
              />
              <Text
                style={[
                  styles.tabLabel,
                  { color: activeTab === tab.key ? colors.card : colors.secondaryText },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Tab Content */}
      {activeTab === 'dashboard' && <DashboardTab colors={colors} />}
      {activeTab === 'categories' && <CategoriesTab colors={colors} />}
      {activeTab === 'services' && <ServicesTab colors={colors} />}
      {activeTab === 'bookings' && <BookingsTab colors={colors} />}
      {activeTab === 'analytics' && <AnalyticsTab colors={colors} />}
    </View>
  );
}

// ==================== DASHBOARD TAB ====================

function DashboardTab({ colors }: { colors: any }) {
  const [stats, setStats] = useState<TravelDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      const data = await travelAdminService.getDashboard();
      setStats(data);
    } catch (err: any) {
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);

  if (loading) return <LoadingView />;
  if (!stats) return <EmptyView message="Failed to load dashboard" />;

  const statCards = [
    { label: 'Total Bookings', value: stats.totalBookings, icon: 'calendar', color: colors.info },
    { label: 'Total Revenue', value: `₹${(stats.revenue.total || 0).toLocaleString()}`, icon: 'cash', color: colors.green },
    { label: 'Avg Booking', value: `₹${Math.round(stats.revenue.average || 0).toLocaleString()}`, icon: 'trending-up', color: colors.purple },
    { label: 'Cashback Credited', value: `₹${(stats.cashback?.credited?.amount || 0).toLocaleString()}`, icon: 'gift', color: colors.warning },
  ];

  return (
    <ScrollView
      contentContainerStyle={styles.tabContent}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={loadStats} />}
    >
      {/* Stats Cards */}
      <View style={styles.statsGrid}>
        {statCards.map((card, idx) => (
          <View key={idx} style={[styles.statCard, { backgroundColor: colors.card }]}>
            <View style={[styles.statIcon, { backgroundColor: card.color + '15' }]}>
              <Ionicons name={card.icon as any} size={20} color={card.color} />
            </View>
            <Text style={[styles.statValue, { color: colors.text }]}>{card.value}</Text>
            <Text style={[styles.statLabel, { color: colors.secondaryText }]}>{card.label}</Text>
          </View>
        ))}
      </View>

      {/* Status Breakdown */}
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Booking Status</Text>
        {Object.entries(stats.statusCounts || {}).map(([status, count]) => (
          <View key={status} style={styles.breakdownRow}>
            <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[status] || colors.mutedDark }]} />
            <Text style={[styles.breakdownLabel, { color: colors.text }]}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Text>
            <Text style={[styles.breakdownValue, { color: colors.secondaryText }]}>{count}</Text>
          </View>
        ))}
      </View>

      {/* Revenue by Category */}
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Revenue by Category</Text>
        {(stats.revenueByCategory || []).map((cat) => (
          <View key={cat.categorySlug} style={styles.breakdownRow}>
            <Ionicons
              name={(CATEGORY_ICONS[cat.categorySlug] || 'airplane') as any}
              size={18}
              color={colors.navy}
            />
            <Text style={[styles.breakdownLabel, { color: colors.text }]}>{cat.categoryName}</Text>
            <View style={styles.breakdownRight}>
              <Text style={[styles.breakdownValue, { color: colors.text }]}>
                ₹{cat.revenue.toLocaleString()}
              </Text>
              <Text style={[styles.breakdownSub, { color: colors.secondaryText }]}>
                {cat.bookingCount} bookings
              </Text>
            </View>
          </View>
        ))}
      </View>

      {/* Recent Bookings */}
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Bookings</Text>
        {(stats.recentBookings || []).slice(0, 5).map((booking: any) => (
          <View key={booking._id} style={styles.recentBookingRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.recentBookingName, { color: colors.text }]}>
                {booking.service?.name || 'N/A'}
              </Text>
              <Text style={[styles.recentBookingSub, { color: colors.secondaryText }]}>
                #{booking.bookingNumber} · {booking.user?.name || booking.customerName}
              </Text>
            </View>
            <View style={[styles.miniStatusBadge, { backgroundColor: (STATUS_COLORS[booking.status] || colors.mutedDark) + '20' }]}>
              <Text style={[styles.miniStatusText, { color: STATUS_COLORS[booking.status] || colors.mutedDark }]}>
                {booking.status}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

// ==================== CATEGORIES TAB ====================

function CategoriesTab({ colors }: { colors: any }) {
  const [categories, setCategories] = useState<TravelCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCategory, setEditingCategory] = useState<TravelCategory | null>(null);
  const [editCashback, setEditCashback] = useState('');

  const loadCategories = useCallback(async () => {
    try {
      setLoading(true);
      const data = await travelAdminService.getCategories();
      setCategories(data);
    } catch (err) {
      console.error('Categories error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadCategories(); }, [loadCategories]);

  const handleSaveCategory = async () => {
    if (!editingCategory) return;
    try {
      await travelAdminService.updateCategory(editingCategory._id, {
        cashbackPercentage: Number(editCashback) || 0,
      });
      showAlert('Success', 'Category updated');
      setEditingCategory(null);
      loadCategories();
    } catch (err: any) {
      showAlert('Error', err.message || 'Failed to update');
    }
  };

  if (loading) return <LoadingView />;

  return (
    <ScrollView contentContainerStyle={styles.tabContent}>
      {categories.map((cat) => (
        <View key={cat._id} style={[styles.categoryCard, { backgroundColor: colors.card }]}>
          <View style={styles.categoryCardRow}>
            <View style={[styles.categoryIconBox, { backgroundColor: colors.infoLight }]}>
              <Ionicons name={(CATEGORY_ICONS[cat.slug] || 'airplane') as any} size={24} color={colors.navy} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.categoryName, { color: colors.text }]}>{cat.name}</Text>
              <Text style={[styles.categorySub, { color: colors.secondaryText }]}>
                {cat.serviceCount || 0} services · {cat.cashbackPercentage || 0}% cashback
              </Text>
            </View>
            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => {
                setEditingCategory(cat);
                setEditCashback(String(cat.cashbackPercentage || 0));
              }}
            >
              <Ionicons name="create-outline" size={20} color={colors.info} />
            </TouchableOpacity>
          </View>
        </View>
      ))}

      {/* Edit Modal */}
      <Modal visible={!!editingCategory} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Edit {editingCategory?.name}
            </Text>
            <Text style={[styles.fieldLabel, { color: colors.secondaryText }]}>Cashback %</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.text }]}
              value={editCashback}
              onChangeText={setEditCashback}
              keyboardType="numeric"
              placeholder="e.g. 5"
              placeholderTextColor={colors.secondaryText}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => setEditingCategory(null)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.saveBtn]}
                onPress={handleSaveCategory}
              >
                <Text style={styles.saveBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

// ==================== SERVICES TAB ====================

function ServicesTab({ colors }: { colors: any }) {
  const [services, setServices] = useState<TravelServiceType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadServices = useCallback(async () => {
    try {
      setLoading(true);
      const data = await travelAdminService.getServices({
        page,
        limit: 20,
        search: search || undefined,
      });
      setServices(data.services);
      setTotalPages(data.pagination?.pages || 1);
    } catch (err) {
      console.error('Services error:', err);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { loadServices(); }, [loadServices]);

  const toggleActive = async (service: TravelServiceType) => {
    try {
      await travelAdminService.updateService(service._id, { isActive: !service.isActive } as any);
      loadServices();
    } catch (err: any) {
      showAlert('Error', err.message || 'Failed to toggle');
    }
  };

  const toggleFeatured = async (service: TravelServiceType) => {
    try {
      await travelAdminService.updateService(service._id, { isFeatured: !service.isFeatured } as any);
      loadServices();
    } catch (err: any) {
      showAlert('Error', err.message || 'Failed to toggle');
    }
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Search */}
      <View style={[styles.searchBar, { backgroundColor: colors.card }]}>
        <Ionicons name="search" size={18} color={colors.secondaryText} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search services..."
          placeholderTextColor={colors.secondaryText}
          value={search}
          onChangeText={(text) => {
            setSearch(text);
            setPage(1);
          }}
        />
      </View>

      {loading ? (
        <LoadingView />
      ) : (
        <FlatList
          data={services}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.tabContent}
          renderItem={({ item }) => (
            <View style={[styles.serviceCard, { backgroundColor: colors.card }]}>
              <View style={styles.serviceCardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.serviceName, { color: colors.text }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={[styles.serviceSub, { color: colors.secondaryText }]}>
                    {item.serviceCategory?.name} · ₹{item.pricing?.selling?.toLocaleString()}
                  </Text>
                </View>
                <View style={styles.serviceToggles}>
                  <TouchableOpacity onPress={() => toggleFeatured(item)} style={styles.toggleBtn}>
                    <Ionicons
                      name={item.isFeatured ? 'star' : 'star-outline'}
                      size={18}
                      color={item.isFeatured ? colors.warning : colors.secondaryText}
                    />
                  </TouchableOpacity>
                  <Switch
                    value={item.isActive}
                    onValueChange={() => toggleActive(item)}
                    trackColor={{ false: colors.slateLight, true: '#86EFAC' }}
                    thumbColor={item.isActive ? colors.green : colors.slateMedium}
                  />
                </View>
              </View>
            </View>
          )}
          ListFooterComponent={
            totalPages > 1 ? (
              <View style={styles.pagination}>
                <TouchableOpacity
                  disabled={page <= 1}
                  onPress={() => setPage((p) => p - 1)}
                  style={[styles.pageBtn, page <= 1 && styles.pageBtnDisabled]}
                >
                  <Text style={styles.pageBtnText}>Prev</Text>
                </TouchableOpacity>
                <Text style={[styles.pageInfo, { color: colors.secondaryText }]}>
                  {page} / {totalPages}
                </Text>
                <TouchableOpacity
                  disabled={page >= totalPages}
                  onPress={() => setPage((p) => p + 1)}
                  style={[styles.pageBtn, page >= totalPages && styles.pageBtnDisabled]}
                >
                  <Text style={styles.pageBtnText}>Next</Text>
                </TouchableOpacity>
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

// ==================== BOOKINGS TAB ====================

function BookingsTab({ colors }: { colors: any }) {
  const [bookings, setBookings] = useState<TravelBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [cashbackFilter, setCashbackFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedBooking, setSelectedBooking] = useState<TravelBooking | null>(null);
  const [pnrInput, setPnrInput] = useState('');
  const [eTicketInput, setETicketInput] = useState('');

  const loadBookings = useCallback(async () => {
    try {
      setLoading(true);
      const data = await travelAdminService.getBookings({
        page,
        limit: 20,
        search: search || undefined,
        status: statusFilter || undefined,
        cashbackStatus: cashbackFilter || undefined,
      });
      setBookings(data.bookings);
      setTotalPages(data.pagination?.pages || 1);
    } catch (err) {
      console.error('Bookings error:', err);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, cashbackFilter]);

  useEffect(() => { loadBookings(); }, [loadBookings]);

  const handleStatusUpdate = async (bookingId: string, newStatus: string) => {
    showConfirm('Confirm', `Change status to ${newStatus}?`, async () => {
      try {
        await travelAdminService.updateBookingStatus(bookingId, newStatus);
        showAlert('Success', 'Status updated');
        loadBookings();
        setSelectedBooking(null);
      } catch (err: any) {
        showAlert('Error', err.message);
      }
    });
  };

  const handleCashbackAction = async (bookingId: string, action: 'credit' | 'clawback') => {
    showConfirm('Confirm', `${action === 'credit' ? 'Credit' : 'Claw back'} cashback?`, async () => {
      try {
        await travelAdminService.overrideCashback(bookingId, action);
        showAlert('Success', `Cashback ${action === 'credit' ? 'credited' : 'clawed back'}`);
        loadBookings();
        setSelectedBooking(null);
      } catch (err: any) {
        showAlert('Error', err.message);
      }
    });
  };

  const handlePnrUpdate = async () => {
    if (!selectedBooking) return;
    try {
      await travelAdminService.updateBookingPnr(selectedBooking._id, {
        pnr: pnrInput || undefined,
        eTicketUrl: eTicketInput || undefined,
      });
      showAlert('Success', 'PNR updated');
      loadBookings();
      setSelectedBooking(null);
    } catch (err: any) {
      showAlert('Error', err.message);
    }
  };

  const STATUS_OPTIONS = ['', 'pending', 'confirmed', 'completed', 'cancelled'];
  const CASHBACK_OPTIONS = ['', 'pending', 'held', 'credited', 'clawed_back'];

  return (
    <View style={{ flex: 1 }}>
      {/* Filters */}
      <View style={[styles.filtersRow, { backgroundColor: colors.card }]}>
        <View style={[styles.searchBarSmall, { borderColor: colors.border }]}>
          <Ionicons name="search" size={16} color={colors.secondaryText} />
          <TextInput
            style={[styles.searchInputSmall, { color: colors.text }]}
            placeholder="Search..."
            placeholderTextColor={colors.secondaryText}
            value={search}
            onChangeText={(text) => { setSearch(text); setPage(1); }}
          />
        </View>
      </View>
      <ScrollView horizontal style={styles.filterChips} showsHorizontalScrollIndicator={false}>
        {STATUS_OPTIONS.map((s) => (
          <TouchableOpacity
            key={`s-${s}`}
            style={[
              styles.chip,
              statusFilter === s && { backgroundColor: colors.navy },
            ]}
            onPress={() => { setStatusFilter(s); setPage(1); }}
          >
            <Text style={[styles.chipText, statusFilter === s && { color: colors.card }]}>
              {s || 'All Status'}
            </Text>
          </TouchableOpacity>
        ))}
        <View style={styles.chipDivider} />
        {CASHBACK_OPTIONS.map((c) => (
          <TouchableOpacity
            key={`c-${c}`}
            style={[
              styles.chip,
              cashbackFilter === c && { backgroundColor: colors.warning },
            ]}
            onPress={() => { setCashbackFilter(c); setPage(1); }}
          >
            <Text style={[styles.chipText, cashbackFilter === c && { color: colors.card }]}>
              {c ? c.replace('_', ' ') : 'All Cashback'}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <LoadingView />
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.tabContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.bookingCard, { backgroundColor: colors.card }]}
              onPress={() => {
                setSelectedBooking(item);
                setPnrInput(item.pnr || '');
                setETicketInput(item.eTicketUrl || '');
              }}
            >
              <View style={styles.bookingCardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.bookingNum, { color: colors.text }]}>
                    #{item.bookingNumber}
                  </Text>
                  <Text style={[styles.bookingSub, { color: colors.secondaryText }]}>
                    {item.service?.name} · {item.serviceCategory?.name}
                  </Text>
                  <Text style={[styles.bookingUser, { color: colors.secondaryText }]}>
                    {item.user?.name || item.customerName} · {item.user?.phone || item.customerPhone}
                  </Text>
                </View>
                <View>
                  <View style={[styles.miniStatusBadge, { backgroundColor: (STATUS_COLORS[item.status] || colors.mutedDark) + '20' }]}>
                    <Text style={[styles.miniStatusText, { color: STATUS_COLORS[item.status] || colors.mutedDark }]}>
                      {item.status}
                    </Text>
                  </View>
                  {item.cashbackStatus && item.cashbackStatus !== 'pending' && (
                    <View style={[styles.miniStatusBadge, { backgroundColor: (CASHBACK_STATUS_COLORS[item.cashbackStatus] || colors.mutedDark) + '20', marginTop: 4 }]}>
                      <Text style={[styles.miniStatusText, { color: CASHBACK_STATUS_COLORS[item.cashbackStatus] || colors.mutedDark }]}>
                        CB: {item.cashbackStatus.replace('_', ' ')}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
              <View style={styles.bookingCardBottom}>
                <Text style={[styles.bookingDate, { color: colors.secondaryText }]}>
                  {new Date(item.bookingDate).toLocaleDateString()}
                </Text>
                {item.pnr && (
                  <Text style={[styles.bookingPnr, { color: colors.text }]}>PNR: {item.pnr}</Text>
                )}
                <Text style={[styles.bookingPrice, { color: colors.navy }]}>
                  ₹{item.pricing?.total?.toLocaleString()}
                </Text>
              </View>
            </TouchableOpacity>
          )}
          ListFooterComponent={
            totalPages > 1 ? (
              <View style={styles.pagination}>
                <TouchableOpacity
                  disabled={page <= 1}
                  onPress={() => setPage((p) => p - 1)}
                  style={[styles.pageBtn, page <= 1 && styles.pageBtnDisabled]}
                >
                  <Text style={styles.pageBtnText}>Prev</Text>
                </TouchableOpacity>
                <Text style={[styles.pageInfo, { color: colors.secondaryText }]}>
                  {page} / {totalPages}
                </Text>
                <TouchableOpacity
                  disabled={page >= totalPages}
                  onPress={() => setPage((p) => p + 1)}
                  style={[styles.pageBtn, page >= totalPages && styles.pageBtnDisabled]}
                >
                  <Text style={styles.pageBtnText}>Next</Text>
                </TouchableOpacity>
              </View>
            ) : null
          }
        />
      )}

      {/* Booking Detail Modal */}
      <Modal visible={!!selectedBooking} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card, maxHeight: '80%' }]}>
            <ScrollView>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  Booking #{selectedBooking?.bookingNumber}
                </Text>
                <TouchableOpacity onPress={() => setSelectedBooking(null)}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              {selectedBooking && (
                <>
                  <Text style={[styles.fieldLabel, { color: colors.secondaryText }]}>Status</Text>
                  <View style={styles.statusActions}>
                    {['confirmed', 'completed', 'cancelled'].map((s) => (
                      <TouchableOpacity
                        key={s}
                        style={[styles.statusActionBtn, { borderColor: STATUS_COLORS[s] }]}
                        onPress={() => handleStatusUpdate(selectedBooking._id, s)}
                      >
                        <Text style={[styles.statusActionText, { color: STATUS_COLORS[s] }]}>
                          {s.charAt(0).toUpperCase() + s.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={[styles.fieldLabel, { color: colors.secondaryText, marginTop: 16 }]}>
                    Cashback ({selectedBooking.cashbackStatus || 'pending'})
                  </Text>
                  <View style={styles.statusActions}>
                    <TouchableOpacity
                      style={[styles.statusActionBtn, { borderColor: colors.green }]}
                      onPress={() => handleCashbackAction(selectedBooking._id, 'credit')}
                    >
                      <Text style={[styles.statusActionText, { color: colors.green }]}>Force Credit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.statusActionBtn, { borderColor: colors.error }]}
                      onPress={() => handleCashbackAction(selectedBooking._id, 'clawback')}
                    >
                      <Text style={[styles.statusActionText, { color: colors.error }]}>Claw Back</Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={[styles.fieldLabel, { color: colors.secondaryText, marginTop: 16 }]}>PNR</Text>
                  <TextInput
                    style={[styles.input, { borderColor: colors.border, color: colors.text }]}
                    value={pnrInput}
                    onChangeText={setPnrInput}
                    placeholder="Enter PNR"
                    placeholderTextColor={colors.secondaryText}
                  />

                  <Text style={[styles.fieldLabel, { color: colors.secondaryText, marginTop: 12 }]}>E-Ticket URL</Text>
                  <TextInput
                    style={[styles.input, { borderColor: colors.border, color: colors.text }]}
                    value={eTicketInput}
                    onChangeText={setETicketInput}
                    placeholder="Enter e-ticket URL"
                    placeholderTextColor={colors.secondaryText}
                  />

                  <View style={[styles.modalActions, { marginTop: 16 }]}>
                    <TouchableOpacity
                      style={[styles.modalBtn, styles.cancelBtn]}
                      onPress={() => setSelectedBooking(null)}
                    >
                      <Text style={styles.cancelBtnText}>Close</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.modalBtn, styles.saveBtn]}
                      onPress={handlePnrUpdate}
                    >
                      <Text style={styles.saveBtnText}>Save PNR</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ==================== ANALYTICS TAB ====================

function AnalyticsTab({ colors }: { colors: any }) {
  const [stats, setStats] = useState<TravelDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await travelAdminService.getDashboard();
        setStats(data);
      } catch (err) {
        console.error('Analytics error:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <LoadingView />;
  if (!stats) return <EmptyView message="Failed to load analytics" />;

  const cashbackEntries = Object.entries(stats.cashback || {});
  const totalCashback = cashbackEntries.reduce((sum, [_, v]) => sum + (v.amount || 0), 0);

  return (
    <ScrollView contentContainerStyle={styles.tabContent}>
      {/* Cashback Breakdown */}
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Cashback Overview</Text>
        <Text style={[styles.analyticsTotal, { color: colors.navy }]}>
          ₹{totalCashback.toLocaleString()} Total
        </Text>
        {cashbackEntries.map(([status, data]) => {
          const pct = totalCashback > 0 ? (data.amount / totalCashback) * 100 : 0;
          const color = CASHBACK_STATUS_COLORS[status] || colors.mutedDark;
          return (
            <View key={status} style={styles.analyticsRow}>
              <View style={styles.analyticsRowLeft}>
                <View style={[styles.statusDot, { backgroundColor: color }]} />
                <Text style={[styles.analyticsLabel, { color: colors.text }]}>
                  {status.replace('_', ' ').charAt(0).toUpperCase() + status.replace('_', ' ').slice(1)}
                </Text>
              </View>
              <View style={styles.analyticsRowRight}>
                <View style={styles.barContainer}>
                  <View style={[styles.bar, { width: `${Math.min(pct, 100)}%`, backgroundColor: color }]} />
                </View>
                <Text style={[styles.analyticsValue, { color: colors.text }]}>
                  ₹{data.amount.toLocaleString()} ({data.count})
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      {/* Revenue by Category */}
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Revenue Distribution</Text>
        {(stats.revenueByCategory || []).map((cat) => {
          const maxRevenue = Math.max(...(stats.revenueByCategory || []).map((c) => c.revenue), 1);
          const pct = (cat.revenue / maxRevenue) * 100;
          return (
            <View key={cat.categorySlug} style={styles.analyticsRow}>
              <View style={styles.analyticsRowLeft}>
                <Ionicons
                  name={(CATEGORY_ICONS[cat.categorySlug] || 'airplane') as any}
                  size={16}
                  color={colors.navy}
                />
                <Text style={[styles.analyticsLabel, { color: colors.text }]}>{cat.categoryName}</Text>
              </View>
              <View style={styles.analyticsRowRight}>
                <View style={styles.barContainer}>
                  <View style={[styles.bar, { width: `${pct}%`, backgroundColor: colors.navy }]} />
                </View>
                <Text style={[styles.analyticsValue, { color: colors.text }]}>
                  ₹{cat.revenue.toLocaleString()}
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      {/* Booking Status Distribution */}
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Status Distribution</Text>
        {Object.entries(stats.statusCounts || {}).map(([status, count]) => {
          const total = stats.totalBookings || 1;
          const pct = (count / total) * 100;
          return (
            <View key={status} style={styles.analyticsRow}>
              <View style={styles.analyticsRowLeft}>
                <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[status] || colors.mutedDark }]} />
                <Text style={[styles.analyticsLabel, { color: colors.text }]}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </Text>
              </View>
              <View style={styles.analyticsRowRight}>
                <View style={styles.barContainer}>
                  <View style={[styles.bar, { width: `${pct}%`, backgroundColor: STATUS_COLORS[status] || colors.mutedDark }]} />
                </View>
                <Text style={[styles.analyticsValue, { color: colors.text }]}>
                  {count} ({Math.round(pct)}%)
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

// ==================== SHARED COMPONENTS ====================

function LoadingView() {
  return (
    <View style={styles.loadingView}>
      <ActivityIndicator size="large" color={Colors.light.navy} />
    </View>
  );
}

function EmptyView({ message }: { message: string }) {
  return (
    <View style={styles.emptyView}>
      <Ionicons name="airplane-outline" size={48} color={Colors.light.slateLight} />
      <Text style={styles.emptyText}>{message}</Text>
    </View>
  );
}

// ==================== STYLES ====================

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: Platform.OS === 'ios' ? 56 : 12, borderBottomWidth: 1, paddingBottom: 0 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 12 },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  tabBar: { flexDirection: 'row', paddingHorizontal: 12, paddingBottom: 12, gap: 8 },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: Colors.light.slate,
  },
  tabLabel: { fontSize: 13, fontWeight: '600' },
  tabContent: { padding: 16, paddingBottom: 40 },

  // Stats
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  statCard: {
    width: '48%' as any, borderRadius: 14, padding: 16,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  statIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  statValue: { fontSize: 18, fontWeight: '700', marginBottom: 2 },
  statLabel: { fontSize: 12 },

  // Sections
  section: { borderRadius: 14, padding: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 14 },

  // Breakdown
  breakdownRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: Colors.light.slate },
  breakdownLabel: { flex: 1, fontSize: 14 },
  breakdownValue: { fontSize: 14, fontWeight: '600' },
  breakdownRight: { alignItems: 'flex-end' },
  breakdownSub: { fontSize: 11, marginTop: 2 },

  // Recent bookings
  recentBookingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: Colors.light.slate },
  recentBookingName: { fontSize: 14, fontWeight: '600' },
  recentBookingSub: { fontSize: 12, marginTop: 2 },
  miniStatusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  miniStatusText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },

  // Category cards
  categoryCard: { borderRadius: 14, padding: 16, marginBottom: 10 },
  categoryCardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  categoryIconBox: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  categoryName: { fontSize: 16, fontWeight: '600' },
  categorySub: { fontSize: 13, marginTop: 2 },
  editBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },

  // Search
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, marginHorizontal: 16, marginTop: 12, borderRadius: 12 },
  searchInput: { flex: 1, fontSize: 14, padding: 0 },
  searchBarSmall: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, borderWidth: 1, flex: 1 },
  searchInputSmall: { flex: 1, fontSize: 13, padding: 0 },

  // Filters
  filtersRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  filterChips: { paddingHorizontal: 16, paddingBottom: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: Colors.light.slate, marginRight: 8 },
  chipText: { fontSize: 12, fontWeight: '600', color: '#475569', textTransform: 'capitalize' },
  chipDivider: { width: 1, backgroundColor: Colors.light.slateLight, marginHorizontal: 4 },

  // Service cards
  serviceCard: { borderRadius: 14, padding: 16, marginBottom: 10 },
  serviceCardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  serviceName: { fontSize: 15, fontWeight: '600' },
  serviceSub: { fontSize: 12, marginTop: 2 },
  serviceToggles: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  toggleBtn: { padding: 4 },

  // Booking cards
  bookingCard: { borderRadius: 14, padding: 16, marginBottom: 10 },
  bookingCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  bookingNum: { fontSize: 14, fontWeight: '700' },
  bookingSub: { fontSize: 13, marginTop: 2 },
  bookingUser: { fontSize: 12, marginTop: 4 },
  bookingCardBottom: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10, paddingTop: 10, borderTopWidth: 0.5, borderTopColor: Colors.light.slate },
  bookingDate: { fontSize: 12 },
  bookingPnr: { fontSize: 12, fontWeight: '600' },
  bookingPrice: { fontSize: 14, fontWeight: '700', marginLeft: 'auto' },

  // Status dot
  statusDot: { width: 8, height: 8, borderRadius: 4 },

  // Pagination
  pagination: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 16, paddingVertical: 16 },
  pageBtn: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: Colors.light.navy, borderRadius: 8 },
  pageBtnDisabled: { opacity: 0.3 },
  pageBtnText: { color: Colors.light.card, fontSize: 13, fontWeight: '600' },
  pageInfo: { fontSize: 13 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  fieldLabel: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, marginBottom: 12 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  cancelBtn: { backgroundColor: Colors.light.slate },
  cancelBtnText: { fontSize: 15, fontWeight: '600', color: '#64748B' },
  saveBtn: { backgroundColor: Colors.light.navy },
  saveBtnText: { fontSize: 15, fontWeight: '600', color: Colors.light.card },

  // Status actions
  statusActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  statusActionBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5 },
  statusActionText: { fontSize: 13, fontWeight: '600' },

  // Analytics
  analyticsTotal: { fontSize: 28, fontWeight: '700', marginBottom: 16 },
  analyticsRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: Colors.light.slate },
  analyticsRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, width: 120 },
  analyticsLabel: { fontSize: 13 },
  analyticsRowRight: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  barContainer: { flex: 1, height: 8, backgroundColor: Colors.light.slate, borderRadius: 4, overflow: 'hidden' },
  bar: { height: '100%', borderRadius: 4 },
  analyticsValue: { fontSize: 12, fontWeight: '600', width: 90, textAlign: 'right' },

  // Loading/Empty
  loadingView: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
  emptyView: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 14, color: Colors.light.slateMedium },
});
