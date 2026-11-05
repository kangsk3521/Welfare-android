# 복지 상담 챗봇 (Team SOLV) — 작업 가이드

> 이 파일은 우리가 이 복사본(`welfare-local`)에서 무엇을 만들고 고쳤는지, 어떻게 실행하는지, 다음에 무엇을 할지를 정리한 문서다.
> 새 대화(컨텍스트 초기화) 후에는 **이 파일부터 읽고** 이어서 작업한다. 마지막 갱신: 2026-11-05

---

## 0. 꼭 지킬 것 (작업 규칙)

- **원본 clone(`welfare-android/Welfare`)은 건드리지 않는다.** 작업은 전부 이 복사본 `welfare-android/welfare-local`에서 한다.
  - 원본은 팀원 저장소 `github.com/1062goodman/Welfare` 그대로. `welfare-eval`(성능 평가)이 원본을 쓴다.
- **푸시 금지.** 이 복사본의 원격(origin)이 팀원 저장소라 `git push`하면 팀원 저장소로 간다. 커밋은 사용자가 요청할 때만.
- 커밋할 때 `back/GraphRAG/*`, `back/rag/*`의 수정 4개는 **빼고** 커밋한다 (평가용 임시 수정, 원래 커밋하지 않는 것).
- 사용자와는 한국어로, **한 번에 한 기능씩 짧게** 소통한다. 긴 보고서 금지.
- 비밀값(`back/chat/.env`, 토큰 비밀키)은 절대 커밋·출력하지 않는다 (`.gitignore`에 `**/.env` 있음).

## 1. 현재 상태

- 브랜치: `feature/frontend-mockup` (원본 `966f051 "3 turn"`에서 분기)
- 우리 커밋 4개:
  | 커밋 | 내용 |
  |---|---|
  | `4792a24` | 목업 3개 화면(대화창·목록·설정), 대화창 모듈화, 기기 토큰 인증 |
  | `015bf9f` | 카드형 답변(공유·보관·거절, 블러 확대), 오프닝 화면, 하단 버튼 축소 |
  | `8689835` | 개인정보 암호화 저장·첫 실행 안내, 상세 답변 카드화, 뒤로가기·스크롤 버그 수정 |
  | `839b33c` | 채팅에 프로필 반영(지역 필터·감지 저장), 프론트 구조 정리 |
- 원본 대비: 80개 파일 변경 (+3464 / −1604)
- **GitHub에 팀원 새 커밋 2개가 있는데 아직 안 합침**: `de8daf5 마스코트 추가`, `2bc719e 키보드 추가` (아래 "할 일" 1번)

## 2. 실행 방법

### 앱 (front/welfare-chat-app)
```powershell
cd welfare-local\front\welfare-chat-app
npm install
npx expo start                      # 기본: Render 서버(welfare-1gs5.onrender.com)에 붙음
# 내 PC 백엔드에 붙이기 (폰에서도 접속하려면 PC IP로)
$env:EXPO_PUBLIC_API_URL = 'http://192.168.0.7:8000'; npx expo start
```
- 웹: `http://localhost:8081`, 폰: Expo Go **SDK 57용** (`https://expo.dev/go?sdkVersion=57&platform=android`) → `exp://192.168.0.7:8081`
- 첫 실행 안내를 다시 보려면 브라우저 Local Storage에서 `@onboarding_done` 삭제

### 로컬 백엔드 (back/chat) — 실제 DB·AI 사용
**Render에는 팀원 원래 백엔드가 올라가 있어서 `/auth/device`가 없다(404).** 우리 앱은 토큰을 먼저 받아야 해서 Render로는 채팅이 안 된다
→ 테스트는 내 PC에서 우리 백엔드를 띄운다.
```powershell
cd welfare-local\back\chat
py -3.11 -m venv .venv                      # 처음 한 번 (.venv는 gitignore됨)
.\.venv\Scripts\pip install -r requirements.txt
$env:OPENAI_API_KEY = 'sk-dummy'            # .env에 OpenAI 키가 없음 → 음성 인식만 안 됨 (없으면 서버가 아예 안 뜸)
$env:DEVICE_TOKEN_SECRET = '<아무 긴 무작위 문자열>'  # 없으면 재시작 때마다 토큰 무효
.\.venv\Scripts\python -m uvicorn main:server --host 0.0.0.0 --port 8000
```
- `.env`에 Upstage 키·Neo4j 접속정보가 있음 (팀원 계정, 채팅마다 Upstage 사용량 나감)
- Neo4j Aura가 일시정지되면 서버가 시작 때 `Could not connect to Neo4j` 로 죽는다 → 팀원이 Aura 콘솔에서 켜야 함
- 이전 세션의 venv·테스트 스크립트는 작업용 임시 폴더에 있어서 사라진다. 위 명령으로 다시 만든다.

