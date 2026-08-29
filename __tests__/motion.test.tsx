import { render } from '@testing-library/react-native';
import { AccessibilityInfo, View } from 'react-native';

import { entranceMotionEnabled, useEntrance } from '../src/utils/motion';

let current: { __getValue: () => number } | null = null;

function Probe() {
  current = useEntrance(0, 300) as unknown as { __getValue: () => number };
  return <View testID="probe" />;
}

const originalWorkerId = process.env.JEST_WORKER_ID;

describe('entrance motion gate', () => {
  afterEach(() => {
    process.env.JEST_WORKER_ID = originalWorkerId;
    jest.restoreAllMocks();
    current = null;
  });

  it('is switched off under Jest so render assertions stay deterministic', async () => {
    expect(entranceMotionEnabled()).toBe(false);

    await render(<Probe />);

    expect(current?.__getValue()).toBe(1);
  });

  it('settles to the final frame instead of animating when the OS asks for reduced motion', async () => {
    delete process.env.JEST_WORKER_ID;
    const spy = jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockResolvedValue(true);

    await render(<Probe />);
    await new Promise((resolve) => {
      setImmediate(resolve);
    });

    expect(spy).toHaveBeenCalled();
    expect(current?.__getValue()).toBe(1);
  });
});
