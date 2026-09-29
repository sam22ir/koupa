import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radii, space, typography } from "@/src/theme";

type Slot = {
  readonly key: string;
  readonly label: string;
  readonly disabled?: boolean;
};

type Props = {
  readonly slots: readonly Slot[];
  readonly selected: string;
  readonly onSelect: (key: string) => void;
};

/** Three-column grid of bookable times. The chosen time gets a teal outline. */
const COLUMNS = 3;

export function TimeSlotGrid({ slots, selected, onSelect }: Props) {
  const rows: (readonly Slot[])[] = [];
  for (let index = 0; index < slots.length; index += COLUMNS)
    rows.push(slots.slice(index, index + COLUMNS));
  return (
    <View style={styles.grid}>
      {rows.map((row) => (
        <View key={row[0].key} style={styles.row}>
          {row.map((slot) => {
            const on = slot.key === selected;
            return (
              <Pressable
                key={slot.key}
                accessibilityRole="button"
                accessibilityLabel={slot.label}
                accessibilityState={{ selected: on, disabled: slot.disabled }}
                disabled={slot.disabled}
                onPress={() => onSelect(slot.key)}
                style={({ pressed }) => [
                  styles.cell,
                  on && styles.cellOn,
                  slot.disabled && styles.cellOff,
                  pressed && !on && styles.cellPressed,
                ]}
              >
                <Text
                  style={[
                    styles.label,
                    on && styles.labelOn,
                    slot.disabled && styles.labelOff,
                  ]}
                >
                  {slot.label}
                </Text>
              </Pressable>
            );
          })}
          {/* Keep a short last row aligned to the same columns. */}
          {Array.from({ length: COLUMNS - row.length }, (_, index) => (
            <View key={`spacer-${index}`} style={styles.spacer} />
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { gap: space[2] },
  row: { flexDirection: "row-reverse", gap: space[2] },
  spacer: { flex: 1 },
  cell: {
    flex: 1,
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.md - 2,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  cellOn: {
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  cellOff: {
    borderColor: colors.borderSubtle,
    backgroundColor: "transparent",
  },
  cellPressed: { backgroundColor: colors.background },
  label: { ...typography.numeric, fontSize: 14 },
  labelOn: { color: colors.primarySoftText },
  labelOff: { color: colors.textSubtle, textDecorationLine: "line-through" },
});
