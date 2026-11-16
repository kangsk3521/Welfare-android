import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { PolicyCardView } from '@/components/cards/PolicyCardView';
import { PolicyDetailModal } from '@/components/cards/PolicyDetailModal';
import { Palette } from '@/constants/theme';
import { SavedCard, useCards } from '@/contexts/cards-context';
import { Session, UNTITLED, useSessions } from '@/contexts/sessions-context';
import { useSettings, useTheme } from '@/contexts/settings-context';
import { PolicyCard } from '@/types/chat';
import { confirm } from '@/utils/dialog';

type Tab = 'sessions' | 'saved';

// 날짜를 목업처럼 "26. 10. 24" 형태로
const formatDate = (time: number) => {
  const d = new Date(time);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getFullYear() % 100)}. ${pad(d.getMonth() + 1)}. ${pad(d.getDate())}`;
};

// 목록 화면: 위쪽 탭으로 [상담 목록 | 보관한 혜택]
// - 상담 목록: 카드를 누르면 그 대화로, 별을 누르면 즐겨찾기, 길게 누르면 삭제
// - 보관한 혜택: 대화창에서 '보관'한 정책 카드. 누르면 확대 상세
export default function ListScreen() {
  const theme = useTheme();
  const { fontSize } = useSettings();
  const { sessions, currentId, newSession, selectSession, toggleStar, removeSession } = useSessions();
  const { saved } = useCards();
  const router = useRouter();
  const styles = makeStyles(theme);
  const [tab, setTab] = useState<Tab>('sessions');
  const [openedCard, setOpenedCard] = useState<PolicyCard | null>(null);

  // 즐겨찾기 먼저, 그 안에서는 최신순
  const sorted = [...sessions].sort(
    (a, b) => Number(b.starred) - Number(a.starred) || b.createdAt - a.createdAt
  );

  const openSession = (id: string) => {
    selectSession(id);
    router.dismissTo('/chat');
  };

  const startNew = () => openSession(newSession());

  const askDelete = async (session: Session) => {
    if (await confirm(`'${session.title}' 상담을 목록에서 지울까요?`, '삭제')) removeSession(session.id);
  };

  // 별 버튼과 카드 버튼을 나란히 둔다 (버튼 안에 버튼을 넣으면 웹에서 오류)
  const renderItem = ({ item }: { item: Session }) => (
    <View style={[styles.card, item.starred && styles.cardStarred, item.id === currentId && styles.cardCurrent]}>
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

  const tabs: { key: Tab; label: string }[] = [
    { key: 'sessions', label: '상담 목록' },
    { key: 'saved', label: `보관한 혜택 ${saved.length}` },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.tabs} accessibilityRole="tablist">
        {tabs.map((t) => (
          <Pressable
            key={t.key}
            style={[styles.tab, tab === t.key && styles.tabActive]}
            onPress={() => setTab(t.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === t.key }}>
            <Text style={[styles.tabText, { fontSize: fontSize + 1 }, tab === t.key && styles.tabTextActive]}>
              {t.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {tab === 'sessions' ? (
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
      ) : (
        <FlatList
          data={saved}
          keyExtractor={(item: SavedCard) => item.card.id}
          renderItem={({ item }) => <PolicyCardView card={item.card} onOpen={setOpenedCard} variant="saved" />}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={[styles.empty, { fontSize: fontSize + 1 }]}>
              아직 보관한 혜택이 없어요.{'\n'}대화창의 혜택 카드에서 &apos;보관&apos;을 눌러 보세요.
            </Text>
          }
        />
      )}

      <PolicyDetailModal card={openedCard} onClose={() => setOpenedCard(null)} />
    </View>
  );
}

const makeStyles = (t: Palette) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: t.background },
    tabs: {
      flexDirection: 'row',
      marginHorizontal: 20,
      marginTop: 16,
      padding: 4,
      backgroundColor: t.chip,
      borderRadius: 16,
    },
    tab: { flex: 1, minHeight: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    tabActive: { backgroundColor: t.surface, borderWidth: 1.5, borderColor: t.border },
    tabText: { color: t.subText },
    tabTextActive: { color: t.text, fontWeight: '700' },
    empty: { color: t.subText, textAlign: 'center', marginTop: 40, lineHeight: 26 },
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
    cardStarred: { backgroundColor: t.starBg },
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
