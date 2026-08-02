import { act, renderHook, waitFor } from '@testing-library/react-native';

const mockLoadOnboardingDraft = jest.fn();
const mockSaveOnboardingDraft = jest.fn();

jest.mock('@/src/services/onboarding', () => ({
  loadOnboardingDraft: (...args: unknown[]) => mockLoadOnboardingDraft(...args),
  saveOnboardingDraft: (...args: unknown[]) => mockSaveOnboardingDraft(...args),
  createCustomerProfile: jest.fn(),
  publishBarberProfile: jest.fn(),
}));

import { useOnboarding } from '@/src/hooks/useOnboarding';

describe('useOnboarding', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLoadOnboardingDraft.mockResolvedValue({ draft: null, step: 0 });
    mockSaveOnboardingDraft.mockResolvedValue(undefined);
  });

  it('prefills a new barber draft with the Auth phone', async () => {
    const { result } = await renderHook(() =>
      useOnboarding({ userId: 'barber-1', initialPhone: '+213555000000' }),
    );

    await waitFor(() => expect(result.current.hydrating).toBe(false));
    expect(result.current.draft.phone).toBe('+213555000000');
  });

  it('surfaces draft-load failure and retries without overwriting local defaults', async () => {
    mockLoadOnboardingDraft
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce({ draft: null, step: 0 });
    const { result } = await renderHook(() =>
      useOnboarding({ userId: 'barber-1', initialPhone: '+213555000000' }),
    );

    await waitFor(() => expect(result.current.loadError).toBeTruthy());
    expect(result.current.draft.phone).toBe('+213555000000');

    await act(async () => {
      await result.current.retryLoad();
    });
    await waitFor(() => expect(mockLoadOnboardingDraft).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(result.current.loadError).toBeNull());
  });

  it('converts navigation steps before saving to the database service', async () => {
    const { result } = await renderHook(() =>
      useOnboarding({ userId: 'barber-1', initialPhone: '+213555000000' }),
    );
    await waitFor(() => expect(result.current.hydrating).toBe(false));

    await act(async () => {
      await result.current.saveDraft(0, result.current.draft);
    });
    expect(mockSaveOnboardingDraft).toHaveBeenCalledWith(
      'barber-1',
      0,
      expect.objectContaining({ phone: '+213555000000' }),
    );
  });
});
