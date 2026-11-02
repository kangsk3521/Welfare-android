import React, { createContext, useContext, useEffect, useState } from 'react';
import * as Crypto from 'expo-crypto';

import { getSessionId } from '@/utils/sessionManager';
import { loadJSON, loadText, saveJSON, saveText } from '@/utils/storage';

// 상담방(대화방) 목록. 서버에는 방 목록 API가 없어서 폰에 저장한다.
// 방 id는 서버에 보내는 session_id로 그대로 쓰인다.

const SESSIONS_KEY = '@app_sessions';
const CURRENT_KEY = '@app_current_session';
export const UNTITLED = '새 상담';

export type Session = {
  id: string;
  title: string;
  createdAt: number;
  starred: boolean;
};

type SessionsContextType = {
  sessions: Session[];
  currentId: string | null;
  newSession: () => string;
  selectSession: (id: string) => void;
  setTitleIfUntitled: (id: string, firstMessage: string) => void;
  toggleStar: (id: string) => void;
  removeSession: (id: string) => void;
};

const SessionsContext = createContext<SessionsContextType | undefined>(undefined);

const makeSession = (id: string = Crypto.randomUUID()): Session => ({
  id,
  title: UNTITLED,
  createdAt: Date.now(),
  starred: false,
});

export function SessionsProvider({ children }: { children: React.ReactNode }) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [savedList, savedCurrent] = await Promise.all([
          loadJSON<Session[]>(SESSIONS_KEY),
          loadText(CURRENT_KEY),
        ]);
        let list: Session[] = savedList ?? [];
        if (list.length === 0) {
          // 예전 버전에서 쓰던 세션 id가 있으면 첫 방으로 이어서 쓴다
          list = [makeSession(await getSessionId())];
        }
        setSessions(list);
        setCurrentId(list.some((s) => s.id === savedCurrent) ? savedCurrent : list[0].id);
      } catch (e) {
        console.error('상담 목록 불러오기 실패', e);
        const first = makeSession();
        setSessions([first]);
        setCurrentId(first.id);
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    saveJSON(SESSIONS_KEY, sessions);
    if (currentId) saveText(CURRENT_KEY, currentId);
  }, [sessions, currentId, loaded]);

  const newSession = () => {
    // 아직 아무 말도 안 한 빈 방이 있으면 새로 만들지 않고 그 방을 쓴다
    const empty = sessions.find((s) => s.title === UNTITLED);
    if (empty) {
      setCurrentId(empty.id);
      return empty.id;
    }
    const created = makeSession();
    setSessions((prev) => [created, ...prev]);
    setCurrentId(created.id);
    return created.id;
  };

  const removeSession = (id: string) => {
    const rest = sessions.filter((s) => s.id !== id);
    if (rest.length === 0) rest.push(makeSession());
    setSessions(rest);
    if (currentId === id) setCurrentId(rest[0].id);
  };

  const value: SessionsContextType = {
    sessions,
    currentId,
    newSession,
    selectSession: setCurrentId,
    setTitleIfUntitled: (id, firstMessage) =>
      setSessions((prev) =>
        prev.map((s) =>
          s.id === id && s.title === UNTITLED ? { ...s, title: firstMessage.trim().slice(0, 20) } : s
        )
      ),
    toggleStar: (id) => setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, starred: !s.starred } : s))),
    removeSession,
  };

  return <SessionsContext.Provider value={value}>{children}</SessionsContext.Provider>;
}

export function useSessions() {
  const context = useContext(SessionsContext);
  if (!context) throw new Error('useSessions는 SessionsProvider 안에서만 쓸 수 있습니다');
  return context;
}
