import { render } from '@testing-library/react-native';
import React from 'react';
import { Alert, View } from 'react-native';

import { useUnsavedWorkspaceLeaveGuard } from '@/src/hooks/useUnsavedWorkspaceLeaveGuard';

const mockAddListener = jest.fn();
const mockDispatch = jest.fn();
let mockBeforeRemove: ((event: any) => void) | undefined;

jest.mock('expo-router', () => ({
  useNavigation: () => ({
    addListener: (...args: unknown[]) => {
      mockBeforeRemove = args[1] as never;
      return mockAddListener(...args);
    },
    dispatch: (...args: unknown[]) => mockDispatch(...args),
  }),
}));

function Harness({
  dirty,
  reset,
  save,
}: {
  readonly dirty: boolean;
  readonly reset: jest.Mock;
  readonly save: jest.Mock<Promise<boolean>, []>;
}) {
  useUnsavedWorkspaceLeaveGuard({ dirty, reset, save });
  return <View />;
}

function leaveEvent() {
  return { preventDefault: jest.fn(), data: { action: { type: 'GO_BACK' } } };
}

describe('useUnsavedWorkspaceLeaveGuard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDispatch.mockReset();
    mockBeforeRemove = undefined;
    mockAddListener.mockReturnValue(jest.fn());
  });

  it('discards dirty edits before replaying the intercepted navigation action', async () => {
    const reset = jest.fn();
    const save = jest.fn(async () => true);
    mockDispatch.mockImplementation((action) => {
      mockBeforeRemove?.({ preventDefault: jest.fn(), data: { action } });
    });
    const alert = jest.spyOn(Alert, 'alert').mockImplementation((_title, _body, buttons) => {
      buttons?.find((button) => button.text === 'تجاهل')?.onPress?.();
    });
    await render(<Harness dirty reset={reset} save={save} />);
    const event = leaveEvent();

    mockBeforeRemove?.(event);

    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(reset).toHaveBeenCalledTimes(1);
    expect(mockDispatch).toHaveBeenCalledWith(event.data.action);
    alert.mockRestore();
  });

  it('retains dirty edits when save fails', async () => {
    const reset = jest.fn();
    const save = jest.fn(async () => false);
    const alert = jest.spyOn(Alert, 'alert').mockImplementation((_title, _body, buttons) => {
      buttons?.find((button) => button.text === 'حفظ')?.onPress?.();
    });
    await render(<Harness dirty reset={reset} save={save} />);
    const event = leaveEvent();

    mockBeforeRemove?.(event);
    await Promise.resolve();

    expect(reset).not.toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalled();
    alert.mockRestore();
  });

  it('replays navigation only after a successful save', async () => {
    const reset = jest.fn();
    const save = jest.fn(async () => true);
    const alert = jest.spyOn(Alert, 'alert').mockImplementation((_title, _body, buttons) => {
      buttons?.find((button) => button.text === 'حفظ')?.onPress?.();
    });
    await render(<Harness dirty reset={reset} save={save} />);
    const event = leaveEvent();

    mockBeforeRemove?.(event);
    await Promise.resolve();

    expect(reset).not.toHaveBeenCalled();
    expect(mockDispatch).toHaveBeenCalledWith(event.data.action);
    alert.mockRestore();
  });

  it('does not bypass a later system Back after discarding an earlier one', async () => {
    const reset = jest.fn();
    const save = jest.fn(async () => true);
    mockDispatch.mockImplementation((action) => {
      mockBeforeRemove?.({ preventDefault: jest.fn(), data: { action } });
    });
    const alert = jest.spyOn(Alert, 'alert').mockImplementation((_title, _body, buttons) => {
      buttons?.find((button) => button.text === 'تجاهل')?.onPress?.();
    });
    await render(<Harness dirty reset={reset} save={save} />);
    const first = leaveEvent();
    const second = leaveEvent();

    mockBeforeRemove?.(first);
    mockBeforeRemove?.(second);

    expect(first.preventDefault).toHaveBeenCalledTimes(1);
    expect(second.preventDefault).toHaveBeenCalledTimes(1);
    expect(mockDispatch).toHaveBeenCalledWith(first.data.action);
    expect(mockDispatch).toHaveBeenCalledWith(second.data.action);
    alert.mockRestore();
  });
});
