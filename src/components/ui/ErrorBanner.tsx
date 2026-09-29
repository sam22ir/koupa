import { StyleSheet, Text, View } from 'react-native';

import { formatAppError } from '@/src/i18n/errors';
import { colors, radii, space, typography } from '@/src/theme';

import { Icon } from './Icon';

type Props = {
  readonly error: unknown;
};

export function ErrorBanner({ error }: Props) {
  if (!error) return null;
  return (
    <View accessibilityRole="alert" style={styles.root}>
      <View style={styles.icon}>
        <Icon name="alert-circle-outline" size={20} color={colors.danger} />
      </View>
      <Text style={styles.message}>{formatAppError(error)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    gap: space[3],
    padding: space[3],
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    borderRadius: radii.md,
    backgroundColor: colors.dangerSoft,
  },
  icon: {
    width: 24,
    alignItems: 'center',
    paddingTop: 1,
  },
  message: {
    ...typography.body,
    flex: 1,
    fontSize: 14,
    lineHeight: 22,
    color: colors.danger,
    textAlign: 'right',
  },
});
