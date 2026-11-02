import { NativeModules, Platform } from 'react-native';

// 마이크 녹음 모듈은 안드로이드/iOS로 빌드한 앱에만 들어 있다.
// 웹이나 Expo Go에서는 모듈이 없어서 import만 해도 에러가 나므로, 있을 때만 불러온다.
type LiveAudioStreamType = typeof import('react-native-live-audio-stream').default;

export const LiveAudioStream: LiveAudioStreamType | null =
  Platform.OS !== 'web' && NativeModules.RNLiveAudioStream
    ? require('react-native-live-audio-stream').default
    : null;

export const isAudioAvailable = LiveAudioStream !== null;
