import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '@/constants/Colors';

interface ChipSelectorProps {
  options: string[];
  selected: string;
  onSelect: (val: string) => void;
  colors: { tint: string; border: string; text: string };
}

const ChipSelector = React.memo(({ options, selected, onSelect, colors }: ChipSelectorProps) => (
  <View style={styles.container}>
    {options.map((option) => (
      <TouchableOpacity
        key={option}
        style={[
          styles.chip,
          selected === option
            ? { backgroundColor: colors.tint }
            : { backgroundColor: `${colors.tint}10`, borderWidth: 1, borderColor: colors.border },
        ]}
        onPress={() => onSelect(option)}
      >
        <Text
          style={[
            styles.chipText,
            { color: selected === option ? colors.card : colors.text },
          ]}
        >
          {option}
        </Text>
      </TouchableOpacity>
    ))}
  </View>
));

ChipSelector.displayName = 'ChipSelector';
export default ChipSelector;

const styles = StyleSheet.create({
  container: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  chipText: { fontSize: 13, fontWeight: '600' },
});
