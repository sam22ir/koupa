import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { BrandLogo, Button, Screen, Stage } from '@/src/components/ui';
import { t } from '@/src/i18n';
import { welcomeActions } from '@/src/navigation/welcomeActions';
import { colors, elevation, layout, radii, space, typography } from '@/src/theme';

export default function WelcomeScreen() {
  return (
    <Screen padded={false} scroll contentStyle={styles.screen}>
      <Stage decoration="subtle">
        <View style={styles.logoWrap}>
          <BrandLogo
            variant="full"
            height={82}
            imageStyle={styles.logoImage}
          />
          <View style={styles.logoAccent} />
        </View>
        <Text style={styles.title}>{t('auth.welcomeTitle')}</Text>
        <Text style={styles.body}>{t('auth.welcomeBody')}</Text>
      </Stage>
      <View style={styles.panel}>
        {welcomeActions.map((action) => (
          <Button
            key={action.route}
            label={t(action.labelKey)}
            variant={action.variant}
            onPress={() => router.push(action.route)}
          />
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingTop: 0,
    gap: 0,
  },
  logoWrap: {
    alignItems: 'center',
    gap: space[3],
    marginBottom: space[4],
  },
  logoImage: {
    tintColor: colors.onPrimary,
    opacity: 0.96,
  },
  logoAccent: {
    width: space[8],
    height: 3,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
  },
  title: {
    ...typography.display,
    color: colors.onPrimary,
    textAlign: 'right',
    lineHeight: 38,
  },
  body: {
    ...typography.body,
    color: colors.onPrimaryMuted,
    textAlign: 'right',
    lineHeight: 24,
  },
  panel: {
    marginTop: -space[6],
    marginHorizontal: layout.screenPaddingX,
    marginBottom: space[2],
    gap: space[1],
    backgroundColor: colors.surface,
    borderRadius: radii['2xl'],
    borderWidth: 1,
    borderColor: colors.border,
    padding: space[4],
    ...elevation.card,
  },
});
