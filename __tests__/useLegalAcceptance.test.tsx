import { act, renderHook } from '@testing-library/react-native';

jest.mock('@/src/services/legal', () => ({
  loadLegalDocuments: jest.fn(),
  hasAcceptedLegalDocuments: jest.fn(),
  acceptLegalDocuments: jest.fn(),
}));

import { useLegalAcceptance } from '@/src/hooks/useLegalAcceptance';
import * as legalService from '@/src/services/legal';

const documents = [
  { key: 'terms' as const, version: '2026-07-29', url: 'https://koupa-website.pages.dev/terms/' },
  { key: 'privacy' as const, version: '2026-07-29', url: 'https://koupa-website.pages.dev/privacy/' },
];

describe('useLegalAcceptance retries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(legalService.loadLegalDocuments).mockResolvedValue(documents);
  });

  it('surfaces missing signup consent during an explicit retry', async () => {
    const { result } = await renderHook(() => useLegalAcceptance());
    const user = {
      id: 'legacy-user',
      email_confirmed_at: '2026-07-29T12:00:00.000Z',
      user_metadata: { koupa_role: 'customer' },
    } as never;

    await expect(
      act(async () => result.current.syncLegal(user, {
        canPersistSignupConsent: true,
        throwOnError: true,
      })),
    ).rejects.toMatchObject({ code: 'LEGAL_SAVE_FAILED' });
  });

  it('does not auto-accept a new legal version for an existing profile', async () => {
    jest.mocked(legalService.hasAcceptedLegalDocuments).mockResolvedValue(false);
    const { result } = await renderHook(() => useLegalAcceptance());
    const user = {
      id: 'existing-user',
      email_confirmed_at: '2026-07-29T12:00:00.000Z',
      user_metadata: { koupa_role: 'customer', koupa_signup_consent: true },
    } as never;

    await act(async () => {
      await result.current.syncLegal(user, { canPersistSignupConsent: false });
    });

    expect(legalService.acceptLegalDocuments).not.toHaveBeenCalled();
    expect(result.current.legalAccepted).toBe(false);
    expect(result.current.legalConsentRequired).toBe(true);
  });

  it('persists the explicit pre-signup consent for a profileless user', async () => {
    jest.mocked(legalService.hasAcceptedLegalDocuments).mockResolvedValue(false);
    jest.mocked(legalService.acceptLegalDocuments).mockResolvedValue(undefined);
    const { result } = await renderHook(() => useLegalAcceptance());
    const user = {
      id: 'new-user',
      email_confirmed_at: '2026-07-29T12:00:00.000Z',
      user_metadata: { koupa_role: 'customer', koupa_signup_consent: true },
    } as never;

    await act(async () => {
      await result.current.syncLegal(user, { canPersistSignupConsent: true });
    });

    expect(legalService.acceptLegalDocuments).toHaveBeenCalledWith('new-user', documents);
    expect(result.current.legalAccepted).toBe(true);
    expect(result.current.legalConsentRequired).toBe(false);
  });
});
