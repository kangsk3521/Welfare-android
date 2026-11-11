import { StyleSheet, View } from 'react-native';

import { PolicyCardView } from '@/components/cards/PolicyCardView';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { Message, PolicyCard } from '@/types/chat';

// 카드형 챗봇 답변: 짧은 소개 말풍선 + 추천 정책 수만큼 카드
export function CardsAnswer({
  message,
  sessionId,
  onOpen,
}: {
  message: Message;
  sessionId: string;
  onOpen: (card: PolicyCard) => void;
}) {
  return (
    <View>
      {message.text !== '' && <MessageBubble message={{ ...message, cards: undefined }} />}
      <View style={styles.cards}>
        {(message.cards ?? []).map((card) => (
          <PolicyCardView key={card.id} card={card} onOpen={onOpen} sessionId={sessionId} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cards: { gap: 12, marginTop: 12 },
});
