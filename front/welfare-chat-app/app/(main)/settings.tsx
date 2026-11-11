import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ToggleSwitch } from '@/components/common/ToggleSwitch';
import { ProfileEditor } from '@/components/profile/ProfileEditor';
import { Palette } from '@/constants/theme';
import { FONT_SIZE_MAX, FONT_SIZE_MIN, useSettings, useTheme } from '@/contexts/settings-context';

// 설정 화면: 글자크기 / 색약모드 / 내 기본 정보(components/profile/ProfileEditor.tsx)
export default function SettingsScreen() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const { fontSize, setFontSize, colorBlind, setColorBlind } = useSettings();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* 글자크기 */}
      <View style={[styles.card, styles.row]}>
        <Text style={styles.label}>글자크기</Text>
        <View style={styles.stepper}>
          <Pressable
            style={[styles.circleButton, fontSize <= FONT_SIZE_MIN && { opacity: 0.4 }]}
            onPress={() => setFontSize(fontSize - 1)}
            disabled={fontSize <= FONT_SIZE_MIN}
            accessibilityLabel="글자 작게">
            <Text style={styles.circleButtonText}>-</Text>
          </Pressable>
          <Text style={styles.stepValue}>{fontSize}</Text>
          <Pressable
            style={[styles.circleButton, fontSize >= FONT_SIZE_MAX && { opacity: 0.4 }]}
            onPress={() => setFontSize(fontSize + 1)}
            disabled={fontSize >= FONT_SIZE_MAX}
            accessibilityLabel="글자 크게">
            <Text style={styles.circleButtonText}>+</Text>
          </Pressable>
        </View>
      </View>

      {/* 색약모드 */}
      <View style={[styles.card, styles.row]}>
        <Text style={styles.label}>색약모드</Text>
        <ToggleSwitch
          value={colorBlind}
          onValueChange={setColorBlind}
          label="색약모드"
          style={{ transform: [{ scale: 1.3 }], marginRight: 6 }}
        />
      </View>

      {/* 내 기본 정보 */}
      <ProfileEditor />
    </ScrollView>
  );
}

const makeStyles = (t: Palette) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: t.background },
    content: { padding: 20, gap: 20, paddingBottom: 40 },
    card: {
      backgroundColor: t.surface,
      borderColor: t.border,
      borderWidth: 2,
      borderRadius: 18,
      paddingHorizontal: 20,
      paddingVertical: 18,
    },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    label: { fontSize: 21, color: t.text },

    stepper: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    circleButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      borderWidth: 2,
      borderColor: t.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    circleButtonText: { fontSize: 18, color: t.text, lineHeight: 20 },
    stepValue: { fontSize: 20, color: t.text, minWidth: 26, textAlign: 'center' },
  });
