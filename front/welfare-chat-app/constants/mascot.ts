import { ImageSourcePropType } from 'react-native';

// 마스코트 그림 (디자인 시안 mockup/des_1). 전색맹 모드에서는 흑백 그림을 쓴다.
export type MascotKind = 'success' | 'fail' | 'no' | 'listen';

const COLOR: Record<MascotKind, ImageSourcePropType> = {
  success: require('@/assets/mascot/success.png'),
  fail: require('@/assets/mascot/fail.png'),
  no: require('@/assets/mascot/no.png'),
  listen: require('@/assets/mascot/listen.png'),
};

const GRAY: Record<MascotKind, ImageSourcePropType> = {
  success: require('@/assets/mascot/success_gray.png'),
  fail: require('@/assets/mascot/fail_gray.png'),
  no: require('@/assets/mascot/no_gray.png'),
  listen: require('@/assets/mascot/listen_gray.png'),
};

export const mascotImage = (kind: MascotKind, gray: boolean) => (gray ? GRAY : COLOR)[kind];
