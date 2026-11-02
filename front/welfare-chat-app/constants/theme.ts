import { Platform, TextStyle } from 'react-native';

// 웹에서 입력칸을 선택했을 때 브라우저가 그리는 까만 테두리 끄기 (입력칸 style 배열 끝에 넣어서 사용).
// 'none'은 웹 전용 값이라 React Native 타입에 없어서 형변환하고, 앱에서는 아무것도 적용하지 않는다.
export const webNoOutline = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as unknown as TextStyle) : undefined;

// 앱 화면에서 쓰는 색 (목업 기준). 색약모드는 빨강/초록 대신 파랑/주황 계열(Okabe-Ito)을 쓴다.
const basePalette = {
  background: '#F3ECE1',
  surface: '#FDF9F2',
  border: '#C4AE8A',
  text: '#3B2F23',
  subText: '#8A7A66',
  chip: '#E8DFCF',
  onAccent: '#FFFFFF',
  accent: '#CC8E4C',
  accentStrong: '#B5753A',
  recording: '#B5452E',
  star: '#C0504D',
  starOff: '#B0ABA3',
  danger: '#B5452E',
};

export const Palettes = {
  default: basePalette,
  colorBlind: {
    ...basePalette,
    border: '#8FA3B5',
    chip: '#DCE4EC',
    subText: '#4F6274',
    accent: '#0072B2',
    accentStrong: '#005A8C',
    recording: '#D55E00',
    star: '#E69F00',
    danger: '#D55E00',
  },
};

export type Palette = typeof basePalette;
