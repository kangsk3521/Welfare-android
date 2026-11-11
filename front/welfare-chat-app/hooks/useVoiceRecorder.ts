import { Buffer } from 'buffer';
import { useEffect, useRef, useState } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';

import { getDeviceToken } from '@/api/auth';
import { WS_URL } from '@/constants/config';
import { LiveAudioStream } from '@/utils/audio';
import { notify } from '@/utils/dialog';

// 음성 인식 단계. idle이 아니면 화면 가운데 음성 창(VoiceModal)이 열린다
export type VoicePhase = 'idle' | 'connecting' | 'listening' | 'finishing';

const NOTICE_MS = 3000; // 실패 안내는 잠깐 보였다가 사라진다
const FINISH_TIMEOUT_MS = 8000; // 다 말한 뒤 결과가 이 시간 안에 안 오면 실패로 본다

// 음성 인식: 녹음한 소리를 웹소켓으로 서버에 보내고, 서버(클로바)가 바꾼 글자를 돌려받는다.
// 흐름: 마이크 누름 → 권한 확인 → 소켓 연결 → 녹음 조각 전송(말하는 동안 글자가 liveText로 들어옴)
//       → "다 말했어요" → "STOP_RECORDING" → 최종 글자 수신 → onFinal로 바로 전송
// - 전송하지 못하면(앞 답변을 기다리는 중 등) onFinal이 false → onFallback으로 입력칸에 넣어 둔다
// - "취소"는 소켓을 닫아 결과를 받지 않는다
export function useVoiceRecorder(
  sessionId: string,
  onFinal: (text: string) => boolean,
  onFallback: (text: string) => void,
) {
  const [phase, setPhase] = useState<VoicePhase>('idle');
  const [liveText, setLiveText] = useState(''); // 지금까지 알아들은 말 (음성 창에 크게 보여줌)
  const [notice, setNotice] = useState(''); // 마이크 위에 잠깐 보여줄 안내
  const ws = useRef<WebSocket | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finishTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 소켓의 onmessage는 연결할 때 한 번 만들어지므로, 매번 최신 함수를 부르도록 ref에 담아 둔다
  // (예전 함수를 부르면 "전송 중" 같은 상태를 옛날 값으로 보게 된다)
  const callbacks = useRef({ onFinal, onFallback });
  useEffect(() => {
    callbacks.current = { onFinal, onFallback };
  });

  const showNotice = (message: string) => {
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    setNotice(message);
    noticeTimer.current = setTimeout(() => setNotice(''), NOTICE_MS);
  };

  const clearFinishTimer = () => {
    if (finishTimer.current) clearTimeout(finishTimer.current);
    finishTimer.current = null;
  };

  // 녹음·연결을 모두 정리하고 처음 상태로 (실패·취소·화면 떠남)
  const reset = () => {
    LiveAudioStream?.stop();
    clearFinishTimer();
    const socket = ws.current;
    ws.current = null;
    socket?.close();
    setPhase('idle');
    setLiveText('');
  };

  // 화면을 떠나면 연결과 녹음 정리
  useEffect(() => {
    return () => {
      LiveAudioStream?.stop();
      ws.current?.close();
      ws.current = null;
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
      if (finishTimer.current) clearTimeout(finishTimer.current);
    };
  }, []);

  const finish = (raw: string) => {
    clearFinishTimer();
    setPhase('idle');
    setLiveText('');
    const text = raw.trim();
    if (!text) {
      showNotice('말씀을 알아듣지 못했어요. 다시 시도해 주세요.');
    } else if (!callbacks.current.onFinal(text)) {
      callbacks.current.onFallback(text);
      showNotice('앞 답변이 끝나면 전송 버튼을 눌러 주세요.');
    }
  };

  const fail = (message: string) => {
    reset();
    showNotice(message);
  };

  const openSocket = async () => {
    if (ws.current?.readyState === WebSocket.OPEN) return ws.current;
    // 웹소켓은 헤더를 붙일 수 없어서 기기 토큰을 주소 뒤에 붙인다 (서버가 확인 후 연결을 받음)
    const token = await getDeviceToken();
    return new Promise<WebSocket>((resolve, reject) => {
      const socket = new WebSocket(`${WS_URL}/ws/chat/${sessionId}?token=${encodeURIComponent(token)}`);
      socket.onopen = () => resolve(socket);
      socket.onerror = () => reject(new Error('소켓 연결 실패'));
      socket.onclose = () => {
        if (ws.current !== socket) return; // 취소 등으로 직접 닫은 소켓
        ws.current = null;
        fail('서버 연결이 끊어졌어요. 다시 시도해 주세요.');
      };
      socket.onmessage = (e) => {
        if (ws.current !== socket) return;
        const data = JSON.parse(e.data);
        // 클로바는 말하는 동안 지금까지 알아들은 글자 전체를 계속 보내고, 끝나면 final: true를 보낸다
        if (data.final) finish(data.recognized_text ?? '');
        else if (data.status === 'error') fail('음성 인식에 실패했어요. 다시 시도해 주세요.');
        else if (data.recognized_text) setLiveText(data.recognized_text);
      };
      ws.current = socket;
    });
  };

  const start = async () => {
    if (!LiveAudioStream) {
      // 웹·Expo Go에는 녹음 모듈이 없다 (utils/audio.ts)
      notify('이 환경에서는 음성 인식을 쓸 수 없어요.\n안드로이드 앱으로 설치하면 사용할 수 있어요.');
      return;
    }
    if (phase !== 'idle') return;

    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        notify('음성 인식을 하려면 마이크 권한이 필요해요.');
        return;
      }
    }

    setNotice('');
    setLiveText('');
    setPhase('connecting');
    try {
      const socket = await openSocket();
      LiveAudioStream.init({ sampleRate: 16000, channels: 1, bitsPerSample: 16, audioSource: 6, bufferSize: 4096 } as any);
      LiveAudioStream.on('data', (base64Chunk: string) => {
        if (socket.readyState !== WebSocket.OPEN) return;
        const bytes = Buffer.from(base64Chunk, 'base64');
        socket.send(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
      });
      LiveAudioStream.start();
      setPhase('listening');
    } catch {
      fail('서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.');
    }
  };

  // "다 말했어요": 녹음을 멈추고 최종 결과를 기다린다 (오면 바로 전송)
  const stop = () => {
    if (phase !== 'listening') return;
    LiveAudioStream?.stop();
    if (ws.current?.readyState !== WebSocket.OPEN) {
      fail('서버 연결이 끊어졌어요. 다시 시도해 주세요.');
      return;
    }
    ws.current.send('STOP_RECORDING');
    setPhase('finishing');
    finishTimer.current = setTimeout(() => fail('음성 인식에 실패했어요. 다시 시도해 주세요.'), FINISH_TIMEOUT_MS);
  };

  // "취소": 결과를 받지 않고 닫는다
  const cancel = () => reset();

  return { phase, liveText, notice, start, stop, cancel };
}
