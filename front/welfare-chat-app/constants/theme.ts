import { Platform, TextStyle } from 'react-native';

// 웹에서 입력칸을 선택했을 때 브라우저가 그리는 까만 테두리 끄기 (입력칸 style 배열 끝에 넣어서 사용).
// 'none'은 웹 전용 값이라 React Native 타입에 없어서 형변환하고, 앱에서는 아무것도 적용하지 않는다.
export const webNoOutline = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as unknown as TextStyle) : undefined;

// 앱 화면 색. 디자인 시안(mockup/des_1/des_1.html의 :root)과 같은 값이다.
// 시안 색 조합이 색각이상(녹색맹·적색맹·전색맹·청황색맹)에서도 구분되도록 고른 것이라 색약모드를 따로 두지 않는다.
export const Colors = {
  background: '#F7EDE0', // --color-bg
  surface: '#FFFBF3', // --color-surface (말풍선·카드·위쪽 바)
  head: '#FBEED6', // --color-head (마스코트가 붙는 안내 말풍선)
  border: '#C9AD86', // --color-border
  text: '#3A2E22', // --color-text
  subText: '#8A7A66', // --color-muted
  chip: '#ECDDCA', // --color-muted-bg (#C9AD86 25%)를 배경 위에 겹친 색
  switchOff: '#D9CBB5', // 꺼진 스위치
  onAccent: '#FFFFFF',
  accent: '#E08D3C', // --color-accent (마이크·보내기 버튼)
  accentStrong: '#C97025', // --color-accent-dark (강조 글자·버튼)
  recording: '#D35555', // 듣는 중 표시 (시안 삭제 버튼 색)
  star: '#D64545', // --color-star-red (즐겨찾기 별)
  starOff: '#B7B0A6', // --color-star-gray
  starBg: '#F2C4B8', // --color-star-red-bg (즐겨찾기한 상담방 배경)
  danger: '#D35555', // 시안 삭제 버튼
  inputBackground: '#FFFFFF', // 글자를 직접 쓰는 입력칸 배경 (카드보다 한 단계 밝게)
  switchThumb: '#FFFFFF', // 켜기/끄기 스위치 손잡이
  overlay: 'rgba(58, 46, 34, 0.18)', // 확대 화면 뒤를 살짝 어둡게 덮는 막
  shadow: '#000000',
};

export type Palette = typeof Colors;
