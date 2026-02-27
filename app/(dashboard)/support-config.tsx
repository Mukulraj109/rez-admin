import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Switch, ActivityIndicator, RefreshControl, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { showAlert } from '../../utils/alert';
import supportConfigService, {
  SupportConfig,
  SupportConfigData,
  DaySchedule,
  SupportPhoneNumber,
  SupportCategoryConfig,
  Holiday,
} from '../../services/api/supportConfig';

type SectionKey = 'hours' | 'phones' | 'callback' | 'categories' | 'queue';

const SECTIONS: { key: SectionKey; title: string; icon: keyof typeof Ionicons.glyphMap; color: string }[] = [
  { key: 'hours', title: 'Support Hours', icon: 'time', color: '#3B82F6' },
  { key: 'phones', title: 'Phone Numbers', icon: 'call', color: '#10B981' },
  { key: 'callback', title: 'Callback Settings', icon: 'arrow-undo', color: '#8B5CF6' },
  { key: 'categories', title: 'Categories', icon: 'grid', color: '#F59E0B' },
  { key: 'queue', title: 'Queue Settings', icon: 'warning', color: '#EF4444' },
];

const TIMEZONES = ['Asia/Dubai', 'Asia/Kolkata', 'UTC', 'America/New_York', 'Europe/London'];
const PRIORITIES: Array<'low' | 'medium' | 'high' | 'urgent'> = ['low', 'medium', 'high', 'urgent'];
const SEVERITY_OPTIONS: Array<'normal' | 'busy' | 'critical'> = ['normal', 'busy', 'critical'];

