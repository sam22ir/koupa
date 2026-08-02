import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Field } from '@/src/components/ui';
import { colors, radii, space, typography } from '@/src/theme';

function timeDate(value: string): Date {
  const [hour, minute] = value.split(':').map(Number);
  const date = new Date();
  date.setHours(hour || 0, minute || 0, 0, 0);
  return date;
}

function formatTime(value: Date): string {
  return `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`;
}

export function TimeField({
  label,
  value,
  onChange,
}: {
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
}) {
  const [show, setShow] = useState(false);
  if (Platform.OS === 'web') {
    return (
      <Field
        label={label}
        accessibilityLabel={label}
        value={value}
        placeholder="09:00"
        onChangeText={onChange}
        inputMode="numeric"
      />
    );
  }
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value}`}
        onPress={() => setShow(true)}
        style={styles.control}
      >
        <Text style={styles.value}>{value}</Text>
      </Pressable>
      {show ? (
        <DateTimePicker
          mode="time"
          value={timeDate(value)}
          onChange={(_, next) => {
            setShow(false);
            if (next) onChange(formatTime(next));
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space[2], flex: 1 },
  label: { ...typography.label, textAlign: 'right' },
  control: {
    minHeight: 48,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    paddingHorizontal: space[4],
  },
  value: { ...typography.body, textAlign: 'right', fontVariant: ['tabular-nums'] },
});
