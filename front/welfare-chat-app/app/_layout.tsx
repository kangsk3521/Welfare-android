import { DefaultTheme, ThemeProvider } from 'expo-router/react-navigation';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { SessionsProvider } from '@/contexts/sessions-context';
import { SettingsProvider } from '@/contexts/settings-context';

export const unstable_settings = {
  anchor: '(tabs)',
};

// 목업이 밝은 크림색 디자인 하나뿐이라 다크모드는 쓰지 않는다.
export default function RootLayout() {
  return (
    <SettingsProvider>
      <SessionsProvider>
        <ThemeProvider value={DefaultTheme}>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          </Stack>
          <StatusBar style="dark" />
        </ThemeProvider>
      </SessionsProvider>
    </SettingsProvider>
  );
}
