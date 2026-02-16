import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PageConfig } from '../../services/api/categories';
import FormField from './FormField';
import ColorInput from './ColorInput';
import { showConfirm } from '../../utils/alert';

interface CuratedCollectionsManagerProps {
  pageConfig: PageConfig;
  setPageConfig: React.Dispatch<React.SetStateAction<PageConfig>>;
  colors: { text: string; icon: string; border: string; tint: string; card: string; success: string };
}

const CuratedCollectionsManager = React.memo(({ pageConfig, setPageConfig, colors }: CuratedCollectionsManagerProps) => {
  const collections = pageConfig.curatedCollections || [];

  const addCollection = () => {
    setPageConfig((prev) => ({
      ...prev,
      curatedCollections: [...(prev.curatedCollections || []), {
        id: `col-${Date.now()}`, title: '', subtitle: '', icon: '',
        gradient: ['#8B5CF6', '#A78BFA'], tags: '',
      }],
    }));
  };

  const removeCollection = (index: number) => {
    const item = collections[index];
    showConfirm('Delete Collection', `Remove "${item.title || 'this collection'}"?`, () => {
      setPageConfig((prev) => ({
        ...prev,
        curatedCollections: (prev.curatedCollections || []).filter((_, i) => i !== index),
      }));
    }, 'Delete', 'warning');
  };

  const updateCollection = (index: number, field: string, value: any) => {
    setPageConfig((prev) => ({
      ...prev,
      curatedCollections: (prev.curatedCollections || []).map((col, i) => (i === index ? { ...col, [field]: value } : col)),
    }));
  };

  const updateGradient = (index: number, gradientIndex: number, value: string) => {
    const col = collections[index];
    const g = [...(col.gradient || ['', ''])];
    g[gradientIndex] = value;
    updateCollection(index, 'gradient', g);
  };

  return (
    <View>
      {collections.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="information-circle-outline" size={24} color={colors.icon} />
          <Text style={[styles.emptyText, { color: colors.icon }]}>No curated collections configured yet.</Text>
        </View>
      )}

      {collections.map((col, index) => (
        <View key={col.id || index} style={[styles.card, { borderColor: colors.border }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardIndex, { color: colors.icon }]}>#{index + 1}</Text>
            <TouchableOpacity onPress={() => removeCollection(index)}>
              <Ionicons name="trash-outline" size={18} color="#EF4444" />
            </TouchableOpacity>
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <FormField label="ID" value={col.id} onChangeText={(v) => updateCollection(index, 'id', v)} placeholder="col-id" colors={colors} small />
            </View>
            <View style={{ flex: 1 }}>
              <FormField label="Icon (emoji)" value={col.icon} onChangeText={(v) => updateCollection(index, 'icon', v)} placeholder="✨" colors={colors} small />
            </View>
          </View>

          <FormField label="Title" value={col.title} onChangeText={(v) => updateCollection(index, 'title', v)} placeholder="Collection Title" colors={colors} small />
          <FormField label="Subtitle" value={col.subtitle} onChangeText={(v) => updateCollection(index, 'subtitle', v)} placeholder="Collection subtitle" colors={colors} small />

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <ColorInput label="Gradient Start" value={col.gradient?.[0] || ''} onChange={(v) => updateGradient(index, 0, v)} placeholder="#8B5CF6" colors={colors} small />
            </View>
            <View style={{ flex: 1 }}>
              <ColorInput label="Gradient End" value={col.gradient?.[1] || ''} onChange={(v) => updateGradient(index, 1, v)} placeholder="#A78BFA" colors={colors} small />
            </View>
          </View>

          <FormField label="Search Tags" value={col.tags} onChangeText={(v) => updateCollection(index, 'tags', v)} placeholder="romantic,date-night" colors={colors} small />
        </View>
      ))}

      <TouchableOpacity style={[styles.addBtn, { borderColor: colors.tint }]} onPress={addCollection}>
        <Ionicons name="add-circle-outline" size={20} color={colors.tint} />
        <Text style={[styles.addText, { color: colors.tint }]}>Add Curated Collection</Text>
      </TouchableOpacity>
    </View>
  );
});

CuratedCollectionsManager.displayName = 'CuratedCollectionsManager';
export default CuratedCollectionsManager;

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
