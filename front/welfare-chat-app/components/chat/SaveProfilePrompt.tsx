import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Chip } from '@/components/common/Chip';
import { Palette } from '@/constants/theme';
import { useProfile } from '@/contexts/profile-context';
import { useSettings, useTheme } from '@/contexts/settings-context';
import { DISABILITY_TAG, HouseholdTag, isHouseholdTag } from '@/types/profile';
import { askSensitiveConsent } from '@/utils/consent';

// 챗봇 답변 아래: "대화에서 알게 된 정보를 내 정보에 저장할까요? [저소득] [장애인]  [저장] [이번만]"
// - 칩을 눌러 저장할 것만 고를 수 있다 (처음엔 모두 선택)
// - 장애인은 민감정보라 아직 동의 전이면 저장 전에 동의를 받는다
// - 저장하거나 '이번만'을 누르면 이 안내는 접힌다 (status는 화면 쪽에서 메시지별로 기억)
export function SaveProfilePrompt({
  tags,
  status,
  onDone,
}: {
  tags: string[];
  status: 'open' | 'saved' | 'dismissed';
  onDone: (status: 'saved' | 'dismissed') => void;
}) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const { fontSize } = useSettings();
  const { profile, updateProfile, setSensitiveConsent } = useProfile();
  const [selected, setSelected] = useState<string[]>(tags);

  if (status === 'dismissed') return null;
  if (status === 'saved') {
    return (
      <View style={styles.savedRow}>
        <MaterialIcons name="check-circle" size={18} color={theme.accentStrong} />
        <Text style={[styles.savedText, { fontSize: fontSize - 1 }]}>내 정보에 저장했어요 · 설정에서 바꿀 수 있어요</Text>
      </View>
    );
  }

  const toggle = (tag: string) => setSelected((s) => (s.includes(tag) ? s.filter((t) => t !== tag) : [...s, tag]));

  const save = async () => {
    const household = selected.filter(isHouseholdTag) as HouseholdTag[];
    const wantsDisability = selected.includes(DISABILITY_TAG);

    if (wantsDisability && !profile.sensitiveConsent) {
      if (!(await askSensitiveConsent())) return; // 동의하지 않으면 아무것도 저장하지 않고 안내는 그대로 둔다
      setSensitiveConsent(true);
    }

    updateProfile({
      household: Array.from(new Set([...profile.household, ...household])),
      ...(wantsDisability ? { disability: true } : {}),
    });
    onDone('saved');
  };

  return (
    <View style={styles.box}>
      <View style={styles.titleRow}>
        <MaterialIcons name="person-add-alt" size={20} color={theme.accentStrong} />
        <Text style={[styles.title, { fontSize }]}>대화에서 알게 된 정보를 내 정보에 저장할까요?</Text>
      </View>
      <Text style={[styles.hint, { fontSize: fontSize - 2 }]}>
        저장하면 다음 상담부터 더 맞는 혜택을 찾아드려요. 가족 이야기였다면 저장하지 마세요.
      </Text>
      <View style={styles.chips}>
        {tags.map((t) => (
          <Chip key={t} label={t === DISABILITY_TAG ? `${t} (민감정보)` : t} selected={selected.includes(t)} onPress={() => toggle(t)} />
        ))}
      </View>
      <View style={styles.buttons}>
        <Pressable
          style={[styles.button, styles.primary, selected.length === 0 && { opacity: 0.5 }]}
          onPress={save}
          disabled={selected.length === 0}
          accessibilityRole="button">
          <Text style={[styles.primaryText, { fontSize }]}>저장</Text>
        </Pressable>
        <Pressable style={[styles.button, styles.secondary]} onPress={() => onDone('dismissed')} accessibilityRole="button">
          <Text style={[styles.secondaryText, { fontSize }]}>이번만</Text>
        </Pressable>
      </View>
    </View>
  );
}

const makeStyles = (t: Palette) =>
  StyleSheet.create({
    box: {
      marginTop: 12,
      gap: 10,
      padding: 14,
      borderRadius: 16,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: t.accentStrong,
      backgroundColor: t.surface,
    },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    title: { flex: 1, color: t.text, fontWeight: '700' },
    hint: { color: t.subText },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    buttons: { flexDirection: 'row', gap: 8 },
    button: { flex: 1, minHeight: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
    primary: { backgroundColor: t.accent },
    primaryText: { color: t.onAccent, fontWeight: '700' },
    secondary: { borderWidth: 1.5, borderColor: t.border },
    secondaryText: { color: t.subText },
    savedRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, paddingHorizontal: 4 },
    savedText: { color: t.subText },
  });
