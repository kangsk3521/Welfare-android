// 대화창에 표시되는 메시지 한 개
export type Message = {
  id: string;
  text: string;
  isUser: boolean; // true: 내가 보낸 말, false: 챗봇 답변
  isError?: boolean; // 서버 연결 실패 안내 말풍선
};
