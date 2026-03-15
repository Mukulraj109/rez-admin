import React from 'react';
import { View, Text, TouchableOpacity, Switch, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PageConfig } from '../../services/api/categories';
import FormField from './FormField';
import { Colors } from '../../constants/Colors';
import IconInput from './IconInput';
import ColorInput from './ColorInput';
import { showConfirm } from '../../utils/alert';

interface QuickActionsManagerProps {
  pageConfig: PageConfig;
  setPageConfig: React.Dispatch<React.SetStateAction<PageConfig>>;
  colors: typeof Colors.light;
}

const QuickActionsManager = React.memo(({ pageConfig, setPageConfig, colors }: QuickActionsManagerProps) => {
  const addQuickAction = () => {
    setPageConfig((prev) => ({
      ...prev,
      quickActions: [...prev.quickActions, {
        id: `qa-${Date.now()}`, label: 'New Action', icon: 'flash-outline',
        route: '/explore', color: colors.info, enabled: true, sortOrder: prev.quickActions.length,
      }],
    }));
  };

  const removeQuickAction = (index: number) => {
    const qa = pageConfig.quickActions[index];
    showConfirm('Delete Action', `Remove "${qa.label}"?`, () => {
      setPageConfig((prev) => ({ ...prev, quickActions: prev.quickActions.filter((_, i) => i !== index) }));
    }, 'Delete', 'warning');
  };

  const updateQA = (index: number, field: string, value: any) => {
    setPageConfig((prev) => ({
      ...prev,
      quickActions: prev.quickActions.map((qa, i) => (i === index ? { ...qa, [field]: value } : qa)),
    }));
  };

  return (
    <View>
      {pageConfig.quickActions.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="information-circle-outline" size={24} color={colors.icon} />
          <Text style={[styles.emptyText, { color: colors.icon }]}>No quick actions configured yet.</Text>
        </View>
      )}
      {pageConfig.quickActions.map((qa, index) => (
        <View key={qa.id || index} style={[styles.card, { borderColor: colors.border }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardIndex, { color: colors.icon }]}>#{index + 1}</Text>
            <TouchableOpacity onPress={() => removeQuickAction(index)}>
              <Ionicons name="trash-outline" size={18} color={Colors.light.error} />
            </TouchableOpacity>
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <FormField label="ID" value={qa.id} onChangeText={(v) => updateQA(index, 'id', v)} placeholder="qa-id" colors={colors} small />
            </View>
            <View style={{ flex: 1 }}>
              <FormField label="Label" value={qa.label} onChangeText={(v) => updateQA(index, 'label', v)} placeholder="Action Label" colors={colors} small />
            </View>
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <IconInput label="Icon" value={qa.icon} onChange={(v) => updateQA(index, 'icon', v)} placeholder="flash-outline" colors={colors} small />
            </View>
            <View style={{ flex: 1 }}>
              <FormField label="Route" value={qa.route} onChangeText={(v) => updateQA(index, 'route', v)} placeholder="/explore" colors={colors} small />
            </View>
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <ColorInput label="Color" value={qa.color} onChange={(v) => updateQA(index, 'color', v)} placeholder={colors.info} colors={colors} small />
            </View>
            <View style={{ flex: 1 }}>
              <FormField label="Sort Order" value={qa.sortOrder?.toString() || '0'} onChangeText={(v) => updateQA(index, 'sortOrder', parseInt(v) || 0)} keyboardType="numeric" colors={colors} small />
            </View>
          </View>

          <View style={styles.switchRow}>
            <Text style={[styles.switchLabel, { color: colors.text }]}>Enabled</Text>
            <Switch
              value={qa.enabled}
              onValueChange={(v) => updateQA(index, 'enabled', v)}
              trackColor={{ false: colors.gray300, true: `${colors.success}80` }}
              thumbColor={qa.enabled ? colors.success : Colors.light.icon}
            />
          </View>
        </View>
      ))}

      <TouchableOpacity style={[styles.addBtn, { borderColor: colors.tint }]} onPress={addQuickAction}>
        <Ionicons name="add-circle-outline" size={20} color={colors.tint} />
        <Text style={[styles.addText, { color: colors.tint }]}>Add Quick Action</Text>
      </TouchableOpacity>
    </View>
  );
});

QuickActionsManager.displayName = 'QuickActionsManager';
export default QuickActionsManager;

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 10 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  cardIndex: { fontSize: 13, fontWeight: '700' },
  row: { flexDirection: 'row', gap: 10 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
  switchLabel: { fontSize: 13, fontWeight: '600' },
  emptyState: { alignItems: 'center', paddingVertical: 20, gap: 8 },
  emptyText: { fontSize: 13, fontWeight: '500' },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 10, borderWidth: 1.5, borderStyle: 'dashed', gap: 6, marginTop: 4 },
  addText: { fontSize: 14, fontWeight: '600' },
});