### 검증 방법 (이전 세션에서 쓴 방식)
- `npx tsc --noEmit`, `npx expo lint`
- 헤드리스 크롬 + CDP(디버깅 프로토콜) Node 스크립트로 진짜 마우스·키보드 이벤트를 보내 화면을 검사했다
  (412×915 화면, `Input.dispatchMouseEvent`, `Input.insertText`, 스크린샷). 서버가 꺼져 있으면 `Fetch.enable`로 가짜 응답을 넣었다.
- 주의: 개발 모드에서 서버 오류가 나면 화면 아래에 `#error-toast`가 떠서 버튼을 가린다 (테스트 전에 숨김). 새 브라우저는 첫 실행 안내가 화면을 덮으니 `@onboarding_done=true`로 시작.

---

## 3. 전체 구조

```
welfare-local/
├─ PROJECT_GUIDE.md            ← 이 문서
├─ front/welfare-chat-app/     ← 앱 (거의 전부 우리가 새로 작성)
└─ back/
   ├─ chat/                    ← 실제 서비스 백엔드 (우리가 수정: 인증·카드·프로필)
   ├─ chat 3turn/, rag/, GraphRAG/, data_ext/ … (팀원 코드, 손대지 않음)
```

### 앱 폴더 구조
```
app/                       화면 (expo-router: 파일 경로 = 주소)
  _layout.tsx              앱 전체 틀
  (main)/_layout.tsx       화면 3개 + 위쪽 바
  (main)/index.tsx         "/" → "/chat"
  (main)/chat.tsx          대화창
  (main)/list.tsx          목록 [상담 목록 | 보관한 혜택]
  (main)/settings.tsx      설정
components/
  common/   AppHeader, Chip, ToggleSwitch
  start/    IntroScreen, OnboardingScreen
  chat/     ChatInputBar, MicButton, MessageBubble, ChatIntro, CardsAnswer, SaveProfilePrompt
  cards/    PolicyCardView, PolicyDetailModal
  profile/  BirthYearInput, RegionPicker, HouseholdPicker, ProfileEditor
contexts/   settings, profile, sessions, cards (앱 전체 상태 + 폰 저장)
hooks/      useChat, useVoiceRecorder, useKeyboardHeight
api/        chatApi, auth
utils/      storage, dialog, consent, share, audio, sessionManager
constants/  config, theme, brand, regions
types/      chat, profile
```
Provider 감싸는 순서 (`app/_layout.tsx`): Settings → Profile → Sessions → Cards → Theme → Stack.
화면 겹침(아래→위): 대화창 → 첫 실행 안내(zIndex 9) → 오프닝(zIndex 10).

---

## 4. 앱 파일별 설명 (front/welfare-chat-app)

