import { useEffect, useState } from 'react';
import { Image, Platform, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { colors, teal } from '@/src/theme/colors';

import { isSplashHidden, subscribeSplashHidden } from './splash';

const SPLASH_IMAGE = require('../../assets/brand/splash-screen.png');

/** Same width the native splash draws the image at (`imageWidth` in app.config.js). */
export const SPLASH_LOGO_SIZE = 280;

/**
 * One short brand moment played over the app after the native splash hides.
 * The first frame is the native splash, so the hand-off has no jump; then the logo
 * pulses once, two rings ripple out of it, and the whole layer zooms and fades away.
 */
export const SPLASH_TIMING = {
  /** Let the native fade-out finish before anything moves. */
  hold: 180,
  pulseUp: 220,
  pulseDown: 280,
  ringDuration: 900,
  ringStagger: 170,
  exitAt: 760,
  exit: 320,
} as const;

export const SPLASH_TOTAL_MS = SPLASH_TIMING.exitAt + SPLASH_TIMING.exit + 40;
/** Reduced motion: no movement, just a quick fade. */
export const SPLASH_REDUCED_TOTAL_MS = 260;

type Phase = 'covering' | 'playing' | 'done';

function Ring({ delay }: { readonly delay: number }) {
  const local = useSharedValue(0);
  useEffect(() => {
    local.value = withDelay(
      SPLASH_TIMING.hold + delay,
      withTiming(1, { duration: SPLASH_TIMING.ringDuration, easing: Easing.out(Easing.cubic) }),
    );
  }, [delay, local]);
  // Invisible until it starts, so the first frame is exactly the native splash.
  const style = useAnimatedStyle(() => ({
    opacity: Math.min(local.value * 8, 1) * 0.42 * (1 - local.value),
    transform: [{ scale: 1 + local.value * 1.7 }],
  }));
  return <Animated.View pointerEvents="none" style={[styles.ring, style]} />;
}

export function AnimatedSplash() {
  const reduceMotion = useReducedMotion();
  // The native splash only exists on device; on web (or if it already hid) there is nothing to wait for.
  const [phase, setPhase] = useState<Phase>(() =>
    Platform.OS === 'web' || isSplashHidden() ? 'playing' : 'covering',
  );
  const pulse = useSharedValue(1);
  const exit = useSharedValue(0);
  const fade = useSharedValue(1);

  useEffect(() => {
    if (phase !== 'covering') return undefined;
    return subscribeSplashHidden(() => setPhase('playing'));
  }, [phase]);

  useEffect(() => {
    if (phase !== 'playing') return undefined;

    if (reduceMotion) {
      fade.value = withTiming(0, { duration: SPLASH_REDUCED_TOTAL_MS - 40 });
    } else {
      pulse.value = withDelay(
        SPLASH_TIMING.hold,
        withSequence(
          withTiming(1.07, { duration: SPLASH_TIMING.pulseUp, easing: Easing.out(Easing.cubic) }),
          withTiming(1, { duration: SPLASH_TIMING.pulseDown, easing: Easing.inOut(Easing.quad) }),
        ),
      );
      exit.value = withDelay(
        SPLASH_TIMING.exitAt,
        withTiming(1, { duration: SPLASH_TIMING.exit, easing: Easing.in(Easing.cubic) }),
      );
      fade.value = withDelay(
        SPLASH_TIMING.exitAt,
        withTiming(0, { duration: SPLASH_TIMING.exit, easing: Easing.in(Easing.quad) }),
      );
    }

    const timer = setTimeout(() => setPhase('done'), reduceMotion ? SPLASH_REDUCED_TOTAL_MS : SPLASH_TOTAL_MS);
    return () => clearTimeout(timer);
  }, [phase, reduceMotion, pulse, exit, fade]);

  const layerStyle = useAnimatedStyle(() => ({ opacity: fade.value }));
  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value * (1 + 0.22 * exit.value) }],
  }));

  if (phase === 'done') return null;

  return (
    <Animated.View
      testID="animated-splash"
      pointerEvents={phase === 'playing' ? 'none' : 'auto'}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.layer, layerStyle]}
    >
      <View style={styles.center}>
        <Animated.View style={logoStyle}>
          <Image source={SPLASH_IMAGE} style={styles.logo} resizeMode="contain" />
        </Animated.View>
        {phase === 'playing' && !reduceMotion ? (
          <>
            <Ring delay={0} />
            <Ring delay={SPLASH_TIMING.ringStagger} />
          </>
        ) : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.primary,
    zIndex: 1000,
    elevation: 1000,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: SPLASH_LOGO_SIZE,
    height: SPLASH_LOGO_SIZE,
  },
  ring: {
    position: 'absolute',
    width: SPLASH_LOGO_SIZE,
    height: SPLASH_LOGO_SIZE,
    borderRadius: SPLASH_LOGO_SIZE / 2,
    borderWidth: 3,
    borderColor: teal[200],
  },
});
