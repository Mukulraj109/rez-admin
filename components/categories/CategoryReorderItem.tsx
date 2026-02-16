import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MainCategory } from '../../services/api/categories';

interface CategoryReorderItemProps {
  category: MainCategory;
  index: number;
  total: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
  colors: { card: string; text: string; icon: string; tint: string };
}

const isIoniconName = (icon: string) => /^[a-z0-9-]+$/.test(icon) && icon.length > 2;

const CategoryReorderItem = React.memo(({ category, index, total, onMoveUp, onMoveDown, colors }: CategoryReorderItemProps) => (
  <View style={[styles.item, { backgroundColor: colors.card }]}>
    <View style={styles.info}>
      <Text style={[styles.index, { color: colors.icon }]}>{index + 1}</Text>
      {category.icon ? (
        isIoniconName(category.icon) ? (
          <Ionicons name={category.icon as any} size={18} color={colors.icon} />
        ) : (
          <Text style={styles.emoji}>{category.icon}</Text>
        )
      ) : null}
      <Text style={[styles.name, { color: colors.text }]}>{category.name}</Text>
    </View>
    <View style={styles.buttons}>
      <TouchableOpacity
        style={[styles.btn, { opacity: index === 0 ? 0.3 : 1 }]}
        onPress={onMoveUp}
        disabled={index === 0}
      >
        <Ionicons name="chevron-up" size={20} color={colors.tint} />
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.btn, { opacity: index === total - 1 ? 0.3 : 1 }]}
        onPress={onMoveDown}
        disabled={index === total - 1}
      >
        <Ionicons name="chevron-down" size={20} color={colors.tint} />
      </TouchableOpacity>
    </View>
  </View>
));

CategoryReorderItem.displayName = 'CategoryReorderItem';
export default CategoryReorderItem;

const styles = StyleSheet.create({
  item: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderRadius: 12, marginBottom: 6 },
  info: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  index: { fontSize: 14, fontWeight: '700', width: 24 },
  emoji: { fontSize: 18 },
  name: { fontSize: 15, fontWeight: '600' },
  buttons: { flexDirection: 'row', gap: 4 },
  btn: { width: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
});
