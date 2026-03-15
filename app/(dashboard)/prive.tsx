/**
 * Prive Admin Page
 * 11-tab interface: Offers | Vouchers | Reputation | Analytics | Config | Habits | Smart Spend | Invites | Program | Missions | Concierge
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import {
  OffersTab,
  VouchersTab,
  ReputationTab,
  AnalyticsTab,
  RedemptionConfigTab,
  HabitLoopsConfigTab,
  SmartSpendTab,
  InvitesTab,
  ProgramConfigTab,
  MissionsTab,
  ConciergeTab,
} from '@/components/prive';
import { Colors } from '@/constants/Colors';

type Tab = 'offers' | 'vouchers' | 'reputation' | 'analytics' | 'config' | 'habits' | 'smart_spend' | 'invites' | 'program_config' | 'missions' | 'concierge';

const tabs: { key: Tab; label: string; icon: string }[] = [
  { key: 'offers', label: 'Offers', icon: 'pricetag-outline' },
  { key: 'vouchers', label: 'Vouchers', icon: 'ticket-outline' },
  { key: 'reputation', label: 'Reputation', icon: 'shield-outline' },
  { key: 'analytics', label: 'Analytics', icon: 'bar-chart-outline' },
  { key: 'config', label: 'Config', icon: 'settings-outline' },
  { key: 'habits', label: 'Habits', icon: 'fitness-outline' },
  { key: 'smart_spend', label: 'Smart Spend', icon: 'storefront-outline' },
  { key: 'invites', label: 'Invites', icon: 'people-outline' },
  { key: 'program_config', label: 'Program', icon: 'options-outline' },
  { key: 'missions', label: 'Missions', icon: 'flag-outline' },
  { key: 'concierge', label: 'Concierge', icon: 'chatbubble-ellipses-outline' },
];

export default function PriveAdminScreen() {
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState<Tab>('offers');

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Prive Management</Text>
      </View>

      {/* Tab Bar */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.tabBar, { borderBottomColor: colors.border }]}
        contentContainerStyle={styles.tabBarContent}
      >
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.activeTab]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Ionicons
              name={tab.icon as any}
              size={18}
              color={activeTab === tab.key ? colors.gold : colors.icon}
            />
            <Text style={[
              styles.tabLabel,
              { color: activeTab === tab.key ? colors.gold : colors.secondaryText },
            ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Tab Content */}
      {activeTab === 'offers' && <OffersTab colors={colors} />}
      {activeTab === 'vouchers' && <VouchersTab colors={colors} />}
      {activeTab === 'reputation' && <ReputationTab colors={colors} />}
      {activeTab === 'analytics' && <AnalyticsTab colors={colors} />}
      {activeTab === 'config' && <RedemptionConfigTab colors={colors} />}
      {activeTab === 'habits' && <HabitLoopsConfigTab colors={colors} />}
      {activeTab === 'smart_spend' && <SmartSpendTab colors={colors} />}
      {activeTab === 'invites' && <InvitesTab colors={colors} />}
      {activeTab === 'program_config' && <ProgramConfigTab colors={colors} />}
      {activeTab === 'missions' && <MissionsTab colors={colors} />}
      {activeTab === 'concierge' && <ConciergeTab colors={colors} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 22, fontWeight: '700' },
  tabBar: {
    borderBottomWidth: 1,
    maxHeight: 52,
  },
  tabBarContent: {
    paddingHorizontal: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 6,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: Colors.light.gold,
  },
  tabLabel: { fontSize: 13, fontWeight: '500' },
});
