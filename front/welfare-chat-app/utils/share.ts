import { Share } from 'react-native';

import { Message } from '@/types/chat';
import { notify } from '@/utils/dialog';

// 대화 내용을 "나: …", "챗봇: …" 형태의 글로 만들어 폰 공유 창(카톡, 문자 등)으로 보낸다
export async function shareMessages(messages: Message[]) {
  const body = messages
    .filter((m) => !m.isError)
    .map((m) => `${m.isUser ? '나' : '챗봇'}: ${m.text}`)
    .join('\n\n');

  if (!body) {
    notify('공유할 대화가 아직 없어요.');
    return;
  }
  try {
    await Share.share({ message: body });
  } catch {
    notify('이 환경에서는 공유를 지원하지 않아요.');
  }
}
