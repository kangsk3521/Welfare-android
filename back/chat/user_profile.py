"""앱이 요청마다 보내는 사용자 기본 정보(프로필) 다루기.

프로필은 사용자 휴대폰에만 저장되고, 채팅할 때 맥락으로 함께 온다. 서버는 이번 요청을 처리하는 데만 쓰고
따로 저장하거나 로그에 남기지 않는다. (LangGraph 상태에는 들어가지만 다음 요청 때 새 값으로 덮어써진다)

쓰는 곳
- 검색 조건 기본값: 나이 → 생애주기, 가구상황·장애 → 대상구분 (대화에서 말한 조건이 없을 때 보충, 순위 가산점용)
- 지역 필터: 사는 곳 지자체 정책 + 중앙부처 정책만 검색
- AI 소개 문구 맥락: "약 71세, 서울특별시 송파구, 저소득"
"""

from datetime import date
from typing import List, Optional

from pydantic import BaseModel, Field

# 앱 설정 화면과 같은 값. 백엔드 대상구분(TargetGroup) 이름과 같다
HOUSEHOLD_TAGS = ["저소득", "한부모·조손", "다자녀", "다문화·탈북민", "보훈대상자"]
DISABILITY_TAG = "장애인"
# 대화 중에 감지되면 앱이 "저장할까요?"라고 물어볼 수 있는 대상구분
DETECTABLE_TAGS = HOUSEHOLD_TAGS + [DISABILITY_TAG]


class UserProfileIn(BaseModel):
    birth_year: Optional[int] = Field(default=None, ge=1900, le=2100)
    province: Optional[str] = Field(default=None, max_length=30)
    district: Optional[str] = Field(default=None, max_length=30)
    household: List[str] = Field(default_factory=list)
    disability: Optional[bool] = None  # 앱에서 민감정보 동의가 있을 때만 보낸다

    def cleaned(self) -> dict:
        """모르는 값은 버리고 dict로"""
        return {
            "birth_year": self.birth_year,
            "province": self.province or None,
            "district": self.district or None,
            "household": [h for h in self.household if h in HOUSEHOLD_TAGS],
            "disability": self.disability,
        }


def age_of(profile: dict) -> Optional[int]:
    by = (profile or {}).get("birth_year")
    return date.today().year - by if by else None


def life_cycle_of(profile: dict) -> List[str]:
    """나이 → 생애주기 (DB LifeCycle 이름)"""
    age = age_of(profile)
    if age is None:
        return []
    if age < 6:
        return ["영유아"]
    if age < 13:
        return ["아동"]
    if age < 19:
        return ["청소년"]
    if age < 40:
        return ["청년"]
    if age < 65:
        return ["중장년"]
    return ["노년"]


def target_groups_of(profile: dict) -> List[str]:
    """가구상황 + 장애 → 대상구분 (DB TargetGroup 이름)"""
    profile = profile or {}
    tags = list(profile.get("household") or [])
    if profile.get("disability"):
        tags.append(DISABILITY_TAG)
    return tags


def describe(profile: dict) -> str:
    """AI 프롬프트에 넣을 한 줄 설명. 정보가 없으면 '없음'"""
    profile = profile or {}
    parts = []
    age = age_of(profile)
    if age is not None:
        parts.append(f"약 {age}세")
    region = " ".join(x for x in [profile.get("province"), profile.get("district")] if x)
    if region:
        parts.append(f"{region} 거주")
    parts += target_groups_of(profile)
    return ", ".join(parts) or "없음"


# "저장할까요?"를 묻기 전 이중 확인용: 사용자가 직접 쓴 문장에 이 말이 있어야 감지로 인정한다.
# 조건 추출 AI가 근거 없이 대상구분을 채우는 경우가 있어서다 (예: "노인 일자리"만 말했는데 보훈대상자·저소득).
# 띄어쓰기를 지운 문장에서 찾는다. 빠뜨리는 표현이 있어도 괜찮다 (설정에서 직접 고를 수 있음). 엉뚱하게 묻는 것보다 낫다.
TAG_EVIDENCE = {
    "저소득": ["저소득", "기초생활", "기초수급", "수급자", "차상위", "생계급여", "소득이없", "소득이적",
              # '어렵다'는 '어렵습니다'와 '어려운·어려워요'로 글자가 갈리므로 두 형태를 다 둔다
              # (2026-11-16 평가: '형편이어렵'만 있어서 "형편이 어려워요" 14턴을 저소득 근거로 못 잡음)
              "형편이어렵", "형편이어려", "어려운형편", "형편이힘들", "형편이안좋", "돈이없", "생활이어렵", "생활이어려",
              "생활비가부족", "가난",
              "벌이가없", "벌이가적"],
    "한부모·조손": ["한부모", "싱글맘", "싱글대디", "미혼모", "미혼부", "조손", "손주를키", "손자를키", "손녀를키",
                 "혼자아이를키", "혼자애를키"],
    "다자녀": ["다자녀", "셋째", "넷째", "아이가셋", "아이셋", "애가셋", "자녀가셋", "자녀셋", "세자녀", "세아이"],
    "다문화·탈북민": ["다문화", "탈북", "북한이탈", "새터민", "결혼이민", "이주여성", "외국인아내", "외국인남편"],
    "보훈대상자": ["보훈", "유공자", "참전", "상이군경"],
    "장애인": ["장애", "휠체어", "자폐"],
}


def has_evidence(tag: str, user_text: str) -> bool:
    """사용자가 쓴 문장에 그 대상구분을 나타내는 말이 들어 있는지"""
    text = "".join((user_text or "").split())
    return any(word in text for word in TAG_EVIDENCE.get(tag, []))


def new_detected(detected: List[str], profile: dict) -> List[str]:
    """이번 대화에서 감지된 대상구분 중 프로필에 아직 없는 것만 (앱이 저장할지 물어볼 목록)"""
    have = set(target_groups_of(profile))
    return [t for t in dict.fromkeys(detected) if t in DETECTABLE_TAGS and t not in have]
