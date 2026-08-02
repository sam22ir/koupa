import { act, renderHook, waitFor } from '@testing-library/react-native';

import { emptyBarberSettingsDraft } from '@/src/barberSettings';
import type { BarberScheduleWorkspaceDraft } from '@/src/features/barber-schedule/model';
import { loadWorkspaceWhenActive, useBarberSettings } from '@/src/hooks/useBarberSettings';

const mockLoadWorkspace = jest.fn();
const mockSaveWorkspace = jest.fn();

jest.mock('@/src/services/barberSettings', () => ({
  loadBarberScheduleWorkspace: (...args: unknown[]) => mockLoadWorkspace(...args),
  saveBarberScheduleWorkspace: (...args: unknown[]) => mockSaveWorkspace(...args),
}));

function workspace(): BarberScheduleWorkspaceDraft {
  return {
    settings: {
      ...emptyBarberSettingsDraft,
      services: [
        {
          id: 'service-1',
          name: 'حلاقة شعر',
          priceDzd: '800',
          durationMinutes: '30',
          isActive: true,
        },
      ],
    },
    exceptions: [],
  };
}

describe('useBarberSettings workspace facade', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLoadWorkspace.mockResolvedValue(workspace());
    mockSaveWorkspace.mockResolvedValue(undefined);
  });

  it('loads separate snapshot and draft values', async () => {
    const { result } = await renderHook(() => useBarberSettings({ userId: 'barber-1' }));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.loaded).not.toBeNull();
    expect(result.current.draft).not.toBe(result.current.loaded);
    expect(result.current.dirty).toBe(false);
  });

  it('tracks dirty state and resets to the loaded snapshot', async () => {
    const { result } = await renderHook(() => useBarberSettings({ userId: 'barber-1' }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(() => {
      result.current.setDraft({
        ...result.current.draft,
        settings: { ...result.current.draft.settings, intervalMinutes: 15 },
      });
    });
    expect(result.current.dirty).toBe(true);

    await act(() => result.current.reset());
    expect(result.current.dirty).toBe(false);
    expect(result.current.draft.settings.intervalMinutes).toBe(30);
  });

  it('does not call the service for an invalid draft', async () => {
    const { result } = await renderHook(() => useBarberSettings({ userId: 'barber-1' }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(() => {
      result.current.setDraft({
        ...result.current.draft,
        settings: {
          ...result.current.draft.settings,
          services: result.current.draft.settings.services.map((service) => ({
            ...service,
            isActive: false,
          })),
        },
      });
    });

    let saved = true;
    await act(async () => {
      saved = await result.current.save();
    });
    expect(saved).toBe(false);
    expect(result.current.errors).toMatchObject({ services: 'activeServiceRequired' });
    expect(mockSaveWorkspace).not.toHaveBeenCalled();
  });

  it('saves once and replaces the loaded snapshot after success', async () => {
    const { result } = await renderHook(() => useBarberSettings({ userId: 'barber-1' }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(() => {
      result.current.setDraft({
        ...result.current.draft,
        settings: { ...result.current.draft.settings, intervalMinutes: 15 },
      });
    });

    let saved = false;
    await act(async () => {
      saved = await result.current.save();
    });
    expect(saved).toBe(true);
    expect(mockSaveWorkspace).toHaveBeenCalledTimes(1);
    expect(mockSaveWorkspace).toHaveBeenCalledWith(
      expect.objectContaining({ settings: expect.objectContaining({ intervalMinutes: 15 }) }),
    );
    expect(mockLoadWorkspace).toHaveBeenCalledTimes(2);
  });

  it('does not update state after an in-flight load is unmounted', async () => {
    let resolveLoad!: (value: BarberScheduleWorkspaceDraft) => void;
    mockLoadWorkspace.mockReturnValueOnce(
      new Promise<BarberScheduleWorkspaceDraft>((resolve) => {
        resolveLoad = resolve;
      }),
    );
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const view = await renderHook(() => useBarberSettings({ userId: 'barber-1' }));

    view.unmount();
    await act(async () => {
      resolveLoad(workspace());
      await Promise.resolve();
    });

    expect(errorSpy).not.toHaveBeenCalledWith(
      expect.stringContaining("state update on a component that hasn't mounted"),
      expect.anything(),
    );
    errorSpy.mockRestore();
  });

  it('drops an async workspace result after cancellation', async () => {
    let active = true;
    const onSuccess = jest.fn();
    const pending = loadWorkspaceWhenActive(
      async () => workspace(),
      () => active,
      onSuccess,
    );

    active = false;
    await pending;

    expect(onSuccess).not.toHaveBeenCalled();
  });
});
