import { StyleSheet, View } from 'react-native';

import { PolicyCardView } from '@/components/cards/PolicyCardView';
import { MascotHeader } from '@/components/chat/MascotHeader';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { MascotKind } from '@/constants/mascot';
import { Message, PolicyCard } from '@/types/chat';

// 답변 종류(서버 reply_type)별 마스코트 안내. showText: 서버가 보낸 글도 아래 말풍선으로 보여줄지
const HEADERS: Record<string, { kind: MascotKind; title: string; subtitle: string; showText: boolean }> = {
  // 정책 목록: 정책 내용은 카드로 보여주므로 AI 소개 글은 숨긴다
  list: { kind: 'success', title: '복지정보를 찾았어요!', subtitle: '아래의 정보를 확인해주세요.', showText: false },
  // 정책 1개 자세히: 물어본 것(신청 방법 등)에 대한 답이 글에 있으므로 보여준다
  detail: { kind: 'success', title: '복지정보를 찾았어요!', subtitle: '아래의 정보를 확인해주세요.', showText: true },
  ask: { kind: 'fail', title: '정보가 더 필요해요!', subtitle: '아래의 정보를 말해주세요.', showText: true },
  no_result: {
    kind: 'fail',
    title: '복지정보를 찾지 못했어요',
    subtitle: '상황을 조금 다르게 말씀해 주시면 다시 찾아볼게요.',
    showText: false,
  },
  detail_fail: { kind: 'fail', title: '해당 정책을 찾지 못했어요', subtitle: '아래 안내를 확인해주세요.', showText: true },
  blocked: { kind: 'no', title: '잘못된 입력이에요', subtitle: '요청하신 정보는 답변할 수 없어요.', showText: false },
};

// 챗봇 답변 한 개: [마스코트 안내] + [글 말풍선] + [정책 카드들]
// 일상 대화(general)나 답변 종류를 모르는 예전 메시지는 말풍선(+카드)만 보여준다.
export function BotAnswer({
  message,
  sessionId,
  onOpen,
}: {
  message: Message;
  sessionId: string;
  onOpen: (card: PolicyCard) => void;
}) {
  const header = message.isError || !message.replyType ? undefined : HEADERS[message.replyType];
  const cards = message.cards ?? [];
  const showText = message.text !== '' && (header ? header.showText : true);

  return (
    <View>
      {header && <MascotHeader kind={header.kind} title={header.title} subtitle={header.subtitle} />}
      {showText && <MessageBubble message={{ ...message, cards: undefined }} />}
      {cards.length > 0 && (
        <View style={styles.cards}>
          {cards.map((card) => (
            <PolicyCardView key={card.id} card={card} onOpen={onOpen} sessionId={sessionId} />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  cards: { gap: 12, marginTop: 12 },
});
