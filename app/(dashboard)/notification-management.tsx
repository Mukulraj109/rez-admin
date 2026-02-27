'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, SafeAreaView, RefreshControl, useColorScheme,
  Modal, Switch, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { showAlert, showConfirm } from '../../utils/alert';
import { apiClient } from '../../services/api/apiClient';

// ============================================
// TYPES & CONSTANTS
// ============================================

interface NotificationTemplate {
  _id: string;
  title: string;
  body: string;
  channel: 'push' | 'email' | 'sms';
  category?: string;
  variables: string[];
  isActive: boolean;
  createdBy?: { fullName?: string; phoneNumber?: string };
  createdAt: string;
  updatedAt: string;
}

interface TemplateFormData {
  title: string;
  body: string;
  channel: 'push' | 'email' | 'sms';
  category: string;
  variables: string;
  isActive: boolean;
}

interface NotificationStats {
  total: number;
  byChannel: Record<string, number>;
  byStatus: { active: number; inactive: number };
}

interface SendPayload {
  templateId: string;
  target: { type: 'all' | 'segment' | 'user'; userId?: string; segment?: string };
  schedule: string;
}

const CHANNELS: Array<'push' | 'email' | 'sms'> = ['push', 'email', 'sms'];
const CHANNEL_LABELS: Record<string, string> = { push: 'Push', email: 'Email', sms: 'SMS' };
const CHANNEL_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  push: 'notifications-outline',
  email: 'mail-outline',
  sms: 'chatbubble-outline',
};
const CHANNEL_COLORS: Record<string, string> = {
  push: '#8B5CF6',
  email: '#3B82F6',
  sms: '#10B981',
};
const TARGET_TYPES: Array<'all' | 'segment' | 'user'> = ['all', 'segment', 'user'];
const TARGET_LABELS: Record<string, string> = { all: 'All Users', segment: 'Segment', user: 'Single User' };

const DEFAULT_FORM: TemplateFormData = {
  title: '', body: '', channel: 'push', category: '', variables: '', isActive: true,
};

// ============================================
// INLINE API SERVICE
// ============================================

const notificationApi = {
  getTemplates: (params?: string) =>
    apiClient.get(`admin/notifications/templates${params ? `?${params}` : ''}`),
  createTemplate: (data: Partial<NotificationTemplate>) =>
    apiClient.post('admin/notifications/templates', data),
  updateTemplate: (id: string, data: Partial<NotificationTemplate>) =>
    apiClient.put(`admin/notifications/templates/${id}`, data),
  deleteTemplate: (id: string) =>
    apiClient.delete(`admin/notifications/templates/${id}`),
  sendNotification: (payload: SendPayload) =>
    apiClient.post('admin/notifications/send', payload),
  getStats: () =>
    apiClient.get<NotificationStats>('admin/notifications/stats'),
};

// ============================================
// MAIN COMPONENT
// ============================================

