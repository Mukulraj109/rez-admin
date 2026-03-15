import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PageConfig } from '../../services/api/categories';
import FormField from './FormField';
import IconInput from './IconInput';
import { Colors } from '../../constants/Colors';
import ColorInput from './ColorInput';
import { showConfirm } from '../../utils/alert';

interface ValuePropManagerProps {
  pageConfig: PageConfig;
  setPageConfig: React.Dispatch<React.SetStateAction<PageConfig>>;
  colors: typeof Colors.light;
}

const ValuePropManager = React.memo(({ pageConfig, setPageConfig, colors }: ValuePropManagerProps) => {
  const items = pageConfig.valuePropItems || [];

  const addItem = () => {
    setPageConfig((prev) => ({
      ...prev,
      valuePropItems: [...(prev.valuePropItems || []), {
        icon: 'gift-outline', text: '', color: '#34D399',
      }],
    }));
  };

  const removeItem = (index: number) => {
    const item = items[index];
    showConfirm('Delete Item', `Remove "${item.text || 'this item'}"?`, () => {
      setPageConfig((prev) => ({
        ...prev,
        valuePropItems: (prev.valuePropItems || []).filter((_, i) => i !== index),
      }));
    }, 'Delete', 'warning');
  };

  const updateItem = (index: number, field: string, value: any) => {
    setPageConfig((prev) => ({
      ...prev,
      valuePropItems: (prev.valuePropItems || []).map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    }));
  };

  return (
    <View>
      {items.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="information-circle-outline" size={24} color={colors.icon} />
          <Text style={[styles.emptyText, { color: colors.icon }]}>No value props configured. Defaults will be used.</Text>
        </View>
      )}

      {items.map((item, index) => (
        <View key={index} style={[styles.card, { borderColor: colors.border }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardIndex, { color: colors.icon }]}>#{index + 1}</Text>
            <TouchableOpacity onPress={() => removeItem(index)}>
              <Ionicons name="trash-outline" size={18} color={Colors.light.error} />
            </TouchableOpacity>
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <IconInput label="Icon" value={item.icon} onChange={(v) => updateItem(index, 'icon', v)} placeholder="cash-outline" colors={colors} small />
            </View>
            <View style={{ flex: 1 }}>
              <ColorInput label="Color" value={item.color} onChange={(v) => updateItem(index, 'color', v)} placeholder="#34D399" colors={colors} small />
            </View>
          </View>

          <FormField label="Text" value={item.text} onChangeText={(v) => updateItem(index, 'text', v)} placeholder="Cashback on every order" colors={colors} small />
        </View>
      ))}

      <TouchableOpacity style={[styles.addBtn, { borderColor: colors.tint }]} onPress={addItem}>
        <Ionicons name="add-circle-outline" size={20} color={colors.tint} />
        <Text style={[styles.addText, { color: colors.tint }]}>Add Value Prop</Text>
      </TouchableOpacity>
    </View>
  );
});

ValuePropManager.displayName = 'ValuePropManager';
export default ValuePropManager;

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
