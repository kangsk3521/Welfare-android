import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// 폰 저장소 읽기/쓰기를 한 곳에 모아둔 파일.
// - 일반 값(설정, 상담 목록): AsyncStorage (암호화 안 됨)
// - 비밀 값(기기 토큰 등): SecureStore (안드로이드 Keystore / iOS Keychain으로 암호화)

// ---------------------------------------------------------- 비밀 값
// 웹은 SecureStore를 지원하지 않아서 일반 저장소로 대신한다 (웹은 개발 확인용)

export async function loadSecret(key: string): Promise<string | null> {
  if (Platform.OS === 'web') return AsyncStorage.getItem(key);
  return SecureStore.getItemAsync(key);
}

export async function saveSecret(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') return AsyncStorage.setItem(key, value);
  return SecureStore.setItemAsync(key, value);
}

export async function deleteSecret(key: string): Promise<void> {
  if (Platform.OS === 'web') return AsyncStorage.removeItem(key);
  return SecureStore.deleteItemAsync(key);
}

// ---------------------------------------------------------- 일반 값

export async function loadJSON<T>(key: string): Promise<T | null> {
  const saved = await AsyncStorage.getItem(key);
  return saved ? (JSON.parse(saved) as T) : null;
}

export async function saveJSON(key: string, value: unknown): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export async function loadText(key: string): Promise<string | null> {
  return AsyncStorage.getItem(key);
}

export async function saveText(key: string, value: string): Promise<void> {
  await AsyncStorage.setItem(key, value);
}
