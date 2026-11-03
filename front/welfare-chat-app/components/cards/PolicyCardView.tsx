import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Palette } from '@/constants/theme';
import { useCards } from '@/contexts/cards-context';
import { useSettings, useTheme } from '@/contexts/settings-context';
import { PolicyCard } from '@/types/chat';
import { sharePolicyCard } from '@/utils/share';

type IconName = React.ComponentProps<typeof MaterialIcons>['name'];

// 정책 카드 1장: [제목 / 대상 / 내용] + 아래 버튼 줄.
// - variant 'chat'  (대화창): [공유 | 보관 | 거절]. 거절하면 접힌 줄로 바뀌고 '다시 보기'로 되돌린다
// - variant 'saved' (보관함): [공유 | 보관 해제]
// 카드 본문을 누르면 onOpen → 확대 상세 화면
export function PolicyCardView({
  card,
  onOpen,
  variant = 'chat',
  sessionId = '',
}: {
  card: PolicyCard;
  onOpen: (card: PolicyCard) => void;
  variant?: 'chat' | 'saved';
  sessionId?: string; // 숨김은 상담방마다 따로 저장
}) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const { fontSize } = useSettings();
  const { isSaved, toggleSave, isHidden, hide, unhide } = useCards();
  const saved = isSaved(card.id);

  // 거절한 카드: 접힌 한 줄
  if (variant === 'chat' && isHidden(sessionId, card.id)) {
    return (
      <View style={styles.hiddenRow}>
        <MaterialIcons name="visibility-off" size={20} color={theme.subText} />
        <Text style={[styles.hiddenText, { fontSize: fontSize - 1 }]} numberOfLines={1}>
          숨긴 혜택 · {card.title}
        </Text>
        <Pressable onPress={() => unhide(sessionId, card.id)} hitSlop={10} accessibilityRole="button">
          <Text style={[styles.hiddenUndo, { fontSize: fontSize - 1 }]}>다시 보기</Text>
        </Pressable>
      </View>
    );
  }

  const actions: { icon: IconName; label: string; onPress: () => void; active?: boolean }[] = [
    { icon: 'ios-share', label: '공유', onPress: () => sharePolicyCard(card) },
    variant === 'chat'
      ? { icon: saved ? 'bookmark' : 'bookmark-border', label: saved ? '보관됨' : '보관', onPress: () => toggleSave(card), active: saved }
      : { icon: 'bookmark-remove', label: '보관 해제', onPress: () => toggleSave(card) },
  ];
  if (variant === 'chat') actions.push({ icon: 'block', label: '거절', onPress: () => hide(sessionId, card.id) });

  return (
    <View style={styles.card}>
      {/* 본문: 누르면 확대 상세 */}
      <Pressable
        style={({ pressed }) => [styles.body, pressed && { opacity: 0.6 }]}
        onPress={() => onOpen(card)}
        accessibilityRole="button"
        accessibilityLabel={`${card.title} 자세히 보기`}>
        <Text style={[styles.title, { fontSize: fontSize + 3 }]} numberOfLines={2}>
          {card.title}
        </Text>
        {card.target !== '' && (
          <Field label="대상" text={card.target} lines={2} fontSize={fontSize} styles={styles} />
        )}
        <Field label="내용" text={card.content || card.digest} lines={3} fontSize={fontSize} styles={styles} />
        <Text style={[styles.more, { fontSize: fontSize - 2 }]}>눌러서 자세히 보기 ›</Text>
      </Pressable>

      {/* 버튼 줄 */}
      <View style={styles.actions}>
        {actions.map((a, i) => (
          <Pressable
            key={a.label}
            style={({ pressed }) => [styles.action, i > 0 && styles.actionDivider, pressed && { opacity: 0.5 }]}
            onPress={a.onPress}
            accessibilityRole="button"
            accessibilityLabel={`${card.title} ${a.label}`}>
            <MaterialIcons name={a.icon} size={20} color={a.active ? theme.accentStrong : theme.subText} />
            <Text style={[styles.actionText, a.active && { color: theme.accentStrong, fontWeight: '700' }]}>{a.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function Field({
  label,
  text,
  lines,
  fontSize,
  styles,
}: {
  label: string;
  text: string;
  lines: number;
  fontSize: number;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { fontSize: fontSize - 1 }]}>{label}</Text>
      <Text style={[styles.fieldText, { fontSize, lineHeight: fontSize * 1.45 }]} numberOfLines={lines}>
        {text}
      </Text>
    </View>
  );
}

const makeStyles = (t: Palette) =>
  StyleSheet.create({
    card: {
      backgroundColor: t.surface,
      borderColor: t.border,
      borderWidth: 2,
      borderRadius: 18,
      overflow: 'hidden',
    },
    body: { paddingHorizontal: 18, paddingTop: 16, paddingBottom: 12, gap: 10 },
    title: { color: t.text, fontWeight: '800' },
    field: { gap: 2 },
    label: { color: t.accentStrong, fontWeight: '700' },
    fieldText: { color: t.text },
    more: { color: t.subText, textAlign: 'right' },

    actions: { flexDirection: 'row', borderTopWidth: 1.5, borderTopColor: t.border },
    action: { flex: 1, minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
    actionDivider: { borderLeftWidth: 1.5, borderLeftColor: t.border },
    actionText: { color: t.subText, fontSize: 15 },

    hiddenRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: t.border,
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    hiddenText: { flex: 1, color: t.subText },
    hiddenUndo: { color: t.accentStrong, fontWeight: '700' },
  });
