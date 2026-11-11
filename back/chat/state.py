import operator
from pydantic import BaseModel, Field
from typing import TypedDict, List, Annotated, Literal, Optional
from langchain_core.messages import BaseMessage



# ---------------------------------------------------------출력상태 정의 

class IntentClassification(BaseModel):
    reasoning: str = Field(
            description="가장 먼저 작성. 이 입력을 해당 의도로 분류한 이유를 간결하게. 이 판단에 맞춰 intent를 채울 것."
    )
    intent: Literal["일상대화", "복지검색", "상세요구", "프롬프트공격"] = Field(
        description="사용자의 질문 의도를 분류합니다."
    )

    
class TargetResolution(BaseModel):
    reasoning: str = Field(
        description="가장 먼저 작성. '차수=…(근거 표현), 번호=…, 정책명=…' 순서로 적을 것. 이 판단에 맞춰 target_policy를 채울 것."
    )
    target_policy: List[str] = Field(
        default_factory=list,
        description="가장 최근 검색 결과의 번호로 지목하면 숫자 문자열만 (예: ['2']). "
                    "과거 검색 결과나 이름으로 지목하면 이력에 적힌 정책명 그대로. "
                    "이력에 없는 대상이면 빈 리스트."
    )


class ConditionExtraction(BaseModel):

    reasoning: str = Field(
        description="가장 먼저 작성, 인용 위주로 간결하게. ① 이번 발화와 이전 대화에서 검색할 주제가 무엇인지 "
                    "② 생애주기·가구상황·주제를 채운다면 근거가 되는 사용자의 발화 인용 (인용할 문장이 없으면 그 조건은 비울 것). "
                    "이 판단에 맞춰 아래 필드를 채울 것."
    )
    search_query: str = Field(
        default="",
        description="이전 대화와 이번 질문을 합쳐, 그것만 읽어도 뜻이 통하는 한두 문장의 검색 질의. "
                    "이번 질문이 이미 완결된 문장이면 거의 그대로 쓰고, 후속 질문이면 이전 대화의 주제를 합칠 것. "
                    "정책명이 언급되면 그대로 포함하고, 대화에 없는 내용은 지어내지 말 것."
    )
    topic_given: bool = Field(
        default=True,
        description="이번 발화와 이전 대화를 합쳐서 검색할 구체적 주제(특정 정책명, 분야, 자기 상황 중 하나)가 있으면 true, "
                    "'받을 수 있는 지원금 있어?'처럼 아무 단서도 없으면 false."
    )
    #생애주기
    life_cycle: Optional[Literal["임신·출산", "영유아", "아동", "청소년", "청년", "중장년", "노년"]] = Field(
        default=None,
        description="이번 발화에서 파악된 화자 본인의 생애주기. 언급 없으면 None(이전 값 유지), "
                    "새로 언급되면 그 값으로 교체(이전 값 무효)."
    )
    #상황
    target_group_add: List[Literal["저소득", "장애인", "한부모·조손", "다자녀", "다문화·탈북민", "보훈대상자"]] = Field(default_factory=list)
    target_group_remove: List[Literal["저소득", "장애인", "한부모·조손", "다자녀", "다문화·탈북민", "보훈대상자"]] = Field(default_factory=list)
    #주제
    theme_add: List[Literal["신체건강", "정신건강", "생활지원", "주거", "일자리", "문화·여가", "안전·위기", "임신·출산", "보육", "교육", "입양·위탁", "보호·돌봄", "서민금융", "법률", "에너지"]] = Field(default_factory=list)
    theme_remove: List[Literal["신체건강", "정신건강", "생활지원", "주거", "일자리", "문화·여가", "안전·위기", "임신·출산", "보육", "교육", "입양·위탁", "보호·돌봄", "서민금융", "법률", "에너지"]] = Field(default_factory=list)
    

# 카드 1장의 한 줄 요점 (카드 기본 화면에 크게 보여줌. 긴 원문은 확대 화면에)
class CardSummary(BaseModel):
    no: int = Field(description="[검색 데이터] 순위 번호 (picks에 넣은 번호)")
    what: str = Field(default="", description="무엇을 받는지 한 줄, 25자 이내. 금액·기간·횟수 등 숫자 우선. 예: 월 최대 20만원, 최대 24개월")
    who: str = Field(default="", description="누가 받는지 한 줄, 20자 이내. 예: 만 19~34세 무주택 청년")


# 카드형 답변: AI가 카드 위에 붙일 짧은 소개 + 보여줄 정책 고르기 + 카드별 요점
class CardIntro(BaseModel):
    intro: str = Field(description="카드 위에 보여줄 1~3문장 소개. 정책 이름·세부 내용을 나열하지 말 것")
    picks: List[int] = Field(
        default_factory=list,
        description="사용자 상황에 맞아 카드로 보여줄 정책의 [검색 데이터] 순위 번호(1부터). 순위 순서 그대로",
    )
    summaries: List[CardSummary] = Field(
        default_factory=list,
        description="picks에 넣은 정책마다 하나씩. [검색 데이터]에 있는 내용만 짧게",
    )


class AgentState(TypedDict):
    messages: Annotated[List[BaseMessage], operator.add] # Annotated와 operator.add를 사용하면, 이전 대화 기록에 새 메시지가 계속 누적(append)됩니다.
    current_query: str

    intent: str # LLM이 판단한 의도 (일상대화 / 조건부족 / 검색가능 / 상세요구 / 프롬프트공격)
    search_query: str 
    life_cycle: List[str]
    target_group: List[str]
    theme: List[str]

    ask_count: int

    detail_titles: List[str]

    #검색 누적 보관함
    search_results: str # Neo4j DB에서 검색해 온 최종 정책 데이터 
    recommended_ids: Annotated[List[str], operator.add]   #찾아온 정책 기억
    recommended_names: Annotated[List[str], operator.add]

    target_policy: List[str] 
    current_recommended_ids: List[str]
    current_recommended_names: List[str]

    recommendation_history: Annotated[List[List[str]], operator.add]

    # 이번 검색 결과를 앱 카드용으로 정리한 것 (id, title, target, content, apply_method, department, support_type, digest)
    current_cards: List[dict]

    # 앱이 이번 요청에 함께 보낸 사용자 기본 정보 (user_profile.py). 요청마다 새 값으로 덮어쓴다
    user_profile: dict
    # 이번 대화에서 새로 감지한 대상구분 (예: 장애인, 저소득) → 앱이 "저장할까요?"라고 묻는다
    detected_tags: List[str]

    # 답변 종류 (general, ask, list, detail, no_result, detail_fail, blocked). 나중에 마스코트 표정 등에 쓴다
    reply_type: str