export default function SupportConfigScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Record<SectionKey, boolean>>({
    hours: false, phones: true, callback: true, categories: true, queue: true,
  });
  const [config, setConfig] = useState<SupportConfigData | null>(null);

  const loadConfig = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const data = await supportConfigService.getConfig();
      setConfig(data);
      setDirty(false);
    } catch (err: any) {
      setError(err.message || 'Failed to load config');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadConfig(); }, [loadConfig]);

  const handleSave = async () => {
    if (!config) return;
    try {
      setSaving(true);
      await supportConfigService.updateConfig(config);
      showAlert('Success', 'Support configuration saved successfully');
      setDirty(false);
    } catch (err: any) {
      showAlert('Error', err.message || 'Failed to save config');
    } finally {
      setSaving(false);
    }
  };

  const toggleSection = (key: SectionKey) => {
    setCollapsed(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const markDirty = () => setDirty(true);

  const updateConfig = (updater: (prev: SupportConfigData) => SupportConfigData) => {
    setConfig(prev => {
      if (!prev) return prev;
      return updater(JSON.parse(JSON.stringify(prev)));
    });
    markDirty();
  };

  // --- Render helpers ---

  const renderTextInput = (label: string, value: string, onChange: (v: string) => void, opts?: { keyboardType?: 'numeric' | 'default'; placeholder?: string }) => (
    <View style={styles.fieldRow}>
      <Text style={[styles.fieldLabel, { color: colors.text }]}>{label}</Text>
      <TextInput
        style={[styles.fieldInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
        value={value}
        onChangeText={onChange}
        keyboardType={opts?.keyboardType || 'default'}
        placeholder={opts?.placeholder}
        placeholderTextColor={colors.icon}
        selectTextOnFocus
      />
    </View>
  );

  const renderNumInput = (label: string, value: number, onChange: (v: number) => void, suffix?: string) => (
    <View style={styles.fieldRow}>
      <Text style={[styles.fieldLabel, { color: colors.text }]}>{label}{suffix ? ` (${suffix})` : ''}</Text>
      <TextInput
        style={[styles.fieldInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
        value={String(value)}
        onChangeText={t => onChange(parseFloat(t) || 0)}
        keyboardType="numeric"
        selectTextOnFocus
      />
    </View>
  );

  const renderSwitchRow = (label: string, value: boolean, onChange: (v: boolean) => void) => (
    <View style={styles.switchRow}>
      <Text style={[styles.fieldLabel, { color: colors.text, flex: 1 }]}>{label}</Text>
      <Switch value={value} onValueChange={onChange} />
    </View>
  );

  const renderSectionCard = (sectionKey: SectionKey, content: React.ReactNode) => {
    const sec = SECTIONS.find(s => s.key === sectionKey)!;
    const isCollapsed = collapsed[sectionKey];
    return (
      <View key={sectionKey} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TouchableOpacity style={styles.cardHeader} onPress={() => toggleSection(sectionKey)} activeOpacity={0.7}>
          <Ionicons name={sec.icon} size={18} color={sec.color} />
          <Text style={[styles.cardTitle, { color: colors.text }]}>{sec.title}</Text>
          <Ionicons name={isCollapsed ? 'chevron-down' : 'chevron-up'} size={18} color={colors.text} />
        </TouchableOpacity>
        {!isCollapsed && <View style={[styles.cardBody, { borderTopColor: colors.border }]}>{content}</View>}
      </View>
    );
  };

  // --- Loading / Error ---

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
        <Text style={[styles.loadingText, { color: colors.text }]}>Loading support config...</Text>
      </View>
    );
  }

  if (error || !config) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <Ionicons name="alert-circle" size={48} color="#EF4444" />
        <Text style={[styles.errorText, { color: colors.text }]}>{error || 'Unknown error'}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => loadConfig()}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // --- Section content ---

  const renderHoursSection = () => (
    <View>
      {/* Timezone */}
      <Text style={[styles.subLabel, { color: colors.icon }]}>Timezone</Text>
      <View style={styles.chipRow}>
        {TIMEZONES.map(tz => (
          <TouchableOpacity
            key={tz}
            style={[
              styles.chip,
              { borderColor: colors.border },
              config.supportHours.timezone === tz && { backgroundColor: '#3B82F6', borderColor: '#3B82F6' },
            ]}
            onPress={() => updateConfig(c => { c.supportHours.timezone = tz; return c; })}
          >
            <Text style={[styles.chipText, config.supportHours.timezone === tz && { color: '#fff' }, { color: config.supportHours.timezone === tz ? '#fff' : colors.text }]}>
              {tz.split('/').pop()?.replace('_', ' ')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Day Schedule */}
      <Text style={[styles.subLabel, { color: colors.icon, marginTop: 12 }]}>Daily Schedule</Text>
      {config.supportHours.schedule.map((day, idx) => (
        <View key={day.dayOfWeek} style={[styles.dayRow, { borderBottomColor: colors.border }]}>
          <View style={styles.dayInfo}>
            <Switch
              value={day.isOpen}
              onValueChange={(v) => updateConfig(c => { c.supportHours.schedule[idx].isOpen = v; return c; })}
            />
            <Text style={[styles.dayName, { color: colors.text }]}>{day.dayName}</Text>
          </View>
          {day.isOpen && (
            <View style={styles.timeRow}>
              <TextInput
                style={[styles.timeInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                value={day.openTime}
                onChangeText={(v) => updateConfig(c => { c.supportHours.schedule[idx].openTime = v; return c; })}
                placeholder="09:00"
                placeholderTextColor={colors.icon}
              />
              <Text style={{ color: colors.icon }}>to</Text>
              <TextInput
                style={[styles.timeInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                value={day.closeTime}
                onChangeText={(v) => updateConfig(c => { c.supportHours.schedule[idx].closeTime = v; return c; })}
                placeholder="21:00"
                placeholderTextColor={colors.icon}
              />
            </View>
          )}
        </View>
      ))}

      {/* Holidays */}
      <Text style={[styles.subLabel, { color: colors.icon, marginTop: 12 }]}>Holidays</Text>
      {config.supportHours.holidays.map((holiday, idx) => (
        <View key={idx} style={styles.listItemRow}>
          <TextInput
            style={[styles.smallInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
            value={holiday.date}
            onChangeText={(v) => updateConfig(c => { c.supportHours.holidays[idx].date = v; return c; })}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.icon}
          />
          <TextInput
            style={[styles.smallInput, { flex: 1, backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
            value={holiday.name}
            onChangeText={(v) => updateConfig(c => { c.supportHours.holidays[idx].name = v; return c; })}
            placeholder="Holiday name"
            placeholderTextColor={colors.icon}
          />
          <TouchableOpacity onPress={() => updateConfig(c => { c.supportHours.holidays.splice(idx, 1); return c; })}>
            <Ionicons name="trash-outline" size={20} color="#EF4444" />
          </TouchableOpacity>
        </View>
      ))}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => updateConfig(c => { c.supportHours.holidays.push({ date: '', name: '' }); return c; })}
      >
        <Ionicons name="add-circle-outline" size={18} color="#3B82F6" />
        <Text style={styles.addButtonText}>Add Holiday</Text>
      </TouchableOpacity>
    </View>
  );

  const renderPhonesSection = () => (
    <View>
      {config.phoneNumbers.map((phone, idx) => (
        <View key={idx} style={[styles.itemCard, { borderColor: colors.border }]}>
          <View style={styles.itemHeader}>
            <Text style={[styles.itemTitle, { color: colors.text }]}>Phone #{idx + 1}</Text>
            <TouchableOpacity onPress={() => updateConfig(c => { c.phoneNumbers.splice(idx, 1); return c; })}>
              <Ionicons name="trash-outline" size={18} color="#EF4444" />
            </TouchableOpacity>
          </View>
          {renderTextInput('Region', phone.region, (v) => updateConfig(c => { c.phoneNumbers[idx].region = v; return c; }))}
          {renderTextInput('Number', phone.number, (v) => updateConfig(c => { c.phoneNumbers[idx].number = v; return c; }), { placeholder: '+97145551234' })}
          {renderTextInput('Display Number', phone.displayNumber, (v) => updateConfig(c => { c.phoneNumbers[idx].displayNumber = v; return c; }), { placeholder: '+971 4 555 1234' })}
          {renderTextInput('Label', phone.label, (v) => updateConfig(c => { c.phoneNumbers[idx].label = v; return c; }))}
          {renderNumInput('Sort Order', phone.sortOrder, (v) => updateConfig(c => { c.phoneNumbers[idx].sortOrder = v; return c; }))}
          {renderSwitchRow('Active', phone.isActive, (v) => updateConfig(c => { c.phoneNumbers[idx].isActive = v; return c; }))}
        </View>
      ))}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => updateConfig(c => {
          c.phoneNumbers.push({ region: 'AE', number: '', displayNumber: '', label: 'Support', isActive: true, sortOrder: c.phoneNumbers.length });
          return c;
        })}
      >
        <Ionicons name="add-circle-outline" size={18} color="#3B82F6" />
        <Text style={styles.addButtonText}>Add Phone Number</Text>
      </TouchableOpacity>
    </View>
  );

  const renderCallbackSection = () => (
    <View>
      {renderSwitchRow('Callbacks Enabled', config.callbackSettings.enabled, (v) => updateConfig(c => { c.callbackSettings.enabled = v; return c; }))}
      {renderNumInput('Max Per User / Day', config.callbackSettings.maxPerUserPerDay, (v) => updateConfig(c => { c.callbackSettings.maxPerUserPerDay = v; return c; }))}
      {renderNumInput('Estimated Wait', config.callbackSettings.estimatedWaitMinutes, (v) => updateConfig(c => { c.callbackSettings.estimatedWaitMinutes = v; return c; }), 'minutes')}
    </View>
  );

  const renderCategoriesSection = () => (
    <View>
      {config.categories.map((cat, idx) => (
        <View key={idx} style={[styles.itemCard, { borderColor: colors.border }]}>
          <View style={styles.itemHeader}>
            <Text style={[styles.itemTitle, { color: colors.text }]}>{cat.name || `Category #${idx + 1}`}</Text>
            <TouchableOpacity onPress={() => updateConfig(c => { c.categories.splice(idx, 1); return c; })}>
              <Ionicons name="trash-outline" size={18} color="#EF4444" />
            </TouchableOpacity>
          </View>
          {renderTextInput('ID', cat.id, (v) => updateConfig(c => { c.categories[idx].id = v; return c; }))}
          {renderTextInput('Name', cat.name, (v) => updateConfig(c => { c.categories[idx].name = v; return c; }))}
          {renderTextInput('Icon', cat.icon, (v) => updateConfig(c => { c.categories[idx].icon = v; return c; }), { placeholder: 'cube-outline' })}
          {renderNumInput('SLA', cat.slaMinutes, (v) => updateConfig(c => { c.categories[idx].slaMinutes = v; return c; }), 'minutes')}
          {renderNumInput('Sort Order', cat.sortOrder, (v) => updateConfig(c => { c.categories[idx].sortOrder = v; return c; }))}

          {/* Priority picker */}
          <Text style={[styles.subLabel, { color: colors.icon }]}>Priority</Text>
          <View style={styles.chipRow}>
            {PRIORITIES.map(p => (
              <TouchableOpacity
                key={p}
                style={[
                  styles.chip,
                  { borderColor: colors.border },
                  cat.priority === p && { backgroundColor: '#8B5CF6', borderColor: '#8B5CF6' },
                ]}
                onPress={() => updateConfig(c => { c.categories[idx].priority = p; return c; })}
              >
                <Text style={[styles.chipText, { color: cat.priority === p ? '#fff' : colors.text }]}>{p}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {renderSwitchRow('Active', cat.isActive, (v) => updateConfig(c => { c.categories[idx].isActive = v; return c; }))}
        </View>
      ))}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => updateConfig(c => {
          c.categories.push({
            id: `cat-${Date.now()}`,
            name: '',
            icon: 'help-circle-outline',
            priority: 'medium',
            slaMinutes: 60,
            isActive: true,
            sortOrder: c.categories.length,
          });
          return c;
        })}
      >
        <Ionicons name="add-circle-outline" size={18} color="#3B82F6" />
        <Text style={styles.addButtonText}>Add Category</Text>
      </TouchableOpacity>
    </View>
  );

  const renderQueueSection = () => (
    <View>
      {renderSwitchRow('Manual Override', config.queueStatus.override, (v) => updateConfig(c => { c.queueStatus.override = v; return c; }))}
      {config.queueStatus.override && renderTextInput('Override Message', config.queueStatus.message, (v) => updateConfig(c => { c.queueStatus.message = v; return c; }))}

      <Text style={[styles.subLabel, { color: colors.icon, marginTop: 8 }]}>Severity</Text>
      <View style={styles.chipRow}>
        {SEVERITY_OPTIONS.map(s => (
          <TouchableOpacity
            key={s}
            style={[
              styles.chip,
              { borderColor: colors.border },
              config.queueStatus.severity === s && {
                backgroundColor: s === 'normal' ? '#10B981' : s === 'busy' ? '#F59E0B' : '#EF4444',
                borderColor: s === 'normal' ? '#10B981' : s === 'busy' ? '#F59E0B' : '#EF4444',
              },
            ]}
            onPress={() => updateConfig(c => { c.queueStatus.severity = s; return c; })}
          >
            <Text style={[styles.chipText, { color: config.queueStatus.severity === s ? '#fff' : colors.text }]}>{s}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Support Config</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => loadConfig(true)}>
            <Ionicons name="refresh" size={20} color={colors.tint} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveButton, !dirty && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={!dirty || saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="save" size={16} color="#fff" />
                <Text style={styles.saveButtonText}>Save</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {dirty && (
        <View style={styles.dirtyBanner}>
          <Ionicons name="alert-circle" size={16} color="#F59E0B" />
          <Text style={styles.dirtyText}>You have unsaved changes</Text>
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadConfig(true)} />}
      >
        {renderSectionCard('hours', renderHoursSection())}
        {renderSectionCard('phones', renderPhonesSection())}
        {renderSectionCard('callback', renderCallbackSection())}
        {renderSectionCard('categories', renderCategoriesSection())}
        {renderSectionCard('queue', renderQueueSection())}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 24 },
  loadingText: { fontSize: 14, marginTop: 8 },
  errorText: { fontSize: 14, textAlign: 'center', marginTop: 8 },
  retryButton: { backgroundColor: '#3B82F6', borderRadius: 8, paddingHorizontal: 20, paddingVertical: 10, marginTop: 12 },
  retryButtonText: { color: '#fff', fontWeight: '600' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerBtn: { padding: 8 },
  saveButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#3B82F6', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8, gap: 4 },
  saveButtonDisabled: { opacity: 0.5 },
  saveButtonText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  dirtyBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF3C7', paddingHorizontal: 16, paddingVertical: 8, gap: 6 },
  dirtyText: { color: '#92400E', fontSize: 12, fontWeight: '500' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 100, gap: 12 },
  card: { borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, gap: 8 },
  cardTitle: { flex: 1, fontSize: 15, fontWeight: '600' },
  cardBody: { paddingHorizontal: 14, paddingVertical: 12, borderTopWidth: 1 },
  fieldRow: { marginBottom: 10 },
  fieldLabel: { fontSize: 12, fontWeight: '500', marginBottom: 4 },
  fieldInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14 },
  switchRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  subLabel: { fontSize: 12, fontWeight: '600', marginBottom: 6, textTransform: 'uppercase' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  chip: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  chipText: { fontSize: 12, fontWeight: '500' },
  dayRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 0.5 },
  dayInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dayName: { fontSize: 13, fontWeight: '500', width: 80 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  timeInput: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, fontSize: 13, width: 60, textAlign: 'center' },
  listItemRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  smallInput: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 6, fontSize: 13, width: 110 },
  addButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 8 },
  addButtonText: { color: '#3B82F6', fontSize: 13, fontWeight: '500' },
  itemCard: { borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 10 },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  itemTitle: { fontSize: 14, fontWeight: '600' },
});
