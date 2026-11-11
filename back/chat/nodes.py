import os
import re
from dotenv import load_dotenv, find_dotenv
from langchain_neo4j import Neo4jGraph
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import AIMessage, HumanMessage
from langchain_upstage import ChatUpstage
from langchain_upstage.embeddings import UpstageEmbeddings

from state import AgentState, IntentClassification, ConditionExtraction, TargetResolution, CardIntro
import user_profile as profile_mod
from prompts import (
    INTENT_SYSTEM_PROMPT,
    RESOLVE_SYSTEM_PROMPT,
    ANSWER_SYSTEM_PROMPT,
    CARD_INTRO_PROMPT,
    EXTRACT_SYSTEM_PROMPT,
    GENERAL_CHAT_PROMPT, 
    ASK_DETAILS_PROMPT,
    SUMMERIZE_SYSTEM_PROMPT
)

# ---------------------------------------------------------
# LLM 
load_dotenv(find_dotenv())
api_key=os.getenv('UPSTAGE_API_KEY')

#선요약
summarize_llm = ChatUpstage(model="solar-mini",timeout=60, max_retries=1, temperature=0)

#의도분류
llm = ChatUpstage(model="solar-pro", timeout=60, max_retries=1, temperature=0)
structured_llm = llm.with_structured_output(IntentClassification)

#대화
chat_llm = ChatUpstage(model="solar-pro",timeout=60, max_retries=1, temperature=0)

#임베딩 모델
query_emb_model = UpstageEmbeddings(
    api_key=api_key,
    model="solar-embedding-1-large-query",
    timeout=60
)
#db연결
graph = Neo4jGraph()


# --------------------------------------------------------- 
# 의도 분류 라우팅

# 의도 분류 시스템 프롬프트 

intent_prompt = ChatPromptTemplate.from_messages([
    ("system", INTENT_SYSTEM_PROMPT),
    ("placeholder", "{messages}") # 이전 대화 기록
])

# 프롬프트와 LLM 체인 연결
intent_chain = intent_prompt | structured_llm

# 조건 추출 체인
extract_prompt = ChatPromptTemplate.from_messages([
    ("system", EXTRACT_SYSTEM_PROMPT),
    ("placeholder", "{messages}")
])
extract_chain = extract_prompt | llm.with_structured_output(ConditionExtraction)

# 카드형 답변 체인: 짧은 소개 + 보여줄 정책 번호 고르기
card_intro_prompt = ChatPromptTemplate.from_messages([
    ("system", CARD_INTRO_PROMPT),
    MessagesPlaceholder(variable_name="messages")
])
card_intro_chain = card_intro_prompt | llm.with_structured_output(CardIntro)


# DB 청크 내용은 "[정책명: OO] 지원대상: 내용..." 형태라 앞의 머리말을 떼고 내용만 남긴다
_CHUNK_PREFIX = re.compile(r"^\[정책명:.*?\]\s*[^:]{1,10}:\s*")

def _chunk_text(content: str | None) -> str:
    return _CHUNK_PREFIX.sub("", (content or "").strip(), count=1)


# 정책 ID(servId)로 복지로 상세 페이지 주소를 만든다 (팀원 카드뉴스 커밋에서 가져옴)
BOKJIRO_URL = "https://www.bokjiro.go.kr/ssis-tbu/ssis-tbu/twataa/wlfareInfo/moveTWAT52011M.do?wlfareInfoId="


def build_policy_card(record: dict) -> dict:
    """검색된 정책 1개를 앱 카드용 데이터로 정리한다.
    중앙부처 정책은 지원대상·서비스내용·신청방법 청크가 있고, 지자체 정책은 요약만 있다."""
    chunks = {c["type"]: _chunk_text(c["content"]) for c in (record.get("all_chunks") or []) if c.get("type")}
    digest = (record.get("digest") or "").strip()
    return {
        "id": record["id"],
        "title": record["title"],
        "target": chunks.get("지원대상", ""),
        "content": chunks.get("서비스내용") or chunks.get("요약") or digest,
        "apply_method": chunks.get("신청방법", ""),
        "department": record.get("department") or "",
        "support_type": record.get("support_type") or "",
        "digest": digest,
        "url": f"{BOKJIRO_URL}{record['id']}",
    }


