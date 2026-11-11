import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

import { getDeviceToken, resetDeviceToken } from '@/api/auth';
import { API_URL } from '@/constants/config';
import { Message, PolicyCard } from '@/types/chat';
import { ProfilePayload } from '@/types/profile';

// Render 무료 서버는 한동안 안 쓰면 잠들어서 첫 요청이 오래 걸린다 → 넉넉히 90초
const client = axios.create({ baseURL: API_URL, timeout: 90_000 });

// 모든 요청에 기기 토큰을 자동으로 붙인다
client.interceptors.request.use(async (config) => {
  config.headers.Authorization = `Bearer ${await getDeviceToken()}`;
  return config;
});

// 서버가 토큰을 거절하면(401) 토큰을 새로 받아 딱 한 번 다시 보낸다
client.interceptors.response.use(undefined, async (error: AxiosError) => {
  const original = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;
  if (error.response?.status === 401 && original && !original._retried) {
    original._retried = true;
    await resetDeviceToken();
    return client(original); // 요청 인터셉터가 새 토큰을 붙인다
  }
  throw error;
});

// -------------------------------정책 카드 (서버 형식 → 앱 형식)

// 서버(파이썬)는 snake_case로 보낸다
interface PolicyCardResponse {
  id: string;
  title: string;
  target?: string;
  content?: string;
  apply_method?: string;
  department?: string;
  support_type?: string;
  digest?: string;
  url?: string;
  is_local?: boolean;
  what?: string;
  who?: string;
}

const toPolicyCard = (c: PolicyCardResponse): PolicyCard => ({
  id: c.id,
  title: c.title,
  target: c.target ?? '',
  content: c.content ?? '',
  applyMethod: c.apply_method ?? '',
  department: c.department ?? '',
  supportType: c.support_type ?? '',
  digest: c.digest ?? '',
  url: c.url || undefined,
  isLocal: c.is_local ?? false,
  what: c.what || undefined,
  who: c.who || undefined,
});

// -------------------------------채팅 내역 가져오기

interface HistoryResponse {
  id: string;
  text: string;
  isUser: boolean;
  cards?: PolicyCardResponse[];
}

export const getChatHistory = async (sessionId: string): Promise<Message[]> => {
  try {
    const response = await client.get<HistoryResponse[]>(`/chat/history/${sessionId}`);
    return response.data.map((m) => ({ id: m.id, text: m.text, isUser: m.isUser, cards: (m.cards ?? []).map(toPolicyCard) }));
  } catch (error) {
    console.error('대화 내역 불러오기 실패', error);
    return [];
  }
};

// -------------------------------채팅 (실패하면 에러를 던진다 → 화면에서 에러 말풍선으로 표시)

interface ChatRequest {
  session_id: string;
  user_message: string;
  profile?: ProfilePayload; // 폰에 저장된 내 기본 정보 (있을 때만)
}
interface ChatResponse {
  bot_reply: string; // 카드가 있으면 카드 위에 보여줄 짧은 소개
  cards?: PolicyCardResponse[]; // 추천 정책 카드 (검색 답변일 때만)
  detected?: string[]; // 대화에서 새로 알게 된 정보 (내 정보에 아직 없는 것)
}

export const sendChatMessage = async (
  sessionId: string,
  userMessage: string,
  profile: ProfilePayload | null
): Promise<{ reply: string; cards: PolicyCard[]; detected: string[] }> => {
  const requestData: ChatRequest = { session_id: sessionId, user_message: userMessage, ...(profile ? { profile } : {}) };
  const response = await client.post<ChatResponse>('/chat', requestData);
  return {
    reply: response.data.bot_reply,
    cards: (response.data.cards ?? []).map(toPolicyCard),
    detected: response.data.detected ?? [],
  };
};

// 음성 인식은 웹소켓으로 한다 (hooks/useVoiceRecorder.ts)
