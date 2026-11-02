import { Alert, Platform } from 'react-native';

// 웹에서는 Alert.alert가 동작하지 않아서 브라우저 기본 창으로 대신한다.

export function notify(message: string) {
  if (Platform.OS === 'web') {
    window.alert(message);
  } else {
    Alert.alert('', message);
  }
}

export function confirm(message: string, okText = '확인'): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(window.confirm(message));
  }
  return new Promise((resolve) => {
    Alert.alert('', message, [
      { text: '취소', style: 'cancel', onPress: () => resolve(false) },
      { text: okText, style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}
