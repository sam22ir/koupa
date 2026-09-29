import { StyleSheet, View } from 'react-native';
import { Typography } from 'heroui-native/text';

import { Button } from './Button';
import { Icon, type IconName } from './Icon';
import { colors, space } from '@/src/theme';

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
      <Typography type="h5" align="center">{title}</Typography>
      {body ? <Typography type="body" color="muted" align="center">{body}</Typography> : null}
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
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});