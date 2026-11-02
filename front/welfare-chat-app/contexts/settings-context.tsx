import React, { createContext, useContext, useEffect, useState } from 'react';
import * as Crypto from 'expo-crypto';

import { Palette, Palettes } from '@/constants/theme';
import { loadJSON, saveJSON } from '@/utils/storage';

// 설정 화면에서 바꾸는 값들: 글자크기, 색약모드, 사용자 기본 정보.
// 바꿀 때마다 폰에 저장해서 앱을 다시 켜도 유지된다.

const STORAGE_KEY = '@app_settings';

export const FONT_SIZE_MIN = 12;
export const FONT_SIZE_MAX = 28;

export type ProfileItem = { id: string; label: string; value: string };

type Settings = {
  fontSize: number;
  colorBlind: boolean;
  profile: ProfileItem[];
};

const DEFAULT_SETTINGS: Settings = { fontSize: 15, colorBlind: false, profile: [] };

type SettingsContextType = Settings & {
  setFontSize: (size: number) => void;
  setColorBlind: (on: boolean) => void;
  addProfile: (label: string, value: string) => void;
  updateProfile: (id: string, label: string, value: string) => void;
  removeProfile: (id: string) => void;
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadJSON<Partial<Settings>>(STORAGE_KEY)
      .then((saved) => {
        if (saved) setSettings({ ...DEFAULT_SETTINGS, ...saved });
      })
      .catch((e) => console.error('설정 불러오기 실패', e))
      .finally(() => setLoaded(true));
  }, []);

  // 불러오기가 끝난 뒤부터 바뀔 때마다 저장
  useEffect(() => {
    if (loaded) saveJSON(STORAGE_KEY, settings);
  }, [settings, loaded]);

  const value: SettingsContextType = {
    ...settings,
    setFontSize: (size) =>
      setSettings((s) => ({ ...s, fontSize: Math.min(FONT_SIZE_MAX, Math.max(FONT_SIZE_MIN, size)) })),
    setColorBlind: (on) => setSettings((s) => ({ ...s, colorBlind: on })),
    addProfile: (label, value) =>
      setSettings((s) => ({ ...s, profile: [...s.profile, { id: Crypto.randomUUID(), label, value }] })),
    updateProfile: (id, label, value) =>
      setSettings((s) => ({
        ...s,
        profile: s.profile.map((p) => (p.id === id ? { ...p, label, value } : p)),
      })),
    removeProfile: (id) => setSettings((s) => ({ ...s, profile: s.profile.filter((p) => p.id !== id) })),
  };

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings는 SettingsProvider 안에서만 쓸 수 있습니다');
  return context;
}

// 지금 모드(일반/색약)에 맞는 색 묶음
export function useTheme(): Palette {
  const { colorBlind } = useSettings();
  return colorBlind ? Palettes.colorBlind : Palettes.default;
}
