import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

import { getDeviceToken, resetDeviceToken } from '@/api/auth';
import { API_URL } from '@/constants/config';

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

// -------------------------------채팅 내역 가져오기

export interface HistoryResponse {
  id: string;
  text: string;
  isUser: boolean;
}

export const get_chat_history = async (sessionId: string): Promise<HistoryResponse[]> => {
  try {
    const response = await client.get<HistoryResponse[]>(`/chat/history/${sessionId}`);
    return response.data;
  } catch (error) {
    console.error('대화 내역 불러오기 실패', error);
    return [];
  }
};

// -------------------------------채팅 (실패하면 에러를 던진다 → 화면에서 에러 말풍선으로 표시)

interface ChatRequest {
  session_id: string;
  user_message: string;
}
interface ChatResponse {
  bot_reply: string;
}

export const sendChatMessage = async (sessionId: string, userMessage: string): Promise<string> => {
  const requestData: ChatRequest = { session_id: sessionId, user_message: userMessage };
  const response = await client.post<ChatResponse>('/chat', requestData);
  return response.data.bot_reply;
};

// ---------------------------서버확인

export const healthCheck = async (): Promise<boolean> => {
  try {
    const response = await client.get('/Health');
    return response.status === 200;
  } catch (error) {
    console.error('서버 연결 실패', error);
    return false;
  }
};

// ---------------------------음성 파일 → 글자 (서버 엔드포인트: POST /File)

export interface AudioFile {
  uri: string;
  name: string;
  type: string;
}

export const transcribe = async (audioData: AudioFile): Promise<string> => {
  const formData = new FormData();
  formData.append('audio_file', { uri: audioData.uri, name: audioData.name, type: audioData.type } as any);
  const response = await client.post('/File', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data.recognized_text;
};
