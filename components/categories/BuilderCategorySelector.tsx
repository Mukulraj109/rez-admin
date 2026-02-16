import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MainCategory } from '../../services/api/categories';

const isIoniconName = (icon: string) => /^[a-z0-9-]+$/.test(icon) && icon.length > 2;

interface BuilderCategorySelectorProps {
  categories: MainCategory[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  colors: { text: string; icon: string; card: string; tint: string };
}

const BuilderCategorySelector = React.memo(({ categories, selectedId, onSelect, colors }: BuilderCategorySelectorProps) => (
  <View style={styles.container}>
    <Text style={[styles.header, { color: colors.text }]}>Select Category</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll} contentContainerStyle={{ paddingRight: 16 }}>
      {categories.map((cat) => (
        <TouchableOpacity
          key={cat._id}
          style={[
            styles.chip,
            selectedId === cat._id
              ? { backgroundColor: colors.tint }
              : { backgroundColor: colors.card },
          ]}
          onPress={() => onSelect(cat._id)}
        >
          {cat.icon ? (
            isIoniconName(cat.icon) ? (
              <Ionicons name={cat.icon as any} size={16} color={selectedId === cat._id ? '#FFF' : colors.icon} />
            ) : (
              <Text style={styles.emoji}>{cat.icon}</Text>
            )
          ) : null}
          <Text style={[styles.chipText, { color: selectedId === cat._id ? '#FFF' : colors.text }]}>
            {cat.name}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  </View>
));

BuilderCategorySelector.displayName = 'BuilderCategorySelector';
export default BuilderCategorySelector;

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  header: { fontSize: 18, fontWeight: '700' },
  scroll: { marginTop: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, marginRight: 8, gap: 6 },
  emoji: { fontSize: 16 },
  chipText: { fontSize: 14, fontWeight: '600' },
});
