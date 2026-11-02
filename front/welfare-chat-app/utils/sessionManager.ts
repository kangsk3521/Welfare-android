import * as Crypto from 'expo-crypto';

import { loadText, saveText } from '@/utils/storage';

// 예전 버전(상담방이 1개뿐이던 시절)의 세션 id.
// 지금은 상담방 목록(contexts/sessions-context.tsx)이 처음 만들어질 때 첫 방 id로 이어 쓰는 용도로만 쓴다.
const SESSION_KEY = '@app_session_id';

// 저장된 세션 id를 돌려주고, 없으면 새로 만들어 저장한다
export const getSessionId = async (): Promise<string> => {
  try {
    const stored = await loadText(SESSION_KEY);
    if (stored) return stored;

    const created = Crypto.randomUUID();
    await saveText(SESSION_KEY, created);
    return created;
  } catch (error) {
    console.error('세션 아이디를 가져오는 중 에러 발생:', error);
    return `temp-${Date.now()}`; // 저장소 오류가 나도 앱이 멈추지 않게 임시 id
  }
};
