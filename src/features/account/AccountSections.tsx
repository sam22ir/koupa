import Constants from 'expo-constants';
import { StyleSheet, Text, View } from 'react-native';

import { BrandLogo } from '@/src/components/ui/BrandLogo';
import { t } from '@/src/i18n';
import { colors, radii, space, typography } from '@/src/theme';

import { DeleteAccountButton } from './DeleteAccountButton';

/** Account deletion, set apart from everyday settings with a red hairline. */
export function DangerZone({
  onDelete,
  disabled,
}: {
  readonly onDelete: () => Promise<boolean>;
  readonly disabled?: boolean;
}) {
  return (
    <View style={styles.danger}>
      <Text accessibilityRole="header" style={styles.dangerTitle}>{t('profile.dangerSection')}</Text>
      <Text style={styles.dangerBody}>{t('profile.dangerBody')}</Text>
      <DeleteAccountButton onConfirm={onDelete} disabled={disabled} />
    </View>
  );
}

/** Quiet brand sign-off with the installed version, useful when contacting support. */
export function AccountFooter() {
  const version = Constants.expoConfig?.version;
  return (
    <View style={styles.footer}>
      <BrandLogo height={28} imageStyle={{ tintColor: colors.textSubtle }} />
      {version ? <Text style={styles.version}>{`${t('profile.appVersion')} ${version}`}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  danger: {
    gap: space[2],
    padding: space[4],
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    backgroundColor: colors.surface,
  },
  dangerTitle: { ...typography.bodyStrong, color: colors.danger, textAlign: 'right' },
  dangerBody: { ...typography.caption, textAlign: 'right', marginBottom: space[1] },
  footer: { alignItems: 'center', gap: space[1], paddingTop: space[2], paddingBottom: space[4] },
  version: { ...typography.caption, color: colors.textSubtle },
});
