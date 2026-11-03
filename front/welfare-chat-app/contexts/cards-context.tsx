import React, { createContext, useContext, useEffect, useState } from 'react';

import { PolicyCard } from '@/types/chat';
import { loadJSON, saveJSON } from '@/utils/storage';

// 정책 카드의 '보관'과 '거절(숨김)' 상태. 폰에 저장해서 앱을 다시 켜도 유지된다.
// - 보관: 카드 내용을 통째로 저장 → 목록 화면 '보관한 혜택' 탭에서 다시 본다 (서버 기록이 사라져도 남음)
// - 숨김: 상담방마다 따로. 같은 상담방에서 그 정책 카드는 접힌 줄로 보이고 '다시 보기'로 되돌릴 수 있다

const SAVED_KEY = '@saved_cards';
const HIDDEN_KEY = '@hidden_cards';

export type SavedCard = { card: PolicyCard; savedAt: number };

type CardsContextType = {
  saved: SavedCard[]; // 최근에 보관한 것부터
  isSaved: (cardId: string) => boolean;
  toggleSave: (card: PolicyCard) => void;
  isHidden: (sessionId: string, cardId: string) => boolean;
  hide: (sessionId: string, cardId: string) => void;
  unhide: (sessionId: string, cardId: string) => void;
};

const CardsContext = createContext<CardsContextType | undefined>(undefined);

const hiddenKey = (sessionId: string, cardId: string) => `${sessionId}:${cardId}`;

export function CardsProvider({ children }: { children: React.ReactNode }) {
  const [saved, setSaved] = useState<SavedCard[]>([]);
  const [hidden, setHidden] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.all([loadJSON<SavedCard[]>(SAVED_KEY), loadJSON<string[]>(HIDDEN_KEY)])
      .then(([s, h]) => {
        if (s) setSaved(s);
        if (h) setHidden(h);
      })
      .catch((e) => console.error('카드 보관함 불러오기 실패', e))
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (!loaded) return;
    saveJSON(SAVED_KEY, saved);
    saveJSON(HIDDEN_KEY, hidden);
  }, [saved, hidden, loaded]);

  const value: CardsContextType = {
    saved,
    isSaved: (cardId) => saved.some((s) => s.card.id === cardId),
    toggleSave: (card) =>
      setSaved((prev) =>
        prev.some((s) => s.card.id === card.id)
          ? prev.filter((s) => s.card.id !== card.id)
          : [{ card, savedAt: Date.now() }, ...prev]
      ),
    isHidden: (sessionId, cardId) => hidden.includes(hiddenKey(sessionId, cardId)),
    hide: (sessionId, cardId) =>
      setHidden((prev) => (prev.includes(hiddenKey(sessionId, cardId)) ? prev : [...prev, hiddenKey(sessionId, cardId)])),
    unhide: (sessionId, cardId) => setHidden((prev) => prev.filter((k) => k !== hiddenKey(sessionId, cardId))),
  };

  return <CardsContext.Provider value={value}>{children}</CardsContext.Provider>;
}

export function useCards() {
  const context = useContext(CardsContext);
  if (!context) throw new Error('useCards는 CardsProvider 안에서만 쓸 수 있습니다');
  return context;
}
