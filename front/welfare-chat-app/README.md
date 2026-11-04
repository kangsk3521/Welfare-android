# 복지 상담 챗봇 (Team SOLV) — 앱

어르신도 쉽게 쓰는 AI 복지 정책 상담 앱입니다. 질문하면 받을 수 있는 복지 혜택을 **카드**로 보여주고,
카드를 누르면 대상·내용·신청 방법을 자세히 볼 수 있습니다.

- React Native + Expo SDK 57, expo-router(파일 기반 화면 이동), TypeScript
- 백엔드: `../../back/chat` (FastAPI + LangGraph + Neo4j + Upstage Solar)

## 실행

```bash
npm install
npx expo start              # 웹: w 키 또는 http://localhost:8081, 폰: Expo Go(SDK 57)로 접속
```

서버 주소는 `EXPO_PUBLIC_API_URL` 환경변수로 바꿀 수 있습니다 (없으면 Render 배포 주소).

```bash
# PowerShell 예: 내 PC에서 띄운 백엔드에 붙이기
$env:EXPO_PUBLIC_API_URL = 'http://192.168.0.7:8000'; npx expo start
```

마이크(음성 인식)는 네이티브 모듈이라 웹·Expo Go에서는 동작하지 않고, 안드로이드 앱으로 빌드해야 씁니다 (`npx expo run:android`).

## 화면

| 경로 | 화면 |
|---|---|
| `/` → `/chat` | 대화창: 안내·추천 질문, 말풍선, 정책 카드, 떠 있는 마이크, 입력줄 |
| `/list` | 목록: [상담 목록 \| 보관한 혜택] 탭 |
| `/settings` | 설정: 글자크기, 색약모드, 내 기본 정보 |

앱을 켜면 오프닝(로고·Team SOLV) → 처음 한 번 안내·동의(나이·사는 곳 입력, 건너뛰기 가능) → 대화창 순서로 보입니다.

## 폴더 구조

```
app/                      화면 (expo-router: 파일 경로 = 화면 주소)
  _layout.tsx             앱 전체 틀: 저장소(Provider)들, 오프닝·첫 실행 안내
  (main)/_layout.tsx      화면 3개와 위쪽 바 버튼
  (main)/chat.tsx         대화창 (조각들을 조립만 함)
  (main)/list.tsx         상담 목록 / 보관한 혜택
  (main)/settings.tsx     설정
components/
  common/                 여러 화면에서 쓰는 것: 위쪽 바, 칩, 스위치
  start/                  오프닝, 첫 실행 안내
  chat/                   대화창 조각: 입력줄, 마이크, 말풍선, 카드 답변, "저장할까요?" 안내
  cards/                  정책 카드, 카드 확대 화면(블러)
  profile/                내 정보 입력: 출생연도, 사는 곳, 가구상황, 편집 카드
contexts/                 앱 전체에서 같이 쓰는 상태 (폰 저장소에 저장)
  settings-context        글자크기·색약모드 (+ 테마 색 useTheme)
  profile-context         내 기본 정보 (암호화 저장소)
  sessions-context        상담방 목록
  cards-context           보관한 카드, 숨긴 카드
hooks/                    useChat(대화), useVoiceRecorder(음성), useKeyboardHeight
api/                      서버 통신: chatApi(채팅·기록), auth(기기 토큰)
utils/                    storage(저장소), dialog(알림·확인창), consent(민감정보 동의), share(공유), audio(마이크 모듈)
constants/                config(서버 주소), theme(색), brand(앱·팀 이름), regions(시·도/시·군·구)
types/                    chat(메시지·카드), profile(내 정보)
```

## 개인정보

- 내 기본 정보(출생연도·사는 곳·가구상황·장애 여부)는 **이 휴대폰의 암호화 저장소에만** 저장합니다 (`expo-secure-store`, 웹은 개발 확인용으로 일반 저장소).
- 채팅할 때 맞춤 추천을 위해 함께 보내고, 서버는 저장하거나 로그에 남기지 않습니다.
- 장애 여부는 민감정보라 별도 동의가 있을 때만 저장·전송합니다. 설정에서 동의 철회·전체 삭제할 수 있습니다.
- 서버 요청에는 기기 토큰(`api/auth.ts`, 암호화 저장소 보관)을 붙여, 다른 기기가 내 대화 기록을 볼 수 없게 합니다.