def classify_intent_node(state: AgentState):
    result = None
    for _ in range(2):
        try:
            result = intent_chain.invoke({"messages": state["messages"]})
        except Exception as e:
            print(f"의도 분류 호출 실패: {e}")
        if result is not None:
            break
    if result is None:
        result = IntentClassification(intent="복지검색", reasoning="구조화 출력 실패, 기본값 적용")

    intent = result.intent
    if intent == "상세요구" and not state.get("recommendation_history"):
        intent = "복지검색"   # 보여준 목록이 없으면 상세요구 불가 (LLM 호출 없이 강등)

    print(f"분석 결과: {intent} (이유: {result.reasoning})\n\n")
    return {"intent": intent, "target_policy": []}
    


resolve_prompt = ChatPromptTemplate.from_messages([
    ("system", RESOLVE_SYSTEM_PROMPT),
    ("placeholder", "{messages}")
])
resolve_chain = resolve_prompt | llm.with_structured_output(TargetResolution)


def resolve_target_node(state: AgentState):
    history = state.get("recommendation_history", [])
    current_names = state.get("current_recommended_names", [])
    all_names = state.get("recommended_names", [])

    history_str = ""
    for turn_idx, names in enumerate(history):
        tag = " (가장 최근 = 현재 목록)" if turn_idx == len(history) - 1 else ""
        history_str += f"[{turn_idx+1}번째 검색 결과{tag}]\n"
        for i, name in enumerate(names):
            history_str += f"  {i+1}. {name}\n"
    current_names_str = "\n".join(f"{i+1}. {n}" for i, n in enumerate(current_names)) or "없음"

    result = None
    for _ in range(2):
        try:
            result = resolve_chain.invoke({
                "messages": state["messages"],
                "current_recommendations": current_names_str,
                "search_history": history_str or "없음",
            })
        except Exception as e:
            print(f"대상 지목 호출 실패: {e}")
        if result is not None:
            break

    def valid(t):
        if t.isdigit():
            return 0 < int(t) <= len(current_names)
        return any(t in n or n in t for n in all_names)

    targets = [t for t in (result.target_policy if result else []) if valid(t)]
    intent = "상세요구" if targets else "복지검색"   # 못 찾으면 새 검색으로 강등

    print(f"대상 지목: {targets} (이유: {result.reasoning if result else '호출 실패'})\n\n")
    return {"intent": intent, "target_policy": targets}


# --------------------------------------------
# 선요약

summarize_prompt = ChatPromptTemplate.from_messages([
    ("system", SUMMERIZE_SYSTEM_PROMPT),
    ("placeholder", "{messages}") # 이전 대화 기록
])

summarize_chain = summarize_prompt | summarize_llm

def pre_summarize_node(state: AgentState):

    messages = state["messages"]
    latest_user_message = messages[-1].content

    if len(latest_user_message) > 300:
        print("300자 초과하여 요약 실행")
        response = summarize_chain.invoke({"messages": [messages[-1]]})
        latest_user_message = response.content
        print(f"요약된 문장:\n{latest_user_message}")

    #"current_query" 필드에 가장 최근의 메시지를 넣음. (요약된것이든 원문이든)
    return {"current_query": latest_user_message}



#---------------------------------------조건 추출

