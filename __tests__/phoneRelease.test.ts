const mockRpc = jest.fn();
const mockInsert = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
    from: () => ({ insert: (...args: unknown[]) => mockInsert(...args) }),
  },
}));

jest.mock('@/src/services/profile', () => ({ loadProfile: jest.fn(async () => null) }));

import { defaultBarberDraft } from '@/src/data/onboarding';
import { AppError } from '@/src/services/errors';
import {
  createBarberProfile,
  createCustomerProfile,
  withPhoneRelease,
} from '@/src/services/onboarding';

const phoneTaken = () => new AppError('PHONE_ALREADY_IN_USE', new Error('profiles_phone_unique'));

describe('withPhoneRelease', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does nothing extra when the action succeeds', async () => {
    const action = jest.fn(async () => 'ok');

    await expect(withPhoneRelease('+213555000000', action)).resolves.toBe('ok');

    expect(action).toHaveBeenCalledTimes(1);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('frees a number held by an unconfirmed unused account, then retries once', async () => {
    mockRpc.mockResolvedValueOnce({ data: true, error: null });
    const action = jest.fn()
      .mockRejectedValueOnce(phoneTaken())
      .mockResolvedValueOnce('created');

    await expect(withPhoneRelease('+213555000000', action)).resolves.toBe('created');

    expect(mockRpc).toHaveBeenCalledWith('claim_unverified_phone', { target_phone: '+213555000000' });
    expect(action).toHaveBeenCalledTimes(2);
  });

  it('keeps the original error when a real account owns the number', async () => {
    mockRpc.mockResolvedValueOnce({ data: false, error: null });
    const error = phoneTaken();
    const action = jest.fn().mockRejectedValue(error);

    await expect(withPhoneRelease('+213555000000', action)).rejects.toBe(error);

    expect(action).toHaveBeenCalledTimes(1);
  });

  it('keeps the original error when the claim itself is refused (for example unconfirmed email)', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'A confirmed email is required' } });
    const error = phoneTaken();
    const action = jest.fn().mockRejectedValue(error);

    await expect(withPhoneRelease('+213555000000', action)).rejects.toBe(error);

    expect(action).toHaveBeenCalledTimes(1);
  });

  it('never tries to release a number for unrelated errors', async () => {
    const error = new AppError('NETWORK');
    const action = jest.fn().mockRejectedValue(error);

    await expect(withPhoneRelease('+213555000000', action)).rejects.toBe(error);

    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('does not loop: a second phone conflict after a release is reported', async () => {
    mockRpc.mockResolvedValue({ data: true, error: null });
    const error = phoneTaken();
    const action = jest.fn().mockRejectedValue(error);

    await expect(withPhoneRelease('+213555000000', action)).rejects.toBe(error);

    expect(action).toHaveBeenCalledTimes(2);
    expect(mockRpc).toHaveBeenCalledTimes(1);
  });
});

describe('profile creation uses the phone release', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('customer: a taken number that gets released is retried and succeeds', async () => {
    mockInsert
      .mockResolvedValueOnce({ error: { code: '23505', message: 'duplicate key value violates unique constraint "profiles_phone_unique"' } })
      .mockResolvedValueOnce({ error: null });
    mockRpc.mockResolvedValueOnce({ data: true, error: null });

    await expect(createCustomerProfile('user-1', 'سارة', '+213555000000')).resolves.toBeUndefined();

    expect(mockInsert).toHaveBeenCalledTimes(2);
  });

  it('customer: a number held by a real account still fails with the clear error', async () => {
    mockInsert.mockResolvedValue({ error: { code: '23505', message: 'duplicate key value violates unique constraint "profiles_phone_unique"' } });
    mockRpc.mockResolvedValueOnce({ data: false, error: null });

    await expect(createCustomerProfile('user-1', 'سارة', '+213555000000')).rejects.toMatchObject({ code: 'PHONE_ALREADY_IN_USE' });
  });

  it('barber: a released number retries the create_barber_profile call', async () => {
    mockRpc
      .mockResolvedValueOnce({ error: { message: 'duplicate key value violates unique constraint "profiles_phone_unique"' } })
      .mockResolvedValueOnce({ data: true, error: null })
      .mockResolvedValueOnce({ error: null });

    await expect(createBarberProfile({ ...defaultBarberDraft, name: 'أمين', phone: '+213555000000' })).resolves.toBeUndefined();

    expect(mockRpc.mock.calls.map((call) => call[0])).toEqual([
      'create_barber_profile',
      'claim_unverified_phone',
      'create_barber_profile',
    ]);
  });
});
