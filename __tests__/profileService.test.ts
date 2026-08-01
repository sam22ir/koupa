import { updateProfileName } from '@/src/services/profile';

const mockUpdate = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      update: (...args: unknown[]) => mockUpdate(...args),
    })),
  },
}));

describe('profile service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('updates only the authenticated profile name', async () => {
    const eq = jest.fn(async () => ({ error: null }));
    mockUpdate.mockReturnValue({ eq });

    await updateProfileName('user-1', 'ليلى بن عمر');

    expect(mockUpdate).toHaveBeenCalledWith({ name: 'ليلى بن عمر' });
    expect(eq).toHaveBeenCalledWith('id', 'user-1');
  });

  it('converts update failures to the app error contract', async () => {
    const eq = jest.fn(async () => ({ error: { code: '42501', message: 'denied' } }));
    mockUpdate.mockReturnValue({ eq });

    await expect(updateProfileName('user-1', 'ليلى')).rejects.toMatchObject({ code: expect.any(String) });
  });
});
