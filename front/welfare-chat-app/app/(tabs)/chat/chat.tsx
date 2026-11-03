import React, { useEffect, useRef, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { PolicyDetailModal } from '@/components/cards/PolicyDetailModal';
import { CardsAnswer } from '@/components/chat/CardsAnswer';
import { ChatInputBar } from '@/components/chat/ChatInputBar';
import { ChatIntro } from '@/components/chat/ChatIntro';
import { MessageBubble, TypingBubble } from '@/components/chat/MessageBubble';
import { MIC_SPACE, MicButton } from '@/components/chat/MicButton';
import { useSessions } from '@/contexts/sessions-context';
import { useTheme } from '@/contexts/settings-context';
import { useChat } from '@/hooks/useChat';
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { Message, PolicyCard } from '@/types/chat';
import { shareMessages } from '@/utils/share';

// 대화창 화면. 기능은 hooks/, 화면 조각은 components/chat/ 에 있고 여기서는 조립만 한다.
//
//   ┌ ChatIntro (안내 + 추천칩) ┐
//   │ MessageBubble ...         │  ← FlatList
//   │ CardsAnswer (소개 + 정책 카드들) │  카드를 누르면 PolicyDetailModal (블러 + 확대)
//   │        MicButton (떠 있음) │
//   └ ChatInputBar (입력·전송·공유)┘

// 방이 바뀌면 key가 바뀌어서 대화 화면을 새로 그린다 (이전 방 메시지가 남지 않게)
export default function ChatScreen() {
  const { currentId } = useSessions();
  if (!currentId) return null;
  return <ChatRoom key={currentId} sessionId={currentId} />;
}

function ChatRoom({ sessionId }: { sessionId: string }) {
  const theme = useTheme();
  const listRef = useRef<FlatList<Message>>(null);

  const [inputText, setInputText] = useState('');
  const [isInputFocused, setIsInputFocused] = useState(false); // 선택 중엔 마이크·공유 버튼 숨김
  const [openedCard, setOpenedCard] = useState<PolicyCard | null>(null); // 확대해서 보고 있는 카드
  const keyboardHeight = useKeyboardHeight();

  const { messages, isSending, send } = useChat(sessionId);
  const voice = useVoiceRecorder(sessionId, setInputText); // 인식된 글자는 입력칸으로

  const sendText = (text: string) => {
    if (send(text)) setInputText('');
  };

  // 키보드가 뜨거나, 입력칸 선택이 바뀌어 아래 여백(마이크 자리)이 달라지면 최신 메시지가 보이게 맨 아래로
  useEffect(() => {
    const timer = setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    return () => clearTimeout(timer);
  }, [keyboardHeight, isInputFocused]);

  return (
    // 키보드 높이만큼 아래 여백 → 입력칸이 키보드 위로 올라온다
    <View style={[styles.container, { backgroundColor: theme.background, paddingBottom: keyboardHeight }]}>
      <View style={styles.chatArea}>
        <FlatList
          ref={listRef}
          data={messages}
          renderItem={({ item }) =>
            item.cards?.length ? (
              <CardsAnswer message={item} sessionId={sessionId} onOpen={setOpenedCard} />
            ) : (
              <MessageBubble message={item} />
            )
          }
          keyExtractor={(item) => item.id}
          ListHeaderComponent={<ChatIntro showSuggestions={messages.length === 0} onPick={sendText} />}
          ListFooterComponent={isSending ? <TypingBubble /> : null}
          // 마이크 버튼이 떠 있을 땐 그만큼 아래 여백을 둬서 마지막 말풍선이 버튼 위까지 스크롤되게 한다
          contentContainerStyle={[styles.listContent, { paddingBottom: isInputFocused ? 12 : MIC_SPACE }]}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        />
        <MicButton
          visible={!isInputFocused}
          isRecording={voice.isRecording}
          status={voice.voiceStatus}
          onPress={voice.toggleRecording}
        />
      </View>

      <ChatInputBar
        value={inputText}
        onChangeText={setInputText}
        onSend={() => sendText(inputText)}
        isSending={isSending}
        onShare={() => shareMessages(messages)}
        onFocusChange={setIsInputFocused}
      />

      <PolicyDetailModal card={openedCard} onClose={() => setOpenedCard(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  chatArea: { flex: 1 },
  listContent: { paddingHorizontal: 24, paddingTop: 24 },
});