def extract_conditions_node(state: AgentState):
    result = None
    for _ in range(2):
        try:
            result = extract_chain.invoke({"messages": state["messages"]})
        except Exception as e:
            print(f"조건 추출 호출 실패: {e}")
        if result is not None:
            break
    if result is None:
        result = ConditionExtraction(reasoning="구조화 출력 실패, 기본값 적용")

    def merge_condition(prev, add, remove):
        return list((set(prev) | set(add)) - set(remove))   

    target_group = merge_condition(state.get("target_group", []), result.target_group_add, result.target_group_remove)
    # 이중 확인: 조건 추출 AI가 근거 없이 대상구분을 붙이는 경우가 있다 (예: "고령자 계속고용장려금 신청 방법" → 보훈대상자).
    # 지금까지 사용자가 쓴 문장 어딘가에 그 말이 있을 때만 검색 조건으로 남긴다. 이전 턴에 잘못 붙은 것도 여기서 빠진다
    user_text = " ".join(m.content for m in state["messages"] if m.type == "human")
    dropped = [t for t in target_group if not profile_mod.has_evidence(t, user_text)]
    if dropped:
        print(f"근거 없는 대상구분 제외: {dropped}")
    target_group = [t for t in target_group if t not in dropped]
    theme = merge_condition(state.get("theme", []), result.theme_add, result.theme_remove)

    life_cycle_value = result.life_cycle
    if life_cycle_value == "임신·출산":
        life_cycle_value = "임신 · 출산"
    life_cycle = [life_cycle_value] if life_cycle_value is not None else state.get("life_cycle", [])



    search_query = result.search_query.strip() or state.get("current_query", "")
    # 앱이 보낸 프로필(나이·가구상황)이 있으면 그것도 조건으로 친다 → "받을 수 있는 혜택 있어?"에도 되묻지 않고 바로 검색
    profile = state.get("user_profile") or {}
    profile_slots = [profile_mod.life_cycle_of(profile), profile_mod.target_groups_of(profile)]
    filled_slots_count = sum(1 for slot in [life_cycle, target_group, theme, *profile_slots] if slot)

    final_intent = "검색가능" if (result.topic_given or filled_slots_count >= 1) else "조건부족"

    print(f"분석 결과: {final_intent} (이유: {result.reasoning})")
    print(f"검색 질의: {search_query} (topic_given: {result.topic_given})")
    print(f"추출된 조건: 생애({life_cycle}), 가구({target_group}), 주제({theme})")
    print("\n\n")

    return {
        "intent": final_intent,
        "search_query": search_query,
        "life_cycle": life_cycle,
        "target_group": target_group,
        "theme": theme,
        # 이번 말에서 새로 나온 대상구분 (예: "장애가 있어서" → 장애인). 앱이 프로필에 저장할지 물어본다
        # AI가 근거 없이 채우는 경우가 있어서, 사용자가 이번에 쓴 문장에 그 말이 실제로 있을 때만 인정한다
        "detected_tags": [t for t in result.target_group_add
                          if t in profile_mod.DETECTABLE_TAGS
                          and profile_mod.has_evidence(t, state["messages"][-1].content)],
    }


# --------------------------------------------
# 검색

VEC_TOP_K = 30
VEC_TOP_K_REGION = 120  # 지역 필터가 있을 때: 다른 지역 정책이 걸러지는 만큼 후보를 더 가져온다
VEC_THRESHOLD = 0.63
SLOT_BOOST=0.03
RESULT_LIMIT = 5
CHUNKS_PER_POLICY = 2
CHUNK_MAX_CHARS = 1200

