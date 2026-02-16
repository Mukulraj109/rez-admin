import React from 'react';
import { View, Text, TouchableOpacity, Switch, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PageConfig, SECTION_TYPES } from '../../services/api/categories';
import FormField from './FormField';
import IconInput from './IconInput';
import ChipSelector from './ChipSelector';
import { showConfirm } from '../../utils/alert';

interface SectionsManagerProps {
  pageConfig: PageConfig;
  setPageConfig: React.Dispatch<React.SetStateAction<PageConfig>>;
  colors: { text: string; icon: string; border: string; tint: string; card: string; success: string };
}

const SectionsManager = React.memo(({ pageConfig, setPageConfig, colors }: SectionsManagerProps) => {
  const addSection = () => {
    setPageConfig((prev) => ({
      ...prev,
      sections: [...prev.sections, { id: `sec-${Date.now()}`, type: 'stores-list', title: '', subtitle: '', icon: '', enabled: true, sortOrder: prev.sections.length }],
    }));
  };

  const removeSection = (index: number) => {
    const section = pageConfig.sections[index];
    showConfirm('Delete Section', `Remove "${section.title || section.type}"?`, () => {
      setPageConfig((prev) => ({ ...prev, sections: prev.sections.filter((_, i) => i !== index) }));
    }, 'Delete', 'warning');
  };

  const updateSection = (index: number, field: string, value: any) => {
    setPageConfig((prev) => ({
      ...prev,
      sections: prev.sections.map((sec, i) => (i === index ? { ...sec, [field]: value } : sec)),
    }));
  };

  return (
    <View>
      {pageConfig.sections.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="information-circle-outline" size={24} color={colors.icon} />
          <Text style={[styles.emptyText, { color: colors.icon }]}>No sections configured yet.</Text>
        </View>
      )}
      {pageConfig.sections.map((section, index) => (
        <View key={index} style={[styles.card, { borderColor: colors.border }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardIndex, { color: colors.icon }]}>#{index + 1}</Text>
            <TouchableOpacity onPress={() => removeSection(index)}>
              <Ionicons name="trash-outline" size={18} color="#EF4444" />
            </TouchableOpacity>
          </View>

          <View style={{ marginBottom: 12 }}>
            <Text style={[styles.chipLabel, { color: colors.text }]}>Section Type</Text>
            <ChipSelector
              options={SECTION_TYPES}
              selected={section.type}
              onSelect={(v) => updateSection(index, 'type', v)}
              colors={colors}
            />
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <FormField label="ID" value={section.id || ''} onChangeText={(v) => updateSection(index, 'id', v)} placeholder="sec-id" colors={colors} small />
            </View>
            <View style={{ flex: 1 }}>
              <IconInput label="Icon" value={section.icon || ''} onChange={(v) => updateSection(index, 'icon', v)} placeholder="storefront-outline" colors={colors} small />
            </View>
          </View>

          <FormField label="Title" value={section.title || ''} onChangeText={(v) => updateSection(index, 'title', v)} placeholder="Section Title" colors={colors} small />
          <FormField label="Subtitle" value={section.subtitle || ''} onChangeText={(v) => updateSection(index, 'subtitle', v)} placeholder="Optional subtitle" colors={colors} small />

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <FormField label="Sort Order" value={section.sortOrder?.toString() || '0'} onChangeText={(v) => updateSection(index, 'sortOrder', parseInt(v) || 0)} keyboardType="numeric" colors={colors} small />
            </View>
            <View style={[styles.switchRow, { flex: 1 }]}>
              <Text style={[styles.switchLabel, { color: colors.text }]}>Enabled</Text>
              <Switch
                value={section.enabled}
                onValueChange={(v) => updateSection(index, 'enabled', v)}
                trackColor={{ false: '#D1D5DB', true: `${colors.success}80` }}
                thumbColor={section.enabled ? colors.success : '#9CA3AF'}
              />
            </View>
          </View>
        </View>
      ))}

      <TouchableOpacity style={[styles.addBtn, { borderColor: colors.tint }]} onPress={addSection}>
        <Ionicons name="add-circle-outline" size={20} color={colors.tint} />
        <Text style={[styles.addText, { color: colors.tint }]}>Add Section</Text>
      </TouchableOpacity>
    </View>
  );
});

SectionsManager.displayName = 'SectionsManager';
export default SectionsManager;

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