### app/ (화면)
| 파일 | 설명 |
|---|---|
| `app/_layout.tsx` (수정) | Provider 4개로 앱을 감싸고, 시작 시 `IntroScreen`(약 2초) → 처음이면 `OnboardingScreen`. `unstable_settings.anchor = '(main)'`. 다크모드 안 씀 |
| `(main)/_layout.tsx` (새로) | Stack 화면 3개와 위쪽 바 버튼. 대화창(⚙️/목록), 목록(⚙️/💬), 설정(—/💬). 💬는 `router.dismissTo('/chat')`라 화면이 쌓이지 않음 |
| `(main)/index.tsx` (새로) | `/` → `/chat` 리다이렉트 |
| `(main)/chat.tsx` (새로) | 대화창 조립. `ChatScreen`이 현재 상담방 id를 `key`로 `ChatRoom`을 새로 그림(방이 바뀌면 메시지 섞임 방지). 메시지 종류별 렌더(카드 답변/말풍선) + "저장할까요?" 안내. 맨 아래 스크롤은 메시지 수·작성중·키보드·입력칸 선택이 바뀔 때만 50/300/700ms 세 번 (카드 거절로 높이만 바뀔 땐 안 내림 → 보던 자리 유지). FlatList가 아니라 ScrollView에 직접 `scrollToEnd` 요청(여백 바뀐 직후 덜 내려가는 문제) |
| `(main)/list.tsx` (새로) | 탭 [상담 목록 / 보관한 혜택 N]. 상담방: 별=즐겨찾기(위로 정렬), 누르면 그 방으로, 길게 누르면 삭제, 하단 "+ 새 상담"(빈 방 있으면 재사용). 보관함: 보관 카드 + 확대 |
| `(main)/settings.tsx` (새로) | 글자크기(12~28), 색약모드, `ProfileEditor` |

### components/common
| 파일 | 설명 |
|---|---|
| `AppHeader.tsx` | 위쪽 바 [왼쪽 버튼] 제목 [오른쪽 버튼], 크림 배경 + 아래 테두리, 안전영역 반영 |
| `Chip.tsx` | 고르는 버튼(선택 시 강조색). 최소 높이 44 |
| `ToggleSwitch.tsx` | 공용 스위치. 웹에서 손잡이가 초록이 되는 것 막는 `activeThumbColor` 처리 포함 |

### components/start
| 파일 | 설명 |
|---|---|
| `IntroScreen.tsx` | 오프닝: 로고 → 앱 이름·소개 → "Team SOLV". `onLayout`부터 1.8초 후 0.4초 페이드(누르면 바로). 사라지는 효과는 RN 기본 `Animated` 사용 (Reanimated `exiting`은 웹에서 안쪽 애니메이션을 다시 재생해 깨짐) |
| `OnboardingScreen.tsx` | 첫 실행 한 번: ①AI 챗봇 고지(AI기본법)·저장 방식 안내 → ②태어난 해·사는 곳 입력. 어디서든 "나중에 할게요/건너뛰기". 입력값은 "시작하기" 때만 저장 |

### components/chat
| 파일 | 설명 |
|---|---|
| `ChatInputBar.tsx` | 하단 입력줄 [+ 입력칸][전송][공유]. 여러 줄 자동 늘어남(최대 5줄, 이후 칸 안 스크롤; 웹은 높이를 0으로 줄였다 재는 방식). 웹 Enter=전송·Shift+Enter=줄바꿈·한글 조합 중 Enter 무시. 선택 시 공유 숨기고 입력칸 확장, 선택 해제는 0.2초 지연(웹 전송 클릭 빗나감 방지). `keyboardDidHide`에 blur(안드로이드 뒤로가기). `minWidth:0`(웹 입력창 기본 최소너비), `webNoOutline` |
| `MicButton.tsx` | 채팅 목록 위에 떠 있는 마이크(배경 투명, `pointerEvents: box-none`) + 상태 문구. `MIC_SPACE=94`만큼 목록 아래 여백 |
| `MessageBubble.tsx` | 말풍선(내 말/봇/에러) + `TypingBubble`("답변을 작성하고 있어요…") |
| `ChatIntro.tsx` | 안내 박스 + 대화 시작 전 추천 칩 4개(누르면 "○○ 알려줘" 전송) |
| `CardsAnswer.tsx` | 카드형 답변 = 짧은 소개 말풍선 + 정책 수만큼 카드 |
| `SaveProfilePrompt.tsx` | 서버가 감지한 정보(저소득·장애인 등) "내 정보에 저장할까요?" 칩 선택 + [저장][이번만]. 장애인은 `askSensitiveConsent()` 후 저장 |