def execute_search_node(state: AgentState):
    print("db 검색")

    query_text = state.get("search_query") or state["current_query"]
    life_cycle = state.get("life_cycle", [])
    target_group = state.get("target_group", [])
    theme = state.get("theme", [])

    # 앱이 보낸 프로필로 조건 보충 (대화에서 말한 조건이 우선, 없을 때만 나이 → 생애주기). 가구상황·장애는 더한다
    profile = state.get("user_profile") or {}
    if not life_cycle and profile_mod.life_cycle_of(profile):
        life_cycle = profile_mod.life_cycle_of(profile)
        # "받을 수 있는 혜택 있어?"처럼 모호한 질문은 문장만으로는 검색이 잘 안 돼서, 생애주기 단어를 덧붙여 찾는다
        query_text = f"{query_text} {life_cycle[0]}"
    target_group = list(set(target_group) | set(profile_mod.target_groups_of(profile)))
    province, district = profile.get("province"), profile.get("district")

    query_embedding = query_emb_model.embed_query(query_text)

    # 지역 필터: 사는 곳(시·도)을 알면 중앙부처 정책 + 그 지역 지자체 정책만.
    # 시·군·구까지 알면 그 시·군·구 + 시·도 전체 대상(DB 시군구 값이 "-", "전체", "○○교육청") 정책만.
    # 걸러지는 만큼 벡터 후보를 더 많이 가져온다.
    cypher_vec = """
    CALL db.index.vector.queryNodes('chunk_embedding_index', $k, $query_embedding)
        YIELD node AS c, score AS vec_score
    MATCH (p:Policy)-[:HAS_INFO]->(c)
    WITH p, max(vec_score) AS max_score,
         collect({type: c.type, content: c.content, score: vec_score}) AS hits
    WHERE max_score >= $threshold
      AND ($province IS NULL
           OR EXISTS { MATCH (p)-[:AVAILABLE_IN]->(:Region {code: '중앙'}) }
           OR EXISTS { MATCH (p)-[:AVAILABLE_IN]->(dd:District)
                       WHERE dd.code STARTS WITH $province + '::'
                         AND ($district IS NULL OR dd.name = $district
                              OR dd.name IN ['-', '전체'] OR dd.name ENDS WITH '교육청') })
    RETURN p.servId AS id, p.servNm AS title, p.servDgst AS digest,
           [(p)-[:MANAGED_BY]->(d:Department) | d.name][0] AS department,
           [(p)-[:PROVIDES]->(s:SupportType) | s.name][0] AS support_type,
           max_score AS score, hits,
           [(p)-[:TARGETS_AGE]->(l:LifeCycle) | l.name] AS life_cycles,
           [(p)-[:TARGETS_GROUP]->(t:TargetGroup) | t.name] AS target_groups,
           [(p)-[:RELATES_TO]->(th:Theme) | th.name] AS themes,
           [(p)-[:HAS_INFO]->(ac:Chunk) | {type: ac.type, content: ac.content}] AS all_chunks
    """
    records = graph.query(cypher_vec, params={
        "k": VEC_TOP_K_REGION if province else VEC_TOP_K,
        "query_embedding": query_embedding,
        "threshold": VEC_THRESHOLD,
        "province": province,
        "district": district,
    })

    # 조건이 일치하는 슬롯 하나당 가산점 (필터가 아니라 순위 보정)
    def boosted(r):
        matched = (bool(set(life_cycle) & set(r["life_cycles"]))
                   + bool(set(target_group) & set(r["target_groups"]))
                   + bool(set(theme) & set(r["themes"])))
        return r["score"] + SLOT_BOOST * matched

    records = sorted(records, key=boosted, reverse=True)[:RESULT_LIMIT]

    if not records:
        formatted_results = "조건에 맞는 복지 정책을 찾지 못했습니다."
        rec_ids, rec_names = [], []
    else:
        result_texts, rec_ids, rec_names = [], [], []
        for i, record in enumerate(records):
            rec_ids.append(record["id"])
            rec_names.append(record["title"])

            # 벡터가 찾은 청크 중 점수 높은 순, 같은 type은 1개만
            seen, parts = set(), []
            for h in sorted(record["hits"], key=lambda h: h["score"], reverse=True):
                if h["type"] in seen:
                    continue
                seen.add(h["type"])
                parts.append(f"■ {h['type']}\n{(h['content'] or '')[:CHUNK_MAX_CHARS]}")
                if len(parts) >= CHUNKS_PER_POLICY:
                    break
            body = "\n\n".join(parts) if parts else f"- 요약: {record['digest']}"

            result_texts.append(
                f"[{i+1}순위] 정책명: {record['title']} (Score: {record['score']:.4f})\n"
                f"- 담당부처: {record.get('department') or '정보없음'}\n"
                f"- 제공유형: {record.get('support_type') or '정보없음'}\n"
                f"{body}\n{'-' * 30}"
            )
        formatted_results = "\n".join(result_texts)
        print(f"{len(records)}개 정책 검색: {rec_names}")

    return {
        "search_results": formatted_results,
        "recommended_ids": rec_ids,
        "recommended_names": rec_names,
        "current_recommended_ids": rec_ids,
        "current_recommended_names": rec_names,
        "ask_count": 0,
        "current_cards": [build_policy_card(r) for r in records],  # 검색 순위 순서
    }


