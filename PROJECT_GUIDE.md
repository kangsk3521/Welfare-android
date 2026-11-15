# 복지 상담 챗봇 (Team SOLV) — 작업 가이드

> 이 파일은 우리가 이 복사본(`welfare-local`)에서 무엇을 만들고 고쳤는지, 어떻게 실행하는지, 다음에 무엇을 할지를 정리한 문서다.
> 새 대화(컨텍스트 초기화) 후에는 **이 파일부터 읽고** 이어서 작업한다. 마지막 갱신: 2026-11-11 (코드 정리·팀원 전달용 5-1장)

---

## 0. 꼭 지킬 것 (작업 규칙)

- **원본 clone(`welfare-android/Welfare`)은 건드리지 않는다.** 작업은 전부 이 복사본 `welfare-android/welfare-local`에서 한다.
  - 원본은 팀원 저장소 `github.com/1062goodman/Welfare` 그대로. `welfare-eval`(성능 평가)이 원본을 쓴다.
- **origin(팀원 저장소)에는 푸시 금지.** 2026-11-13부터 원격 `mine` = 사용자 private 저장소 `github.com/kangsk3521/Welfare-android`(브랜치 `main` ← 로컬 `feature/frontend-mockup`, upstream도 `mine/main`). Render 배포용. 푸시는 `mine`에만, 사용자가 요청할 때만. 커밋도 요청할 때만.
- 커밋할 때 `back/GraphRAG/*`, `back/rag/*`의 수정 4개는 **빼고** 커밋한다 (평가용 임시 수정, 원래 커밋하지 않는 것).
- `front/welfare-chat-app/app.json`의 `owner: kangsk3521`·`extra.eas.projectId`(사용자 개인 Expo 프로젝트)도 **빼고** 커밋한다. 팀원 원래 값은 projectId `798e2046-…`였음.
- **PC 서버를 와이파이/인터넷에 열지 않는다** (`--host 0.0.0.0`, `--lan` 금지). 폰 테스트는 USB(adb reverse)로 한다 (2장). 예전에 공유기 DMZ 때문에 8000 포트가 인터넷에 노출돼 스캐너 요청이 들어온 적 있음(29건 전부 404, 피해 없음). DMZ는 2026-11-10 사용자가 끔 (마인크래프트 25565 포트포워드만 남김).
- 사용자와는 한국어로, **한 번에 한 기능씩 짧게** 소통한다. 긴 보고서 금지.
- 비밀값(`back/chat/.env`, 토큰 비밀키)은 절대 커밋·출력하지 않는다 (`.gitignore`에 `**/.env` 있음).

## 1. 현재 상태

- 브랜치: `feature/frontend-mockup` (원본 `966f051 "3 turn"`에서 분기)
- 우리 커밋:
  | 커밋 | 내용 |
  |---|---|
  | `4792a24` | 목업 3개 화면(대화창·목록·설정), 대화창 모듈화, 기기 토큰 인증 |
  | `015bf9f` | 카드형 답변(공유·보관·거절, 블러 확대), 오프닝 화면, 하단 버튼 축소 |
  | `8689835` | 개인정보 암호화 저장·첫 실행 안내, 상세 답변 카드화, 뒤로가기·스크롤 버그 수정 |
  | `839b33c` | 채팅에 프로필 반영(지역 필터·감지 저장), 프론트 구조 정리 |
  | `016016f` | 이 작업 가이드 문서 |
  | `b694d95` | **팀원 커밋 11개 병합** (origin/master `bf7c6f7`까지) |
  | `7351560` | 카드에 "복지로에서 자세히 보기" 버튼·공유 글에 링크, "저장할까요?" 이중 확인 |
  | `a983001` | 검색 조건 이중 확인, 클로바 음성 안내 문구, 개발용 빌드 설정(`expo-dev-client`, eas.json node) |
- 팀원 병합에서 정한 것 (사용자 결정: **카드·디자인은 우리 방식, 마스코트 보류**)
  - 서버: 카드는 우리 `build_policy_card`/`_card_answer` 유지(팀원 `build_cards_node`·`policies` 응답 안 씀). 팀원 것에서 복지로 링크 `url`, `reply_type`, 프롬프트 불릿·이모지 규칙 삭제를 가져옴. 음성은 팀원 클로바(gRPC)로 교체 + 우리 토큰 검사·로그 글자 수만·오류 내용 숨김
  - 앱: 우리 구조 유지. 팀원 `PolicyCarousel`·`VoicePanel`·`mascot`·`MascotHeader`는 뺌 (필요하면 `git show bf7c6f7:front/welfare-chat-app/components/VoicePanel.tsx`). 마스코트 이미지 5장(`assets/mascot/`)은 남김
