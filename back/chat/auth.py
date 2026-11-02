"""기기 토큰 인증.

회원가입 없이, 앱을 처음 켤 때 서버가 기기마다 토큰을 하나 발급한다.
  토큰 = "기기ID.서명"   (서명 = 서버 비밀키로 만든 HMAC)
서버는 토큰을 따로 저장하지 않고, 서명을 다시 계산해 보는 것만으로 진짜인지 확인한다.

대화 기록은 "기기ID:세션ID"를 키로 저장한다(thread_key).
그래서 다른 사람의 세션ID를 알아내도, 자기 기기ID 칸에서만 찾게 되므로 남의 대화는 볼 수 없다.
"""

import hashlib
import hmac
import os
import re
import secrets

from fastapi import Header, HTTPException

# 서버 비밀키. 운영 서버(.env 또는 Render 환경변수)에는 반드시 DEVICE_TOKEN_SECRET을 넣어야 한다.
# 없으면 실행할 때마다 임시 키를 만든다 → 서버가 재시작되면 기존 토큰이 전부 무효가 된다(앱이 자동으로 다시 발급받음).
_SECRET = os.getenv("DEVICE_TOKEN_SECRET")
if not _SECRET:
    _SECRET = secrets.token_urlsafe(32)
    print("[경고] DEVICE_TOKEN_SECRET이 없어 임시 키를 사용합니다. 서버 재시작 시 기기 토큰이 모두 무효가 됩니다.")

_SECRET_BYTES = _SECRET.encode()

# 앱이 만드는 세션ID는 UUID. 이상한 값(아주 긴 문자열, ':' 등)이 키에 섞이지 않게 형식을 제한한다.
_SESSION_ID_PATTERN = re.compile(r"^[A-Za-z0-9_-]{1,64}$")


def _sign(device_id: str) -> str:
    return hmac.new(_SECRET_BYTES, device_id.encode(), hashlib.sha256).hexdigest()


def issue_token() -> str:
    """새 기기ID를 만들고 서명을 붙여 토큰으로 돌려준다."""
    device_id = secrets.token_urlsafe(16)
    return f"{device_id}.{_sign(device_id)}"


def verify_token(token: str | None) -> str | None:
    """토큰이 진짜면 기기ID, 아니면 None."""
    if not token or "." not in token:
        return None
    device_id, signature = token.rsplit(".", 1)
    # compare_digest: 비교 시간이 일정해서, 응답 시간으로 서명을 한 글자씩 맞혀 보는 공격을 막는다
    if device_id and hmac.compare_digest(signature, _sign(device_id)):
        return device_id
    return None


def require_device(authorization: str | None = Header(default=None)) -> str:
    """HTTP 요청용: 'Authorization: Bearer <토큰>' 헤더를 검사해 기기ID를 돌려준다. 없거나 가짜면 401."""
    token = authorization.removeprefix("Bearer ").strip() if authorization else None
    device_id = verify_token(token)
    if device_id is None:
        raise HTTPException(status_code=401, detail="기기 인증이 필요합니다")
    return device_id


def thread_key(device_id: str, session_id: str) -> str:
    """대화 기록 저장 키. 세션ID 형식이 이상하면 400."""
    if not _SESSION_ID_PATTERN.match(session_id):
        raise HTTPException(status_code=400, detail="잘못된 세션 ID입니다")
    return f"{device_id}:{session_id}"
