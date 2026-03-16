/**
 * EmergencyActionBar — Collapsible critical actions bar for admin dashboard
 * Shows quick-access emergency controls for superadmin users.
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { showConfirm, showAlert } from '../../utils/alert';
import { apiClient } from '../../services/api/apiClient';

interface EmergencyActionBarProps {
  onFreezeMerchant?: () => void;
  onSystemAlert?: () => void;
}

function EmergencyActionBar({ onFreezeMerchant, onSystemAlert }: EmergencyActionBarProps) {
  const [expanded, setExpanded] = useState(false);
  const [cashbackPaused, setCashbackPaused] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleToggleCashback = async () => {
    const action = cashbackPaused ? 'Resume' : 'Pause';
    const confirmed = await showConfirm(
      `${action} All Cashback`,
      `Are you sure you want to ${action.toLowerCase()} all cashback platform-wide? This affects all users immediately.`
    );
    if (!confirmed) return;

    setLoading(true);
    try {
      const res = await apiClient.post('/admin/economics/cashback-toggle', {
        enabled: cashbackPaused,
      });
      if (res.success) {
        setCashbackPaused(!cashbackPaused);
        showAlert('Success', `Cashback ${cashbackPaused ? 'resumed' : 'paused'} successfully`);
      } else {
        showAlert('Error', res.message || 'Failed to toggle cashback');
      }
    } catch {
      showAlert('Error', 'Failed to toggle cashback');
    } finally {
      setLoading(false);
    }
  };

  if (!expanded) {
    return (
      <Pressable style={styles.collapsedBar} onPress={() => setExpanded(true)}>
        <Ionicons name="warning" size={16} color="#EF4444" />
        <Text style={styles.collapsedText}>Emergency Controls</Text>
        <Ionicons name="chevron-down" size={16} color="#EF4444" />
      </Pressable>
    );
  }

  return (
    <View style={styles.expandedBar}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Ionicons name="warning" size={16} color="#EF4444" />
          <Text style={styles.headerText}>Emergency Controls</Text>
        </View>
        <Pressable onPress={() => setExpanded(false)}>
          <Ionicons name="chevron-up" size={18} color="#991B1B" />
        </Pressable>
      </View>

      <View style={styles.actionsRow}>
        <Pressable
          style={[styles.actionBtn, cashbackPaused ? styles.actionBtnResume : styles.actionBtnDanger]}
          onPress={handleToggleCashback}
          disabled={loading}
        >
          <Ionicons
            name={cashbackPaused ? 'play-circle' : 'pause-circle'}
            size={16}
            color={cashbackPaused ? '#10B981' : '#fff'}
          />
          <Text style={[styles.actionBtnText, cashbackPaused && { color: '#10B981' }]}>
            {cashbackPaused ? 'Resume Cashback' : 'Pause Cashback'}
          </Text>
        </Pressable>

        <Pressable
          style={[styles.actionBtn, styles.actionBtnWarning]}
          onPress={onFreezeMerchant}
        >
          <Ionicons name="snow" size={16} color="#F59E0B" />
          <Text style={[styles.actionBtnText, { color: '#F59E0B' }]}>Freeze Merchant</Text>
        </Pressable>

        <Pressable
          style={[styles.actionBtn, styles.actionBtnInfo]}
          onPress={onSystemAlert}
        >
          <Ionicons name="megaphone" size={16} color="#3B82F6" />
          <Text style={[styles.actionBtnText, { color: '#3B82F6' }]}>System Alert</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  collapsedBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#FECACA',
  },
  collapsedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#991B1B',
  },
  expandedBar: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#FECACA',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#991B1B',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  actionBtnDanger: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
  },
  actionBtnResume: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
  },
  actionBtnWarning: {
    backgroundColor: '#FFFBEB',
    borderColor: '#F59E0B',
  },
  actionBtnInfo: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
});

export default React.memo(EmergencyActionBar);
