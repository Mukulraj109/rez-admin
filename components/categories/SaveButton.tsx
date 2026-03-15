import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';

interface SaveButtonProps {
  onSave: () => void;
  onReset: () => void;
  saving: boolean;
  isDirty: boolean;
  colors: { tint: string; icon: string; border: string };
}

const SaveButton = React.memo(({ onSave, onReset, saving, isDirty, colors }: SaveButtonProps) => (
  <View style={styles.container}>
    {isDirty && (
      <TouchableOpacity style={[styles.resetBtn, { borderColor: colors.border }]} onPress={onReset}>
        <Ionicons name="refresh-outline" size={18} color={colors.icon} />
        <Text style={[styles.resetText, { color: colors.icon }]}>Reset to Default</Text>
      </TouchableOpacity>
    )}
    <TouchableOpacity
      style={[styles.saveBtn, { backgroundColor: colors.tint, opacity: (saving || !isDirty) ? 0.5 : 1 }]}
      onPress={onSave}
      disabled={saving || !isDirty}
    >
      {saving ? (
        <ActivityIndicator size="small" color={colors.card} />
      ) : (
        <>
          <Ionicons name="save" size={20} color={colors.card} />
          <Text style={styles.saveText}>Save Page Config</Text>
          {isDirty && <View style={styles.dirtyDot} />}
        </>
      )}
    </TouchableOpacity>
  </View>
));

SaveButton.displayName = 'SaveButton';
export default SaveButton;

const styles = StyleSheet.create({
  container: { marginTop: 20, gap: 10 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 14, gap: 8 },
  saveText: { color: Colors.light.card, fontSize: 16, fontWeight: '700' },
  dirtyDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FCD34D' },
  resetBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 10, borderWidth: 1, gap: 6 },
  resetText: { fontSize: 14, fontWeight: '600' },
});