- **폰(개발용 빌드)으로 확인 완료 (2026-11-11)**: 클로바 음성 인식, 복지로 버튼, "저장할까요?" 이중 확인

## 2. 실행 방법

### 폰 테스트 = USB + 개발용 빌드 (추천, 네트워크에 포트 안 염)
준비물(이미 있음): 폰에 개발용 앱 설치됨(갤럭시 SM-S948N), PC에 adb `C:\Users\kangs\Android\platform-tools\adb.exe`, 폰 개발자 옵션·USB 디버깅 허용.
```powershell
# 1) 백엔드: 아래 "로컬 백엔드" (--host 127.0.0.1)
# 2) 앱 서버: 내 PC 안에서만. Node가 localhost를 IPv6(::1)로 열면 adb가 못 닿아서 ipv4first 필요
cd welfare-local\front\welfare-chat-app
$env:NODE_OPTIONS='--dns-result-order=ipv4first'; $env:EXPO_PUBLIC_API_URL='http://localhost:8000'; npx expo start --dev-client --localhost
# 3) USB로 폰의 localhost:8000/8081 → PC 연결 (케이블을 다시 꽂으면 다시 실행)
C:\Users\kangs\Android\platform-tools\adb.exe reverse tcp:8000 tcp:8000
C:\Users\kangs\Android\platform-tools\adb.exe reverse tcp:8081 tcp:8081
# 4) 앱 열기 (또는 폰에서 welfare-chat-app 실행 후 localhost:8081 선택)
C:\Users\kangs\Android\platform-tools\adb.exe shell am start -a android.intent.action.VIEW -d "welfarechatapp://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8081"
```
- 코드 수정은 자동 반영. 화면 확인은 `adb exec-out screencap -p > shot.png`
- 처음부터 다시(첫 실행 안내 등): 폰 설정 → 앱 → welfare-chat-app → 저장공간 → 데이터 삭제

### 개발용 빌드(APK) 다시 만들기 — 네이티브 패키지를 추가했을 때만 필요
- Expo 계정 `kangsk3521`(사용자 개인), 프로젝트 `@kangsk3521/welfare-chat-app`. 로그인: `npx eas-cli login --device --non-interactive` → 브라우저 승인 후 `--resume <id> --match <숫자>`
- `npx eas-cli build -p android --profile development --non-interactive --no-wait` → expo.dev에서 APK. 설치는 `adb install -r <apk>`
- eas.json development에 `"node": "24.12.0"` 필수 (빌드 서버 기본 npm이 잠금파일의 `@emnapi`를 빠졌다고 보고 `npm ci` 실패)
- JS 코드만 바꿨으면 다시 빌드할 필요 없음

### 웹·Expo Go (예전 방식)
```powershell
cd welfare-local\front\welfare-chat-app
npx expo start                      # 기본: Render 서버(welfare-1gs5.onrender.com)에 붙음
```
- 웹: `http://localhost:8081`. Expo Go는 Play 스토어가 최신 SDK(58)로 자동 업데이트해서 SDK 57 앱이 안 열림 → 개발용 빌드 사용. 음성 녹음은 웹·Expo Go에서 안 됨
- 첫 실행 안내를 다시 보려면 브라우저 Local Storage에서 `@onboarding_done` 삭제

### 로컬 백엔드 (back/chat) — 실제 DB·AI 사용
**Render에는 팀원 원래 백엔드가 올라가 있어서 `/auth/device`가 없다(404).** 우리 앱은 토큰을 먼저 받아야 해서 Render로는 채팅이 안 된다
→ 테스트는 내 PC에서 우리 백엔드를 띄운다.
```powershell
cd welfare-local\back\chat
py -3.11 -m venv .venv                      # 처음 한 번 (.venv는 gitignore됨)
.\.venv\Scripts\pip install -r requirements.txt
$env:OPENAI_API_KEY = 'sk-dummy'            # /File(파일 음성 인식)용. .env에 없음. 없으면 서버가 아예 안 뜸
$env:DEVICE_TOKEN_SECRET = '<아무 긴 무작위 문자열>'  # 없으면 재시작 때마다 토큰 무효
.\.venv\Scripts\python -m uvicorn main:server --host 127.0.0.1 --port 8000   # 0.0.0.0 금지 (0장)
```
- `.env`에 Upstage 키·Neo4j 접속정보(팀원 계정, 채팅마다 Upstage 사용량 나감), **`CLOVA_SECRET`**(음성 인식, 2026-11-10 추가, 접속 확인함)
- 새 패키지 `grpcio`, `protobuf`(클로바) — `pip install -r requirements.txt`로 설치됨
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
  chat/     ChatInputBar, MicButton, VoiceModal, MessageBubble, ChatIntro, BotAnswer, MascotHeader, SaveProfilePrompt
  cards/    PolicyCardView, PolicyDetailModal
  profile/  BirthYearInput, RegionPicker, HouseholdPicker, ProfileEditor
