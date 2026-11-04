import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Chip } from '@/components/common/Chip';
import { HOUSEHOLD_TAGS, HouseholdTag } from '@/types/profile';

// 가구·경제 상황 여러 개 고르기 (해당하는 것만)
export function HouseholdPicker({ value, onChange }: { value: HouseholdTag[]; onChange: (tags: HouseholdTag[]) => void }) {
  const toggle = (tag: HouseholdTag) => onChange(value.includes(tag) ? value.filter((t) => t !== tag) : [...value, tag]);
  return (
    <View style={styles.chips}>
      {HOUSEHOLD_TAGS.map((tag) => (
        <Chip key={tag} label={tag} selected={value.includes(tag)} onPress={() => toggle(tag)} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
