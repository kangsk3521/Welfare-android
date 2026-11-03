import { DefaultTheme, ThemeProvider } from 'expo-router/react-navigation';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useState } from 'react';
import 'react-native-reanimated';

import { IntroScreen } from '@/components/intro-screen';
import { CardsProvider } from '@/contexts/cards-context';
import { SessionsProvider } from '@/contexts/sessions-context';
import { SettingsProvider } from '@/contexts/settings-context';

export const unstable_settings = {
  anchor: '(tabs)',
};

// 목업이 밝은 크림색 디자인 하나뿐이라 다크모드는 쓰지 않는다.
export default function RootLayout() {
  // 앱을 켤 때 한 번만 오프닝 화면을 대화창 위에 덮어 보여준다
  const [showIntro, setShowIntro] = useState(true);
  const finishIntro = useCallback(() => setShowIntro(false), []);

  return (
    <SettingsProvider>
      <SessionsProvider>
        <CardsProvider>
          <ThemeProvider value={DefaultTheme}>
            <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            </Stack>
            {showIntro && <IntroScreen onFinish={finishIntro} />}
            <StatusBar style="dark" />
          </ThemeProvider>
        </CardsProvider>
      </SessionsProvider>
    </SettingsProvider>
  );
}
