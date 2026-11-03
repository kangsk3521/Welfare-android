// 사용자 기본 정보. 이 휴대폰의 암호화 저장소에만 저장하고, 채팅할 때 맥락으로 서버에 함께 보낸다(서버는 저장 안 함).
// 항목은 백엔드 검색 분류(state.py의 ConditionExtraction)와 같은 이름을 써서 검색 조건으로 바로 쓸 수 있게 한다.

// 가구·경제 상황 (민감정보 아님). 백엔드 target_group 분류와 같은 값
export const HOUSEHOLD_TAGS = ['저소득', '한부모·조손', '다자녀', '다문화·탈북민', '보훈대상자'] as const;
export type HouseholdTag = (typeof HOUSEHOLD_TAGS)[number];

export type UserProfile = {
  birthYear: number | null; // 출생연도 (나이는 해마다 바뀌어서 연도로 저장)
  province: string | null; // 시·도 (constants/regions.ts의 이름)
  district: string | null; // 시·군·구 (세종처럼 없는 곳은 null)
  household: HouseholdTag[];
  // 장애 여부는 법상 민감정보 → 별도 동의(sensitiveConsent)가 있을 때만 저장
  disability: boolean | null;
  sensitiveConsent: boolean;
  updatedAt: number;
};

export const EMPTY_PROFILE: UserProfile = {
  birthYear: null,
  province: null,
  district: null,
  household: [],
  disability: null,
  sensitiveConsent: false,
  updatedAt: 0,
};

export const MIN_BIRTH_YEAR = 1910;

// 출생연도 → 만 나이 (생일 전이면 1살 적을 수 있어 "약"으로 보여준다)
export const ageFromBirthYear = (birthYear: number) => new Date().getFullYear() - birthYear;

// 사는 곳을 한 줄 글로 (예: "서울특별시 송파구")
export const regionLabel = (p: UserProfile) => [p.province, p.district].filter(Boolean).join(' ');
