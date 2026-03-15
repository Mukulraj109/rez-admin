import React from 'react';
import { View, Text, TouchableOpacity, Switch, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PageConfig } from '../../services/api/categories';
import FormField from './FormField';
import { Colors } from '../../constants/Colors';
import IconInput from './IconInput';
import ChipSelector from './ChipSelector';
import { showConfirm } from '../../utils/alert';

interface TabsManagerProps {
  pageConfig: PageConfig;
  setPageConfig: React.Dispatch<React.SetStateAction<PageConfig>>;
  colors: typeof Colors.light;
}

const TabsManager = React.memo(({ pageConfig, setPageConfig, colors }: TabsManagerProps) => {
  const addTab = () => {
    setPageConfig((prev) => ({
      ...prev,
      tabs: [...prev.tabs, {
        id: `tab-${Date.now()}`, label: 'New Tab', icon: 'grid-outline',
        serviceFilter: '', enabled: true, sortOrder: prev.tabs.length,
      }],
    }));
  };

  const removeTab = (index: number) => {
    const tab = pageConfig.tabs[index];
    showConfirm('Delete Tab', `Remove "${tab.label}"?`, () => {
      setPageConfig((prev) => ({ ...prev, tabs: prev.tabs.filter((_, i) => i !== index) }));
    }, 'Delete', 'warning');
  };

  const updateTab = (index: number, field: string, value: any) => {
    setPageConfig((prev) => ({
      ...prev,
      tabs: prev.tabs.map((tab, i) => (i === index ? { ...tab, [field]: value } : tab)),
    }));
  };

  return (
    <View>
      {pageConfig.tabs.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="information-circle-outline" size={24} color={colors.icon} />
          <Text style={[styles.emptyText, { color: colors.icon }]}>No tabs configured yet.</Text>
        </View>
      )}
      {pageConfig.tabs.map((tab, index) => (
        <View key={tab.id || index} style={[styles.card, { borderColor: colors.border }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardIndex, { color: colors.icon }]}>#{index + 1}</Text>
            <TouchableOpacity onPress={() => removeTab(index)}>
              <Ionicons name="trash-outline" size={18} color={Colors.light.error} />
            </TouchableOpacity>
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <FormField label="ID" value={tab.id} onChangeText={(v) => updateTab(index, 'id', v)} placeholder="tab-id" colors={colors} small />
            </View>
            <View style={{ flex: 1 }}>
              <FormField label="Label" value={tab.label} onChangeText={(v) => updateTab(index, 'label', v)} placeholder="Tab Label" colors={colors} small />
            </View>
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <IconInput label="Icon" value={tab.icon} onChange={(v) => updateTab(index, 'icon', v)} placeholder="grid-outline" colors={colors} small />
            </View>
            <View style={{ flex: 1 }}>
              <FormField label="Service Filter" value={tab.serviceFilter || ''} onChangeText={(v) => updateTab(index, 'serviceFilter', v)} placeholder="Optional" colors={colors} small />
            </View>
          </View>

          <View style={{ marginBottom: 12 }}>
            <Text style={[styles.chipLabel, { color: colors.text }]}>Section Override</Text>
            <ChipSelector
              options={['', 'offers', 'experiences']}
              selected={tab.sectionOverride || ''}
              onSelect={(v) => updateTab(index, 'sectionOverride', v)}
              colors={colors}
            />
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <FormField label="Sort Order" value={tab.sortOrder?.toString() || '0'} onChangeText={(v) => updateTab(index, 'sortOrder', parseInt(v) || 0)} keyboardType="numeric" colors={colors} small />
            </View>
            <View style={[styles.switchRow, { flex: 1 }]}>
              <Text style={[styles.switchLabel, { color: colors.text }]}>Enabled</Text>
              <Switch
                value={tab.enabled}
                onValueChange={(v) => updateTab(index, 'enabled', v)}
                trackColor={{ false: colors.gray300, true: `${colors.success}80` }}
                thumbColor={tab.enabled ? colors.success : Colors.light.icon}
              />
            </View>
          </View>
        </View>
      ))}

      <TouchableOpacity style={[styles.addBtn, { borderColor: colors.tint }]} onPress={addTab}>
        <Ionicons name="add-circle-outline" size={20} color={colors.tint} />
        <Text style={[styles.addText, { color: colors.tint }]}>Add Tab</Text>
      </TouchableOpacity>
    </View>
  );
});

TabsManager.displayName = 'TabsManager';
export default TabsManager;

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
