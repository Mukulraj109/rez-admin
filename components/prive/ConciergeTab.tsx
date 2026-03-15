import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, RefreshControl, StyleSheet } from 'react-native';
import { priveConciergeAdminApi, ConciergeTicket, ConciergeAnalytics } from '@/services/api/priveConcierge';
import { Colors } from '@/constants/Colors';

export default function ConciergeTab({ colors }: { colors: any }) {
  const [tickets, setTickets] = useState<ConciergeTicket[]>([]);
  const [analytics, setAnalytics] = useState<ConciergeAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<ConciergeTicket | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [ticketRes, analyticsRes] = await Promise.all([
        priveConciergeAdminApi.getTickets({ page, limit: 20, status: statusFilter || undefined }),
        priveConciergeAdminApi.getAnalytics(),
      ]);
      setTickets(ticketRes.tickets || []);
      setTotalPages(ticketRes.pagination?.pages || 1);
      setAnalytics(analyticsRes);
    } catch (err) { console.error('[Concierge] Failed to fetch:', err); } finally { setIsLoading(false); }
  }, [page, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleReply = async (ticketId: string) => {
    if (!replyMessage.trim()) return;
    setIsSending(true);
    try { await priveConciergeAdminApi.respondToTicket(ticketId, replyMessage); setReplyMessage(''); setSelectedTicket(null); fetchData(); } catch (err) { console.error('[Concierge] Failed to reply:', err); } finally { setIsSending(false); }
  };

  const handleResolve = async (ticketId: string) => {
    try { await priveConciergeAdminApi.resolveTicket(ticketId); fetchData(); } catch (err) { console.error('[Concierge] Failed to resolve:', err); }
  };

  const tierColor = (tier: string) => tier === 'elite' ? Colors.light.goldBright : tier === 'signature' ? '#C0C0C0' : Colors.light.bronze;

  return (
    <ScrollView style={styles.tabContent} refreshControl={<RefreshControl refreshing={isLoading} onRefresh={fetchData} />}>
      {analytics && (
        <View style={[styles.statsGrid, { marginBottom: 16 }]}>
          {[
            { label: 'Total (30d)', value: analytics.totalTickets },
            { label: 'Open', value: analytics.openTickets },
            { label: 'SLA Compliance', value: `${analytics.slaComplianceRate}%` },
            { label: 'SLA Breached', value: analytics.slaBreached },
            { label: 'Avg Response', value: analytics.avgResponseHours ? `${analytics.avgResponseHours}h` : 'N/A' },
          ].map((s, i) => (
            <View key={i} style={[styles.statCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.statValue, { color: colors.gold }]}>{s.value}</Text>
              <Text style={[styles.statLabel, { color: colors.secondaryText }]}>{s.label}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        {['', 'open', 'in_progress', 'resolved', 'closed'].map((s) => (
          <TouchableOpacity key={s} style={[styles.configBadge, { backgroundColor: statusFilter === s ? `${colors.gold}33` : colors.card }]} onPress={() => { setStatusFilter(s); setPage(1); }}>
            <Text style={{ color: statusFilter === s ? colors.gold : colors.secondaryText, fontSize: 13 }}>{s || 'All'}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading && tickets.length === 0 ? (
        <ActivityIndicator size="large" color={colors.gold} style={{ marginTop: 40 }} />
      ) : tickets.length === 0 ? (
        <Text style={[styles.emptyText, { color: colors.secondaryText }]}>No tickets found</Text>
      ) : (
        tickets.map((ticket) => (
          <View key={ticket._id} style={[styles.card, { backgroundColor: colors.card, marginBottom: 10 }]}>
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>{ticket.subject}</Text>
                <Text style={[styles.cardSubtitle, { color: colors.secondaryText }]}>#{ticket.ticketNumber} | {ticket.user?.fullName || ticket.user?.phoneNumber || 'Unknown'}</Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <View style={[styles.statusBadge, { backgroundColor: ticket.status === 'open' ? '#FF980022' : ticket.status === 'resolved' ? `${Colors.light.greenDeep}22` : '#2196F322' }]}>
                  <Text style={{ color: ticket.status === 'open' ? colors.warning : ticket.status === 'resolved' ? Colors.light.greenDeep : '#2196F3', fontSize: 12 }}>{ticket.status}</Text>
                </View>
                <View style={[styles.configBadge, { backgroundColor: tierColor(ticket.priveTier) + '22' }]}>
                  <Text style={{ color: tierColor(ticket.priveTier), fontSize: 11, fontWeight: '600' }}>{ticket.priveTier}</Text>
                </View>
              </View>
            </View>

            {ticket.slaBreached && (
              <View style={{ backgroundColor: `${Colors.light.errorMaterial}22`, padding: 6, borderRadius: 6, marginTop: 6 }}>
                <Text style={{ color: Colors.light.errorMaterial, fontSize: 12, fontWeight: '600' }}>SLA BREACHED</Text>
              </View>
            )}

            <Text style={{ color: colors.secondaryText, fontSize: 11, marginTop: 4 }}>
              SLA: {ticket.slaHours}h | Created: {new Date(ticket.createdAt).toLocaleDateString()}{ticket.assignedTo ? ` | Agent: ${ticket.assignedTo.name}` : ''}
            </Text>

            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <TouchableOpacity style={[styles.configBadge, { backgroundColor: '#2196F322' }]} onPress={() => setSelectedTicket(selectedTicket?._id === ticket._id ? null : ticket)}>
                <Text style={{ color: '#2196F3', fontSize: 12 }}>{selectedTicket?._id === ticket._id ? 'Hide' : 'Reply'}</Text>
              </TouchableOpacity>
              {!['resolved', 'closed'].includes(ticket.status) && (
                <TouchableOpacity style={[styles.configBadge, { backgroundColor: `${Colors.light.greenDeep}22` }]} onPress={() => handleResolve(ticket._id)}>
                  <Text style={{ color: Colors.light.greenDeep, fontSize: 12 }}>Resolve</Text>
                </TouchableOpacity>
              )}
            </View>

            {selectedTicket?._id === ticket._id && (
              <View style={{ marginTop: 8 }}>
                {ticket.messages?.map((msg, i) => (
                  <View key={i} style={{ padding: 8, borderRadius: 8, marginBottom: 4, backgroundColor: msg.senderType === 'user' ? colors.background : `${colors.gold}11` }}>
                    <Text style={{ color: msg.senderType === 'user' ? colors.secondaryText : colors.gold, fontSize: 11, fontWeight: '600' }}>{msg.senderType === 'user' ? 'User' : 'Agent'}</Text>
                    <Text style={{ color: colors.text, fontSize: 13 }}>{msg.message}</Text>
                  </View>
                ))}
                <TextInput style={[styles.reasonInput, { color: colors.text, borderColor: colors.border, marginTop: 8 }]} placeholder="Type your reply..." placeholderTextColor={colors.secondaryText} value={replyMessage} onChangeText={setReplyMessage} multiline />
                <TouchableOpacity style={[styles.submitBtn, { opacity: isSending ? 0.5 : 1 }]} onPress={() => handleReply(ticket._id)} disabled={isSending}>
                  <Text style={styles.submitBtnText}>{isSending ? 'Sending...' : 'Send Reply'}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))
      )}

      {totalPages > 1 && (
        <View style={styles.pagination}>
          <TouchableOpacity disabled={page <= 1} onPress={() => setPage(p => p - 1)}><Text style={{ color: page <= 1 ? colors.secondaryText : colors.gold }}>Prev</Text></TouchableOpacity>
          <Text style={{ color: colors.secondaryText }}>Page {page} of {totalPages}</Text>
          <TouchableOpacity disabled={page >= totalPages} onPress={() => setPage(p => p + 1)}><Text style={{ color: page >= totalPages ? colors.secondaryText : colors.gold }}>Next</Text></TouchableOpacity>
        </View>
      )}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  tabContent: { flex: 1, padding: 16 },
  card: { borderRadius: 12, padding: 16, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardTitle: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  cardSubtitle: { fontSize: 12, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  emptyText: { textAlign: 'center', marginTop: 40, fontSize: 14 },
  pagination: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  statCard: { width: '31%', borderRadius: 10, padding: 14, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '600' },
  statLabel: { fontSize: 11, marginTop: 4, textAlign: 'center' },
  configBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  reasonInput: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 12, fontSize: 14 },
  submitBtn: { backgroundColor: Colors.light.gold, borderRadius: 10, padding: 14, alignItems: 'center', marginBottom: 24 },
  submitBtnText: { color: Colors.light.text, fontSize: 15, fontWeight: '600' },
});
