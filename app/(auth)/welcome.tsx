import { router } from 'expo-router';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Typography } from 'heroui-native/text';

import { BrandLogo, Card, Chip, Icon } from '@/src/components/ui';
import { PRIVACY_URL, TERMS_URL } from '@/src/config/legal';
import { t } from '@/src/i18n';
import { colors, layout, radii, space, typography } from '@/src/theme';

/**
 * Choose your path.
 *
 * The two doors are deliberately unequal. Most people arriving here are
 * customers, so the customer door carries the weight and answers the question
 * the chooser is actually asking ("what do I get?") by showing a real booking
 * card built from the same HeroUI components Home ships. The barber door is a
 * quiet row under one hairline. Two identical cards would have said "we have
 * two features"; this says "this is probably you, and this is them".
 */
export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();

  const openRoleIntro = (role: 'customer' | 'barber') => {
    router.push({ pathname: '/(auth)/role-intro', params: { role } });
  };

  return (
    <View testID="welcome-canvas" style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Math.max(insets.top + space[4], layout.screenPaddingTop + space[3]),
            paddingBottom: Math.max(insets.bottom + space[5], space[8]),
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.brand}>
          <BrandLogo height={44} />
        </View>

        <View style={styles.heading}>
          <Typography type="h3" align="end">{t('auth.chooseRole')}</Typography>
          <Typography type="body" color="muted" align="end">{t('auth.roleHint')}</Typography>
        </View>

        {/* Customer door - the majority path, shown at full weight. */}
        <Pressable
          testID="welcome-door-customer"
          accessibilityRole="button"
          accessibilityLabel={t('auth.welcomeDoorCustomer')}
          onPress={() => openRoleIntro('customer')}
          style={({ pressed }) => [styles.door, pressed && styles.doorPressed]}
        >
          <Text style={[styles.kicker, { color: colors.primary }]}>
            {t('auth.welcomeBenefitCustomer')}
          </Text>

          <View style={styles.doorTitleRow}>
            <Text style={styles.doorTitle}>{t('auth.welcomeDoorCustomer')}</Text>
            <Icon name="chevron-back" size={22} color={colors.primary} />
          </View>
          <Text style={styles.doorSub}>{t('auth.welcomeDoorCustomerSub')}</Text>

          {/* Real component preview, not a mock: same Card and Chip as Home. */}
          <Card style={styles.preview} elevated>
            <View style={styles.previewTop}>
              <Typography type="body" weight="semibold" align="end" numberOfLines={1}>
                {t('auth.welcomePreviewShop')}
              </Typography>
              <Chip label={t('auth.welcomePreviewConfirmed')} tone="primary" />
            </View>
            <Text style={styles.previewMeta}>{t('auth.welcomePreviewCustomerMeta')}</Text>
            <View style={styles.previewRule} />
            <View style={styles.previewBottom}>
              <Text style={styles.previewService}>{t('auth.welcomePreviewCustomerService')}</Text>
              <Text style={styles.previewPrice}>{t('auth.welcomePreviewCustomerPrice')}</Text>
            </View>
          </Card>

          <Text style={styles.previewFoot}>{t('auth.welcomeCustomerFoot')}</Text>
        </Pressable>

        <View style={styles.hairline} />

        {/* Barber door - same affordance, less volume. */}
        <Pressable
          testID="welcome-door-barber"
          accessibilityRole="button"
          accessibilityLabel={t('auth.welcomeDoorBarber')}
          onPress={() => openRoleIntro('barber')}
          style={({ pressed }) => [styles.door, styles.barberDoor, pressed && styles.doorPressed]}
        >
          <Text style={[styles.kicker, styles.kickerBarber]}>
            {t('auth.welcomeBenefitBarber')}
          </Text>
          <View style={styles.doorTitleRow}>
            <Text style={styles.doorTitle}>{t('auth.welcomeDoorBarber')}</Text>
            <Icon name="chevron-back" size={22} color={colors.accentText} />
          </View>
          <Text style={styles.doorSub}>{t('auth.welcomeDoorBarberSub')}</Text>
        </Pressable>

        {/* Existing account bridge */}
        <View style={styles.footer}>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={t('auth.existingAccount')}
            onPress={() => router.push({ pathname: '/(auth)/sign-in', params: {} })}
            style={({ pressed }) => [styles.signIn, pressed && styles.signInPressed]}
          >
            <Text style={styles.signInPrompt}>{t('auth.existingAccountPrompt')}</Text>
            <Text style={styles.signInAction}>{t('auth.signIn')}</Text>
          </Pressable>

          <View style={styles.legal}>
            <Text style={styles.legalMain}>{t('auth.welcomeLegal')}</Text>
            <View style={styles.legalLinks}>
              <Text
                accessibilityRole="link"
                accessibilityLabel={t('auth.openTerms')}
                style={styles.legalAnchor}
                onPress={() => void Linking.openURL(TERMS_URL)}
              >
                {t('auth.openTerms')}
              </Text>
              <Text style={styles.legalSep}>/</Text>
              <Text
                accessibilityRole="link"
                accessibilityLabel={t('auth.openPrivacy')}
                style={styles.legalAnchor}
                onPress={() => void Linking.openURL(PRIVACY_URL)}
              >
                {t('auth.openPrivacy')}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: layout.screenPaddingX,
  },
  brand: {
    alignSelf: 'flex-end',
  },
  heading: {
    marginTop: space[9],
    gap: space[1],
    alignItems: 'flex-end',
  },
  door: {
    marginTop: space[7],
    gap: space[2],
  },
  doorPressed: {
    opacity: 0.6,
  },
  barberDoor: {
    marginTop: space[6],
    marginBottom: space[2],
  },
  kicker: {
    ...typography.label,
    fontSize: 12.5,
  },
  kickerBarber: {
    color: colors.accentText,
  },
  doorTitleRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  doorTitle: {
    fontFamily: typography.display.fontFamily,
    fontSize: 26,
    lineHeight: 38,
    color: colors.text,
    textAlign: 'right',
  },
  doorSub: {
    ...typography.body,
    fontSize: 15,
    lineHeight: 24,
    color: colors.textMuted,
    textAlign: 'right',
  },
  preview: {
    marginTop: space[4],
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    gap: space[2],
  },
  previewTop: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: space[3],
  },
  previewMeta: {
    ...typography.caption,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'right',
  },
  previewRule: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: space[1],
  },
  previewBottom: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: space[3],
  },
  previewService: {
    ...typography.body,
    color: colors.text,
    textAlign: 'right',
  },
  previewPrice: {
    fontFamily: typography.label.fontFamily,
    fontSize: 17,
    color: colors.primary,
    textAlign: 'left',
  },
  previewFoot: {
    ...typography.caption,
    fontSize: 12.5,
    color: colors.textMuted,
    textAlign: 'right',
    marginTop: space[2],
  },
  hairline: {
    height: 1,
    backgroundColor: colors.border,
    marginTop: space[8],
  },
  footer: {
    marginTop: space[9],
    gap: space[4],
  },
  signIn: {
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    alignItems: 'center',
    gap: space[2],
    minHeight: 44,
  },
  signInPressed: {
    opacity: 0.55,
  },
  signInPrompt: {
    ...typography.caption,
    fontSize: 13.5,
    color: colors.textMuted,
  },
  signInAction: {
    ...typography.label,
    fontSize: 13.5,
    color: colors.primary,
  },
  legal: {
    alignItems: 'center',
    gap: space[1],
  },
  legalMain: {
    ...typography.caption,
    fontSize: 11.5,
    color: colors.textMuted,
    textAlign: 'center',
  },
  legalLinks: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: space[2],
  },
  legalAnchor: {
    ...typography.caption,
    fontSize: 11.5,
    color: colors.primary,
    fontWeight: '600',
  },
  legalSep: {
    ...typography.caption,
    fontSize: 11.5,
    color: colors.border,
  },
});