# --------------------------------------------
# 상세 검색
def execute_detail_search_node(state: AgentState):
    print("상세 정보 가져오기")
    
    targets = state.get("target_policy", [])
    curr_ids = state.get("current_recommended_ids", [])
    all_ids = state.get("recommended_ids", [])
    all_names = state.get("recommended_names", [])
    
    # 예외처리: 추천해 둔 ID가 없을 때
    if not all_ids:
        return {"search_results": "이전에 추천해 드린 정책 목록이 없어 상세 정보를 가져올 수 없습니다. 다시 검색해 주세요.",
                "current_cards": []}
    
    matched_ids = []

    for target in targets:
        # 순수 숫자인 경우 -> int()로 변환 후 -1을 하여 현재 화면(current) 인덱스로 매칭
        if target.isdigit():
            idx = int(target) - 1
            if 0 <= idx < len(curr_ids):
                matched_ids.append(curr_ids[idx])
        else:
            # 숫자가 아닌 문자열(이름)인 경우 -> 전체 누적 이름(all_names) 목록에서 탐색
            for idx, name in enumerate(all_names):
                if target in name or name in target:
                    matched_ids.append(all_ids[idx])

    if not matched_ids and curr_ids:
        matched_ids.append(curr_ids[0])
        print("오류: 매치되는 정책없음")
    
    # 정책 1개당 한 줄로 가져온다 (카드를 만들 수 있게 담당부처·제공유형·요약도 함께)
    cypher_query = """
    MATCH (p:Policy) WHERE p.servId IN $target_ids
    RETURN p.servId AS id, p.servNm AS title, p.servDgst AS digest,
           [(p)-[:MANAGED_BY]->(d:Department) | d.name][0] AS department,
           [(p)-[:PROVIDES]->(s:SupportType) | s.name][0] AS support_type,
           [(p)-[:HAS_INFO]->(c:Chunk) | {type: c.type, content: c.content}] AS all_chunks
    """

    records = graph.query(cypher_query, params={"target_ids": matched_ids})

    if not records:
        return {"search_results": "해당 정책의 상세 정보를 찾을 수 없습니다.", "current_cards": []}

    # 사용자가 말한 순서대로 (같은 정책이 여러 번 매칭돼도 한 번만)
    order = {pid: i for i, pid in reversed(list(enumerate(matched_ids)))}
    records = sorted(records, key=lambda r: order.get(r["id"], len(order)))

    print(f"[detail] targets={targets}, matched_ids={matched_ids}, 가져온 정책={[r['title'] for r in records]}")

    # 상세 정보 텍스트 가공 (AI 답변용)
    result_texts = []
    for r in records:
        chunks = [f"■ {c['type']}\n{c['content']}" for c in (r["all_chunks"] or [])]
        text = f"[{r['title']}] 상세 정보\n\n" + "\n\n".join(chunks) + "\n" + "="*40
        result_texts.append(text)

    return {
        "search_results": "\n\n".join(result_texts),
        "detail_titles": [r["title"] for r in records],
        "current_cards": [build_policy_card(r) for r in records],  # 상세 답변에도 해당 정책 카드를 붙인다
    }



# --------------------------------------------
# 답변생성

CARD_FALLBACK_INTRO = "말씀하신 상황에 맞는 복지 혜택을 찾았어요. 카드를 눌러 자세히 확인해 보세요."


def _plain_text(text: str) -> str:
    """앱 말풍선은 마크다운을 그리지 않아 기호가 그대로 보인다 → 굵게(**), 제목(###), 구분선(---)만 지운다.
    (목록 기호 '- '와 줄바꿈은 글로 읽어도 자연스러워서 그대로 둔다)"""
    text = re.sub(r"\*\*(.+?)\*\*", r"\1", text)
    text = re.sub(r"^\s*#{1,6}\s*", "", text, flags=re.M)
    text = re.sub(r"^[ \t]*-{3,}[ \t]*$", "", text, flags=re.M)
    return re.sub(r"\n{3,}", "\n\n", text).strip()

def _card_answer(messages, search_results, cards, user_info="없음"):
    """카드형 답변 메시지를 만든다.
    카드 데이터는 메시지의 additional_kwargs["policy_cards"]에 담는다 → /chat 응답과 대화 기록(history)에 함께 실린다."""
    intro, picks = CARD_FALLBACK_INTRO, list(range(1, len(cards) + 1))
    try:
        result = card_intro_chain.invoke({"search_results": search_results, "messages": messages, "user_info": user_info})
        intro = _plain_text(result.intro or "") or intro
        # 범위 밖 번호·중복 제거, 순위 순서 유지
        picks = sorted({p for p in result.picks if 1 <= p <= len(cards)})
    except Exception as e:
        print(f"카드 소개 생성 실패, 기본값 사용: {e}")

    shown = [cards[p - 1] for p in picks]
    print(f"카드 {len(shown)}개 표시: {[c['title'] for c in shown]}")

    response = AIMessage(content=intro, additional_kwargs={"policy_cards": shown})
    names = [c["title"] for c in shown]
    return {
        "messages": [response],
        # "2번 자세히 알려줘"처럼 번호로 물을 때 화면의 카드 순서와 맞도록 갱신
        "current_recommended_ids": [c["id"] for c in shown],
        "current_recommended_names": names,
        "recommendation_history": [names],
        "reply_type": "list",
    }


