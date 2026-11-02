import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { Palette, webNoOutline } from '@/constants/theme';
import { FONT_SIZE_MAX, FONT_SIZE_MIN, ProfileItem, useSettings, useTheme } from '@/contexts/settings-context';
import { confirm, notify } from '@/utils/dialog';

const CIRCLED = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩'];

// 사용자 정보 입력폼 (추가/수정 공용)
function ProfileForm({
  initial,
  onSave,
  onCancel,
  styles,
  theme,
}: {
  initial?: ProfileItem;
  onSave: (label: string, value: string) => void;
  onCancel: () => void;
  styles: ReturnType<typeof makeStyles>;
  theme: Palette;
}) {
  const [label, setLabel] = useState(initial?.label ?? '');
  const [value, setValue] = useState(initial?.value ?? '');

  const save = () => {
    if (!label.trim() || !value.trim()) {
      notify('항목과 내용을 모두 입력해 주세요.');
      return;
    }
    onSave(label.trim(), value.trim());
  };

  return (
    <View style={styles.form}>
      <TextInput
        style={[styles.formInput, webNoOutline]}
        underlineColorAndroid="transparent"
        value={label}
        onChangeText={setLabel}
        placeholder="항목 (예: 나이)"
        placeholderTextColor={theme.subText}
      />
      <TextInput
        style={[styles.formInput, webNoOutline]}
        underlineColorAndroid="transparent"
        value={value}
        onChangeText={setValue}
        placeholder="내용 (예: 70세)"
        placeholderTextColor={theme.subText}
        onSubmitEditing={save}
      />
      <View style={styles.rowButtons}>
        <Pressable style={styles.smallButton} onPress={onCancel}>
          <Text style={styles.smallButtonText}>취소</Text>
        </Pressable>
        <Pressable style={[styles.smallButton, styles.smallButtonPrimary]} onPress={save}>
          <Text style={[styles.smallButtonText, { color: theme.onAccent }]}>저장</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function SettingsScreen() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const {
    fontSize,
    setFontSize,
    colorBlind,
    setColorBlind,
    profile,
    addProfile,
    updateProfile,
    removeProfile,
  } = useSettings();

  const [profileOpen, setProfileOpen] = useState(true);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const askRemove = async (item: ProfileItem) => {
    if (await confirm(`'${item.label}' 정보를 삭제할까요?`, '삭제')) removeProfile(item.id);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* 글자크기 */}
      <View style={[styles.card, styles.row]}>
        <Text style={styles.label}>글자크기</Text>
        <View style={styles.stepper}>
          <Pressable
            style={[styles.circleButton, fontSize <= FONT_SIZE_MIN && { opacity: 0.4 }]}
            onPress={() => setFontSize(fontSize - 1)}
            disabled={fontSize <= FONT_SIZE_MIN}
            accessibilityLabel="글자 작게">
            <Text style={styles.circleButtonText}>-</Text>
          </Pressable>
          <Text style={styles.stepValue}>{fontSize}</Text>
          <Pressable
            style={[styles.circleButton, fontSize >= FONT_SIZE_MAX && { opacity: 0.4 }]}
            onPress={() => setFontSize(fontSize + 1)}
            disabled={fontSize >= FONT_SIZE_MAX}
            accessibilityLabel="글자 크게">
            <Text style={styles.circleButtonText}>+</Text>
          </Pressable>
        </View>
      </View>

      {/* 색약모드 */}
      <View style={[styles.card, styles.row]}>
        <Text style={styles.label}>색약모드</Text>
        <Switch
          value={colorBlind}
          onValueChange={setColorBlind}
          trackColor={{ false: theme.chip, true: theme.accent }}
          thumbColor="#FFFFFF"
          {...({ activeThumbColor: '#FFFFFF' } as object)} // 웹 전용 속성 (안 넣으면 웹에서 초록색)
          accessibilityLabel="색약모드"
          style={{ transform: [{ scale: 1.3 }], marginRight: 6 }}
        />
      </View>

      {/* 사용자 기본 정보 */}
      <View style={styles.card}>
        <Pressable
          style={styles.row}
          onPress={() => setProfileOpen(!profileOpen)}
          accessibilityRole="button"
          accessibilityLabel={profileOpen ? '사용자 기본 정보 접기' : '사용자 기본 정보 펼치기'}>
          <Text style={styles.label}>사용자 기본 정보</Text>
          <MaterialIcons name={profileOpen ? 'arrow-upward' : 'arrow-downward'} size={28} color={theme.text} />
        </Pressable>

        {profileOpen && (
          <View style={styles.profileBody}>
            {adding ? (
              <ProfileForm
                styles={styles}
                theme={theme}
                onCancel={() => setAdding(false)}
                onSave={(label, value) => {
                  addProfile(label, value);
                  setAdding(false);
                }}
              />
            ) : (
              <Pressable
                style={styles.addBox}
                onPress={() => {
                  setEditingId(null);
                  setAdding(true);
                }}
                accessibilityRole="button">
                <Text style={styles.addText}>+ 추가</Text>
              </Pressable>
            )}

            {profile.map((item, index) =>
              editingId === item.id ? (
                <ProfileForm
                  key={item.id}
                  initial={item}
                  styles={styles}
                  theme={theme}
                  onCancel={() => setEditingId(null)}
                  onSave={(label, value) => {
                    updateProfile(item.id, label, value);
                    setEditingId(null);
                  }}
                />
              ) : (
                <View key={item.id} style={[styles.profileRow, index > 0 && styles.divider]}>
                  <Text style={styles.profileText}>
                    {CIRCLED[index] ?? `${index + 1}.`} {item.label}: {item.value}
                  </Text>
                  <View style={styles.rowButtons}>
                    <Pressable
                      style={styles.smallButton}
                      onPress={() => {
                        setAdding(false);
                        setEditingId(item.id);
                      }}>
                      <Text style={styles.smallButtonText}>수정</Text>
                    </Pressable>
                    <Pressable style={styles.smallButton} onPress={() => askRemove(item)}>
                      <Text style={styles.smallButtonText}>삭제</Text>
                    </Pressable>
                  </View>
                </View>
              )
            )}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const makeStyles = (t: Palette) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: t.background },
    content: { padding: 20, gap: 20 },
    card: {
      backgroundColor: t.surface,
      borderColor: t.border,
      borderWidth: 2,
      borderRadius: 18,
      paddingHorizontal: 20,
      paddingVertical: 18,
    },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    label: { fontSize: 21, color: t.text },

    stepper: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    circleButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      borderWidth: 2,
      borderColor: t.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    circleButtonText: { fontSize: 18, color: t.text, lineHeight: 20 },
    stepValue: { fontSize: 20, color: t.text, minWidth: 26, textAlign: 'center' },

    profileBody: { marginTop: 14, gap: 12 },
    addBox: {
      borderColor: t.border,
      borderWidth: 2,
      borderStyle: 'dashed',
      borderRadius: 14,
      paddingVertical: 12,
      alignItems: 'center',
    },
    addText: { color: t.accentStrong, fontSize: 16, fontWeight: '700' },
    profileRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 4 },
    divider: { borderTopWidth: 1, borderTopColor: t.border, paddingTop: 14 },
    profileText: { flex: 1, fontSize: 18, color: t.text },

    rowButtons: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end' },
    smallButton: {
      borderWidth: 2,
      borderColor: t.border,
      backgroundColor: t.background,
      borderRadius: 18,
      paddingVertical: 6,
      paddingHorizontal: 14,
    },
    smallButtonPrimary: { backgroundColor: t.accent, borderColor: t.accent },
    smallButtonText: { fontSize: 15, color: t.subText },

    form: { gap: 8 },
    formInput: {
      borderWidth: 2,
      borderColor: t.border,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 16,
      color: t.text,
      backgroundColor: '#FFFFFF',
    },
  });
