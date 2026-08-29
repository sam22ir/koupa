import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Checkbox } from 'heroui-native/checkbox';
import { ControlField } from 'heroui-native/control-field';
import { FieldError } from 'heroui-native/field-error';

import { BackButton, BrandLogo, Button, Icon, type IconName } from '@/src/components/ui';
import { PRIVACY_URL, TERMS_URL } from '@/src/config/legal';
import { t } from '@/src/i18n';
import { useAppSession } from '@/src/providers/SessionProvider';
import { colors, layout, radii, space, typography } from '@/src/theme';

type Role = 'customer' | 'barber';

const POINTS: Record<Role, readonly { readonly icon: IconName; readonly label: string }[]> = {
  customer: [
    { icon: 'checkmark-done-outline', label: 'auth.welcomeCustomerPointConfirmed' },
    { icon: 'qr-code-outline', label: 'auth.welcomeCustomerPointQr' },
    { icon: 'calendar-outline', label: 'auth.welcomeCustomerPointAll' },
  ],
  barber: [
    { icon: 'time-outline', label: 'auth.welcomeBarberPointHours' },
    { icon: 'qr-code-outline', label: 'auth.welcomeBarberPointQr' },
    { icon: 'today-outline', label: 'auth.welcomeBarberPointToday' },
  ],
};

const COPY: Record<Role, {
  readonly kicker: string;
  readonly headline: string;
  readonly body: string;
  readonly pointsTitle: string;
  readonly accent: string;
}> = {
  customer: {
    kicker: 'auth.welcomeBenefitCustomer',
    headline: 'auth.roleIntroCustomerHeadline',
    body: 'auth.roleIntroCustomerBody',
    pointsTitle: 'auth.roleIntroPointsCustomer',
    accent: colors.primary,
  },
  barber: {
    kicker: 'auth.welcomeBenefitBarber',
    headline: 'auth.roleIntroBarberHeadline',
    body: 'auth.roleIntroBarberBody',
    pointsTitle: 'auth.roleIntroPointsBarber',
    accent: colors.accentText,
  },
};

/**
 * What the chosen path gives you, then consent.
 *
 * The masthead is the same lockup-plus-back row as AuthShell, so the control
 * never jumps sides between this screen and sign-up. The three points sit as a
 * plain icon list under one hairline instead of three bordered cards: they are
 * three equal promises, and boxing each one would only decorate it. No step
 * counter and no 01/02/03 markers, because the reader can count.
 */
