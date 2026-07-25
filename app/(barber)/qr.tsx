import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import { ScreenHeader } from '@/src/components/molecules/ScreenHeader';
import { Screen } from '@/src/components/organisms/Screen';
import { copy } from '@/src/data/copy';
import { useSession } from '@/src/hooks/useSession';
import { buildBarberCheckInPayload } from '@/src/qr';
import { colors, radii, spacing, typography } from '@/src/theme';

export default function BarberQrScreen() {
  const { profile } = useSession();
  const payload = profile?.id ? buildBarberCheckInPayload(profile.id) : '';

  return (
    <Screen>
      <ScreenHeader onBack={() => (router.canGoBack() ? router.back() : router.replace('/(barber)/home'))} />
      <Text style={styles.title}>{copy.barber.qrTitle}</Text>
      <Text style={styles.body}>{copy.barber.qrBody}</Text>
      <View style={styles.card}>
        {payload ? <QRCode value={payload} size={220} backgroundColor={colors.surface} color={colors.charcoal} /> : null}
        {profile?.name ? <Text style={styles.name}>{profile.name}</Text> : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.charcoal, fontFamily: typography.fontFamily.bold, fontSize: typography.size.title, textAlign: 'right' },
  body: {
    color: colors.muted,
    fontFamily: typography.fontFamily.regular,
    fontSize: typography.size.body,
    lineHeight: typography.line.body,
    textAlign: 'right',
  },
  card: {
    marginTop: spacing.lg,
    alignSelf: 'center',
    alignItems: 'center',
    gap: spacing.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radii.xl,
    padding: spacing.xl,
  },
  name: { color: colors.charcoal, fontFamily: typography.fontFamily.semiBold, fontSize: typography.size.label, textAlign: 'center' },
});
