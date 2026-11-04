import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Chip } from '@/components/common/Chip';
import { PROVINCES, REGIONS } from '@/constants/regions';
import { useSettings, useTheme } from '@/contexts/settings-context';

// 사는 곳 고르기: 시·도를 누르면 그 아래에 시·군·구 목록이 나온다. (세종처럼 시·군·구가 없으면 시·도만)
export function RegionPicker({
  province,
  district,
  onChange,
}: {
  province: string | null;
  district: string | null;
  onChange: (province: string | null, district: string | null) => void;
}) {
  const theme = useTheme();
  const { fontSize } = useSettings();
  const districts = province ? REGIONS[province] ?? [] : [];

  return (
    <View style={styles.wrap}>
      <Text style={[styles.step, { fontSize, color: theme.subText }]}>시·도</Text>
      <View style={styles.chips}>
        {PROVINCES.map((p) => (
          <Chip
            key={p}
            label={p}
            selected={p === province}
            onPress={() => onChange(p === province ? null : p, null)} // 다시 누르면 선택 해제
          />
        ))}
      </View>

      {districts.length > 0 && (
        <>
          <Text style={[styles.step, { fontSize, color: theme.subText }]}>시·군·구</Text>
          <View style={styles.chips}>
            {districts.map((d) => (
              <Chip key={d} label={d} selected={d === district} onPress={() => onChange(province, d === district ? null : d)} />
            ))}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  step: { fontWeight: '700' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
