import { useState } from 'react';
import { router } from 'expo-router';
import { Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Typography } from 'heroui-native/text';

import { AuthHeader, Icon } from '@/src/components/ui';
import { PRIVACY_URL, TERMS_URL } from '@/src/config/legal';
import { t } from '@/src/i18n';
import { useAppSession } from '@/src/providers/SessionProvider';
import { colors, layout, radii, space, typography } from '@/src/theme';

/**
 * Choose your path.
 *
 * Two full-width role choices with matching card treatments. Their copy and
 * trust cues explain each path; the permanent role commitment is stated before
 * either option can be selected.
 */
export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const { startGuestBrowsing } = useAppSession();
  const [customerHovered, setCustomerHovered] = useState(false);
  const [barberHovered, setBarberHovered] = useState(false);

  const openBarberSignup = () => {
    router.push({ pathname: '/(auth)/sign-up', params: { role: 'barber' } });
  };

  // Customers need no account to look around; signup waits for the first booking.
  const browseAsGuest = () => {
    startGuestBrowsing();
    router.replace('/');
  };

  return (
    <View testID="welcome-canvas" style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          Platform.OS === 'web' && styles.contentWeb,
          {
            paddingTop: Math.max(insets.top + space[4], layout.screenPaddingTop + space[3]),
            paddingBottom: Math.max(insets.bottom + space[5], space[8]),
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <AuthHeader showBack={false} />

        <View style={styles.heading}>
          <Typography type="h3" align="end">{t('auth.chooseRole')}</Typography>
        </View>

        <View style={styles.choices}>
          <Pressable
            testID="welcome-door-customer"
            accessibilityRole="button"
            accessibilityLabel={`${t('auth.welcomeBrowseTitle')}. ${t('auth.welcomeBrowseSub')}`}
            onPress={browseAsGuest}
            onHoverIn={() => setCustomerHovered(true)}
            onHoverOut={() => setCustomerHovered(false)}
            style={({ pressed }) => [
              styles.roleChoice,
              customerHovered && styles.roleChoiceHovered,
              pressed && styles.doorPressed,
            ]}
          >
            <Text style={[styles.kicker, { color: colors.primary }]}>
              {t('auth.welcomeBenefitCustomer')}
            </Text>

            <View style={styles.doorTitleRow}>
              <Text style={styles.doorTitle}>{t('auth.welcomeBrowseTitle')}</Text>
              <View style={styles.chevronBadge}>
                <Icon name="chevron-back" size={16} color={colors.primary} />
              </View>
            </View>
            <Text style={styles.doorSub}>{t('auth.welcomeBrowseSub')}</Text>
            <View style={styles.customerProof}>
              <Icon name="checkmark-circle" size={16} color={colors.primary} />
              <Text style={styles.customerProofText}>{t('auth.welcomeBrowseFoot')}</Text>
            </View>
          </Pressable>

          <Pressable
            testID="welcome-door-barber"
            accessibilityRole="button"
            accessibilityLabel={`${t('auth.welcomeDoorBarber')}. ${t('auth.welcomeDoorBarberSub')}`}
            onPress={openBarberSignup}
            onHoverIn={() => setBarberHovered(true)}
            onHoverOut={() => setBarberHovered(false)}
            style={({ pressed }) => [
              styles.roleChoice,
              barberHovered && styles.roleChoiceHovered,
              pressed && styles.doorPressed,
            ]}
          >
            <Text style={[styles.kicker, { color: colors.primary }]}>
              {t('auth.welcomeBenefitBarber')}
            </Text>
            <View style={styles.doorTitleRow}>
              <Text style={styles.doorTitle}>{t('auth.welcomeDoorBarber')}</Text>
              <View style={styles.chevronBadge}>
                <Icon name="chevron-back" size={16} color={colors.primary} />
              </View>
            </View>
            <Text style={styles.doorSub}>{t('auth.welcomeDoorBarberSub')}</Text>
            <View style={styles.customerProof}>
              <Icon name="checkmark-circle" size={16} color={colors.primary} />
              <Text style={styles.customerProofText}>{t('auth.welcomeBarberFoot')}</Text>
            </View>
            <Text style={styles.roleHint}>{t('auth.roleHint')}</Text>
          </Pressable>
        </View>

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
  heading: {
    marginTop: space[4],
    gap: space[2],
    alignItems: 'flex-end',
  },
  choices: {
    gap: space[3],
    marginTop: space[5],
  },
  roleChoice: {
    gap: space[2],
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii['2xl'],
    padding: space[5],
  },
  roleChoiceHovered: {
    borderColor: colors.primary,
  },
  doorPressed: {
    opacity: 0.76,
  },
  chevronBadge: {
    width: 30,
    height: 30,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  kicker: {
    ...typography.label,
    fontSize: 12.5,
  },
  doorTitleRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  doorTitle: {
    fontFamily: typography.display.fontFamily,
    fontSize: 24,
    lineHeight: 36,
    color: colors.text,
    textAlign: 'right',
  },
  doorSub: {
    ...typography.caption,
    fontSize: 14,
    lineHeight: 22,
    color: colors.textMuted,
    textAlign: 'right',
  },
  customerProof: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: space[2],
    marginTop: space[1],
  },
  customerProofText: {
    ...typography.caption,
    flex: 1,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'right',
  },
  roleHint: {
    ...typography.caption,
    fontSize: 13,
    lineHeight: 20,
    color: colors.textMuted,
    textAlign: 'right',
  },
  contentWeb: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
  },
  footer: {
    marginTop: space[6],
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
