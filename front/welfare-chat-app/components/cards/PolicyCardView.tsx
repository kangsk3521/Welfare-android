import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Palette } from '@/constants/theme';
import { useCards } from '@/contexts/cards-context';
import { useSettings, useTheme } from '@/contexts/settings-context';
import { PolicyCard } from '@/types/chat';
import { sharePolicyCard } from '@/utils/share';

type IconName = React.ComponentProps<typeof MaterialIcons>['name'];

// 정책 카드 1장: [제목 / 태그 / 요점 두 줄] + 아래 버튼 줄.
// - 요점: "무엇을"(금액·기간 등, 강조색 크게) / "누가". 서버 AI가 만든 한 줄 (목록 답변 카드에만 있음)
//   요점이 없는 카드(상세 답변 카드, 예전에 보관한 카드)는 한 줄 요약(digest)을 대신 보여준다
// - 긴 원문(대상·내용·신청방법)은 눌러서 여는 확대 화면에서
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

  // 작은 태그: 지원 종류(현금·바우처 등, 여러 개면 첫 번째) + 지역 정책이면 "지역 정책", 아니면 담당 부처
  const tags: { label: string; strong?: boolean }[] = [];
  const supportType = card.supportType.split(',')[0].trim();
  if (supportType) tags.push({ label: supportType });
  if (card.isLocal) tags.push({ label: '지역 정책', strong: true });
  else if (card.department) tags.push({ label: card.department });

  return (
    <View style={styles.card}>
      {/* 본문: 누르면 확대 상세 */}
      <Pressable
        style={({ pressed }) => [styles.body, pressed && { opacity: 0.6 }]}
        onPress={() => onOpen(card)}
        accessibilityRole="button"
        accessibilityLabel={`${card.title} 자세히 보기`}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { fontSize: fontSize + 4 }]} numberOfLines={2}>
            {card.title}
          </Text>
          <MaterialIcons name="chevron-right" size={fontSize + 12} color={theme.subText} />
        </View>

        {tags.length > 0 && (
          <View style={styles.tags}>
            {tags.map((tag) => (
              <Text key={tag.label} style={[styles.tag, tag.strong && styles.tagStrong, { fontSize: fontSize - 3 }]}>
                {tag.label}
              </Text>
            ))}
          </View>
        )}

        {card.what || card.who ? (
          <View style={styles.points}>
            {!!card.what && (
              <KeyLine icon="payments" text={card.what} strong fontSize={fontSize + 2} color={theme.accentStrong} styles={styles} />
            )}
            {!!card.who && <KeyLine icon="person-outline" text={card.who} fontSize={fontSize} color={theme.subText} styles={styles} />}
          </View>
        ) : (
          <Text style={[styles.summary, { fontSize, lineHeight: fontSize * 1.45 }]} numberOfLines={2}>
            {card.digest || card.content}
          </Text>
        )}
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

// 요점 한 줄: [아이콘] 글
function KeyLine({
  icon,
  text,
  strong,
  fontSize,
  color,
  styles,
}: {
  icon: IconName;
  text: string;
  strong?: boolean;
  fontSize: number;
  color: string;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={styles.keyLine}>
      <MaterialIcons name={icon} size={fontSize + 2} color={color} style={styles.keyIcon} />
      <Text
        style={[styles.keyText, strong && { color, fontWeight: '800' }, { fontSize, lineHeight: fontSize * 1.35 }]}
        numberOfLines={2}>
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
    body: { paddingHorizontal: 18, paddingTop: 16, paddingBottom: 16, gap: 10 },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    title: { flex: 1, color: t.text, fontWeight: '800' },
    tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    tag: {
      color: t.subText,
      backgroundColor: t.chip,
      borderRadius: 10,
      paddingHorizontal: 9,
      paddingVertical: 3,
      overflow: 'hidden',
    },
    tagStrong: { color: t.onAccent, backgroundColor: t.accent, fontWeight: '700' },
    points: { gap: 6, marginTop: 2 },
    keyLine: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
    keyIcon: { marginTop: 2 },
    keyText: { flex: 1, color: t.text },
    summary: { color: t.text },

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
