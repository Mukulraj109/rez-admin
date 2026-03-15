import React from 'react';
import { View, Text, TouchableOpacity, Switch, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MainCategory } from '../../services/api/categories';
import { Colors } from '../../constants/Colors';

interface CategoryListItemProps {
  category: MainCategory;
  isProcessing: boolean;
  onToggle: () => void;
  onEditConfig: () => void;
  onToggleFeatured: () => void;
  onDelete?: () => void;
  colors: { card: string; text: string; icon: string; tint: string; success: string; error: string; warning: string };
}

// Ionicons names contain hyphens or are all-lowercase ASCII; emojis are short non-ASCII
const isIoniconName = (icon: string) => /^[a-z0-9-]+$/.test(icon) && icon.length > 2;

const CategoryListItem = React.memo(({ category, isProcessing, onToggle, onEditConfig, onToggleFeatured, onDelete, colors }: CategoryListItemProps) => {
  const metadataColor = category.metadata?.color || Colors.light.secondaryText;
  const isFeatured = category.metadata?.featured || false;
  const updatedStr = category.updatedAt
    ? new Date(category.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '';

  return (
    <View style={[styles.item, { backgroundColor: colors.card }]}>
      <View style={styles.row}>
        <View style={[styles.iconBox, { backgroundColor: `${metadataColor}20` }]}>
          {category.icon ? (
            isIoniconName(category.icon) ? (
              <Ionicons name={category.icon as any} size={22} color={metadataColor} />
            ) : (
              <Text style={styles.emoji}>{category.icon}</Text>
            )
          ) : (
            <View style={[styles.swatch, { backgroundColor: metadataColor }]} />
          )}
        </View>
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>{category.name}</Text>
            {!category.isActive && (
              <View style={[styles.badge, { backgroundColor: `${colors.error}15` }]}>
                <Text style={[styles.badgeText, { color: colors.error }]}>Inactive</Text>
              </View>
            )}
          </View>
          <Text style={[styles.sub, { color: colors.icon }]}>
            {category.slug} | Order: {category.sortOrder} | Stores: {category.storeCount ?? 0}
            {updatedStr ? ` | ${updatedStr}` : ''}
          </Text>
        </View>
        {isProcessing ? (
          <ActivityIndicator size="small" color={colors.tint} />
        ) : (
          <Switch
            value={category.isActive}
            onValueChange={onToggle}
            trackColor={{ false: Colors.light.border, true: `${colors.success}80` }}
            thumbColor={category.isActive ? colors.success : Colors.light.icon}
          />
        )}
      </View>
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: `${colors.warning}15` }]}
          onPress={onToggleFeatured}
        >
          <Ionicons name={isFeatured ? 'star' : 'star-outline'} size={16} color={colors.warning} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btn, styles.editBtn, { backgroundColor: `${colors.tint}15` }]}
          onPress={onEditConfig}
        >
          <Ionicons name="construct-outline" size={16} color={colors.tint} />
          <Text style={[styles.editText, { color: colors.tint }]}>Edit Page Config</Text>
        </TouchableOpacity>
        {onDelete && (category.storeCount ?? 0) === 0 && (
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: `${colors.error}15` }]}
            onPress={onDelete}
          >
            <Ionicons name="trash-outline" size={16} color={colors.error} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}, (prev, next) =>
  prev.category._id === next.category._id &&
  prev.category.isActive === next.category.isActive &&
  prev.category.metadata?.featured === next.category.metadata?.featured &&
  prev.category.storeCount === next.category.storeCount &&
  prev.isProcessing === next.isProcessing
);

CategoryListItem.displayName = 'CategoryListItem';
export default CategoryListItem;

const styles = StyleSheet.create({
  item: { padding: 14, borderRadius: 12, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 22 },
  swatch: { width: 24, height: 24, borderRadius: 6 },
  info: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { fontSize: 15, fontWeight: '600', flexShrink: 1 },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  sub: { fontSize: 12, marginTop: 2 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 10 },
  btn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12 },
  editText: { fontSize: 13, fontWeight: '600' },
});