export default function NotificationManagementScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  // Template list state
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [channelFilter, setChannelFilter] = useState<string>('All');

  // Stats state
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [showStats, setShowStats] = useState(false);

  // Form modal state
  const [showFormModal, setShowFormModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplate | null>(null);
  const [formData, setFormData] = useState<TemplateFormData>(DEFAULT_FORM);

  // Send modal state
  const [showSendModal, setShowSendModal] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendTemplateId, setSendTemplateId] = useState('');
  const [sendTargetType, setSendTargetType] = useState<'all' | 'segment' | 'user'>('all');
  const [sendUserId, setSendUserId] = useState('');
  const [sendSegment, setSendSegment] = useState('');

  // ============================================
  // DATA LOADING
  // ============================================

  const loadTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (channelFilter !== 'All') params.set('channel', channelFilter);
      params.set('limit', '100');
      const q = params.toString();
      const response = await notificationApi.getTemplates(q);
      if (!response.success) throw new Error(response.message || 'Failed to load templates');
      setTemplates(response.data?.templates || response.data || []);
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to load templates');
    } finally { setLoading(false); setRefreshing(false); }
  }, [channelFilter]);

  const loadStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const response = await notificationApi.getStats();
      if (!response.success) throw new Error(response.message || 'Failed to load stats');
      setStats(response.data || null);
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to load stats');
    } finally { setStatsLoading(false); }
  }, []);

  useEffect(() => { loadTemplates(); }, [loadTemplates]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadTemplates();
  }, [loadTemplates]);

  // ============================================
  // TEMPLATE ACTIONS
  // ============================================

  const handleCreate = () => {
    setEditingTemplate(null);
    setFormData({ ...DEFAULT_FORM });
    setShowFormModal(true);
  };

  const handleEdit = (template: NotificationTemplate) => {
    setEditingTemplate(template);
    setFormData({
      title: template.title,
      body: template.body,
      channel: template.channel,
      category: template.category || '',
      variables: (template.variables || []).join(', '),
      isActive: template.isActive,
    });
    setShowFormModal(true);
  };

  const handleSave = async () => {
    if (!formData.title.trim()) { showAlert('Error', 'Title is required'); return; }
    if (!formData.body.trim()) { showAlert('Error', 'Body is required'); return; }

    try {
      setIsSaving(true);
      const vars = formData.variables
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

      const payload = {
        title: formData.title.trim(),
        body: formData.body.trim(),
        channel: formData.channel,
        category: formData.category.trim() || undefined,
        variables: vars,
        isActive: formData.isActive,
      };

      if (editingTemplate) {
        const res = await notificationApi.updateTemplate(editingTemplate._id, payload);
        if (!res.success) throw new Error(res.message || 'Failed to update');
        showAlert('Success', 'Template updated');
      } else {
        const res = await notificationApi.createTemplate(payload);
        if (!res.success) throw new Error(res.message || 'Failed to create');
        showAlert('Success', 'Template created');
      }
      setShowFormModal(false);
      loadTemplates();
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to save template');
    } finally { setIsSaving(false); }
  };

  const handleDelete = (template: NotificationTemplate) => {
    showConfirm('Delete Template', `Are you sure you want to delete "${template.title}"?`, async () => {
      try {
        const res = await notificationApi.deleteTemplate(template._id);
        if (!res.success) throw new Error(res.message || 'Failed to delete');
        showAlert('Success', 'Template deleted');
        loadTemplates();
      } catch (error: any) { showAlert('Error', error.message || 'Failed to delete'); }
    });
  };

  // ============================================
  // SEND ACTIONS
  // ============================================

  const handleOpenSend = (template?: NotificationTemplate) => {
    setSendTemplateId(template?._id || '');
    setSendTargetType('all');
    setSendUserId('');
    setSendSegment('');
    setShowSendModal(true);
  };

  const handleSend = async () => {
    if (!sendTemplateId) { showAlert('Error', 'Please select a template'); return; }
    if (sendTargetType === 'user' && !sendUserId.trim()) {
      showAlert('Error', 'User ID is required for single-user target');
      return;
    }
    if (sendTargetType === 'segment' && !sendSegment.trim()) {
      showAlert('Error', 'Segment name is required for segment target');
      return;
    }

    try {
      setIsSending(true);
      const target: SendPayload['target'] = { type: sendTargetType };
      if (sendTargetType === 'user') target.userId = sendUserId.trim();
      if (sendTargetType === 'segment') target.segment = sendSegment.trim();

      const res = await notificationApi.sendNotification({
        templateId: sendTemplateId,
        target,
        schedule: 'now',
      });
      if (!res.success) throw new Error(res.message || 'Failed to send');
      showAlert('Success', 'Notification queued for delivery');
      setShowSendModal(false);
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to send notification');
    } finally { setIsSending(false); }
  };

  // ============================================
  // STATS
  // ============================================

  const handleToggleStats = () => {
    if (!showStats && !stats) loadStats();
    setShowStats(prev => !prev);
  };

  // ============================================
  // RENDERERS
  // ============================================

  const renderTemplate = ({ item }: { item: NotificationTemplate }) => {
    const chColor = CHANNEL_COLORS[item.channel] || '#6B7280';
    const chIcon = CHANNEL_ICONS[item.channel] || 'notifications-outline';
    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.colorStrip, { backgroundColor: chColor }]} />
        <View style={styles.cardBody}>
          <View style={styles.cardTopRow}>
            <Text style={[styles.cardName, { color: colors.text }]} numberOfLines={1}>
              {item.title}
            </Text>
            <View style={[styles.channelBadge, { backgroundColor: `${chColor}18` }]}>
              <Ionicons name={chIcon} size={12} color={chColor} style={{ marginRight: 3 }} />
              <Text style={[styles.channelBadgeText, { color: chColor }]}>
                {CHANNEL_LABELS[item.channel]}
              </Text>
            </View>
          </View>
          <Text style={[styles.bodyPreview, { color: colors.secondaryText || '#6B7280' }]} numberOfLines={2}>
            {item.body}
          </Text>
          {item.variables && item.variables.length > 0 && (
            <View style={styles.varsRow}>
              {item.variables.slice(0, 4).map((v, i) => (
                <View key={i} style={[styles.varPill, { backgroundColor: colors.background }]}>
                  <Text style={styles.varText}>{`{{${v}}}`}</Text>
                </View>
              ))}
              {item.variables.length > 4 && (
                <Text style={styles.moreText}>+{item.variables.length - 4}</Text>
              )}
            </View>
          )}
          <View style={styles.metaRow}>
            {item.category ? (
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{item.category}</Text>
              </View>
            ) : null}
            <View style={[styles.statusBadge, item.isActive ? styles.activeBg : styles.inactiveBg]}>
              <Text style={{ fontSize: 11, fontWeight: '600', color: item.isActive ? '#059669' : '#6B7280' }}>
                {item.isActive ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>
          <View style={styles.cardActions}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => handleEdit(item)}>
              <Ionicons name="create-outline" size={18} color="#3B82F6" />
              <Text style={[styles.actionText, { color: '#3B82F6' }]}>Edit</Text>
            </TouchableOpacity>
            {item.isActive && (
              <TouchableOpacity style={styles.actionBtn} onPress={() => handleOpenSend(item)}>
                <Ionicons name="send-outline" size={16} color="#8B5CF6" />
                <Text style={[styles.actionText, { color: '#8B5CF6' }]}>Send</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(item)}>
              <Ionicons name="trash-outline" size={18} color="#EF4444" />
              <Text style={[styles.actionText, { color: '#EF4444' }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  // Input helper matching gift-cards-admin pattern
  const inp = (key: keyof TemplateFormData, ph: string, opts?: { multi?: boolean }) => (
    <TextInput
      style={[styles.formInput, opts?.multi && styles.multiline, { color: colors.text, borderColor: colors.border }]}
      value={String(formData[key])}
      onChangeText={(v) => setFormData(p => ({ ...p, [key]: v }))}
      placeholder={ph} placeholderTextColor="#9CA3AF"
      multiline={opts?.multi}
    />
  );

  // ============================================
  // STATS PANEL
  // ============================================

  const renderStatsPanel = () => {
    if (!showStats) return null;

    if (statsLoading) {
      return (
        <View style={[styles.statsPanel, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <ActivityIndicator size="small" color="#3B82F6" />
        </View>
      );
    }

    if (!stats) return null;

    return (
      <View style={[styles.statsPanel, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#10B981' }]}>{stats.byStatus.active}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#6B7280' }]}>{stats.byStatus.inactive}</Text>
            <Text style={styles.statLabel}>Inactive</Text>
          </View>
        </View>
        <View style={styles.channelStatsRow}>
          {CHANNELS.map(ch => (
            <View key={ch} style={[styles.channelStatBox, { borderColor: CHANNEL_COLORS[ch] }]}>
              <Ionicons name={CHANNEL_ICONS[ch]} size={18} color={CHANNEL_COLORS[ch]} />
              <Text style={[styles.channelStatCount, { color: CHANNEL_COLORS[ch] }]}>
                {stats.byChannel[ch] || 0}
              </Text>
              <Text style={styles.channelStatLabel}>{CHANNEL_LABELS[ch]}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  // ============================================
  // FORM MODAL
  // ============================================

  const renderFormModal = () => (
    <Modal visible={showFormModal} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowFormModal(false)}>
            <Ionicons name="close" size={28} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: colors.text }]}>
            {editingTemplate ? 'Edit Template' : 'New Template'}
          </Text>
          <TouchableOpacity onPress={handleSave} disabled={isSaving}>
            {isSaving ? <ActivityIndicator size="small" color="#3B82F6" /> : <Text style={styles.saveBtn}>Save</Text>}
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.formScroll} contentContainerStyle={{ paddingBottom: 40 }}>
          <Text style={styles.formLabel}>Title</Text>
          {inp('title', 'e.g. Order Shipped')}

          <Text style={styles.formLabel}>Body</Text>
          {inp('body', 'Notification body text. Use {{variable}} for placeholders.', { multi: true })}

          <Text style={styles.formLabel}>Channel</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 6 }}>
            {CHANNELS.map(ch => (
              <TouchableOpacity key={ch}
                style={[styles.filterChip, formData.channel === ch && { backgroundColor: CHANNEL_COLORS[ch] }]}
                onPress={() => setFormData(p => ({ ...p, channel: ch }))}>
                <Ionicons
                  name={CHANNEL_ICONS[ch]}
                  size={14}
                  color={formData.channel === ch ? '#FFF' : '#6B7280'}
                  style={{ marginRight: 4 }}
                />
                <Text style={[styles.chipText, formData.channel === ch && styles.chipTextActive]}>
                  {CHANNEL_LABELS[ch]}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.formLabel}>Category (optional)</Text>
          {inp('category', 'e.g. Marketing, Transactional')}

          <Text style={styles.formLabel}>Variables (comma-separated)</Text>
          {inp('variables', 'e.g. userName, orderNumber, amount')}

          <View style={styles.switchRow}>
            <Text style={styles.formLabel}>Active</Text>
            <Switch value={formData.isActive} onValueChange={(v) => setFormData(p => ({ ...p, isActive: v }))}
              trackColor={{ false: '#E2E8F0', true: '#3B82F6' }} thumbColor="#FFFFFF" />
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  // ============================================
  // SEND MODAL
  // ============================================

  const renderSendModal = () => (
    <Modal visible={showSendModal} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowSendModal(false)}>
            <Ionicons name="close" size={28} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Send Notification</Text>
          <TouchableOpacity onPress={handleSend} disabled={isSending}>
            {isSending
              ? <ActivityIndicator size="small" color="#8B5CF6" />
              : <Text style={[styles.saveBtn, { color: '#8B5CF6' }]}>Send</Text>}
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.formScroll} contentContainerStyle={{ paddingBottom: 40 }}>
          {/* Template selector */}
          <Text style={styles.formLabel}>Template</Text>
          {sendTemplateId ? (
            <View style={[styles.selectedTemplate, { borderColor: colors.border, backgroundColor: colors.card }]}>
              <Text style={[styles.selectedTemplateName, { color: colors.text }]}>
                {templates.find(t => t._id === sendTemplateId)?.title || 'Selected'}
              </Text>
              <TouchableOpacity onPress={() => setSendTemplateId('')}>
                <Ionicons name="close-circle" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView style={[styles.templatePicker, { borderColor: colors.border }]} nestedScrollEnabled>
              {templates.filter(t => t.isActive).length === 0 ? (
                <Text style={styles.emptyPickerText}>No active templates available</Text>
              ) : (
                templates.filter(t => t.isActive).map(t => (
                  <TouchableOpacity
                    key={t._id}
                    style={[styles.templateOption, { borderBottomColor: colors.border }]}
                    onPress={() => setSendTemplateId(t._id)}>
                    <Ionicons name={CHANNEL_ICONS[t.channel]} size={16} color={CHANNEL_COLORS[t.channel]} />
                    <Text style={[styles.templateOptionText, { color: colors.text }]} numberOfLines={1}>
                      {t.title}
                    </Text>
                    <Text style={styles.templateOptionChannel}>{CHANNEL_LABELS[t.channel]}</Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          )}

          {/* Target type */}
          <Text style={[styles.formLabel, { marginTop: 16 }]}>Target</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 6 }}>
            {TARGET_TYPES.map(tt => (
              <TouchableOpacity key={tt}
                style={[styles.filterChip, sendTargetType === tt && styles.filterChipActive]}
                onPress={() => setSendTargetType(tt)}>
                <Text style={[styles.chipText, sendTargetType === tt && styles.chipTextActive]}>
                  {TARGET_LABELS[tt]}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* User ID input (conditional) */}
          {sendTargetType === 'user' && (
            <>
              <Text style={styles.formLabel}>User ID</Text>
              <TextInput
                style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
                value={sendUserId}
                onChangeText={setSendUserId}
                placeholder="MongoDB ObjectId of the user"
                placeholderTextColor="#9CA3AF"
              />
            </>
          )}

          {/* Segment input (conditional) */}
          {sendTargetType === 'segment' && (
            <>
              <Text style={styles.formLabel}>Segment</Text>
              <TextInput
                style={[styles.formInput, { color: colors.text, borderColor: colors.border }]}
                value={sendSegment}
                onChangeText={setSendSegment}
                placeholder="e.g. premium_users, new_users"
                placeholderTextColor="#9CA3AF"
              />
            </>
          )}

          {/* Schedule - now only for this iteration */}
          <Text style={[styles.formLabel, { marginTop: 16 }]}>Schedule</Text>
          <View style={[styles.scheduleBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="time-outline" size={18} color="#3B82F6" />
            <Text style={[styles.scheduleText, { color: colors.text }]}>Send immediately</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  // ============================================
  // MAIN RENDER
  // ============================================

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Notifications</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.statsBtn} onPress={handleToggleStats}>
            <Ionicons name="stats-chart-outline" size={18} color="#3B82F6" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.sendBtnHeader} onPress={() => handleOpenSend()}>
            <Ionicons name="send-outline" size={16} color="#FFFFFF" />
            <Text style={styles.sendBtnHeaderText}>Send</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.createBtn} onPress={handleCreate}>
            <Ionicons name="add" size={20} color="#FFFFFF" />
            <Text style={styles.createBtnText}>New Template</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats panel (collapsible) */}
      {renderStatsPanel()}

      {/* Channel filters */}
      <View style={[styles.filtersBar, { backgroundColor: colors.card }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterChip, channelFilter === 'All' && styles.filterChipActive]}
            onPress={() => setChannelFilter('All')}>
            <Text style={[styles.chipText, channelFilter === 'All' && styles.chipTextActive]}>All</Text>
          </TouchableOpacity>
          {CHANNELS.map(ch => (
            <TouchableOpacity key={ch}
              style={[styles.filterChip, channelFilter === ch && { backgroundColor: CHANNEL_COLORS[ch] }]}
              onPress={() => setChannelFilter(ch)}>
              <Ionicons
                name={CHANNEL_ICONS[ch]}
                size={14}
                color={channelFilter === ch ? '#FFF' : '#6B7280'}
                style={{ marginRight: 4 }}
              />
              <Text style={[styles.chipText, channelFilter === ch && styles.chipTextActive]}>
                {CHANNEL_LABELS[ch]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Template list */}
      <FlatList
        data={templates}
        renderItem={renderTemplate}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={loading
          ? <ActivityIndicator size="large" color="#3B82F6" style={{ paddingVertical: 40 }} />
          : <View style={styles.emptyBox}>
              <Ionicons name="notifications-off-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyText}>No notification templates found</Text>
            </View>}
      />

      {/* Modals */}
      {renderFormModal()}
      {renderSendModal()}
    </View>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 22, fontWeight: '700' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statsBtn: {
    padding: 8, borderRadius: 8, backgroundColor: '#EFF6FF',
  },
  sendBtnHeader: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#8B5CF6',
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, gap: 4,
  },
  sendBtnHeaderText: { color: '#FFF', fontWeight: '600', fontSize: 13 },
  createBtn: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#3B82F6',
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, gap: 4,
  },
  createBtnText: { color: '#FFF', fontWeight: '600', fontSize: 14 },
  filtersBar: {
    paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
  },
  filterRow: { flexDirection: 'row' },
  filterChip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
    backgroundColor: '#F3F4F6', marginRight: 8,
  },
  filterChipActive: { backgroundColor: '#3B82F6' },
  chipText: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
  chipTextActive: { color: '#FFF', fontWeight: '600' },

  // Stats panel
  statsPanel: {
    marginHorizontal: 16, marginTop: 12, padding: 16,
    borderRadius: 12, borderWidth: 1,
  },
  statsGrid: {
    flexDirection: 'row', justifyContent: 'space-around', marginBottom: 14,
  },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: '700', color: '#1E293B' },
  statLabel: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  channelStatsRow: {
    flexDirection: 'row', justifyContent: 'space-around', gap: 10,
  },
  channelStatBox: {
    flex: 1, alignItems: 'center', paddingVertical: 10,
    borderRadius: 10, borderWidth: 1.5,
  },
  channelStatCount: { fontSize: 18, fontWeight: '700', marginTop: 4 },
  channelStatLabel: { fontSize: 11, color: '#6B7280', marginTop: 2 },

  // Template cards
  card: {
    borderRadius: 12, marginBottom: 10, borderWidth: 1,
    flexDirection: 'row', overflow: 'hidden',
  },
  colorStrip: { width: 5 },
  cardBody: { flex: 1, padding: 14 },
  cardTopRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 6,
  },
  cardName: { fontSize: 15, fontWeight: '600', flex: 1, marginRight: 8 },
  channelBadge: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
  },
  channelBadgeText: { fontSize: 11, fontWeight: '600' },
  bodyPreview: { fontSize: 13, lineHeight: 18, marginBottom: 8 },
  varsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  varPill: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  varText: { fontSize: 11, fontWeight: '600', color: '#374151' },
  moreText: { fontSize: 11, color: '#9CA3AF', alignSelf: 'center' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  categoryBadge: {
    backgroundColor: '#EFF6FF', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
  },
  categoryText: { fontSize: 11, fontWeight: '600', color: '#3B82F6' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  activeBg: { backgroundColor: '#D1FAE5' },
  inactiveBg: { backgroundColor: '#F3F4F6' },
  cardActions: {
    flexDirection: 'row', gap: 12,
    borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 10,
  },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingVertical: 4, paddingHorizontal: 6,
  },
  actionText: { fontSize: 12, fontWeight: '500' },

  // Modal shared
  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
  },
  modalTitle: { fontSize: 17, fontWeight: '600' },
  saveBtn: { fontSize: 16, fontWeight: '600', color: '#3B82F6' },
  formScroll: { paddingHorizontal: 20 },
  formLabel: { fontSize: 13, fontWeight: '500', color: '#6B7280', marginTop: 10, marginBottom: 4 },
  formInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  switchRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginTop: 10,
  },

  // Send modal specific
  selectedTemplate: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10,
  },
  selectedTemplateName: { fontSize: 14, fontWeight: '500', flex: 1, marginRight: 8 },
  templatePicker: {
    maxHeight: 200, borderWidth: 1, borderRadius: 8, overflow: 'hidden',
  },
  templateOption: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: 1,
  },
  templateOptionText: { fontSize: 14, flex: 1 },
  templateOptionChannel: { fontSize: 11, color: '#9CA3AF', fontWeight: '500' },
  emptyPickerText: { padding: 16, fontSize: 13, color: '#9CA3AF', textAlign: 'center' },
  scheduleBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12,
  },
  scheduleText: { fontSize: 14, fontWeight: '500' },

  // Empty state
  emptyBox: { paddingVertical: 40, alignItems: 'center' },
  emptyText: { fontSize: 14, color: '#9CA3AF', marginTop: 10 },
});
