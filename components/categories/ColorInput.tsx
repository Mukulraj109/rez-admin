import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { Colors } from '../../constants/Colors';

const HEX_REGEX = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

interface ColorInputProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  colors: { text: string; icon: string; border: string };
  small?: boolean;
}

const ColorInput = React.memo(({ label, value, onChange, placeholder, colors, small }: ColorInputProps) => {
  const [error, setError] = useState('');
  const isValid = !value || HEX_REGEX.test(value);

  const handleBlur = () => {
    if (value && !HEX_REGEX.test(value)) {
      setError('Invalid hex color (e.g. #1a3a52)');
    } else {
      setError('');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={[small ? styles.labelSmall : styles.label, { color: colors.text }]}>{label}</Text>
      <View style={styles.row}>
        <View style={[styles.preview, { backgroundColor: isValid && value ? value : Colors.light.gray300 }]} />
        <TextInput
          style={[
            small ? styles.inputSmall : styles.input,
            { color: colors.text, borderColor: error ? Colors.light.error : colors.border, flex: 1 },
          ]}
          value={value}
          onChangeText={(v) => { onChange(v); if (error) setError(''); }}
          onBlur={handleBlur}
          placeholder={placeholder || '#000000'}
          placeholderTextColor={colors.icon}
        />
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
});

ColorInput.displayName = 'ColorInput';
export default ColorInput;

const styles = StyleSheet.create({
  container: { marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  labelSmall: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  preview: { width: 32, height: 32, borderRadius: 8 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14 },
  inputSmall: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13 },
  errorText: { color: Colors.light.error, fontSize: 11, marginTop: 2 },
});
