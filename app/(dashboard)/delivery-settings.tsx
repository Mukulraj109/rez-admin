'use client';

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  useColorScheme,
  RefreshControl,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { showAlert } from '../../utils/alert';
import { apiClient } from '../../services/api/apiClient';

// --- Types ---

interface DeliveryZone {
  id: string;
  name: string;
  baseFee: number;
  isActive: boolean;
}

interface TimeSlot {
  id: string;
  label: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

interface GlobalSettings {
  defaultDeliveryFee: number;
  freeDeliveryThreshold: number;
  estimatedDeliveryMinutes: number;
  deliveryHoursOpen: string;
  deliveryHoursClose: string;
}

type SectionKey = 'global' | 'zones' | 'timeslots';

const SECTIONS: { key: SectionKey; title: string; icon: keyof typeof Ionicons.glyphMap; color: string }[] = [
  { key: 'global', title: 'Global Delivery Settings', icon: 'settings', color: Colors.light.info },
  { key: 'zones', title: 'Delivery Zones', icon: 'map', color: Colors.light.success },
  { key: 'timeslots', title: 'Time Slots', icon: 'time', color: Colors.light.purple },
];

// --- Default data ---

const DEFAULT_GLOBAL: GlobalSettings = {
  defaultDeliveryFee: 5,
  freeDeliveryThreshold: 50,
  estimatedDeliveryMinutes: 45,
  deliveryHoursOpen: '08:00',
  deliveryHoursClose: '22:00',
};

const DEFAULT_ZONES: DeliveryZone[] = [
  { id: '1', name: 'Downtown', baseFee: 3, isActive: true },
  { id: '2', name: 'Suburbs', baseFee: 7, isActive: true },
  { id: '3', name: 'Extended Area', baseFee: 12, isActive: false },
];

const DEFAULT_TIMESLOTS: TimeSlot[] = [
  { id: '1', label: 'Morning', startTime: '08:00', endTime: '12:00', isActive: true },
  { id: '2', label: 'Afternoon', startTime: '12:00', endTime: '17:00', isActive: true },
  { id: '3', label: 'Evening', startTime: '17:00', endTime: '22:00', isActive: true },
];

let nextZoneId = 4;
let nextSlotId = 4;

export default function DeliverySettingsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [dirty, setDirty] = useState(false);

  const [collapsed, setCollapsed] = useState<Record<SectionKey, boolean>>({
    global: false,
    zones: false,
    timeslots: false,
  });

  const [globalSettings, setGlobalSettings] = useState<GlobalSettings>({ ...DEFAULT_GLOBAL });
  const [zones, setZones] = useState<DeliveryZone[]>(DEFAULT_ZONES.map(z => ({ ...z })));
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>(DEFAULT_TIMESLOTS.map(s => ({ ...s })));

  // --- Handlers ---

