import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import priveAdminApi from '@/services/api/priveAdmin';
import { Colors } from '@/constants/Colors';

export default function OffersTab({ colors }: { colors: any }) {
  const [offers, setOffers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchOffers = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await priveAdminApi.getOffers({ page, limit: 20, search: search || undefined });
      if (res.data?.data) {
        setOffers(res.data.data.offers || []);
        setTotalPages(res.data.data.pagination?.pages || 1);
      }
    } catch (err) {
      console.error('Failed to fetch offers:', err);
    } finally {
      setIsLoading(false);
    }
  }, [page, search]);

  useEffect(() => { fetchOffers(); }, [fetchOffers]);

  const handleToggleStatus = async (id: string) => {
    try {
      await priveAdminApi.toggleOfferStatus(id);
      fetchOffers();
    } catch (err) {
      console.error('Failed to toggle status:', err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await priveAdminApi.deleteOffer(id);
      fetchOffers();
    } catch (err) {
      console.error('Failed to delete offer:', err);
    }
  };

  return (
    <ScrollView
      style={styles.tabContent}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={fetchOffers} />}
    >
      {/* Search */}
      <View style={[styles.searchBar, { backgroundColor: colors.card }]}>
        <Ionicons name="search-outline" size={18} color={colors.icon} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search offers..."
          placeholderTextColor={colors.secondaryText}
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={() => { setPage(1); fetchOffers(); }}
        />
      </View>

      {isLoading && offers.length === 0 ? (
        <ActivityIndicator size="large" color={colors.gold} style={{ marginTop: 40 }} />
      ) : offers.length === 0 ? (
        <Text style={[styles.emptyText, { color: colors.secondaryText }]}>No offers found</Text>
      ) : (
        offers.map((offer: any) => (
          <View key={offer._id} style={[styles.card, { backgroundColor: colors.card }]}>
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>{offer.title}</Text>
                <Text style={[styles.cardSubtitle, { color: colors.secondaryText }]}>
                  {offer.brand?.name || 'Unknown'} | Tier: {offer.tierRequired}
                </Text>
              </View>
              <View style={[
                styles.statusBadge,
                { backgroundColor: offer.isActive ? `${Colors.light.success}20` : `${Colors.light.error}20` },
              ]}>
                <Text style={{ color: offer.isActive ? colors.success : colors.error, fontSize: 11 }}>
                  {offer.isActive ? 'Active' : 'Inactive'}
                </Text>
              </View>
            </View>
            <View style={styles.cardStats}>
              <Text style={[styles.stat, { color: colors.secondaryText }]}>
                Views: {offer.views || 0}
              </Text>
              <Text style={[styles.stat, { color: colors.secondaryText }]}>
                Clicks: {offer.clicks || 0}
              </Text>
              <Text style={[styles.stat, { color: colors.secondaryText }]}>
                Redeemed: {offer.redemptions || 0}
              </Text>
            </View>
            <View style={styles.cardActions}>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: `${colors.gold}20` }]}
                onPress={() => handleToggleStatus(offer._id)}
              >
                <Text style={{ color: colors.gold, fontSize: 12 }}>
                  {offer.isActive ? 'Deactivate' : 'Activate'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: `${Colors.light.error}20` }]}
                onPress={() => handleDelete(offer._id)}
              >
                <Text style={{ color: colors.error, fontSize: 12 }}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <View style={styles.pagination}>
          <TouchableOpacity
            disabled={page <= 1}
            onPress={() => setPage(p => Math.max(1, p - 1))}
          >
            <Text style={{ color: page > 1 ? colors.gold : colors.secondaryText }}>Previous</Text>
          </TouchableOpacity>
          <Text style={{ color: colors.text }}>Page {page} of {totalPages}</Text>
          <TouchableOpacity
            disabled={page >= totalPages}
            onPress={() => setPage(p => p + 1)}
          >
            <Text style={{ color: page < totalPages ? colors.gold : colors.secondaryText }}>Next</Text>
          </TouchableOpacity>
        </View>
      )}
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
  pagination: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16 },
});