contexts/   settings, profile, sessions, cards (앱 전체 상태 + 폰 저장)
hooks/      useChat, useVoiceRecorder, useKeyboardHeight
api/        chatApi, auth
utils/      storage, dialog, consent, share, audio
constants/  config, theme, brand, regions, mascot
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
| `(main)/settings.tsx` (새로) | 글자크기(12~28), 색약모드(스위치를 켜면 녹색맹·적색맹·전색맹·청황색맹 칩), `ProfileEditor` |

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
| `MicButton.tsx` | 채팅 목록 위에 떠 있는 마이크(배경 투명, `pointerEvents: box-none`) + 잠깐 뜨는 안내(`notice`, 3초). 누르면 `VoiceModal`. `MIC_SPACE=94`만큼 목록 아래 여백 |
| `VoiceModal.tsx` (새로) | 마이크를 누르면 가운데 뜨는 음성 창: 블러 배경, 듣는 중 마스코트(`listen`) + 뒤 원 애니메이션(움직임 줄이기면 정지), 알아들은 말을 큰 글씨(글자크기+8)로, [취소] [다 말했어요]. 바깥 터치로 안 닫힘, 뒤로가기=취소 |
| `MessageBubble.tsx` | 말풍선(내 말/봇/에러) + `TypingBubble`("답변을 작성하고 있어요…") |
| `ChatIntro.tsx` | 안내 박스 + 대화 시작 전 추천 칩 4개(누르면 "○○ 알려줘" 전송) |
| `BotAnswer.tsx` (2026-11-15) | 챗봇 답변 = [마스코트 안내] + [글 말풍선] + [카드]. 서버 `reply_type`별: list=성공 마스코트 "복지정보를 찾았어요!"+카드(AI 소개 글 숨김), detail=성공+글+카드, ask=fail "정보가 더 필요해요!"+글, no_result=fail(글 숨김), detail_fail=fail+글, blocked=no(글 숨김), general·예전 메시지=말풍선만 |
| `MascotHeader.tsx` (2026-11-15) | 마스코트(90px)가 위에 걸친 안내 말풍선(`head` 색, 왼쪽 위 모서리 각짐). 디자인 시안 `mockup/des_1`의 ai-head |
| `SaveProfilePrompt.tsx` | 서버가 감지한 정보(저소득·장애인 등) "내 정보에 저장할까요?" 칩 선택 + [저장][이번만]. 장애인은 `askSensitiveConsent()` 후 저장 |

### components/cards
| 파일 | 설명 |
|---|---|
| `PolicyCardView.tsx` | 카드: 제목(+›)·태그(지원 종류, `지역 정책` 또는 담당부처)·**요점 두 줄**(무엇을: 강조색 굵게 / 누가) + [공유│보관│거절]. 요점 없는 카드(상세 답변·예전 보관)는 `digest` 2줄. 거절하면 "숨긴 혜택 · 제목 · 다시 보기" 한 줄. `variant='saved'`면 [공유│보관 해제]. 본문과 버튼은 형제 Pressable (버튼 안 버튼은 웹 오류) |
| `PolicyDetailModal.tsx` | 카드 확대: `expo-blur` 블러 + 어두운 막, 카드 ZoomIn. 대상/내용/신청방법(없으면 "담당 기관에 문의"), 담당부처·제공유형 태그, 맨 위 요점 상자(what/who), "AI 정보, 담당 기관 확인" 안내, **"복지로에서 자세히 보기"**(테두리 버튼, `Linking.openURL`, `url` 없는 예전 보관 카드엔 안 보임), [공유][보관]. 바깥/X로 닫기 |

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
| `settings-context.tsx` | `@app_settings` (일반) | 글자크기·색약모드·색약 종류(`colorBlindType`, 기본 녹색맹), `useTheme()`(일반/종류별 팔레트), `useGrayscale()`(전색맹이면 마스코트 흑백). 예전 평문 사용자 메모는 읽을 때 버림 |
| `profile-context.tsx` | `user_profile` (**암호화**), `@onboarding_done` (일반) | 내 기본 정보. `updateProfile`, `setSensitiveConsent`(철회 시 장애 정보 삭제), `clearProfile`, `finishOnboarding`, `loaded` |
| `sessions-context.tsx` | `@app_sessions`, `@app_current_session` | 상담방 목록 `{id,title,createdAt,starred}`. 첫 메시지가 제목. 처음 켜면 빈 방 하나 |
| `cards-context.tsx` | `@saved_cards`, `@hidden_cards` | 보관 카드(내용 통째로), 숨긴 카드(`세션id:카드id`) |

### hooks
| 파일 | 설명 |
|---|---|
| `useChat.ts` | 지난 대화 불러오기 + `send()`(빈 글·전송 중이면 false). 프로필을 `toProfilePayload`로 함께 보냄. 실패하면 에러 말풍선 |
| `useVoiceRecorder.ts` | 단계 `phase`(idle/connecting/listening/finishing), `liveText`(알아들은 말), `notice`(3초 안내), `start/stop/cancel`. 녹음 → 웹소켓(`/ws/chat/{id}?token=`) → "STOP_RECORDING" → `final: true`면 **바로 전송**(`onFinal`), 못 보내면 입력칸에(`onFallback`). 결과가 8초 안에 없으면 실패. 취소는 소켓을 닫음. 콜백은 ref로 최신 유지. 16kHz·16bit·모노 PCM. 웹·Expo Go는 안내만 |
| `useKeyboardHeight.ts` | 키보드 높이 (edge-to-edge라 안드로이드가 화면을 안 올려줌 → 그만큼 아래 여백) |

### api
| 파일 | 설명 |
|---|---|
| `chatApi.ts` | axios client(타임아웃 90초). 요청마다 `Authorization: Bearer <기기토큰>`, 401이면 토큰 새로 받아 1번 재시도. `getChatHistory`, `sendChatMessage(sessionId, text, profile)` → `{reply, cards, detected}`. 서버 snake_case → 앱 camelCase 변환 |
| `auth.ts` | 기기 토큰: 암호화 저장소에 없으면 `POST /auth/device`로 받아 저장. 동시 요청은 Promise 하나 공유 |

### utils / constants / types
| 파일 | 설명 |
|---|---|
| `utils/storage.ts` | 저장소 한곳: `loadJSON/saveJSON/loadText/saveText`(AsyncStorage), `loadSecret/saveSecret/deleteSecret`(SecureStore, 웹은 AsyncStorage) |
| `utils/dialog.ts` | `notify`, `confirm` (웹은 window.alert/confirm, 앱은 Alert) |
| `utils/consent.ts` | `askSensitiveConsent()` 민감정보 동의 확인창 (문구 한곳) |
| `utils/share.ts` | 대화 공유, 정책 카드 1장 공유 (RN `Share`, 복지로 링크 포함) |
| `utils/audio.ts` | 마이크 모듈이 있을 때만 require (웹·Expo Go에선 import만 해도 에러) |
| `constants/config.ts` | `API_URL`(`EXPO_PUBLIC_API_URL` 또는 Render), `WS_URL` |
| `constants/theme.ts` (수정) | `Palettes.default` + 색약 4종 `deutan/protan/achroma/tritan`(디자인 시안 `mockup/des_1/color` 화면 12장에서 색을 뽑음, 3장씩 녹·적·전·청황), `COLOR_BLIND_TYPES`, `head`(마스코트 말풍선 색), `webNoOutline` |
| `constants/mascot.ts` (2026-11-15) | 마스코트 그림 `success/fail/no/listen` + 흑백(`_gray`). `assets/mascot/`는 시안 그림을 360px로 줄인 것 |
| `constants/brand.ts` | 앱 이름(**임시 "복지 상담 챗봇"**), 소개 문구, 팀 SOLV |
| `constants/regions.ts` | 시·도→시·군·구 (DB Province/District 이름 그대로, "-/전체/교육청" 제외, 광주·전남은 DB대로 "전남광주통합특별시") |
| `types/chat.ts` | `PolicyCard{…, url?, isLocal?, what?, who?}`, `Message{cards?, detected?}` |
| `types/profile.ts` | `UserProfile`, `HOUSEHOLD_TAGS`, `toProfilePayload`(장애는 동의 시만), `ageFromBirthYear`, `regionLabel` |

### 기타 수정
- `app.json`: 스플래시 배경 크림색, `expo-secure-store` 플러그인
- `package.json`: `expo-secure-store`, `expo-blur`, `expo-dev-client` 추가, `reset-project` 스크립트 삭제
- `eas.json`: development 프로필에 `"node": "24.12.0"`
- `tsconfig.json`: 없는 파일(chatver2.tsx) 참조 삭제
- `README.md`: 프로젝트 설명, `AGENTS.md`: 문서 버전 SDK 57
- 삭제: Expo 템플릿 컴포넌트·훅 전부, 옛 `(tabs)` 화면들, `font-size-context`, `typographyOption`, `scripts/reset-project.js`

---

## 5. 백엔드 수정 (back/chat)

