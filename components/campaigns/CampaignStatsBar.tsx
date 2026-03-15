import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CampaignStats } from '../../services';
import { Colors } from '../../constants/Colors';

interface Props {
  stats: CampaignStats | null;
  colors: any;
}

export default function CampaignStatsBar({ stats, colors }: Props) {
  return (
    <View style={styles.statsRow}>
      {[
        { label: 'Total', value: stats?.total || 0, color: colors.text },
        { label: 'Running', value: stats?.running || 0, color: Colors.light.success },
        { label: 'Upcoming', value: stats?.upcoming || 0, color: Colors.light.warning },
        { label: 'Deals', value: stats?.totalDeals || 0, color: Colors.light.info },
      ].map((item, index) => (
        <View key={index} style={[styles.statItem, { backgroundColor: colors.card }]}>
          <Text style={[styles.statValue, { color: item.color }]}>{item.value}</Text>
          <Text style={[styles.statLabel, { color: colors.icon }]}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  statsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 12 },
  statItem: { flex: 1, paddingVertical: 12, paddingHorizontal: 8, borderRadius: 12, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '700' },
  statLabel: { fontSize: 10, fontWeight: '500', marginTop: 2 },
});
