import { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, Easing } from 'react-native';

/**
 * Entrance-motion gate for Teal Stage choreography.
 *
 * Under Jest the entrance timelines stay at their final frame so React
 * Testing Library act() boundaries remain deterministic; at runtime the
 * choreography plays in full.
 */
export function entranceMotionEnabled(): boolean {
  return process.env.JEST_WORKER_ID === undefined;
}

/**
 * A 0 -> 1 progress handle that is stable across renders.
 *
 * The ref is required, not an optimisation: a fresh Animated.Value per render
 * would restart the timeline from zero on every state change.
 */
export function useEntranceProgress(): Animated.Value {
  const ref = useRef<Animated.Value | null>(null);
  if (ref.current === null) {
    ref.current = new Animated.Value(entranceMotionEnabled() ? 0 : 1);
  }
  return ref.current;
}

/**
 * Drive a one-shot entrance on mount.
 *
 * Settles instantly when the OS asks for reduced motion, and never runs under
 * Jest. Callers interpolate the returned value into opacity, scale or offset,
 * so one handle can carry a whole gesture.
 */
export function useEntrance(delay = 0, duration = 420): Animated.Value {
  const progress = useEntranceProgress();

  useEffect(() => {
    if (!entranceMotionEnabled()) {
      progress.setValue(1);
      return;
    }

    let cancelled = false;

    AccessibilityInfo.isReduceMotionEnabled()
      .then((reduceMotion) => {
        if (cancelled) return;
        if (reduceMotion) {
          progress.setValue(1);
          return;
        }
        Animated.timing(progress, {
          toValue: 1,
          duration,
          delay,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start();
      })
      .catch(() => {
        if (!cancelled) progress.setValue(1);
      });

    return () => {
      cancelled = true;
    };
  }, [progress, delay, duration]);

  return progress;
}
