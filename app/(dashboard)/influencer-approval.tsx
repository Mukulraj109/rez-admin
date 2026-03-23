/**
 * Admin Influencer Approval
 * Review Privé applications, approve/reject with notes.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Linking, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { BRAND } from '../../constants/brand';
import { showAlert } from '../../utils/alert';
import { apiClient } from '../../services/api/apiClient';

interface InfluencerApp { _id: string; userId: string; userName: string; phone: string; followers: number; platform: string; profileUrl: string; status: string; tier: string; score: number; appliedAt: string; }

export default function InfluencerApprovalScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [applications, setApplications] = useState<InfluencerApp[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  const fetchApps = useCallback(async () => {
    try { setIsLoading(true);
      const res = await apiClient.get('/admin/prive/access?status=pending&limit=50');
      setApplications(res.data?.applications || res.data?.users || []);
    } catch { showAlert('Error', 'Failed to load applications'); }
    finally { setIsLoading(false); }
  }, []);

  useEffect(() => { fetchApps(); }, [fetchApps]);

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    setProcessing(id);
    try {
      await apiClient.put(`/admin/prive/access/${id}/${action === 'approve' ? 'grant' : 'revoke'}`, { note: `${action}d by admin` });
      showAlert('Success', `Application ${action}d`);
      fetchApps();
    } catch { showAlert('Error', `Failed to ${action}`); }
    finally { setProcessing(null); }
  };

  const renderApp = useCallback(({ item }: { item: InfluencerApp }) => (
    <View style={[s.card, { backgroundColor: colors.card }]}>
      <View style={s.cardHeader}>
        <View>
          <Text style={[s.name, { color: colors.text }]}>{item.userName}</Text>
          <Text style={[s.phone, { color: colors.mutedDark }]}>{item.phone}</Text>
        </View>
        <View style={s.scoreBadge}>
          <Text style={s.scoreText}>{item.score || 0}</Text>
        </View>
      </View>
      <View style={s.statsRow}>
        <View style={s.stat}><Ionicons name="people" size={14} color={colors.purple} /><Text style={[s.statText, { color: colors.text }]}>{(item.followers || 0).toLocaleString()} followers</Text></View>
        <View style={s.stat}><Ionicons name="logo-instagram" size={14} color="#E4405F" /><Text style={[s.statText, { color: colors.text }]}>{item.platform || 'instagram'}</Text></View>
      </View>
      {item.profileUrl && (
        <TouchableOpacity onPress={() => Linking.openURL(item.profileUrl)}>
          <Text style={[s.profileLink, { color: colors.info }]}>{item.profileUrl}</Text>
        </TouchableOpacity>
      )}
      <View style={s.actions}>
        <TouchableOpacity style={[s.btn, { backgroundColor: colors.success }]} onPress={() => handleAction(item._id, 'approve')} disabled={processing === item._id}>
          {processing === item._id ? <ActivityIndicator size="small" color="#FFF" /> : <><Ionicons name="checkmark" size={16} color="#FFF" /><Text style={s.btnText}>Approve</Text></>}
        </TouchableOpacity>
        <TouchableOpacity style={[s.btn, { backgroundColor: colors.error }]} onPress={() => handleAction(item._id, 'reject')} disabled={processing === item._id}>
          <Ionicons name="close" size={16} color="#FFF" /><Text style={s.btnText}>Reject</Text>
        </TouchableOpacity>
      </View>
    </View>
  ), [colors, processing]);

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <Text style={[s.title, { color: colors.text }]}>Influencer Approval</Text>
      {isLoading ? <ActivityIndicator size="large" style={{ marginTop: 40 }} color={colors.purple} /> : (
        <FlatList data={applications} keyExtractor={i => i._id} renderItem={renderApp}
          contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
          refreshControl={<RefreshControl refreshing={false} onRefresh={fetchApps} />}
          ListEmptyComponent={<View style={s.empty}><Ionicons name="checkmark-done-circle" size={48} color={colors.success} /><Text style={[s.emptyText, { color: colors.mutedDark }]}>No pending applications</Text></View>}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: 24, fontWeight: '800', padding: 16, paddingBottom: 0 },
  card: { borderRadius: 12, padding: 14, marginBottom: 10, elevation: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  name: { fontSize: 15, fontWeight: '700' },
  phone: { fontSize: 12, marginTop: 1 },
  scoreBadge: { backgroundColor: '#7C3AED', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  scoreText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
  statsRow: { flexDirection: 'row', gap: 16, marginBottom: 8 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: { fontSize: 13 },
  profileLink: { fontSize: 12, marginBottom: 10 },
  actions: { flexDirection: 'row', gap: 8 },
  btn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 8, gap: 4 },
  btnText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 14, marginTop: 12 },
});
