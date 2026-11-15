import { Platform, TextStyle } from 'react-native';

// 웹에서 입력칸을 선택했을 때 브라우저가 그리는 까만 테두리 끄기 (입력칸 style 배열 끝에 넣어서 사용).
// 'none'은 웹 전용 값이라 React Native 타입에 없어서 형변환하고, 앱에서는 아무것도 적용하지 않는다.
export const webNoOutline = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as unknown as TextStyle) : undefined;

// 앱 화면에서 쓰는 색 (목업 기준). 색약모드 4종은 디자인 시안(mockup/des_1/color)의 화면에서 색을 뽑았다.
const basePalette = {
  head: '#FBEED6', // 마스코트가 붙는 안내 말풍선 배경
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
  inputBackground: '#FFFFFF', // 글자를 직접 쓰는 입력칸 배경 (카드보다 한 단계 밝게)
  switchThumb: '#FFFFFF', // 켜기/끄기 스위치 손잡이
  overlay: 'rgba(59, 47, 35, 0.18)', // 확대 화면 뒤를 살짝 어둡게 덮는 막
  shadow: '#000000',
};

export type Palette = typeof basePalette;

// 색약 종류. 설정에서 색약모드를 켜면 이 중 하나를 고른다
export type ColorBlindType = 'deutan' | 'protan' | 'achroma' | 'tritan';

export const COLOR_BLIND_TYPES: { value: ColorBlindType; label: string }[] = [
  { value: 'deutan', label: '녹색맹' },
  { value: 'protan', label: '적색맹' },
  { value: 'achroma', label: '전색맹' },
  { value: 'tritan', label: '청황색맹' },
];

// 시안 색 이름 → 앱 색 이름: bg→background, surface, border, text, muted→subText, 회색 즐겨찾기 배경→chip,
// 마이크·스위치→accent, 전송 글자 버튼→accentStrong, 삭제 버튼→danger·recording, 즐겨찾기 별→star
const colorBlindPalette = (c: Omit<Palette, 'onAccent' | 'inputBackground' | 'switchThumb' | 'overlay' | 'shadow' | 'recording'>): Palette => ({
  ...basePalette,
  ...c,
  recording: c.danger,
});

export const Palettes: Record<'default' | ColorBlindType, Palette> = {
  default: basePalette,
  deutan: colorBlindPalette({
    head: '#E2E6F2', background: '#EDEFF7', surface: '#F6F7FC', border: '#ACB3C9', text: '#272B35',
    subText: '#666C7E', chip: '#E1E5F1', accent: '#496BAC', accentStrong: '#3A5487',
    star: '#938426', starOff: '#AFB2BA', danger: '#898057',
  }),
  protan: colorBlindPalette({
    head: '#E4E7F3', background: '#EEF0F7', surface: '#F7F8FC', border: '#B0B6CA', text: '#292C35',
    subText: '#696E7F', chip: '#E3E6F2', accent: '#5875B0', accentStrong: '#455C8A',
    star: '#7E701E', starOff: '#B1B3BA', danger: '#726D58',
  }),
  achroma: colorBlindPalette({
    head: '#E6E6E6', background: '#EFEFEF', surface: '#F8F8F8', border: '#B4B4B4', text: '#2C2C2C',
    subText: '#6D6D6D', chip: '#E5E5E5', accent: '#6F6F6F', accentStrong: '#585858',
    star: '#7C7C7C', starOff: '#B2B2B2', danger: '#797979',
  }),
  tritan: colorBlindPalette({
    head: '#DCE9EA', background: '#E8F2F2', surface: '#F4F9F9', border: '#9FBABC', text: '#222E2F',
    subText: '#5B7173', chip: '#DBE8E9', accent: '#007F87', accentStrong: '#00646A',
    star: '#CE5258', starOff: '#AAB5B5', danger: '#CA4F5D',
  }),
};
