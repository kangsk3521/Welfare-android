import { Share } from 'react-native';

import { Message, PolicyCard } from '@/types/chat';
import { notify } from '@/utils/dialog';

async function shareText(body: string) {
  try {
    await Share.share({ message: body });
  } catch {
    notify('이 환경에서는 공유를 지원하지 않아요.');
  }
}

// 대화 내용을 "나: …", "챗봇: …" 형태의 글로 만들어 폰 공유 창(카톡, 문자 등)으로 보낸다.
// 카드 답변은 추천 정책 이름도 함께 적는다.
export async function shareMessages(messages: Message[]) {
  const body = messages
    .filter((m) => !m.isError)
    .map((m) => {
      const line = `${m.isUser ? '나' : '챗봇'}: ${m.text}`;
      const cards = m.cards ?? [];
      return cards.length ? `${line}\n${cards.map((c, i) => `  ${i + 1}. ${c.title}`).join('\n')}` : line;
    })
    .join('\n\n');

  if (!body) {
    notify('공유할 대화가 아직 없어요.');
    return;
  }
  await shareText(body);
}

// 정책 카드 1장을 글로 만들어 공유
export async function sharePolicyCard(card: PolicyCard) {
  const lines = [
    `[${card.title}]`,
    card.target && `■ 대상\n${card.target}`,
    card.content && `■ 내용\n${card.content}`,
    card.applyMethod && `■ 신청 방법\n${card.applyMethod}`,
    card.department && `■ 담당: ${card.department}`,
    card.url && `■ 복지로에서 자세히 보기
${card.url}`,
  ].filter(Boolean);
  await shareText(lines.join('\n\n'));
}
