import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import React from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { Palette } from '@/constants/theme';
import { Session, UNTITLED, useSessions } from '@/contexts/sessions-context';
import { useSettings, useTheme } from '@/contexts/settings-context';
import { confirm } from '@/utils/dialog';

// 날짜를 목업처럼 "26. 10. 24" 형태로
const formatDate = (time: number) => {
  const d = new Date(time);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getFullYear() % 100)}. ${pad(d.getMonth() + 1)}. ${pad(d.getDate())}`;
};

// 상담 목록: 카드를 누르면 그 대화로, 별을 누르면 즐겨찾기, 길게 누르면 삭제
export default function ListScreen() {
  const theme = useTheme();
  const { fontSize } = useSettings();
  const { sessions, currentId, newSession, selectSession, toggleStar, removeSession } = useSessions();
  const router = useRouter();
  const styles = makeStyles(theme);

  // 즐겨찾기 먼저, 그 안에서는 최신순
  const sorted = [...sessions].sort(
    (a, b) => Number(b.starred) - Number(a.starred) || b.createdAt - a.createdAt
  );

  const openSession = (id: string) => {
    selectSession(id);
    router.dismissTo('/chat/chat');
  };

  const startNew = () => openSession(newSession());

  const askDelete = async (session: Session) => {
    if (await confirm(`'${session.title}' 상담을 목록에서 지울까요?`, '삭제')) removeSession(session.id);
  };

  // 별 버튼과 카드 버튼을 나란히 둔다 (버튼 안에 버튼을 넣으면 웹에서 오류)
  const renderItem = ({ item }: { item: Session }) => (
    <View style={[styles.card, item.id === currentId && styles.cardCurrent]}>
      <Pressable
        style={styles.starButton}
        onPress={() => toggleStar(item.id)}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={item.starred ? '즐겨찾기 해제' : '즐겨찾기'}>
        <MaterialIcons name="star" size={30} color={item.starred ? theme.star : theme.starOff} />
      </Pressable>
      <Pressable
        style={({ pressed }) => [styles.cardBody, pressed && { opacity: 0.6 }]}
        onPress={() => openSession(item.id)}
        onLongPress={() => askDelete(item)}
        accessibilityRole="button"
        accessibilityLabel={`${item.title} 상담 열기`}>
        <Text
          style={[styles.title, { fontSize: fontSize + 5 }, item.title === UNTITLED && { color: theme.subText }]}
          numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={[styles.date, { fontSize: fontSize + 2 }]}>{formatDate(item.createdAt)}</Text>
      </Pressable>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={sorted}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListFooterComponent={
          <Pressable style={styles.addCard} onPress={startNew} accessibilityRole="button">
            <Text style={[styles.addText, { fontSize: fontSize + 3 }]}>+ 새 상담</Text>
          </Pressable>
        }
      />
    </View>
  );
}

const makeStyles = (t: Palette) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: t.background },
    listContent: { padding: 20, gap: 16 },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: t.surface,
      borderColor: t.border,
      borderWidth: 2,
      borderRadius: 18,
      paddingLeft: 18,
    },
    cardCurrent: { borderColor: t.accent },
    starButton: { paddingVertical: 20, paddingRight: 14 },
    cardBody: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 20, paddingRight: 20 },
    title: { flex: 1, color: t.text },
    date: { color: t.subText },
    addCard: {
      borderColor: t.border,
      borderWidth: 2,
      borderStyle: 'dashed',
      borderRadius: 18,
      paddingVertical: 18,
      alignItems: 'center',
    },
    addText: { color: t.accentStrong, fontWeight: '700' },
  });
