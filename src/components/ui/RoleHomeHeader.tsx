import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/src/components/ui/Avatar';
import { Icon } from '@/src/components/ui/Icon';
import { colors, layout, radii, space, typography } from '@/src/theme';
import { initialsFromName } from '@/src/utils/initials';

type Props = {
  readonly name: string;
  readonly greeting: string;
  readonly onProfile: () => void;
  readonly onNotifications: () => void;
  readonly profileLabel: string;
  readonly notificationsLabel: string;
  readonly quickAction?: {
    readonly label: string;
    readonly icon: 'qr-code-outline' | 'add-outline';
    readonly onPress: () => void;
  };
  readonly children?: ReactNode;
  /** Leave room for the first body card to float over the header's lower edge. */
  readonly overlap?: boolean;
};

/**
 * Bold teal header for Home and Today. Runs under the status bar (use it inside
 * `<Screen bleedTop>`) and pads itself with the safe-area inset.
 */

export function RoleHomeHeader({
  name,
  greeting,
  onProfile,
  onNotifications,
  profileLabel,
  notificationsLabel,
  quickAction,
  children,
  overlap = false,
}: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View
      testID="role-home-header"
      style={[
        styles.header,
        {
          paddingTop: Math.max(insets.top, space[3]) + space[2],
          paddingBottom: overlap ? space[6] - layout.stageBodyOverlap : space[6],
        },
      ]}
    >
      <View style={styles.identityRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={profileLabel}
          onPress={onProfile}
          style={({ pressed }) => [styles.avatarButton, pressed && styles.pressed]}
        >
          <Avatar initials={initialsFromName(name)} size={48} tone="stage" />
        </Pressable>
        <View style={styles.identityCopy}>
          <Text style={styles.greeting}>{greeting}</Text>
          <Text numberOfLines={1} style={styles.name}>{name}</Text>
        </View>
        <View style={styles.actions}>
          {quickAction ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={quickAction.label}
              onPress={quickAction.onPress}
              style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}
            >
              <Icon name={quickAction.icon} size={21} color={colors.onPrimary} />
            </Pressable>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={notificationsLabel}
            onPress={onNotifications}
            style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}
          >
            <Icon name="notifications-outline" size={21} color={colors.onPrimary} />
          </Pressable>
        </View>
      </View>
      {children ? <View style={styles.content}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: space[5],
    backgroundColor: colors.stage,
    paddingHorizontal: layout.screenPaddingX,
    borderBottomLeftRadius: radii['3xl'],
    borderBottomRightRadius: radii['3xl'],
  },
  identityRow: {
    minHeight: 52,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: space[3],
  },
  avatarButton: { borderRadius: radii.lg },
  identityCopy: { minWidth: 0, flex: 1, alignItems: 'flex-end', gap: 2 },
  greeting: { ...typography.label, color: colors.onPrimaryMuted, textAlign: 'right' },
  name: { ...typography.title, color: colors.onPrimary, textAlign: 'right' },
  actions: { flexDirection: 'row-reverse', alignItems: 'center', gap: space[2] },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.stageOverlay,
  },
  pressed: { opacity: 0.78 },
  content: { gap: space[3] },
});
