import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

// 키보드가 떠 있으면 그 높이, 아니면 0.
// 화면을 맨 아래까지 쓰는 edge-to-edge 설정이라 안드로이드가 키보드만큼 화면을 자동으로 올려주지 않아서,
// 이 값만큼 화면 아래에 여백을 줘서 입력칸을 키보드 위로 올린다. (웹은 이벤트가 없어 항상 0)
export function useKeyboardHeight() {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    // iOS는 키보드가 뜨기 직전(Will), 안드로이드는 뜬 직후(Did) 이벤트만 있다
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, (e) => setHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener(hideEvent, () => setHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return height;
}
