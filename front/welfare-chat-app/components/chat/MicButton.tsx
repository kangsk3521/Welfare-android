import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { Palette } from '@/constants/theme';
import { useTheme } from '@/contexts/settings-context';

// 채팅 목록 위에 떠 있는 마이크 버튼 + 그 위에 잠깐 뜨는 안내(notice, 예: 못 알아들었어요).
// 누르면 화면 가운데 음성 창(VoiceModal)이 열린다. 녹음 중 상태는 그 창이 보여준다.
// 영역 자체는 배경이 없고, 버튼 밖을 누르면 뒤의 채팅 목록으로 터치가 통과한다(box-none).
// 이 높이만큼 채팅 목록 아래에 여백을 둬야 마지막 말풍선이 버튼에 가리지 않는다.
export const MIC_SPACE = 94;

export function MicButton({
  visible,
  notice,
  onPress,
}: {
  visible: boolean; // 입력칸을 선택하면 숨긴다
  notice: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  const styles = makeStyles(theme);

  return (
    <View style={styles.overlay}>
      {notice !== '' && <Text style={styles.notice}>{notice}</Text>}
      {visible && (
        <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)}>
          <Pressable
            style={styles.circle}
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel="음성으로 말하기">
            <MaterialIcons name="mic" size={31} color={theme.onAccent} />
          </Pressable>
        </Animated.View>
      )}
    </View>
  );
}

const makeStyles = (t: Palette) =>
  StyleSheet.create({
    overlay: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 12,
      alignItems: 'center',
      gap: 8,
      pointerEvents: 'box-none',
    },
    notice: {
      textAlign: 'center',
      color: t.subText,
      fontSize: 14,
      backgroundColor: t.surface,
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 6,
      marginHorizontal: 24,
      overflow: 'hidden',
    },
    circle: {
      width: 62,
      height: 62,
      borderRadius: 31,
      backgroundColor: t.accent,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });
