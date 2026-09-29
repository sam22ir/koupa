import { type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/src/components/ui/Avatar';
import { Icon } from '@/src/components/ui/Icon';
import { colors, layout, radii, space, typography } from '@/src/theme';
import { initialsFromName } from '@/src/utils/initials';

type Props = {
  readonly title: string;
  readonly name: string;
  readonly lines: readonly string[];
  readonly role: string;
  /** Optional status beside the role, e.g. whether a barber is published. */
  readonly status?: ReactNode;
  readonly editLabel?: string;
  readonly onEdit?: () => void;
};

/** Teal account header: who is signed in, in which role. Grouped settings start below it. */
export function AccountHeader({ title, name, lines, role, status, editLabel, onEdit }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View
      testID="account-header"
      style={[styles.root, { paddingTop: Math.max(insets.top, space[3]) + space[2] }]}
    >
      <Text accessibilityRole="header" style={styles.title}>{title}</Text>
      <View style={styles.identity}>
        <Avatar initials={initialsFromName(name || '؟')} size={64} tone="stage" />
        <View style={styles.copy}>
          <Text numberOfLines={2} style={styles.name}>{name}</Text>
          {lines.map((line) => (
            <Text key={line} numberOfLines={1} style={styles.line}>{line}</Text>
          ))}
          <View style={styles.badges}>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>{role}</Text>
            </View>
            {status}
          </View>
        </View>
        {onEdit && editLabel ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={editLabel}
            onPress={onEdit}
            hitSlop={6}
            style={({ pressed }) => [styles.edit, pressed && styles.editPressed]}
          >
            <Icon name="create-outline" size={20} color={colors.onPrimary} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: space[5],
    paddingHorizontal: layout.screenPaddingX,
    paddingBottom: space[6],
    backgroundColor: colors.stage,
    borderBottomLeftRadius: radii['3xl'],
    borderBottomRightRadius: radii['3xl'],
  },
  title: { ...typography.label, color: colors.onPrimaryMuted, textAlign: 'right' },
  identity: { flexDirection: 'row-reverse', alignItems: 'center', gap: space[4] },
  copy: { flex: 1, minWidth: 0, alignItems: 'flex-end', gap: 2 },
  name: { ...typography.title, color: colors.onPrimary, textAlign: 'right' },
  line: { ...typography.caption, color: colors.onPrimaryMuted, textAlign: 'right' },
  badges: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: space[2], marginTop: space[2] },
  roleBadge: {
    minHeight: 26,
    justifyContent: 'center',
    paddingHorizontal: space[3],
    borderRadius: radii.pill,
    backgroundColor: colors.stageOverlay,
  },
  roleText: { ...typography.label, fontSize: 12, lineHeight: 18, color: colors.onPrimary },
  edit: {
    width: 44,
    height: 44,
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.stageBorder,
    backgroundColor: colors.stageOverlay,
  },
  editPressed: { opacity: 0.75 },
});
