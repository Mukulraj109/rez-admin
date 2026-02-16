import React from 'react';
import { View, Text, TouchableOpacity, Switch, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PageConfig, FILTER_FIELD_OPTIONS } from '../../services/api/categories';
import FormField from './FormField';
import IconInput from './IconInput';
import ChipSelector from './ChipSelector';
import ColorInput from './ColorInput';
import { showConfirm } from '../../utils/alert';

interface ServiceTypesManagerProps {
  pageConfig: PageConfig;
  setPageConfig: React.Dispatch<React.SetStateAction<PageConfig>>;
  colors: { text: string; icon: string; border: string; tint: string; card: string; success: string };
}

const ServiceTypesManager = React.memo(({ pageConfig, setPageConfig, colors }: ServiceTypesManagerProps) => {
  const addServiceType = () => {
    setPageConfig((prev) => ({
      ...prev,
      serviceTypes: [...prev.serviceTypes, {
        id: `st-${Date.now()}`, label: 'New Service', icon: 'bicycle-outline',
        description: '', filterField: 'homeDelivery', color: '#3B82F6', gradient: ['#3B82F6', '#60A5FA'],
        enabled: true, sortOrder: prev.serviceTypes.length,
      }],
    }));
  };

  const removeServiceType = (index: number) => {
    const st = pageConfig.serviceTypes[index];
    showConfirm('Delete Service Type', `Remove "${st.label}"?`, () => {
      setPageConfig((prev) => ({ ...prev, serviceTypes: prev.serviceTypes.filter((_, i) => i !== index) }));
    }, 'Delete', 'warning');
  };

  const updateST = (index: number, field: string, value: any) => {
    setPageConfig((prev) => ({
      ...prev,
      serviceTypes: prev.serviceTypes.map((st, i) => (i === index ? { ...st, [field]: value } : st)),
    }));
  };

  return (
    <View>
      {pageConfig.serviceTypes.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="information-circle-outline" size={24} color={colors.icon} />
          <Text style={[styles.emptyText, { color: colors.icon }]}>No service types configured yet.</Text>
        </View>
      )}
      {pageConfig.serviceTypes.map((st, index) => (
        <View key={st.id || index} style={[styles.card, { borderColor: colors.border }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardIndex, { color: colors.icon }]}>#{index + 1}</Text>
            <TouchableOpacity onPress={() => removeServiceType(index)}>
              <Ionicons name="trash-outline" size={18} color="#EF4444" />
            </TouchableOpacity>
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <FormField label="ID" value={st.id} onChangeText={(v) => updateST(index, 'id', v)} placeholder="st-id" colors={colors} small />
            </View>
            <View style={{ flex: 1 }}>
              <FormField label="Label" value={st.label} onChangeText={(v) => updateST(index, 'label', v)} placeholder="Service Label" colors={colors} small />
            </View>
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <IconInput label="Icon" value={st.icon} onChange={(v) => updateST(index, 'icon', v)} placeholder="bicycle-outline" colors={colors} small />
            </View>
            <View style={{ flex: 1 }}>
              <FormField label="Sort Order" value={st.sortOrder?.toString() || '0'} onChangeText={(v) => updateST(index, 'sortOrder', parseInt(v) || 0)} keyboardType="numeric" colors={colors} small />
            </View>
          </View>

          <FormField label="Description" value={st.description} onChangeText={(v) => updateST(index, 'description', v)} placeholder="Service description" colors={colors} small />

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <ColorInput label="Color" value={st.color || '#3B82F6'} onChange={(v) => updateST(index, 'color', v)} placeholder="#3B82F6" colors={colors} small />
            </View>
            <View style={{ flex: 1 }}>
              <ColorInput label="Gradient Start" value={st.gradient?.[0] || ''} onChange={(v) => {
                const g = [...(st.gradient || ['', ''])];
                g[0] = v;
                updateST(index, 'gradient', g);
              }} placeholder="#3B82F6" colors={colors} small />
            </View>
          </View>
          <ColorInput label="Gradient End" value={st.gradient?.[1] || ''} onChange={(v) => {
            const g = [...(st.gradient || ['', ''])];
            g[1] = v;
            updateST(index, 'gradient', g);
          }} placeholder="#60A5FA" colors={colors} small />

          <View style={{ marginBottom: 12 }}>
            <Text style={[styles.chipLabel, { color: colors.text }]}>Filter Field</Text>
            <ChipSelector
              options={FILTER_FIELD_OPTIONS}
              selected={st.filterField}
              onSelect={(v) => updateST(index, 'filterField', v)}
              colors={colors}
            />
          </View>

          <View style={styles.switchRow}>
            <Text style={[styles.switchLabel, { color: colors.text }]}>Enabled</Text>
            <Switch
              value={st.enabled}
              onValueChange={(v) => updateST(index, 'enabled', v)}
              trackColor={{ false: '#D1D5DB', true: `${colors.success}80` }}
              thumbColor={st.enabled ? colors.success : '#9CA3AF'}
            />
          </View>
        </View>
      ))}

      <TouchableOpacity style={[styles.addBtn, { borderColor: colors.tint }]} onPress={addServiceType}>
        <Ionicons name="add-circle-outline" size={20} color={colors.tint} />
        <Text style={[styles.addText, { color: colors.tint }]}>Add Service Type</Text>
      </TouchableOpacity>
    </View>
  );
});

ServiceTypesManager.displayName = 'ServiceTypesManager';
export default ServiceTypesManager;

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 10 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  cardIndex: { fontSize: 13, fontWeight: '700' },
  chipLabel: { fontSize: 13, fontWeight: '600', marginBottom: 4 },
  row: { flexDirection: 'row', gap: 10 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
  switchLabel: { fontSize: 13, fontWeight: '600' },
  emptyState: { alignItems: 'center', paddingVertical: 20, gap: 8 },
  emptyText: { fontSize: 13, fontWeight: '500' },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 10, borderWidth: 1.5, borderStyle: 'dashed', gap: 6, marginTop: 4 },
  addText: { fontSize: 14, fontWeight: '600' },
});
