import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { Colors } from '../../constants/Colors';

interface FormFieldProps {
  label: string;
  value: string;
  onChangeText: (val: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric';
  colors: { text: string; icon: string; border: string };
  small?: boolean;
  error?: string;
}

const FormField = React.memo(({ label, value, onChangeText, placeholder, keyboardType, colors, small, error }: FormFieldProps) => (
  <View style={styles.container}>
    <Text style={[small ? styles.labelSmall : styles.label, { color: colors.text }]}>{label}</Text>
    <TextInput
      style={[
        small ? styles.inputSmall : styles.input,
        { color: colors.text, borderColor: error ? Colors.light.error : colors.border },
      ]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.icon}
      keyboardType={keyboardType}
    />
    {error ? <Text style={styles.errorText}>{error}</Text> : null}
  </View>
));

FormField.displayName = 'FormField';
export default FormField;

const styles = StyleSheet.create({
  container: { marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  labelSmall: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14 },
  inputSmall: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13 },
  errorText: { color: Colors.light.error, fontSize: 11, marginTop: 2 },
});