  const toggleSection = (key: SectionKey) => {
    setCollapsed(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      const response = await apiClient.get<any>('admin/delivery-config');
      if (response.success && response.data) {
        if (response.data.globalSettings) setGlobalSettings(response.data.globalSettings);
        if (response.data.zones) setZones(response.data.zones);
        if (response.data.timeSlots) setTimeSlots(response.data.timeSlots);
        setDirty(false);
      }
    } catch {
      // Endpoint may not exist yet, silently ignore
    } finally {
      setRefreshing(false);
    }
  }, []);

  const handleSave = async () => {
    // Validate
    if (globalSettings.defaultDeliveryFee < 0) {
      showAlert('Validation Error', 'Default delivery fee cannot be negative');
      return;
    }
    if (globalSettings.freeDeliveryThreshold < 0) {
      showAlert('Validation Error', 'Free delivery threshold cannot be negative');
      return;
    }
    if (zones.some(z => !z.name.trim())) {
      showAlert('Validation Error', 'All zones must have a name');
      return;
    }
    if (timeSlots.some(s => !s.label.trim() || !s.startTime.trim() || !s.endTime.trim())) {
      showAlert('Validation Error', 'All time slots must have a label, start time, and end time');
      return;
    }

    try {
      setSaving(true);
      const payload = { globalSettings, zones, timeSlots };
      const response = await apiClient.post('admin/delivery-config', payload);
      if (response.success) {
        showAlert('Success', 'Delivery settings saved successfully');
        setDirty(false);
      } else {
        showAlert('Error', response.message || 'Failed to save delivery settings');
      }
    } catch (err: any) {
      showAlert('Error', err.message || 'Failed to save. The backend endpoint may not be configured yet.');
    } finally {
      setSaving(false);
    }
  };

  // --- Global settings updaters ---

  const updateGlobal = (field: keyof GlobalSettings, value: string) => {
    setGlobalSettings(prev => ({
      ...prev,
      [field]: typeof prev[field] === 'number' ? (parseFloat(value) || 0) : value,
    }));
    setDirty(true);
  };

  // --- Zone updaters ---

  const addZone = () => {
    setZones(prev => [...prev, { id: String(nextZoneId++), name: '', baseFee: 5, isActive: true }]);
    setDirty(true);
  };

  const removeZone = (id: string) => {
    setZones(prev => prev.filter(z => z.id !== id));
    setDirty(true);
  };

  const updateZone = (id: string, field: keyof DeliveryZone, value: any) => {
    setZones(prev => prev.map(z => z.id === id ? { ...z, [field]: value } : z));
    setDirty(true);
  };

  // --- Time slot updaters ---

  const addTimeSlot = () => {
    setTimeSlots(prev => [...prev, { id: String(nextSlotId++), label: '', startTime: '09:00', endTime: '12:00', isActive: true }]);
    setDirty(true);
  };

  const removeTimeSlot = (id: string) => {
    setTimeSlots(prev => prev.filter(s => s.id !== id));
    setDirty(true);
  };

  const updateTimeSlot = (id: string, field: keyof TimeSlot, value: any) => {
    setTimeSlots(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
    setDirty(true);
  };

  // --- Render helpers ---

  const renderInput = (label: string, value: string | number, onChange: (val: string) => void, numeric = false, placeholder?: string) => (
    <View style={styles.fieldRow}>
      <Text style={[styles.fieldLabel, { color: colors.text }]}>{label}</Text>
      <TextInput
        style={[styles.fieldInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
        value={String(value)}
        onChangeText={onChange}
        keyboardType={numeric ? 'numeric' : 'default'}
        placeholder={placeholder}
        placeholderTextColor={colors.icon}
        selectTextOnFocus
      />
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
          <Ionicons name={isCollapsed ? 'chevron-down' : 'chevron-up'} size={18} color={colors.secondaryText} />
        </TouchableOpacity>
        {!isCollapsed && <View style={[styles.cardBody, { borderTopColor: colors.border }]}>{content}</View>}
      </View>
    );
  };

  // --- Main render ---

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <Ionicons name="bicycle" size={22} color={colors.tint} />
          <Text style={[styles.headerTitle, { color: colors.text }]}>Delivery Settings</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleRefresh} style={styles.iconBtn}>
            <Ionicons name="refresh" size={20} color={colors.tint} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveButton, !dirty && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={!dirty || saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color={colors.card} />
            ) : (
              <>
                <Ionicons name="save" size={16} color={colors.card} />
                <Text style={styles.saveButtonText}>Save</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.tint]} />}
      >
        {/* Section 1: Global Delivery Settings */}
        {renderSectionCard('global', (
          <>
            <Text style={[styles.sectionDescription, { color: colors.secondaryText }]}>
              Configure default delivery fees, thresholds, and operating hours.
            </Text>
            {renderInput('Default Delivery Fee', globalSettings.defaultDeliveryFee, v => updateGlobal('defaultDeliveryFee', v), true)}
            {renderInput('Free Delivery Threshold', globalSettings.freeDeliveryThreshold, v => updateGlobal('freeDeliveryThreshold', v), true)}
            {renderInput('Est. Delivery Time (min)', globalSettings.estimatedDeliveryMinutes, v => updateGlobal('estimatedDeliveryMinutes', v), true)}
            {renderInput('Delivery Hours Open', globalSettings.deliveryHoursOpen, v => updateGlobal('deliveryHoursOpen', v), false, 'HH:MM')}
            {renderInput('Delivery Hours Close', globalSettings.deliveryHoursClose, v => updateGlobal('deliveryHoursClose', v), false, 'HH:MM')}
          </>
        ))}

        {/* Section 2: Delivery Zones */}
        {renderSectionCard('zones', (
          <>
            <Text style={[styles.sectionDescription, { color: colors.secondaryText }]}>
              Define delivery zones with custom base fees and toggle their availability.
            </Text>
            {zones.length === 0 && (
              <Text style={[styles.emptyText, { color: colors.secondaryText }]}>No delivery zones configured.</Text>
            )}
            {zones.map((zone) => (
              <View key={zone.id} style={[styles.listRow, { borderColor: colors.border }]}>
                <View style={styles.listRowMain}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.listItemLabel, { color: colors.secondaryText }]}>Zone Name</Text>
                    <TextInput
                      style={[styles.listInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                      value={zone.name}
                      onChangeText={v => updateZone(zone.id, 'name', v)}
                      placeholder="Zone name"
                      placeholderTextColor={colors.icon}
                    />
                  </View>
                  <View style={{ width: 90 }}>
                    <Text style={[styles.listItemLabel, { color: colors.secondaryText }]}>Base Fee</Text>
                    <TextInput
                      style={[styles.listInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text, textAlign: 'right' }]}
                      value={String(zone.baseFee)}
                      onChangeText={v => updateZone(zone.id, 'baseFee', parseFloat(v) || 0)}
                      keyboardType="numeric"
                      selectTextOnFocus
                    />
                  </View>
                </View>
                <View style={styles.listRowActions}>
                  <View style={styles.switchRow}>
                    <Text style={[styles.switchLabel, { color: zone.isActive ? colors.success : colors.secondaryText }]}>
                      {zone.isActive ? 'Active' : 'Inactive'}
                    </Text>
                    <Switch
                      value={zone.isActive}
                      onValueChange={v => updateZone(zone.id, 'isActive', v)}
                      trackColor={{ false: colors.border, true: `${colors.success}60` }}
                      thumbColor={zone.isActive ? colors.success : '#f4f3f4'}
                    />
                  </View>
                  <TouchableOpacity style={styles.removeBtn} onPress={() => removeZone(zone.id)}>
                    <Ionicons name="trash-outline" size={18} color={colors.error} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
            <TouchableOpacity style={[styles.addBtn, { borderColor: colors.border }]} onPress={addZone}>
              <Ionicons name="add-circle-outline" size={16} color={colors.tint} />
              <Text style={[styles.addBtnText, { color: colors.tint }]}>Add Zone</Text>
            </TouchableOpacity>
          </>
        ))}

        {/* Section 3: Time Slots */}
        {renderSectionCard('timeslots', (
          <>
            <Text style={[styles.sectionDescription, { color: colors.secondaryText }]}>
              Configure available delivery time slots for customers to choose from.
            </Text>
            {timeSlots.length === 0 && (
              <Text style={[styles.emptyText, { color: colors.secondaryText }]}>No time slots configured.</Text>
            )}
            {timeSlots.map((slot) => (
              <View key={slot.id} style={[styles.listRow, { borderColor: colors.border }]}>
                <View style={styles.listRowMain}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.listItemLabel, { color: colors.secondaryText }]}>Label</Text>
                    <TextInput
                      style={[styles.listInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                      value={slot.label}
                      onChangeText={v => updateTimeSlot(slot.id, 'label', v)}
                      placeholder="e.g. Morning"
                      placeholderTextColor={colors.icon}
                    />
                  </View>
                  <View style={{ width: 80 }}>
                    <Text style={[styles.listItemLabel, { color: colors.secondaryText }]}>Start</Text>
                    <TextInput
                      style={[styles.listInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text, textAlign: 'center' }]}
                      value={slot.startTime}
                      onChangeText={v => updateTimeSlot(slot.id, 'startTime', v)}
                      placeholder="HH:MM"
                      placeholderTextColor={colors.icon}
                    />
                  </View>
                  <View style={{ width: 80 }}>
                    <Text style={[styles.listItemLabel, { color: colors.secondaryText }]}>End</Text>
                    <TextInput
                      style={[styles.listInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text, textAlign: 'center' }]}
                      value={slot.endTime}
                      onChangeText={v => updateTimeSlot(slot.id, 'endTime', v)}
                      placeholder="HH:MM"
                      placeholderTextColor={colors.icon}
                    />
                  </View>
                </View>
                <View style={styles.listRowActions}>
                  <View style={styles.switchRow}>
                    <Text style={[styles.switchLabel, { color: slot.isActive ? colors.success : colors.secondaryText }]}>
                      {slot.isActive ? 'Active' : 'Inactive'}
                    </Text>
                    <Switch
                      value={slot.isActive}
                      onValueChange={v => updateTimeSlot(slot.id, 'isActive', v)}
                      trackColor={{ false: colors.border, true: `${colors.success}60` }}
                      thumbColor={slot.isActive ? colors.success : '#f4f3f4'}
                    />
                  </View>
                  <TouchableOpacity style={styles.removeBtn} onPress={() => removeTimeSlot(slot.id)}>
                    <Ionicons name="trash-outline" size={18} color={colors.error} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
            <TouchableOpacity style={[styles.addBtn, { borderColor: colors.border }]} onPress={addTimeSlot}>
              <Ionicons name="add-circle-outline" size={16} color={colors.tint} />
              <Text style={[styles.addBtnText, { color: colors.tint }]}>Add Time Slot</Text>
            </TouchableOpacity>
          </>
        ))}

        {/* Bottom Save */}
        <TouchableOpacity
          style={[styles.bottomSave, !dirty && { backgroundColor: colors.muted }]}
          onPress={handleSave}
          disabled={!dirty || saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.card} />
          ) : (
            <Text style={styles.bottomSaveText}>{dirty ? 'Save All Changes' : 'No Changes'}</Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: { padding: 8 },
  saveButton: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: Colors.light.navy,
  },
  saveButtonDisabled: { backgroundColor: Colors.light.muted },
  saveButtonText: { fontWeight: '600', color: Colors.light.card, fontSize: 14 },
  scrollContent: { padding: 16, paddingBottom: 60 },
  card: { borderRadius: 12, marginBottom: 12, borderWidth: 1, overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 8 },
  cardTitle: { flex: 1, fontSize: 16, fontWeight: '700' },
  cardBody: { paddingHorizontal: 16, paddingBottom: 16, borderTopWidth: 1 },
  sectionDescription: { fontSize: 13, marginTop: 8, marginBottom: 12, lineHeight: 18 },
  fieldRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  fieldLabel: { fontSize: 13, fontWeight: '600', flex: 1 },
  fieldInput: { borderRadius: 8, padding: 10, borderWidth: 1, minWidth: 130, textAlign: 'right', fontSize: 14 },
  listRow: { borderBottomWidth: 1, paddingBottom: 12, marginTop: 12 },
  listRowMain: { flexDirection: 'row', gap: 8, alignItems: 'flex-end' },
  listRowActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  listItemLabel: { fontSize: 11, fontWeight: '600', marginBottom: 4 },
  listInput: { fontSize: 14, borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 6 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  switchLabel: { fontSize: 12, fontWeight: '600' },
  removeBtn: { padding: 8 },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10, borderWidth: 1, borderStyle: 'dashed', borderRadius: 8, marginTop: 12,
  },
  addBtnText: { fontSize: 13, fontWeight: '600' },
  emptyText: { fontSize: 13, textAlign: 'center', paddingVertical: 16, fontStyle: 'italic' },
  bottomSave: { backgroundColor: Colors.light.navy, borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 8 },
  bottomSaveText: { color: Colors.light.card, fontSize: 16, fontWeight: '700' },
});