| 파일 | 설명 |
|---|---|
| `auth.py` (새로) | 기기 토큰 = `기기ID.HMAC서명`(서버 저장 불필요). `require_device`(401), `verify_token`, `thread_key(기기ID, 세션ID)`(세션ID 형식 검사, 400) |
| `user_profile.py` (새로) | 앱이 보낸 프로필 처리: `UserProfileIn`, 나이→생애주기, 가구상황+장애→대상구분, `describe()`(AI 맥락 한 줄), `new_detected()`, `TAG_EVIDENCE`/`has_evidence()`(대상구분별 근거 단어, 이중 확인용). 표준 모듈 `profile`과 이름 겹쳐서 이 이름 |
| `api.py` (수정) | `POST /auth/device`. `/chat`·`/chat/history`·`/File`·웹소켓에 토큰 검사(웹소켓은 `?token=`, 실패 1008). 대화 저장 키 `기기ID:세션ID`. 요청 `profile`, 응답 `cards`·`detected`·`reply_type`. 카드에 `url`(복지로). 음성 웹소켓은 클로바 gRPC(`nest_pb2*.py`, 말하는 동안 누적 글자 전송, 끝나면 `final: true`). 로그엔 글자 수만, 오류 내용 숨김 |
| `nodes.py` (수정) | `build_policy_card`(청크 머리말 제거, 지자체는 요약을 내용으로), 검색에 `all_chunks`·지역 필터(EXISTS, 후보 30→120)·프로필 조건 보충(모호하면 생애주기 단어 덧붙임), `_card_answer`(CardIntro 구조화 출력: 소개+picks+카드별 요점 `summaries`(what 25자/who 20자, 서버에서 40/30자로 자름), 실패 시 전체·요점 없음, 토큰 사용량 로그), `_with_card_text`(요점용으로 검색 결과에 빠진 지원대상·서비스내용을 300자만 보충), `is_local`, 상세 답변에도 카드 + `_plain_text`(마크다운 제거), `detected_tags`, 모든 답변에 `reply_type`(+ `_tag`로 메시지 `additional_kwargs`에도 적어서 `/chat/history`가 `reply_type`을 돌려줌 → 다시 불러와도 마스코트 유지). **이중 확인**: 조건 추출 AI가 붙인 대상구분은 사용자 문장에 근거가 있을 때만 검색 조건(사용자 문장 전체)·저장 안내(이번 문장)에 씀 |
| `prompts.py` (수정) | `CARD_INTRO_PROMPT` 추가(구체 질문엔 바로 답, 카드별 요점, 개인정보 언급 금지, 마크다운 금지, `{user_info}`) |
| `state.py` (수정) | `CardIntro`(+`CardSummary`) 모델, `current_cards`, `user_profile`, `detected_tags`, `reply_type` |
| `tasks.py` (수정) | 주석만 (키가 thread_key) |
| `requirements.txt` (수정) | `openai` 추가 (원래 빠져 있었음), 팀원이 `grpcio`·`protobuf` 추가 |

**API 형식**
- `POST /auth/device` → `{device_token}`
- `POST /chat` (헤더 Bearer) `{session_id, user_message, profile?: {birth_year, province, district, household[], disability}}`
  → `{bot_reply, reply_type, cards: [{id,title,target,content,apply_method,department,support_type,digest,url,is_local,what,who}], detected: [...]}`
- `GET /chat/history/{session_id}` → `[{id,text,isUser,cards}]` (카드는 메시지 `additional_kwargs["policy_cards"]`에 저장, AI에는 안 보내짐 확인함)

## 5-1. 팀원 코드에서 무엇을 왜 바꿨나 (팀원 전달용)

기준: 팀원 저장소 `origin/master` `bf7c6f7`. 우리 브랜치 `feature/frontend-mockup`은 이 커밋까지 병합되어 있어서 `git diff bf7c6f7 -- back/chat front/welfare-chat-app`으로 전부 볼 수 있다.

### 원칙
- **서버는 팀원 구조(LangGraph 흐름·노드 이름·검색 방식)를 유지하고 필요한 기능만 덧붙였다.** 새 기능은 새 파일(`auth.py`, `user_profile.py`)로 분리해서 팀원 파일 변경을 줄였다.
- **API는 추가만 했다.** 요청에 `profile`(선택), 응답에 `cards`·`detected`·`reply_type`, 카드에 `url`·`is_local`·`what`·`who`. 예전 앱이 보내던 형식도 그대로 동작한다. 단 **토큰 없는 요청은 401**이라 예전 앱은 `/auth/device`부터 받아야 한다.
- **앱은 Expo 템플릿 위에 화면이 하나씩 붙어 있던 구조를 역할별 폴더로 새로 짰다.** 화면(app) / 부품(components) / 공용 상태(contexts) / 동작(hooks) / 서버 통신(api) / 도구(utils). 팀원 화면 코드는 대부분 새 구조로 옮기거나 대체했다.

