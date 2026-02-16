import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface IconInputProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  colors: { text: string; icon: string; border: string; card: string };
  small?: boolean;
}

const IconInput = React.memo(({ label, value, onChange, placeholder, colors, small }: IconInputProps) => {
  // Check if the icon name is valid in Ionicons
  const isValid = value && (Ionicons.glyphMap as any)?.[value];

  return (
    <View style={styles.container}>
      <Text style={[small ? styles.labelSmall : styles.label, { color: colors.text }]}>{label}</Text>
      <View style={styles.row}>
        <View style={[styles.iconPreview, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {isValid ? (
            <Ionicons name={value as any} size={18} color={colors.text} />
          ) : (
            <Ionicons name="help-circle-outline" size={18} color={colors.icon} />
          )}
        </View>
        <TextInput
          style={[
            small ? styles.inputSmall : styles.input,
            { color: colors.text, borderColor: colors.border, flex: 1 },
          ]}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder || 'grid-outline'}
          placeholderTextColor={colors.icon}
        />
      </View>
    </View>
  );
});

IconInput.displayName = 'IconInput';
export default IconInput;

const styles = StyleSheet.create({
  container: { marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  labelSmall: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconPreview: { width: 34, height: 34, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14 },
  inputSmall: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13 },
});
