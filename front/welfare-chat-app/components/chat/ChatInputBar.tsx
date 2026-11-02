import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React, { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';

import { Palette, webNoOutline } from '@/constants/theme';
import { useSettings, useTheme } from '@/contexts/settings-context';

const MAX_LINES = 5; // 입력칸이 늘어나는 최대 줄 수. 넘으면 칸 안에서 스크롤

// 하단 입력줄: [+ 입력칸] [전송] [공유]
// - 글자 수에 맞춰 입력칸이 위로 늘어난다 (최대 5줄)
// - 입력칸을 선택하면 공유 버튼이 사라지고 입력칸이 넓어진다 (onFocusChange로 화면에도 알림 → 마이크도 숨김)
// - 웹: Enter = 전송, Shift+Enter = 줄바꿈
export function ChatInputBar({
  value,
  onChangeText,
  onSend,
  isSending,
  onShare,
  onFocusChange,
}: {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  isSending: boolean;
  onShare: () => void;
  onFocusChange: (focused: boolean) => void;
}) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const { fontSize } = useSettings();
  const inputRef = useRef<TextInput>(null);

  // ----- 선택 상태
  // 선택 해제는 0.2초 늦게 반영: 웹에서 전송 버튼을 누르면 선택이 먼저 풀리는데,
  // 바로 공유 버튼이 다시 나타나면 전송 버튼이 밀려나서 클릭이 빗나가기 때문.
  const [isFocused, setIsFocused] = useState(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const setFocused = (focused: boolean) => {
    setIsFocused(focused);
    onFocusChange(focused);
  };
  const handleFocus = () => {
    if (blurTimer.current) clearTimeout(blurTimer.current);
    setFocused(true);
  };
  const handleBlur = () => {
    blurTimer.current = setTimeout(() => setFocused(false), 200);
  };
  useEffect(
    () => () => {
      if (blurTimer.current) clearTimeout(blurTimer.current);
    },
    []
  );

  // ----- 입력칸 높이: 한 줄에서 시작해 글자 수만큼 늘어나고, 최대 줄 수를 넘으면 칸 안에서 스크롤
  const inputFontSize = fontSize + 2;
  const lineHeight = Math.round(inputFontSize * 1.4);
  const maxHeight = lineHeight * MAX_LINES;
  const [contentHeight, setContentHeight] = useState(0);
  // 비어 있으면(전송 직후 등) 바로 한 줄 높이로
  const boxHeight = value ? Math.min(Math.max(contentHeight, lineHeight), maxHeight) : lineHeight;

  const handleChangeText = (text: string) => {
    onChangeText(text);
    // 웹은 내용 높이를 직접 잰다: 높이를 잠깐 0으로 줄여야 글자를 지웠을 때도 줄어든 높이가 나온다
    if (Platform.OS === 'web') {
      const el = inputRef.current as unknown as HTMLTextAreaElement | null;
      if (el) {
        const prev = el.style.height;
        el.style.height = '0px';
        setContentHeight(el.scrollHeight);
        el.style.height = prev;
      }
    }
  };

  // 웹: Enter = 전송, Shift+Enter = 줄바꿈. 한글 조합 중에 누른 Enter는 무시 (마지막 글자가 두 번 들어가는 문제 방지)
  const handleWebEnter = (e: any) => {
    if (Platform.OS !== 'web') return;
    const ne = e.nativeEvent;
    if (ne.key === 'Enter' && !ne.shiftKey && !ne.isComposing && ne.keyCode !== 229) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <View style={styles.bar}>
      {/* 입력칸·전송 버튼은 공유 버튼이 사라지거나 생길 때 자리를 부드럽게 옮긴다 */}
      <Animated.View style={styles.pillWrap} layout={LinearTransition.duration(200)}>
        {/* 칸 어디를 눌러도 입력이 시작되게 */}
        <Pressable style={styles.pill} onPress={() => inputRef.current?.focus()} accessible={false}>
          <MaterialIcons name="add" size={30} color={theme.subText} />
          <TextInput
            ref={inputRef}
            multiline
            underlineColorAndroid="transparent" // 안드로이드 기본 밑줄 없애기
            style={[styles.input, { fontSize: inputFontSize, lineHeight, height: boxHeight }, webNoOutline]}
            value={value}
            onChangeText={handleChangeText}
            onContentSizeChange={(e) => {
              if (Platform.OS !== 'web') setContentHeight(e.nativeEvent.contentSize.height);
            }}
            onKeyPress={handleWebEnter}
            scrollEnabled={!!value && contentHeight > maxHeight}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder="메시지 입력창"
            placeholderTextColor={theme.subText}
          />
        </Pressable>
      </Animated.View>

      <Animated.View layout={LinearTransition.duration(200)}>
        <Pressable
          style={[styles.sendButton, isSending && { opacity: 0.6 }]}
          onPress={onSend}
          disabled={isSending}
          accessibilityRole="button"
          accessibilityLabel="보내기">
          <MaterialIcons name="send" size={28} color={theme.onAccent} style={{ transform: [{ rotate: '-30deg' }] }} />
        </Pressable>
      </Animated.View>

      {!isFocused && (
        <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)}>
          <Pressable style={styles.shareButton} onPress={onShare} accessibilityRole="button" accessibilityLabel="대화 공유">
            <Text style={styles.shareText}>공유</Text>
          </Pressable>
        </Animated.View>
      )}
    </View>
  );
}

const makeStyles = (t: Palette) =>
  StyleSheet.create({
    bar: {
      flexDirection: 'row',
      alignItems: 'flex-end', // 입력칸이 여러 줄로 커져도 전송·공유 버튼은 아래에 붙어 있게
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 28,
      gap: 10,
    },
    pillWrap: { flex: 1 },
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: t.surface,
      borderColor: t.border,
      borderWidth: 2,
      borderRadius: 29,
      paddingHorizontal: 14,
      paddingVertical: 12,
      minHeight: 58, // 한 줄일 땐 전송 버튼과 같은 높이, 여러 줄이면 늘어남
      gap: 8,
    },
    input: {
      flex: 1,
      minWidth: 0, // 웹 입력창의 기본 최소 너비(약 20글자) 때문에 칸 밖으로 삐져나가는 것 방지
      color: t.text,
      paddingTop: 0,
      paddingBottom: 0,
      textAlignVertical: 'top', // 안드로이드 여러 줄 입력에서 글자가 위부터 차도록
    },
    sendButton: {
      backgroundColor: t.accent,
      width: 58,
      height: 58,
      borderRadius: 29,
      justifyContent: 'center',
      alignItems: 'center',
    },
    shareButton: {
      backgroundColor: t.accentStrong,
      height: 58,
      paddingHorizontal: 20,
      borderRadius: 32,
      justifyContent: 'center',
    },
    shareText: { color: t.onAccent, fontSize: 18, fontWeight: '700' },
  });
