import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PageConfig } from '../../services/api/categories';
import FormField from './FormField';
import ColorInput from './ColorInput';
import { Colors } from '../../constants/Colors';
import { showConfirm } from '../../utils/alert';

interface DietaryOptionsManagerProps {
  pageConfig: PageConfig;
  setPageConfig: React.Dispatch<React.SetStateAction<PageConfig>>;
  colors: typeof Colors.light;
}

const DietaryOptionsManager = React.memo(({ pageConfig, setPageConfig, colors }: DietaryOptionsManagerProps) => {
  const options = pageConfig.dietaryOptions || [];

  const addOption = () => {
    setPageConfig((prev) => ({
      ...prev,
      dietaryOptions: [...(prev.dietaryOptions || []), {
        id: `diet-${Date.now()}`, label: '', icon: '', color: Colors.light.green, tags: [],
      }],
    }));
  };

  const removeOption = (index: number) => {
    const item = options[index];
    showConfirm('Delete Option', `Remove "${item.label || 'this option'}"?`, () => {
      setPageConfig((prev) => ({
        ...prev,
        dietaryOptions: (prev.dietaryOptions || []).filter((_, i) => i !== index),
      }));
    }, 'Delete', 'warning');
  };

  const updateOption = (index: number, field: string, value: any) => {
    setPageConfig((prev) => ({
      ...prev,
      dietaryOptions: (prev.dietaryOptions || []).map((opt, i) => (i === index ? { ...opt, [field]: value } : opt)),
    }));
  };

  return (
    <View>
      {options.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="information-circle-outline" size={24} color={colors.icon} />
          <Text style={[styles.emptyText, { color: colors.icon }]}>No dietary options configured yet.</Text>
        </View>
      )}

      {options.map((opt, index) => (
        <View key={opt.id || index} style={[styles.card, { borderColor: colors.border }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardIndex, { color: colors.icon }]}>#{index + 1}</Text>
            <TouchableOpacity onPress={() => removeOption(index)}>
              <Ionicons name="trash-outline" size={18} color={Colors.light.error} />
            </TouchableOpacity>
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <FormField label="ID" value={opt.id} onChangeText={(v) => updateOption(index, 'id', v)} placeholder="diet-halal" colors={colors} small />
            </View>
            <View style={{ flex: 1 }}>
              <FormField label="Label" value={opt.label} onChangeText={(v) => updateOption(index, 'label', v)} placeholder="Halal" colors={colors} small />
            </View>
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <FormField label="Icon (emoji)" value={opt.icon} onChangeText={(v) => updateOption(index, 'icon', v)} placeholder="🥩" colors={colors} small />
            </View>
            <View style={{ flex: 1 }}>
              <ColorInput label="Color" value={opt.color} onChange={(v) => updateOption(index, 'color', v)} placeholder="#22C55E" colors={colors} small />
            </View>
          </View>

          <FormField
            label="Tags (comma-separated)"
            value={(opt.tags || []).join(', ')}
            onChangeText={(v) => updateOption(index, 'tags', v.split(',').map(t => t.trim()).filter(Boolean))}
            placeholder="halal, zabiha"
            colors={colors}
            small
          />
        </View>
      ))}

      <TouchableOpacity style={[styles.addBtn, { borderColor: colors.tint }]} onPress={addOption}>
        <Ionicons name="add-circle-outline" size={20} color={colors.tint} />
        <Text style={[styles.addText, { color: colors.tint }]}>Add Dietary Option</Text>
      </TouchableOpacity>
    </View>
  );
});

DietaryOptionsManager.displayName = 'DietaryOptionsManager';
export default DietaryOptionsManager;

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 10 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  cardIndex: { fontSize: 13, fontWeight: '700' },
  row: { flexDirection: 'row', gap: 10 },
  emptyState: { alignItems: 'center', paddingVertical: 20, gap: 8 },
  emptyText: { fontSize: 13, fontWeight: '500' },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 10, borderWidth: 1.5, borderStyle: 'dashed', gap: 6, marginTop: 4 },
  addText: { fontSize: 14, fontWeight: '600' },
});
