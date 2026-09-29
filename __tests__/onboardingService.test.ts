import { defaultBarberDraft } from '@/src/data/onboarding';

const mockRpc = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

import {
  createBarberProfile,
  publishBarberProfile,
  publishExistingBarberProfile,
} from '@/src/services/onboarding';

describe('barber onboarding service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRpc.mockResolvedValue({ error: null });
  });

  it('creates the profile with identity, workplace and location only', async () => {
    await createBarberProfile({
      ...defaultBarberDraft,
      name: 'أمين',
      phone: '0555000000',
      shopName: 'محل النور',
      shopBio: 'حلاقة رجالية',
      city: 'الجزائر',
      neighborhood: 'باب الوادي',
      mapsUrl: 'https://maps.app.goo.gl/example',
    });

    expect(mockRpc).toHaveBeenCalledWith('create_barber_profile', {
      payload: expect.objectContaining({
        workplace_type: 'owner',
        name: 'أمين',
        shop_name: 'محل النور',
        city: 'الجزائر',
      }),
    });
    // Services and hours are not part of creating the account.
    const [, args] = mockRpc.mock.calls[0] as [string, { payload: Record<string, unknown> }];
    expect(args.payload).not.toHaveProperty('services');
    expect(args.payload).not.toHaveProperty('schedules');
  });

  it('never sends owned-shop fields when the barber works in someone elses shop', async () => {
    await createBarberProfile({
      ...defaultBarberDraft,
      name: 'أمين',
      phone: '0555000000',
      workplaceType: 'worker',
      shopName: 'بيانات قديمة',
      shopBio: 'يجب تجاهلها',
      city: '',
      neighborhood: '',
      mapsUrl: '',
      latitude: '',
      longitude: '',
    });

    expect(mockRpc).toHaveBeenCalledWith('create_barber_profile', {
      payload: expect.objectContaining({
        workplace_type: 'worker',
        shop_name: null,
        shop_bio: null,
      }),
    });
  });

  it('publishes what the barber already saved with an empty payload', async () => {
    await publishExistingBarberProfile();

    expect(mockRpc).toHaveBeenCalledWith('publish_barber_profile', { payload: {} });
  });

  it('omits identity and location from the publish payload', async () => {
    // The stored row is authoritative for those, so publishing must not
    // resubmit them and risk overwriting verified values.
    await publishBarberProfile({
      ...defaultBarberDraft,
      name: 'أمين',
      phone: '0555000000',
      shopName: 'محل النور',
      services: [{ name: 'حلاقة', priceDzd: '800', durationMinutes: '30' }],
    });

    const [, args] = mockRpc.mock.calls[0] as [string, { payload: Record<string, unknown> }];
    expect(args.payload).toMatchObject({ shop_name: 'محل النور' });
    expect(args.payload).not.toHaveProperty('name');
    expect(args.payload).not.toHaveProperty('phone');
    expect(args.payload).not.toHaveProperty('maps_url');
    expect(args.payload).not.toHaveProperty('workplace_type');
  });
});
