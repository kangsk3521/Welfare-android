import { BlurView } from 'expo-blur';
import { useEffect, useRef } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';

import { MASCOT } from '@/constants/mascot';
import { Palette } from '@/constants/theme';
import { useSettings, useTheme } from '@/contexts/settings-context';
import { VoicePhase } from '@/hooks/useVoiceRecorder';

// 마이크를 누르면 화면 가운데 뜨는 음성 창.
// 말하는 동안 알아들은 글자를 크게 보여주고, [다 말했어요]를 누르면 바로 전송된다.
// 바깥을 눌러도 닫히지 않는다 (말하다가 실수로 닫히지 않게). 안드로이드 뒤로가기는 취소.
const TITLE: Record<Exclude<VoicePhase, 'idle'>, string> = {
  connecting: '준비하고 있어요…',
  listening: '듣고 있어요',
  finishing: '보내는 중이에요…',
};

export function VoiceModal({
  phase,
  text,
  onDone,
  onCancel,
}: {
  phase: VoicePhase;
  text: string; // 지금까지 알아들은 말
  onDone: () => void; // 다 말했어요 → 전송
  onCancel: () => void;
}) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const { fontSize } = useSettings();
  const scrollRef = useRef<ScrollView>(null);

  // 듣는 동안 마스코트 뒤 원이 천천히 커졌다 작아진다 (움직임 줄이기 설정이면 멈춤)
  const reduceMotion = useReducedMotion();
  const pulse = useSharedValue(1);
  const listening = phase === 'listening';
  useEffect(() => {
    if (listening && !reduceMotion) {
      pulse.value = withRepeat(withTiming(1.25, { duration: 700 }), -1, true);
    } else {
      cancelAnimation(pulse);
      pulse.value = withTiming(1, { duration: 150 });
    }
  }, [listening, reduceMotion, pulse]);
  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  if (phase === 'idle') return null;

  const placeholder = phase === 'connecting' ? '잠시만 기다려 주세요' : '말씀해 주세요';
  const bigSize = fontSize + 8;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onCancel} statusBarTranslucent>
      <BlurView intensity={30} tint="light" style={StyleSheet.absoluteFill} />
      <View style={styles.backdrop} />

      <View style={styles.center}>
        <Animated.View entering={ZoomIn.duration(200)} style={styles.sheet}>
          <View style={styles.micArea}>
            <Animated.View style={[styles.pulse, listening && styles.pulseActive, pulseStyle]} />
            <Image source={MASCOT.listen} style={styles.mascot} resizeMode="contain" accessible={false} />
          </View>

          <Text style={[styles.title, { fontSize: fontSize + 2 }]} accessibilityLiveRegion="polite">
            {TITLE[phase]}
          </Text>

          {/* 알아들은 말: 크게, 길어지면 창 안에서 스크롤하고 항상 마지막 줄이 보이게 */}
          <ScrollView
            ref={scrollRef}
            style={styles.textBox}
            contentContainerStyle={styles.textBoxContent}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}>
            <Text
              style={[
                text ? styles.text : styles.placeholder,
                { fontSize: bigSize, lineHeight: Math.round(bigSize * 1.45) },
              ]}>
              {text || placeholder}
            </Text>
          </ScrollView>

          <View style={styles.buttons}>
            <Pressable style={[styles.button, styles.cancel]} onPress={onCancel} accessibilityRole="button">
              <Text style={[styles.cancelText, { fontSize }]}>취소</Text>
            </Pressable>
            <Pressable
              style={[styles.button, styles.done, !listening && styles.disabled]}
              onPress={onDone}
              disabled={!listening}
              accessibilityRole="button"
              accessibilityState={{ disabled: !listening }}>
              <Text style={[styles.doneText, { fontSize }]}>다 말했어요</Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const MIC = 72;

const makeStyles = (t: Palette) =>
  StyleSheet.create({
    backdrop: { ...StyleSheet.absoluteFill, backgroundColor: t.overlay },
    center: { ...StyleSheet.absoluteFill, justifyContent: 'center', alignItems: 'center', padding: 18 },
    sheet: {
      width: '100%',
      maxWidth: 520,
      backgroundColor: t.surface,
      borderColor: t.border,
      borderWidth: 2,
      borderRadius: 22,
      paddingHorizontal: 22,
      paddingTop: 26,
      paddingBottom: 18,
      alignItems: 'center',
      gap: 14,
      shadowColor: t.shadow,
      shadowOpacity: 0.18,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 8 },
      elevation: 10,
    },
    micArea: { width: MIC * 1.8, height: MIC * 1.8, justifyContent: 'center', alignItems: 'center' },
    pulse: {
      position: 'absolute',
      width: MIC * 1.4,
      height: MIC * 1.4,
      borderRadius: MIC * 0.7,
      backgroundColor: t.chip,
    },
    pulseActive: { backgroundColor: t.recording, opacity: 0.22 },
    mascot: { width: MIC * 1.6, height: MIC * 1.6 },
    title: { color: t.subText, fontWeight: '700' },
    textBox: { alignSelf: 'stretch', maxHeight: 240, minHeight: 110 },
    textBoxContent: { flexGrow: 1, justifyContent: 'center', paddingVertical: 6 },
    text: { color: t.text, fontWeight: '700', textAlign: 'center' },
    placeholder: { color: t.subText, textAlign: 'center' },
    buttons: { flexDirection: 'row', gap: 10, alignSelf: 'stretch', marginTop: 4 },
    button: { flex: 1, minHeight: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center' },
    cancel: { borderWidth: 1.5, borderColor: t.border, backgroundColor: t.surface },
    cancelText: { color: t.text, fontWeight: '700' },
    done: { flex: 1.6, backgroundColor: t.accent },
    doneText: { color: t.onAccent, fontWeight: '800' },
    disabled: { opacity: 0.45 },
  });
