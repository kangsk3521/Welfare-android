import { confirm } from '@/utils/dialog';

// 민감정보(장애 여부) 동의 확인창. 설정 화면과 대화창 "저장할까요?" 안내에서 같은 문구를 쓴다.
// 동의하면 true. (동의 상태 저장은 부르는 쪽에서 profile-context의 setSensitiveConsent로)
export function askSensitiveConsent(): Promise<boolean> {
  return confirm(
    '장애 여부는 법에서 정한 민감정보예요.\n\n' +
      '· 이 휴대폰에만 암호화해서 저장돼요.\n' +
      '· 맞춤 혜택을 찾을 때만 함께 보내지고 서버에는 저장하지 않아요.\n' +
      '· 언제든 설정에서 동의를 거두면 바로 지워져요.\n\n' +
      '동의할까요?',
    '동의'
  );
}
