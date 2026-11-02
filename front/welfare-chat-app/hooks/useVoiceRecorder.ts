import { Buffer } from 'buffer';
import { useEffect, useRef, useState } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';

import { getDeviceToken } from '@/api/auth';
import { WS_URL } from '@/constants/config';
import { LiveAudioStream } from '@/utils/audio';
import { notify } from '@/utils/dialog';

// 음성 인식: 녹음한 소리를 웹소켓으로 서버에 보내고, 서버(Whisper)가 바꾼 글자를 onRecognized로 돌려준다.
// 흐름: 버튼 누름 → 권한 확인 → 소켓 연결 → 녹음 조각 전송 → 다시 누름 → "STOP_RECORDING" → 글자 수신
export function useVoiceRecorder(sessionId: string, onRecognized: (text: string) => void) {
  const [isRecording, setIsRecording] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState(''); // 마이크 위에 보여줄 안내 문구
  const ws = useRef<WebSocket | null>(null);

  // 화면을 떠나면 연결과 녹음 정리
  useEffect(() => {
    return () => {
      ws.current?.close();
      ws.current = null;
      LiveAudioStream?.stop();
    };
  }, []);

  const openSocket = async () => {
    if (ws.current?.readyState === WebSocket.OPEN) return ws.current;
    // 웹소켓은 헤더를 붙일 수 없어서 기기 토큰을 주소 뒤에 붙인다 (서버가 확인 후 연결을 받음)
    const token = await getDeviceToken();
    return new Promise<WebSocket>((resolve, reject) => {
      const socket = new WebSocket(`${WS_URL}/ws/chat/${sessionId}?token=${encodeURIComponent(token)}`);
      socket.onopen = () => resolve(socket);
      socket.onerror = () => reject(new Error('소켓 연결 실패'));
      socket.onclose = () => {
        if (ws.current === socket) ws.current = null;
      };
      socket.onmessage = (e) => {
        const data = JSON.parse(e.data);
        if (data.recognized_text) {
          onRecognized(data.recognized_text);
          setVoiceStatus('');
        } else if (data.status === 'error') {
          setVoiceStatus('음성 인식에 실패했어요.');
        }
      };
      ws.current = socket;
    });
  };

  const stopRecording = () => {
    LiveAudioStream?.stop();
    setIsRecording(false);
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send('STOP_RECORDING');
      setVoiceStatus('말씀하신 내용을 글자로 바꾸는 중…');
    } else {
      setVoiceStatus('서버 연결이 끊어졌어요. 다시 시도해 주세요.');
    }
  };

  const startRecording = async () => {
    if (!LiveAudioStream) return;

    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        notify('음성 인식을 하려면 마이크 권한이 필요해요.');
        return;
      }
    }

    try {
      setVoiceStatus('연결 중…');
      const socket = await openSocket();
      LiveAudioStream.init({ sampleRate: 16000, channels: 1, bitsPerSample: 16, audioSource: 6, bufferSize: 4096 } as any);
      LiveAudioStream.on('data', (base64Chunk: string) => {
        if (socket.readyState !== WebSocket.OPEN) return;
        const bytes = Buffer.from(base64Chunk, 'base64');
        socket.send(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
      });
      LiveAudioStream.start();
      setIsRecording(true);
      setVoiceStatus('듣고 있어요… 다 말씀하시면 버튼을 다시 눌러 주세요.');
    } catch {
      setVoiceStatus('서버에 연결하지 못했어요.');
    }
  };

  const toggleRecording = () => {
    // 웹·Expo Go에는 녹음 모듈이 없다 (utils/audio.ts)
    if (!LiveAudioStream) {
      notify('이 환경에서는 음성 인식을 쓸 수 없어요.\n안드로이드 앱으로 설치하면 사용할 수 있어요.');
      return;
    }
    if (isRecording) stopRecording();
    else startRecording();
  };

  return { isRecording, voiceStatus, toggleRecording };
}
