import { StyleSheet, Text, View } from 'react-native';

import { colors, space, typography } from '@/src/theme';

type Row = { readonly label: string; readonly value: string };

type Props = {
  readonly rows: readonly Row[];
  /** Optional emphasized closing row, e.g. the total price. */
  readonly total?: Row;
};

/** Label / value pairs on one line each, for recaps and appointment details. */
export function DetailList({ rows, total }: Props) {
  return (
    <View style={styles.root}>
      {rows.map((row) => (
        <View key={row.label} style={styles.row}>
          <Text style={styles.label}>{row.label}</Text>
          <Text style={styles.value}>{row.value}</Text>
        </View>
      ))}
      {total ? (
        <View style={[styles.row, styles.totalRow]}>
          <Text style={styles.totalLabel}>{total.label}</Text>
          <Text style={styles.totalValue}>{total.value}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: space[3] },
  row: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: space[3],
  },
  label: { ...typography.body, color: colors.textMuted, textAlign: 'right' },
  value: { ...typography.bodyStrong, flexShrink: 1, textAlign: 'left' },
  totalRow: {
    marginTop: space[1],
    paddingTop: space[3],
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  totalLabel: { ...typography.bodyStrong, textAlign: 'right' },
  totalValue: { ...typography.numeric, fontSize: 18, lineHeight: 26, color: colors.primary },
});
