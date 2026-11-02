import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Palette } from '@/constants/theme';
import { useSettings, useTheme } from '@/contexts/settings-context';

const GUIDE_TEXT = '안녕하세요!\n복지 정책 상담 챗봇입니다.\n궁금한 복지 혜택을 편하게 물어보세요.';
const SUGGESTIONS = ['기초연금 안내', '임플란트 지원', '난방비 지원', '노인 일자리'];

// 대화창 맨 위: 안내 박스 + (대화 시작 전에만) 추천 질문 칩. 칩을 누르면 바로 질문을 보낸다
export function ChatIntro({ showSuggestions, onPick }: { showSuggestions: boolean; onPick: (question: string) => void }) {
  const styles = makeStyles(useTheme());
  const { fontSize } = useSettings();

  return (
    <View>
      <View style={styles.guideBox}>
        <Text style={[styles.guideText, { fontSize: fontSize + 3, lineHeight: (fontSize + 3) * 1.5 }]}>{GUIDE_TEXT}</Text>
      </View>
      {showSuggestions && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {SUGGESTIONS.map((s) => (
            <Pressable key={s} style={styles.chip} onPress={() => onPick(`${s} 알려줘`)} accessibilityRole="button">
              <Text style={[styles.chipText, { fontSize: fontSize + 2 }]}>#{s}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const makeStyles = (t: Palette) =>
  StyleSheet.create({
    guideBox: {
      backgroundColor: t.surface,
      borderColor: t.border,
      borderWidth: 2,
      borderRadius: 18,
      paddingHorizontal: 24,
      paddingVertical: 22,
    },
    guideText: { color: t.text },
    chipRow: { gap: 12, paddingTop: 18, paddingBottom: 8 },
    chip: { backgroundColor: t.chip, borderRadius: 24, paddingVertical: 10, paddingHorizontal: 18 },
    chipText: { color: t.subText },
  });
