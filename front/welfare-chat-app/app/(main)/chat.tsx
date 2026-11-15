import { useEffect, useRef, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { PolicyDetailModal } from '@/components/cards/PolicyDetailModal';
import { BotAnswer } from '@/components/chat/BotAnswer';
import { ChatInputBar } from '@/components/chat/ChatInputBar';
import { ChatIntro } from '@/components/chat/ChatIntro';
import { MessageBubble, TypingBubble } from '@/components/chat/MessageBubble';
import { MIC_SPACE, MicButton } from '@/components/chat/MicButton';
import { SaveProfilePrompt } from '@/components/chat/SaveProfilePrompt';
import { VoiceModal } from '@/components/chat/VoiceModal';
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
//   │ BotAnswer (마스코트 안내 + 글 + 정책 카드들) │  카드를 누르면 PolicyDetailModal (블러 + 확대)
//   │        MicButton (떠 있음) │  누르면 VoiceModal (가운데 음성 창, 다 말하면 바로 전송)
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
  // 메시지별 "내 정보에 저장할까요?" 안내 상태 (저장함 / 이번만)
  const [promptStatus, setPromptStatus] = useState<Record<string, 'saved' | 'dismissed'>>({});
  const keyboardHeight = useKeyboardHeight();

  const { messages, isSending, send } = useChat(sessionId);
  const sendText = (text: string): boolean => {
    const sent = send(text);
    if (sent) setInputText('');
    return sent;
  };

  // 말하는 동안 알아들은 말은 가운데 음성 창에 크게, 다 말하면 바로 전송 (못 보내면 입력칸에 넣어 둠)
  const voice = useVoiceRecorder(sessionId, sendText, setInputText);

  // 최신 메시지가 보이게 맨 아래로 내리는 때:
  // - 새 메시지가 생기거나 '답변 작성 중'이 바뀔 때
  // - 키보드가 뜨거나, 입력칸 선택이 바뀌어 아래 여백(마이크 자리)이 달라질 때
  // 카드·여백은 여러 번에 나눠 그려지며 높이가 늘어나서, 한 번이 아니라 시간을 두고 세 번 내린다.
  // 카드를 거절·다시 보기 해서 높이만 바뀔 때는 내리지 않는다 → 보던 자리 유지.
  useEffect(() => {
    // FlatList.scrollToEnd는 자기가 계산해 둔 높이를 써서, 아래 여백이 막 바뀐 직후엔 덜 내려간다.
    // 실제 스크롤 영역(ScrollView)에 직접 요청하면 지금 높이 기준으로 끝까지 내려간다.
    const scrollToBottom = () => {
      const scrollView = listRef.current?.getScrollResponder() as unknown as { scrollToEnd?: (o: { animated: boolean }) => void } | null;
      if (scrollView?.scrollToEnd) scrollView.scrollToEnd({ animated: true });
      else listRef.current?.scrollToEnd({ animated: true });
    };
    const timers = [50, 300, 700].map((ms) => setTimeout(scrollToBottom, ms));
    return () => timers.forEach(clearTimeout);
  }, [messages.length, isSending, keyboardHeight, isInputFocused]);

  return (
    // 키보드 높이만큼 아래 여백 → 입력칸이 키보드 위로 올라온다
    <View style={[styles.container, { backgroundColor: theme.background, paddingBottom: keyboardHeight }]}>
      <View style={styles.chatArea}>
        <FlatList
          ref={listRef}
          data={messages}
          renderItem={({ item }) => (
            <View>
              {item.isUser ? (
                <MessageBubble message={item} />
              ) : (
                <BotAnswer message={item} sessionId={sessionId} onOpen={setOpenedCard} />
              )}
              {/* 대화에서 새로 알게 된 정보가 있으면 "내 정보에 저장할까요?" */}
              {item.detected && item.detected.length > 0 && (
                <SaveProfilePrompt
                  tags={item.detected}
                  status={promptStatus[item.id] ?? 'open'}
                  onDone={(status) => setPromptStatus((s) => ({ ...s, [item.id]: status }))}
                />
              )}
            </View>
          )}
          extraData={promptStatus}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={<ChatIntro showSuggestions={messages.length === 0} onPick={sendText} />}
          ListFooterComponent={isSending ? <TypingBubble /> : null}
          // 마이크 버튼이 떠 있을 땐 그만큼 아래 여백을 둬서 마지막 말풍선이 버튼 위까지 스크롤되게 한다
          contentContainerStyle={[styles.listContent, { paddingBottom: isInputFocused ? 12 : MIC_SPACE }]}
        />
        <MicButton
          visible={!isInputFocused}
          notice={voice.notice}
          onPress={voice.start}
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
      <VoiceModal phase={voice.phase} text={voice.liveText} onDone={voice.stop} onCancel={voice.cancel} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  chatArea: { flex: 1 },
  listContent: { paddingHorizontal: 24, paddingTop: 24 },
});
