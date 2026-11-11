import { StyleProp, Switch, ViewStyle } from 'react-native';

import { useTheme } from '@/contexts/settings-context';

// 앱 공용 켜기/끄기 스위치 (테마 색 적용)
export function ToggleSwitch({
  value,
  onValueChange,
  label,
  style,
}: {
  value: boolean;
  onValueChange: (on: boolean) => void;
  label: string; // 화면 낭독기용 이름
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  return (
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: theme.chip, true: theme.accent }}
      thumbColor={theme.switchThumb}
      // 웹 전용 속성: 안 넣으면 웹에서 켜졌을 때 손잡이가 초록색이 된다
      {...({ activeThumbColor: theme.switchThumb } as object)}
      accessibilityLabel={label}
      style={style}
    />
  );
}
