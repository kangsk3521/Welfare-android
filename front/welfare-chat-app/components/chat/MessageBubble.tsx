import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Palette } from '@/constants/theme';
import { useSettings, useTheme } from '@/contexts/settings-context';
import { Message } from '@/types/chat';

// 말풍선: 내 말은 오른쪽 강조색, 챗봇 답변은 왼쪽 테두리 카드, 에러는 빨간 테두리
export function MessageBubble({ message }: { message: Message }) {
  const styles = makeStyles(useTheme());
  const { fontSize } = useSettings();

  return (
    <View style={[styles.bubble, message.isUser ? styles.myBubble : styles.botBubble, message.isError && styles.errorBubble]}>
      <Text style={[{ fontSize, lineHeight: fontSize * 1.5 }, message.isUser ? styles.myText : styles.botText]}>
        {message.text}
      </Text>
    </View>
  );
}

// 답변을 기다리는 동안 보여주는 흐린 말풍선
export function TypingBubble() {
  const styles = makeStyles(useTheme());
  const { fontSize } = useSettings();

  return (
    <View style={[styles.bubble, styles.botBubble]}>
      <Text style={[styles.botText, { fontSize, opacity: 0.6 }]}>답변을 작성하고 있어요…</Text>
    </View>
  );
}

const makeStyles = (t: Palette) =>
  StyleSheet.create({
    bubble: { maxWidth: '85%', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 18, marginTop: 12 },
    myBubble: { alignSelf: 'flex-end', backgroundColor: t.accent },
    botBubble: { alignSelf: 'flex-start', backgroundColor: t.surface, borderWidth: 2, borderColor: t.border },
    errorBubble: { borderColor: t.danger },
    myText: { color: t.onAccent },
    botText: { color: t.text },
  });