### components/cards
| 파일 | 설명 |
|---|---|
| `PolicyCardView.tsx` | 카드: 제목·대상(2줄)·내용(3줄) + [공유│보관│거절]. 거절하면 "숨긴 혜택 · 제목 · 다시 보기" 한 줄. `variant='saved'`면 [공유│보관 해제]. 본문과 버튼은 형제 Pressable (버튼 안 버튼은 웹 오류) |
| `PolicyDetailModal.tsx` | 카드 확대: `expo-blur` 블러 + 어두운 막, 카드 ZoomIn. 대상/내용/신청방법(없으면 "담당 기관에 문의"), 담당부처·제공유형 태그, "AI 정보, 담당 기관 확인" 안내, [공유][보관]. 바깥/X로 닫기 |

### components/profile
| 파일 | 설명 |
|---|---|
| `BirthYearInput.tsx` | 출생연도 4자리 → "약 N세". 처음 받은 값으로 시작하므로 바깥에서 `key`로 새로 그림 |
| `RegionPicker.tsx` | 시·도 칩 → 시·군·구 칩 (`constants/regions.ts`) |
| `HouseholdPicker.tsx` | 가구·경제 상황 여러 개 선택 |
| `ProfileEditor.tsx` | 설정의 "내 기본 정보" 카드: 나이/사는 곳(변경)/가구상황/장애 여부(민감정보 배지, 동의 후 스위치, 동의 철회)/전체 삭제 |

### contexts (앱 전체 상태, 폰 저장)
| 파일 | 저장 키 | 설명 |
|---|---|---|
| `settings-context.tsx` | `@app_settings` (일반) | 글자크기·색약모드, `useTheme()`(일반/색약 팔레트). 예전 평문 사용자 메모는 읽을 때 버림 |
| `profile-context.tsx` | `user_profile` (**암호화**), `@onboarding_done` (일반) | 내 기본 정보. `updateProfile`, `setSensitiveConsent`(철회 시 장애 정보 삭제), `clearProfile`, `finishOnboarding`, `loaded` |
| `sessions-context.tsx` | `@app_sessions`, `@app_current_session` | 상담방 목록 `{id,title,createdAt,starred}`. 첫 메시지가 제목. 예전 단일 세션 id는 첫 방으로 이어 씀 |
| `cards-context.tsx` | `@saved_cards`, `@hidden_cards` | 보관 카드(내용 통째로), 숨긴 카드(`세션id:카드id`) |

### hooks
| 파일 | 설명 |
|---|---|
| `useChat.ts` | 지난 대화 불러오기 + `send()`(빈 글·전송 중이면 false). 프로필을 `toProfilePayload`로 함께 보냄. 실패하면 에러 말풍선 |
| `useVoiceRecorder.ts` | 녹음 → 웹소켓(`/ws/chat/{id}?token=`) → "STOP_RECORDING" → 인식 글자를 입력칸에. 웹·Expo Go는 안내만 |
| `useKeyboardHeight.ts` | 키보드 높이 (edge-to-edge라 안드로이드가 화면을 안 올려줌 → 그만큼 아래 여백) |

### api
| 파일 | 설명 |
|---|---|
| `chatApi.ts` | axios client(타임아웃 90초). 요청마다 `Authorization: Bearer <기기토큰>`, 401이면 토큰 새로 받아 1번 재시도. `get_chat_history`, `sendChatMessage(sessionId, text, profile)` → `{reply, cards, detected}`. 서버 snake_case → 앱 camelCase 변환 |
| `auth.ts` | 기기 토큰: 암호화 저장소에 없으면 `POST /auth/device`로 받아 저장. 동시 요청은 Promise 하나 공유 |

