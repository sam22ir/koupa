import { router } from 'expo-router';
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, BrandLogo } from '@/src/components/ui';
import { t } from '@/src/i18n';
import { colors, layout, space, typography } from '@/src/theme';
import { useEntrance } from '@/src/utils/motion';

/**
 * The opening statement.
 *
 * The lockup is the subject here, not furniture in a corner: it is sized from
 * the viewport, sits on the optical centre rather than the geometric one, and
 * is the only thing that moves. It arrives with a short scale-up that overshoots
 * by three percent and settles, which reads as the mark coming into focus
 * instead of a box flying in. The three beats rise 180 ms behind it as one
 * group, so the eye lands on the brand and then finds the sentence.
 *
 * Everything is centred because a dominant mark with right-aligned type below it
 * looks accidental. This is the one screen in the funnel that is a poster; the
 * screens after it go back to the reading edge.
 */
export default function IntroScreen() {
  const insets = useSafeAreaInsets();
  const { height: viewportHeight } = useWindowDimensions();

  const mark = useEntrance(0, 520);
  const message = useEntrance(180, 380);

  const logoSize = Math.round(Math.min(156, Math.max(104, viewportHeight * 0.2)));

  const markStyle = {
    opacity: mark,
    transform: [
      {
        scale: mark.interpolate({
          inputRange: [0, 0.72, 1],
          outputRange: [0.84, 1.035, 1],
        }),
      },
    ],
  };

  const messageStyle = {
    opacity: message,
    transform: [
      {
        translateY: message.interpolate({
          inputRange: [0, 1],
          outputRange: [space[4], 0],
        }),
      },
    ],
  };

  return (
    <View testID="intro-canvas" style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Math.max(insets.top + space[4], layout.screenPaddingTop),
            paddingBottom: Math.max(insets.bottom + space[5], space[8]),
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.spaceAbove} />

        <Animated.View style={[styles.brand, markStyle]}>
          <BrandLogo height={logoSize} />
        </Animated.View>

        <Animated.View style={[styles.message, messageStyle]}>
          <Text testID="intro-beat-find" style={styles.beat}>
            {t('auth.introBeatFind')}
          </Text>
          <Text testID="intro-beat-book" style={styles.beat}>
            {t('auth.introBeatBook')}
          </Text>
          <Text testID="intro-beat-track" style={[styles.beat, styles.beatAccent]}>
            {t('auth.introBeatTrack')}
          </Text>
          <Text testID="intro-body" style={styles.body}>
            {t('auth.introBody')}
          </Text>
        </Animated.View>

        {/* Bottom-heavy: the mark sits above the middle where the eye rests. */}
        <View style={styles.spaceBelow} />

        <View style={styles.actions}>
          <Button
            testID="intro-start"
            label={t('auth.welcomeStart')}
            onPress={() => router.push({ pathname: '/(auth)/welcome', params: {} })}
            style={styles.cta}
          />
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={t('auth.existingAccount')}
            onPress={() => router.push({ pathname: '/(auth)/sign-in', params: {} })}
            style={({ pressed }) => [styles.signIn, pressed && styles.signInPressed]}
          >
            <Text style={styles.signInPrompt}>{t('auth.existingAccountPrompt')}</Text>
            <Text style={styles.signInAction}>{t('auth.signIn')}</Text>
          </Pressable>
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
    flexGrow: 1,
    paddingHorizontal: layout.screenPaddingX,
  },
  spaceAbove: {
    flex: 3,
    minHeight: space[8],
  },
  spaceBelow: {
    flex: 4,
    minHeight: space[10],
  },
  brand: {
    alignSelf: 'center',
  },
  message: {
    alignItems: 'center',
    marginTop: space[7],
  },
  beat: {
    fontFamily: typography.display.fontFamily,
    fontSize: 42,
    lineHeight: 54,
    color: colors.text,
    textAlign: 'center',
  },
  beatAccent: {
    color: colors.primary,
  },
  body: {
    ...typography.body,
    fontSize: 16,
    lineHeight: 28,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: space[4],
    maxWidth: 330,
  },
  actions: {
    gap: space[4],
  },
  cta: {
    minHeight: 54,
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
});
