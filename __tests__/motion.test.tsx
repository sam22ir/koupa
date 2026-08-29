import { render } from '@testing-library/react-native';
import { useEffect } from 'react';
import { AccessibilityInfo, View, type Animated } from 'react-native';

import { entranceMotionEnabled, useEntrance } from '../src/utils/motion';

function Probe({ onProgress }: { readonly onProgress: (value: Animated.Value) => void }) {
  const progress = useEntrance(0, 300);
  // Reported from an effect so nothing is written during the render phase.
  useEffect(() => {
    onProgress(progress);
  }, [progress, onProgress]);
  return <View testID="probe" />;
}

const originalWorkerId = process.env.JEST_WORKER_ID;

/** Animated.Value's read accessor is internal, so it is not on the public type. */
type ProgressReader = { __getValue: () => number };

async function captureProgress(): Promise<ProgressReader> {
  let captured: Animated.Value | undefined;
  await render(<Probe onProgress={(value) => { captured = value; }} />);
  if (!captured) throw new Error('Probe did not report its progress handle');
  return captured as unknown as ProgressReader;
}

describe('entrance motion gate', () => {
  afterEach(() => {
    process.env.JEST_WORKER_ID = originalWorkerId;
    jest.restoreAllMocks();
  });

  it('is switched off under Jest so render assertions stay deterministic', async () => {
    expect(entranceMotionEnabled()).toBe(false);

    const progress = await captureProgress();

    expect(progress.__getValue()).toBe(1);
  });

  it('settles to the final frame instead of animating when the OS asks for reduced motion', async () => {
    delete process.env.JEST_WORKER_ID;
    const spy = jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockResolvedValue(true);

    const progress = await captureProgress();
    await new Promise((resolve) => {
      setImmediate(resolve);
    });

    expect(spy).toHaveBeenCalled();
    expect(progress.__getValue()).toBe(1);
  });
});
