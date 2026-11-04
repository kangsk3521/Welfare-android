import { DefaultTheme, ThemeProvider } from 'expo-router/react-navigation';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useState } from 'react';
import 'react-native-reanimated';

import { IntroScreen } from '@/components/start/IntroScreen';
import { OnboardingScreen } from '@/components/start/OnboardingScreen';
import { CardsProvider } from '@/contexts/cards-context';
import { ProfileProvider, useProfile } from '@/contexts/profile-context';
import { SessionsProvider } from '@/contexts/sessions-context';
import { SettingsProvider } from '@/contexts/settings-context';

// expo-router 설정: 앱의 기본 화면 묶음은 (main) (대화창·목록·설정)
export const unstable_settings = {
  anchor: '(main)',
};

// 목업이 밝은 크림색 디자인 하나뿐이라 다크모드는 쓰지 않는다.
export default function RootLayout() {
  // 앱을 켤 때 한 번만 오프닝 화면을 대화창 위에 덮어 보여준다
  const [showIntro, setShowIntro] = useState(true);
  const finishIntro = useCallback(() => setShowIntro(false), []);

  return (
    <SettingsProvider>
      <ProfileProvider>
        <SessionsProvider>
          <CardsProvider>
            <ThemeProvider value={DefaultTheme}>
              <Stack>
                <Stack.Screen name="(main)" options={{ headerShown: false }} />
              </Stack>
              {/* 겹치는 순서(아래→위): 대화창 → 첫 실행 안내 → 오프닝 */}
              <FirstRunGuide />
              {showIntro && <IntroScreen onFinish={finishIntro} />}
              <StatusBar style="dark" />
            </ThemeProvider>
          </CardsProvider>
        </SessionsProvider>
      </ProfileProvider>
    </SettingsProvider>
  );
}

// 저장소를 다 읽은 뒤, 아직 첫 실행 안내를 안 봤을 때만 보여준다
function FirstRunGuide() {
  const { loaded, onboarded } = useProfile();
  return loaded && !onboarded ? <OnboardingScreen /> : null;
}
