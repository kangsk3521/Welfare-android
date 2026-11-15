import { useEffect, useState } from 'react';

import { getChatHistory, sendChatMessage } from '@/api/chatApi';
import { useProfile } from '@/contexts/profile-context';
import { useSessions } from '@/contexts/sessions-context';
import { Message } from '@/types/chat';
import { toProfilePayload } from '@/types/profile';

const SEND_FAILED_TEXT = '서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.';

// 한 상담방의 대화: 지난 대화 불러오기 + 메시지 보내기
export function useChat(sessionId: string) {
  const { setTitleIfUntitled } = useSessions();
  const { profile } = useProfile();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSending, setIsSending] = useState(false);

  // 지난 대화 불러오기 (보내는 중에 늦게 도착하면 덮어쓰지 않음)
  useEffect(() => {
    let cancelled = false;
    getChatHistory(sessionId).then((history) => {
      if (!cancelled && history.length > 0) setMessages((prev) => (prev.length === 0 ? history : prev));
    });
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const addMessage = (message: Omit<Message, 'id'>, prefix: string) =>
    setMessages((prev) => [...prev, { ...message, id: `${prefix}-${Date.now()}` }]);

  // 보내기. 빈 글이거나 이미 답을 기다리는 중이면 보내지 않고 false를 돌려준다
  // (입력칸은 true일 때만 비운다)
  const send = (raw: string): boolean => {
    const text = raw.trim();
    if (!text || isSending) return false;

    addMessage({ text, isUser: true }, 'u');
    setTitleIfUntitled(sessionId, text); // 첫 질문이 목록 제목이 된다
    setIsSending(true);

    // 폰에 저장된 내 기본 정보를 맥락으로 함께 보낸다 (서버는 저장하지 않음)
    sendChatMessage(sessionId, text, toProfilePayload(profile))
      .then(({ reply, replyType, cards, detected }) => addMessage({ text: reply, isUser: false, replyType, cards, detected }, 'b'))
      .catch((error) => {
        console.error('챗봇 응답 실패:', error);
        addMessage({ text: SEND_FAILED_TEXT, isUser: false, isError: true }, 'e');
      })
      .finally(() => setIsSending(false));

    return true;
  };

  return { messages, isSending, send };
}