### 서버 (back/chat)
| 무엇을                                              | 어떻게                                                                                                                   | 왜                                                                                                                                                         |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **기기 인증** (`auth.py` 새로)                         | 앱이 처음 켜질 때 `POST /auth/device`로 토큰(기기ID+HMAC 서명)을 받고, 모든 요청에 `Bearer` 토큰. 대화 저장 키를 `기기ID:세션ID`로                       | 원래는 세션 ID만 알면 남의 대화 기록(`/chat/history`)을 볼 수 있었다. 유료 API(Upstage·클로바)를 아무나 쓰는 것도 막는다. 서명 방식이라 토큰을 DB에 저장할 필요가 없다                                          |
| **카드형 답변** (`nodes.py`, `prompts.py`)            | 검색된 정책을 DB 원문으로 카드 데이터로 만들고(`build_policy_card`), AI는 짧은 소개·보여줄 카드 선택·카드별 요점만 한다(`_card_answer`, `CARD_INTRO_PROMPT`) | 정책 내용을 AI가 글로 다시 쓰면 길고, 틀릴 수 있다(환각). 원문은 카드 확대 화면에 그대로 둔다. 팀원도 카드뉴스(`build_cards_node`)를 만들었는데, 병합 때 사용자가 우리 방식으로 결정했다. 팀원 것에서 복지로 링크와 `reply_type`은 가져왔다 |
| **카드 요점** (`CardSummary`)                        | 카드 고르는 같은 AI 호출에서 카드마다 "무엇을(25자)·누가(20자)"도 받는다                                                                        | 원문 앞부분을 잘라 보여주면 핵심(금액·대상)이 묻혀서 한눈에 안 들어왔다. 호출 수는 그대로, 목록 답변 토큰 약 +25~40%, 약 +1.3초 (측정값). 나중엔 DB에 미리 저장하는 방식(B)이 더 좋다                                      |
| **내 정보 반영** (`user_profile.py` 새로)               | 앱이 보낸 나이·지역·가구 상황으로 ① 지역 필터(중앙 정책 + 우리 지역 정책) ② 생애주기·대상구분 조건 보충 ③ AI 소개 맥락                                            | "받을 수 있는 혜택 있어?"처럼 조건 없는 질문에도 되묻지 않고 바로 찾게. 지역 필터 때문에 후보를 30→120개로 늘렸다                                                                                    |
| **대화 속 정보 감지** (`detected_tags`, `new_detected`) | 대화에서 저소득·장애 등을 말하면 응답 `detected`로 알려주고 앱이 "저장할까요?"를 묻는다                                                               | 사용자가 설정 화면에 가지 않아도 내 정보를 채울 수 있게                                                                                                                          |
| **조건 추출 이중 확인** (`has_evidence`)                 | 조건 추출 AI가 붙인 대상구분은 사용자가 쓴 문장에 근거 단어가 있을 때만 쓴다                                                                         | 원래 코드부터 AI가 근거 없이 "보훈대상자" 등을 붙였다(평가 v12 로그에도 있음). 저장 안내가 엉뚱하게 뜨고 검색 순위도 조금 틀어졌다                                                                           |
| **상세 답변에도 카드**                                   | "1번 자세히"에 그 정책 카드를 붙이고 마크다운 기호를 지운다(`_plain_text`)                                                                    | 앱 말풍선은 마크다운을 안 그려서 `**`, `###`이 그대로 보였다                                                                                                                   |
| **음성 인식 보안** (`api.py`)                          | 팀원 클로바(gRPC) 그대로 + 웹소켓 토큰 검사(`?token=`, 실패 1008), 로그엔 글자 수만, 오류 내용은 앱에 안 보냄                                           | 음성·대화는 개인정보(건강·소득)가 섞일 수 있고, 서버 내부 오류를 밖에 보여줄 필요가 없다                                                                                                      |
| `requirements.txt`                               | `openai` 추가                                                                                                           | 원래 코드가 쓰는데 목록에 빠져 있어서 새 환경에서 서버가 안 떴다                                                                                                                     |
| `tasks.py`                                       | 주석만                                                                                                                   | 저장 키가 `기기ID:세션ID`로 바뀐 것 표시. **5분 보관(테스트용)은 그대로** 두었다 (팀원 결정 필요)                                                                                           |

