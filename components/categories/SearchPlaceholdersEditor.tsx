import React from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PageConfig } from '../../services/api/categories';
import { Colors } from '../../constants/Colors';

interface SearchPlaceholdersEditorProps {
  pageConfig: PageConfig;
  setPageConfig: React.Dispatch<React.SetStateAction<PageConfig>>;
  colors: typeof Colors.light;
}

const SearchPlaceholdersEditor = React.memo(({ pageConfig, setPageConfig, colors }: SearchPlaceholdersEditorProps) => {
  const placeholders = pageConfig.searchPlaceholders || {};

  // Build tab keys: always include 'all', plus each tab id
  const tabKeys = ['all', ...(pageConfig.tabs || []).map(t => t.id).filter(id => id !== 'all')];

  const updatePlaceholders = (key: string, values: string[]) => {
    setPageConfig((prev) => ({
      ...prev,
      searchPlaceholders: { ...(prev.searchPlaceholders || {}), [key]: values },
    }));
  };

  const addPlaceholder = (key: string) => {
    const current = placeholders[key] || [];
    updatePlaceholders(key, [...current, '']);
  };

  const removePlaceholder = (key: string, index: number) => {
    const current = placeholders[key] || [];
    updatePlaceholders(key, current.filter((_, i) => i !== index));
  };

  const updatePlaceholder = (key: string, index: number, value: string) => {
    const current = [...(placeholders[key] || [])];
    current[index] = value;
    updatePlaceholders(key, current);
  };

  return (
    <View>
      {tabKeys.map((tabKey) => {
        const items = placeholders[tabKey] || [];
        const tabLabel = tabKey === 'all' ? 'All Tabs (default)' : pageConfig.tabs?.find(t => t.id === tabKey)?.label || tabKey;

        return (
          <View key={tabKey} style={[styles.section, { borderColor: colors.border }]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{tabLabel}</Text>
              <TouchableOpacity onPress={() => addPlaceholder(tabKey)} style={[styles.addSmall, { backgroundColor: `${colors.tint}15` }]}>
                <Ionicons name="add" size={16} color={colors.tint} />
              </TouchableOpacity>
            </View>

            {items.length === 0 && (
              <Text style={[styles.emptyHint, { color: colors.icon }]}>No placeholders — will use defaults</Text>
            )}

            {items.map((item, index) => (
              <View key={index} style={styles.itemRow}>
                <TextInput
                  style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                  value={item}
                  onChangeText={(v) => updatePlaceholder(tabKey, index, v)}
                  placeholder={`Search placeholder ${index + 1}...`}
                  placeholderTextColor={colors.icon}
                />
                <TouchableOpacity onPress={() => removePlaceholder(tabKey, index)}>
                  <Ionicons name="close-circle" size={20} color={Colors.light.error} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        );
      })}
    </View>
  );
});

SearchPlaceholdersEditor.displayName = 'SearchPlaceholdersEditor';
export default SearchPlaceholdersEditor;

const styles = StyleSheet.create({
  section: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 10 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sectionTitle: { fontSize: 14, fontWeight: '700' },
  addSmall: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  emptyHint: { fontSize: 12, fontStyle: 'italic', marginBottom: 4 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  input: { flex: 1, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13 },
});
