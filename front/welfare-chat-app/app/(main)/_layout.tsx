import { Stack, useRouter } from 'expo-router';
import React from 'react';

import { AppHeader } from '@/components/common/AppHeader';

// 화면 3개(대화창 / 목록 / 설정)와 위쪽 바 버튼 구성.
// 대화창으로 갈 때는 dismissTo를 써서 이미 열린 대화창으로 돌아간다 (화면이 계속 쌓이지 않게).
export default function ScreensLayout() {
  const router = useRouter();
  const goSettings = { icon: 'settings', label: '설정', onPress: () => router.push('/settings') } as const;
  const goChat = { icon: 'chat-bubble', label: '대화창', onPress: () => router.dismissTo('/chat') } as const;
  const goList = { icon: 'filter-none', label: '상담 목록', onPress: () => router.push('/list') } as const;

  return (
    <Stack screenOptions={{ animation: 'fade' }}>
      {/* index는 /chat 으로 바로 넘기는 리다이렉트 전용 */}
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen
        name="chat"
        options={{ header: () => <AppHeader title="대화창" left={goSettings} right={goList} /> }}
      />
      <Stack.Screen
        name="list"
        options={{ header: () => <AppHeader title="슬라이드 목록" left={goSettings} right={goChat} /> }}
      />
      <Stack.Screen name="settings" options={{ header: () => <AppHeader title="설정" right={goChat} /> }} />
    </Stack>
  );
}
