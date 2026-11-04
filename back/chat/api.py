import os
from dotenv import load_dotenv
import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, UploadFile, File
from pydantic import BaseModel
from langchain_core.messages import HumanMessage
import openai


from graph import app
from tasks import session_timestamps
from auth import issue_token, require_device, thread_key, verify_token
from user_profile import UserProfileIn, new_detected


router = APIRouter()

# 기기 토큰 발급------------------------------------------------
# 앱이 처음 켜질 때 한 번 호출해서 토큰을 받고, 이후 모든 요청 헤더에 'Authorization: Bearer <토큰>'으로 붙인다.
class DeviceTokenResponse(BaseModel):
    device_token: str

@router.post("/auth/device", response_model=DeviceTokenResponse)
def register_device():
    return DeviceTokenResponse(device_token=issue_token())


# 채팅------------------------------------------------

# 손님이 보낼 주문서(Request) 양식 정의 (Pydantic 사용)
class ChatRequest(BaseModel):
    session_id: str          # 사용자 구분용 ID (단톡방 번호 같은 역할)
    user_message: str        # 사용자가 입력한 질문
    # 앱(휴대폰)에 저장된 사용자 기본 정보. 이번 답변에만 쓰고 서버에 저장하거나 로그에 남기지 않는다
    profile: Optional[UserProfileIn] = None

# 정책 카드 1장 (앱에서 카드로 표시. 내용은 DB 원문)
class PolicyCard(BaseModel):
    id: str                  # 정책 ID (servId)
    title: str               # 정책명
    target: str = ""         # 지원대상
    content: str = ""        # 지원내용 (지자체 정책은 요약)
    apply_method: str = ""   # 신청방법
    department: str = ""     # 담당부처
    support_type: str = ""   # 제공유형 (현금, 바우처 등)
    digest: str = ""         # 한 줄 요약

# 손님에게 줄 영수증(Response) 양식 정의
class ChatResponse(BaseModel):
    bot_reply: str           # 챗봇의 답변 (카드가 있으면 카드 위에 보여줄 짧은 소개)
    cards: List[PolicyCard] = []  # 추천 정책 카드. 되묻기·일상대화·상세설명 답변이면 빈 목록
    detected: List[str] = []      # 이번 대화에서 새로 알게 된 대상구분 (프로필에 없는 것). 앱이 저장할지 물어본다


def message_cards(msg) -> List[PolicyCard]:
    """답변 메시지에 붙어 있는 정책 카드 꺼내기 (nodes._card_answer가 additional_kwargs에 담음)"""
    raw = getattr(msg, "additional_kwargs", {}).get("policy_cards") or []
    return [PolicyCard(**c) for c in raw]


# 엔드포인트(창구) 만들기
@router.post("/chat", response_model=ChatResponse)
def chat_with_bot(request: ChatRequest, device_id: str = Depends(require_device)):
    # 대화 내용은 개인정보(건강·소득 등)가 섞일 수 있어서 로그에는 글자 수만 남긴다
    print(f"[{request.session_id[:8]}] 사용자 질문 수신 ({len(request.user_message)}자)")

    # LangGraph에 전달할 설정 (어떤 사용자의 대화 기록을 꺼낼지 지정)
    # 키를 "기기ID:세션ID"로 해서, 다른 기기는 같은 세션ID를 보내도 이 대화에 접근할 수 없다
    thread_id = thread_key(device_id, request.session_id)
    config = {"configurable": {"thread_id": thread_id}}

    session_timestamps[thread_id] = datetime.now()

    # 챗봇(app)에게 질문 던지기 (주방으로 전달)
    profile = request.profile.cleaned() if request.profile else {}
    result_state = app.invoke(
        {
            "messages": [HumanMessage(content=request.user_message)],
            "user_profile": profile,   # 요청마다 새 값으로 덮어쓴다
            "detected_tags": [],        # 이번 요청에서 새로 감지한 것만 남도록 비운다
        },
        config=config
    )
    
    # 챗봇이 만들어낸 마지막 답변 꺼내기
    final_message = result_state["messages"][-1]

    # 포장해서(Response 형식) 손님에게 반환
    return ChatResponse(
        bot_reply=final_message.content,
        cards=message_cards(final_message),
        detected=new_detected(result_state.get("detected_tags") or [], profile),
    )



