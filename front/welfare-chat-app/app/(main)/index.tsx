import { Redirect } from 'expo-router';

// 앱 첫 주소("/")는 화면 없이 바로 대화창(/chat)으로 넘긴다
export default function Index() {
  return <Redirect href="/chat" />;
}
