import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants/Colors';

interface CategoryStatsBarProps {
  total: number;
  active: number;
  inactive: number;
  colors: { card: string; text: string; icon: string };
}

const CategoryStatsBar = React.memo(({ total, active, inactive, colors }: CategoryStatsBarProps) => (
  <View style={styles.row}>
    {[
      { label: 'Total', value: total, color: Colors.light.info },
      { label: 'Active', value: active, color: Colors.light.success },
      { label: 'Inactive', value: inactive, color: Colors.light.error },
    ].map((stat, i) => (
      <View key={i} style={[styles.card, { backgroundColor: colors.card }]}>
        <View style={[styles.dot, { backgroundColor: stat.color }]} />
        <Text style={[styles.value, { color: colors.text }]}>{stat.value}</Text>
        <Text style={[styles.label, { color: colors.icon }]}>{stat.label}</Text>
      </View>
    ))}
  </View>
));

CategoryStatsBar.displayName = 'CategoryStatsBar';
export default CategoryStatsBar;

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  card: { flex: 1, maxWidth: 200, flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, gap: 10 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  value: { fontSize: 22, fontWeight: '800' },
  label: { fontSize: 12, fontWeight: '500' },
});
