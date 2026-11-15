// 추천 복지 정책 카드 1장 (서버가 DB 원문으로 채워서 보내준다)
export type PolicyCard = {
  id: string; // 정책 ID
  title: string; // 정책명
  target: string; // 지원대상
  content: string; // 지원내용 (지자체 정책은 요약)
  applyMethod: string; // 신청방법 (없을 수 있음)
  department: string; // 담당부처
  supportType: string; // 제공유형 (현금, 바우처 등)
  digest: string; // 한 줄 요약
  url?: string; // 복지로 상세 페이지 주소 (예전에 보관한 카드에는 없을 수 있음)
  isLocal?: boolean; // 지자체 정책
  what?: string; // 카드 요점: 무엇을 받는지 (AI가 만든 한 줄. 상세 답변 카드·예전 카드에는 없음)
  who?: string; // 카드 요점: 누가 받는지
};

// 대화창에 표시되는 메시지 한 개
export type Message = {
  id: string;
  text: string; // 답변 글 (정책 목록 답변이면 AI 소개. 화면에서는 마스코트 안내로 대신함)
  isUser: boolean; // true: 내가 보낸 말, false: 챗봇 답변
  isError?: boolean; // 서버 연결 실패 안내 말풍선
  replyType?: string; // 답변 종류 (list, detail, ask, no_result, detail_fail, blocked, general) → 마스코트 안내
  cards?: PolicyCard[]; // 추천 정책 카드 (검색 답변일 때만)
  detected?: string[]; // 이 대화에서 새로 알게 된 정보 (예: 저소득, 장애인) → "내 정보에 저장할까요?"
};
