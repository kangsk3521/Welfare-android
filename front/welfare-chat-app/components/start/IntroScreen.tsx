import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React, { useEffect, useRef, useState } from 'react';
import { Animated as RNAnimated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated';

import { BRAND } from '@/constants/brand';
import { Palette } from '@/constants/theme';
import { useTheme } from '@/contexts/settings-context';

const SHOW_MS = 1800; // 오프닝을 보여주는 시간
const FADE_MS = 400; // 사라지는 시간

// 앱을 켜면 처음 약 2초 동안 대화창 위를 덮는 오프닝 화면 (로고 → 앱 이름 → 팀 이름 순서로 나타남).
// 덮고 있는 동안 뒤에서는 대화창이 미리 준비된다. 화면을 누르면 바로 넘어간다.
export function IntroScreen({ onFinish }: { onFinish: () => void }) {
  const theme = useTheme();
  const styles = makeStyles(theme);

  // 사라지는 효과는 React Native 기본 Animated로 한다.
  // (Reanimated의 exiting은 웹에서 화면을 복제하면서 안쪽 등장 애니메이션을 처음부터 다시 재생해 로고가 작아지는 문제가 있음)
  const [opacity] = useState(() => new RNAnimated.Value(1)); // 처음 한 번만 만들어 계속 쓴다
  const finishing = useRef(false);
  const finish = () => {
    if (finishing.current) return; // 타이머와 누르기가 겹쳐도 한 번만
    finishing.current = true;
    RNAnimated.timing(opacity, { toValue: 0, duration: FADE_MS, useNativeDriver: Platform.OS !== 'web' }).start(onFinish);
  };

  // 시간은 "화면에 실제로 그려진 순간"(onLayout)부터 잰다.
  // 앱 코드가 시작된 뒤 화면이 그려지기까지 시간이 걸려서, 시작 즉시 재면 오프닝이 짧게 보인다.
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTimer = () => {
    if (!timer.current) timer.current = setTimeout(finish, SHOW_MS);
  };
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  return (
    <RNAnimated.View style={[styles.overlay, { opacity }]} onLayout={startTimer}>
      <Pressable
        style={styles.fill}
        onPress={finish}
        accessibilityRole="button"
        accessibilityLabel={`${BRAND.appName}, 팀 ${BRAND.teamName}. 누르면 시작합니다`}>
        <View style={styles.center}>
          <Animated.View entering={ZoomIn.duration(500)} style={styles.logo}>
            <MaterialIcons name="chat-bubble" size={56} color={theme.onAccent} />
            <MaterialIcons name="favorite" size={22} color={theme.accent} style={styles.logoHeart} />
          </Animated.View>
          <Animated.Text entering={FadeInDown.delay(250).duration(500)} style={styles.appName}>
            {BRAND.appName}
          </Animated.Text>
          <Animated.Text entering={FadeInDown.delay(400).duration(500)} style={styles.tagline}>
            {BRAND.tagline}
          </Animated.Text>
        </View>

        <Animated.View entering={FadeIn.delay(700).duration(500)} style={styles.team}>
          <Text style={styles.teamLabel}>Team</Text>
          <Text style={styles.teamName}>{BRAND.teamName}</Text>
        </Animated.View>
      </Pressable>
    </RNAnimated.View>
  );
}

const makeStyles = (t: Palette) =>
  StyleSheet.create({
    // 화면 전체를 덮는다
    overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: t.background, zIndex: 10 },
    fill: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
    center: { alignItems: 'center', gap: 14 },
    logo: {
      width: 112,
      height: 112,
      borderRadius: 32,
      backgroundColor: t.accent,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 10,
    },
    logoHeart: { position: 'absolute', top: 40 }, // 말풍선 안의 하트
    appName: { fontSize: 30, fontWeight: '800', color: t.text, textAlign: 'center' },
    tagline: { fontSize: 17, color: t.subText, textAlign: 'center' },
    team: { position: 'absolute', bottom: 64, alignItems: 'center' },
    teamLabel: { fontSize: 13, color: t.subText, letterSpacing: 2 },
    teamName: { fontSize: 24, fontWeight: '800', color: t.accentStrong, letterSpacing: 6 },
  });
