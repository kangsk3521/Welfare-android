import { Pressable, StyleSheet, Text } from 'react-native';

import { useSettings, useTheme } from '@/contexts/settings-context';

// 고르는 버튼(칩). 선택되면 강조색으로 채워진다. 어르신이 누르기 쉽게 최소 높이 44
export function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const theme = useTheme();
  const { fontSize } = useSettings();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.chip,
        { borderColor: selected ? theme.accent : theme.border, backgroundColor: selected ? theme.accent : theme.surface },
        pressed && { opacity: 0.6 },
      ]}>
      <Text style={{ fontSize, color: selected ? theme.onAccent : theme.text, fontWeight: selected ? '700' : '400' }}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 22,
    borderWidth: 1.5,
    justifyContent: 'center',
  },
});