def generate_answer_node(state: AgentState):
    print("답변 생성")
    
    messages = state["messages"] 
    search_results = state.get("search_results", "검색 결과가 없습니다.")

    intent = state.get("intent", "")

    if search_results.startswith("조건에 맞는 복지 정책을 찾지 못했습니다"):
        msg = "조건에 맞는 정책을 찾지 못했습니다. 상황을 조금 다르게 말씀해 주시면 다시 찾아볼게요."
        return {"messages": [AIMessage(content=msg)], "recommendation_history": [[]], "reply_type":"no_result"}
    if search_results.startswith(("이전에 추천해", "해당 정책의 상세 정보")):
        return {"messages": [AIMessage(content=search_results)], "reply_type": "detail_fail"}

    # 카드형 답변: 정책 목록을 보여주는 턴이면 정책 내용은 앱 카드로 보여주고, AI는 짧은 소개와 보여줄 정책만 고른다
    cards = state.get("current_cards") or []
    if intent != "상세요구" and cards:
        return _card_answer(messages, search_results, cards, profile_mod.describe(state.get("user_profile") or {}))

    if intent == "상세요구":
        # 정책 전체 내용은 앱 카드(누르면 확대)로 함께 보여주므로, AI 글은 물어본 내용 중심으로 짧게
        guide = ("사용자가 선택한 정책의 [상세 정보]를 제공 중입니다. 정책의 전체 내용(지원대상·지원내용·신청방법)은 "
                 "답변 아래에 카드로 함께 보여지므로 모두 옮겨 적지 마세요. 사용자가 물은 것(예: 신청 방법, 대상 여부)에 대한 답을 "
                 "중심으로 3~6문장으로 간결하게 설명하고, 마지막에 '카드를 누르면 전체 내용을 볼 수 있어요'라고 안내하세요. "
                 "마크다운 기호(**, ###, ---)와 표는 쓰지 마세요. "
                 f"참고할 [사용자 정보]: {profile_mod.describe(state.get('user_profile') or {})} "
                 "(대화 내용과 다르면 대화를 따르고, 사용자 정보를 그대로 읊지 마세요)")
    else:
        # 카드가 없을 때만 오는 경로라 글로 목록을 안내한다 (카드가 있으면 위의 _card_answer)
        guide = ("여러 정책의 [목록과 요약]을 제공 중입니다. 사용자가 신청 방법, 지원 대상, 지원 내용 등 특정 정보를 물었다면 "
                 "그 정보를 먼저 답하세요. 요약하여 소개한 뒤 '더 자세히 알고 싶은 정책이 있다면 번호나 이름을 말씀해 주세요'라고 유도하세요.")

    if intent == "상세요구" and state.get("detail_titles"):
        titles = ", ".join(state["detail_titles"])
        messages = messages[:-1] + [HumanMessage(
            content=f"{messages[-1].content}\n[시스템 확인: 이 질문의 대상 정책은 '{titles}'입니다]"
        )]


    formatted_prompt = ANSWER_SYSTEM_PROMPT.format(
        guide=guide, 
        search_results=search_results
    )
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", formatted_prompt),
        MessagesPlaceholder(variable_name="messages") 
    ])
   
    
    
    chain = prompt | chat_llm
    response = chain.invoke({
        "guide":guide,
        "search_results": search_results,
        "messages": messages
    })


    if intent != "상세요구":   # 목록을 보여준 턴
        return {"messages": [response],
                "recommendation_history": [state.get("current_recommended_names", [])],
                "reply_type": "list"}

    # 상세 답변: 물어본 정책 카드를 답변에 붙인다 (목록 답변처럼 /chat 응답·대화 기록에 함께 실림)
    if cards:
        response = AIMessage(content=_plain_text(response.content), additional_kwargs={"policy_cards": cards})
    return {"messages": [response], "reply_type": "detail"}
    


# --------------------------------------------------------- 
# 일상 대화

def general_chat_node(state: AgentState):
    print("일상 대화 답변 생성")
    
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", GENERAL_CHAT_PROMPT),
        MessagesPlaceholder(variable_name="messages")
    ])
    
    response = (prompt | chat_llm).invoke({"messages": state["messages"]})
    return {"messages": [response], "reply_type":"general"}


# --------------------------------------------------------- 
# 공격방어

def block_attack_node(state: AgentState):
    print("프롬프트 공격 방어")

    response = "서비스 검색과 무관한 지시, 시스템 설정을 변경하려는 요청은 응답할수없습니다."
    return {"messages": [AIMessage(content=response)],"reply_type":"blocked"}




def ask_for_details_node(state: AgentState):
    print("부족한 조건 묻기")
    
    response = (ChatPromptTemplate.from_messages([
        ("system", ASK_DETAILS_PROMPT),
        MessagesPlaceholder(variable_name="messages")
    ]) | chat_llm).invoke({"messages": state["messages"]})
    return {"messages": [response], "ask_count": state.get("ask_count", 0) + 1, "reply_type":"ask"}

