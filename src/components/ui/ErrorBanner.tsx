import { StyleSheet, Text, View } from 'react-native';

import { formatAppError } from '@/src/i18n/errors';
import { colors, radii, space, typography } from '@/src/theme';

type Props = {
  readonly error: unknown;
};

export function ErrorBanner({ error }: Props) {
  if (!error) return null;
  return (
    <View style={styles.banner}>
      <Text style={styles.text}>{formatAppError(error)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.dangerSoft,
    borderRadius: radii.lg,
    padding: space[3],
    borderWidth: 1,
    borderColor: colors.danger,
  },
  text: {
    ...typography.caption,
    color: colors.danger,
    textAlign: 'right',
    fontWeight: '600',
  },
});
