import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BirthYearInput } from '@/components/profile/BirthYearInput';
import { RegionPicker } from '@/components/profile/RegionPicker';
import { BRAND } from '@/constants/brand';
import { Palette } from '@/constants/theme';
import { useProfile } from '@/contexts/profile-context';
import { useSettings, useTheme } from '@/contexts/settings-context';
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';

type IconName = React.ComponentProps<typeof MaterialIcons>['name'];

const POINTS: { icon: IconName; text: string }[] = [
  { icon: 'smart-toy', text: `${BRAND.appName}은 AI 챗봇이에요. 답변은 참고용이고, 정확한 자격은 담당 기관에서 확인해 주세요.` },
  { icon: 'person-search', text: '나이와 사는 곳을 알려주시면 받을 수 있는 혜택을 더 정확하게 찾아드려요.' },
  { icon: 'lock', text: '입력한 정보는 이 휴대폰에만 암호화해서 저장돼요. 서버에는 저장하지 않아요.' },
  { icon: 'send', text: '상담할 때만 맞춤 추천을 위해 함께 보내져요.' },
  { icon: 'edit', text: '언제든 설정에서 바꾸거나 지울 수 있고, 입력하지 않아도 앱을 쓸 수 있어요.' },
];

// 처음 한 번만 보이는 안내: ① 안내·동의 → ② 나이·사는 곳 입력. 어느 단계에서든 건너뛸 수 있다.
// 오프닝 화면 바로 아래에 깔려 있다가, 오프닝이 사라지면 보인다.
export function OnboardingScreen() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const { fontSize } = useSettings();
  const { profile, updateProfile, finishOnboarding } = useProfile();
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();
  const [step, setStep] = useState<'consent' | 'input'>('consent');

  // 입력 단계에서 고른 값은 "시작하기"를 눌렀을 때만 저장한다 (건너뛰면 저장 안 함)
  const [birthYear, setBirthYear] = useState<number | null>(profile.birthYear);
  const [province, setProvince] = useState<string | null>(profile.province);
  const [district, setDistrict] = useState<string | null>(profile.district);

  const save = () => {
    if (birthYear || province) updateProfile({ birthYear, province, district });
    finishOnboarding();
  };

  return (
    <Animated.View
      style={[styles.overlay, { paddingTop: insets.top + 24, paddingBottom: Math.max(insets.bottom, keyboardHeight) + 16 }]}
      exiting={FadeOut.duration(250)}>
      {step === 'consent' ? (
        <Animated.View key="consent" entering={FadeIn.duration(250)} style={styles.flex}>
          <ScrollView contentContainerStyle={styles.scroll}>
            <Text style={[styles.title, { fontSize: fontSize + 11 }]}>시작하기 전에{'\n'}알려드릴게요</Text>
            <View style={styles.points}>
              {POINTS.map((p) => (
                <View key={p.text} style={styles.point}>
                  <View style={styles.pointIcon}>
                    <MaterialIcons name={p.icon} size={22} color={theme.accentStrong} />
                  </View>
                  <Text style={[styles.pointText, { fontSize: fontSize + 2, lineHeight: (fontSize + 2) * 1.5 }]}>{p.text}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
          <View style={styles.buttons}>
            <Pressable style={styles.primary} onPress={() => setStep('input')} accessibilityRole="button">
              <Text style={[styles.primaryText, { fontSize: fontSize + 3 }]}>동의하고 내 정보 입력하기</Text>
            </Pressable>
            <Pressable style={styles.secondary} onPress={finishOnboarding} accessibilityRole="button">
              <Text style={[styles.secondaryText, { fontSize: fontSize + 1 }]}>나중에 할게요</Text>
            </Pressable>
          </View>
        </Animated.View>
      ) : (
        <Animated.View key="input" entering={FadeIn.duration(250)} style={styles.flex}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <Text style={[styles.title, { fontSize: fontSize + 9 }]}>내 정보 입력</Text>
            <Text style={[styles.sub, { fontSize: fontSize + 1 }]}>모르거나 원하지 않는 항목은 비워 두셔도 돼요.</Text>

            <View style={styles.section}>
              <Text style={[styles.label, { fontSize: fontSize + 3 }]}>태어난 해</Text>
              <BirthYearInput value={birthYear} onChange={setBirthYear} />
            </View>

            <View style={styles.section}>
              <Text style={[styles.label, { fontSize: fontSize + 3 }]}>사는 곳</Text>
              <RegionPicker
                province={province}
                district={district}
                onChange={(p, d) => {
                  setProvince(p);
                  setDistrict(d);
                }}
              />
            </View>
          </ScrollView>
          <View style={styles.buttons}>
            <Pressable style={styles.primary} onPress={save} accessibilityRole="button">
              <Text style={[styles.primaryText, { fontSize: fontSize + 3 }]}>시작하기</Text>
            </Pressable>
            <Pressable style={styles.secondary} onPress={finishOnboarding} accessibilityRole="button">
              <Text style={[styles.secondaryText, { fontSize: fontSize + 1 }]}>건너뛰기</Text>
            </Pressable>
          </View>
        </Animated.View>
      )}
    </Animated.View>
  );
}

const makeStyles = (t: Palette) =>
  StyleSheet.create({
    // 화면 전체를 덮는다 (오프닝 화면보다 한 단계 아래)
    overlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 9,
      backgroundColor: t.background,
      paddingHorizontal: 24,
    },
    flex: { flex: 1 },
    scroll: { gap: 22, paddingBottom: 16 },
    title: { color: t.text, fontWeight: '800', lineHeight: undefined },
    sub: { color: t.subText, marginTop: -8 },
    points: { gap: 16 },
    point: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
    pointIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: t.chip,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pointText: { flex: 1, color: t.text },
    section: {
      gap: 12,
      backgroundColor: t.surface,
      borderColor: t.border,
      borderWidth: 2,
      borderRadius: 18,
      padding: 18,
    },
    label: { color: t.text, fontWeight: '700' },
    buttons: { gap: 10, paddingTop: 12 },
    primary: { minHeight: 56, borderRadius: 28, backgroundColor: t.accent, alignItems: 'center', justifyContent: 'center' },
    primaryText: { color: t.onAccent, fontWeight: '800' },
    secondary: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
    secondaryText: { color: t.subText, textDecorationLine: 'underline' },
  });