### utils / constants / types
| 파일 | 설명 |
|---|---|
| `utils/storage.ts` | 저장소 한곳: `loadJSON/saveJSON/loadText/saveText`(AsyncStorage), `loadSecret/saveSecret/deleteSecret`(SecureStore, 웹은 AsyncStorage) |
| `utils/dialog.ts` | `notify`, `confirm` (웹은 window.alert/confirm, 앱은 Alert) |
| `utils/consent.ts` | `askSensitiveConsent()` 민감정보 동의 확인창 (문구 한곳) |
| `utils/share.ts` | 대화 공유, 정책 카드 1장 공유 (RN `Share`) |
| `utils/audio.ts` | 마이크 모듈이 있을 때만 require (웹·Expo Go에선 import만 해도 에러) |
| `utils/sessionManager.ts` (수정) | 예전 단일 세션 id (첫 상담방 이전용) |
| `constants/config.ts` | `API_URL`(`EXPO_PUBLIC_API_URL` 또는 Render), `WS_URL` |
| `constants/theme.ts` (수정) | `Palettes.default/colorBlind`(Okabe-Ito), `webNoOutline`(웹 입력 테두리 끄기) |
| `constants/brand.ts` | 앱 이름(**임시 "복지 상담 챗봇"**), 소개 문구, 팀 SOLV |
| `constants/regions.ts` | 시·도→시·군·구 (DB Province/District 이름 그대로, "-/전체/교육청" 제외, 광주·전남은 DB대로 "전남광주통합특별시") |
| `types/chat.ts` | `PolicyCard`, `Message{cards?, detected?}` |
| `types/profile.ts` | `UserProfile`, `HOUSEHOLD_TAGS`, `toProfilePayload`(장애는 동의 시만), `ageFromBirthYear`, `regionLabel` |

### 기타 수정
- `app.json`: 스플래시 배경 크림색, `expo-secure-store` 플러그인
- `package.json`: `expo-secure-store`, `expo-blur` 추가, `reset-project` 스크립트 삭제
- `tsconfig.json`: 없는 파일(chatver2.tsx) 참조 삭제
- `README.md`: 프로젝트 설명, `AGENTS.md`: 문서 버전 SDK 57
- 삭제: Expo 템플릿 컴포넌트·훅 전부, 옛 `(tabs)` 화면들, `font-size-context`, `typographyOption`, `scripts/reset-project.js`

---

## 5. 백엔드 수정 (back/chat)

| 파일 | 설명 |
|---|---|
| `auth.py` (새로) | 기기 토큰 = `기기ID.HMAC서명`(서버 저장 불필요). `require_device`(401), `verify_token`, `thread_key(기기ID, 세션ID)`(세션ID 형식 검사, 400) |
| `user_profile.py` (새로) | 앱이 보낸 프로필 처리: `UserProfileIn`, 나이→생애주기, 가구상황+장애→대상구분, `describe()`(AI 맥락 한 줄), `new_detected()`. 표준 모듈 `profile`과 이름 겹쳐서 이 이름 |
| `api.py` (수정) | `POST /auth/device`. `/chat`·`/chat/history`·`/File`·웹소켓에 토큰 검사(웹소켓은 `?token=`, 실패 1008). 대화 저장 키 `기기ID:세션ID`. 요청 `profile`, 응답 `cards`·`detected`. 로그엔 글자 수만, 웹소켓 오류 내용 숨김 |
| `nodes.py` (수정) | `build_policy_card`(청크 머리말 제거, 지자체는 요약을 내용으로), 검색에 `all_chunks`·지역 필터(EXISTS, 후보 30→120)·프로필 조건 보충(모호하면 생애주기 단어 덧붙임), `_card_answer`(CardIntro 구조화 출력: 소개+picks, 실패 시 전체), 상세 답변에도 카드 + `_plain_text`(마크다운 제거), `detected_tags` |
| `prompts.py` (수정) | `CARD_INTRO_PROMPT` 추가(구체 질문엔 바로 답, 개인정보 언급 금지, 마크다운 금지, `{user_info}`) |
| `state.py` (수정) | `CardIntro` 모델, `current_cards`, `user_profile`, `detected_tags` |
| `tasks.py` (수정) | 주석만 (키가 thread_key) |
| `requirements.txt` (수정) | `openai` 추가 (원래 빠져 있었음) |

**API 형식**
- `POST /auth/device` → `{device_token}`
- `POST /chat` (헤더 Bearer) `{session_id, user_message, profile?: {birth_year, province, district, household[], disability}}`
  → `{bot_reply, cards: [{id,title,target,content,apply_method,department,support_type,digest}], detected: [...]}`
- `GET /chat/history/{session_id}` → `[{id,text,isUser,cards}]` (카드는 메시지 `additional_kwargs["policy_cards"]`에 저장, AI에는 안 보내짐 확인함)

---

## 6. 알아둔 사실 / 주의

