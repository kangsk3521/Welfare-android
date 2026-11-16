import { Image, StyleSheet, Text, View } from 'react-native';

import { MASCOT, MascotKind } from '@/constants/mascot';
import { Palette } from '@/constants/theme';
import { useSettings, useTheme } from '@/contexts/settings-context';

// 마스코트가 위에 올라앉은 안내 말풍선 (디자인 시안의 ai-head)
//   (마스코트)
//   ┌────────────────────┐
//   │ 복지정보를 찾았어요! │  ← 굵게
//   │ 아래의 정보를 확인해주세요. │
//   └────────────────────┘
export function MascotHeader({ kind, title, subtitle }: { kind: MascotKind; title: string; subtitle: string }) {
  const styles = makeStyles(useTheme());
  const { fontSize } = useSettings();

  return (
    <View style={styles.wrap} accessible accessibilityLabel={`${title} ${subtitle}`}>
      <Image source={MASCOT[kind]} style={styles.mascot} resizeMode="contain" accessible={false} />
      <View style={styles.bubble}>
        <Text style={[styles.title, { fontSize: fontSize + 3, lineHeight: (fontSize + 3) * 1.4 }]}>{title}</Text>
        <Text style={[styles.subtitle, { fontSize, lineHeight: fontSize * 1.5 }]}>{subtitle}</Text>
      </View>
    </View>
  );
}

const MASCOT_SIZE = 90;
const OVERLAP = 12; // 마스코트 아랫부분이 말풍선 위 테두리에 걸치는 높이

const makeStyles = (t: Palette) =>
  StyleSheet.create({
    // 마스코트가 말풍선 위로 튀어나오는 만큼 위쪽 여백
    wrap: { alignSelf: 'flex-start', maxWidth: '85%', marginTop: MASCOT_SIZE - OVERLAP + 12 },
    mascot: { position: 'absolute', left: 0, top: -(MASCOT_SIZE - OVERLAP), width: MASCOT_SIZE, height: MASCOT_SIZE, zIndex: 1 },
    bubble: {
      backgroundColor: t.head,
      borderColor: t.border,
      borderWidth: 2,
      borderRadius: 18,
      borderTopLeftRadius: 0,
      paddingVertical: 12,
      paddingHorizontal: 16,
    },
    title: { color: t.text, fontWeight: '700' },
    subtitle: { color: t.text },
  });
