import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/contexts/settings-context';

type IconName = React.ComponentProps<typeof MaterialIcons>['name'];
type HeaderButton = { icon: IconName; label: string; onPress: () => void };

// 화면 위쪽 바: [왼쪽 버튼] 제목 [오른쪽 버튼]. 버튼이 없는 쪽도 자리는 비워서 제목이 가운데 오게 한다.
export function AppHeader({ title, left, right }: { title: string; left?: HeaderButton; right?: HeaderButton }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const renderButton = (button?: HeaderButton) => (
    <View style={styles.side}>
      {button && (
        <Pressable
          onPress={button.onPress}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={button.label}
          style={({ pressed }) => [styles.button, pressed && { opacity: 0.5 }]}>
          <MaterialIcons name={button.icon} size={30} color={theme.text} />
        </Pressable>
      )}
    </View>
  );

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top + 12, backgroundColor: theme.surface, borderBottomColor: theme.border },
      ]}>
      {renderButton(left)}
      <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
        {title}
      </Text>
      {renderButton(right)}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 2,
  },
  side: { width: 44, alignItems: 'center' },
  button: { padding: 4 },
  title: { flex: 1, textAlign: 'center', fontSize: 22, fontWeight: '700' },
});