### 앱 (front/welfare-chat-app)
| 무엇을 | 어떻게 | 왜 |
|---|---|---|
| **구조** | `(tabs)` 탭 화면(Home·Explore·index3 등 템플릿 화면) → `(main)` 스택 3화면(대화창·목록·설정). Expo 템플릿 부품(`themed-*`, `parallax-scroll-view`, `hello-wave`, `haptic-tab`, `ui/*`, `use-color-scheme` 등)과 `typographyOption`, `font-size-context`, `scripts/reset-project.js` 삭제 | 템플릿 파일이 실제 앱과 섞여 있어서 어느 게 진짜인지 헷갈렸다. 화면 하나에 기능이 다 들어 있던 `chat.tsx`를 부품·훅으로 나눠 고치기 쉽게 |
| **대화창** | `chat.tsx`는 조립만. 입력줄(`ChatInputBar`), 말풍선(`MessageBubble`), 답변(`BotAnswer`·`MascotHeader`·`PolicyCardView`), 마이크(`MicButton`·`VoiceModal`), 기능은 `useChat`·`useVoiceRecorder` | 팀원 최신 `chat.tsx`는 한 파일 422줄(화면·녹음·전송·마스코트가 섞임). 역할별로 나눴다. 방이 바뀌면 화면을 새로 그려 메시지가 섞이지 않게 |
| **카드** | 팀원 `PolicyCarousel`(가로 넘기기) 대신 세로 카드 + 확대 화면(블러). 카드에 공유·보관·거절, 보관함 탭, 복지로 링크 | 사용자 결정(카드·디자인은 우리 방식). 보관·거절이 있어야 여러 번 상담해도 정리된다 |
| **여러 상담방** | `sessions-context`: 방 목록·즐겨찾기·삭제·새 상담 | 원래는 방이 하나뿐이라 주제가 섞였다 |
| **내 정보** | 첫 실행 안내(AI 고지 + 태어난 해·지역), 설정의 "내 기본 정보", 장애는 민감정보 별도 동의. 폰에만 **암호화** 저장(`expo-secure-store`) | 맞춤 검색을 위해. 개인정보라 서버에 저장하지 않고 폰에 암호화 |
| **음성** | 팀원 `VoicePanel`·마스코트 대신 가운데 음성 창(`VoiceModal`). 다 말하면 바로 전송 | 마스코트는 보류(사용자 결정). 입력칸에 글자가 들어가는 방식은 작은 글씨라 읽기 어려웠다 |
| **서버 통신** (`api/`) | 서버 주소를 환경변수로(`EXPO_PUBLIC_API_URL`), 모든 요청에 토큰 자동 첨부·401이면 재발급 후 1번 재시도, 서버 snake_case → 앱 camelCase 변환을 한 곳에서 | 원래는 Render 주소가 코드에 고정이라 로컬 서버로 테스트할 수 없었다 |
| **접근성** | 글자 크기(12~28) 전 화면 반영, 색약 모드 4종(녹색맹·적색맹·전색맹·청황색맹, 전색맹은 마스코트도 흑백), 버튼 최소 높이 44, 움직임 줄이기 존중 | 어르신·색각이상 사용자 |
| 설정 파일 | `package.json`: `expo-secure-store`·`expo-blur`·`expo-dev-client` 추가. `eas.json`: development에 `node: 24.12.0`. `tsconfig.json`: 없는 파일 참조 삭제 | 암호화 저장·블러·개발용 빌드. EAS 빌드 서버의 npm 버전 문제 |

### 이름 규칙 (2026-11-11 정리)
- 앱: 컴포넌트·파일 `PascalCase`, 훅 `useXxx`, 함수·변수 `camelCase`(팀원 `get_chat_history`도 `getChatHistory`로), 공용 상태 파일은 Expo 방식 `xxx-context.tsx`
- 서버: 함수·변수 `snake_case`, 상수 `UPPER_SNAKE`, 파일 안에서만 쓰는 것은 `_` 시작. API JSON은 서버 쪽 `snake_case`(팀원 기존 `isUser`만 예외), 앱이 받을 때 camelCase로 바꾼다
- 저장 키: AsyncStorage는 `@` 시작(`@app_settings` 등), SecureStore는 `@`를 못 써서 `user_profile`·`device_token`
- 정리하면서 뺀 것: 안 쓰는 `import React` 19곳, 예전 단일 세션 이전용 `utils/sessionManager.ts`(출시 전이라 옮길 데이터 없음), 마이크 버튼의 녹음 중 표시(음성 창이 덮어서 안 보임), `api.py`의 안 쓰는 import. 팀원 파일 `main.py`·`tasks.py`의 안 쓰는 import는 손대지 않음

---

## 6. 알아둔 사실 / 주의

