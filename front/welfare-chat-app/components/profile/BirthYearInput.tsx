import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { webNoOutline } from '@/constants/theme';
import { useSettings, useTheme } from '@/contexts/settings-context';
import { ageFromBirthYear, MIN_BIRTH_YEAR } from '@/types/profile';

// 출생연도 입력 (숫자 4자리). 올바른 연도면 바로 onChange, 옆에 "약 N세"를 보여준다
export function BirthYearInput({ value, onChange }: { value: number | null; onChange: (year: number | null) => void }) {
  const theme = useTheme();
  const { fontSize } = useSettings();
  const [text, setText] = useState(value ? String(value) : '');
  const thisYear = new Date().getFullYear();

  const year = Number(text);
  const valid = text.length === 4 && year >= MIN_BIRTH_YEAR && year <= thisYear;

  const handleChange = (raw: string) => {
    const digits = raw.replace(/[^0-9]/g, '').slice(0, 4);
    setText(digits);
    const y = Number(digits);
    if (digits === '') onChange(null);
    else if (digits.length === 4 && y >= MIN_BIRTH_YEAR && y <= thisYear) onChange(y);
  };

  return (
    <View style={styles.row}>
      <TextInput
        value={text}
        onChangeText={handleChange}
        keyboardType="number-pad"
        inputMode="numeric"
        maxLength={4}
        placeholder="예: 1955"
        placeholderTextColor={theme.subText}
        underlineColorAndroid="transparent"
        accessibilityLabel="출생연도"
        style={[
          styles.input,
          { fontSize: fontSize + 3, color: theme.text, borderColor: theme.border, backgroundColor: theme.inputBackground },
          webNoOutline,
        ]}
      />
      <Text style={{ fontSize: fontSize + 1, color: theme.text }}>년생</Text>
      <Text style={{ fontSize, color: valid ? theme.accentStrong : theme.subText, fontWeight: valid ? '700' : '400' }}>
        {valid ? `약 ${ageFromBirthYear(year)}세` : text.length === 4 ? '연도를 확인해 주세요' : ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  input: { width: 110, minHeight: 50, borderWidth: 2, borderRadius: 12, paddingHorizontal: 12, textAlign: 'center' },
});
