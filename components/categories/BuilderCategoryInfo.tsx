import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MainCategory } from '../../services/api/categories';
import { Colors } from '../../constants/Colors';

const isIoniconName = (icon: string) => /^[a-z0-9-]+$/.test(icon) && icon.length > 2;

interface BuilderCategoryInfoProps {
  category: MainCategory;
  colors: { card: string; text: string; icon: string; success: string; error: string };
}

const BuilderCategoryInfo = React.memo(({ category, colors }: BuilderCategoryInfoProps) => {
  const metadataColor = category.metadata?.color || Colors.light.secondaryText;
  const updatedStr = category.updatedAt
    ? new Date(category.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '';

  return (
    <View style={[styles.banner, { backgroundColor: colors.card }]}>
      <View style={styles.row}>
        {category.icon ? (
          isIoniconName(category.icon) ? (
            <Ionicons name={category.icon as any} size={24} color={metadataColor} />
          ) : (
            <Text style={styles.emoji}>{category.icon}</Text>
          )
        ) : (
          <View style={[styles.iconBox, { backgroundColor: `${metadataColor}20` }]}>
            <Ionicons name="apps" size={20} color={metadataColor} />
          </View>
        )}
        <View style={styles.textCol}>
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>{category.name}</Text>
          <Text style={[styles.sub, { color: colors.icon }]} numberOfLines={2}>
            {category.slug} | {category.type} | Stores: {category.storeCount ?? 0}
            {updatedStr ? ` | ${updatedStr}` : ''}
          </Text>
        </View>
        <View style={[styles.pill, { backgroundColor: category.isActive ? `${colors.success}20` : `${colors.error}20` }]}>
          <Text style={[styles.pillText, { color: category.isActive ? colors.success : colors.error }]}>
            {category.isActive ? 'Active' : 'Inactive'}
          </Text>
        </View>
      </View>
    </View>
  );
});

BuilderCategoryInfo.displayName = 'BuilderCategoryInfo';
export default BuilderCategoryInfo;

const styles = StyleSheet.create({
  banner: { padding: 16, borderRadius: 14, marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  emoji: { fontSize: 28 },
  iconBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  textCol: { flex: 1 },
  name: { fontSize: 18, fontWeight: '700' },
  sub: { fontSize: 12, marginTop: 2 },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  pillText: { fontSize: 12, fontWeight: '600' },
});
