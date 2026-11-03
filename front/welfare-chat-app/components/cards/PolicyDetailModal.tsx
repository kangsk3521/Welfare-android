import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { BlurView } from 'expo-blur';
import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';

import { Palette } from '@/constants/theme';
import { useCards } from '@/contexts/cards-context';
import { useSettings, useTheme } from '@/contexts/settings-context';
import { PolicyCard } from '@/types/chat';
import { sharePolicyCard } from '@/utils/share';

// 카드를 눌렀을 때: 뒤 화면을 흐리게(블러) 하고, 카드를 확대해 정책 전체 내용을 보여준다.
// 바깥(흐린 부분)이나 X를 누르면 닫힌다. card가 null이면 닫힌 상태.
export function PolicyDetailModal({ card, onClose }: { card: PolicyCard | null; onClose: () => void }) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const { fontSize } = useSettings();
  const { isSaved, toggleSave } = useCards();

  return (
    <Modal visible={card !== null} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      {/* 뒤 배경: 블러 + 살짝 어둡게. 누르면 닫힘 */}
      <BlurView intensity={30} tint="light" style={StyleSheet.absoluteFill} />
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="닫기" />

      {card && (
        <View style={styles.center}>
          <Animated.View entering={ZoomIn.duration(220)} style={styles.sheet}>
            <View style={styles.header}>
              <Text style={[styles.title, { fontSize: fontSize + 5 }]}>{card.title}</Text>
              <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="닫기">
                <MaterialIcons name="close" size={28} color={theme.text} />
              </Pressable>
            </View>

            {(card.department !== '' || card.supportType !== '') && (
              <View style={styles.tags}>
                {card.department !== '' && <Text style={styles.tag}>{card.department}</Text>}
                {card.supportType !== '' && <Text style={styles.tag}>{card.supportType}</Text>}
              </View>
            )}

            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
              <Section label="대상" text={card.target} fontSize={fontSize} styles={styles} />
              <Section label="내용" text={card.content || card.digest} fontSize={fontSize} styles={styles} />
              <Section label="신청 방법" text={card.applyMethod} fontSize={fontSize} styles={styles} />
              <Text style={[styles.notice, { fontSize: fontSize - 2 }]}>
                ※ AI가 찾아드린 정보예요. 정확한 자격과 신청은 담당 기관이나 주민센터에서 꼭 확인하세요.
              </Text>
            </ScrollView>

            <View style={styles.footer}>
              <Pressable style={styles.footerButton} onPress={() => sharePolicyCard(card)} accessibilityRole="button">
                <MaterialIcons name="ios-share" size={20} color={theme.onAccent} />
                <Text style={styles.footerText}>공유</Text>
              </Pressable>
              <Pressable
                style={[styles.footerButton, styles.footerButtonAlt]}
                onPress={() => toggleSave(card)}
                accessibilityRole="button">
                <MaterialIcons name={isSaved(card.id) ? 'bookmark' : 'bookmark-border'} size={20} color={theme.onAccent} />
                <Text style={styles.footerText}>{isSaved(card.id) ? '보관됨' : '보관'}</Text>
              </Pressable>
            </View>
          </Animated.View>
        </View>
      )}
    </Modal>
  );
}

// 내용이 없는 항목(지자체 정책의 신청방법 등)은 안내 문구로 대신한다
function Section({
  label,
  text,
  fontSize,
  styles,
}: {
  label: string;
  text: string;
  fontSize: number;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={styles.section}>
      <Text style={[styles.label, { fontSize }]}>{label}</Text>
      <Text style={[text ? styles.body : styles.empty, { fontSize: fontSize + 1, lineHeight: (fontSize + 1) * 1.55 }]}>
        {text || '자세한 내용은 담당 기관에 문의해 주세요.'}
      </Text>
    </View>
  );
}

const makeStyles = (t: Palette) =>
  StyleSheet.create({
    backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(59, 47, 35, 0.18)' },
    // 카드 밖(흐린 부분) 터치는 뒤의 backdrop으로 통과 → 닫힘
    center: { ...StyleSheet.absoluteFill, justifyContent: 'center', alignItems: 'center', padding: 18, pointerEvents: 'box-none' },
    sheet: {
      width: '100%',
      maxWidth: 520,
      maxHeight: '84%',
      backgroundColor: t.surface,
      borderColor: t.border,
      borderWidth: 2,
      borderRadius: 22,
      overflow: 'hidden',
      // 떠 있는 느낌의 그림자
      shadowColor: '#000',
      shadowOpacity: 0.18,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 8 },
      elevation: 10,
    },
    header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 22, paddingTop: 20 },
    title: { flex: 1, color: t.text, fontWeight: '800' },
    tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 22, paddingTop: 10 },
    tag: {
      color: t.subText,
      backgroundColor: t.chip,
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 4,
      fontSize: 14,
      overflow: 'hidden',
    },
    scroll: { flexGrow: 0 },
    scrollContent: { paddingHorizontal: 22, paddingVertical: 16, gap: 18 },
    section: { gap: 6 },
    label: { color: t.accentStrong, fontWeight: '800' },
    body: { color: t.text },
    empty: { color: t.subText },
    notice: { color: t.subText },
    footer: { flexDirection: 'row', gap: 10, padding: 16, borderTopWidth: 1.5, borderTopColor: t.border },
    footerButton: {
      flex: 1,
      minHeight: 50,
      borderRadius: 25,
      backgroundColor: t.accent,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    footerButtonAlt: { backgroundColor: t.accentStrong },
    footerText: { color: t.onAccent, fontSize: 17, fontWeight: '700' },
  });
