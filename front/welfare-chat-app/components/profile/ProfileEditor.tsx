import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { BirthYearInput } from '@/components/profile/BirthYearInput';
import { HouseholdPicker } from '@/components/profile/HouseholdPicker';
import { RegionPicker } from '@/components/profile/RegionPicker';
import { Palette } from '@/constants/theme';
import { useProfile } from '@/contexts/profile-context';
import { useSettings, useTheme } from '@/contexts/settings-context';
import { regionLabel } from '@/types/profile';
import { confirm } from '@/utils/dialog';

// 설정 화면의 "내 기본 정보" 카드: 나이 / 사는 곳 / 가구 상황 / 장애 여부(민감정보, 별도 동의) / 전체 삭제
export function ProfileEditor() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const { fontSize } = useSettings();
  const { loaded, profile, updateProfile, setSensitiveConsent, clearProfile } = useProfile();
  const [open, setOpen] = useState(true);
  const [editingRegion, setEditingRegion] = useState(false);
  // 출생연도 입력칸은 처음 받은 값으로 시작하므로, 저장소 읽기가 끝났을 때와 전체 삭제 후에 key를 바꿔 새로 그린다
  const [resetKey, setResetKey] = useState(0);
  const birthInputKey = `${loaded}-${resetKey}`;

  const askSensitiveConsent = async () => {
    const ok = await confirm(
      '장애 여부는 법에서 정한 민감정보예요.\n\n· 이 휴대폰에만 암호화해서 저장돼요.\n· 맞춤 혜택을 찾을 때만 함께 보내지고 서버에는 저장하지 않아요.\n· 언제든 동의를 거두면 바로 지워져요.\n\n동의하고 입력할까요?',
      '동의'
    );
    if (ok) setSensitiveConsent(true);
  };

  const askWithdraw = async () => {
    if (await confirm('민감정보 동의를 거둘까요? 저장된 장애 여부가 지워져요.', '동의 철회')) setSensitiveConsent(false);
  };

  const askClear = async () => {
    if (await confirm('이 휴대폰에 저장된 내 정보를 모두 지울까요?', '전체 삭제')) {
      clearProfile();
      setResetKey((k) => k + 1);
      setEditingRegion(false);
    }
  };

  const label = [styles.fieldLabel, { fontSize: fontSize + 2 }];

  return (
    <View style={styles.card}>
      <Pressable
        style={styles.headerRow}
        onPress={() => setOpen(!open)}
        accessibilityRole="button"
        accessibilityLabel={open ? '내 기본 정보 접기' : '내 기본 정보 펼치기'}>
        <Text style={[styles.title, { fontSize: fontSize + 6 }]}>내 기본 정보</Text>
        <MaterialIcons name={open ? 'arrow-upward' : 'arrow-downward'} size={28} color={theme.text} />
      </Pressable>

      {open && (
        <View style={styles.body}>
          <View style={styles.notice}>
            <MaterialIcons name="lock" size={18} color={theme.subText} />
            <Text style={[styles.noticeText, { fontSize: fontSize - 1 }]}>
              이 휴대폰에만 암호화해서 저장돼요. 맞춤 혜택을 찾을 때만 함께 보내지고 서버에는 저장하지 않아요.
            </Text>
          </View>

          {/* 나이 */}
          <View style={styles.field}>
            <Text style={label}>나이</Text>
            <BirthYearInput key={birthInputKey} value={profile.birthYear} onChange={(birthYear) => updateProfile({ birthYear })} />
          </View>

          {/* 사는 곳 */}
          <View style={[styles.field, styles.divider]}>
            <View style={styles.rowBetween}>
              <Text style={label}>사는 곳</Text>
              <Pressable onPress={() => setEditingRegion(!editingRegion)} hitSlop={10} accessibilityRole="button">
                <Text style={[styles.link, { fontSize }]}>{editingRegion ? '완료' : profile.province ? '변경' : '선택'}</Text>
              </Pressable>
            </View>
            {editingRegion ? (
              <RegionPicker
                province={profile.province}
                district={profile.district}
                onChange={(province, district) => updateProfile({ province, district })}
              />
            ) : (
              <Text style={[styles.value, { fontSize: fontSize + 1 }]}>{regionLabel(profile) || '아직 입력하지 않았어요'}</Text>
            )}
          </View>

          {/* 가구 상황 */}
          <View style={[styles.field, styles.divider]}>
            <Text style={label}>가구·경제 상황</Text>
            <Text style={[styles.hint, { fontSize: fontSize - 1 }]}>해당하는 것만 골라 주세요</Text>
            <HouseholdPicker value={profile.household} onChange={(household) => updateProfile({ household })} />
          </View>

          {/* 장애 여부 (민감정보) */}
          <View style={[styles.field, styles.divider]}>
            <View style={styles.rowBetween}>
              <Text style={label}>장애 여부</Text>
              <Text style={[styles.badge, { fontSize: fontSize - 3 }]}>민감정보</Text>
            </View>
            {profile.sensitiveConsent ? (
              <>
                <View style={styles.rowBetween}>
                  <Text style={[styles.value, { fontSize: fontSize + 1 }]}>
                    {profile.disability ? '장애가 있어요' : '해당 없음'}
                  </Text>
                  <Switch
                    value={profile.disability === true}
                    onValueChange={(on) => updateProfile({ disability: on })}
                    trackColor={{ false: theme.chip, true: theme.accent }}
                    thumbColor="#FFFFFF"
                    {...({ activeThumbColor: '#FFFFFF' } as object)}
                    accessibilityLabel="장애 여부"
                  />
                </View>
                <Pressable onPress={askWithdraw} hitSlop={10} accessibilityRole="button">
                  <Text style={[styles.subLink, { fontSize: fontSize - 1 }]}>민감정보 동의 철회</Text>
                </Pressable>
              </>
            ) : (
              <Pressable style={styles.consentButton} onPress={askSensitiveConsent} accessibilityRole="button">
                <Text style={[styles.consentText, { fontSize }]}>동의하고 입력하기</Text>
              </Pressable>
            )}
          </View>

          <Pressable style={styles.clearButton} onPress={askClear} accessibilityRole="button">
            <MaterialIcons name="delete-outline" size={20} color={theme.danger} />
            <Text style={[styles.clearText, { fontSize }]}>내 정보 전체 삭제</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const makeStyles = (t: Palette) =>
  StyleSheet.create({
    card: {
      backgroundColor: t.surface,
      borderColor: t.border,
      borderWidth: 2,
      borderRadius: 18,
      paddingHorizontal: 20,
      paddingVertical: 18,
    },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    title: { color: t.text },
    body: { marginTop: 14, gap: 16 },
    notice: { flexDirection: 'row', gap: 6, backgroundColor: t.background, borderRadius: 12, padding: 10 },
    noticeText: { flex: 1, color: t.subText, lineHeight: 20 },
    field: { gap: 10 },
    divider: { borderTopWidth: 1, borderTopColor: t.border, paddingTop: 16 },
    rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    fieldLabel: { color: t.text, fontWeight: '700' },
    value: { color: t.text },
    hint: { color: t.subText },
    link: { color: t.accentStrong, fontWeight: '700' },
    subLink: { color: t.subText, textDecorationLine: 'underline' },
    badge: {
      color: t.accentStrong,
      borderColor: t.accentStrong,
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    consentButton: {
      minHeight: 46,
      borderRadius: 14,
      borderWidth: 2,
      borderStyle: 'dashed',
      borderColor: t.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    consentText: { color: t.accentStrong, fontWeight: '700' },
    clearButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      minHeight: 46,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: t.danger,
      marginTop: 4,
    },
    clearText: { color: t.danger, fontWeight: '700' },
  });