- **DB(Neo4j)**: 정책 4,779개. 대상·내용·신청방법이 나뉜 건 중앙 461개(10%)뿐, 지자체 4,318개는 "요약" 한 문장(평균 92자). 지자체 원본(`back/data_ext/DataList2.json`)에는 `servDtlLink`(복지로 상세 링크), 대상구분, 지역, 신청방식이 더 있는데 DB엔 안 들어감. 주제 태그 오류 있음(난방비가 "입양·위탁").
- **Render**: 팀원 원래 백엔드(`reply_type` 있음, `/auth/device` 없음). 콜드스타트 있음.
- `tasks.py` 대화 보관이 **5분**(테스트용, 원래 5일) → 오래 두면 기록이 사라짐.
- 팀원 의도 분류 오류: "난방비 지원**도** 알려줘"를 상세요구로 분류.
- 상세 답변 글이 아직 김 (팀원 `ANSWER_SYSTEM_PROMPT`의 "불릿·이모지로 정리" 규칙이 우선됨).
- 번호("3번 자세히")는 마지막 여러 장 목록 기준이라, 중간에 카드 1장 답변이 끼면 헷갈릴 수 있음.
- 서울 송파구로 거르면 서울 지자체 정책이 거의 없음 (DB에 적음).
- 팀원 커밋 `de8daf5`의 `MascotHeader.tsx` 이미지 경로 `../../assets/mascot/`는 `../assets/mascot/`이어야 할 것 같음.
- 카드형 답변은 `welfare-eval` 채점(답변 글에서 정책명 추출, RAGAS)과 안 맞음 → 팀원 백엔드에 합칠 때 평가 코드도 `cards` 기준으로 바꿔야 함. (사용자: "일단 상관없음")
- 웹 전용 이슈들: 입력 최소너비, `outlineStyle:none`, Switch 초록, Alert 미동작(dialog.ts), 버튼 안 버튼 금지, 개발 `#error-toast`.
- React Compiler가 켜져 있어 `makeStyles(theme)`는 자동 캐시됨 (따로 useMemo 안 함).

---

## 7. 앞으로 할 일 (우선순위 순)

1. **팀원 새 커밋 합치기** — `de8daf5` 마스코트(이미지 4장 + `MascotHeader`, `reply_type`별 표정·문구), `2bc719e` 키보드/`reply_type`.
   - 우리 구조에 맞게 옮겨 넣기: 백엔드 `reply_type`은 `nodes.py` 답변 반환부와 겹침(수동 병합), 마스코트는 새 `chat.tsx`/컴포넌트 구조로 이식. 마스코트 경로 버그 확인.
   - 원본 clone(`Welfare`)도 최신으로 맞추기 — 원본에는 미커밋 변경(front nav-skeleton, back 평가용)이 있으니 `welfare-eval/CLAUDE.md`의 업데이트 절차(stash → ff merge → pop) 따를 것.
2. **팀원과 상의할 것** — Render에 우리 백엔드 배포(`DEVICE_TOKEN_SECRET` 환경변수, `openai` 패키지), `tasks.py` 5분→5일, 평가 기준 변경, 의도 분류 오류, 마스코트 경로, Neo4j Aura 유지.
3. **폰에서 확인** (웹으로는 못 함) — 안드로이드 뒤로가기 후 마이크·공유 복귀, 키보드 위로 화면 올라감, 블러.
4. **상세 답변 짧게** — 상세 전용 프롬프트를 따로 만들기.
5. **카드에 "복지로에서 자세히 보기"** — `servDtlLink`를 DB에 추가(DB 적재 코드 수정 + 재적재, 팀원 상의).
6. **앱 이름 확정**(`constants/brand.ts`) + 앱 아이콘·스플래시 이미지 교체(마스코트 활용 가능).
7. **개인정보 처리방침 화면** (출시 전 필수: 수집 항목·목적·보유기간·국외이전(OpenAI 음성)·파기).
8. **APK 빌드**(EAS 또는 Android Studio)로 진짜 앱 설치 + 마이크 확인 (OpenAI 키 필요).
9. 지자체 정책 데이터 보강, 의도 분류 개선 (백엔드·팀원).