- **DB(Neo4j)**: 정책 4,779개. 대상·내용·신청방법이 나뉜 건 중앙 461개(10%)뿐, 지자체 4,318개는 "요약" 한 문장(평균 92자). 지자체 원본(`back/data_ext/DataList2.json`)에는 `servDtlLink`(복지로 상세 링크), 대상구분, 지역, 신청방식이 더 있는데 DB엔 안 들어감. 주제 태그 오류 있음(난방비가 "입양·위탁").
- **Render**: 팀원 원래 백엔드(`reply_type` 있음, `/auth/device` 없음). 콜드스타트 있음.
- `tasks.py` 대화 보관이 **5분**(테스트용, 원래 5일) → 오래 두면 기록이 사라짐. 대화는 `MemorySaver`(서버 메모리)라 재시작하면 전부 사라짐 → 배포 전 DB 저장 방식 필요.
- **조건 추출 AI 환각**: 근거 없이 대상구분(특히 목록 마지막 "보훈대상자")을 붙임. 원본 코드부터 있던 문제(welfare-eval v12 로그에도 있음, 예: "고령자 계속고용장려금 신청 방법" → 보훈대상자). 우리 쪽은 이중 확인으로 막음. 원본·평가에는 미반영.
- **검색어에 이전 주제가 섞임**: "노인 일자리" 뒤 "주거 지원도 알려줘" → 검색어 "노인 일자리 및 주거 지원", 주제 조건도 `['주거','일자리']`로 쌓임 → 일자리 정책 위주로 검색되고 카드 1장. (팀원 EXTRACT 프롬프트 규칙 4 + `merge_condition`) 미해결.
- 검색 결과에 같은 이름 정책이 두 번 나옴 (DB 중복, 예: 노인일자리 및 사회활동 지원사업).
- 팀원 의도 분류 오류: "난방비 지원**도** 알려줘", "(수급자 대화 뒤) 주거 지원도 알려줘"를 상세요구로 분류.
- 상세 답변 글이 아직 김 (팀원이 불릿·이모지 규칙은 지웠지만 "신청 방법" 질문에 여전히 긴 목록형). 사용자가 직접 확인 후 진행하기로 함.
- 번호("3번 자세히")는 마지막 여러 장 목록 기준이라, 중간에 카드 1장 답변이 끼면 헷갈릴 수 있음.
- 서울 송파구로 거르면 서울 지자체 정책이 거의 없음 (DB에 적음).
- 팀원은 이후 `mascot.tsx`(`../assets/mascot/`)로 경로를 고침. 마스코트는 보류 중.
- Expo SDK 58이 나옴. 팀원 저장소가 57이라 혼자 올리지 않음 (팀원 상의).
- 카드형 답변은 `welfare-eval` 채점(답변 글에서 정책명 추출, RAGAS)과 안 맞음 → 팀원 백엔드에 합칠 때 평가 코드도 `cards` 기준으로 바꿔야 함. (사용자: "일단 상관없음")
- 웹 전용 이슈들: 입력 최소너비, `outlineStyle:none`, Switch 초록, Alert 미동작(dialog.ts), 버튼 안 버튼 금지, 개발 `#error-toast`.
- React Compiler가 켜져 있어 `makeStyles(theme)`는 자동 캐시됨 (따로 useMemo 안 함).

---

## 7. 앞으로 할 일 (우선순위 순)

1. **상세 답변 짧게** — 사용자가 직접 확인해 보고 진행하기로 함 (상세 전용 프롬프트).
2. **검색 품질** (팀원 검색 로직, 평가 수치 영향 → 하나씩 고치고 실제 질문으로 확인)
   - "~도 알려줘"면 사람 조건은 유지·주제는 교체하게 검색어 규칙 수정, 주제 조건 누적 방지
   - "~도" 질문이 상세요구로 가는 의도 분류 오류
   - 같은 이름 정책 중복 제거
3. **팀원과 상의할 것** — 카드 방식(우리 방식으로 감), Render에 우리 백엔드 배포(`DEVICE_TOKEN_SECRET`·`CLOVA_SECRET`·`openai`), `tasks.py` 5분→5일, 대화 저장 DB화, 조건 추출 환각·이중 확인(평가 다시 돌리기), 평가 기준을 `cards`로, Neo4j Aura 유지, SDK 58 업그레이드 시점.
4. **음성 화면** — 팀원 `VoicePanel`(듣는 중 화면, 음량 표시)을 우리 구조로 옮길지 결정. 마스코트는 보류.
5. **방화벽 정리**(사용자가 나중에) — 관리자 PowerShell: `Get-NetFirewallRule -DisplayName "python.exe","Node.js JavaScript Runtime" | Set-NetFirewallRule -RemoteAddress LocalSubnet`
6. **앱 이름 확정**(`constants/brand.ts`, 패키지명 `com.anonymous...` 변경) + 아이콘·스플래시.
7. **개인정보 처리방침 화면** (출시 전 필수: 수집 항목·목적·보유기간·국외/위탁(네이버 클로바 음성, Upstage)·파기).
8. **배포**: 백엔드는 클라우드(Render 등, https), 앱은 production 빌드(AAB)로 Play 스토어. PC 서버는 필요 없음.
9. 지자체 정책 데이터 보강 (백엔드·팀원).
