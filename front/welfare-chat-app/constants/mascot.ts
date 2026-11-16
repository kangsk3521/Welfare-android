import { ImageSourcePropType } from 'react-native';

// 마스코트 그림 (디자인 시안 mockup/des_1, 360px로 줄인 것)
export type MascotKind = 'success' | 'fail' | 'no' | 'listen';

export const MASCOT: Record<MascotKind, ImageSourcePropType> = {
  success: require('@/assets/mascot/success.png'),
  fail: require('@/assets/mascot/fail.png'),
  no: require('@/assets/mascot/no.png'),
  listen: require('@/assets/mascot/listen.png'),
};
