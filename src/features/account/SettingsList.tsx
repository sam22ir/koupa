import { Children, Fragment, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon, type IconName } from '@/src/components/ui/Icon';
import { colors, elevation, radii, space, typography } from '@/src/theme';

/** A titled group of settings rows in one white card. */
export function SettingsGroup({ title, children }: { readonly title?: string; readonly children: ReactNode }) {
  const rows = Children.toArray(children).filter(Boolean);
  return (
    <View style={styles.group}>
      {title ? <Text accessibilityRole="header" style={styles.groupTitle}>{title}</Text> : null}
      <View style={styles.card}>
        {rows.map((row, index) => (
          <Fragment key={index}>
            {index ? <View style={styles.divider} /> : null}
            {row}
          </Fragment>
        ))}
      </View>
    </View>
  );
}

type RowProps = {
  readonly icon: IconName;
  readonly label: string;
  /** Read-only value shown on the far edge (e.g. an email). Rows with a value and no onPress are static. */
  readonly value?: string;
  readonly onPress?: () => void;
  /** Opens outside the app: shows an external-link mark instead of a chevron. */
  readonly external?: boolean;
  readonly tone?: 'default' | 'danger';
  readonly disabled?: boolean;
};

export function SettingsRow({ icon, label, value, onPress, external = false, tone = 'default', disabled }: RowProps) {
  const danger = tone === 'danger';
  const content = (
    <>
      <View style={[styles.iconTile, danger && styles.iconTileDanger]}>
        <Icon name={icon} size={19} color={danger ? colors.danger : colors.primarySoftText} />
      </View>
      <View style={styles.copy}>
        <Text style={[styles.label, danger && styles.labelDanger]}>{label}</Text>
        {value ? <Text selectable numberOfLines={1} style={styles.value}>{value}</Text> : null}
      </View>
      {onPress ? (
        <Icon name={external ? 'open-outline' : 'chevron-back'} size={17} color={colors.textSubtle} />
      ) : null}
    </>
  );

  if (!onPress) return <View style={styles.row}>{content}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed, disabled && styles.rowDisabled]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  group: { gap: space[2] },
  groupTitle: { ...typography.label, color: colors.textMuted, textAlign: 'right', paddingHorizontal: space[1] },
  card: { borderRadius: radii.lg, backgroundColor: colors.surface, overflow: 'hidden', ...elevation.card },
  // Inset past the icon tile on the reading (right) edge.
  divider: { height: 1, marginLeft: space[4], marginRight: space[4] + 36 + space[3], backgroundColor: colors.borderSubtle },
  row: {
    minHeight: 60,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: space[3],
    paddingHorizontal: space[4],
    paddingVertical: space[2],
  },
  rowPressed: { backgroundColor: colors.background },
  rowDisabled: { opacity: 0.5 },
  iconTile: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  iconTileDanger: { backgroundColor: colors.dangerSoft },
  copy: { flex: 1, minWidth: 0, alignItems: 'flex-end', gap: 1 },
  label: { ...typography.bodyStrong, textAlign: 'right' },
  labelDanger: { color: colors.danger },
  value: { ...typography.caption, textAlign: 'right' },
});
