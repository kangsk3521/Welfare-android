import React, { createContext, useContext, useEffect, useState } from 'react';

import { EMPTY_PROFILE, UserProfile } from '@/types/profile';
import { deleteSecret, loadSecret, loadText, saveSecret, saveText } from '@/utils/storage';

// 사용자 기본 정보(나이·사는 곳·가구상황·장애 여부)를 암호화 저장소(SecureStore)에 보관한다.
// 첫 실행 안내(동의 + 입력)를 이미 봤는지는 민감하지 않아서 일반 저장소에 둔다.

const PROFILE_KEY = 'user_profile';
const ONBOARDED_KEY = '@onboarding_done';

type ProfileContextType = {
  loaded: boolean; // 저장소에서 다 읽었는지 (첫 실행 화면을 띄울지 판단할 때 필요)
  profile: UserProfile;
  onboarded: boolean;
  updateProfile: (changes: Partial<UserProfile>) => void;
  setSensitiveConsent: (agree: boolean) => void; // 동의를 거두면 장애 정보도 지운다
  clearProfile: () => void; // 내 정보 전체 삭제
  finishOnboarding: () => void;
};

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfile>(EMPTY_PROFILE);
  const [onboarded, setOnboarded] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.all([loadSecret(PROFILE_KEY), loadText(ONBOARDED_KEY)])
      .then(([savedProfile, savedOnboarded]) => {
        if (savedProfile) setProfile({ ...EMPTY_PROFILE, ...JSON.parse(savedProfile) });
        setOnboarded(savedOnboarded === 'true');
      })
      .catch((e) => console.error('사용자 정보 불러오기 실패', e))
      .finally(() => setLoaded(true));
  }, []);

  // 바뀔 때마다 저장. 비어 있으면 저장소에서 아예 지운다
  useEffect(() => {
    if (!loaded) return;
    if (profile.updatedAt === 0) deleteSecret(PROFILE_KEY);
    else saveSecret(PROFILE_KEY, JSON.stringify(profile));
  }, [profile, loaded]);

  const value: ProfileContextType = {
    loaded,
    profile,
    onboarded,
    updateProfile: (changes) => setProfile((p) => ({ ...p, ...changes, updatedAt: Date.now() })),
    setSensitiveConsent: (agree) =>
      setProfile((p) => ({
        ...p,
        sensitiveConsent: agree,
        disability: agree ? p.disability : null,
        updatedAt: Date.now(),
      })),
    clearProfile: () => setProfile(EMPTY_PROFILE),
    finishOnboarding: () => {
      setOnboarded(true);
      saveText(ONBOARDED_KEY, 'true');
    },
  };

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (!context) throw new Error('useProfile은 ProfileProvider 안에서만 쓸 수 있습니다');
  return context;
}
