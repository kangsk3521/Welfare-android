import { Redirect } from 'expo-router';

// 앱의 "첫 화면" 역할을 하는 라우트지만, 실제 UI는 없다.
// 진입 즉시 대화창(/chat/chat)으로 넘겨서 팀원의 chat.tsx 파일을 건드리지 않고도
// 대화창을 홈 화면처럼 보이게 한다.
export default function Index() {
  return <Redirect href="/chat/chat" />;
}
