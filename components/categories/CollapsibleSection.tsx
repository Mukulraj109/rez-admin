import React from 'react';
import { View, Text, TouchableOpacity, LayoutAnimation, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';

interface CollapsibleSectionProps {
  title: string;
  sectionKey: string;
  iconName: React.ComponentProps<typeof Ionicons>['name'];
  iconColor: string;
  expandedSection: string | null;
  setExpandedSection: (key: string | null) => void;
  colors: { card: string; text: string; icon: string; border: string };
  children: React.ReactNode;
}

const CollapsibleSection = React.memo(({
  title, sectionKey, iconName, iconColor, expandedSection, setExpandedSection, colors, children,
}: CollapsibleSectionProps) => {
  const isExpanded = expandedSection === sectionKey;
  return (
    <View style={styles.wrapper}>
      <TouchableOpacity
        style={[
          styles.header,
          { backgroundColor: Colors.light.card },
          isExpanded && styles.headerExpanded,
        ]}
        onPress={() => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setExpandedSection(isExpanded ? null : sectionKey);
        }}
      >
        <View style={styles.left}>
          <View style={[styles.iconBg, { backgroundColor: `${iconColor}15` }]}>
            <Ionicons name={iconName} size={18} color={iconColor} />
          </View>
          <Text style={[styles.title, { color: Colors.light.text }]}>{title}</Text>
        </View>
        <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={20} color={Colors.light.icon} />
      </TouchableOpacity>
      {isExpanded && (
        <View style={[styles.body, { backgroundColor: Colors.light.card, borderTopColor: Colors.light.border }]}>
          {children}
        </View>
      )}
    </View>
  );
});

CollapsibleSection.displayName = 'CollapsibleSection';
export default CollapsibleSection;

const styles = StyleSheet.create({
  wrapper: { marginTop: 8 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 14, borderRadius: 12,
  },
  headerExpanded: { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  left: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBg: { width: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 15, fontWeight: '600' },
  body: {
    padding: 14, borderBottomLeftRadius: 12, borderBottomRightRadius: 12,
    borderTopWidth: 1, marginBottom: 4,
  },
});
