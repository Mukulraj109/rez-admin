import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Campaign } from '../../services';
import { format } from 'date-fns';
import { Colors } from '../../constants/Colors';

type CampaignType = Campaign['type'];

const getTypeColor = (type: CampaignType) => {
  const colors = Colors.light;
  const typeColors: Record<CampaignType, string> = {
    cashback: Colors.light.success, coins: Colors.light.warning, bank: Colors.light.info, bill: colors.purple,
    drop: Colors.light.pink, 'new-user': Colors.light.cyan, flash: Colors.light.error, general: Colors.light.secondaryText,
  };
  return typeColors[type] || Colors.light.secondaryText;
};

const getStatusBadge = (campaign: Campaign) => {
  if (!campaign.isActive) return { text: 'Inactive', color: Colors.light.secondaryText, icon: 'pause-circle' };
  if (campaign.isExpired) return { text: 'Expired', color: Colors.light.error, icon: 'close-circle' };
  if (campaign.isUpcoming) return { text: 'Upcoming', color: Colors.light.warning, icon: 'time' };
  if (campaign.isRunning) return { text: 'Live', color: Colors.light.success, icon: 'radio-button-on' };
  return { text: 'Active', color: Colors.light.info, icon: 'checkmark-circle' };
};

interface Props {
  item: Campaign;
  colors: any;
  onEdit: (c: Campaign) => void;
  onToggle: (c: Campaign) => void;
  onDuplicate: (c: Campaign) => void;
  onDelete: (c: Campaign) => void;
}

export default function CampaignCard({ item, colors, onEdit, onToggle, onDuplicate, onDelete }: Props) {
  const status = getStatusBadge(item);
  const typeColor = getTypeColor(item.type);

  return (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      <View style={styles.cardHeader}>
        <View style={[styles.typeChip, { backgroundColor: `${typeColor}15` }]}>
          <View style={[styles.typeDot, { backgroundColor: typeColor }]} />
          <Text style={[styles.typeLabel, { color: typeColor }]}>{item.type.charAt(0).toUpperCase() + item.type.slice(1)}</Text>
        </View>
        <View style={[styles.statusChip, { backgroundColor: `${status.color}15` }]}>
          <Ionicons name={status.icon as any} size={12} color={status.color} />
          <Text style={[styles.statusLabel, { color: status.color }]}>{status.text}</Text>
        </View>
      </View>

      <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>{item.title}</Text>
      <Text style={[styles.cardSubtitle, { color: colors.icon }]} numberOfLines={1}>{item.subtitle}</Text>

      <View style={styles.metaRow}>
        <View style={styles.metaChip}><Ionicons name="pricetag-outline" size={12} color={colors.icon} /><Text style={[styles.metaText, { color: colors.icon }]}>{item.badge}</Text></View>
        <View style={styles.metaChip}><Ionicons name="layers-outline" size={12} color={colors.icon} /><Text style={[styles.metaText, { color: colors.icon }]}>{item.dealsCount || 0}</Text></View>
        <View style={styles.metaChip}><Ionicons name="location-outline" size={12} color={colors.icon} /><Text style={[styles.metaText, { color: colors.icon }]}>{item.region || 'all'}</Text></View>
      </View>

      <View style={[styles.dateRow, { borderTopColor: colors.border }]}>
        <View style={styles.dateInfo}><Ionicons name="calendar-outline" size={12} color={colors.icon} /><Text style={[styles.dateText, { color: colors.icon }]}>{format(new Date(item.startTime), 'MMM d')} - {format(new Date(item.endTime), 'MMM d')}</Text></View>
        <Text style={[styles.priorityBadge, { backgroundColor: colors.background, color: colors.icon }]}>P{item.priority}</Text>
      </View>

      {item.isExpired && item.isActive && (
        <TouchableOpacity style={styles.expiredBanner} onPress={() => onEdit(item)}>
          <Ionicons name="refresh" size={14} color={Colors.light.warning} />
          <Text style={styles.expiredBannerText}>Tap to extend campaign dates</Text>
          <Ionicons name="chevron-forward" size={14} color={Colors.light.warning} />
        </TouchableOpacity>
      )}

      <View style={styles.actionRow}>
        <TouchableOpacity style={[styles.actionIconBtn, { backgroundColor: Colors.light.info + '10' }]} onPress={() => onEdit(item)}><Ionicons name="pencil" size={16} color={Colors.light.info} /></TouchableOpacity>
        <TouchableOpacity style={[styles.actionIconBtn, { backgroundColor: (item.isActive ? Colors.light.warning : Colors.light.success) + '10' }]} onPress={() => onToggle(item)}><Ionicons name={item.isActive ? 'pause' : 'play'} size={16} color={item.isActive ? Colors.light.warning : Colors.light.success} /></TouchableOpacity>
        <TouchableOpacity style={[styles.actionIconBtn, { backgroundColor: `${colors.purple}10` }]} onPress={() => onDuplicate(item)}><Ionicons name="copy" size={16} color={colors.purple} /></TouchableOpacity>
        <TouchableOpacity style={[styles.actionIconBtn, { backgroundColor: Colors.light.error + '10' }]} onPress={() => onDelete(item)}><Ionicons name="trash" size={16} color={Colors.light.error} /></TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 14, padding: 14, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  typeChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, gap: 6 },
  typeDot: { width: 6, height: 6, borderRadius: 3 },
  typeLabel: { fontSize: 11, fontWeight: '600' },
  statusChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, gap: 4 },
  statusLabel: { fontSize: 10, fontWeight: '600' },
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 3 },
  cardSubtitle: { fontSize: 13, marginBottom: 10 },
  metaRow: { flexDirection: 'row', gap: 12, marginBottom: 10 },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 11, fontWeight: '500' },
  dateRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTopWidth: 1, marginBottom: 10 },
  dateInfo: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dateText: { fontSize: 11 },
  priorityBadge: { fontSize: 10, fontWeight: '600', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  actionRow: { flexDirection: 'row', gap: 8 },
  expiredBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.light.warningLight, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, marginBottom: 10, gap: 6 },
  expiredBannerText: { fontSize: 12, fontWeight: '600', color: Colors.light.warningDark },
  actionIconBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
});