# 채팅내역 가져오기------------------------------------------------ 기기 토큰으로 본인 대화만 조회
import uuid

class MessageHistoryResponse(BaseModel):
    id: str
    text: str
    isUser: bool
    cards: List[PolicyCard] = []

@router.get("/chat/history/{session_id}", response_model=List[MessageHistoryResponse])
def get_chat_history(session_id: str, device_id: str = Depends(require_device)):
    config = {"configurable": {"thread_id": thread_key(device_id, session_id)}}
    
    # LangGraph에서 해당 세션의 전체 상태(대화 기록) 꺼내기
    state = app.get_state(config)
    
    # 대화 기록이 아예 없으면 빈 리스트 반환
    if not state.values or "messages" not in state.values:
        return []
    
    history = []
    # 3. LangGraph의 메시지 객체들을 프론트엔드용 JSON 양식으로 변환
    for msg in state.values["messages"]:
        history.append(MessageHistoryResponse(
            id=msg.id if hasattr(msg, 'id') and msg.id else str(uuid.uuid4()),
            text=msg.content,
            isUser=msg.type == "human", # human이면 True(내 메시지), ai면 False(챗봇)
            cards=message_cards(msg),
        ))
        
    return history


# 서버체크------------------------------------------------
@router.get("/Health", response_model=bool)
def health_check():
    return True


# 음성인식
import io
from fastapi import WebSocket, WebSocketDisconnect
import wave 

def add_wav_header(pcm_byte: bytes, sample_rate = 16000, channels=1, bits =16) -> bytes:
    buf = io.BytesIO()
    with wave.open(buf, 'wb') as wf:
        wf.setnchannels(channels)
        wf.setsampwidth(bits // 8)
        wf.setframerate(sample_rate)
        wf.writeframes(pcm_byte)

    return buf.getvalue()


client = openai.AsyncOpenAI()

@router.websocket("/ws/chat/{session_id}")
async def websocket_chat_endpoint(websocket: WebSocket, session_id: str, token: str | None = None):
    # 웹소켓은 브라우저에서 헤더를 붙일 수 없어서 주소 뒤 ?token=<토큰> 으로 받는다.
    # 토큰이 없거나 가짜면 연결을 받지 않는다 (음성 인식은 유료 API라 아무나 쓰지 못하게)
    if verify_token(token) is None:
        await websocket.close(code=1008)  # 1008: 정책 위반
        return

    await websocket.accept()
    print(f"[{session_id[:8]}] 웹소켓 연결")

    audio_buffer = io.BytesIO() # 오디오 데이터 버퍼

    try:
        while True:

            message = await websocket.receive()

            if "bytes" in message:
                audio_buffer.write(message["bytes"])

            elif "text" in message:  # 제어 신호 처리
                command = message["text"]

                if command == "STOP_RECORDING": #녹음 완료되면 
                    audio_bytes = audio_buffer.getvalue()

                    if len(audio_bytes) > 0:
                        wav_bytes = add_wav_header(audio_bytes)
                        audio_file = ("audio.wav", io.BytesIO(wav_bytes), "audio/wav") #파일 만들기

                        transcript = await client.audio.transcriptions.create(
                            model = "whisper-1",
                            file = audio_file
                        )

                        user_message = transcript.text
                        print(f"[{session_id[:8]}] 음성 인식 완료 ({len(user_message)}자)")

                        audio_buffer = io.BytesIO()

                        await websocket.send_json({"recognized_text": user_message})

    except WebSocketDisconnect:
        print(f"[{session_id[:8]}] WebSocket 연결 종료됨")
    except Exception as e:
        print(f"[{session_id[:8]}] WebSocket 오류 발생: {e}")
        # 서버 내부 오류 내용은 앱에 그대로 보내지 않는다
        await websocket.send_json({
            "status": "error",
            "message": "음성 인식 중 오류가 발생했습니다"
        })

    


#------------------------------------------------ 파일배치 미완


@router.post("/File")
async def transcribe_file(audio_file: UploadFile = File(...), device_id: str = Depends(require_device)):
    
    transcript = await client.audio.transcriptions.create(
        model="whisper-1",
        file=(audio_file.filename, audio_file.file, audio_file.content_type)
    )
    
    
    return {"recognized_text": transcript.text}

