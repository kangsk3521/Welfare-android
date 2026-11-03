import React, { createContext, useContext, useEffect, useState } from 'react';

import { Palette, Palettes } from '@/constants/theme';
import { loadJSON, saveJSON } from '@/utils/storage';

// 화면 설정: 글자크기, 색약모드. 바꿀 때마다 폰에 저장해서 앱을 다시 켜도 유지된다.
// (사용자 기본 정보는 개인정보라 contexts/profile-context.tsx에서 암호화 저장소로 따로 관리)

const STORAGE_KEY = '@app_settings';

export const FONT_SIZE_MIN = 12;
export const FONT_SIZE_MAX = 28;

type Settings = {
  fontSize: number;
  colorBlind: boolean;
};

const DEFAULT_SETTINGS: Settings = { fontSize: 15, colorBlind: false };

type SettingsContextType = Settings & {
  setFontSize: (size: number) => void;
  setColorBlind: (on: boolean) => void;
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadJSON<Partial<Settings>>(STORAGE_KEY)
      .then((saved) => {
        // 필요한 값만 꺼낸다. 예전 버전이 같은 곳에 평문으로 저장하던 사용자 메모(profile)는
        // 여기서 버려지고, 다음 저장 때 저장소에서도 사라진다.
        if (saved) {
          setSettings({
            fontSize: saved.fontSize ?? DEFAULT_SETTINGS.fontSize,
            colorBlind: saved.colorBlind ?? DEFAULT_SETTINGS.colorBlind,
          });
        }
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
