import { StyleSheet, Text, View } from 'react-native';

import { colors, space, typography } from '@/src/theme';

import { Button } from './Button';
import { Icon, type IconName } from './Icon';

type Props = {
  readonly title: string;
  readonly body?: string;
  readonly actionLabel?: string;
  readonly onAction?: () => void;
  readonly icon?: IconName;
};

export function EmptyState({
  title,
  body,
  actionLabel,
  onAction,
  icon = 'file-tray-outline',
}: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.iconWrap}>
        <Icon name={icon} size={28} color={colors.primary} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {body ? <Text style={styles.body}>{body}</Text> : null}
      {actionLabel && onAction ? <Button label={actionLabel} onPress={onAction} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: space[3],
    alignItems: 'center',
    paddingVertical: space[8],
    paddingHorizontal: space[4],
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.titleSm,
    textAlign: 'center',
  },
  body: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
