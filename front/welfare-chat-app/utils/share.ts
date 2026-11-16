import { Share } from 'react-native';

import { PolicyCard } from '@/types/chat';
import { notify } from '@/utils/dialog';

async function shareText(body: string) {
  try {
    await Share.share({ message: body });
  } catch {
    notify('이 환경에서는 공유를 지원하지 않아요.');
  }
}

// 정책 카드 1장을 글로 만들어 폰 공유 창(카톡, 문자 등)으로 보낸다
export async function sharePolicyCard(card: PolicyCard) {
  const lines = [
    `[${card.title}]`,
    card.what && `→ ${card.what}`,
    card.who && `→ 대상: ${card.who}`,
    card.target && `■ 대상\n${card.target}`,
    card.content && `■ 내용\n${card.content}`,
    card.applyMethod && `■ 신청 방법\n${card.applyMethod}`,
    card.department && `■ 담당: ${card.department}`,
    card.url && `■ 복지로에서 자세히 보기
${card.url}`,
  ].filter(Boolean);
  await shareText(lines.join('\n\n'));
}
