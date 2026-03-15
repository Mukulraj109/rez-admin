import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Modal, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import priveInviteAdminApi, { PriveInviteConfig } from '@/services/api/priveInviteAdmin';
import { Colors } from '@/constants/Colors';

export default function InvitesTab({ colors }: { colors: any }) {
  const [subTab, setSubTab] = useState<'access' | 'codes' | 'config' | 'analytics'>('access');
  const [accessList, setAccessList] = useState<any[]>([]);
  const [inviteCodes, setInviteCodes] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [config, setConfig] = useState<PriveInviteConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [grantForm, setGrantForm] = useState({ identifier: '', reason: '', tierOverride: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<any>(null);
  const [revokeReason, setRevokeReason] = useState('');
  const [revokeAction, setRevokeAction] = useState<'suspend' | 'revoke' | 'remove_whitelist'>('suspend');
  const [editConfig, setEditConfig] = useState<PriveInviteConfig | null>(null);
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  const fetchAccessList = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await priveInviteAdminApi.getAccessList({ page, limit: 20, status: statusFilter !== 'all' ? statusFilter : undefined, search: search || undefined });
      if (res.data?.data) { setAccessList(res.data.data.accessList || res.data.data || []); setTotalPages(res.data.data.pagination?.pages || 1); }
    } catch (err) { console.error('Failed to fetch access list:', err); } finally { setIsLoading(false); }
  }, [page, statusFilter, search]);

  const fetchInviteCodes = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await priveInviteAdminApi.getInviteCodes({ page, limit: 20, search: search || undefined });
      if (res.data?.data) { setInviteCodes(res.data.data.codes || res.data.data || []); setTotalPages(res.data.data.pagination?.pages || 1); }
    } catch (err) { console.error('Failed to fetch invite codes:', err); } finally { setIsLoading(false); }
  }, [page, search]);

  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true);
    try { const res = await priveInviteAdminApi.getInviteAnalytics(); if (res.data?.data) setAnalytics(res.data.data); } catch (err) { console.error('Failed to fetch analytics:', err); } finally { setIsLoading(false); }
  }, []);

  const fetchConfig = useCallback(async () => {
    setIsLoading(true);
    try { const res = await priveInviteAdminApi.getInviteConfig(); if (res.data?.data) { setConfig(res.data.data); setEditConfig(res.data.data); } } catch (err) { console.error('Failed to fetch config:', err); } finally { setIsLoading(false); }
  }, []);

  useEffect(() => {
    if (subTab === 'access') fetchAccessList();
    else if (subTab === 'codes') fetchInviteCodes();
    else if (subTab === 'analytics') fetchAnalytics();
    else if (subTab === 'config') fetchConfig();
  }, [subTab, fetchAccessList, fetchInviteCodes, fetchAnalytics, fetchConfig]);

  const handleGrantAccess = async () => {
    if (!grantForm.identifier.trim() || !grantForm.reason.trim()) return;
    setIsSubmitting(true);
    try {
      const isEmail = grantForm.identifier.includes('@');
      const isPhone = grantForm.identifier.startsWith('+');
      const payload: any = { reason: grantForm.reason };
      if (grantForm.tierOverride) payload.tierOverride = grantForm.tierOverride;
      if (isEmail) payload.email = grantForm.identifier.trim();
      else if (isPhone) payload.phone = grantForm.identifier.trim();
      else payload.userId = grantForm.identifier.trim();
      await priveInviteAdminApi.grantAccess(payload);
      setShowGrantModal(false); setGrantForm({ identifier: '', reason: '', tierOverride: '' }); fetchAccessList();
    } catch (err: any) { console.error('Grant failed:', err); } finally { setIsSubmitting(false); }
  };

  const handleRevoke = async () => {
    if (!revokeTarget || !revokeReason.trim()) return;
    setIsSubmitting(true);
    try { await priveInviteAdminApi.revokeAccess({ userId: revokeTarget.userId, action: revokeAction, reason: revokeReason }); setRevokeTarget(null); setRevokeReason(''); fetchAccessList(); } catch (err: any) { console.error('Revoke failed:', err); } finally { setIsSubmitting(false); }
  };

  const handleDeactivateCode = async (id: string) => {
    try { await priveInviteAdminApi.deactivateCode(id); fetchInviteCodes(); } catch (err) { console.error('Deactivate failed:', err); }
  };

  const handleSaveConfig = async () => {
    if (!editConfig) return;
    setIsSavingConfig(true);
    try { await priveInviteAdminApi.updateInviteConfig(editConfig); setConfig(editConfig); } catch (err) { console.error('Save config failed:', err); } finally { setIsSavingConfig(false); }
  };

  const subTabs = [
    { key: 'access' as const, label: 'Access' },
    { key: 'codes' as const, label: 'Codes' },
    { key: 'config' as const, label: 'Config' },
    { key: 'analytics' as const, label: 'Analytics' },
  ];

  return (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <View style={{ flexDirection: 'row', marginBottom: 16, gap: 8 }}>
        {subTabs.map((t) => (
          <TouchableOpacity key={t.key} style={[styles.filterChip, subTab === t.key && styles.filterChipActive]} onPress={() => { setSubTab(t.key); setPage(1); setSearch(''); }}>
            <Text style={{ color: subTab === t.key ? Colors.light.text : colors.secondaryText, fontSize: 13, fontWeight: '500' }}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ACCESS SUB-TAB */}
      {subTab === 'access' && (
        <>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
            <View style={[styles.searchBar, { backgroundColor: colors.card, flex: 1 }]}>
              <Ionicons name="search" size={18} color={colors.icon} />
              <TextInput style={[styles.searchInput, { color: colors.text }]} placeholder="Search by name, phone, email..." placeholderTextColor={colors.secondaryText} value={search} onChangeText={setSearch} onSubmitEditing={() => { setPage(1); fetchAccessList(); }} />
            </View>
            <TouchableOpacity style={[styles.submitBtn, { marginBottom: 0, paddingHorizontal: 16 }]} onPress={() => setShowGrantModal(true)}>
              <Text style={styles.submitBtnText}>+ Grant</Text>
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
            {['all', 'active', 'suspended', 'revoked'].map((s) => (
              <TouchableOpacity key={s} style={[styles.filterChip, statusFilter === s && styles.filterChipActive]} onPress={() => { setStatusFilter(s); setPage(1); }}>
                <Text style={{ color: statusFilter === s ? Colors.light.text : colors.secondaryText, fontSize: 12 }}>{s.charAt(0).toUpperCase() + s.slice(1)}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {isLoading ? (
            <ActivityIndicator size="large" color={colors.gold} style={{ marginTop: 40 }} />
          ) : accessList.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.secondaryText }]}>No access records found</Text>
          ) : (
            accessList.map((record: any) => (
              <View key={record._id} style={[styles.card, { backgroundColor: colors.card }]}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardTitle, { color: colors.text }]}>{record.userName || record.userId}</Text>
                    <Text style={[styles.cardSubtitle, { color: colors.secondaryText }]}>{record.userPhone || record.userEmail || ''}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: record.status === 'active' ? '#1a472a' : record.status === 'suspended' ? '#4a3520' : '#4a1a1a' }]}>
                    <Text style={{ color: record.status === 'active' ? '#4ade80' : record.status === 'suspended' ? '#fbbf24' : '#f87171', fontSize: 11, fontWeight: '600' }}>{record.status}</Text>
                  </View>
                </View>
                <View style={styles.cardStats}>
                  <Text style={[styles.stat, { color: colors.secondaryText }]}>Method: {record.grantMethod?.replace('_', ' ')}</Text>
                  {record.isWhitelisted && <Text style={[styles.stat, { color: colors.gold }]}>Whitelisted</Text>}
                  {record.tierOverride && <Text style={[styles.stat, { color: colors.gold }]}>Tier: {record.tierOverride}</Text>}
                  {record.inviteCodeUsed && <Text style={[styles.stat, { color: colors.secondaryText }]}>Code: {record.inviteCodeUsed}</Text>}
                </View>
                <View style={styles.cardActions}>
                  {record.status === 'active' && (
                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#4a3520' }]} onPress={() => { setRevokeTarget(record); setRevokeAction('suspend'); }}>
                      <Text style={{ color: '#fbbf24', fontSize: 12 }}>Suspend</Text>
                    </TouchableOpacity>
                  )}
                  {record.status === 'active' && (
                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#4a1a1a' }]} onPress={() => { setRevokeTarget(record); setRevokeAction('revoke'); }}>
                      <Text style={{ color: '#f87171', fontSize: 12 }}>Revoke</Text>
                    </TouchableOpacity>
                  )}
                  {record.isWhitelisted && (
                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#2a2a2a' }]} onPress={() => { setRevokeTarget(record); setRevokeAction('remove_whitelist'); }}>
                      <Text style={{ color: colors.secondaryText, fontSize: 12 }}>Remove Whitelist</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))
          )}

          {totalPages > 1 && (
            <View style={styles.pagination}>
              <TouchableOpacity onPress={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                <Text style={{ color: page <= 1 ? colors.secondaryText : colors.gold }}>Previous</Text>
              </TouchableOpacity>
              <Text style={{ color: colors.secondaryText }}>Page {page} of {totalPages}</Text>
              <TouchableOpacity onPress={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
                <Text style={{ color: page >= totalPages ? colors.secondaryText : colors.gold }}>Next</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Grant Access Modal */}
          <Modal visible={showGrantModal} transparent animationType="fade">
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 }}>
              <View style={{ backgroundColor: colors.card, borderRadius: 16, padding: 20, maxHeight: '80%' }}>
                <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text, marginBottom: 16 }}>Grant Prive Access</Text>
                <Text style={{ fontSize: 13, color: colors.secondaryText, marginBottom: 6 }}>User ID, Email, or Phone</Text>
                <TextInput style={[styles.reasonInput, { borderColor: colors.border, color: colors.text }]} placeholder="e.g. +918210224305 or user@email.com" placeholderTextColor={colors.secondaryText} value={grantForm.identifier} onChangeText={(t) => setGrantForm((f) => ({ ...f, identifier: t }))} />
                <Text style={{ fontSize: 13, color: colors.secondaryText, marginBottom: 6 }}>Reason</Text>
                <TextInput style={[styles.reasonInput, { borderColor: colors.border, color: colors.text }]} placeholder="Reason for granting access" placeholderTextColor={colors.secondaryText} value={grantForm.reason} onChangeText={(t) => setGrantForm((f) => ({ ...f, reason: t }))} />
                <Text style={{ fontSize: 13, color: colors.secondaryText, marginBottom: 6 }}>Tier Override (optional)</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                  {['', 'entry', 'signature', 'elite'].map((t) => (
                    <TouchableOpacity key={t} style={[styles.filterChip, grantForm.tierOverride === t && styles.filterChipActive]} onPress={() => setGrantForm((f) => ({ ...f, tierOverride: t }))}>
                      <Text style={{ color: grantForm.tierOverride === t ? Colors.light.text : colors.secondaryText, fontSize: 12 }}>{t || 'None'}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <TouchableOpacity style={{ flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center', backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border }} onPress={() => setShowGrantModal(false)}>
                    <Text style={{ color: colors.text, fontSize: 15 }}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.submitBtn, { flex: 1, marginBottom: 0, opacity: isSubmitting ? 0.5 : 1 }]} onPress={handleGrantAccess} disabled={isSubmitting}>
                    <Text style={styles.submitBtnText}>{isSubmitting ? 'Granting...' : 'Grant Access'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

          {/* Revoke Modal */}
          <Modal visible={!!revokeTarget} transparent animationType="fade">
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 }}>
              <View style={{ backgroundColor: colors.card, borderRadius: 16, padding: 20 }}>
                <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text, marginBottom: 8 }}>{revokeAction === 'suspend' ? 'Suspend' : revokeAction === 'revoke' ? 'Revoke' : 'Remove Whitelist'}</Text>
                <Text style={{ color: colors.secondaryText, marginBottom: 16 }}>User: {revokeTarget?.userName || revokeTarget?.userId}</Text>
                <TextInput style={[styles.reasonInput, { borderColor: colors.border, color: colors.text }]} placeholder="Reason" placeholderTextColor={colors.secondaryText} value={revokeReason} onChangeText={setRevokeReason} />
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <TouchableOpacity style={{ flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center', backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border }} onPress={() => { setRevokeTarget(null); setRevokeReason(''); }}>
                    <Text style={{ color: colors.text, fontSize: 15 }}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.submitBtn, { flex: 1, marginBottom: 0, backgroundColor: '#dc2626', opacity: isSubmitting ? 0.5 : 1 }]} onPress={handleRevoke} disabled={isSubmitting}>
                    <Text style={[styles.submitBtnText, { color: colors.card }]}>{isSubmitting ? 'Processing...' : 'Confirm'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        </>
      )}

      {/* CODES SUB-TAB */}
      {subTab === 'codes' && (
        <>
          <View style={[styles.searchBar, { backgroundColor: colors.card }]}>
            <Ionicons name="search" size={18} color={colors.icon} />
            <TextInput style={[styles.searchInput, { color: colors.text }]} placeholder="Search by code or creator..." placeholderTextColor={colors.secondaryText} value={search} onChangeText={setSearch} onSubmitEditing={() => { setPage(1); fetchInviteCodes(); }} />
          </View>
          {isLoading ? (
            <ActivityIndicator size="large" color={colors.gold} style={{ marginTop: 40 }} />
          ) : inviteCodes.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.secondaryText }]}>No invite codes found</Text>
          ) : (
            inviteCodes.map((code: any) => (
              <View key={code._id} style={[styles.card, { backgroundColor: colors.card }]}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardTitle, { color: colors.gold, letterSpacing: 1 }]}>{code.code}</Text>
                    <Text style={[styles.cardSubtitle, { color: colors.secondaryText }]}>Creator: {code.creatorName || code.creatorId} ({code.creatorTier})</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: code.isActive ? '#1a472a' : '#4a1a1a' }]}>
                    <Text style={{ color: code.isActive ? '#4ade80' : '#f87171', fontSize: 11, fontWeight: '600' }}>{code.isActive ? 'Active' : 'Inactive'}</Text>
                  </View>
                </View>
                <View style={styles.cardStats}>
                  <Text style={[styles.stat, { color: colors.secondaryText }]}>Usage: {code.usageCount}/{code.maxUses}</Text>
                  <Text style={[styles.stat, { color: colors.secondaryText }]}>Expires: {new Date(code.expiresAt).toLocaleDateString()}</Text>
                </View>
                {code.isActive && (
                  <View style={styles.cardActions}>
                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#4a1a1a' }]} onPress={() => handleDeactivateCode(code._id)}>
                      <Text style={{ color: '#f87171', fontSize: 12 }}>Deactivate</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))
          )}
          {totalPages > 1 && (
            <View style={styles.pagination}>
              <TouchableOpacity onPress={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}><Text style={{ color: page <= 1 ? colors.secondaryText : colors.gold }}>Previous</Text></TouchableOpacity>
              <Text style={{ color: colors.secondaryText }}>Page {page} of {totalPages}</Text>
              <TouchableOpacity onPress={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}><Text style={{ color: page >= totalPages ? colors.secondaryText : colors.gold }}>Next</Text></TouchableOpacity>
            </View>
          )}
        </>
      )}

      {/* CONFIG SUB-TAB */}
      {subTab === 'config' && (
        <>
          {isLoading ? (
            <ActivityIndicator size="large" color={colors.gold} style={{ marginTop: 40 }} />
          ) : editConfig ? (
            <>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Invite System Configuration</Text>
              {[
                { key: 'enabled', label: 'System Enabled', type: 'toggle' },
                { key: 'inviterRewardCoins', label: 'Inviter Reward (coins)', type: 'number' },
                { key: 'inviteeRewardCoins', label: 'Invitee Reward (coins)', type: 'number' },
                { key: 'maxCodesPerUser', label: 'Max Codes Per User', type: 'number' },
                { key: 'codeExpiryDays', label: 'Code Expiry (days)', type: 'number' },
                { key: 'maxUsesPerCode', label: 'Max Uses Per Code', type: 'number' },
                { key: 'cooldownHours', label: 'Cooldown (hours)', type: 'number' },
                { key: 'fraudBlockThreshold', label: 'Fraud Block Threshold', type: 'number' },
              ].map((field) => (
                <View key={field.key} style={{ marginBottom: 16 }}>
                  <Text style={{ fontSize: 13, color: colors.secondaryText, marginBottom: 6 }}>{field.label}</Text>
                  {field.type === 'toggle' ? (
                    <TouchableOpacity style={[styles.filterChip, (editConfig as any)[field.key] && styles.filterChipActive, { alignSelf: 'flex-start' }]} onPress={() => setEditConfig((c) => c ? { ...c, [field.key]: !(c as any)[field.key] } : c)}>
                      <Text style={{ color: (editConfig as any)[field.key] ? Colors.light.text : colors.secondaryText, fontSize: 13 }}>{(editConfig as any)[field.key] ? 'Enabled' : 'Disabled'}</Text>
                    </TouchableOpacity>
                  ) : (
                    <TextInput style={[styles.overrideInput, { borderColor: colors.border, color: colors.text }]} value={String((editConfig as any)[field.key] || '')} onChangeText={(t) => setEditConfig((c) => c ? { ...c, [field.key]: parseInt(t) || 0 } : c)} keyboardType="numeric" />
                  )}
                </View>
              ))}
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 13, color: colors.secondaryText, marginBottom: 6 }}>Min Tier to Invite</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {['entry', 'signature', 'elite'].map((t) => (
                    <TouchableOpacity key={t} style={[styles.filterChip, editConfig.minTierToInvite === t && styles.filterChipActive]} onPress={() => setEditConfig((c) => c ? { ...c, minTierToInvite: t as any } : c)}>
                      <Text style={{ color: editConfig.minTierToInvite === t ? Colors.light.text : colors.secondaryText, fontSize: 12 }}>{t.charAt(0).toUpperCase() + t.slice(1)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <TouchableOpacity style={[styles.submitBtn, { opacity: isSavingConfig ? 0.5 : 1 }]} onPress={handleSaveConfig} disabled={isSavingConfig}>
                <Text style={styles.submitBtnText}>{isSavingConfig ? 'Saving...' : 'Save Configuration'}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <Text style={[styles.emptyText, { color: colors.secondaryText }]}>Failed to load config</Text>
          )}
        </>
      )}

      {/* ANALYTICS SUB-TAB */}
      {subTab === 'analytics' && (
        <>
          {isLoading ? (
            <ActivityIndicator size="large" color={colors.gold} style={{ marginTop: 40 }} />
          ) : analytics ? (
            <>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Access Overview</Text>
              <View style={styles.statsGrid}>
                {[
                  { label: 'Total Access', value: analytics.totalAccess || 0 },
                  { label: 'Active', value: analytics.activeAccess || 0 },
                  { label: 'Whitelisted', value: analytics.whitelistedCount || 0 },
                  { label: 'Total Codes', value: analytics.totalCodes || 0 },
                  { label: 'Active Codes', value: analytics.activeCodes || 0 },
                  { label: 'Total Uses', value: analytics.totalUsage || 0 },
                ].map((s, i) => (
                  <View key={i} style={[styles.statCard, { backgroundColor: colors.card }]}>
                    <Text style={[styles.statValue, { color: colors.gold }]}>{s.value}</Text>
                    <Text style={[styles.statLabel, { color: colors.secondaryText }]}>{s.label}</Text>
                  </View>
                ))}
              </View>
              {analytics.byMethod && analytics.byMethod.length > 0 && (
                <>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>By Grant Method</Text>
                  {analytics.byMethod.map((m: any, i: number) => (
                    <View key={i} style={styles.distributionRow}>
                      <Text style={[styles.distributionLabel, { color: colors.text }]}>{(m._id || 'unknown').replace('_', ' ')}</Text>
                      <Text style={[styles.distributionValue, { color: colors.gold }]}>{m.count}</Text>
                    </View>
                  ))}
                </>
              )}
              {analytics.topInviters && analytics.topInviters.length > 0 && (
                <>
                  <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 16 }]}>Top Inviters</Text>
                  {analytics.topInviters.map((inv: any, i: number) => (
                    <View key={i} style={[styles.card, { backgroundColor: colors.card }]}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={[styles.cardTitle, { color: colors.text }]}>{inv.name || inv.userId}</Text>
                        <Text style={{ color: colors.gold, fontWeight: '600' }}>{inv.totalInvites} invites</Text>
                      </View>
                    </View>
                  ))}
                </>
              )}
            </>
          ) : (
            <Text style={[styles.emptyText, { color: colors.secondaryText }]}>No analytics data</Text>
          )}
        </>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  tabContent: { flex: 1, padding: 16 },
  searchBar: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 10, gap: 8, marginBottom: 12 },
  searchInput: { flex: 1, fontSize: 14 },
  filterRow: { marginBottom: 12, maxHeight: 36 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, backgroundColor: '#2a2a2a', marginRight: 8 },
  filterChipActive: { backgroundColor: Colors.light.gold },
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
  sectionTitle: { fontSize: 16, fontWeight: '600', marginTop: 8, marginBottom: 12 },
  overrideInput: { borderWidth: 1, borderRadius: 8, padding: 8, marginTop: 8, fontSize: 13 },
  reasonInput: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 12, fontSize: 14 },
  submitBtn: { backgroundColor: Colors.light.gold, borderRadius: 10, padding: 14, alignItems: 'center', marginBottom: 24 },
  submitBtnText: { color: Colors.light.text, fontSize: 15, fontWeight: '600' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  statCard: { width: '31%', borderRadius: 10, padding: 14, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '600' },
  statLabel: { fontSize: 11, marginTop: 4, textAlign: 'center' },
  distributionRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#333' },
  distributionLabel: { fontSize: 14 },
  distributionValue: { fontSize: 14, fontWeight: '500' },
});