export default function RoleIntroScreen() {
  const insets = useSafeAreaInsets();
  const { role } = useLocalSearchParams<{ role: Role }>();
  const { setPendingRole } = useAppSession();
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const continueSignup = async () => {
    if (!accepted) {
      setError(new Error(t('auth.legalRequired')));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (role) await setPendingRole(role);
      router.push({ pathname: '/(auth)/sign-up', params: { role } });
    } catch (caught) {
      setError(caught);
    } finally {
      setBusy(false);
    }
  };

  if (!role || !(role in COPY)) return null;

  const copy = COPY[role];
  const points = POINTS[role];

  return (
    <View testID="role-intro-canvas" style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Math.max(insets.top + space[4], layout.screenPaddingTop + space[3]),
            paddingBottom: space[6],
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.masthead}>
          <BrandLogo height={44} />
          <BackButton fallback="/(auth)/welcome" />
        </View>

        <View style={styles.hero}>
          <Text style={[styles.kicker, { color: copy.accent }]}>{t(copy.kicker)}</Text>
          <Text testID="role-intro-headline" style={styles.headline}>{t(copy.headline)}</Text>
          <Text style={styles.body}>{t(copy.body)}</Text>
        </View>

        <View testID="role-intro-points" style={styles.points}>
          <Text style={styles.pointsTitle}>{t(copy.pointsTitle)}</Text>
          {points.map((point) => (
            <View key={point.label} style={styles.pointRow}>
              <View style={styles.pointIcon}>
                <Icon name={point.icon} size={19} color={copy.accent} />
              </View>
              <Text style={styles.pointLabel}>{t(point.label)}</Text>
            </View>
          ))}
        </View>

        <ControlField
          testID="role-intro-consent"
          isSelected={accepted}
          onSelectedChange={(next) => {
            setAccepted(next);
            if (next) setError(null);
          }}
          isInvalid={Boolean(error)}
          style={styles.consent}
        >
          <ControlField.Indicator>
            <Checkbox />
          </ControlField.Indicator>
          <View style={styles.consentCopy}>
            <Text style={styles.consentMain}>{t('auth.roleIntroConsent')}</Text>
            <Text style={styles.consentRead}>
              {t('auth.roleIntroConsentLead')}{' '}
              <Text
                accessibilityRole="link"
                accessibilityLabel={t('auth.openTerms')}
                onPress={() => void Linking.openURL(TERMS_URL)}
                style={[styles.consentLink, { color: copy.accent }]}
              >
                {t('auth.openTerms')}
              </Text>
              {' '}{t('auth.roleIntroConsentBetween')}{' '}
              <Text
                accessibilityRole="link"
                accessibilityLabel={t('auth.openPrivacy')}
                onPress={() => void Linking.openURL(PRIVACY_URL)}
                style={[styles.consentLink, { color: copy.accent }]}
              >
                {t('auth.openPrivacy')}
              </Text>
            </Text>
            {error ? (
              <FieldError>
                {error instanceof Error ? error.message : String(error)}
              </FieldError>
            ) : null}
          </View>
        </ControlField>
      </ScrollView>

      <View style={[styles.ctaBar, { paddingBottom: Math.max(insets.bottom, space[4]) }]}>
        <Button
          testID="role-intro-continue"
          label={t('auth.roleIntroContinue')}
          onPress={() => void continueSignup()}
          loading={busy}
          style={styles.cta}
        />
      </View>
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
  masthead: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  hero: {
    marginTop: space[9],
    gap: space[2],
    alignItems: 'flex-end',
  },
  kicker: {
    ...typography.label,
    fontSize: 12.5,
    textAlign: 'right',
  },
  headline: {
    fontFamily: typography.display.fontFamily,
    fontSize: 30,
    lineHeight: 42,
    color: colors.text,
    textAlign: 'right',
    maxWidth: 340,
  },
  body: {
    ...typography.body,
    fontSize: 15.5,
    lineHeight: 26,
    color: colors.textMuted,
    textAlign: 'right',
    maxWidth: 340,
  },
  points: {
    marginTop: space[8],
    paddingTop: space[5],
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: space[4],
  },
  pointsTitle: {
    ...typography.caption,
    fontSize: 12.5,
    color: colors.textMuted,
    textAlign: 'right',
    marginBottom: space[1],
  },
  pointRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: space[3],
  },
  pointIcon: {
    width: 28,
    alignItems: 'center',
  },
  pointLabel: {
    ...typography.body,
    fontSize: 15,
    lineHeight: 24,
    color: colors.text,
    textAlign: 'right',
    flex: 1,
  },
  consent: {
    marginTop: space[8],
    padding: space[4],
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    gap: space[3],
  },
  consentCopy: {
    flex: 1,
    gap: space[1],
  },
  consentMain: {
    ...typography.body,
    fontSize: 14,
    lineHeight: 22,
    color: colors.text,
    textAlign: 'right',
  },
  consentRead: {
    ...typography.caption,
    fontSize: 12.5,
    lineHeight: 20,
    color: colors.textMuted,
    textAlign: 'right',
  },
  consentLink: {
    fontWeight: '600',
  },
  ctaBar: {
    paddingHorizontal: layout.screenPaddingX,
    paddingTop: space[3],
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  cta: {
    minHeight: 54,
  },
});
