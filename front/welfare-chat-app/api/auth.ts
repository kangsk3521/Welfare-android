import axios from 'axios';

import { API_URL } from '@/constants/config';
import { deleteSecret, loadSecret, saveSecret } from '@/utils/storage';

// 기기 토큰: 회원가입 없이 "이 기기"를 서버가 알아보게 하는 비밀 값.
// 처음 한 번 서버(POST /auth/device)에서 받아 암호화 저장소에 보관하고, 모든 요청에 붙인다.
// 서버는 이 토큰의 기기 칸에 있는 대화만 보여주므로, 남이 세션ID를 알아도 대화를 볼 수 없다.

const TOKEN_KEY = 'device_token';

// 같은 순간에 여러 요청이 동시에 토큰을 찾을 때 서버에 발급 요청이 여러 번 가지 않게 하나의 Promise를 공유
let tokenPromise: Promise<string> | null = null;

async function loadOrRegister(): Promise<string> {
  const saved = await loadSecret(TOKEN_KEY);
  if (saved) return saved;

  // 토큰 발급 요청은 토큰 없이 보내야 하므로 chatApi의 client(토큰 자동 첨부) 대신 axios를 직접 쓴다
  const response = await axios.post<{ device_token: string }>(`${API_URL}/auth/device`, null, { timeout: 90_000 });
  const token = response.data.device_token;
  await saveSecret(TOKEN_KEY, token);
  return token;
}

export function getDeviceToken(): Promise<string> {
  if (!tokenPromise) {
    tokenPromise = loadOrRegister().catch((error) => {
      tokenPromise = null; // 실패하면 다음 요청 때 다시 시도
      throw error;
    });
  }
  return tokenPromise;
}

// 서버가 토큰을 거절했을 때(401: 서버 비밀키가 바뀌었거나 토큰이 손상됨) 지우고 새로 받게 한다
export async function resetDeviceToken(): Promise<void> {
  tokenPromise = null;
  await deleteSecret(TOKEN_KEY);
}
